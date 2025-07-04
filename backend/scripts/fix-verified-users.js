import mongoose from 'mongoose';
import User from '../models/User.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://parzival:theoasis@credit-score-dashboard.w2bwj1o.mongodb.net/credit-score-dashboard?retryWrites=true&w=majority';

async function fixAdminUser() {
  await mongoose.connect(MONGO_URI);

  const result = await User.updateOne(
    { email: 'admin@creditdashboard.com', status: 'verified' },
    { $set: { status: 'active' } }
  );

  console.log(`Updated ${result.nModified || result.modifiedCount} admin user to 'active'.`);
  await mongoose.disconnect();
}

fixAdminUser(); 