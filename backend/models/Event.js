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

module.exports.INTEREST_TAGS = INTEREST_TAGS;

// Custom registration form field schema
const formFieldSchema = new mongoose.Schema({
  fieldName: { type: String, required: true },
  fieldType: {
    type: String,
    enum: ['text', 'email', 'number', 'textarea', 'select', 'radio', 'checkbox', 'date', 'file'],
    required: true
  },
  label: { type: String, required: true },
  placeholder: { type: String },
  required: { type: Boolean, default: false },
  options: [{ type: String }],
  validation: {
    minLength: { type: Number },
    maxLength: { type: Number },
    min: { type: Number },
    max: { type: Number },
    pattern: { type: String }
  }
}, { _id: false });

// Merchandise variant schema
const merchandiseVariantSchema = new mongoose.Schema({
  size: { type: String },
  color: { type: String },
  variant: { type: String },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
  sku: { type: String }
}, { _id: true });

// Participant registration schema
const registrationSchema = new mongoose.Schema({
  participant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant',
    required: true
  },
  formData: { type: Map, of: mongoose.Schema.Types.Mixed },
  merchandiseDetails: {
    variant: { type: mongoose.Schema.Types.ObjectId },
    quantity: { type: Number, default: 1 },
    totalPrice: { type: Number }
  },
  registeredAt: { type: Date, default: Date.now },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['registered', 'waitlisted', 'cancelled'],
    default: 'registered'
  }
}, { _id: true });

// Event schema
const eventSchema = new mongoose.Schema({
  name: { type: String },
  description: { type: String },

  eventType: {
    type: String,
    enum: ['normal', 'merchandise', 'hackathon'],
    default: 'normal'
  },

  teamSettings: {
    minSize: { type: Number, default: 2 },
    maxSize: { type: Number, default: 4 }
  },

  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organizer',
    required: true
  },

  tags: [{
    type: String,
    enum: INTEREST_TAGS
  }],

  eligibility: {
    type: String,
    default: 'Open to all'
  },

  registrationDeadline: { type: Date },
  startDate: { type: Date },
  endDate: { type: Date },

  location: { type: String },
  venue: { type: String },
  isOnline: { type: Boolean, default: false },
  meetingLink: { type: String },

  registrationLimit: { type: Number },

  entryFee: { type: Number, default: 0 },

  registrations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Registration'
  }],
  currentRegistrations: { type: Number, default: 0 },

  customRegistrationForm: {
    enabled: { type: Boolean, default: false },
    fields: [formFieldSchema]
  },

  merchandiseDetails: {
    variants: [merchandiseVariantSchema],
    purchaseLimitPerParticipant: { type: Number, default: 1 },
    returnPolicy: { type: String },
    shippingInfo: { type: String }
  },

  status: {
    type: String,
    enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'],
    default: 'draft'
  },

  rules: { type: String },
  prizes: { type: String },
  contactInfo: {
    email: { type: String },
    phone: { type: String }
  },

  bannerImage: { type: String },
  images: [{ type: String }]

}, { timestamps: true });

// Check if event is full
eventSchema.methods.isFull = function () {
  if (this.registrationLimit == null || isNaN(this.registrationLimit)) return false;
  return this.currentRegistrations >= this.registrationLimit;
};

// Check if registration is open
eventSchema.methods.isRegistrationOpen = function () {
  const now = new Date();
  return (
    this.status === 'published' &&
    now < this.registrationDeadline &&
    !this.isFull()
  );
};

// Check if event has started
eventSchema.methods.hasStarted = function () {
  return new Date() >= this.startDate;
};

// Check if event has ended
eventSchema.methods.hasEnded = function () {
  return new Date() > this.endDate;
};

// Check if form can be edited
eventSchema.methods.canEditForm = function () {
  if (this.status === 'draft') return true;
  return this.currentRegistrations === 0;
};

// Get editable fields based on event status
eventSchema.methods.getEditableFields = function () {
  switch (this.status) {
    case 'draft':
      return 'all';
    case 'published':
      return ['description', 'registrationDeadline', 'registrationLimit'];
    case 'ongoing':
      return ['status'];
    case 'completed':
      return [];
    case 'cancelled':
      return [];
    default:
      return [];
  }
};

// Check if event can be published
eventSchema.methods.canPublish = function () {
  const now = new Date();
  return this.status === 'draft' &&
    this.name &&
    this.eventType &&
    this.description &&
    this.registrationDeadline &&
    this.startDate &&
    this.endDate &&
    this.tags && this.tags.length > 0 &&
    this.registrationDeadline > now &&
    this.startDate > this.registrationDeadline &&
    this.endDate > this.startDate;
};

// Check if event can transition to ongoing
eventSchema.methods.canMarkAsOngoing = function () {
  return this.status === 'published' && this.hasStarted();
};

// Check if event can transition to completed
eventSchema.methods.canMarkAsCompleted = function () {
  return this.status === 'ongoing' && this.hasEnded();
};

// Pre-save validation for non-draft events
eventSchema.pre('save', async function () {
  if (this.status === 'draft' || this.status === 'cancelled') {
    return;
  }

  // Reject publishing with a past registration deadline
  if (this.isModified('status') && this.status === 'published') {
    const now = new Date();
    if (this.registrationDeadline && this.registrationDeadline <= now) {
      const error = new Error('Registration deadline must be in the future to publish');
      error.name = 'ValidationError';
      throw error;
    }
  }

  const requiredFields = {
    name: 'Event name is required for published events',
    eventType: 'Event type is required for published events',
    description: 'Description is required for published events',
    registrationDeadline: 'Registration deadline is required for published events',
    startDate: 'Start date is required for published events',
    endDate: 'End date is required for published events'
  };

  for (const [field, message] of Object.entries(requiredFields)) {
    if (!this[field]) {
      const error = new Error(message);
      error.name = 'ValidationError';
      throw error;
    }
  }

  if (!this.tags || this.tags.length === 0) {
    const error = new Error('At least one tag/category is required for published events');
    error.name = 'ValidationError';
    throw error;
  }

  if (this.registrationLimit !== undefined && this.registrationLimit !== null && this.registrationLimit <= 0) {
    const error = new Error('Registration limit must be greater than 0 if specified');
    error.name = 'ValidationError';
    throw error;
  }

  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    const error = new Error('Start date must be before end date');
    error.name = 'ValidationError';
    throw error;
  }

  if (this.registrationDeadline && this.startDate && this.registrationDeadline > this.startDate) {
    const error = new Error('Registration deadline must be before start date');
    error.name = 'ValidationError';
    throw error;
  }
});

module.exports = mongoose.model('Event', eventSchema);
