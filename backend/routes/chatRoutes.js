const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Team = require('../models/Team');
const { verifyToken } = require('../middleware/authMiddleware');

// Get message history for a team
router.get('/:teamId/messages', verifyToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const participantId = req.user.id;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const isMember = team.members.some(m => m.participant.toString() === participantId) ||
                      team.leader.toString() === participantId;
    if (!isMember) return res.status(403).json({ message: 'Not a team member' });

    const messages = await Message.find({ team: teamId })
      .populate('sender', 'firstName lastName')
      .sort({ createdAt: 1 })
      .limit(200);

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
