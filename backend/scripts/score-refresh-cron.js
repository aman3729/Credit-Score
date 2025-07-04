import cron from 'node-cron';
import User from '../models/User.js';
import { calculateCreditScore } from '../utils/creditScoring.js';
import { evaluateLendingDecision } from '../utils/lendingDecision.js';
import LoanDecision from '../models/LoanDecision.js';

cron.schedule('0 2 * * *', async () => { // Every day at 2am
  const users = await User.find({ nextCreditReviewDate: { $lte: new Date() } });
  for (const user of users) {
    const updatedScore = calculateCreditScore(user.data); // Adjust as needed for your data structure
    const decision = evaluateLendingDecision(updatedScore, user.data);
    await LoanDecision.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        creditScore: updatedScore.score,
        decision,
        engineVersion: decision.engineVersion || 'v101',
        timestamp: new Date()
      },
      { upsert: true, new: true }
    );
    // Push to scoreHistory
    user.scoreHistory.push({
      date: new Date(),
      score: updatedScore.score,
      classification: updatedScore.classification,
      decision: decision.decision,
      reason: (decision.reasons && decision.reasons[0]) || '',
      triggeredBy: 'Auto-refresh'
    });
    // Update next review date
    user.nextCreditReviewDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await user.save();
    // Optionally: send notification to user
  }
}); 