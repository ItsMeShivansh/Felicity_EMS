const express = require('express');
const router = express.Router();
const Organizer = require('../models/Organizer');
const Event = require('../models/Event');

const bcrypt = require('bcryptjs');
const { verifyToken } = require('../middleware/authMiddleware');

// Get all organizers
router.get('/', async (req, res) => {
  try {
    const organizers = await Organizer.find()
      .select('name category description followerCount');
    res.json(organizers);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get organizer profile
router.get('/profile/me', verifyToken, async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.user.id)
      .select('-password');

    if (!organizer) {
      return res.status(404).json({ message: 'Organizer not found' });
    }

    res.json(organizer);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update organizer profile
router.patch('/profile/me', verifyToken, async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.user.id);

    if (!organizer) {
      return res.status(404).json({ message: 'Organizer not found' });
    }

    const { name, category, description, contactEmail, contactNumber, discordWebhook } = req.body;

    if (name !== undefined) organizer.name = name;
    if (category !== undefined) organizer.category = category;
    if (description !== undefined) organizer.description = description;
    if (contactEmail !== undefined) organizer.contactEmail = contactEmail;
    if (contactNumber !== undefined) organizer.contactNumber = contactNumber;
    if (discordWebhook !== undefined) organizer.discordWebhook = discordWebhook;

    await organizer.save();

    const updatedOrganizer = await Organizer.findById(req.user.id).select('-password');
    res.json({ message: 'Profile updated successfully', organizer: updatedOrganizer });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Change password
router.patch('/profile/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    const organizer = await Organizer.findById(req.user.id);

    if (!organizer) {
      return res.status(404).json({ message: 'Organizer not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, organizer.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    organizer.password = await bcrypt.hash(newPassword, salt);
    await organizer.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Request password reset
router.post('/password-reset-request', verifyToken, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Please provide a reason for the reset request' });
    }

    // Atomically add request only if no pending request exists
    const result = await Organizer.findOneAndUpdate(
      {
        _id: req.user.id,
        'passwordResetRequests.status': { $ne: 'pending' }
      },
      {
        $push: { passwordResetRequests: { reason: reason.trim() } }
      },
      { new: true }
    );

    if (!result) {
      const organizer = await Organizer.findById(req.user.id);
      if (!organizer) return res.status(404).json({ message: 'Organizer not found' });
      return res.status(400).json({ message: 'You already have a pending reset request' });
    }

    res.status(201).json({ message: 'Password reset request submitted to admin' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get my password reset requests history
router.get('/password-reset-requests', verifyToken, async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.user.id, 'passwordResetRequests');
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });
    const requests = [...organizer.passwordResetRequests].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get organizer details with events
router.get('/:id', async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id)
      .select('name category description contactEmail followerCount');

    if (!organizer) {
      return res.status(404).json({ message: 'Organizer not found' });
    }

    const now = new Date();
    const allEvents = await Event.find({ organizer: req.params.id })
      .sort({ startDate: -1 });

    const upcomingEvents = allEvents.filter(e => new Date(e.startDate) >= now);
    const pastEvents = allEvents.filter(e => new Date(e.startDate) < now);

    res.json({
      organizer,
      events: {
        upcoming: upcomingEvents,
        past: pastEvents
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
