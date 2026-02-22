const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Participant = require('../models/Participant');
const { verifyToken } = require('../middleware/authMiddleware');
const { generateTicketId, generateTicket } = require('../utils/qrCodeGenerator');
const { sendTicketEmail } = require('../utils/emailService');
const { generateICS, generateBatchICS, generateGoogleCalendarLink, generateOutlookLink } = require('../utils/calendarExport');

// Register for a normal event
router.post('/event/:eventId', verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const participantId = req.user.id;
    const { customFormData } = req.body;

    const participant = await Participant.findById(participantId);
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.eventType === 'merchandise') {
      return res.status(400).json({
        message: 'This endpoint is for normal and hackathon events only. Use /merchandise/:eventId for merchandise events'
      });
    }

    if (!event.isRegistrationOpen()) {
      if (event.status !== 'published') {
        return res.status(400).json({ message: 'Event is not open for registration yet' });
      }
      if (new Date() >= event.registrationDeadline) {
        return res.status(400).json({ message: 'Registration deadline has passed' });
      }
      if (event.isFull()) {
        return res.status(400).json({ message: 'Event is full. Registration limit reached' });
      }
    }

    const existingRegistration = await Registration.findOne({
      participant: participantId,
      event: eventId,
      status: { $ne: 'cancelled' }
    });

    if (existingRegistration) {
      return res.status(400).json({ message: 'You are already registered for this event' });
    }

    // Validate custom form data
    if (event.customRegistrationForm.enabled && event.customRegistrationForm.fields.length > 0) {
      const formFields = event.customRegistrationForm.fields;
      for (const field of formFields) {
        if (field.required && (!customFormData || !customFormData[field.fieldName])) {
          return res.status(400).json({
            message: `Required field missing: ${field.label}`
          });
        }
      }
    }

    // Atomically increment registration count under limit
    const limitQuery = (event.registrationLimit != null && !isNaN(event.registrationLimit))
      ? { _id: eventId, $expr: { $lt: ['$currentRegistrations', '$registrationLimit'] } }
      : { _id: eventId };

    const updatedEvent = await Event.findOneAndUpdate(
      limitQuery,
      { $inc: { currentRegistrations: 1 } },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(400).json({ message: 'Event is full. Registration limit reached' });
    }

    // Generate ticket
    const ticketId = generateTicketId();
    const participantName = `${participant.firstName} ${participant.lastName}`;
    const ticket = await generateTicket(
      ticketId, eventId, participantId, event.name, participantName
    );

    const registration = new Registration({
      ticketId: ticket.ticketId,
      participant: participantId,
      event: eventId,
      qrCode: ticket.qrCode,
      customFormData: customFormData || {},
      isMerchandise: false,
      status: 'confirmed'
    });

    await registration.save();
    await Event.findByIdAndUpdate(eventId, { $push: { registrations: registration._id } });
    await registration.populate('event', 'name startDate endDate location venue');

    // Send confirmation email
    sendTicketEmail({
      to: participant.email,
      participantName,
      eventName: event.name,
      eventDate: event.startDate,
      eventLocation: event.location || event.venue,
      ticketId: ticket.ticketId,
      qrCode: ticket.qrCode,
      isMerchandise: false
    }).catch(err => console.error('Email sending failed:', err));

    res.status(201).json({
      message: 'Registration successful! Check your email for the ticket.',
      registration,
      ticket: {
        ticketId: ticket.ticketId,
        qrCode: ticket.qrCode,
        eventName: event.name,
        participantName,
        registrationDate: registration.registrationDate
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get participant's all registrations
router.get('/my-registrations', verifyToken, async (req, res) => {
  try {
    const participantId = req.user.id;

    const registrations = await Registration.find({ participant: participantId })
      .populate('event', 'name eventType startDate endDate location venue bannerImage status tags')
      .sort({ registrationDate: -1 });

    const now = new Date();
    const upcoming = registrations.filter(r =>
      r.event && new Date(r.event.startDate) >= now && r.status === 'confirmed'
    );
    const past = registrations.filter(r =>
      r.event && new Date(r.event.startDate) < now && r.status === 'confirmed'
    );
    const cancelled = registrations.filter(r => r.status === 'cancelled');

    res.json({ upcoming, past, cancelled, total: registrations.length });
  } catch (err) {
    console.error('Error fetching registrations:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get specific ticket details
router.get('/ticket/:ticketId', verifyToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const participantId = req.user.id;

    const registration = await Registration.findOne({ ticketId })
      .populate('event', 'name eventType startDate endDate location venue organizer')
      .populate('participant', 'firstName lastName email contactNumber');

    if (!registration) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (registration.participant._id.toString() !== participantId) {
      return res.status(403).json({ message: 'Access denied. This ticket does not belong to you' });
    }

    res.json(registration);
  } catch (err) {
    console.error('Error fetching ticket:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Check if participant is registered for an event
router.get('/check/:eventId', verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const participantId = req.user.id;

    const registration = await Registration.findOne({
      participant: participantId,
      event: eventId,
      status: { $ne: 'cancelled' }
    });

    res.json({
      isRegistered: !!registration,
      registration: registration || null
    });
  } catch (err) {
    console.error('Error checking registration:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Cancel registration
router.patch('/cancel/:registrationId', verifyToken, async (req, res) => {
  try {
    const { registrationId } = req.params;
    const participantId = req.user.id;

    const registration = await Registration.findById(registrationId)
      .populate('event');

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    if (registration.participant.toString() !== participantId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (registration.status === 'cancelled') {
      return res.status(400).json({ message: 'Registration is already cancelled' });
    }

    if (registration.isMerchandise) {
      return res.status(400).json({ message: 'Merchandise orders cannot be cancelled' });
    }

    if (registration.event.hasStarted()) {
      return res.status(400).json({
        message: 'Cannot cancel registration. Event has already started'
      });
    }

    registration.status = 'cancelled';
    registration.qrCode = '';
    await registration.save();

    // Atomically decrement counter
    await Event.findByIdAndUpdate(
      registration.event._id,
      { $inc: { currentRegistrations: -1 } }
    );

    res.json({ message: 'Registration cancelled successfully', registration });
  } catch (err) {
    console.error('Error cancelling registration:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Register for merchandise event (purchase)
router.post('/merchandise/:eventId', verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const participantId = req.user.id;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required for merchandise purchase' });
    }

    const participant = await Participant.findById(participantId);
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.eventType !== 'merchandise') {
      return res.status(400).json({
        message: 'This endpoint is for merchandise events only. Use /event/:eventId for normal events'
      });
    }

    if (!event.isRegistrationOpen()) {
      if (event.status !== 'published') {
        return res.status(400).json({ message: 'Event is not open for purchases yet' });
      }
      if (new Date() >= event.registrationDeadline) {
        return res.status(400).json({ message: 'Purchase deadline has passed' });
      }
    }

    // Check for duplicate purchase
    const existingPurchase = await Registration.findOne({
      participant: participantId,
      event: eventId,
      isMerchandise: true,
      status: { $ne: 'cancelled' }
    });
    if (existingPurchase) {
      return res.status(400).json({ message: 'You already have an active order for this event' });
    }

    // Atomically increment registration count under limit
    const limitQuery = (event.registrationLimit != null && !isNaN(event.registrationLimit))
      ? { _id: eventId, $expr: { $lt: ['$currentRegistrations', '$registrationLimit'] } }
      : { _id: eventId };

    const updatedEvent = await Event.findOneAndUpdate(
      limitQuery,
      { $inc: { currentRegistrations: 1 } },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(400).json({ message: 'Event is full. Registration limit reached' });
    }

    // Validate stock and calculate total
    let totalAmount = 0;
    const itemsPurchased = [];

    for (const item of items) {
      const variant = event.merchandiseDetails.variants.id(item.variantId);

      if (!variant) {
        await Event.findByIdAndUpdate(eventId, { $inc: { currentRegistrations: -1 } });
        return res.status(400).json({ message: `Invalid variant ID: ${item.variantId}` });
      }

      if (variant.stock < item.quantity) {
        await Event.findByIdAndUpdate(eventId, { $inc: { currentRegistrations: -1 } });
        return res.status(400).json({
          message: `Insufficient stock for ${variant.variant || 'item'}. Available: ${variant.stock}, Requested: ${item.quantity}`
        });
      }

      itemsPurchased.push({
        itemName: variant.variant || `${variant.size} ${variant.color}`,
        quantity: item.quantity,
        price: variant.price
      });

      totalAmount += variant.price * item.quantity;
    }

    const ticketId = generateTicketId();
    const participantName = `${participant.firstName} ${participant.lastName}`;

    const registration = new Registration({
      ticketId,
      participant: participantId,
      event: eventId,
      qrCode: 'pending',
      isMerchandise: true,
      itemsPurchased,
      totalAmount,
      paymentStatus: 'pending',
      status: 'confirmed'
    });

    await registration.save();
    await Event.findByIdAndUpdate(eventId, { $push: { registrations: registration._id } });
    await registration.populate('event', 'name startDate endDate location venue');

    res.status(201).json({
      message: 'Order placed! Please upload payment proof for approval.',
      registration,
      ticket: {
        ticketId,
        eventName: event.name,
        participantName,
        items: itemsPurchased,
        totalAmount,
        purchaseDate: registration.registrationDate,
        paymentStatus: 'pending'
      }
    });
  } catch (err) {
    console.error('Merchandise purchase error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get event registrations (for organizers)
router.get('/event/:eventId/registrations', verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You do not own this event' });
    }

    const registrations = await Registration.find({ event: eventId })
      .populate('participant', 'firstName lastName email contactNumber collegeName')
      .sort({ registrationDate: -1 });

    const confirmedCount = registrations.filter(r => r.status === 'confirmed').length;
    const cancelledCount = registrations.filter(r => r.status === 'cancelled').length;

    res.json({
      registrations,
      stats: {
        total: registrations.length,
        confirmed: confirmedCount,
        cancelled: cancelledCount,
        availableSlots: Math.max(0, event.registrationLimit - event.currentRegistrations)
      }
    });
  } catch (err) {
    console.error('Error fetching event registrations:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Export single event to calendar (.ics file)
router.get('/export-calendar/:registrationId', verifyToken, async (req, res) => {
  try {
    const { registrationId } = req.params;
    const participantId = req.user.id;

    const registration = await Registration.findOne({
      _id: registrationId,
      participant: participantId
    }).populate('event');

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    const icsContent = generateICS(registration.event, registration);
    const filename = `${registration.event.name.replace(/[^a-z0-9]/gi, '_')}.ics`;

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(icsContent);
  } catch (err) {
    console.error('Error exporting calendar:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Export all upcoming events to calendar (batch)
router.get('/export-calendar-batch', verifyToken, async (req, res) => {
  try {
    const participantId = req.user.id;

    const registrations = await Registration.find({
      participant: participantId,
      status: 'confirmed'
    }).populate('event');

    const upcomingRegistrations = registrations.filter(reg =>
      reg.event && new Date(reg.event.startDate) > new Date()
    );

    if (upcomingRegistrations.length === 0) {
      return res.status(404).json({ message: 'No upcoming events to export' });
    }

    const icsContent = generateBatchICS(upcomingRegistrations);
    const filename = 'my_events.ics';

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(icsContent);
  } catch (err) {
    console.error('Error exporting calendar batch:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get calendar links (Google, Outlook)
router.get('/calendar-links/:registrationId', verifyToken, async (req, res) => {
  try {
    const { registrationId } = req.params;
    const participantId = req.user.id;

    const registration = await Registration.findOne({
      _id: registrationId,
      participant: participantId
    }).populate('event');

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    const googleLink = generateGoogleCalendarLink(registration.event, registration);
    const outlookLink = generateOutlookLink(registration.event, registration);

    res.json({ google: googleLink, outlook: outlookLink });
  } catch (err) {
    console.error('Error generating calendar links:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Upload payment proof (participant)
router.patch('/payment-proof/:registrationId', verifyToken, async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { paymentProof } = req.body;
    const participantId = req.user.id;

    if (!paymentProof) {
      return res.status(400).json({ message: 'Payment proof image is required' });
    }

    const registration = await Registration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }
    if (registration.participant.toString() !== participantId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (!registration.isMerchandise) {
      return res.status(400).json({ message: 'Payment proof is only for merchandise orders' });
    }
    if (registration.paymentStatus === 'completed') {
      return res.status(400).json({ message: 'Payment already approved' });
    }

    registration.paymentProof = paymentProof;
    registration.paymentStatus = 'pending';
    await registration.save();

    res.json({ message: 'Payment proof uploaded successfully. Waiting for organizer approval.', registration });
  } catch (err) {
    console.error('Error uploading payment proof:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get pending payment approvals for an event (organizer)
router.get('/event/:eventId/pending-payments', verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const registrations = await Registration.find({
      event: eventId,
      isMerchandise: true,
      paymentStatus: { $in: ['pending', 'failed'] },
      status: { $ne: 'cancelled' }
    }).populate('participant', 'firstName lastName email contactNumber')
      .sort({ createdAt: -1 });

    res.json({ registrations });
  } catch (err) {
    console.error('Error fetching pending payments:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Approve payment (organizer)
router.patch('/approve-payment/:registrationId', verifyToken, async (req, res) => {
  try {
    const { registrationId } = req.params;

    // Atomically set paymentStatus to completed only if still pending
    const registration = await Registration.findOneAndUpdate(
      {
        _id: registrationId,
        paymentStatus: { $in: ['pending'] }
      },
      { $set: { paymentStatus: 'completed' } },
      { new: true }
    ).populate('participant', 'firstName lastName email');

    if (!registration) {
      const existing = await Registration.findById(registrationId);
      if (!existing) {
        return res.status(404).json({ message: 'Registration not found' });
      }
      if (existing.paymentStatus === 'completed') {
        return res.status(400).json({ message: 'Payment already approved' });
      }
      return res.status(400).json({ message: 'Payment cannot be approved in its current state' });
    }

    const event = await Event.findById(registration.event);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (event.organizer.toString() !== req.user.id) {
      await Registration.findByIdAndUpdate(registrationId, { $set: { paymentStatus: 'pending' } });
      return res.status(403).json({ message: 'Access denied' });
    }

    // Atomically decrement stock with availability check
    for (const item of registration.itemsPurchased) {
      const result = await Event.findOneAndUpdate(
        {
          _id: registration.event,
          'merchandiseDetails.variants': {
            $elemMatch: {
              $or: [
                { variant: item.itemName },
                { $expr: { $eq: [{ $concat: ['$size', ' ', '$color'] }, item.itemName] } }
              ],
              stock: { $gte: item.quantity }
            }
          }
        },
        { $inc: { 'merchandiseDetails.variants.$.stock': -item.quantity } },
        { new: true }
      );

      if (!result) {
        await Registration.findByIdAndUpdate(registrationId, { $set: { paymentStatus: 'pending' } });
        return res.status(400).json({
          message: `Insufficient stock for ${item.itemName}`
        });
      }
    }

    // Generate QR code
    const participantName = `${registration.participant.firstName} ${registration.participant.lastName}`;
    const ticket = await generateTicket(
      registration.ticketId,
      event._id.toString(),
      registration.participant._id.toString(),
      event.name,
      participantName
    );

    registration.qrCode = ticket.qrCode;
    await registration.save();

    // Send confirmation email
    sendTicketEmail({
      to: registration.participant.email,
      participantName,
      eventName: event.name,
      eventDate: event.startDate,
      eventLocation: event.location || event.venue,
      ticketId: registration.ticketId,
      qrCode: ticket.qrCode,
      isMerchandise: true,
      items: registration.itemsPurchased,
      totalAmount: registration.totalAmount
    }).catch(err => console.error('Email sending failed:', err));

    res.json({ message: 'Payment approved. Ticket generated and sent to participant.', registration });
  } catch (err) {
    console.error('Error approving payment:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Reject payment (organizer)
router.patch('/reject-payment/:registrationId', verifyToken, async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { reason } = req.body;

    const registration = await Registration.findById(registrationId)
      .populate('event');

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    const event = registration.event;
    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (registration.paymentStatus === 'completed') {
      return res.status(400).json({ message: 'Cannot reject an already approved payment' });
    }

    registration.paymentStatus = 'failed';
    registration.paymentProof = '';
    await registration.save();

    res.json({
      message: 'Payment rejected. Participant can re-upload payment proof.',
      registration
    });
  } catch (err) {
    console.error('Error rejecting payment:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
