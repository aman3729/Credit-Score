import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const setAdminRole = async (email) => {
  try {
    await connectDB();
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`User with email ${email} not found`);
      return;
    }
    
    user.role = 'admin';
    await user.save();
    
    console.log(`\n✅ User role set to admin. Premium status: ${user.premium?.isPremium ? 'true' : 'false'}`);
    console.log(`Current role: ${user.role}`);
    if (user.premium) {
      console.log('Premium features remain enabled.');
    }
    
  } catch (error) {
    console.error('Error setting user role to admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
};

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: node set-admin-role.js <email>');
  console.log('Example: node set-admin-role.js admin@creditdashboard.com');
  process.exit(1);
}

setAdminRole(email); 