import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkPendingUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check total users
    const totalUsers = await User.countDocuments();
    console.log(`Total users: ${totalUsers}`);

    // Check users by status
    const activeUsers = await User.countDocuments({ status: 'active' });
    const pendingUsers = await User.countDocuments({ status: 'pending' });
    const suspendedUsers = await User.countDocuments({ status: 'suspended' });
    const deactivatedUsers = await User.countDocuments({ status: 'deactivated' });

    console.log(`Active users: ${activeUsers}`);
    console.log(`Pending users: ${pendingUsers}`);
    console.log(`Suspended users: ${suspendedUsers}`);
    console.log(`Deactivated users: ${deactivatedUsers}`);

    // Get all users with their status
    const allUsers = await User.find({}).select('name email status createdAt').lean();
    console.log('\nAll users:');
    allUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}): ${user.status} - Created: ${user.createdAt}`);
    });

    // Test the pending users query specifically
    console.log('\nTesting pending users query...');
    const pendingUsersList = await User.find({ status: 'pending' })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${pendingUsersList.length} pending users:`);
    pendingUsersList.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Created: ${user.createdAt}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkPendingUsers(); 