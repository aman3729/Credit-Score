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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const PartnerBank = mongoose.model('PartnerBank', partnerBankSchema);

async function testQuery() {
  try {
    console.log('🔍 Testing database query...\n');
    
    // Test the same query that the admin endpoint uses
    const banks = await PartnerBank.find({ status: { $ne: 'suspended' } })
      .sort({ name: 1 });
    
    console.log(`📊 Total banks found: ${banks.length}\n`);
    
    // Show first 5 banks
    banks.slice(0, 5).forEach((bank, index) => {
      console.log(`${index + 1}. ${bank.code} - ${bank.name}`);
      console.log(`   Status: ${bank.status}`);
      console.log(`   Engine Config: ${bank.engineConfig ? '✅' : '❌'}`);
      console.log(`   Lending Policy: ${bank.lendingPolicy ? '✅' : '❌'}`);
      console.log(`   Access Controls: ${bank.accessControls ? '✅' : '❌'}`);
      console.log(`   Branding: ${bank.branding ? '✅' : '❌'}`);
      console.log('');
    });

    // Check if there are any banks with status 'suspended'
    const suspendedBanks = await PartnerBank.find({ status: 'suspended' });
    console.log(`⚠️  Suspended banks: ${suspendedBanks.length}`);
    suspendedBanks.forEach(bank => {
      console.log(`   - ${bank.code}: ${bank.name}`);
    });

  } catch (error) {
    console.error('❌ Error testing query:', error);
  }
}

async function main() {
  try {
    await connectDB();
    await testQuery();
  } catch (error) {
    console.error('❌ Main error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

main().catch(console.error); 