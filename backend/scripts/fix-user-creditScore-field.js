import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('MongoDB connection string not found in environment variables.');
  process.exit(1);
}

async function fixUserCreditScoreField() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find users where creditScore is a number
    const users = await User.find({ creditScore: { $type: 'double' } });
    const usersInt = await User.find({ creditScore: { $type: 'int' } });
    const allUsers = [...users, ...usersInt];

    if (allUsers.length === 0) {
      console.log('No users found with numeric creditScore field.');
      return;
    }

    for (const user of allUsers) {
      console.log(`Fixing user ${user._id} (${user.username || user.phoneNumber || user.email}) - old creditScore: ${user.creditScore}`);
      user.creditScore = null;
      await user.save();
      console.log(`Updated user ${user._id}`);
    }

    console.log('All affected users updated.');
  } catch (err) {
    console.error('Error updating users:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixUserCreditScoreField(); 