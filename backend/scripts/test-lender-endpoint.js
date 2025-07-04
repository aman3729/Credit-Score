import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
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

const testLenderEndpoint = async () => {
  try {
    await connectDB();
    
    console.log('🔧 Testing Lender Endpoint...\\n');
    
    // Find an admin user
    const adminUser = await User.findOne({ role: 'admin' }).select('-password');
    
    if (!adminUser) {
      console.log('❌ No admin user found');
      return;
    }
    
    console.log(`✅ Found admin user: ${adminUser.email}`);
    
    // Generate a JWT token
    const token = jwt.sign(
      { id: adminUser._id, role: adminUser.role },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );
    
    console.log(`✅ Generated JWT token: ${token.substring(0, 20)}...`);
    
    // Test the endpoint with curl command
    console.log('\\n📋 Test the endpoint with this curl command:');
    console.log(`curl -X GET "http://localhost:3000/api/v1/lenders/recent-decisions?limit=5" \\`);
    console.log(`  -H "Authorization: Bearer ${token}" \\`);
    console.log(`  -H "Content-Type: application/json"`);
    
    console.log('\\n🔍 Or test in your browser with this URL:');
    console.log(`http://localhost:3000/api/v1/lenders/recent-decisions?limit=5`);
    console.log('\\n📝 Make sure to include the Authorization header in your request.');
    
    console.log('\\n✅ Endpoint test setup complete!');
    
  } catch (error) {
    console.error('❌ Error testing lender endpoint:', error);
  } finally {
    await mongoose.disconnect();
  }
};

testLenderEndpoint(); 