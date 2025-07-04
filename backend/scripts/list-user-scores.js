// List the latest CreditScore for a user
import mongoose from 'mongoose';
import CreditScore from '../models/CreditScore.js';
import dotenv from 'dotenv';

dotenv.config();

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node scripts/list-user-scores.js <userId>');
  process.exit(1);
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
    const score = await CreditScore.findOne({ user: userId })
      .sort({ createdAt: -1 })
      .lean();
    if (!score) {
      console.log('No credit score found for user:', userId);
    } else {
      console.log('Latest credit score for user', userId, ':');
      console.log(JSON.stringify(score, null, 2));
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

main(); 