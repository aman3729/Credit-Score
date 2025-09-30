import mongoose from 'mongoose';
import User from '../models/User.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://parzival:theoasis@credit-score-dashboard.w2bwj1o.mongodb.net/credit-score-dashboard?retryWrites=true&w=majority';

const updateUserBank = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to database');

    // Find all users and update their bankId to CBE if not set
    const users = await User.find({});
    console.log(`Found ${users.length} users in database`);

    let updatedCount = 0;
    for (const user of users) {
      if (!user.bankId || user.bankId === '') {
        user.bankId = 'CBE';
        await user.save();
        updatedCount++;
        console.log(`Updated user ${user.username || user.email} bankId to CBE`);
      } else {
        console.log(`User ${user.username || user.email} already has bankId: ${user.bankId}`);
      }
    }

    console.log(`Updated ${updatedCount} users with CBE bankId`);

    // Show current users and their bank associations
    console.log('\nCurrent users and their bank associations:');
    const allUsers = await User.find({});
    allUsers.forEach(user => {
      console.log(`- ${user.username || user.email}: ${user.bankId} (${user.role})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
};

// Run the function
updateUserBank(); 