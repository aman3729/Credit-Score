import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendEmail, emailTemplates } from '../config/email.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Connect to MongoDB (optional, for testing with real users)
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.log('⚠️  No MONGODB_URI found, skipping database connection');
      return;
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.log('⚠️  Continuing without database connection');
  }
};

// Test email sending
const testEmailSending = async () => {
  try {
    console.log('📧 Testing Email Configuration...');
    console.log('=' .repeat(50));
    
    // Check environment variables
    console.log('🔍 Environment Check:');
    console.log(`SMTP_HOST: ${process.env.SMTP_HOST || '❌ Not set'}`);
    console.log(`SMTP_PORT: ${process.env.SMTP_PORT || '❌ Not set'}`);
    console.log(`SMTP_USER: ${process.env.SMTP_USER ? '✅ Set' : '❌ Not set'}`);
    console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? '✅ Set' : '❌ Not set'}`);
    console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL || '❌ Not set'}`);
    console.log('');
    
    // Test email sending
    const testEmail = 'test@example.com';
    const testToken = 'test-verification-token-123';
    
    console.log('📤 Sending test email...');
    const result = await sendEmail({
      to: testEmail,
      ...emailTemplates.emailVerification('testuser', testToken)
    });
    
    console.log('✅ Email sent successfully!');
    console.log(`Message ID: ${result.messageId}`);
    console.log(`To: ${testEmail}`);
    console.log('');
    
    // Show verification link
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${testToken}`;
    console.log('🔗 Test Verification Link:');
    console.log(verificationLink);
    console.log('');
    
    console.log('💡 Next Steps:');
    console.log('1. Check your email inbox (or Mailtrap)');
    console.log('2. Click the verification link');
    console.log('3. Test with a real user registration');
    
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Check your SMTP credentials');
    console.log('2. Verify SMTP host and port');
    console.log('3. Check firewall settings');
    console.log('4. Try using Mailtrap for testing');
    console.log('');
    console.log('📧 Email Configuration Guide:');
    console.log('See EMAIL_VERIFICATION_SETUP.md for detailed instructions');
  }
};

// Test with real user (if database is connected)
const testWithRealUser = async () => {
  try {
    if (!mongoose.connection.readyState) {
      console.log('⚠️  Database not connected, skipping real user test');
      return;
    }
    
    const User = (await import('../models/User.js')).default;
    const users = await User.find({ emailVerified: false }).limit(3);
    
    if (users.length === 0) {
      console.log('ℹ️  No unverified users found for testing');
      return;
    }
    
    console.log('👥 Testing with real unverified users:');
    for (const user of users) {
      console.log(`📧 Sending verification email to: ${user.email}`);
      
      // Generate a new verification token
      const crypto = await import('crypto');
      const verificationToken = crypto.randomBytes(32).toString('hex');
      
      try {
        await sendEmail({
          to: user.email,
          ...emailTemplates.emailVerification(user.username || user.email, verificationToken)
        });
        console.log(`✅ Verification email sent to ${user.email}`);
      } catch (error) {
        console.log(`❌ Failed to send email to ${user.email}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing with real users:', error.message);
  }
};

// Run the tests
(async () => {
  await connectDB();
  await testEmailSending();
  await testWithRealUser();
  
  if (mongoose.connection.readyState) {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
  }
  
  process.exit(0);
})(); 