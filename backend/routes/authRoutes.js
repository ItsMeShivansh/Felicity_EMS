const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');

// Register
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, type, contactNumber, collegeName, role } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Invalid input' });
    }

    if (email === "admin@felicity.iiit.ac.in") {
      let user = await Participant.findOne({ email });
      if (user && bcrypt.compareSync(password, user.password)) {
        const token = jwt.sign(
          { id: user._id, role: 'admin' },
          process.env.JWT_SECRET,
          { expiresIn: '1d' }
        )
        return res.json({ token, user: { Name: "Admin", role: "admin", email: user.email } })
      }
    }

    if (type === 'IIIT' && !email.endsWith('.iiit.ac.in')) {
      return res.status(400).json({ message: "Use a valid IIIT email." });
    }

    const existingUser = await Participant.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newParticipant = new Participant({
      firstName, lastName, email,
      password: hashedPassword,
      type, contactNumber,
      collegeName: collegeName || ''
    });

    await newParticipant.save();

    const token = jwt.sign(
      { id: newParticipant._id, role: 'participant' },
      process.env.JWT_SECRET || 'secret_key_change_me',
      { expiresIn: '1d' }
    );

    res.status(201).json({
      message: "Registration Successful!",
      token,
      user: {
        id: newParticipant._id,
        firstName: newParticipant.firstName,
        email: newParticipant.email,
        role: 'participant',
        preferencesSet: false
      },
      requiresOnboarding: true
    });

  } catch (e) {
    res.status(500).json({ message: "Server Error", error: e.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Invalid input' });
    }

    let user;
    let userRole;

    if (role === 'organizer') {
      user = await Organizer.findOne({ loginEmail: email });
      userRole = 'organizer';
    } else if (role === 'participant') {
      user = await Participant.findOne({ email });
      if (user && user.email === 'admin@felicity.iiit.ac.in') {
        userRole = 'admin';
      } else {
        userRole = 'participant';
      }
    } else {
      user = await Participant.findOne({ email });
      if (user) {
        userRole = user.email === 'admin@felicity.iiit.ac.in' ? 'admin' : 'participant';
      } else {
        user = await Organizer.findOne({ loginEmail: email });
        if (user) {
          userRole = 'organizer';
        }
      }
    }

    if (!user) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    if (userRole === 'organizer' && user.isActive === false) {
      return res.status(403).json({ message: "Account has been disabled. Please contact admin." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: userRole },
      process.env.JWT_SECRET || 'secret_key_change_me',
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: userRole === 'organizer' ? user.name : user.firstName,
        email: userRole === 'organizer' ? user.loginEmail : user.email,
        role: userRole,
        preferencesSet: userRole === 'participant' ? user.preferencesSet : undefined
      }
    });

  } catch (e) {
    res.status(500).json({ message: "Server Error" });
  }
})

module.exports = router;