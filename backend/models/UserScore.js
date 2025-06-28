import mongoose from 'mongoose';

const userScoreSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  score: {
    type: Number,
    required: true,
    min: 300,
    max: 850,
  },
  factors: [{
    name: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: 'fas fa-check-circle'
    },
    impact: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      required: true,
    },
    description: String,
    value: {
      type: Number,
      default: 0
    },
    current: {
      type: Number,
      default: 0
    }
  }],
  recommendations: [{
    text: {
      type: String,
      required: true
    },
    priority: {
      type: Number,
      default: 1
    }
  }],
  history: [{
    score: {
      type: Number,
      required: true,
      min: 300,
      max: 850,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  }],
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Pre-save middleware to update lastUpdated
userScoreSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

const UserScore = mongoose.model('UserScore', userScoreSchema);

export default UserScore;
