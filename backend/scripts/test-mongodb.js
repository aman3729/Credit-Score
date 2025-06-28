import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.test
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Get MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

// Log the connection attempt (with password masked)
const maskedUri = MONGODB_URI.replace(
  /(mongodb(\+srv)?:\/\/)([^:]+):([^@]+)@/, 
  '$1$3:*****@'
);
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
  console.log('Creating MongoDB client...');
  const client = new MongoClient(MONGODB_URI, options);
  
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect to the MongoDB server
    await client.connect();
    
    // Get the database
    const db = client.db();
    console.log(`✅ Connected to database: ${db.databaseName}`);
    
    // List collections
    console.log('Listing collections...');
    const collections = await db.listCollections().toArray();
    
    if (collections.length > 0) {
      console.log('\nCollections:');
      collections.forEach(collection => {
        console.log(`- ${collection.name}`);
      });
    } else {
      console.log('\nNo collections found in the database');
    }
    
    // Test a simple operation
    console.log('\nTesting write operation...');
    const testCollection = db.collection('testConnection');
    const testDoc = { 
      message: 'Test connection',
      timestamp: new Date()
    };
    
    console.log('Inserting test document...');
    const insertResult = await testCollection.insertOne(testDoc);
    console.log('✅ Test document inserted with ID:', insertResult.insertedId);
    
    // Verify the document was inserted
    console.log('\nVerifying document...');
    const foundDoc = await testCollection.findOne({ _id: insertResult.insertedId });
    if (foundDoc) {
      console.log('✅ Document found in database:', {
        id: foundDoc._id,
        message: foundDoc.message,
        timestamp: foundDoc.timestamp
      });
    } else {
      console.log('❌ Document not found after insertion');
    }
    
    // Clean up
    console.log('\nCleaning up test document...');
    const deleteResult = await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('✅ Test document deleted:', deleteResult.deletedCount === 1 ? 'Success' : 'Failed');
    
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
    console.log('\nClosing connection...');
    await client.close();
    console.log('✅ Connection closed');
  }
}

// Run the test
console.log('Starting MongoDB connection test...');
testConnection()
  .then(() => console.log('\nTest completed successfully'))
  .catch(err => console.error('Test failed:', err))
  .finally(() => process.exit(0));
