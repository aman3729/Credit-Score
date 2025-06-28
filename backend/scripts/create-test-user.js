import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

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
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Create a test user
const createTestUser = async () => {
  try {
    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@example.com' });
    
    if (existingUser) {
      console.log('Test user already exists:', {
        email: 'test@example.com',
        id: existingUser._id
      });
      return;
    }

    // Create new test user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      emailVerified: true,
      role: 'user'
    });

    await user.save();
    console.log('Test user created successfully:', {
      email: 'test@example.com',
      password: 'password123'
    });
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
  }
};

// Run the script
(async () => {
  await connectDB();
  await createTestUser();
  process.exit(0);
})();
