import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables first
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

console.log('Loading environment from:', envPath);
dotenv.config({ path: envPath });

// Debug: Log environment variables (be careful with sensitive data in production)
console.log('Environment variables loaded:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected Successfully');
    
    // Get the default connection
    const db = mongoose.connection.db;
    
    // List all collections in the database
    const collections = await db.listCollections().toArray();
    console.log('\nCollections in database:');
    console.table(collections.map(c => ({ name: c.name })));
    
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    console.error('Connection URI:', process.env.MONGODB_URI);
    process.exit(1);
  }
};

// List all users
const listUsers = async (db) => {
  try {
    console.log('\nFetching users...');
    
    // First try to get the users collection directly
    const collections = await db.listCollections({ name: 'users' }).toArray();
    
    if (collections.length === 0) {
      console.log('No users collection found in the database.');
      return;
    }
    
    // Get users collection
    const usersCollection = db.collection('users');
    const users = await usersCollection.find({}).toArray();
    
    if (users.length === 0) {
      console.log('No users found in the users collection.');
      return;
    }
    
    console.log('\nUsers in database:');
    console.table(users.map(user => ({
      _id: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt
    })));
    
  } catch (error) {
    console.error('Error listing users:', error);
  }
};

// Run the script
(async () => {
  try {
    const db = await connectDB();
    await listUsers(db);
  } catch (error) {
    console.error('Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB Disconnected');
    process.exit(0);
  }
})();
