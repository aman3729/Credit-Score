import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

// Load environment variables first
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

console.log('Loading environment from:', envPath);
dotenv.config({ path: envPath });

// Debug: Log environment variables (be careful with sensitive data in production)
console.log('Environment variables loaded:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const listUsers = async () => {
  try {
    await connectDB();
    
    // Find all users
    const users = await User.find({}).select('_id email name role premium.isPremium');
    
    console.log(`\n=== All Users in Database ===`);
    console.log(`Total users: ${users.length}`);
    
    if (users.length === 0) {
      console.log('No users found in database');
      return;
    }
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. User:`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Premium: ${user.premium?.isPremium || false}`);
    });
    
    // Show the admin user specifically
    const adminUser = users.find(u => u.email === 'admin@creditdashboard.com');
    if (adminUser) {
      console.log(`\n=== Admin User Details ===`);
      console.log(`ID: ${adminUser._id}`);
      console.log(`Email: ${adminUser.email}`);
      console.log(`Role: ${adminUser.role}`);
      console.log(`Premium: ${adminUser.premium?.isPremium || false}`);
    } else {
      console.log(`\n❌ Admin user not found!`);
    }
    
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
};

listUsers();
