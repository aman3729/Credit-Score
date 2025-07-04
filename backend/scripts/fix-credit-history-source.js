import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const fixCreditHistorySource = async () => {
  try {
    const users = await User.find({ 'creditHistory.source': { $in: ['legacy', 'system-generated', 'batch-upload'] } });
    console.log(`Found ${users.length} user(s) with invalid creditHistory.source value.`);
    for (const user of users) {
      let updated = false;
      user.creditHistory.forEach(entry => {
        if (entry.source === 'legacy' || entry.source === 'system-generated') {
          entry.source = 'system';
          updated = true;
        }
        if (entry.source === 'batch-upload') {
          entry.source = 'batch_upload';
          updated = true;
        }
      });
      if (updated) {
        await user.save();
        console.log(`✅ Fixed user: ${user.email}`);
      }
    }
    if (users.length === 0) {
      console.log('No users needed fixing.');
    }
  } catch (error) {
    console.error('❌ Error fixing creditHistory:', error.message);
    if (error.errors) {
      Object.values(error.errors).forEach(err => {
        console.error(`  - ${err.message}`);
      });
    }
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
  }
};

(async () => {
  await connectDB();
  await fixCreditHistorySource();
  process.exit(0);
})(); 