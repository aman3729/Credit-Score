import mongoose from 'mongoose';
import User from '../models/User.js';
import CreditReport from '../models/CreditReport.js';
import CreditScore from '../models/CreditScore.js';
import dotenv from 'dotenv';

dotenv.config();

async function mergeDuplicateUsers(phoneBase) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/credit-score-dashboard');
    console.log('Connected to MongoDB');

    // Remove any existing + or spaces
    const cleanPhone = phoneBase.replace(/[+\s]/g, '');
    
    // Find both users
    const userWithoutPlus = await User.findOne({ phoneNumber: cleanPhone });
    const userWithPlus = await User.findOne({ phoneNumber: `+${cleanPhone}` });

    console.log(`\n🔍 Found users for phone: ${phoneBase}`);
    console.log('=' .repeat(50));

    if (!userWithoutPlus) {
      console.log('❌ User without + not found');
      return;
    }

    if (!userWithPlus) {
      console.log('❌ User with + not found');
      return;
    }

    console.log(`\n📱 User 1 (without +):`);
    console.log(`   ID: ${userWithoutPlus._id}`);
    console.log(`   Name: ${userWithoutPlus.name}`);
    console.log(`   Phone: ${userWithoutPlus.phoneNumber}`);
    console.log(`   Email: ${userWithoutPlus.email}`);
    console.log(`   Credit Score: ${userWithoutPlus.creditScore}`);
    console.log(`   Credit History: ${userWithoutPlus.creditHistory?.length || 0} entries`);

    console.log(`\n📱 User 2 (with +):`);
    console.log(`   ID: ${userWithPlus._id}`);
    console.log(`   Name: ${userWithPlus.name}`);
    console.log(`   Phone: ${userWithPlus.phoneNumber}`);
    console.log(`   Email: ${userWithPlus.email}`);
    console.log(`   Credit Score: ${userWithPlus.creditScore}`);
    console.log(`   Credit History: ${userWithPlus.creditHistory?.length || 0} entries`);

    // Determine which user has credit data and which is the target
    const userWithCreditData = userWithPlus.creditScore ? userWithPlus : null;
    const targetUser = userWithoutPlus; // This is the user you're currently logged in as

    if (!userWithCreditData) {
      console.log('\n❌ User with + prefix has no credit data to merge');
      return;
    }

    console.log(`\n✅ User with credit data: ${userWithCreditData.name} (${userWithCreditData._id})`);
    console.log(`🎯 Target user (your current login): ${targetUser.name} (${targetUser._id})`);

    // Get credit data from the user that has it
    const creditReport = await CreditReport.findOne({ userId: userWithCreditData._id });
    const creditScores = await CreditScore.find({ user: userWithCreditData._id });

    console.log(`\n📊 Credit data found:`);
    console.log(`   Credit Reports: ${creditReport ? 1 : 0}`);
    console.log(`   Credit Scores: ${creditScores.length}`);

    // Update the target user to have the credit data
    console.log(`\n🔄 Merging credit data to your current user: ${targetUser.name}...`);

    // Update CreditReport to point to the target user
    if (creditReport) {
      await CreditReport.updateOne(
        { userId: userWithCreditData._id },
        { userId: targetUser._id }
      );
      console.log('✅ CreditReport updated');
    }

    // Update CreditScore documents to point to the target user
    if (creditScores.length > 0) {
      await CreditScore.updateMany(
        { user: userWithCreditData._id },
        { user: targetUser._id }
      );
      console.log(`✅ ${creditScores.length} CreditScore documents updated`);
    }

    // Update the target user with credit data
    const updateData = {
      creditScore: userWithCreditData.creditScore,
      creditScoreLastUpdated: userWithCreditData.creditScoreLastUpdated,
      latestScore: userWithCreditData.latestScore
    };

    // Merge credit history
    if (userWithCreditData.creditHistory && userWithCreditData.creditHistory.length > 0) {
      updateData.$push = {
        creditHistory: { $each: userWithCreditData.creditHistory }
      };
    }

    await User.findByIdAndUpdate(targetUser._id, updateData);
    console.log('✅ User credit data updated');

    // Delete the duplicate user (the one with + prefix)
    await User.findByIdAndDelete(userWithCreditData._id);
    console.log(`✅ Deleted duplicate user: ${userWithCreditData.name}`);

    // Verify the merge
    const updatedUser = await User.findById(targetUser._id);
    console.log(`\n✅ Merge completed! Updated user:`);
    console.log(`   ID: ${updatedUser._id}`);
    console.log(`   Name: ${updatedUser.name}`);
    console.log(`   Phone: ${updatedUser.phoneNumber}`);
    console.log(`   Credit Score: ${updatedUser.creditScore}`);
    console.log(`   Credit History: ${updatedUser.creditHistory?.length || 0} entries`);

    console.log(`\n🎉 You can now log in with phone: ${updatedUser.phoneNumber}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Username: ${updatedUser.username}`);

  } catch (error) {
    console.error('❌ Error merging users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Get phone number from command line argument
const phoneNumber = process.argv[2];
if (!phoneNumber) {
  console.log('Usage: node merge-duplicate-users.js <phone_number>');
  console.log('Example: node merge-duplicate-users.js 251913131313');
  process.exit(1);
}

mergeDuplicateUsers(phoneNumber); 