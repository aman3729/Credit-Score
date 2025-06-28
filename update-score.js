import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './backend/models/User.js';
import CreditScore from './backend/models/CreditScore.js';
import UserScore from './backend/models/UserScore.js';
import { calculateCreditScore } from './backend/utils/creditScoring.js';

dotenv.config();

async function updateUserScore(email) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      console.error('User not found');
      return;
    }

    console.log(`Found user: ${user.email} (${user._id})`);

    // Find the most recent credit score
    const creditScore = await CreditScore.findOne({ userId: user._id })
      .sort({ createdAt: -1 });

    if (!creditScore) {
      console.error('No credit score found for this user');
      return;
    }

    console.log('Current credit score:', creditScore.score);
    console.log('Factors:', {
      paymentHistory: creditScore.paymentHistory,
      creditUtilization: creditScore.creditUtilization,
      creditAge: creditScore.creditAge,
      creditMix: creditScore.creditMix,
      inquiries: creditScore.inquiries
    });

    // Calculate new score
    const newScore = calculateCreditScore({
      paymentHistory: creditScore.paymentHistory,
      creditUtilization: creditScore.creditUtilization,
      creditAge: creditScore.creditAge,
      creditMix: creditScore.creditMix,
      inquiries: creditScore.inquiries
    });

    console.log('New calculated score:', newScore);

    // Update CreditScore
    creditScore.score = newScore;
    creditScore.method = 'manual_recalculation';
    await creditScore.save();

    // Update UserScore
    await UserScore.findOneAndUpdate(
      { userId: user._id },
      { $set: { score: newScore } },
      { upsert: true, new: true }
    );

    console.log('Score updated successfully');
    
  } catch (error) {
    console.error('Error updating score:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.error('Please provide an email address');
  process.exit(1);
}

updateUserScore(email);
