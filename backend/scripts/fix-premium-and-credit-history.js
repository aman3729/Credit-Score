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

const fixPremiumAndCreditHistory = async () => {
  try {
    console.log('🔧 Starting to fix premium and credit history issues...');
    
    const users = await User.find({});
    console.log(`Found ${users.length} total users to check`);
    
    let fixedUsers = 0;
    let premiumFixed = 0;
    let creditHistoryFixed = 0;
    
    for (const user of users) {
      let updated = false;
      
      // Fix premium.subscriptionType
      if (user.premium && (!user.premium.subscriptionType || user.premium.subscriptionType === null)) {
        user.premium.subscriptionType = 'yearly';
        updated = true;
        premiumFixed++;
        console.log(`  - Fixed premium.subscriptionType for: ${user.email}`);
      }
      
      // Fix creditHistory.source
      if (Array.isArray(user.creditHistory)) {
        user.creditHistory.forEach((entry, index) => {
          if (!entry.source || !['manual', 'batch_upload', 'api', 'system'].includes(entry.source)) {
            const oldSource = entry.source;
            entry.source = 'system';
            updated = true;
            creditHistoryFixed++;
            console.log(`  - Fixed creditHistory[${index}].source for: ${user.email} (${oldSource} -> system)`);
          }
        });
      }
      
      if (updated) {
        await user.save();
        console.log(`✅ Fixed user: ${user.email}`);
        fixedUsers++;
      }
    }
    
    console.log('');
    console.log('📊 Fix Summary:');
    console.log(`Total users processed: ${users.length}`);
    console.log(`Users with fixes: ${fixedUsers}`);
    console.log(`Premium fixes: ${premiumFixed}`);
    console.log(`Credit history fixes: ${creditHistoryFixed}`);
    
    if (fixedUsers === 0) {
      console.log('🎉 No users needed fixing - all data is valid!');
    } else {
      console.log('✅ All fixes completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error fixing users:', error.message);
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
  await fixPremiumAndCreditHistory();
  process.exit(0);
})(); 