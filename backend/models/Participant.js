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

const participantSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  type: { type: String, enum: ['IIIT', 'Non-IIIT'], required: true },
  collegeName: { type: String, default: '' },
  contactNumber: { type: String, required: true },
  interests: { 
    type: [String], 
    enum: INTEREST_TAGS,
    default: []
  },
  followedOrganizers: { 
    type: [mongoose.Schema.Types.ObjectId], 
    ref: 'Organizer', 
    default: [] 
  },
  preferencesSet: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Participant', participantSchema);
