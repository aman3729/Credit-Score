import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

// Log the connection attempt (with password masked)
const maskedUri = MONGODB_URI.replace(/(mongodb(\+srv)?:\/\/)([^:]+):([^@]+)@/, '$1$3:*****@');
console.log(`Attempting to connect to: ${maskedUri}`);

// Connection options
const options = {
  connectTimeoutMS: 10000, // 10 seconds
  socketTimeoutMS: 45000, // 45 seconds
  serverSelectionTimeoutMS: 10000, // 10 seconds
  maxPoolSize: 10,
  retryWrites: true,
  w: 'majority',
  // Add these options for MongoDB Atlas
  ssl: true,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
};

async function testConnection() {
  const client = new MongoClient(MONGODB_URI, options);
  
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect to the MongoDB server
    await client.connect();
    
    // Get the database
    const db = client.db();
    console.log(`✅ Connected to database: ${db.databaseName}`);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('\nCollections:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Test a simple operation
    const testCollection = db.collection('testConnection');
    const testDoc = { 
      message: 'Test connection',
      timestamp: new Date()
    };
    
    const insertResult = await testCollection.insertOne(testDoc);
    console.log('\n✅ Test document inserted:', insertResult.insertedId);
    
    // Clean up
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('✅ Test document cleaned up');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    // Provide more detailed error information
    console.error('\nError details:', {
      name: error.name,
      code: error.code,
      errorLabels: error.errorLabels,
      stack: error.stack
    });
    
    // Provide troubleshooting tips based on error code
    if (error.name === 'MongoServerSelectionError') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Check if your IP is whitelisted in MongoDB Atlas Network Access');
      console.log('2. Verify your MongoDB Atlas cluster is running');
      console.log('3. Check if the connection string is correct');
      console.log('4. Try connecting with MongoDB Compass to verify credentials');
    }
    
    process.exit(1);
  } finally {
    // Close the connection
    await client.close();
    console.log('\nConnection closed');
    process.exit(0);
  }
}

// Run the test
testConnection();
