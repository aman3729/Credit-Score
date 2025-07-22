import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
// Get MongoDB URI from environment
let MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

// Ensure the URI has the correct format for Atlas
if (!MONGODB_URI.includes('retryWrites=true')) {
  MONGODB_URI += '&retryWrites=true';
}
if (!MONGODB_URI.includes('w=majority')) {
  MONGODB_URI += '&w=majority';
}

// Improved MongoDB connection options for stability
const MONGODB_OPTIONS = {
  serverSelectionTimeoutMS: 30000,   // 30 seconds to find a server
  socketTimeoutMS: 60000,            // 60 seconds for socket inactivity
  heartbeatFrequencyMS: 10000,       // 10 seconds between heartbeats
  maxPoolSize: 10,
  minPoolSize: 1,
  retryWrites: true,
  retryReads: true,
  // Deprecated options removed
};

// Global native client for fallback
let nativeClient = null;
let isUsingNativeDriver = false;

/**
 * Establishes a connection to MongoDB Atlas with proper fallback
 * @returns {Promise<mongoose.Connection>}
 */
const connectDB = async () => {
  let lastMongooseError = null;
  let lastNativeError = null;
  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      console.log(`🔌 Attempting to connect to MongoDB... (Attempt ${attempt}/${maxRetries})`);
      // Set up connection event listeners
      mongoose.connection.on('connected', () => {
        console.log('✅ MongoDB connected successfully');
      });
      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error.message);
      });
      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB disconnected');
      });
      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
      });
      // Try Mongoose connection first
      await mongoose.connect(MONGODB_URI, MONGODB_OPTIONS);
      console.log('✅ Connected using Mongoose');
      return mongoose.connection;
    } catch (mongooseError) {
      lastMongooseError = mongooseError;
      console.log('⚠️ Connection attempt', attempt, 'failed, retrying in 2 seconds...');
      console.error('❌ MongoDB connection error:', mongooseError.message);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  // If all attempts fail, throw the last error
  console.error('❌ Critical: Failed to connect to MongoDB after all retries');
  console.error('Last Mongoose error:', lastMongooseError?.message);
  throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts. Last error: ${lastMongooseError?.message}`);
};

/**
 * Get a working database connection (Mongoose or native)
 */
const getWorkingConnection = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (nativeClient && isUsingNativeDriver) {
    return nativeClient.db();
  }
  throw new Error('No working database connection available');
};

/**
 * Check if we're using the native driver
 */
const isNativeDriver = () => isUsingNativeDriver;

/**
 * Gracefully close the MongoDB connection
 */
const closeDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
    if (nativeClient) {
      await nativeClient.close();
      console.log('Native MongoDB connection closed');
    }
  } catch (error) {
    console.error('Error closing MongoDB connection:', error.message);
  }
};

// Handle application termination
process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

export { connectDB, closeDB, mongoose, MONGODB_OPTIONS, getWorkingConnection, isNativeDriver }; 