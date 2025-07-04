import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendEmail, emailTemplates } from '../config/email.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Resend verification email to a specific user
const resendVerificationToUser = async (email) => {
  try {
    console.log(`📧 Resending verification email to: ${email}`);
    
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found');
      return false;
    }
    
    if (user.emailVerified) {
      console.log('ℹ️  User is already verified');
      return false;
    }
    
    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    
    // Update user with new token
    user.emailVerificationToken = hashedToken;
    user.emailVerificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();
    
    // Send verification email
    await sendEmail({
      to: user.email,
      ...emailTemplates.emailVerification(user.username || user.email, verificationToken)
    });
    
    console.log('✅ Verification email sent successfully');
    console.log(`🔗 Verification link: ${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error sending verification email:', error.message);
    return false;
  }
};

// Resend verification to all unverified users
const resendToAllUnverified = async () => {
  try {
    console.log('📧 Resending verification emails to all unverified users...');
    
    const unverifiedUsers = await User.find({ 
      emailVerified: false,
      status: 'active'
    });
    
    if (unverifiedUsers.length === 0) {
      console.log('ℹ️  No unverified users found');
      return;
    }
    
    console.log(`Found ${unverifiedUsers.length} unverified users:`);
    
    let successCount = 0;
    for (const user of unverifiedUsers) {
      console.log(`\n📧 Processing: ${user.email}`);
      
      const success = await resendVerificationToUser(user.email);
      if (success) {
        successCount++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ Successfully sent: ${successCount} emails`);
    console.log(`❌ Failed: ${unverifiedUsers.length - successCount} emails`);
    
  } catch (error) {
    console.error('❌ Error processing unverified users:', error.message);
  }
};

// Main function
const main = async () => {
  const email = process.argv[2];
  
  if (email) {
    // Resend to specific user
    await connectDB();
    await resendVerificationToUser(email);
  } else {
    // Resend to all unverified users
    await connectDB();
    await resendToAllUnverified();
  }
  
  await mongoose.disconnect();
  console.log('MongoDB Disconnected');
  process.exit(0);
};

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 