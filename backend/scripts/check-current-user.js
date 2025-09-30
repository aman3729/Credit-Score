import mongoose from 'mongoose';

// Connect to MongoDB
const MONGO_URI = 'mongodb://localhost:27017/credit-score-dashboard';

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// User Schema
const userSchema = new mongoose.Schema({
  bankId: String,
  role: String,
  email: String,
  name: String
});

const User = mongoose.model('User', userSchema);

// PartnerBank Schema
const partnerBankSchema = new mongoose.Schema({
  code: String,
  name: String,
  status: String,
  createdBy: String
});

const PartnerBank = mongoose.model('PartnerBank', partnerBankSchema);

async function checkUserAndBanks() {
  try {
    console.log('🔍 Checking current user and banks...\n');
    
    // Check the user with ID that appears in the API response
    const userId = '68604d323f5ba0faee55f65d';
    console.log(`👤 Checking user with ID: ${userId}`);
    
    const user = await User.findById(userId);
    if (user) {
      console.log('✅ User found:');
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   BankId: ${user.bankId}`);
    } else {
      console.log('❌ User not found');
    }
    
    // Check all admin users
    console.log('\n👑 Checking all admin users:');
    const adminUsers = await User.find({ role: 'admin' });
    console.log(`✅ Found ${adminUsers.length} admin users:`);
    adminUsers.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name} (${admin.email})`);
      console.log(`   BankId: ${admin.bankId}`);
      console.log(`   UserId: ${admin._id}`);
      console.log('');
    });
    
    // Check banks by createdBy
    console.log('🏦 Checking banks by createdBy:');
    const banksByCreator = await PartnerBank.aggregate([
      { $group: { _id: '$createdBy', count: { $sum: 1 }, banks: { $push: '$code' } } }
    ]);
    
    banksByCreator.forEach(item => {
      console.log(`   CreatedBy "${item._id}": ${item.count} banks (${item.banks.join(', ')})`);
    });
    
    // Check if there are any banks with null/undefined createdBy
    console.log('\n🔍 Checking banks with null createdBy:');
    const nullCreatedByBanks = await PartnerBank.find({ createdBy: { $exists: false } });
    console.log(`✅ Found ${nullCreatedByBanks.length} banks with no createdBy field`);
    if (nullCreatedByBanks.length > 0) {
      console.log('   Bank codes:', nullCreatedByBanks.map(b => b.code).join(', '));
    }

  } catch (error) {
    console.error('❌ Error checking user and banks:', error);
  }
}

async function main() {
  try {
    await connectDB();
    await checkUserAndBanks();
  } catch (error) {
    console.error('❌ Main error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

main().catch(console.error); 