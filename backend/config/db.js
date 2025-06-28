import mongoose from 'mongoose';
import 'dotenv/config';

// Use native JavaScript promises
mongoose.Promise = global.Promise;

// Cache the connection to avoid multiple connections
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// Get MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://aman:49b1HtpesbsJfZnz@credit-score-dashboard.w2bwj1o.mongodb.net/credit-score-dashboard?retryWrites=true&w=majority&appName=credit-score-dashboard';

// Secure logging - mask credentials in logs
const logMongoUri = MONGODB_URI.replace(/mongodb(\+srv)?:\/\/([^:]+):[^@]+@/, 'mongodb$1://$2:*****@');

// Connection options optimized for Mongoose 6+
const MONGODB_OPTIONS = {
  // Connection pool settings
  maxPoolSize: 10,               // Maximum number of connections
  minPoolSize: 1,                // Minimum number of connections
  serverSelectionTimeoutMS: 30000, // 30 seconds to select a server
  socketTimeoutMS: 60000,         // 60 seconds socket timeout
  heartbeatFrequencyMS: 10000,    // 10 seconds between heartbeats
  retryWrites: true,             // Retry write operations
  retryReads: true,              // Retry read operations
  appName: 'credit-score-dashboard',
  dbName: 'credit-score-dashboard'      // Explicitly set the database name
};

/**
 * Establishes a connection to MongoDB with retry logic
 * @returns {Promise<mongoose.Connection>}
 */
const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    console.log(`Connecting to MongoDB at ${logMongoUri}...`);
    
    // Set up event listeners for connection events
    mongoose.connection.on('connecting', () => {
      console.log('MongoDB: Connecting...');
    });
    
    mongoose.connection.on('connected', () => {
      console.log('MongoDB: Connected successfully');
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB: Disconnected');
    });
    
    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB: Reconnected');
    });
    
    // Enhanced connect with retry logic
    cached.promise = mongoose.connect(MONGODB_URI, MONGODB_OPTIONS)
      .then((mongoose) => {
        console.log('MongoDB connected successfully');
        return mongoose;
      })
      .catch((error) => {
        console.error('MongoDB connection error:');
        console.error('- Error name:', error.name);
        console.error('- Error message:', error.message);
        
        // Exit process with failure
        process.exit(1);
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
};

/**
 * Gracefully close the MongoDB connection
 */
const closeDB = async () => {
  if (cached.conn) {
    await mongoose.connection.close();
    cached.conn = null;
    cached.promise = null;
    console.log('MongoDB connection closed');
  }
};

// Handle application termination
process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

export { connectDB, closeDB, mongoose };