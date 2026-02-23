const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Organizer = require('../models/Organizer');
const { verifyToken } = require('../middleware/authMiddleware');
const { sendEventToDiscord } = require('../utils/discordWebhook');

// Create a new draft event
router.post('/create-draft', verifyToken, async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.user.id);
    if (!organizer) {
      return res.status(403).json({ message: 'Only organizers can create events' });
    }

    const eventData = {
      name: req.body.name,
      eventType: req.body.eventType,
      organizer: req.user.id,
      description: req.body.description,
      eligibility: req.body.eligibility,
      registrationDeadline: req.body.registrationDeadline,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      registrationLimit: req.body.registrationLimit,
      location: req.body.location,
      entryFee: req.body.entryFee,
      status: 'draft'
    };

    if (req.body.tags && Array.isArray(req.body.tags)) {
      eventData.tags = req.body.tags;
    }

    if (req.body.teamSettings) {
      eventData.teamSettings = req.body.teamSettings;
    }

    if (req.body.merchandiseDetails) {
      eventData.merchandiseDetails = req.body.merchandiseDetails;
    }

    if (req.body.customRegistrationForm) {
      eventData.customRegistrationForm = req.body.customRegistrationForm;
    }

    const newEvent = new Event(eventData);

    await newEvent.save();
    organizer.events.push(newEvent._id);
    await organizer.save();

    res.status(201).json({ message: 'Draft created successfully!', event: newEvent });
  } catch (err) {
    console.error('Error creating draft:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update event/draft with status-based validation
router.patch('/:eventId', verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event || !event.organizer.equals(req.user.id)) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const editableFields = event.getEditableFields();

    if (editableFields === 'all') {
      Object.assign(event, req.body);
    } else if (Array.isArray(editableFields) && editableFields.length > 0) {
      const attemptedUpdates = Object.keys(req.body);
      const invalidUpdates = attemptedUpdates.filter(field => !editableFields.includes(field));

      if (invalidUpdates.length > 0) {
        return res.status(400).json({
          message: `Cannot edit these fields after registrations have been received: ${invalidUpdates.join(', ')}`
        });
      }

      if (req.body.registrationDeadline && event.registrationDeadline) {
        const newDeadline = new Date(req.body.registrationDeadline);
        if (newDeadline < event.registrationDeadline) {
          return res.status(400).json({
            message: 'Registration deadline can only be extended after registrations have been received'
          });
        }
      }

      if (req.body.registrationLimit !== undefined && event.registrationLimit != null) {
        const newLimit = Number(req.body.registrationLimit);
        if (newLimit < event.registrationLimit) {
          return res.status(400).json({
            message: 'Registration limit can only be increased after registrations have been received'
          });
        }
      }

      editableFields.forEach(field => {
        if (req.body[field] !== undefined) {
          event[field] = req.body[field];
        }
      });
    } else if (Array.isArray(editableFields) && editableFields.length === 0) {
      return res.status(400).json({ message: 'No edits allowed for this event in its current status' });
    } else {
      return res.status(400).json({ message: 'No edits allowed for this event' });
    }

    await event.save();
    res.json({ message: 'Event updated successfully!', event });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update custom registration form
router.patch('/:eventId/form', verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event || !event.organizer.equals(req.user.id)) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!event.canEditForm()) {
      return res.status(400).json({
        message: 'Form cannot be edited after registrations have been received'
      });
    }

    event.customRegistrationForm = req.body.customRegistrationForm;
    await event.save();

    res.json({ message: 'Form updated successfully!', event });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update event status
router.patch('/:eventId/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const validStatuses = ['draft', 'published', 'ongoing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
      });
    }

    const event = await Event.findById(req.params.eventId);
    if (!event || !event.organizer.equals(req.user.id)) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const currentStatus = event.status;

    // Validate status transitions
    if (status === 'published') {
      if (currentStatus !== 'draft') {
        return res.status(400).json({ message: 'Can only publish draft events' });
      }
      if (!event.canPublish()) {
        if (!event.eventType) {
          return res.status(400).json({
            message: 'Event type is required to publish. Ensure all required fields are filled.'
          });
        }
        return res.status(400).json({
          message: 'Event cannot be published. Ensure all required fields are filled.'
        });
      }
    } else if (status === 'ongoing') {
      if (currentStatus !== 'published') {
        return res.status(400).json({ message: 'Can only mark published events as ongoing' });
      }
      if (!event.canMarkAsOngoing()) {
        return res.status(400).json({
          message: 'Event cannot be marked as ongoing. Must be published and have started.'
        });
      }
    } else if (status === 'completed') {
      if (currentStatus !== 'ongoing') {
        return res.status(400).json({ message: 'Can only mark ongoing events as completed' });
      }
      if (!event.canMarkAsCompleted()) {
        return res.status(400).json({
          message: 'Event cannot be marked as completed. Must be ongoing and have ended.'
        });
      }
    } else if (status === 'cancelled') {
      if (['completed', 'cancelled'].includes(currentStatus)) {
        return res.status(400).json({
          message: 'Cannot cancel completed or already cancelled events'
        });
      }
    } else if (status === 'draft') {
      return res.status(400).json({ message: 'Cannot revert event to draft status' });
    }

    event.status = status;
    await event.save();

    // Send to Discord when event is published
    if (status === 'published' && currentStatus === 'draft') {
      const organizer = await Organizer.findById(event.organizer);
      if (organizer && organizer.discordWebhook) {
        sendEventToDiscord(organizer.discordWebhook, event, organizer)
          .catch(err => console.error('Discord webhook error:', err));
      }
    }

    const statusMessages = {
      published: 'Event published successfully!',
      ongoing: 'Event marked as ongoing!',
      completed: 'Event marked as completed!',
      cancelled: 'Event cancelled successfully!'
    };

    res.json({
      message: statusMessages[status] || 'Event status updated successfully!',
      event
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create a new event (legacy endpoint)
router.post('/create-event', verifyToken, async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.user.id);
    if (!organizer) {
      return res.status(403).json({ message: 'Only organizers can create events' });
    }

    const eventData = {
      ...req.body,
      organizer: req.user.id
    };

    const requiredFields = [
      'name', 'description', 'eventType', 'eligibility',
      'registrationDeadline', 'startDate', 'endDate', 'registrationLimit'
    ];

    for (const field of requiredFields) {
      if (!eventData[field]) {
        return res.status(400).json({ message: `Missing required field: ${field}` });
      }
    }

    // Validate dates
    const now = new Date();
    const regDeadline = new Date(eventData.registrationDeadline);
    const startDate = new Date(eventData.startDate);
    const endDate = new Date(eventData.endDate);

    if (regDeadline <= now) {
      return res.status(400).json({ message: 'Registration deadline must be in the future' });
    }
    if (startDate <= regDeadline) {
      return res.status(400).json({ message: 'Event start date must be after registration deadline' });
    }
    if (endDate <= startDate) {
      return res.status(400).json({ message: 'Event end date must be after start date' });
    }

    const newEvent = new Event(eventData);
    await newEvent.save();

    organizer.events.push(newEvent._id);
    await organizer.save();

    res.status(201).json({ message: 'Event created successfully!', event: newEvent });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all events created by the organizer
router.get('/my-events', verifyToken, async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user.id })
      .sort({ createdAt: -1 });

    const eventsWithDetails = events.map(event => {
      const registeredCount = event.currentRegistrations;
      return {
        ...event.toObject(),
        currentRegistrations: registeredCount,
        spotsLeft: event.registrationLimit - registeredCount
      };
    });

    res.json(eventsWithDetails);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get single event details
router.get('/:eventId', async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .populate('organizer', 'name category description contactEmail contactNumber');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const registeredCount = event.currentRegistrations;

    res.json({
      ...event.toObject(),
      currentRegistrations: registeredCount,
      spotsLeft: event.registrationLimit - registeredCount,
      isOpen: event.isRegistrationOpen()
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete event
router.delete('/:eventId', verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!event.organizer.equals(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    if (event.status && event.status !== 'draft' && event.hasStarted()) {
      return res.status(400).json({
        message: 'Cannot delete an event that has already started. Consider cancelling it instead.'
      });
    }

    await Organizer.findByIdAndUpdate(
      req.user.id,
      { $pull: { events: event._id } }
    );

    await Event.findByIdAndDelete(req.params.eventId);

    res.json({ message: 'Event deleted successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get registrations for an event
router.get('/:eventId/registrations', verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!event.organizer.equals(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to view registrations' });
    }

    const registrations = await Registration.find({ event: req.params.eventId })
      .populate('participant', 'firstName lastName email contactNumber type')
      .sort({ registrationDate: -1 });

    res.json({
      eventName: event.name,
      totalRegistrations: registrations.length,
      registrations
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Browse events with search and filters
router.get('/browse/all', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const { search, eventType, eligibility, startDate, endDate, followedClubs } = req.query;

    const allowedStatusFilter = ['published', 'ongoing'];
    let query;
    if (req.query.status && allowedStatusFilter.includes(req.query.status)) {
      query = { status: req.query.status };
    } else {
      query = { status: { $in: ['published', 'ongoing'] } };
    }

    // Search by event name or organizer name
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim().split('').join('.*'), 'i');

      const matchingOrganizers = await Organizer.find({
        name: searchRegex
      }).select('_id');

      const organizerIds = matchingOrganizers.map(org => org._id);

      query.$or = [
        { name: searchRegex },
        { organizer: { $in: organizerIds } }
      ];
    }

    if (eventType && eventType !== 'all') {
      query.eventType = eventType;
    }

    if (eligibility && eligibility !== 'all') {
      query.eligibility = eligibility;
    }

    if (startDate) {
      query.startDate = { ...query.startDate, $gte: new Date(startDate) };
    }
    if (endDate) {
      query.startDate = { ...query.startDate, $lte: new Date(endDate) };
    }

    if (followedClubs && followedClubs !== 'all') {
      const clubIds = followedClubs.split(',');
      if (query.$or) {
        query.$and = [
          { organizer: { $in: clubIds } },
          { $or: query.$or }
        ];
        delete query.$or;
      } else {
        query.organizer = { $in: clubIds };
      }
    }

    const events = await Event.find(query)
      .populate('organizer', 'name category')
      .sort({ startDate: 1 });

    res.json(events.filter(e => e.organizer));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get trending events
router.get('/browse/trending', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const events = await Event.find({
      status: { $in: ['published', 'ongoing'] },
      createdAt: { $gte: last24Hours }
    })
      .populate('organizer', 'name category')
      .sort({ currentRegistrations: -1 })
      .limit(5);

    res.json(events.filter(e => e.organizer));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get overall analytics for organizer's completed events
router.get('/analytics/overall', verifyToken, async (req, res) => {
  try {
    const events = await Event.find({
      organizer: req.user.id,
      status: 'completed'
    });

    const eventIds = events.map(e => e._id);
    const registrations = await Registration.find({
      event: { $in: eventIds },
      status: { $ne: 'cancelled' }
    });

    const totalRegistrations = registrations.filter(r => r.status === 'confirmed' || r.status === 'attended').length;
    const totalAttendance = registrations.filter(r => r.status === 'attended').length;
    const totalRevenue = registrations
      .filter(r => r.isMerchandise && r.paymentStatus === 'completed')
      .reduce((sum, r) => sum + (r.totalAmount || 0), 0);

    res.json({ totalRegistrations, totalAttendance, totalRevenue });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get analytics for specific event
router.get('/:eventId/analytics', verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event || !event.organizer.equals(req.user.id)) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const registrations = await Registration.find({
      event: req.params.eventId,
      status: { $ne: 'cancelled' }
    }).populate('team', 'teamName');

    const totalRegistrations = registrations.length;
    const attendance = registrations.filter(r => r.status === 'attended').length;
    const revenue = registrations
      .filter(r => r.isMerchandise && r.paymentStatus === 'completed')
      .reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const sales = registrations.filter(r => r.paymentStatus === 'completed').length;
    const uniqueTeams = [...new Set(registrations.filter(r => r.team).map(r => r.team._id?.toString()))].length;

    res.json({
      totalRegistrations,
      attendance,
      revenue,
      sales,
      teamCompletion: uniqueTeams,
      registrationLimit: event.registrationLimit
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get participants list for an event
router.get('/:eventId/participants', verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event || !event.organizer.equals(req.user.id)) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const registrations = await Registration.find({
      event: req.params.eventId,
      status: { $ne: 'cancelled' }
    })
      .populate('participant', 'firstName lastName email')
      .populate('team', 'teamName')
      .sort({ registrationDate: -1 });

    const participants = registrations.map(r => ({
      name: `${r.participant.firstName} ${r.participant.lastName}`,
      email: r.participant.email,
      registeredAt: r.registrationDate,
      paymentStatus: r.paymentStatus,
      team: r.team?.teamName || r.customFormData?.teamName || 'N/A',
      attended: r.status === 'attended'
    }));

    res.json(participants);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
