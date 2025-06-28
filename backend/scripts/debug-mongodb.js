import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configure dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: `${__dirname}/../../.env` });

// Connection URI with enhanced logging - match the exact connection string from backend config
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://aman:vpd6dbDAq3EigvwQ@credit-score-dashboard.w2bwj1o.mongodb.net/?retryWrites=true&w=majority&appName=credit-score-dashboard';

// Explicitly set the database name to match backend config
const DB_NAME = 'credit-score-dashboard';

// Log configuration
console.log('MongoDB Debug Script - Starting...');
console.log(`Node.js Version: ${process.version}`);
console.log(`MongoDB URI: ${MONGODB_URI.replace(/:([^:]*?)@/, ':***@')}`);

// Create a new MongoClient with connection options
const client = new MongoClient(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // 10 seconds
  socketTimeoutMS: 30000, // 30 seconds
  connectTimeoutMS: 10000, // 10 seconds
  maxPoolSize: 10,
  monitorCommands: true, // Enable command monitoring
});

// Event listeners for connection
client.on('serverOpening', (event) => {
  console.log(`[MongoDB] Server opening: ${JSON.stringify(event.address)}`);
});

client.on('serverClosed', (event) => {
  console.log(`[MongoDB] Server closed: ${JSON.stringify(event)}`);
});

client.on('topologyOpening', (event) => {
  console.log('[MongoDB] Topology opening...');
});

client.on('topologyClosed', (event) => {
  console.log('[MongoDB] Topology closed');
});

client.on('serverHeartbeatSucceeded', (event) => {
  console.log(`[MongoDB] Heartbeat succeeded: ${event.connectionId}`);
});

client.on('serverHeartbeatFailed', (event) => {
  console.error(`[MongoDB] Heartbeat failed: ${event.failure}`);
});

async function run() {
  try {
    console.log('\n=== Starting MongoDB Debug ===');
    
    // Test basic connection
    console.log('\n1. Testing MongoDB connection...');
    await client.connect();
    console.log('✓ Connected to MongoDB successfully');
    
    // Get database info
    const adminDb = client.db(DB_NAME).admin();
    let serverStatus;
    try {
      serverStatus = await adminDb.serverStatus();
      console.log('\n2. Server Status:');
      console.log(`- Host: ${serverStatus.host}`);
      console.log(`- Version: ${serverStatus.version}`);
      console.log(`- Process: ${serverStatus.process}`);
    } catch (error) {
      console.error('\n❌ Error getting server status:', error.message);
      console.log('Continuing with other checks...');
    }
    
    // List all databases
    console.log('\n3. Listing databases...');
    const dbList = await adminDb.listDatabases();
    console.log('Available databases:');
    dbList.databases.forEach(db => {
      console.log(`- ${db.name} (${db.sizeOnDisk} bytes)`);
    });
    
    // Use the explicitly defined database name
    const targetDb = client.db(DB_NAME);
    console.log(`\n4. Using database: ${DB_NAME}`);
    
    // Verify database exists by listing collections
    try {
      const dbStats = await targetDb.stats();
      console.log(`✓ Database exists (${dbStats.storageSize} bytes)`);
    } catch (error) {
      console.error(`❌ Error accessing database ${DB_NAME}:`, error.message);
      throw error; // Stop execution if we can't access the database
    }
    
    // List collections in the target database
    const collections = await targetDb.listCollections().toArray();
    console.log(`\n5. Collections in ${targetDbName}:`);
    if (collections.length === 0) {
      console.log('No collections found in the database');
    } else {
      collections.forEach((collection, index) => {
        console.log(`${index + 1}. ${collection.name} (type: ${collection.type})`);
      });
    }
    
    // Check users collection
    const usersCollection = targetDb.collection('users');
    const userCount = await usersCollection.countDocuments();
    console.log(`\n6. Found ${userCount} users in the collection`);
    
    // Find specific user
    const userEmail = 'amanabraham724@gmail.com';
    console.log(`\n7. Looking for user: ${userEmail}`);
    const user = await usersCollection.findOne({ email: userEmail });
    
    if (user) {
      console.log('\n✓ User found:');
      console.log(`- ID: ${user._id}`);
      console.log(`- Name: ${user.name}`);
      console.log(`- Email: ${user.email}`);
      console.log(`- Role: ${user.role}`);
      console.log(`- Created: ${user.createdAt}`);
      
      // Check credit reports for this user
      const creditReports = targetDb.collection('creditreports');
      const reports = await creditReports.find({ userId: user._id }).toArray();
      
      console.log(`\n8. Found ${reports.length} credit reports for this user`);
      
      if (reports.length > 0) {
        console.log('\nSample credit report:');
        console.log(JSON.stringify(reports[0], null, 2));
      } else {
        console.log('\nNo credit reports found for this user');
        
        // Check if any credit reports exist
        const totalReports = await creditReports.countDocuments();
        console.log(`\nTotal credit reports in database: ${totalReports}`);
        
        if (totalReports > 0) {
          const sampleReport = await creditReports.findOne({});
          console.log('\nSample credit report structure:');
          console.log(JSON.stringify(sampleReport, null, 2));
        }
      }
    } else {
      console.log('\n✗ User not found in the database');
    }
    
  } catch (error) {
    console.error('\n❌ Error during MongoDB debug:', error);
    
    // Log detailed error information
    if (error.name === 'MongoServerSelectionError') {
      console.error('\nMongoDB Server Selection Error:');
      console.error('- This usually indicates a network or authentication issue');
      console.error('- Please verify your MongoDB connection string and credentials');
      console.error('- Check if your IP is whitelisted in MongoDB Atlas (if using Atlas)');
      console.error('- Error details:', error.message);
      
      // Check if it's a DNS resolution issue
      if (error.message.includes('getaddrinfo ENOTFOUND')) {
        console.error('\nDNS Resolution Error:');
        console.error('- Could not resolve the MongoDB hostname');
        console.error('- Please check your internet connection and DNS settings');
      }
      
    } else if (error.name === 'MongoNetworkError') {
      console.error('\nMongoDB Network Error:');
      console.error('- Could not connect to MongoDB server');
      console.error('- Please check your internet connection and MongoDB server status');
      console.error('- Error details:', error.message);
    } else if (error.name === 'MongoError' && error.code === 18) {
      console.error('\nMongoDB Authentication Error:');
      console.error('- Authentication failed');
      console.error('- Please verify your MongoDB username and password');
    } else {
      console.error('\nUnexpected Error:');
      console.error('- Type:', error.name);
      console.error('- Message:', error.message);
      console.error('- Stack:', error.stack);
    }
    
    // Log connection details that might help with debugging
    console.error('\nConnection Details:');
    console.error('- MongoDB URI:', MONGODB_URI.replace(/:([^:]*?)@/, ':***@'));
    console.error('- Database Name:', DB_NAME);
    console.error('- Node.js Version:', process.version);
    console.error('- Platform:', process.platform);
    console.error('- Architecture:', process.arch);
    
    // Check network connectivity
    console.error('\nNetwork Check:');
    try {
      const { execSync } = await import('child_process');
      console.error('- Internet Access:', execSync('ping -n 1 google.com').includes('Reply from') ? '✅ Available' : '❌ Unavailable');
    } catch (e) {
      console.error('- Internet Access Check Failed:', e.message);
    }
    
  } finally {
    // Close the connection
    if (client && typeof client.close === 'function') {
      await client.close();
      console.log('\n✓ MongoDB connection closed');
    }
    console.log('\n=== MongoDB Debug Completed ===');
  }
}

// Run the debug function
run().catch(console.error);
