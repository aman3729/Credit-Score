import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const checkUserPremium = async (email) => {
  try {
    await connectDB();
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`User with email ${email} not found`);
      return;
    }
    
    console.log(`\n=== User Premium Status ===`);
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Premium Status: ${user.premium?.isPremium || false}`);
    
    if (user.premium) {
      console.log(`\nPremium Details:`);
      console.log(`- Subscription Type: ${user.premium.subscriptionType}`);
      console.log(`- Start Date: ${user.premium.subscriptionStartDate?.toLocaleDateString()}`);
      console.log(`- End Date: ${user.premium.subscriptionEndDate?.toLocaleDateString()}`);
      console.log(`- Features: ${Object.keys(user.premium.features || {}).length} enabled`);
      
      if (user.premium.billing) {
        console.log(`- Billing Plan: ${user.premium.billing.plan}`);
        console.log(`- Amount: $${user.premium.billing.amount}`);
      }
      
      // Show all premium fields
      console.log(`\nAll Premium Fields:`);
      console.log(JSON.stringify(user.premium, null, 2));
    } else {
      console.log(`\nNo premium data found`);
    }
    
    console.log(`\nFull user object keys:`, Object.keys(user.toObject()));
    
    // Check if premium field exists in the document
    console.log(`\nHas premium field:`, user.premium !== undefined);
    console.log(`Premium field type:`, typeof user.premium);
    
  } catch (error) {
    console.error('Error checking user premium status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
};

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: node check-user-premium.js <email>');
  console.log('Example: node check-user-premium.js admin@creditdashboard.com');
  process.exit(1);
}

checkUserPremium(email); 