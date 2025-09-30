import mongoose from 'mongoose';

// All Ethiopian banks from the schema mapping
const ALL_ETHIOPIAN_BANKS = [
  { code: 'CBE', name: 'Commercial Bank of Ethiopia' },
  { code: 'DBE', name: 'Development Bank of Ethiopia' },
  { code: 'AWASH', name: 'Awash Bank' },
  { code: 'DASHEN', name: 'Dashen Bank' },
  { code: 'ABYSSINIA', name: 'Bank of Abyssinia' },
  { code: 'WEGAGEN', name: 'Wegagen Bank' },
  { code: 'NIB', name: 'Nib International Bank' },
  { code: 'HIBRET', name: 'Hibret Bank' },
  { code: 'LION', name: 'Lion International Bank' },
  { code: 'COOP', name: 'Cooperative Bank of Oromia' },
  { code: 'ZEMEN', name: 'Zemen Bank' },
  { code: 'OROMIA', name: 'Oromia International Bank' },
  { code: 'BUNNA', name: 'Bunna Bank' },
  { code: 'BERHAN', name: 'Berhan Bank' },
  { code: 'ABAY', name: 'Abay Bank' },
  { code: 'ADDIS', name: 'Addis International Bank' },
  { code: 'DEBUB', name: 'Debub Global Bank' },
  { code: 'ENAT', name: 'Enat Bank' },
  { code: 'GADAA', name: 'Gadaa Bank' },
  { code: 'HIJRA', name: 'Hijra Bank' },
  { code: 'SHABELLE', name: 'Shabelle Bank' },
  { code: 'SIINQEE', name: 'Siinqee Bank' },
  { code: 'TSEHAY', name: 'Tsehay Bank' },
  { code: 'AMHARA', name: 'Amhara Bank' },
  { code: 'AHADU', name: 'Ahadu Bank' },
  { code: 'GOH', name: 'Goh Bank' },
  { code: 'AMAN', name: 'Aman Bank' }
];

// Default configuration template
const getDefaultConfig = (bankCode) => ({
  engineConfig: {
    engine1: {
      scoringWeights: {
        paymentHistory: 35,
        creditUtilization: 30,
        creditAge: 15,
        creditMix: 10,
        inquiries: 10
      },
      penalties: {
        recentDefaults: -15,
        missedPaymentsLast12: { threshold: 2, penalty: -5 },
        lowOnTimeRate: { threshold: 0.85, penalty: -4 },
        highInquiries: { threshold: 3, penalty: -2 }
      },
      bonuses: {
        perfectPaymentRate: 5,
        goodCreditMix: 2,
        highTransactionVolume: 3
      },
      rejectionRules: {
        allowConsecutiveMissedPayments: false,
        maxMissedPayments12Mo: 3,
        minMonthsSinceLastDelinquency: 3
      },
      maxScore: 850,
      minScore: 300,
      allowManualOverride: true
    },
    engine2: {
      weights: {
        capacity: 35,
        capital: 20,
        collateral: 20,
        conditions: 15,
        character: 10
      },
      subFactors: {
        cashFlowWeight: 50,
        incomeStabilityWeight: 30,
        discretionarySpendingWeight: 20,
        budgetingConsistencyWeight: 10,
        savingsConsistencyWeight: 10
      },
      behavioralThresholds: {
        maxDTI: 0.45,
        minSavingsRate: 0.1,
        stableEmploymentRequired: true
      },
      riskLabels: {
        highRiskThreshold: 40,
        moderateRiskThreshold: 60,
        lowRiskThreshold: 80
      },
      allowManualReview: true
    }
  },
  lendingPolicy: {
    baseLoanAmounts: {
      EXCELLENT: 100000,
      VERY_GOOD: 75000,
      GOOD: 50000,
      FAIR: 30000,
      POOR: 10000
    },
    incomeMultipliers: {
      EXCELLENT: 10,
      VERY_GOOD: 8,
      GOOD: 6,
      FAIR: 4,
      POOR: 2
    },
    interestRateRules: {
      baseRate: 12.5,
      adjustments: {
        HIGH_DTI: 3,
        EMPLOYMENT_UNSTABLE: 2,
        RECENT_DEFAULT: 5
      },
      maxRate: 35.99
    },
    termOptions: [12, 24, 36, 48],
    recessionMode: false,
    allowCollateralOverride: true,
    requireCollateralFor: ['POOR', 'FAIR'],
    maxDTI: 0.45
  },
  accessControls: {
    canExportData: true,
    apiAccessEnabled: false,
    maxFileSizeMb: 5,
    visibleTabs: ['Loan Decisions', 'Applications', 'Upload', 'Simulation']
  },
  branding: {
    primaryColor: '#004aad',
    theme: 'light',
    currency: 'ETB',
    language: 'en'
  }
});

// Connect to MongoDB
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGODB_URI or MONGO_URI environment variable is required');
  process.exit(1);
}

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// PartnerBank Schema (simplified for this script)
const partnerBankSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  status: { type: String, default: 'active' },
  engineConfig: { type: Object },
  lendingPolicy: { type: Object },
  accessControls: { type: Object },
  branding: { type: Object },
  lendingConfig: { type: Object }, // Legacy config for backward compatibility
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const PartnerBank = mongoose.model('PartnerBank', partnerBankSchema);

// Function to generate slug from bank name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim('-'); // Remove leading/trailing hyphens
}

async function createAllBanks() {
  try {
    console.log('🚀 Starting to create all Ethiopian banks...');
    
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const bank of ALL_ETHIOPIAN_BANKS) {
      try {
        // Check if bank already exists
        const existingBank = await PartnerBank.findOne({ code: bank.code });
        
        if (existingBank) {
          console.log(`⚠️  Bank ${bank.code} (${bank.name}) already exists`);
          skippedCount++;
          continue;
        }

        // Create new bank with default configuration
        const bankConfig = {
          ...bank,
          slug: generateSlug(bank.name),
          ...getDefaultConfig(bank.code)
        };

        const newBank = new PartnerBank(bankConfig);
        await newBank.save();
        
        console.log(`✅ Created ${bank.code} (${bank.name})`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error creating ${bank.code}:`, error.message);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Created: ${createdCount} banks`);
    console.log(`🔄 Updated: ${updatedCount} banks`);
    console.log(`⏭️  Skipped: ${skippedCount} banks`);
    console.log(`📈 Total processed: ${createdCount + updatedCount + skippedCount} banks`);

    // List all banks in database
    console.log('\n📋 All banks in database:');
    const allBanks = await PartnerBank.find({}).sort({ code: 1 });
    allBanks.forEach(bank => {
      console.log(`  - ${bank.code}: ${bank.name} (${bank.status})`);
    });

  } catch (error) {
    console.error('❌ Error in createAllBanks:', error);
  }
}

async function main() {
  try {
    await connectDB();
    await createAllBanks();
    console.log('\n🎉 All Ethiopian banks creation completed!');
  } catch (error) {
    console.error('❌ Main error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
main().catch(console.error); 