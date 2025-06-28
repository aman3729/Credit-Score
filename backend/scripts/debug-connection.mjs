import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Enable debug logging
process.env.DEBUG = 'mongodb:*';

dotenv.config();

async function testWithTimeout(promise, timeoutMs, operationName) {
  console.log(`\nStarting operation: ${operationName} (timeout: ${timeoutMs}ms)`);
  
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
  );
  
  const start = Date.now();
  try {
    const result = await Promise.race([promise, timeout]);
    const duration = Date.now() - start;
    console.log(`✅ ${operationName} completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ ${operationName} failed after ${duration}ms:`, error.message);
    throw error;
  }
}

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
  
  console.log('\n=== Starting MongoDB Connection Test ===');
  console.log('Connecting to:', maskedUri);
  
  const options = {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 1,
    retryWrites: true,
    w: 'majority',
    ssl: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
    monitorCommands: true, // Enable command monitoring
  };

  const client = new MongoClient(uri, options);
  
  // Set up event listeners for detailed logging
  client.on('commandStarted', (event) => {
    console.log(`\n🔹 Command started: ${event.commandName}`, {
      database: event.databaseName,
      requestId: event.requestId,
      connectionId: event.connectionId,
    });
  });
  
  client.on('commandSucceeded', (event) => {
    console.log(`\n✅ Command succeeded: ${event.commandName}`, {
      duration: event.duration,
      requestId: event.requestId,
    });
  });
  
  client.on('commandFailed', (event) => {
    console.error(`\n❌ Command failed: ${event.commandName}`, {
      error: event.failure,
      duration: event.duration,
      requestId: event.requestId,
    });
  });
  
  try {
    // Test connection
    console.log('\n=== Testing Connection ===');
    await testWithTimeout(
      client.connect(),
      15000,
      'MongoDB Connection'
    );
    
    // Get database info
    console.log('\n=== Testing Database Access ===');
    const db = client.db();
    console.log(`Connected to database: ${db.databaseName}`);
    
    // List collections with timeout
    console.log('\n=== Listing Collections ===');
    const collections = await testWithTimeout(
      db.listCollections().toArray(),
      10000,
      'List Collections'
    );
    
    if (collections.length > 0) {
      console.log('\nCollections:');
      console.table(collections.map(c => ({
        name: c.name,
        type: c.type || 'collection'
      })));
    } else {
      console.log('\nNo collections found in the database');
    }
    
    // Test insert operation
    console.log('\n=== Testing Insert Operation ===');
    const testCollection = db.collection('testConnection');
    const testDoc = { 
      message: 'Test connection',
      timestamp: new Date(),
      nodeVersion: process.version,
      platform: process.platform
    };
    
    const insertResult = await testWithTimeout(
      testCollection.insertOne(testDoc),
      10000,
      'Insert Document'
    );
    
    console.log('✅ Document inserted with ID:', insertResult.insertedId);
    
    // Test find operation
    console.log('\n=== Testing Find Operation ===');
    const foundDoc = await testWithTimeout(
      testCollection.findOne({ _id: insertResult.insertedId }),
      10000,
      'Find Document'
    );
    
    if (foundDoc) {
      console.log('✅ Document found:', {
        id: foundDoc._id,
        message: foundDoc.message,
        timestamp: foundDoc.timestamp
      });
    } else {
      console.log('❌ Document not found after insertion');
    }
    
    // Clean up
    console.log('\n=== Cleaning Up ===');
    const deleteResult = await testWithTimeout(
      testCollection.deleteOne({ _id: insertResult.insertedId }),
      10000,
      'Delete Document'
    );
    
    console.log('✅ Test document deleted:', deleteResult.deletedCount === 1 ? 'Success' : 'Failed');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Error details:', {
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
      console.log('3. Try connecting with MongoDB Compass to verify credentials');
      console.log('4. Check your network connection and firewall settings');
    }
    
    process.exit(1);
  } finally {
    // Close the connection
    if (client) {
      console.log('\n=== Closing Connection ===');
      await testWithTimeout(
        client.close(),
        5000,
        'Close Connection'
      );
      console.log('✅ Connection closed');
    }
  }
}

// Run the test
console.log('Starting MongoDB debug connection test...');
testConnection()
  .then(() => console.log('\n=== Test completed successfully ==='))
  .catch(err => console.error('\n=== Test failed with error ===\n', err))
  .finally(() => process.exit(0));
