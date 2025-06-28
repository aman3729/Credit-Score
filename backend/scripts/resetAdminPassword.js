import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User.js';

// Load environment variables from the backend directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = 'admin@example.com';
const NEW_PASSWORD = 'Admin123!'; // The password you are trying to log in with

const resetPassword = async () => {
  if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in your .env file.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully.');

    console.log(`Searching for user with email: ${ADMIN_EMAIL}`);
    const user = await User.findOne({ email: ADMIN_EMAIL });

    if (!user) {
      console.error(`Error: User with email ${ADMIN_EMAIL} not found.`);
      return;
    }

    console.log('User found. Resetting password...');
    
    // Set the new password. The pre-save hook in your User model will handle hashing.
    user.password = NEW_PASSWORD;
    
    // Save the user to trigger the hashing process
    await user.save();

    console.log(`Successfully reset and hashed the password for ${ADMIN_EMAIL}.`);
    console.log('You should now be able to log in.');

  } catch (error) {
    console.error('An error occurred during the password reset process:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
};

resetPassword();
