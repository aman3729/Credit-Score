import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User.js';

// Load environment variables from the backend directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function listUsers() {
  if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in your .env file.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully.');

    console.log('Listing all users:');
    const users = await User.find({}).select('email role name -_id');
    
    if (users.length === 0) {
      console.log('No users found in the database.');
    } else {
      console.log('Found users:');
      console.table(users);
    }

  } catch (error) {
    console.error('An error occurred while listing users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
}

listUsers();
