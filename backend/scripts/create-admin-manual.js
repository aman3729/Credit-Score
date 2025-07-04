import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

const createAdminManual = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds
      connectTimeoutMS: 10000,         // 10 seconds
      socketTimeoutMS: 10000,          // 10 seconds
      maxPoolSize: 1,                  // Minimal pool
      minPoolSize: 0,                  // No minimum
      retryWrites: true,
      retryReads: true,
      ssl: true,
      family: 4,                       // Force IPv4
    });
    console.log('✅ Connected to MongoDB');

    // Delete existing admin user if it exists
    await User.deleteOne({ email: 'admin@example.com' });
    console.log('🗑️ Deleted existing admin user (if any)');

    // Create new password hash
    const password = 'Admin123!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    console.log('🔐 Created password hash');

    // Create admin user data
    const adminData = {
      name: 'System Administrator',
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword, // Pre-hashed to avoid pre-save hook issues
      role: 'admin',
      emailVerified: true,
      status: 'active',
      nationalId: '1234567890123456',
      profile: {
        phone: '+1234567890',
        fullAddress: '123 Admin Street, Admin City, AC 12345',
        gender: 'prefer-not-to-say',
        employmentStatus: 'employed',
        employerName: 'System Administration',
        industry: 'technology'
      },
      // Add required fields
      agreeTerms: true,
      authorizeCreditChecks: true,
      badgeTier: 'basic'
    };

    // Create user using create method instead of updateOne
    const adminUser = new User(adminData);
    await adminUser.save();
    
    console.log('✅ Admin user created successfully');
    
    // Verify the user was created
    const adminUserFromDB = await User.findOne({ email: 'admin@example.com' }).select('+password');
    if (adminUserFromDB) {
      console.log('✅ Admin user verified in database');
      console.log('Email:', adminUserFromDB.email);
      console.log('Username:', adminUserFromDB.username);
      console.log('Role:', adminUserFromDB.role);
      console.log('Status:', adminUserFromDB.status);
      
      // Test password
      const testMatch = await bcrypt.compare(password, adminUserFromDB.password);
      console.log('Password test result:', testMatch);
      
      if (testMatch) {
        console.log('🎉 SUCCESS! Admin user is ready to use');
        console.log('📧 Email: admin@example.com');
        console.log('🔑 Password: Admin123!');
        console.log('🔗 You can now log in to the admin dashboard');
      } else {
        console.log('❌ Password test failed');
      }
    } else {
      console.log('❌ Failed to verify admin user');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.name === 'MongoNetworkError') {
      console.error('Network error - please check your internet connection and try again');
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
createAdminManual().catch(console.error); 