const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// MongoDB connection string
const MONGODB_URI = 'mongodb+srv://aman:49b1HtpesbsJfZnz@credit-score-dashboard.w2bwj1o.mongodb.net/credit-score-dashboard?retryWrites=true&w=majority&appName=credit-score-dashboard';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
    });
    console.log('MongoDB connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Check if user exists by email
const checkUserByEmail = async (email) => {
  try {
    const user = await User.findOne({ email });
    if (user) {
      console.log('User found:', {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      });
    } else {
      console.log('No user found with email:', email);
    }
  } catch (error) {
    console.error('Error checking user by email:', error);
  }
};

// Main function
const main = async () => {
  const email = 'amanabraham724@gmail.com';
  
  await connectDB();
  console.log(`\nChecking for user with email: ${email}`);
  await checkUserByEmail(email);
  
  // Close the connection
  await mongoose.connection.close();  
  console.log('\nDisconnected from MongoDB');
};

// Run the script
main().catch(console.error);
