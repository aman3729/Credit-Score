import mongoose from 'mongoose';

const importBatchSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed', 'partial'],
    default: 'processing'
  },
  totalRecords: {
    type: Number,
    required: true,
    min: 0
  },
  processedRecords: {
    type: Number,
    default: 0
  },
  successfulRecords: {
    type: Number,
    default: 0
  },
  failedRecords: {
    type: Number,
    default: 0
  },
  errorList: [{
    row: Number,
    message: String,
    field: String,
    value: mongoose.Schema.Types.Mixed
  }],
  startedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      if (ret.errorList) {
        ret.errorList = ret.errorList;
      }
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for faster lookups
importBatchSchema.index({ startedBy: 1 });
importBatchSchema.index({ status: 1 });
importBatchSchema.index({ createdAt: -1 });

const ImportBatch = mongoose.model('ImportBatch', importBatchSchema);

export default ImportBatch;
