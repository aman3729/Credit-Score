import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

const fixAdminPassword = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      maxPoolSize: 1,
      minPoolSize: 0,
      retryWrites: true,
      retryReads: true,
      ssl: true,
      family: 4,
    });
    console.log('✅ Connected to MongoDB');

    // Find existing admin user
    const adminUser = await User.findOne({ email: 'admin@example.com' }).select('+password');
    
    if (!adminUser) {
      console.log('❌ No admin user found');
      return;
    }

    console.log('✅ Found admin user:', adminUser.email);
    console.log('Current role:', adminUser.role);
    console.log('Current status:', adminUser.status);

    // Test current password
    const testPassword = 'Admin123!';
    const currentMatch = await bcrypt.compare(testPassword, adminUser.password);
    console.log('Current password test result:', currentMatch);

    if (!currentMatch) {
      console.log('🔧 Fixing admin password...');
      
      // Create new password hash
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(testPassword, salt);
      
      // Update the password
      adminUser.password = hashedPassword;
      await adminUser.save();
      
      console.log('✅ Password updated');
      
      // Test the new password
      const newMatch = await bcrypt.compare(testPassword, adminUser.password);
      console.log('New password test result:', newMatch);
      
      if (newMatch) {
        console.log('🎉 SUCCESS! Admin password fixed');
        console.log('📧 Email: admin@example.com');
        console.log('🔑 Password: Admin123!');
      } else {
        console.log('❌ Password fix failed');
      }
    } else {
      console.log('✅ Admin password is already correct');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
    process.exit();
  }
};

// Run the script
fixAdminPassword().catch(console.error); 