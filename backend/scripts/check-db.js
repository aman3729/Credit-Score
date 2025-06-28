import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

console.log('Loading environment from:', envPath);
dotenv.config({ path: envPath });

// Debug: Log environment variables
console.log('Environment variables loaded:');
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');

async function checkDatabase() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Successfully connected to MongoDB');
    
    const db = client.db();
    console.log('\nDatabase name:', db.databaseName);
    
    // List all collections
    console.log('\nListing all collections:');
    const collections = await db.listCollections().toArray();
    console.table(collections.map(c => ({
      name: c.name,
      type: c.type || 'collection'
    })));
    
    // Check if users collection exists
    const usersCollection = collections.find(c => c.name === 'users');
    
    if (usersCollection) {
      console.log('\nUsers collection found. Fetching user documents...');
      const users = await db.collection('users').find({}).toArray();
      
      if (users.length > 0) {
        console.log('\nUsers in database:');
        console.table(users.map(user => ({
          _id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt
        })));
      } else {
        console.log('No users found in the users collection.');
      }
    } else {
      console.log('No users collection found in the database.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nMongoDB connection closed');
  }
}

// Run the check
checkDatabase().catch(console.error);
