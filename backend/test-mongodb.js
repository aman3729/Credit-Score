import mongoose from 'mongoose';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(process.cwd(), '.env');

console.log('Loading environment from:', envPath);
config({ path: envPath });

// Mask sensitive information in the MongoDB URI
const maskedMongoUri = process.env.MONGODB_URI 
  ? process.env.MONGODB_URI.replace(/(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/, 
    (match, protocol, user, pass) => `${protocol}${user}:***@`)
  : 'Not set';

console.log('\n=== MongoDB Connection Test ===');
console.log('MongoDB URI:', maskedMongoUri);

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

// Set up event listeners
mongoose.connection.on('connecting', () => {
  console.log('🔌 Connecting to MongoDB...');
});

mongoose.connection.on('connected', () => {
  console.log('✅ Successfully connected to MongoDB');
  console.log(`   Host: ${mongoose.connection.host}`);
  console.log(`   Port: ${mongoose.connection.port || 'default'}`);
  console.log(`   Database: ${mongoose.connection.name}`);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
  if (err.name === 'MongoParseError') {
    console.error('   This might be due to an invalid connection string format');
  } else if (err.name === 'MongoServerSelectionError') {
    console.error('   This might be due to network issues or the server might be down');
  }
  process.exit(1);
});

// Connection options
const options = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  maxPoolSize: 1,
  family: 4, // Use IPv4, skip trying IPv6
  retryWrites: true,
  w: 'majority',
};

console.log('\nAttempting to connect to MongoDB...');
console.log('Connection options:', JSON.stringify(options, null, 2));

// Try to connect
mongoose.connect(process.env.MONGODB_URI, options)
  .then(() => {
    console.log('\n✅ Successfully connected to MongoDB!');
    return mongoose.connection.db.admin().ping();
  })
  .then(() => {
    console.log('✅ MongoDB server responded to ping');
    return mongoose.connection.db.stats();
  })
  .then(stats => {
    console.log('\n=== Database Stats ===');
    console.log(`Database: ${stats.db}`);
    console.log(`Collections: ${stats.collections}`);
    console.log(`Documents: ${stats.objects}`);
    console.log(`Data size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log('======================');
    
    // List all collections
    return mongoose.connection.db.listCollections().toArray();
  })
  .then(collections => {
    console.log('\n=== Collections ===');
    collections.forEach(collection => console.log(`- ${collection.name}`));
    console.log('===================');
    
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error during MongoDB connection test:', err.message);
    console.error('Error details:', {
      name: err.name,
      code: err.code,
      error: err,
    });
    
    if (err.name === 'MongoParseError') {
      console.error('\n💡 Tip: Check your MONGODB_URI format in the .env file');
      console.error('   Example format: mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority');
    } else if (err.name === 'MongoServerSelectionError') {
      console.error('\n💡 Tip: Check the following:');
      console.error('1. Your internet connection');
      console.error('2. MongoDB Atlas cluster status (https://cloud.mongodb.com)');
      console.error('3. IP whitelist in MongoDB Atlas');
      console.error('4. Database user credentials and permissions');
    }
    
    process.exit(1);
  });
