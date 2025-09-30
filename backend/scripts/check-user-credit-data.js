import mongoose from 'mongoose';
import User from '../models/User.js';
import CreditReport from '../models/CreditReport.js';
import CreditScore from '../models/CreditScore.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkUserCreditData(phoneNumber) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/credit-score-dashboard');
    console.log('Connected to MongoDB');

    // Find user by phone number
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      console.log(`❌ User not found with phone number: ${phoneNumber}`);
      return;
    }

    console.log(`✅ User found: ${user.name} (ID: ${user._id})`);
    console.log(`📱 Phone: ${user.phoneNumber}`);
    console.log(`📧 Email: ${user.email}`);

    // Check user's credit score field
    console.log('\n📊 User Credit Score Field:');
    console.log(`   creditScore: ${user.creditScore}`);
    console.log(`   latestScore: ${user.latestScore}`);
    console.log(`   creditScoreLastUpdated: ${user.creditScoreLastUpdated}`);

    // Check CreditReport
    const creditReport = await CreditReport.findOne({ userId: user._id });
    if (creditReport) {
      console.log('\n📋 Credit Report Found:');
      console.log(`   FICO Score: ${creditReport.creditScore?.fico?.score}`);
      console.log(`   Classification: ${creditReport.creditScore?.fico?.classification}`);
      console.log(`   Last Updated: ${creditReport.creditScore?.fico?.lastUpdated}`);
      console.log(`   Monthly Income: ${creditReport.monthlyIncome}`);
      console.log(`   Total Debt: ${creditReport.totalDebt}`);
    } else {
      console.log('\n❌ No Credit Report found for this user');
    }

    // Check CreditScore documents
    const creditScores = await CreditScore.find({ user: user._id });
    console.log(`\n📈 Credit Score Documents: ${creditScores.length}`);
    creditScores.forEach((score, index) => {
      console.log(`   ${index + 1}. Score: ${score.score}, Classification: ${score.classification}, Date: ${score.uploadedAt}`);
    });

    // Check user's credit history
    console.log(`\n📚 User Credit History: ${user.creditHistory?.length || 0} entries`);
    if (user.creditHistory && user.creditHistory.length > 0) {
      user.creditHistory.forEach((entry, index) => {
        console.log(`   ${index + 1}. Score: ${entry.score}, Date: ${entry.date}, Source: ${entry.source}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking user credit data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Get phone number from command line argument
const phoneNumber = process.argv[2];
if (!phoneNumber) {
  console.log('Usage: node check-user-credit-data.js <phone_number>');
  console.log('Example: node check-user-credit-data.js +251913131313');
  process.exit(1);
}

checkUserCreditData(phoneNumber);
