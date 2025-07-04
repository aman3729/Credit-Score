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

// Test email sending
const testEmailSending = async () => {
  console.log('\n📧 Testing email sending...');
  
  try {
    const testEmail = {
      to: 'test@example.com',
      subject: 'Test Email Verification',
      html: `
        <h1>Test Email Verification</h1>
        <p>This is a test email to verify the email system is working.</p>
        <p>If you receive this, the email configuration is correct.</p>
        <p>Time: ${new Date().toISOString()}</p>
      `
    };
    
    const result = await sendEmail(testEmail);
    console.log('✅ Email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return false;
  }
};

// Test email template rendering
const testEmailTemplate = async () => {
  console.log('\n📝 Testing email template...');
  
  try {
    const testToken = crypto.randomBytes(32).toString('hex');
    const template = emailTemplates.emailVerification('testuser', testToken);
    
    console.log('✅ Email template generated successfully');
    console.log('Subject:', template.subject);
    console.log('HTML length:', template.html.length);
    return true;
  } catch (error) {
    console.error('❌ Email template generation failed:', error.message);
    return false;
  }
};

// Test user creation with email verification
const testUserCreation = async () => {
  console.log('\n👤 Testing user creation with email verification...');
  
  try {
    const testUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Test User',
      role: 'user'
    };
    
    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    
    const userData = {
      ...testUser,
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      emailVerified: false
    };
    
    const user = new User(userData);
    await user.save();
    
    console.log('✅ Test user created successfully');
    console.log('User ID:', user._id);
    console.log('Email verified:', user.emailVerified);
    console.log('Verification token exists:', !!user.emailVerificationToken);
    
    return { user, verificationToken };
  } catch (error) {
    console.error('❌ User creation failed:', error.message);
    return null;
  }
};

// Test email verification process
const testEmailVerification = async (user, verificationToken) => {
  console.log('\n🔐 Testing email verification process...');
  
  try {
    // Hash the token
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    
    // Find user with token
    const userWithToken = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpires: { $gt: Date.now() }
    });
    
    if (!userWithToken) {
      console.error('❌ User not found with valid token');
      return false;
    }
    
    // Verify email
    userWithToken.emailVerified = true;
    userWithToken.emailVerificationToken = undefined;
    userWithToken.emailVerificationTokenExpires = undefined;
    await userWithToken.save();
    
    console.log('✅ Email verification successful');
    console.log('Email verified:', userWithToken.emailVerified);
    console.log('Token cleared:', !userWithToken.emailVerificationToken);
    
    return true;
  } catch (error) {
    console.error('❌ Email verification failed:', error.message);
    return false;
  }
};

// Test complete email verification flow
const testCompleteFlow = async () => {
  console.log('\n🔄 Testing complete email verification flow...');
  
  try {
    // 1. Create test user
    const userData = await testUserCreation();
    if (!userData) return false;
    
    const { user, verificationToken } = userData;
    
    // 2. Send verification email
    console.log('\n📧 Sending verification email...');
    const verificationURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    
    await sendEmail({
      to: user.email,
      ...emailTemplates.emailVerification(user.username, verificationToken)
    });
    
    console.log('✅ Verification email sent');
    console.log('Verification URL:', verificationURL);
    
    // 3. Verify email
    const verificationSuccess = await testEmailVerification(user, verificationToken);
    if (!verificationSuccess) return false;
    
    console.log('✅ Complete email verification flow successful!');
    return true;
  } catch (error) {
    console.error('❌ Complete flow failed:', error.message);
    return false;
  }
};

// Clean up test data
const cleanupTestData = async () => {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    const result = await User.deleteMany({
      email: { $regex: /^test_\d+@example\.com$/ }
    });
    
    console.log(`✅ Cleaned up ${result.deletedCount} test users`);
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
};

// Main test function
const runTests = async () => {
  console.log('🚀 Starting Email Verification System Tests\n');
  
  try {
    await connectDB();
    
    const tests = [
      { name: 'Email Sending', fn: testEmailSending },
      { name: 'Email Template', fn: testEmailTemplate },
      { name: 'User Creation', fn: testUserCreation },
      { name: 'Complete Flow', fn: testCompleteFlow }
    ];
    
    let passedTests = 0;
    
    for (const test of tests) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`🧪 Running: ${test.name}`);
      console.log(`${'='.repeat(50)}`);
      
      const result = await test.fn();
      if (result) {
        passedTests++;
        console.log(`✅ ${test.name}: PASSED`);
      } else {
        console.log(`❌ ${test.name}: FAILED`);
      }
    }
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 Test Results: ${passedTests}/${tests.length} tests passed`);
    console.log(`${'='.repeat(50)}`);
    
    if (passedTests === tests.length) {
      console.log('🎉 All tests passed! Email verification system is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please check the configuration.');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    await cleanupTestData();
    await mongoose.disconnect();
    console.log('\n👋 Tests completed. Database disconnected.');
  }
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests }; 