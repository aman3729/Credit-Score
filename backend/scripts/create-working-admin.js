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

// Create a working admin user
const createWorkingAdmin = async () => {
  try {
    console.log('🔧 Creating a working admin user...');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@creditdashboard.com' });
    
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      console.log('Email Verified:', existingAdmin.emailVerified);
      return;
    }

    // Create new admin user with all required fields
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin123!', salt);
    
    // Generate a unique 16-digit national ID
    const randomNationalId = String(Date.now()).padEnd(16, '0').slice(0, 16);

    const adminUser = new User({
      name: 'System Administrator',
      username: 'systemadmin',
      email: 'admin@creditdashboard.com',
      password: hashedPassword,
      role: 'admin',
      emailVerified: true,
      status: 'active',
      nationalId: randomNationalId
    });

    await adminUser.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@creditdashboard.com');
    console.log('🔑 Password: Admin123!');
    console.log('👤 Role: admin');
    console.log('✅ Email Verified: true');
    console.log('');
    console.log('💡 You can now log in with these credentials');
    console.log('💡 The admin user will have access to all dashboards');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
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
  await createWorkingAdmin();
  process.exit(0);
})(); 