import { MongoClient } from 'mongodb';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined');
  process.exit(1);
}

console.log('🔍 Testing MongoDB connection with native driver...');
console.log('URI (masked):', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

// Native MongoDB client options
const options = {
  // Minimal options
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000,
};

async function testNativeConnection() {
  const client = new MongoClient(MONGODB_URI, options);
  
  try {
    console.log('⏳ Connecting with native driver...');
    
    // Connect
    await client.connect();
    
    console.log('🎉 SUCCESS! Native connection established');
    
    // Test database
    const db = client.db();
    console.log('Database:', db.databaseName);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('Collections found:', collections.length);
    
    // Test a simple operation
    const result = await db.command({ ping: 1 });
    console.log('Ping result:', result);
    
    console.log('✅ Native driver test completed successfully');
    
  } catch (error) {
    console.error('❌ Native connection failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.name === 'MongoNetworkError') {
      console.error('💡 Network error - this suggests a firewall/proxy issue');
      console.error('💡 MongoDB Compass might be using a different network path');
    }
    
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

testNativeConnection(); 