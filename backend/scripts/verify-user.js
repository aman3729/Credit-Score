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

// Verify a user's email
const verifyUser = async (email) => {
  try {
    console.log(`Verifying email for user: ${email}`);
    
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`Found user: ${user.email} (${user.role})`);
    console.log(`Current emailVerified status: ${user.emailVerified}`);
    
    if (user.emailVerified) {
      console.log('✅ User is already verified');
      return;
    }
    
    // Verify the user
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;
    await user.save();
    
    console.log('✅ User email verified successfully');
    console.log(`User can now log in with email: ${user.email}`);
    
  } catch (error) {
    console.error('Error verifying user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
  }
};

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.log('Usage: node scripts/verify-user.js <email>');
  console.log('Example: node scripts/verify-user.js user@example.com');
  process.exit(1);
}

// Run the script
(async () => {
  await connectDB();
  await verifyUser(email);
  process.exit(0);
})(); 