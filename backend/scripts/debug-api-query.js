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

// PartnerBank Schema
const partnerBankSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  status: { type: String, default: 'active' },
  engineConfig: { type: Object },
  lendingPolicy: { type: Object },
  accessControls: { type: Object },
  branding: { type: Object },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const PartnerBank = mongoose.model('PartnerBank', partnerBankSchema);

async function debugQuery() {
  try {
    console.log('🔍 Debugging API query...\n');
    
    // Test 1: Same query as the API
    console.log('📊 Test 1: API query (status: { $ne: "suspended" })');
    const apiQuery = await PartnerBank.find({ status: { $ne: 'suspended' } })
      .sort({ name: 1 });
    console.log(`✅ API query returned: ${apiQuery.length} banks`);
    
    // Test 2: All banks regardless of status
    console.log('\n📊 Test 2: All banks (no status filter)');
    const allBanks = await PartnerBank.find({}).sort({ name: 1 });
    console.log(`✅ All banks query returned: ${allBanks.length} banks`);
    
    // Test 3: Check for suspended banks
    console.log('\n📊 Test 3: Suspended banks only');
    const suspendedBanks = await PartnerBank.find({ status: 'suspended' });
    console.log(`✅ Suspended banks: ${suspendedBanks.length}`);
    suspendedBanks.forEach(bank => {
      console.log(`   - ${bank.code}: ${bank.name} (status: ${bank.status})`);
    });
    
    // Test 4: Check for banks with different statuses
    console.log('\n📊 Test 4: Banks by status');
    const statusCounts = await PartnerBank.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    statusCounts.forEach(item => {
      console.log(`   - Status "${item._id}": ${item.count} banks`);
    });
    
    // Test 5: Check createdBy field
    console.log('\n📊 Test 5: Banks by createdBy');
    const createdByCounts = await PartnerBank.aggregate([
      { $group: { _id: '$createdBy', count: { $sum: 1 } } }
    ]);
    createdByCounts.forEach(item => {
      console.log(`   - CreatedBy "${item._id}": ${item.count} banks`);
    });
    
    // Show first few banks from API query
    console.log('\n🏦 First 5 banks from API query:');
    apiQuery.slice(0, 5).forEach((bank, index) => {
      console.log(`${index + 1}. ${bank.code} - ${bank.name}`);
      console.log(`   Status: ${bank.status}`);
      console.log(`   CreatedBy: ${bank.createdBy}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error debugging query:', error);
  }
}

async function main() {
  try {
    await connectDB();
    await debugQuery();
  } catch (error) {
    console.error('❌ Main error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

main().catch(console.error); 