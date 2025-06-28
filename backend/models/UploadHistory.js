import mongoose from 'mongoose';

const uploadHistorySchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recordCount: {
    type: Number,
    required: true
  },
  successCount: {
    type: Number,
    required: true
  },
  errorCount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  errors: [{
    row: Number,
    message: String,
    field: String,
    value: String
  }],
  filePath: {
    type: String,
    required: false
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add indexes for better query performance
uploadHistorySchema.index({ uploadedBy: 1, uploadedAt: -1 });

// Virtual for success rate
uploadHistorySchema.virtual('successRate').get(function() {
  return this.recordCount > 0 
    ? Math.round((this.successCount / this.recordCount) * 100) 
    : 0;
});

const UploadHistory = mongoose.model('UploadHistory', uploadHistorySchema);

export default UploadHistory;
