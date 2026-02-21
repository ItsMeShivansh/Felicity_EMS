const mongoose = require('mongoose');

const INTEREST_TAGS = [
  'Technical', 'Sports', 'Cultural', 'Arts', 
  'Music', 'Dance', 'Drama', 'Photography',
  'Gaming', 'Coding', 'AI/ML', 'Cybersecurity',
  'Web Development', 'Mobile Development',
  'Business', 'Entrepreneurship', 'Social',
  'Environment', 'Health', 'Fitness', 
  'Literature', 'Debate', 'Quizzing'
];

const organizerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  loginEmail: { type: String, required: true, unique: true },
  contactEmail: { type: String, required: true },
  contactNumber: { type: String, required: true },
  password: { type: String, required: true },
  discordWebhook: { type: String, default: '' },
  events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  specialization: {
    type: [String],
    enum: INTEREST_TAGS,
    default: []
  },
  followerCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  passwordResetRequests: [{
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    adminComment: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Organizer', organizerSchema);
