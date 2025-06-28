import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Enable debug logging
mongoose.set('debug', true);

// Simple MongoDB connection test
async function testConnection() {
  console.log('Starting MongoDB connection test...');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  
  // Log the connection string (with password masked for security)
  const maskedUri = process.env.MONGODB_URI ? 
    process.env.MONGODB_URI.replace(/(mongodb(\+srv)?:\/\/)([^:]+):([^@]+)@/, '$1$3:*****@') : 
    'Not found';
  console.log('Using MongoDB URI:', maskedUri);

  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority',
    authSource: 'admin',
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
  };

  console.log('\nConnection options:', JSON.stringify(options, null, 2));
  
  try {
    console.log('\nAttempting to connect to MongoDB...');
    
    // Set up event listeners for connection events
    mongoose.connection.on('connecting', () => {
      console.log('Mongoose connecting to MongoDB...');
    });

    mongoose.connection.on('connected', () => {
      console.log('✅ Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('ℹ️  Mongoose disconnected from MongoDB');
    });

    // Attempt to connect
    await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log('\n✅ Successfully connected to MongoDB');
    console.log('MongoDB server version:', mongoose.connection.version);
    console.log('Database name:', mongoose.connection.name);
    
    // List collections
    const db = mongoose.connection.db;
    console.log('\nListing collections...');
    const collections = await db.listCollections().toArray();
    
    if (collections.length > 0) {
      console.log('\nCollections in database:');
      console.table(collections.map(c => ({
        name: c.name,
        type: c.type
      })));
    } else {
      console.log('\nNo collections found in the database');
    }
    
    // Test basic operations
    console.log('\nTesting basic operations...');
    
    try {
      // Test insert
      const testCollection = db.collection('testConnection');
      const testDoc = { 
        test: 'connection', 
        timestamp: new Date(),
        nodeVersion: process.version,
        platform: process.platform
      };
      
      console.log('\nInserting test document:', testDoc);
      const insertResult = await testCollection.insertOne(testDoc);
      console.log('✅ Test document inserted with ID:', insertResult.insertedId);
      
      // Test find
      console.log('\nFinding test document...');
      const foundDoc = await testCollection.findOne({ _id: insertResult.insertedId });
      console.log('✅ Document found by ID:', foundDoc ? 'Yes' : 'No');
      
      if (foundDoc) {
        console.log('Document details:', {
          id: foundDoc._id,
          test: foundDoc.test,
          timestamp: foundDoc.timestamp
        });
      }
      
      // Clean up
      console.log('\nCleaning up test document...');
      const deleteResult = await testCollection.deleteOne({ _id: insertResult.insertedId });
      console.log('✅ Test document deleted:', deleteResult.deletedCount === 1 ? 'Success' : 'Failed');
      
    } catch (opError) {
      console.error('❌ Operation failed:', opError.message);
      console.error('Operation error details:', {
        name: opError.name,
        code: opError.code,
        stack: opError.stack
      });
      throw opError;
    }
    
  } catch (error) {
    console.error('\n❌ Connection failed with error:');
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'ETIMEDOUT') {
      console.error('\n💡 Connection timed out. Possible solutions:');
      console.error('1. Check your internet connection');
      console.error('2. Verify the MongoDB server is running and accessible');
      console.error('3. Check if your IP is whitelisted in MongoDB Atlas');
      console.error('4. Try increasing serverSelectionTimeoutMS in connection options');
    } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      console.error('\n💡 DNS resolution failed. Possible solutions:');
      console.error('1. Check your internet connection');
      console.error('2. Verify the MongoDB hostname is correct');
      console.error('3. Try pinging the MongoDB host to check connectivity');
    } else if (error.code === 'MongoServerError') {
      console.error('\n💡 MongoDB server error. Check server logs for more details');
    } else if (error.code === 'MongooseServerSelectionError') {
      console.error('\n💡 Could not connect to any servers in your MongoDB Atlas cluster');
      console.error('1. Check your cluster status in MongoDB Atlas');
      console.error('2. Verify your IP is whitelisted in MongoDB Atlas Network Access');
      console.error('3. Check if you need to update your connection string');
    }
    
    console.error('\nFull error details:', JSON.stringify({
      name: error.name,
      code: error.code,
      message: error.message,
      stack: error.stack,
      ...(error.code === 'MongoServerError' && {
        errorLabels: error.errorLabels,
        codeName: error.codeName,
        writeErrors: error.writeErrors,
        result: error.result
      })
    }, null, 2));
    
  } finally {
    // Close the connection
    if (mongoose.connection.readyState === 1) {
      console.log('\nClosing MongoDB connection...');
      await mongoose.disconnect();
      console.log('✅ MongoDB connection closed');
    } else {
      console.log('\nNo active MongoDB connection to close');
    }
    
    console.log('\nTest completed');
    process.exit(0);
  }
}

// Run the test
testConnection();
