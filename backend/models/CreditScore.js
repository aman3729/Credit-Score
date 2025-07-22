import mongoose from 'mongoose';

const factorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Factor name is required'],
    trim: true,
    minlength: [2, 'Factor name must be at least 2 characters'],
    maxlength: [50, 'Factor name cannot exceed 50 characters']
  },
  status: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    required: [true, 'Status is required']
  },
  impact: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
    required: [true, 'Impact level is required']
  },
  value: {
    type: Number,
    required: [true, 'Factor value is required'],
    min: [0, 'Value must be at least 0'],
    max: [100, 'Value cannot exceed 100']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [255, 'Description cannot exceed 255 characters']
  }
}, { _id: false });

const creditScoreSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  score: {
    type: Number,
    required: [true, 'Score is required'],
    min: [300, 'Score must be at least 300'],
    max: [850, 'Score cannot exceed 850']
  },
  classification: {
    type: String,
    enum: ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'],
    required: true
  },
  baseScore: {
    type: Number,
    required: true
  },
  breakdown: {
    type: Object,
    default: {}
  },
  factors: {
    type: [factorSchema],
    required: [true, 'Credit factors are required'],
    validate: {
      validator: factors => Array.isArray(factors) && factors.length > 0,
      message: 'At least one credit factor is required'
    }
  },
  reportDate: {
    type: Date,
    default: Date.now,
    index: -1
  },
  metadata: {
    bureau: {
      type: String,
      enum: ['experian', 'equifax', 'transunion', 'custom'],
      default: 'custom'
    },
    reportId: String,
    pullDate: {
      type: Date,
      default: Date.now
    }
  },
  lendingDecision: {
    decision: {
      type: String,
      enum: ['Approve', 'Review', 'Reject'],
      required: true,
      default: 'Review'
    },
    reasons: [{
      type: String,
      required: true
    }],
    recommendations: [{
      type: String,
      required: true
    }],
    evaluatedAt: {
      type: Date,
      default: Date.now
    }
  },
  notes: [{
    content: {
      type: String,
      required: [true, 'Note content is required'],
      maxlength: [500, 'Note cannot exceed 500 characters']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Note author is required']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      delete ret._id;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for optimized querying
creditScoreSchema.index({ user: 1, reportDate: -1 });
creditScoreSchema.index({ score: 1 });
creditScoreSchema.index({ 'metadata.bureau': 1, 'metadata.pullDate': -1 });

// Virtual for formatted score range
creditScoreSchema.virtual('scoreRange').get(function() {
  if (this.score >= 800) return 'Exceptional';
  if (this.score >= 740) return 'Very Good';
  if (this.score >= 670) return 'Good';
  if (this.score >= 580) return 'Fair';
  return 'Poor';
});

// Virtual for simplified factors summary
creditScoreSchema.virtual('factorsSummary').get(function() {
  return this.factors.map(factor => ({
    name: factor.name,
    status: factor.status,
    impact: factor.impact,
    value: factor.value
  }));
});

// Static method to get average score for a user
creditScoreSchema.statics.getAverageScore = async function(userId) {
  try {
    const result = await this.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { 
        $group: {
          _id: '$user',
          averageScore: { $avg: '$score' },
          count: { $sum: 1 },
          highestScore: { $max: '$score' },
          lowestScore: { $min: '$score' }
        } 
      }
    ]);

    if (result.length > 0) {
      const { averageScore, highestScore, lowestScore, count } = result[0];
      const User = mongoose.model('User');
      
      await User.findByIdAndUpdate(userId, {
        creditScoreHighest: highestScore,
        creditScoreLowest: lowestScore,
        creditScoreUpdates: count
      });
    }
  } catch (err) {
    console.error('Error updating average score:', err);
  }
};

// Update user's credit score after save
creditScoreSchema.post('save', async function(doc) {
  try {
    await doc.constructor.getAverageScore(doc.user);
  } catch (err) {
    console.error('Error in post-save hook:', err);
  }
});

// Update user's credit score after remove
creditScoreSchema.post('remove', async function(doc) {
  try {
    await doc.constructor.getAverageScore(doc.user);
  } catch (err) {
    console.error('Error in post-remove hook:', err);
  }
});

const CreditScore = mongoose.model('CreditScore', creditScoreSchema);

export default CreditScore;