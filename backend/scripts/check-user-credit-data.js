import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

async function checkUserCreditData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find the user with the email
    const user = await User.findOne({ email: 'amanabraham724@gmail.com' })
      .select('creditHistory email name');
    
    if (!user) {
      console.error('User not found');
      process.exit(1);
    }

    console.log(`\n=== User Credit Data ===`);
    console.log(`Email: ${user.email}`);
    console.log(`Credit History Entries: ${user.creditHistory?.length || 0}`);
    console.log(`Credit Score Entries: ${user.creditScores?.length || 0}`);

    if (user.creditHistory?.length > 0) {
      console.log('\n=== Credit History (first 5 entries) ===');
      user.creditHistory.slice(0, 5).forEach((entry, index) => {
        console.log(`\nEntry ${index + 1}:`);
        console.log(`- Date: ${entry.date}`);
        console.log(`- Score: ${entry.score}`);
        console.log(`- Source: ${entry.source || 'N/A'}`);
        console.log(`- ID: ${entry._id}`);
      });
    }

    if (user.creditScores?.length > 0) {
      console.log('\n=== Credit Scores (first 5 entries) ===');
      user.creditScores.slice(0, 5).forEach((score, index) => {
        console.log(`\nScore ${index + 1}:`);
        console.log(`- Date: ${score.date}`);
        console.log(`- Score: ${score.score}`);
        console.log(`- Source: ${score.source || 'N/A'}`);
        console.log(`- ID: ${score._id}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking user credit data:', error);
    process.exit(1);
  }
}

checkUserCreditData();
