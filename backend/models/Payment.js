import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'ETB'
  },
  plan: {
    type: String,
    enum: ['starter', 'premium'],
    required: true
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['telebirr', 'cbe_birr', 'bank_transfer'],
    required: true
  },
  transactionId: String,
  paymentDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  errorDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  completedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamps on save
paymentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create order ID
paymentSchema.pre('save', function(next) {
  if (!this.orderId) {
    // Format: CS-YYYYMMDD-RANDOM
    const date = new Date().toISOString().slice(0,10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.orderId = `CS-${date}-${random}`;
  }
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment; 