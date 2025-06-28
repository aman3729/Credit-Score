import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

// Import the User model
import User from './models/User.js';

// Test user data
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'testpassword123';

async function testUserModel() {
  let mongooseConnection;
  try {
    // Connect to local MongoDB
    console.log('Connecting to local MongoDB...');
    mongooseConnection = await mongoose.connect('mongodb://localhost:27017/credit-score-db', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB connected');

    // Clean up any existing test user
    await User.deleteOne({ email: TEST_EMAIL });
    console.log('Cleaned up existing test user');

    // Create a test user
    console.log('Creating test user...');
    const user = new User({
      name: 'Test User',
      username: 'testuser',
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      emailVerified: true,
      role: 'user'
    });

    // Log the user object before saving
    console.log('User before save:', {
      password: user.password,  // Should be the plain text password
      isModified: user.isModified('password')
    });

    // Save the user (this should hash the password)
    await user.save();
    
    // Fetch the user again to ensure we have the hashed password
    const savedUser = await User.findById(user._id).select('+password');
    
    console.log('Test user created:', {
      id: savedUser._id,
      email: savedUser.email,
      password: savedUser.password ? '***' : 'undefined',
      passwordLength: savedUser.password ? savedUser.password.length : 0
    });
    
    // Verify the password was hashed
    if (!savedUser.password || savedUser.password === TEST_PASSWORD) {
      throw new Error('Password was not hashed during save');
    }

    // Test 1: Find the user with password selected and check if comparePassword works
    const foundUser = await User.findOne({ email: TEST_EMAIL }).select('+password');
    console.log('\nTest 1: Check if user was found');
    console.log('User found:', !!foundUser);
    console.log('User password hash:', foundUser?.password ? '***' : 'undefined');
    console.log('User methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(foundUser)));
      
    // Test 2: Check if comparePassword is a function
    console.log('\nTest 2: Check if comparePassword is a function');
    console.log('comparePassword is function:', typeof foundUser.comparePassword === 'function');
    
    // Test 3: Compare correct password
    console.log('\nTest 3: Compare correct password');
    try {
      const isMatch = await foundUser.comparePassword(TEST_PASSWORD);
      console.log('Password match (should be true):', isMatch);
      
      if (!isMatch) {
        throw new Error('Password comparison failed: Incorrect password');
      }
      
      console.log('✅ Password comparison successful!');
    } catch (error) {
      console.error('Error in password comparison:', error);
      throw error;
    }
      
    // Test 4: Compare incorrect password
    console.log('\nTest 4: Compare incorrect password');
    try {
      const isWrongMatch = await foundUser.comparePassword('wrongpassword');
      console.log('Incorrect password match (should be false):', isWrongMatch);
      
      if (isWrongMatch) {
        throw new Error('Incorrect password should not match');
      }
      
      console.log('✅ Incorrect password test passed!');
    } catch (error) {
      console.error('Error in incorrect password test:', error);
      throw error;
    }
    
    // Test 5: Try to get the method from the schema
    console.log('\nTest 5: Check schema methods');
    try {
      console.log('Schema methods:', Object.keys(foundUser.constructor.schema.methods));
      console.log('✅ Schema methods check passed!');
    } catch (error) {
      console.error('Error checking schema methods:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in test:', error);
    process.exit(1);
  } finally {
    // Close the connection
    if (mongooseConnection) {
      await mongooseConnection.connection.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Run the test
testUserModel().catch(console.error);
