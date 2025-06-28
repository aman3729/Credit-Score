import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

async function fixUserDocuments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Fix users missing name
    const nameUpdate = await User.updateMany(
      { name: { $exists: false } },
      { $set: { name: 'Default User' } }
    );
    console.log(`Updated ${nameUpdate.nModified} users missing name`);

    // 2. Fix creditHistory entries missing source
    const users = await User.find({ 'creditHistory.source': { $exists: false } });
    
    let creditHistoryUpdates = 0;
    
    for (const user of users) {
      let needsUpdate = false;
      
      if (user.creditHistory && user.creditHistory.length > 0) {
        user.creditHistory = user.creditHistory.map(entry => {
          if (!entry.source) {
            entry.source = 'system';
            needsUpdate = true;
            creditHistoryUpdates++;
          }
          return entry;
        });
        
        if (needsUpdate) {
          await user.save();
        }
      }
    }
    
    console.log(`Updated ${creditHistoryUpdates} credit history entries missing source`);
    
    console.log('Migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

fixUserDocuments();
