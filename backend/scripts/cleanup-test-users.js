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

// Clean up test users
const cleanupTestUsers = async () => {
  try {
    console.log('Starting cleanup of test users...');
    
    // List of test user emails to remove
    const testEmails = [
      'demo@example.com',
      'test@example.com', 
      'admin@example.com',
      'john@example.com',
      'jane@example.com'
    ];
    
    // Find and display test users before deletion
    const testUsers = await User.find({ email: { $in: testEmails } });
    
    if (testUsers.length === 0) {
      console.log('No test users found in database.');
      return;
    }
    
    console.log(`Found ${testUsers.length} test users:`);
    testUsers.forEach(user => {
      console.log(`- ${user.email} (${user.role})`);
    });
    
    // Delete test users
    const result = await User.deleteMany({
      email: { $in: testEmails }
    });
    
    console.log(`\n✅ Successfully removed ${result.deletedCount} test users from database.`);
    
    // Verify cleanup
    const remainingTestUsers = await User.find({ email: { $in: testEmails } });
    if (remainingTestUsers.length === 0) {
      console.log('✅ Verification: All test users have been removed.');
    } else {
      console.log(`⚠️  Warning: ${remainingTestUsers.length} test users still exist.`);
    }
    
  } catch (error) {
    console.error('Error cleaning up test users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
  }
};

// Run the script
(async () => {
  await connectDB();
  await cleanupTestUsers();
  process.exit(0);
})(); 