const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const Event = require('../models/Event');
const Participant = require('../models/Participant');
const Registration = require('../models/Registration');
const { verifyToken } = require('../middleware/authMiddleware');
const { generateTicketId, generateTicket } = require('../utils/qrCodeGenerator');
const { sendTicketEmail } = require('../utils/emailService');
const crypto = require('crypto');

// Generate a short invite code
const generateInviteCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// Create a team (team leader creates)
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { eventId, teamName } = req.body;
    const leaderId = req.user.id;

    if (!eventId || !teamName) {
      return res.status(400).json({ message: 'Event ID and team name are required' });
    }

    // Check event exists and is hackathon type
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (event.eventType !== 'hackathon') {
      return res.status(400).json({ message: 'Teams can only be created for hackathon events' });
    }
    if (!event.isRegistrationOpen()) {
      return res.status(400).json({ message: 'Registration is not open for this event' });
    }

    // Check if participant exists
    const participant = await Participant.findById(leaderId);
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    // Check if participant is already in a team for this event
    const existingTeam = await Team.findOne({
      event: eventId,
      $or: [
        { leader: leaderId },
        { 'members.participant': leaderId }
      ],
      status: { $ne: 'cancelled' }
    });
    if (existingTeam) {
      return res.status(400).json({ message: 'You are already in a team for this event' });
    }

    // Check if already registered individually
    const existingReg = await Registration.findOne({
      participant: leaderId,
      event: eventId,
      status: { $ne: 'cancelled' }
    });
    if (existingReg) {
      return res.status(400).json({ message: 'You are already registered for this event' });
    }

    const inviteCode = generateInviteCode();
    const team = new Team({
      teamName,
      event: eventId,
      leader: leaderId,
      members: [{ participant: leaderId }],
      inviteCode,
      maxSize: event.teamSettings?.maxSize || 4,
      minSize: event.teamSettings?.minSize || 2,
      status: 'forming'
    });

    await team.save();

    res.status(201).json({
      message: 'Team created successfully! Share the invite code with your teammates.',
      team: {
        _id: team._id,
        teamName: team.teamName,
        inviteCode: team.inviteCode,
        maxSize: team.maxSize,
        minSize: team.minSize,
        memberCount: team.members.length,
        status: team.status
      }
    });
  } catch (err) {
    console.error('Error creating team:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Join a team via invite code
router.post('/join', verifyToken, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const participantId = req.user.id;

    if (!inviteCode) {
      return res.status(400).json({ message: 'Invite code is required' });
    }

    const team = await Team.findOne({ inviteCode, status: 'forming' });
    if (!team) {
      return res.status(404).json({ message: 'Invalid or expired invite code' });
    }

    // Check participant exists
    const participant = await Participant.findById(participantId);
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    // Check if already in a team for this event
    const existingTeam = await Team.findOne({
      event: team.event,
      $or: [
        { leader: participantId },
        { 'members.participant': participantId }
      ],
      status: { $ne: 'cancelled' }
    });
    if (existingTeam) {
      return res.status(400).json({ message: 'You are already in a team for this event' });
    }

    // Check if already registered individually
    const existingReg = await Registration.findOne({
      participant: participantId,
      event: team.event,
      status: { $ne: 'cancelled' }
    });
    if (existingReg) {
      return res.status(400).json({ message: 'You are already registered for this event' });
    }

    // Check if team is full
    if (team.members.length >= team.maxSize) {
      return res.status(400).json({ message: 'Team is already full' });
    }

    // Check event registration is still open
    const event = await Event.findById(team.event);
    if (!event || !event.isRegistrationOpen()) {
      return res.status(400).json({ message: 'Registration is closed for this event' });
    }

    // Add member to team
    team.members.push({ participant: participantId });

    // Check if team is now complete (reached maxSize)
    if (team.members.length >= team.maxSize) {
      team.status = 'complete';
      await team.save();

      // Auto-generate tickets for all members
      await generateTeamTickets(team, event);
    } else {
      await team.save();
    }

    await team.populate('members.participant', 'firstName lastName email');

    res.json({
      message: team.status === 'complete' 
        ? 'Team is now complete! Tickets have been generated for all members.' 
        : 'Successfully joined the team!',
      team: {
        _id: team._id,
        teamName: team.teamName,
        inviteCode: team.inviteCode,
        maxSize: team.maxSize,
        minSize: team.minSize,
        memberCount: team.members.length,
        members: team.members.map(m => ({
          name: `${m.participant.firstName} ${m.participant.lastName}`,
          joinedAt: m.joinedAt
        })),
        status: team.status
      }
    });
  } catch (err) {
    console.error('Error joining team:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Mark team as complete manually (leader only, if min size reached)
router.post('/:teamId/complete', verifyToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const leaderId = req.user.id;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    if (team.leader.toString() !== leaderId) {
      return res.status(403).json({ message: 'Only the team leader can complete the team' });
    }
    if (team.status !== 'forming') {
      return res.status(400).json({ message: 'Team is already ' + team.status });
    }
    if (team.members.length < team.minSize) {
      return res.status(400).json({ 
        message: `Team needs at least ${team.minSize} members. Currently has ${team.members.length}.` 
      });
    }

    const event = await Event.findById(team.event);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check enough slots
    const slotsNeeded = team.members.length;
    const availableSlots = event.registrationLimit - event.currentRegistrations;
    if (slotsNeeded > availableSlots) {
      return res.status(400).json({ message: 'Not enough slots available for the team' });
    }

    team.status = 'complete';
    await team.save();

    // Generate tickets for all members
    await generateTeamTickets(team, event);

    res.json({
      message: 'Team completed! Tickets generated for all members.',
      team: {
        _id: team._id,
        teamName: team.teamName,
        status: team.status,
        memberCount: team.members.length
      }
    });
  } catch (err) {
    console.error('Error completing team:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get team details for an event (participant view)
router.get('/my-team/:eventId', verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const participantId = req.user.id;

    const team = await Team.findOne({
      event: eventId,
      $or: [
        { leader: participantId },
        { 'members.participant': participantId }
      ],
      status: { $ne: 'cancelled' }
    }).populate('members.participant', 'firstName lastName email')
      .populate('leader', 'firstName lastName email')
      .populate('event', 'name teamSettings');

    if (!team) {
      return res.json({ team: null });
    }

    res.json({
      team: {
        _id: team._id,
        teamName: team.teamName,
        inviteCode: team.inviteCode,
        maxSize: team.maxSize,
        minSize: team.minSize,
        status: team.status,
        isLeader: team.leader._id.toString() === participantId,
        leader: {
          name: `${team.leader.firstName} ${team.leader.lastName}`,
          email: team.leader.email
        },
        members: team.members.map(m => ({
          _id: m.participant._id,
          name: `${m.participant.firstName} ${m.participant.lastName}`,
          email: m.participant.email,
          joinedAt: m.joinedAt
        })),
        eventName: team.event?.name
      }
    });
  } catch (err) {
    console.error('Error fetching team:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get team info by teamId (for chat)
router.get('/info/:teamId', verifyToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const participantId = req.user.id;

    const team = await Team.findById(teamId)
      .populate('members.participant', 'firstName lastName email')
      .populate('leader', 'firstName lastName email')
      .populate('event', 'name');

    if (!team) return res.status(404).json({ message: 'Team not found' });

    const isMember = team.members.some(m => m.participant._id.toString() === participantId) ||
                      team.leader._id.toString() === participantId;
    if (!isMember) return res.status(403).json({ message: 'Not a team member' });

    res.json({
      team: {
        _id: team._id,
        teamName: team.teamName,
        status: team.status,
        members: team.members.map(m => ({
          _id: m.participant._id,
          name: `${m.participant.firstName} ${m.participant.lastName}`,
          email: m.participant.email
        })),
        leader: {
          _id: team.leader._id,
          name: `${team.leader.firstName} ${team.leader.lastName}`
        },
        eventName: team.event?.name
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get teams for an event (organizer view)
router.get('/event/:eventId', verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const teams = await Team.find({ event: eventId })
      .populate('leader', 'firstName lastName email')
      .populate('members.participant', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({ teams });
  } catch (err) {
    console.error('Error fetching teams:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Helper: Generate tickets for all team members
async function generateTeamTickets(team, event) {
  for (const member of team.members) {
    const participant = await Participant.findById(member.participant);
    if (!participant) continue;

    // Check if already has a registration
    const existingReg = await Registration.findOne({
      participant: member.participant,
      event: team.event,
      status: { $ne: 'cancelled' }
    });
    if (existingReg) continue;

    const ticketId = generateTicketId();
    const participantName = `${participant.firstName} ${participant.lastName}`;
    const ticket = await generateTicket(
      ticketId,
      event._id.toString(),
      member.participant.toString(),
      event.name,
      participantName
    );

    const registration = new Registration({
      ticketId: ticket.ticketId,
      participant: member.participant,
      event: team.event,
      qrCode: ticket.qrCode,
      customFormData: { teamName: team.teamName, teamId: team._id },
      isMerchandise: false,
      status: 'confirmed',
      team: team._id
    });

    await registration.save();

    event.currentRegistrations += 1;
    event.registrations.push(registration._id);

    // Send email (async, don't wait)
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
  }

  await event.save();
}

module.exports = router;
