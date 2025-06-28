import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  // Log the connection attempt (with password masked)
  const maskedUri = uri.replace(
    /(mongodb(\+srv)?:\/\/)([^:]+):([^@]+)@/, 
    '$1$3:*****@'
  );
  
  console.log('Starting MongoDB connection test...');
  console.log('Connecting to:', maskedUri);
  
  const client = new MongoClient(uri, {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
    retryWrites: true,
    w: 'majority',
    ssl: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
  });

  try {
    console.log('Attempting to connect...');
    
    // Set up event listeners for connection events
    client.on('serverOpening', () => console.log('Server opening...'));
    client.on('serverClosed', () => console.log('Server closed...'));
    client.on('topologyOpening', () => console.log('Topology opening...'));
    client.on('topologyClosed', () => console.log('Topology closed...'));
    client.on('serverHeartbeatStarted', () => console.log('Heartbeat started...'));
    client.on('serverHeartbeatSucceeded', () => console.log('Heartbeat succeeded...'));
    client.on('serverHeartbeatFailed', (e) => console.error('Heartbeat failed:', e));
    
    // Try to connect with a timeout
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    
    console.log('✅ Successfully connected to MongoDB');
    
    // Test a simple operation
    const db = client.db();
    console.log('Database name:', db.databaseName);
    
    // List collections
    console.log('\nListing collections...');
    const collections = await db.listCollections().toArray();
    
    if (collections.length > 0) {
      console.log('\nCollections:');
      collections.forEach(collection => {
        console.log(`- ${collection.name}`);
      });
    } else {
      console.log('\nNo collections found in the database');
    }
    
    // Test insert
    const testCollection = db.collection('testConnection');
    const testDoc = { 
      message: 'Test connection',
      timestamp: new Date(),
      nodeVersion: process.version,
      platform: process.platform
    };
    
    console.log('\nInserting test document...');
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
    console.error('\n❌ Connection failed:', error.message);
    
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
    if (client) {
      console.log('\nClosing connection...');
      await client.close();
      console.log('✅ Connection closed');
    }
  }
}

// Run the test
console.log('Starting MongoDB connection test...');
testConnection()
  .then(() => console.log('\nTest completed successfully'))
  .catch(err => console.error('Test failed:', err));
