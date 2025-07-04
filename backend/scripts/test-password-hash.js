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

// Test password hash
const testPasswordHash = async () => {
  try {
    const email = 'admin@creditdashboard.com';
    const testPassword = 'Admin123!';
    
    console.log(`🔍 Testing password for: ${email}`);
    
    // Find the admin user
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log(`✅ Found admin user: ${user.email}`);
    console.log(`Current password hash: ${user.password}`);
    console.log(`Hash length: ${user.password.length}`);
    console.log(`Hash prefix: ${user.password.substring(0, 20)}...`);
    
    // Test 1: Direct bcrypt comparison
    console.log('\n🔑 Test 1: Direct bcrypt comparison');
    const directResult = await bcrypt.compare(testPassword, user.password);
    console.log(`Direct bcrypt result: ${directResult}`);
    
    // Test 2: Using the correctPassword method
    console.log('\n🔑 Test 2: Using correctPassword method');
    const methodResult = await user.correctPassword(testPassword, user.password);
    console.log(`Method result: ${methodResult}`);
    
    // Test 3: Create a new hash and compare
    console.log('\n🔑 Test 3: Create new hash and compare');
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(testPassword, salt);
    console.log(`New hash: ${newHash}`);
    console.log(`New hash length: ${newHash.length}`);
    
    const newHashResult = await bcrypt.compare(testPassword, newHash);
    console.log(`New hash comparison result: ${newHashResult}`);
    
    // Test 4: Compare new hash with stored hash
    console.log('\n🔑 Test 4: Compare new hash with stored hash');
    const crossCompare = await bcrypt.compare(testPassword, user.password);
    console.log(`Cross comparison result: ${crossCompare}`);
    
    // Test 5: Check if the stored hash is valid
    console.log('\n🔑 Test 5: Validate stored hash format');
    const hashRegex = /^\$2[aby]?\$\d{1,2}\$[./0-9A-Za-z]{53}$/;
    const isValidHash = hashRegex.test(user.password);
    console.log(`Is valid bcrypt hash: ${isValidHash}`);
    
    // Test 6: Try different password variations
    console.log('\n🔑 Test 6: Test different password variations');
    const variations = [
      'Admin123!',
      'Admin123',
      'admin123!',
      'ADMIN123!',
      'Admin123! ',
      ' Admin123!'
    ];
    
    for (const variation of variations) {
      const result = await bcrypt.compare(variation, user.password);
      console.log(`"${variation}" (length: ${variation.length}): ${result}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing password hash:', error.message);
    if (error.errors) {
      Object.values(error.errors).forEach(err => {
        console.error(`  - ${err.message}`);
      });
    }
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB Disconnected');
  }
};

// Run the script
(async () => {
  await connectDB();
  await testPasswordHash();
  process.exit(0);
})(); 