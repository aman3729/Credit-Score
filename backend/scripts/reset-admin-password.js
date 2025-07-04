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
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Reset admin password
const resetAdminPassword = async () => {
  try {
    const email = 'admin@creditdashboard.com';
    const newPassword = 'Admin123!';
    
    console.log(`🔧 Resetting password for: ${email}`);
    
    // Find the admin user
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log(`✅ Found admin user: ${user.email}`);
    console.log(`Current role: ${user.role}`);
    console.log(`Current status: ${user.status}`);
    console.log(`Email verified: ${user.emailVerified}`);
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    console.log(`🔑 New password hash: ${hashedPassword.substring(0, 20)}...`);
    
    // Update the password
    user.password = hashedPassword;
    await user.save();
    
    console.log('✅ Admin password reset successfully!');
    console.log('');
    console.log('📧 Login Credentials:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${newPassword}`);
    console.log('');
    console.log('💡 You can now log in with these credentials');
    
  } catch (error) {
    console.error('❌ Error resetting admin password:', error.message);
    if (error.errors) {
      Object.values(error.errors).forEach(err => {
        console.error(`  - ${err.message}`);
      });
    }
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
  }
};

// Run the script
(async () => {
  await connectDB();
  await resetAdminPassword();
  process.exit(0);
})(); 