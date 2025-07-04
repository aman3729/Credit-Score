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
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Check and create lender user
const checkLenderUsers = async () => {
  try {
    console.log('🔍 Checking for lender users...');
    
    // Find all lender users
    const lenderUsers = await User.find({ role: 'lender' });
    
    console.log(`Found ${lenderUsers.length} lender user(s):`);
    
    if (lenderUsers.length === 0) {
      console.log('❌ No lender users found');
      console.log('');
      console.log('🔧 Creating a test lender user...');
      
      // Generate a unique 16-digit national ID
      const randomNationalId = String(Date.now()).padEnd(16, '0').slice(0, 16);
      
      // Create test lender user
      const lenderUser = new User({
        name: 'Test Lender',
        username: 'testlender',
        email: 'lender@test.com',
        password: 'Lender123!',
        role: 'lender',
        emailVerified: true,
        status: 'active',
        nationalId: randomNationalId
      });

      await lenderUser.save();
      
      console.log('✅ Test lender user created successfully!');
      console.log('');
      console.log('📧 Login Credentials:');
      console.log('Email: lender@test.com');
      console.log('Password: Lender123!');
      console.log('');
      console.log('💡 You can now test the lender login and role-based redirection');
      
    } else {
      lenderUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Email Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
        console.log(`   Status: ${user.status}`);
        console.log(`   Created: ${user.createdAt.toLocaleDateString()}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking lender users:', error.message);
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
  await checkLenderUsers();
  process.exit(0);
})(); 