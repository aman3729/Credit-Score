import mongoose from 'mongoose';
import PartnerBank from '../models/PartnerBank.js';
import User from '../models/User.js';

const checkAndCreatePartnerBanks = async () => {
  try {
    // Use environment variable for MongoDB URI
    const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!MONGO_URI) {
      console.error('❌ MONGODB_URI or MONGO_URI environment variable is required');
      process.exit(1);
    }
    
    await mongoose.connect(MONGO_URI);
    console.log('Connected to database');

    // Check if partner banks exist
    const existingBanks = await PartnerBank.find({});
    console.log(`Found ${existingBanks.length} existing partner banks`);

    if (existingBanks.length === 0) {
      console.log('No partner banks found. Creating default banks...');
      
      // Create admin user for seeding
      const adminUser = await User.findOne({ role: 'admin' });
      if (!adminUser) {
        console.log('No admin user found. Creating one...');
        // Create a simple admin user
        const newAdmin = new User({
          name: 'System Admin',
          username: 'admin',
          email: 'admin@system.com',
          password: 'admin123456',
          role: 'admin',
          bankId: 'CBE',
          status: 'active'
        });
        await newAdmin.save();
        console.log('Admin user created');
      }

      // Create default partner banks
      const defaultBanks = [
        {
          name: 'Commercial Bank of Ethiopia',
          slug: 'commercial-bank-ethiopia',
          code: 'CBE',
          logoUrl: '/logos/cbe.png',
          website: 'https://www.cbe.com.et',
          contactInfo: {
            email: 'info@cbe.com.et',
            phone: '+251 11 551 0000',
            address: 'Addis Ababa, Ethiopia'
          },
          allowedRoles: ['admin', 'underwriter', 'analyst', 'manager'],
          status: 'active',
          lendingConfig: {
            scoreThresholds: {
              personal: {
                approve: 700,
                conditional: 650,
                review: 600
              },
              business: {
                approve: 720,
                conditional: 670,
                review: 620
              },
              mortgage: {
                approve: 750,
                conditional: 700,
                review: 650
              },
              auto: {
                approve: 680,
                conditional: 630,
                review: 580
              }
            },
            loanAmounts: {
              personal: {
                EXCELLENT: 1000000,
                VERY_GOOD: 500000,
                GOOD: 300000,
                FAIR: 150000,
                POOR: 50000
              },
              business: {
                EXCELLENT: 5000000,
                VERY_GOOD: 2500000,
                GOOD: 1000000,
                FAIR: 500000,
                POOR: 100000
              },
              mortgage: {
                EXCELLENT: 10000000,
                VERY_GOOD: 8000000,
                GOOD: 6000000,
                FAIR: 4000000,
                POOR: 2000000
              },
              auto: {
                EXCELLENT: 2000000,
                VERY_GOOD: 1500000,
                GOOD: 1000000,
                FAIR: 500000,
                POOR: 200000
              }
            },
            interestRates: {
              baseRate: 12.0,
              maxRate: 35.99,
              riskAdjustments: {
                EXCELLENT: -2.0,
                VERY_GOOD: -1.0,
                GOOD: 0.0,
                FAIR: 2.0,
                POOR: 5.0
              },
              dtiAdjustments: {
                LOW: -1.0,
                MEDIUM: 0.0,
                HIGH: 2.0
              },
              recessionAdjustment: 2.0
            },
            dtiRules: {
              maxDTI: 0.45,
              maxDTIWithCollateral: 0.55,
              incomeMultipliers: {
                EXCELLENT: 12,
                VERY_GOOD: 10,
                GOOD: 8,
                FAIR: 6,
                POOR: 4
              },
              minimumIncome: 5000
            },
            collateralRules: {
              requiredFor: ['FAIR', 'POOR'],
              minValue: 5000,
              loanToValueRatio: 0.7,
              qualityThreshold: 0.6,
              recessionQualityThreshold: 0.7,
              recessionDiscount: 0.8
            },
            termOptions: {
              personal: [12, 24, 36, 48, 60],
              business: [12, 24, 36, 48, 60, 84],
              mortgage: [120, 180, 240, 300, 360],
              auto: [12, 24, 36, 48, 60, 72]
            },
            recessionMode: {
              enabled: false,
              rateIncrease: 2.0,
              maxAmountReduction: 0.85,
              maxTerm: 36
            },
            autoApproval: {
              enabled: true,
              maxAmount: 100000,
              requireManualReview: ['HIGH_AMOUNT', 'NEW_CUSTOMER']
            }
          }
        }
      ];

      const createdBanks = [];
      for (const bankData of defaultBanks) {
        const bank = new PartnerBank({
          ...bankData,
          createdBy: adminUser?._id || 'system'
        });

        await bank.save();
        createdBanks.push(bank);
        console.log(`Created partner bank: ${bank.name} (${bank.code})`);
      }

      console.log(`Successfully created ${createdBanks.length} partner banks`);
    } else {
      console.log('Partner banks already exist:');
      existingBanks.forEach(bank => {
        console.log(`- ${bank.name} (${bank.code})`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
};

// Run the function
checkAndCreatePartnerBanks(); 