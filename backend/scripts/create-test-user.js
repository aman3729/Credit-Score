import mongoose from 'mongoose';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const createTestUser = async () => {
  try {
    // Connect to MongoDB
    const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!MONGO_URI) {
      console.error('❌ MONGODB_URI or MONGO_URI environment variable is required');
      process.exit(1);
    }
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check if test user already exists
    const existingUser = await User.findOne({ email: process.env.TEST_USER_EMAIL || 'test@example.com' });
    
    if (existingUser) {
      console.log('⚠️  Test user already exists');
      console.log('📧 Email:', existingUser.email);
      console.log('🆔 ID:', existingUser._id);
      return;
    }

    // Generate secure random password if not provided
    const testPassword = process.env.TEST_USER_PASSWORD || Math.random().toString(36).slice(-12) + '!A1';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(testPassword, salt);

    // Create test user
    const testUser = new User({
      name: 'Test User',
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: hashedPassword,
      role: 'user',
      status: 'active',
      emailVerified: true
    });

    await testUser.save();
    console.log('✅ Test user created successfully');
    console.log('📧 Email:', testUser.email);
    console.log('🔑 Password:', testPassword);
    console.log('🆔 ID:', testUser._id);

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

createTestUser();
