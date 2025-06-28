import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://aman:49b1HtpesbsJfZnz@credit-score-dashboard.w2bwj1o.mongodb.net/?retryWrites=true&w=majority&appName=credit-score-dashboard';

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('ℹ️ Admin user already exists');
      console.log(`Email: ${existingAdmin.email}`);
      await mongoose.disconnect();
      return;
    }

    // Create admin user with all required fields
    const adminData = {
      name: 'System Administrator',
      username: 'admin',
      email: 'admin@example.com',
      password: 'Admin123!',
      role: 'admin',
      emailVerified: true,
      status: 'active'
    };

    // Create user (password will be hashed by the User model pre-save hook)
    const adminUser = new User(adminData);
    await adminUser.save();
    
    console.log('✅ Admin user created successfully');
    console.log('Email: admin@example.com');
    console.log('Password: Admin123!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.errors) {
      Object.values(error.errors).forEach(err => {
        console.error(`  - ${err.message}`);
      });
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
    process.exit();
  }
};

// Run the script
createAdminUser().catch(console.error);