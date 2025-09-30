import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkPhoneFormats(phoneBase) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/credit-score-dashboard');
    console.log('Connected to MongoDB');

    // Remove any existing + or spaces
    const cleanPhone = phoneBase.replace(/[+\s]/g, '');
    
    // Check different formats
    const formats = [
      cleanPhone,           // 251913131313
      `+${cleanPhone}`,     // +251913131313
      cleanPhone.replace(/^251/, '+251'), // Convert 251 to +251
      cleanPhone.replace(/^\+251/, '251') // Convert +251 to 251
    ];

    console.log(`\n🔍 Checking phone number formats for: ${phoneBase}`);
    console.log('=' .repeat(50));

    for (const format of formats) {
      const user = await User.findOne({ phoneNumber: format });
      if (user) {
        console.log(`✅ FOUND: "${format}"`);
        console.log(`   User: ${user.name}`);
        console.log(`   ID: ${user._id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Credit Score: ${user.creditScore}`);
        console.log(`   Latest Score: ${user.latestScore}`);
        console.log(`   Credit History: ${user.creditHistory?.length || 0} entries`);
      } else {
        console.log(`❌ NOT FOUND: "${format}"`);
      }
    }

    // Also check for partial matches
    console.log('\n🔍 Checking partial matches:');
    const partialMatches = await User.find({
      phoneNumber: { $regex: cleanPhone.replace(/^251/, '').replace(/^\+251/, '') }
    });
    
    if (partialMatches.length > 0) {
      console.log(`Found ${partialMatches.length} users with similar phone numbers:`);
      partialMatches.forEach(user => {
        console.log(`   ${user.phoneNumber} - ${user.name} (${user._id})`);
      });
    } else {
      console.log('No partial matches found');
    }

  } catch (error) {
    console.error('❌ Error checking phone formats:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Get phone number from command line argument
const phoneNumber = process.argv[2];
if (!phoneNumber) {
  console.log('Usage: node check-phone-formats.js <phone_number>');
  console.log('Example: node check-phone-formats.js 251913131313');
  process.exit(1);
}

checkPhoneFormats(phoneNumber); 