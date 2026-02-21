const express = require('express');
const router = express.Router();
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
const Event = require('../models/Event');
const { verifyToken } = require('../middleware/authMiddleware');

// Update participant preferences
router.patch('/preferences', verifyToken, async (req, res) => {
  try {
    const { interests, followedOrganizers } = req.body;

    const currentParticipant = await Participant.findById(req.user.id);
    const currentFollowed = currentParticipant.followedOrganizers.map(id => id.toString());
    const newFollowed = followedOrganizers || [];

    const newlyFollowed = newFollowed.filter(id => !currentFollowed.includes(id));
    const unfollowed = currentFollowed.filter(id => !newFollowed.includes(id));

    const participant = await Participant.findByIdAndUpdate(
      req.user.id,
      {
        interests,
        followedOrganizers: newFollowed,
        preferencesSet: true
      },
      { new: true }
    ).select('-password');

    if (newlyFollowed.length > 0) {
      await Organizer.updateMany(
        { _id: { $in: newlyFollowed } },
        { $inc: { followerCount: 1 } }
      );
    }

    if (unfollowed.length > 0) {
      await Organizer.updateMany(
        { _id: { $in: unfollowed } },
        { $inc: { followerCount: -1 } }
      );
    }

    res.json({ message: 'Preferences updated successfully!', participant });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get participant preferences
router.get('/preferences', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'participant') {
      return res.status(404).json({ message: 'Participant not found' });
    }

    const participant = await Participant.findById(req.user.id)
      .populate('followedOrganizers', 'name category description')
      .select('-password');

    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    res.json({
      interests: participant.interests,
      followedOrganizers: participant.followedOrganizers,
      preferencesSet: participant.preferencesSet
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get personalized/recommended events
router.get('/events/recommended', verifyToken, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const participant = await Participant.findById(req.user.id);

    const allEvents = await Event.find({
      status: { $in: ['published', 'ongoing'] },
      startDate: { $gte: new Date() }
    })
      .populate('organizer', 'name category')
      .sort({ startDate: 1 });

    const scoredEvents = allEvents
      .filter(event => event.organizer)
      .map(event => {
        let score = 0;

        if (participant.followedOrganizers.some(orgId => orgId.equals(event.organizer._id))) {
          score += 100;
        }

        const matchingTags = event.tags.filter(tag =>
          participant.interests.includes(tag)
        );
        score += matchingTags.length * 10;

        const registeredCount = event.currentRegistrations;
        score += registeredCount;

        return {
          ...event.toObject(),
          recommendationScore: score,
          matchingTags: matchingTags,
          currentRegistrations: registeredCount,
          spotsLeft: event.registrationLimit - registeredCount
        };
      });

    scoredEvents.sort((a, b) => b.recommendationScore - a.recommendationScore);

    res.json(scoredEvents);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all events
router.get('/events', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const events = await Event.find({
      status: { $in: ['published', 'ongoing'] },
      startDate: { $gte: new Date() }
    })
      .populate('organizer', 'name category')
      .sort({ startDate: 1 });

    const eventsWithDetails = events.map(event => {
      const registeredCount = event.currentRegistrations;
      return {
        ...event.toObject(),
        currentRegistrations: registeredCount,
        spotsLeft: event.registrationLimit - registeredCount,
        isOpen: event.isRegistrationOpen()
      };
    });

    res.json(eventsWithDetails);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Register for an event
router.post('/events/:eventId/register', verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { formData, merchandiseDetails } = req.body;
    const participantId = req.user.id;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!event.isRegistrationOpen()) {
      return res.status(400).json({
        message: 'Registration is closed for this event'
      });
    }

    const alreadyRegistered = event.registrations.some(
      r => r.participant.equals(participantId) && r.status === 'registered'
    );

    if (alreadyRegistered) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }

    if (event.isFull()) {
      return res.status(400).json({ message: 'Event is full' });
    }

    // Validate merchandise details
    if (event.eventType === 'merchandise') {
      if (!merchandiseDetails || !merchandiseDetails.variantId) {
        return res.status(400).json({ message: 'Merchandise variant is required' });
      }

      const variant = event.merchandiseDetails.variants.id(merchandiseDetails.variantId);
      if (!variant) {
        return res.status(400).json({ message: 'Invalid merchandise variant' });
      }

      const quantity = merchandiseDetails.quantity || 1;

      if (quantity > event.merchandiseDetails.purchaseLimitPerParticipant) {
        return res.status(400).json({
          message: `Purchase limit is ${event.merchandiseDetails.purchaseLimitPerParticipant} per participant`
        });
      }

      if (variant.stock < quantity) {
        return res.status(400).json({ message: 'Insufficient stock' });
      }

      variant.stock -= quantity;
      merchandiseDetails.totalPrice = variant.price * quantity;
    }

    const registration = {
      participant: participantId,
      formData: formData || {},
      merchandiseDetails: event.eventType === 'merchandise' ? merchandiseDetails : undefined,
      status: 'registered'
    };

    event.registrations.push(registration);
    await event.save();

    res.json({
      message: 'Successfully registered for event!',
      registration: event.registrations[event.registrations.length - 1]
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Unregister from an event
router.delete('/events/:eventId/unregister', verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const participantId = req.user.id;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const registration = event.registrations.find(
      r => r.participant.equals(participantId) && r.status === 'registered'
    );

    if (!registration) {
      return res.status(400).json({ message: 'Not registered for this event' });
    }

    // Restore stock for merchandise events
    if (event.eventType === 'merchandise' && registration.merchandiseDetails) {
      const variant = event.merchandiseDetails.variants.id(registration.merchandiseDetails.variant);
      if (variant) {
        variant.stock += registration.merchandiseDetails.quantity;
      }
    }

    registration.status = 'cancelled';
    await event.save();

    res.json({ message: 'Successfully unregistered from event!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get participant's registered events
router.get('/my-events', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'participant') {
      return res.status(404).json({ message: 'Not found' });
    }

    const participantId = req.user.id;

    const events = await Event.find({
      'registrations.participant': participantId
    })
      .populate('organizer', 'name category')
      .sort({ startDate: -1 });

    const myEvents = events.map(event => {
      const myRegistration = event.registrations.find(
        r => r.participant.equals(participantId)
      );

      const now = new Date();
      const isUpcoming = event.startDate > now && event.status === 'published';
      const isCompleted = event.endDate < now || event.status === 'completed';

      return {
        ticketId: myRegistration._id,
        eventName: event.name,
        eventType: event.eventType,
        organizer: event.organizer.name,
        organizerCategory: event.organizer.category,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        participationStatus: myRegistration.status,
        registeredAt: myRegistration.registeredAt,
        formData: myRegistration.formData,
        merchandiseDetails: myRegistration.merchandiseDetails,
        paymentStatus: myRegistration.paymentStatus,
        isUpcoming,
        isCompleted,
        eventStatus: event.status
      };
    });

    const categorized = {
      upcoming: myEvents.filter(e => e.isUpcoming && e.participationStatus === 'registered'),
      normal: myEvents.filter(e => e.eventType === 'normal' && e.participationStatus === 'registered'),
      merchandise: myEvents.filter(e => e.eventType === 'merchandise' && e.participationStatus === 'registered'),
      completed: myEvents.filter(e => e.isCompleted && e.participationStatus === 'registered'),
      cancelled: myEvents.filter(e => e.participationStatus === 'cancelled')
    };

    res.json({ all: myEvents, categorized });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get participant profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const participant = await Participant.findById(req.user.id)
      .populate('followedOrganizers', 'name category')
      .select('-password');

    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    res.json(participant);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update participant profile
router.patch('/profile', verifyToken, async (req, res) => {
  try {
    const { firstName, lastName, contactNumber, collegeName, interests, followedOrganizers } = req.body;

    const currentParticipant = await Participant.findById(req.user.id);

    if (followedOrganizers) {
      const currentFollowed = currentParticipant.followedOrganizers.map(id => id.toString());
      const newFollowed = followedOrganizers;

      const newlyFollowed = newFollowed.filter(id => !currentFollowed.includes(id));
      const unfollowed = currentFollowed.filter(id => !newFollowed.includes(id));

      if (newlyFollowed.length > 0) {
        await Organizer.updateMany(
          { _id: { $in: newlyFollowed } },
          { $inc: { followerCount: 1 } }
        );
      }

      if (unfollowed.length > 0) {
        await Organizer.updateMany(
          { _id: { $in: unfollowed } },
          { $inc: { followerCount: -1 } }
        );
      }
    }

    const updatedParticipant = await Participant.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName, contactNumber, collegeName, interests, followedOrganizers },
      { new: true, runValidators: true }
    )
      .populate('followedOrganizers', 'name category')
      .select('-password');

    res.json({ message: 'Profile updated successfully', participant: updatedParticipant });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Change password
router.patch('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new passwords are required' });
    }

    const participant = await Participant.findById(req.user.id);

    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(currentPassword, participant.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    participant.password = hashedPassword;
    await participant.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
