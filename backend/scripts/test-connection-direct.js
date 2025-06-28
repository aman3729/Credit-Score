const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testConnection() {
  // Get the connection string from environment variables
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
  
  // Connection options
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
    
    // Set up event listeners
    client.on('serverOpening', event => {
      console.log('Server opening:', event);
    });
    
    client.on('serverClosed', event => {
      console.log('Server closed:', event);
    });
    
    client.on('topologyOpening', event => {
      console.log('Topology opening:', event);
    });
    
    client.on('topologyClosed', event => {
      console.log('Topology closed:', event);
    });
    
    // Attempt to connect
    await client.connect();
    console.log('✅ Successfully connected to MongoDB');
    
    // Test a simple operation
    const db = client.db();
    console.log('Database name:', db.databaseName);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('\nCollections:');
    console.table(collections.map(c => ({
      name: c.name,
      type: c.type
    })));
    
    // Test insert
    const testCollection = db.collection('testConnection');
    const testDoc = { 
      message: 'Test connection',
      timestamp: new Date()
    };
    
    console.log('\nInserting test document...');
    const insertResult = await testCollection.insertOne(testDoc);
    console.log('✅ Test document inserted with ID:', insertResult.insertedId);
    
    // Clean up
    console.log('\nDeleting test document...');
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('✅ Test document deleted');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error details:', {
      name: error.name,
      code: error.code,
      errorLabels: error.errorLabels,
      stack: error.stack
    });
    
    if (error.name === 'MongoServerSelectionError') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Check if your IP is whitelisted in MongoDB Atlas Network Access');
      console.log('2. Verify your MongoDB Atlas cluster is running');
      console.log('3. Check if the connection string is correct');
      console.log('4. Try connecting with MongoDB Compass to verify credentials');
    }
    
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n✅ Connection closed');
    }
  }
}

// Run the test
testConnection();
