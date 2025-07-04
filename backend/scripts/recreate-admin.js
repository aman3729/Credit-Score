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
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Recreate admin user
const recreateAdmin = async () => {
  try {
    const email = 'admin@creditdashboard.com';
    const password = 'Admin123!';
    
    console.log(`🗑️  Deleting existing admin user: ${email}`);
    
    // Delete existing admin user
    const deleteResult = await User.deleteOne({ email });
    console.log(`Deleted ${deleteResult.deletedCount} admin user(s)`);
    
    console.log(`🔧 Creating new admin user: ${email}`);
    
    // Generate a unique 16-digit national ID
    const randomNationalId = String(Date.now()).padEnd(16, '0').slice(0, 16);
    
    // Create new admin user
    const adminUser = new User({
      name: 'System Administrator',
      username: 'systemadmin',
      email: email,
      password: password, // This will be hashed by the pre-save hook
      role: 'admin',
      emailVerified: true,
      status: 'active',
      nationalId: randomNationalId
    });

    await adminUser.save();
    
    console.log('✅ Admin user recreated successfully!');
    console.log('');
    console.log('📧 Login Credentials:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('');
    console.log('💡 You can now log in with these credentials');
    
    // Verify the password hash
    const savedUser = await User.findOne({ email }).select('+password');
    console.log('');
    console.log('🔍 Password Hash Verification:');
    console.log(`Hash: ${savedUser.password}`);
    console.log(`Hash length: ${savedUser.password.length}`);
    
    // Test the password
    const isMatch = await bcrypt.compare(password, savedUser.password);
    console.log(`Password test result: ${isMatch}`);
    
  } catch (error) {
    console.error('❌ Error recreating admin user:', error.message);
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
  await recreateAdmin();
  process.exit(0);
})(); 