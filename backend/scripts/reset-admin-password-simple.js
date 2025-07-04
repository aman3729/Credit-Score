import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

const resetAdminPassword = async () => {
  try {
    // Connect to MongoDB with timeout
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 45000, // 45 second timeout
    });
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    if (!adminUser) {
      console.log('❌ Admin user not found. Creating new admin user...');
      
      // Create new admin user
      const newPassword = 'Admin123!';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      const adminData = {
        name: 'System Administrator',
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword, // Use pre-hashed password
        role: 'admin',
        emailVerified: true,
        status: 'active',
        nationalId: '1234567890123456'
      };

      const newAdmin = new User(adminData);
      await newAdmin.save();
      
      console.log('✅ New admin user created successfully');
      console.log('Email: admin@example.com');
      console.log('Password: Admin123!');
    } else {
      console.log('✅ Admin user found. Resetting password...');
      
      // Reset password
      const newPassword = 'Admin123!';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      adminUser.password = hashedPassword;
      await adminUser.save();
      
      console.log('✅ Admin password reset successfully');
      console.log('Email: admin@example.com');
      console.log('Password: Admin123!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.name === 'MongoNetworkError') {
      console.error('Network error - please check your internet connection and MongoDB Atlas settings');
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
resetAdminPassword().catch(console.error); 