const express = require('express');

const router = express.Router();
const bcrypt = require('bcryptjs');
const Organizer = require('../models/Organizer');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Team = require('../models/Team');

const { verifyAdmin } = require('../middleware/authMiddleware');

// Generate login email from organization name
const generateLoginEmail = (name) => {
  const sanitized = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return `${sanitized}@felicity.iiit.ac.in`;
};

// Generate random password
const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 10 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
};

// Reset organizer password
router.patch('/reset-organiser-password/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const updatedOrganizer = await Organizer.findByIdAndUpdate(
      id,
      { password: hashedPassword },
      { new: true }
    );

    if (!updatedOrganizer) {
      return res.status(404).json({ message: "Organizer not found." });
    }

    res.json({ message: "Password reset successfully!" });
  } catch (e) {
    res.status(500).json({ message: "Server Error", error: e.message });
  }
});

// Add new organizer
router.post('/add-organizer', verifyAdmin, async (req, res) => {
  try {
    const { name, category, description, contactEmail, contactNumber } = req.body;

    const loginEmail = generateLoginEmail(name);
    const generatedPassword = generatePassword();

    const existingOrganizer = await Organizer.findOne({ loginEmail });
    if (existingOrganizer) {
      return res.status(400).json({ message: "Organizer with this name already exists. Please use a different name." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(generatedPassword, salt);

    const newOrganizer = new Organizer({
      name, category, description,
      loginEmail, contactEmail, contactNumber,
      password: hashedPassword
    });

    await newOrganizer.save();

    res.status(201).json({
      message: "Organizer added successfully!",
      credentials: { loginEmail, password: generatedPassword, name }
    });
  } catch (e) {
    res.status(500).json({ message: "Server Error", error: e.message });
  }
});

// Get all organizers
router.get('/organizers', verifyAdmin, async (req, res) => {
  try {
    const organizers = await Organizer.find().select('-password');
    res.json(organizers);
  } catch (e) {
    res.status(500).json({ message: "Server Error", error: e.message });
  }
});

// Toggle organizer status (enable/disable)
router.patch('/organizers/:id/toggle-status', verifyAdmin, async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found." });
    }

    organizer.isActive = !organizer.isActive;
    await organizer.save();

    res.json({
      message: `Organizer ${organizer.isActive ? 'activated' : 'disabled'} successfully!`,
      isActive: organizer.isActive
    });
  } catch (e) {
    res.status(500).json({ message: "Server Error", error: e.message });
  }
});

// Delete organizer
router.delete('/organizers/:id', verifyAdmin, async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found." });
    }

    const events = await Event.find({ organizer: req.params.id });
    const eventIds = events.map(e => e._id);

    if (eventIds.length > 0) {
      await Registration.deleteMany({ event: { $in: eventIds } });
      await Team.deleteMany({ event: { $in: eventIds } });
      await Event.deleteMany({ organizer: req.params.id });
    }

    await Organizer.findByIdAndDelete(req.params.id);

    res.json({ message: "Organizer deleted successfully!" });
  } catch (e) {
    res.status(500).json({ message: "Server Error", error: e.message });
  }
});

// Get all password reset requests
router.get('/password-reset-requests', verifyAdmin, async (req, res) => {
  try {
    const organizers = await Organizer.find(
      { 'passwordResetRequests.0': { $exists: true } },
      'name category contactEmail loginEmail passwordResetRequests'
    );
    const requests = [];
    for (const org of organizers) {
      for (const r of org.passwordResetRequests) {
        requests.push({
          _id: r._id,
          organizer: { _id: org._id, name: org.name, category: org.category, contactEmail: org.contactEmail, loginEmail: org.loginEmail },
          reason: r.reason,
          status: r.status,
          adminComment: r.adminComment,
          createdAt: r.createdAt
        });
      }
    }
    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(requests);
  } catch (e) {
    res.status(500).json({ message: 'Server Error', error: e.message });
  }
});

// Approve password reset request
router.patch('/password-reset-requests/:id/approve', verifyAdmin, async (req, res) => {
  try {
    const { comment } = req.body;
    const organizer = await Organizer.findOne({ 'passwordResetRequests._id': req.params.id });
    if (!organizer) return res.status(404).json({ message: 'Request not found' });
    const request = organizer.passwordResetRequests.id(req.params.id);
    if (request.status !== 'pending') return res.status(400).json({ message: 'Request already processed' });

    const newPassword = generatePassword();
    const salt = await bcrypt.genSalt(10);
    organizer.password = await bcrypt.hash(newPassword, salt);

    request.status = 'approved';
    request.adminComment = comment || '';
    await organizer.save();

    res.json({ message: 'Password reset approved', newPassword });
  } catch (e) {
    res.status(500).json({ message: 'Server Error', error: e.message });
  }
});

// Reject password reset request
router.patch('/password-reset-requests/:id/reject', verifyAdmin, async (req, res) => {
  try {
    const { comment } = req.body;
    const organizer = await Organizer.findOne({ 'passwordResetRequests._id': req.params.id });
    if (!organizer) return res.status(404).json({ message: 'Request not found' });
    const request = organizer.passwordResetRequests.id(req.params.id);
    if (request.status !== 'pending') return res.status(400).json({ message: 'Request already processed' });

    request.status = 'rejected';
    request.adminComment = comment || '';
    await organizer.save();

    res.json({ message: 'Password reset request rejected' });
  } catch (e) {
    res.status(500).json({ message: 'Server Error', error: e.message });
  }
});

// Catch-all for non-admin tokens hitting admin routes
router.use((req, res, next) => {
  const token = req.headers['authorization'];
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
    } catch (e) {
      // Invalid token
    }
  }
  next();
});

module.exports = router;