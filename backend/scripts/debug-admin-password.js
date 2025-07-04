import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

const debugAdminPassword = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30 second timeout
    });
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({ email: 'admin@example.com' }).select('+password');
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Admin user found');
    console.log('Email:', adminUser.email);
    console.log('Username:', adminUser.username);
    console.log('Role:', adminUser.role);
    console.log('Status:', adminUser.status);
    console.log('Email Verified:', adminUser.emailVerified);
    
    // Check password hash
    console.log('\n=== PASSWORD DEBUG ===');
    console.log('Password field exists:', !!adminUser.password);
    console.log('Password hash length:', adminUser.password?.length || 0);
    console.log('Password hash starts with $2:', adminUser.password?.startsWith('$2') || false);
    
    if (adminUser.password) {
      // Test password comparison
      const testPassword = 'Admin123!';
      console.log('\nTesting password:', testPassword);
      
      try {
        const isMatch = await bcrypt.compare(testPassword, adminUser.password);
        console.log('Password match result:', isMatch);
        
        if (!isMatch) {
          console.log('\n❌ Password does not match. Let\'s fix this...');
          
          // Create new password hash
          const newPassword = 'Admin123!';
          const salt = await bcrypt.genSalt(10);
          const newHash = await bcrypt.hash(newPassword, salt);
          
          console.log('New hash created:', newHash.substring(0, 20) + '...');
          
          // Update the user
          adminUser.password = newHash;
          await adminUser.save();
          
          console.log('✅ Password updated successfully');
          
          // Test again
          const testMatch = await bcrypt.compare(newPassword, adminUser.password);
          console.log('New password test result:', testMatch);
        }
      } catch (error) {
        console.error('Error testing password:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.name === 'MongoNetworkError') {
      console.error('Network error - please check your internet connection');
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
debugAdminPassword().catch(console.error); 