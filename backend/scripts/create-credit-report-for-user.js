import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });
import mongoose from 'mongoose';
import User from '../models/User.js';
import CreditReport from '../models/CreditReport.js';

async function main() {
  const identifier = process.argv[2];
  if (!identifier) {
    console.error('Usage: node backend/scripts/create-credit-report-for-user.js <username|phoneNumber>');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI || process.env.DATABASE || process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Find user by username or phone number
  const user = await User.findOne({
    $or: [
      { username: identifier },
      { phoneNumber: identifier }
    ]
  }).lean();
  if (!user) {
    console.error('User not found');
    process.exit(1);
  }

  // Get latest score from creditHistory
  const latest = (user.creditHistory || []).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  if (!latest) {
    console.error('No credit history found for user');
    process.exit(1);
  }

  // Create credit report
  const report = new CreditReport({
    userId: user._id,
    creditScore: { fico: { score: latest.score } },
    creditAge: user.creditAge || 0,
    creditUtilization: user.creditUtilization || 0,
    totalDebt: user.totalDebt || 0,
    updatedAt: latest.date,
    createdAt: latest.date
  });
  await report.save();
  console.log('Credit report created:', report);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); }); 