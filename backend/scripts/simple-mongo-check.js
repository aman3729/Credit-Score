import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configure dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: `${__dirname}/../../.env` });

// Connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://aman:vpd6dbDAq3EigvwQ@credit-score-dashboard.w2bwj1o.mongodb.net/credit-score-dashboard?retryWrites=true&w=majority';

// Simple logger
const log = (message, data) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

// Error logger
const logError = (message, error) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`, error ? error.message : '');
  if (error?.stack) {
    console.error(error.stack);
  }
};

async function run() {
  let client;
  
  try {
    log('Starting MongoDB check...');
    log('Node.js version:', process.version);
    log('Platform:', process.platform);
    
    // Basic connectivity check
    log('Testing network connectivity...');
    try {
      const { execSync } = await import('child_process');
      const pingResult = execSync('ping -n 1 google.com').toString();
      log('Ping to google.com:', pingResult.includes('Reply from') ? 'SUCCESS' : 'FAILED');
    } catch (e) {
      logError('Network connectivity check failed', e);
    }
    
    // Connect to MongoDB
    log(`Connecting to MongoDB... (${MONGODB_URI.replace(/:([^:]*?)@/, ':***@')})`);
    client = new MongoClient(MONGODB_URI, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });
    
    // Add event listeners for debugging
    client.on('serverOpening', () => log('MongoDB server opening'));
    client.on('serverClosed', () => log('MongoDB server closed'));
    client.on('serverHeartbeatSucceeded', (e) => log('MongoDB heartbeat succeeded', { connectionId: e.connectionId }));
    client.on('serverHeartbeatFailed', (e) => logError('MongoDB heartbeat failed', e.failure));
    
    // Attempt connection
    await client.connect();
    log('Successfully connected to MongoDB');
    
    // List databases
    const adminDb = client.db().admin();
    const dbList = await adminDb.listDatabases();
    log('Available databases:', dbList.databases.map(db => ({
      name: db.name,
      size: db.sizeOnDisk,
      empty: db.empty
    })));
    
    // Check if our target database exists
    const dbName = 'credit-score-dashboard';
    const db = client.db(dbName);
    log(`Checking database: ${dbName}`);
    
    // List collections
    const collections = await db.listCollections().toArray();
    log(`Collections in ${dbName}:`, collections.map(c => c.name));
    
    // Check users collection
    const users = db.collection('users');
    const userCount = await users.countDocuments();
    log(`Total users: ${userCount}`);
    
    // Find specific user
    const userEmail = 'amanabraham724@gmail.com';
    const user = await users.findOne({ email: userEmail });
    
    if (user) {
      log('User found:', {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt
      });
      
      // Check credit reports
      const creditReports = db.collection('creditreports');
      const reports = await creditReports.find({ userId: user._id }).toArray();
      log(`Found ${reports.length} credit reports for user`);
      
      if (reports.length > 0) {
        log('Sample credit report:', {
          _id: reports[0]._id,
          userId: reports[0].userId,
          score: reports[0].creditScore?.fico?.score || 'N/A',
          status: reports[0].status || 'N/A',
          createdAt: reports[0].createdAt
        });
      }
    } else {
      log(`User ${userEmail} not found`);
    }
    
    log('MongoDB check completed successfully');
    
  } catch (error) {
    logError('Error during MongoDB check', error);
    
    // Additional error details
    if (error.name === 'MongoServerSelectionError') {
      logError('Server Selection Error Details:', {
        message: error.message,
        errorLabels: error.errorLabels,
        reason: error.reason
      });
    }
    
    // Network error details
    if (error.name === 'MongoNetworkError') {
      logError('Network Error Details:', {
        message: error.message,
        errorLabels: error.errorLabels,
        [Symbol.for('errorLabels')]: error[Symbol.for('errorLabels')]
      });
    }
    
    process.exit(1);
    
  } finally {
    if (client) {
      try {
        await client.close();
        log('MongoDB connection closed');
      } catch (closeError) {
        logError('Error closing MongoDB connection', closeError);
      }
    }
  }
}

// Run the check
run().catch(error => {
  logError('Unhandled error in main execution', error);
  process.exit(1);
});
