import mongoose from 'mongoose';
import PartnerBank from '../models/PartnerBank.js';
import User from '../models/User.js';
import { connectDB } from '../config/db.js';
import { logger } from '../config/logger.js';

const partnerBanks = [
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
  },
  {
    name: 'Development Bank of Ethiopia',
    slug: 'development-bank-ethiopia',
    code: 'DBE',
    logoUrl: '/logos/dbe.png',
    website: 'https://www.dbe.com.et',
    contactInfo: {
      email: 'info@dbe.com.et',
      phone: '+251 11 551 0000',
      address: 'Addis Ababa, Ethiopia'
    },
    allowedRoles: ['admin', 'underwriter', 'analyst', 'manager'],
    status: 'active',
    lendingConfig: {
      scoreThresholds: {
        personal: {
          approve: 720,
          conditional: 670,
          review: 620
        },
        business: {
          approve: 750,
          conditional: 700,
          review: 650
        },
        mortgage: {
          approve: 780,
          conditional: 730,
          review: 680
        },
        auto: {
          approve: 700,
          conditional: 650,
          review: 600
        }
      },
      loanAmounts: {
        personal: {
          EXCELLENT: 800000,
          VERY_GOOD: 400000,
          GOOD: 250000,
          FAIR: 120000,
          POOR: 40000
        },
        business: {
          EXCELLENT: 4000000,
          VERY_GOOD: 2000000,
          GOOD: 800000,
          FAIR: 400000,
          POOR: 80000
        },
        mortgage: {
          EXCELLENT: 8000000,
          VERY_GOOD: 6000000,
          GOOD: 5000000,
          FAIR: 3000000,
          POOR: 1500000
        },
        auto: {
          EXCELLENT: 1500000,
          VERY_GOOD: 1200000,
          GOOD: 800000,
          FAIR: 400000,
          POOR: 150000
        }
      },
      interestRates: {
        baseRate: 13.5,
        maxRate: 35.99,
        riskAdjustments: {
          EXCELLENT: -2.5,
          VERY_GOOD: -1.5,
          GOOD: 0.0,
          FAIR: 2.5,
          POOR: 6.0
        },
        dtiAdjustments: {
          LOW: -1.5,
          MEDIUM: 0.0,
          HIGH: 2.5
        },
        recessionAdjustment: 2.5
      },
      dtiRules: {
        maxDTI: 0.40,
        maxDTIWithCollateral: 0.50,
        incomeMultipliers: {
          EXCELLENT: 10,
          VERY_GOOD: 8,
          GOOD: 6,
          FAIR: 4,
          POOR: 3
        },
        minimumIncome: 8000
      },
      collateralRules: {
        requiredFor: ['FAIR', 'POOR'],
        minValue: 8000,
        loanToValueRatio: 0.65,
        qualityThreshold: 0.7,
        recessionQualityThreshold: 0.8,
        recessionDiscount: 0.75
      },
      termOptions: {
        personal: [12, 24, 36, 48],
        business: [12, 24, 36, 48, 60],
        mortgage: [120, 180, 240, 300],
        auto: [12, 24, 36, 48, 60]
      },
      recessionMode: {
        enabled: false,
        rateIncrease: 2.5,
        maxAmountReduction: 0.80,
        maxTerm: 36
      },
      autoApproval: {
        enabled: true,
        maxAmount: 80000,
        requireManualReview: ['HIGH_AMOUNT', 'NEW_CUSTOMER', 'HIGH_DTI']
      }
    }
  }
];

const seedPartnerBanks = async () => {
  try {
    await connectDB();
    logger.info('Connected to database');

    // Clear existing partner banks
    await PartnerBank.deleteMany({});
    logger.info('Cleared existing partner banks');

    // Create admin user for seeding
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      throw new Error('No admin user found. Please create an admin user first.');
    }

    // Create partner banks
    const createdBanks = [];
    for (const bankData of partnerBanks) {
      const bank = new PartnerBank({
        ...bankData,
        createdBy: adminUser._id
      });

      // Validate configuration
      const validationErrors = bank.validateLendingConfig();
      if (validationErrors.length > 0) {
        logger.error(`Validation errors for ${bankData.name}:`, validationErrors);
        continue;
      }

      await bank.save();
      createdBanks.push(bank);
      logger.info(`Created partner bank: ${bank.name} (${bank.code})`);
    }

    logger.info(`Successfully seeded ${createdBanks.length} partner banks`);
    
    // Display summary
    console.log('\n=== Partner Banks Seeded ===');
    createdBanks.forEach(bank => {
      console.log(`✓ ${bank.name} (${bank.code})`);
    });
    console.log('\nSeeding completed successfully!');

  } catch (error) {
    logger.error('Error seeding partner banks:', error);
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from database');
  }
};

// Run the seeding function
seedPartnerBanks(); 