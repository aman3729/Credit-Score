import mongoose from 'mongoose';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined');
  process.exit(1);
}

console.log('🔍 Testing MongoDB connection with minimal options...');
console.log('URI (masked):', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

// Minimal connection options - like MongoDB Compass
const options = {
  // No extra options - let MongoDB handle everything
};

async function testConnection() {
  try {
    console.log('⏳ Connecting...');
    
    // Set up event listeners
    mongoose.connection.on('connecting', () => console.log('Connecting...'));
    mongoose.connection.on('connected', () => console.log('✅ Connected!'));
    mongoose.connection.on('disconnected', () => console.log('❌ Disconnected'));
    mongoose.connection.on('error', (err) => console.error('❌ Error:', err.message));
    
    // Connect with minimal options
    await mongoose.connect(MONGODB_URI, options);
    
    console.log('🎉 SUCCESS! Connection established');
    console.log('Database:', mongoose.connection.name);
    console.log('Host:', mongoose.connection.host);
    console.log('Port:', mongoose.connection.port);
    
    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections found:', collections.length);
    
    // Disconnect
    await mongoose.disconnect();
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.name === 'MongoParseError') {
      console.error('💡 URI format issue - check your connection string');
    } else if (error.name === 'MongoServerSelectionError') {
      console.error('💡 Server selection failed - check network/Atlas settings');
    } else if (error.name === 'MongoNetworkError') {
      console.error('💡 Network error - check firewall/connectivity');
    }
    
    process.exit(1);
  }
}

testConnection(); 