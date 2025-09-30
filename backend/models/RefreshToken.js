import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'User ID is required']
  },
  tokenHash: {  
    type: String, 
    required: [true, 'Token hash is required'],
    unique: true,
    validate: {
      validator: function(v) {
        return v !== null && v !== undefined && v !== '';
      },
      message: 'Token hash cannot be empty'
    }
  },
  expiresAt: {  
    type: Date, 
    required: [true, 'Expiration date is required']
  },
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: '7d' 
  },
  isRevoked: {
    type: Boolean,
    default: false
  },
  ip: {  
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  }
});

// Index for efficient queries
refreshTokenSchema.index({ user: 1, tokenHash: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to check if token is valid
refreshTokenSchema.methods.isValid = function() {
  return !this.isRevoked && this.expiresAt > new Date();
};

// Static method to clean expired tokens
refreshTokenSchema.statics.cleanExpired = async function() {
  return this.deleteMany({ expiresAt: { $lt: new Date() } });
};

// Static method to revoke all tokens for a user
refreshTokenSchema.statics.revokeAllForUser = async function(userId) {
  return this.updateMany(
    { user: userId },
    { isRevoked: true }
  );
};

export default mongoose.model('RefreshToken', refreshTokenSchema); 