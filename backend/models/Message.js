const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'link', 'file'], default: 'text' }
}, { timestamps: true });

messageSchema.index({ team: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
