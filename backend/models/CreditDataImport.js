import mongoose from 'mongoose';

const creditDataSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  nationalId: {
    type: String,
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  score: {
    type: Number,
    required: true,
    min: 300,
    max: 850
  },
  creditLimit: {
    type: Number,
    required: true,
    min: 0
  },
  balance: {
    type: Number,
    required: true,
    min: 0
  },
  utilization: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  inquiries: {
    type: Number,
    required: true,
    min: 0
  },
  accountAge: {
    type: Number,
    required: true,
    min: 0
  },
  importBatchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ImportBatch',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'error'],
    default: 'pending'
  },
  error: {
    type: String,
    default: null
  },
  processedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for faster lookups
creditDataSchema.index({ email: 1 });
creditDataSchema.index({ importBatchId: 1 });
creditDataSchema.index({ status: 1 });

const CreditDataImport = mongoose.model('CreditDataImport', creditDataSchema);

export default CreditDataImport;
