import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

// Default admin credentials
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_USERNAME = 'admin';
const ADMIN_NAME = 'System Administrator';
const ADMIN_PHONE = '+251911234567';
const ADMIN_BANK = 'CBE';

// Salt rounds for password hashing
const SALT_ROUNDS = 10;

export async function initAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const adminUser = new User({
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME,
      phoneNumber: ADMIN_PHONE,
      bankId: ADMIN_BANK,
      role: 'admin',
      emailVerified: true,
      plan: 'premium'
    });

    // Save admin user (password will be hashed automatically by the User model)
    await adminUser.save();
    console.log('Admin user created successfully');

    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error initializing admin user:', error);
    process.exit(1);
  }
}

// Run the initialization if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initAdmin();
}
