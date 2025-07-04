import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: `${__dirname}/../../.env` });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

// Connection options
const options = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  maxPoolSize: 10,
  minPoolSize: 1,
  retryWrites: true,
  retryReads: true,
};

async function testConnection() {
  console.log('🔍 Testing MongoDB Atlas connection...');
  console.log(`Using URI: ${MONGODB_URI.replace(/:([^:]*?)@/, ':***@')}`);
  
  const client = new MongoClient(MONGODB_URI, options);
  
  try {
    // Try to connect
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // Test a simple command
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log('📋 Available collections:', collections.map(c => c.name));
    
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return false;
  } finally {
    await client.close();
  }
}

// Run the test
testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
