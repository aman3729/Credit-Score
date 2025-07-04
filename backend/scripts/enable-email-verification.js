import mongoose from 'mongoose';
import crypto from 'crypto';
import { sendEmail, emailTemplates } from '../config/email.js';
import User from '../models/User.js';
import config from '../config/env.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Enable email verification for existing users
const enableEmailVerification = async () => {
  console.log('\n🔧 Enabling email verification for existing users...');
  
  try {
    // Find all users without email verification
    const users = await User.find({
      $or: [
        { emailVerified: { $exists: false } },
        { emailVerified: false }
      ]
    });
    
    console.log(`Found ${users.length} users that need email verification setup`);
    
    for (const user of users) {
      console.log(`\nProcessing user: ${user.email}`);
      
      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
      
      // Update user with verification fields
      user.emailVerified = false;
      user.emailVerificationToken = hashedToken;
      user.emailVerificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      
      await user.save();
      
      console.log(`✅ Updated user: ${user.email}`);
      console.log(`   - Email verified: ${user.emailVerified}`);
      console.log(`   - Token generated: ${!!user.emailVerificationToken}`);
      
      // Send verification email
      try {
        const verificationURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
        
        await sendEmail({
          to: user.email,
          ...emailTemplates.emailVerification(user.username || user.name, verificationToken)
        });
        
        console.log(`📧 Verification email sent to: ${user.email}`);
        console.log(`🔗 Verification URL: ${verificationURL}`);
      } catch (emailError) {
        console.error(`❌ Failed to send email to ${user.email}:`, emailError.message);
      }
    }
    
    console.log(`\n✅ Email verification enabled for ${users.length} users`);
    return users.length;
  } catch (error) {
    console.error('❌ Error enabling email verification:', error.message);
    return 0;
  }
};

// Test email verification for a specific user
const testUserVerification = async (email) => {
  console.log(`\n🧪 Testing email verification for: ${email}`);
  
  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      return false;
    }
    
    console.log(`User found: ${user.email}`);
    console.log(`Email verified: ${user.emailVerified}`);
    console.log(`Has verification token: ${!!user.emailVerificationToken}`);
    
    if (user.emailVerified) {
      console.log('✅ User is already verified');
      return true;
    }
    
    if (!user.emailVerificationToken) {
      console.log('⚠️  User has no verification token, generating one...');
      
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
      
      user.emailVerificationToken = hashedToken;
      user.emailVerificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
      await user.save();
      
      console.log('✅ Verification token generated');
      
      // Send verification email
      const verificationURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
      
      await sendEmail({
        to: user.email,
        ...emailTemplates.emailVerification(user.username || user.name, verificationToken)
      });
      
      console.log(`📧 Verification email sent`);
      console.log(`🔗 Verification URL: ${verificationURL}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error testing user verification:', error.message);
    return false;
  }
};

// Verify a user manually (for testing)
const manuallyVerifyUser = async (email) => {
  console.log(`\n🔐 Manually verifying user: ${email}`);
  
  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      return false;
    }
    
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;
    await user.save();
    
    console.log(`✅ User ${email} manually verified`);
    return true;
  } catch (error) {
    console.error('❌ Error manually verifying user:', error.message);
    return false;
  }
};

// Show verification status for all users
const showVerificationStatus = async () => {
  console.log('\n📊 Email Verification Status Report');
  console.log('=' .repeat(50));
  
  try {
    const users = await User.find({}).select('email username name emailVerified createdAt');
    
    const verified = users.filter(u => u.emailVerified);
    const unverified = users.filter(u => !u.emailVerified);
    
    console.log(`Total users: ${users.length}`);
    console.log(`Verified: ${verified.length}`);
    console.log(`Unverified: ${unverified.length}`);
    console.log(`Verification rate: ${((verified.length / users.length) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Unverified Users:');
    unverified.forEach(user => {
      console.log(`  - ${user.email} (${user.username || user.name}) - Created: ${user.createdAt.toLocaleDateString()}`);
    });
    
    console.log('\n✅ Verified Users:');
    verified.forEach(user => {
      console.log(`  - ${user.email} (${user.username || user.name}) - Created: ${user.createdAt.toLocaleDateString()}`);
    });
    
  } catch (error) {
    console.error('❌ Error showing verification status:', error.message);
  }
};

// Main function
const main = async () => {
  console.log('🚀 Email Verification Setup Script\n');
  
  try {
    await connectDB();
    
    const command = process.argv[2];
    const email = process.argv[3];
    
    switch (command) {
      case 'enable':
        await enableEmailVerification();
        break;
        
      case 'test':
        if (!email) {
          console.error('❌ Please provide an email address: node enable-email-verification.js test user@example.com');
          return;
        }
        await testUserVerification(email);
        break;
        
      case 'verify':
        if (!email) {
          console.error('❌ Please provide an email address: node enable-email-verification.js verify user@example.com');
          return;
        }
        await manuallyVerifyUser(email);
        break;
        
      case 'status':
        await showVerificationStatus();
        break;
        
      default:
        console.log('📖 Usage:');
        console.log('  node enable-email-verification.js enable          # Enable verification for all users');
        console.log('  node enable-email-verification.js test <email>    # Test verification for specific user');
        console.log('  node enable-email-verification.js verify <email>  # Manually verify a user');
        console.log('  node enable-email-verification.js status          # Show verification status');
        console.log('\nExample:');
        console.log('  node enable-email-verification.js test admin@creditdashboard.com');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Script completed. Database disconnected.');
  }
};

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { enableEmailVerification, testUserVerification, manuallyVerifyUser, showVerificationStatus }; 