import mongoose from 'mongoose';

const LoanDecisionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  creditScore: {
    type: Number,
    required: true
  },
  decision: {
    type: Object,
    required: true
  },
  engineVersion: {
    type: String,
    default: 'v101'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const LoanDecision = mongoose.model('LoanDecision', LoanDecisionSchema);
export default LoanDecision; 