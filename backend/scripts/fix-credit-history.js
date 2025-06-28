import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

async function fixCreditHistory() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find the user with the email
    const user = await User.findOne({ email: 'amanabraham724@gmail.com' });
    
    if (!user) {
      console.error('User not found');
      process.exit(1);
    }

    console.log(`Found user: ${user.email}`);
    console.log('Current credit history:', JSON.stringify(user.creditHistory, null, 2));

    // Add default source for any entries missing it
    let updated = false;
    if (user.creditHistory && user.creditHistory.length > 0) {
      user.creditHistory = user.creditHistory.map(entry => {
        if (!entry.source) {
          console.log(`Adding default source to entry: ${entry._id}`);
          updated = true;
          return {
            ...entry.toObject(),
            source: 'system',
            _id: entry._id // Preserve the existing _id
          };
        }
        return entry;
      });

      if (updated) {
        // Use findOneAndUpdate with $set to bypass validation
        await User.updateOne(
          { _id: user._id },
          { 
            $set: { 
              'creditHistory.$[].source': 'system' 
            } 
          }
        );
        console.log('Credit history updated successfully');
      } else {
        console.log('No updates needed - all credit history entries have a source');
      }
    } else {
      console.log('No credit history to update');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error fixing credit history:', error);
    process.exit(1);
  }
}

fixCreditHistory();
