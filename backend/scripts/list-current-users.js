import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
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

// List all users
const listUsers = async () => {
  try {
    console.log('📋 Current Users in Database:');
    console.log('=' .repeat(50));
    
    const users = await User.find({}).select('email username role emailVerified status createdAt');
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
      console.log('💡 You need to register a new user first');
      return;
    }
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Email Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Created: ${user.createdAt.toLocaleDateString()}`);
      console.log('');
    });
    
    console.log('💡 To verify a user\'s email, run:');
    console.log('   node scripts/verify-user.js <email>');
    console.log('');
    console.log('💡 To register a new user, go to: http://localhost:5177/register');
    
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
  }
};

// Run the script
(async () => {
  await connectDB();
  await listUsers();
  process.exit(0);
})(); 