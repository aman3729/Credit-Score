import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

const testClusterNodes = async () => {
  console.log('🔍 Testing MongoDB Atlas cluster nodes...');
  console.log('Connection string (masked):', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
  
  const testOptions = {
    serverSelectionTimeoutMS: 10000, // 10 seconds
    connectTimeoutMS: 10000,         // 10 seconds
    socketTimeoutMS: 10000,          // 10 seconds
    maxPoolSize: 1,                  // Minimal pool
    minPoolSize: 0,                  // No minimum
    retryWrites: true,
    retryReads: true,
    ssl: true,
    family: 4,                       // Force IPv4
  };

  try {
    console.log('⏳ Attempting connection with SRV string...');
    
    await mongoose.connect(MONGODB_URI, testOptions);
    
    console.log('✅ Connection successful!');
    console.log('Database:', mongoose.connection.db.databaseName);
    console.log('Host:', mongoose.connection.host);
    console.log('Port:', mongoose.connection.port);
    console.log('Connection state:', mongoose.connection.readyState);
    
    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.name === 'MongoNetworkError' || error.name === 'MongooseServerSelectionError') {
      console.log('\n🔧 This appears to be a network/firewall issue.');
      console.log('Try these solutions:');
      console.log('1. Whitelist 0.0.0.0/0 in MongoDB Atlas (temporarily)');
      console.log('2. Check your firewall/antivirus settings');
      console.log('3. Try connecting from a different network');
      console.log('4. Restart your router to get a new IP');
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
    process.exit();
  }
};

testClusterNodes().catch(console.error); 