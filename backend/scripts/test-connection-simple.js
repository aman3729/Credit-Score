import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

const testConnection = async () => {
  console.log('🔍 Testing MongoDB connection...');
  console.log('Connection string (masked):', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
  
  try {
    console.log('⏳ Attempting connection...');
    
    // Test with minimal options
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 seconds
      connectTimeoutMS: 10000,        // 10 seconds
      socketTimeoutMS: 10000,         // 10 seconds
      maxPoolSize: 1,                 // Minimal pool
      minPoolSize: 0,                 // No minimum
    });
    
    console.log('✅ Connection successful!');
    console.log('Database:', mongoose.connection.db.databaseName);
    console.log('Host:', mongoose.connection.host);
    console.log('Port:', mongoose.connection.port);
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.name === 'MongoNetworkError') {
      console.log('\n🔧 Network troubleshooting:');
      console.log('1. Check your internet connection');
      console.log('2. Verify MongoDB Atlas IP whitelist includes your IP');
      console.log('3. Check if MongoDB Atlas cluster is running');
      console.log('4. Try connecting from a different network');
    }
    
    if (error.code === 'ETIMEDOUT') {
      console.log('\n⏰ Timeout troubleshooting:');
      console.log('1. Check firewall settings');
      console.log('2. Try increasing timeout values');
      console.log('3. Check if port 27017 is blocked');
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
    process.exit();
  }
};

testConnection().catch(console.error); 