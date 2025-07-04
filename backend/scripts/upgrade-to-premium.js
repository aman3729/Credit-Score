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

const upgradeToPremium = async (email) => {
  try {
    await connectDB();
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`User with email ${email} not found`);
      return;
    }
    
    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`Current role: ${user.role}`);
    console.log(`Current premium status: ${user.premium?.isPremium || false}`);
    
    // Upgrade to premium
    const premiumData = {
      isPremium: true,
      subscriptionType: 'yearly',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      features: {
        realTimeMonitoring: true,
        weeklyUpdates: true,
        aiInsights: true,
        prioritySupport: true,
        creditSimulator: true,
        scoreProjections: true,
        detailedReports: true,
        lenderSharing: true
      },
      billing: {
        plan: 'premium_yearly',
        amount: 99.99,
        currency: 'USD',
        nextBillingDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    };
    
    // Update user with premium data
    user.premium = premiumData;
    user.role = 'premium'; // Also update role to premium
    
    await user.save();
    
    console.log('\n✅ User upgraded to premium successfully!');
    console.log(`\nPremium Details:`);
    console.log(`- Subscription Type: ${premiumData.subscriptionType}`);
    console.log(`- Start Date: ${premiumData.subscriptionStartDate.toLocaleDateString()}`);
    console.log(`- End Date: ${premiumData.subscriptionEndDate.toLocaleDateString()}`);
    console.log(`- Features Enabled: ${Object.keys(premiumData.features).length}`);
    console.log(`- Billing Plan: ${premiumData.billing.plan}`);
    console.log(`- Amount: $${premiumData.billing.amount}`);
    
    console.log('\n🎉 User can now access the Premium Dashboard!');
    console.log('Login with this user and navigate to /premium to see the dashboard.');
    
  } catch (error) {
    console.error('Error upgrading user to premium:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
};

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: node upgrade-to-premium.js <email>');
  console.log('Example: node upgrade-to-premium.js user@example.com');
  process.exit(1);
}

upgradeToPremium(email); 