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
  lendingConfig: { type: Object },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const PartnerBank = mongoose.model('PartnerBank', partnerBankSchema);

async function checkBanks() {
  try {
    console.log('🔍 Checking all banks in database...\n');
    
    const allBanks = await PartnerBank.find({}).sort({ code: 1 });
    
    console.log(`📊 Total banks found: ${allBanks.length}\n`);
    
    allBanks.forEach((bank, index) => {
      console.log(`${index + 1}. ${bank.code} - ${bank.name}`);
      console.log(`   Status: ${bank.status}`);
      console.log(`   Engine Config: ${bank.engineConfig ? '✅' : '❌'}`);
      console.log(`   Lending Policy: ${bank.lendingPolicy ? '✅' : '❌'}`);
      console.log(`   Access Controls: ${bank.accessControls ? '✅' : '❌'}`);
      console.log(`   Branding: ${bank.branding ? '✅' : '❌'}`);
      console.log(`   Legacy Config: ${bank.lendingConfig ? '✅' : '❌'}`);
      console.log('');
    });

    // Check which banks would be returned by the admin API
    const banksWithConfig = allBanks.filter(bank => 
      bank.engineConfig || bank.lendingPolicy || bank.accessControls || bank.branding
    );
    
    console.log(`🎯 Banks with enhanced config: ${banksWithConfig.length}`);
    banksWithConfig.forEach(bank => {
      console.log(`   - ${bank.code}: ${bank.name}`);
    });

    console.log(`\n⚠️  Banks without enhanced config: ${allBanks.length - banksWithConfig.length}`);
    allBanks.filter(bank => 
      !bank.engineConfig && !bank.lendingPolicy && !bank.accessControls && !bank.branding
    ).forEach(bank => {
      console.log(`   - ${bank.code}: ${bank.name}`);
    });

  } catch (error) {
    console.error('❌ Error checking banks:', error);
  }
}

async function main() {
  try {
    await connectDB();
    await checkBanks();
  } catch (error) {
    console.error('❌ Main error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

main().catch(console.error); 