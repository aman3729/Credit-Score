import mongoose from 'mongoose';

const securityLogSchema = new mongoose.Schema({
  // Reference to the user who performed the action
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Type of action performed (e.g., 'USER_LOGIN', 'PASSWORD_CHANGE', 'BATCH_UPLOAD')
  action: {
    type: String,
    required: true,
    index: true
  },
  
  // Additional details about the event
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // IP address of the user
  ipAddress: {
    type: String,
    index: true
  },
  
  // User agent string
  userAgent: String,
  
  // Timestamp of the event
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for common queries
securityLogSchema.index({ user: 1, timestamp: -1 });
securityLogSchema.index({ action: 1, timestamp: -1 });
securityLogSchema.index({ 'details.uploadId': 1 });

export default mongoose.model('SecurityLog', securityLogSchema);
