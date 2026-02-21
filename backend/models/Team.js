const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  teamName: { type: String, required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  leader: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },
  members: [{
    participant: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant' },
    joinedAt: { type: Date, default: Date.now }
  }],
  inviteCode: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['forming', 'complete', 'cancelled'],
    default: 'forming'
  },
  maxSize: { type: Number, required: true },
  minSize: { type: Number, default: 2 }
}, { timestamps: true });

// Index for quick lookups
teamSchema.index({ event: 1, leader: 1 });

module.exports = mongoose.model('Team', teamSchema);
