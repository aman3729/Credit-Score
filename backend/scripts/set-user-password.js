import mongoose from 'mongoose';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function setUserPassword(phoneNumber, newPassword = 'password123') {
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
    console.log(`👤 Username: ${user.username}`);

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user's password
    user.password = hashedPassword;
    user.passwordChangedAt = Date.now() - 1000; // Subtract 1s to ensure token iat < changedAt
    await user.save();

    console.log(`\n✅ Password updated successfully!`);
    console.log(`🔑 New password: ${newPassword}`);
    console.log(`\n📋 Login Credentials:`);
    console.log(`   Phone: ${user.phoneNumber}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Password: ${newPassword}`);

  } catch (error) {
    console.error('❌ Error setting user password:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Get phone number from command line argument
const phoneNumber = process.argv[2];
const newPassword = process.argv[3] || 'password123';

if (!phoneNumber) {
  console.log('Usage: node set-user-password.js <phone_number> [new_password]');
  console.log('Example: node set-user-password.js +251913131313 mypassword123');
  process.exit(1);
}

setUserPassword(phoneNumber, newPassword); 