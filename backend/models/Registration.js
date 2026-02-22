const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  participant: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  registrationDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['confirmed', 'cancelled', 'attended'], default: 'confirmed' },
  qrCode: { type: String, default: '' },
  customFormData: { type: Object, default: {} },
  isMerchandise: { type: Boolean, default: false },
  itemsPurchased: [{ itemName: String, quantity: Number, price: Number }],
  totalAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  paymentProof: { type: String, default: '' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null }
}, { timestamps: true });

registrationSchema.index({ participant: 1, event: 1 });
registrationSchema.index({ ticketId: 1 });
registrationSchema.index({ event: 1 });

module.exports = mongoose.model('Registration', registrationSchema);
