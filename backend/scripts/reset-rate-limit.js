import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const resetRateLimit = async () => {
  try {
    await connectDB();
    
    console.log('🔧 Checking admin users...\n');
    
    // Find all admin users
    const adminUsers = await User.find({ role: 'admin' }).select('-password');
    
    console.log(`Found ${adminUsers.length} admin users:\n`);
    
    adminUsers.forEach((user, index) => {
      console.log(`${index + 1}. Admin User:`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Email Verified: ${user.emailVerified}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Premium: ${user.premium?.isPremium || false}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('');
    });
    
    // Check for the specific admin account
    const targetAdmin = await User.findOne({ email: 'admin@creditdashboard.com' });
    
    if (targetAdmin) {
      console.log('✅ Target admin account found:');
      console.log(`   Email: ${targetAdmin.email}`);
      console.log(`   Role: ${targetAdmin.role}`);
      console.log(`   Email Verified: ${targetAdmin.emailVerified}`);
      console.log(`   Status: ${targetAdmin.status}`);
      console.log('');
      
      // Verify the account is properly configured
      if (targetAdmin.role !== 'admin') {
        console.log('⚠️  WARNING: User role is not "admin"');
        console.log('   Current role:', targetAdmin.role);
      }
      
      if (!targetAdmin.emailVerified) {
        console.log('⚠️  WARNING: Email is not verified');
      }
      
      if (targetAdmin.status !== 'active') {
        console.log('⚠️  WARNING: Account status is not "active"');
        console.log('   Current status:', targetAdmin.status);
      }
      
      console.log('💡 Login Credentials:');
      console.log('   Email: admin@creditdashboard.com');
      console.log('   Password: Admin123!');
      console.log('');
      
      console.log('🔧 Rate Limiting Reset Instructions:');
      console.log('1. Wait 1 hour for rate limit to reset automatically');
      console.log('2. Or restart the backend server to clear rate limit cache');
      console.log('3. Or add your IP to the whitelist in .env file:');
      console.log('   OFFICE_IP=your.ip.address.here');
      console.log('');
      
    } else {
      console.log('❌ Target admin account not found');
      console.log('   Looking for: admin@creditdashboard.com');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
};

resetRateLimit(); 