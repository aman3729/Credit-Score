import mongoose from 'mongoose';
import PartnerBank from '../models/PartnerBank.js';
import User from '../models/User.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://parzival:theoasis@credit-score-dashboard.w2bwj1o.mongodb.net/credit-score-dashboard?retryWrites=true&w=majority';

const createAllPartnerBanks = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to database');

    // Get all unique bank codes from users
    const users = await User.find({});
    const bankCodes = [...new Set(users.map(user => user.bankId))];
    console.log('Bank codes found in users:', bankCodes);

    // Check existing partner banks
    const existingBanks = await PartnerBank.find({});
    const existingCodes = existingBanks.map(bank => bank.code);
    console.log('Existing partner bank codes:', existingCodes);

    // Create admin user for seeding if needed
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('No admin user found. Creating one...');
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

    // Create partner banks for missing codes
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
        // Enhanced Engine Configuration
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
        // Enhanced Lending Policy
        lendingPolicy: {
          baseLoanAmounts: {
            EXCELLENT: 1000000,
            VERY_GOOD: 750000,
            GOOD: 500000,
            FAIR: 300000,
            POOR: 100000
          },
          incomeMultipliers: {
            EXCELLENT: 12,
            VERY_GOOD: 10,
            GOOD: 8,
            FAIR: 6,
            POOR: 4
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
          termOptions: [12, 24, 36, 48, 60],
          recessionMode: false,
          allowCollateralOverride: true,
          requireCollateralFor: ['POOR', 'FAIR']
        },
        // Access Controls
        accessControls: {
          canExportData: true,
          apiAccessEnabled: false,
          maxFileSizeMb: 5,
          visibleTabs: ['Loan Decisions', 'Applications', 'Upload', 'Simulation', 'Config', 'Analytics']
        },
        // Branding
        branding: {
          primaryColor: '#004aad',
          theme: 'light',
          currency: 'ETB',
          language: 'en'
        },
        // Legacy lending config (for backward compatibility)
        lendingConfig: {
          scoreThresholds: {
            personal: { approve: 700, conditional: 650, review: 600 },
            business: { approve: 720, conditional: 670, review: 620 },
            mortgage: { approve: 750, conditional: 700, review: 650 },
            auto: { approve: 680, conditional: 630, review: 580 }
          },
          loanAmounts: {
            personal: {
              EXCELLENT: 1000000, VERY_GOOD: 500000, GOOD: 300000, FAIR: 150000, POOR: 50000
            },
            business: {
              EXCELLENT: 5000000, VERY_GOOD: 2500000, GOOD: 1000000, FAIR: 500000, POOR: 100000
            },
            mortgage: {
              EXCELLENT: 10000000, VERY_GOOD: 8000000, GOOD: 6000000, FAIR: 4000000, POOR: 2000000
            },
            auto: {
              EXCELLENT: 2000000, VERY_GOOD: 1500000, GOOD: 1000000, FAIR: 500000, POOR: 200000
            }
          },
          interestRates: {
            baseRate: 12.0,
            maxRate: 35.99,
            riskAdjustments: {
              EXCELLENT: -2.0, VERY_GOOD: -1.0, GOOD: 0.0, FAIR: 2.0, POOR: 5.0
            },
            dtiAdjustments: { LOW: -1.0, MEDIUM: 0.0, HIGH: 2.0 },
            recessionAdjustment: 2.0
          },
          dtiRules: {
            maxDTI: 0.45,
            maxDTIWithCollateral: 0.55,
            incomeMultipliers: {
              EXCELLENT: 12, VERY_GOOD: 10, GOOD: 8, FAIR: 6, POOR: 4
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
        name: 'Aman Bank',
        slug: 'aman-bank',
        code: 'AMAN',
        logoUrl: '/logos/aman.png',
        website: 'https://www.amanbank.com',
        contactInfo: {
          email: 'info@amanbank.com',
          phone: '+251 11 123 4567',
          address: 'Addis Ababa, Ethiopia'
        },
        allowedRoles: ['admin', 'underwriter', 'analyst', 'manager'],
        status: 'active',
        // Enhanced Engine Configuration
        engineConfig: {
          engine1: {
            scoringWeights: {
              paymentHistory: 40,
              creditUtilization: 25,
              creditAge: 20,
              creditMix: 10,
              inquiries: 5
            },
            penalties: {
              recentDefaults: -20,
              missedPaymentsLast12: { threshold: 1, penalty: -8 },
              lowOnTimeRate: { threshold: 0.90, penalty: -6 },
              highInquiries: { threshold: 2, penalty: -3 }
            },
            bonuses: {
              perfectPaymentRate: 8,
              goodCreditMix: 3,
              highTransactionVolume: 5
            },
            rejectionRules: {
              allowConsecutiveMissedPayments: false,
              maxMissedPayments12Mo: 2,
              minMonthsSinceLastDelinquency: 6
            },
            maxScore: 850,
            minScore: 300,
            allowManualOverride: false
          },
          engine2: {
            weights: {
              capacity: 40,
              capital: 25,
              collateral: 15,
              conditions: 10,
              character: 10
            },
            subFactors: {
              cashFlowWeight: 60,
              incomeStabilityWeight: 25,
              discretionarySpendingWeight: 15,
              budgetingConsistencyWeight: 15,
              savingsConsistencyWeight: 15
            },
            behavioralThresholds: {
              maxDTI: 0.40,
              minSavingsRate: 0.15,
              stableEmploymentRequired: true
            },
            riskLabels: {
              highRiskThreshold: 35,
              moderateRiskThreshold: 55,
              lowRiskThreshold: 75
            },
            allowManualReview: true
          }
        },
        // Enhanced Lending Policy
        lendingPolicy: {
          baseLoanAmounts: {
            EXCELLENT: 800000,
            VERY_GOOD: 600000,
            GOOD: 400000,
            FAIR: 250000,
            POOR: 80000
          },
          incomeMultipliers: {
            EXCELLENT: 10,
            VERY_GOOD: 8,
            GOOD: 6,
            FAIR: 4,
            POOR: 2
          },
          interestRateRules: {
            baseRate: 13.5,
            adjustments: {
              HIGH_DTI: 4,
              EMPLOYMENT_UNSTABLE: 3,
              RECENT_DEFAULT: 6
            },
            maxRate: 35.99
          },
          termOptions: [12, 24, 36, 48],
          recessionMode: false,
          allowCollateralOverride: false,
          requireCollateralFor: ['FAIR', 'POOR']
        },
        // Access Controls
        accessControls: {
          canExportData: true,
          apiAccessEnabled: false,
          maxFileSizeMb: 3,
          visibleTabs: ['Loan Decisions', 'Applications', 'Upload', 'Simulation']
        },
        // Branding
        branding: {
          primaryColor: '#2e7d32',
          theme: 'light',
          currency: 'ETB',
          language: 'en'
        },
        // Legacy lending config (for backward compatibility)
        lendingConfig: {
          scoreThresholds: {
            personal: { approve: 720, conditional: 670, review: 620 },
            business: { approve: 750, conditional: 700, review: 650 },
            mortgage: { approve: 780, conditional: 730, review: 680 },
            auto: { approve: 700, conditional: 650, review: 600 }
          },
          loanAmounts: {
            personal: {
              EXCELLENT: 800000, VERY_GOOD: 400000, GOOD: 250000, FAIR: 120000, POOR: 40000
            },
            business: {
              EXCELLENT: 4000000, VERY_GOOD: 2000000, GOOD: 800000, FAIR: 400000, POOR: 80000
            },
            mortgage: {
              EXCELLENT: 8000000, VERY_GOOD: 6000000, GOOD: 5000000, FAIR: 3000000, POOR: 1500000
            },
            auto: {
              EXCELLENT: 1500000, VERY_GOOD: 1200000, GOOD: 800000, FAIR: 400000, POOR: 150000
            }
          },
          interestRates: {
            baseRate: 13.5,
            maxRate: 35.99,
            riskAdjustments: {
              EXCELLENT: -2.5, VERY_GOOD: -1.5, GOOD: 0.0, FAIR: 2.5, POOR: 6.0
            },
            dtiAdjustments: { LOW: -1.5, MEDIUM: 0.0, HIGH: 2.5 },
            recessionAdjustment: 2.5
          },
          dtiRules: {
            maxDTI: 0.40,
            maxDTIWithCollateral: 0.50,
            incomeMultipliers: {
              EXCELLENT: 10, VERY_GOOD: 8, GOOD: 6, FAIR: 4, POOR: 3
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

    let createdCount = 0;
    for (const bankData of partnerBanks) {
      if (!existingCodes.includes(bankData.code)) {
        const bank = new PartnerBank({
          ...bankData,
          createdBy: adminUser?._id || 'system'
        });

        await bank.save();
        createdCount++;
        console.log(`Created partner bank: ${bank.name} (${bank.code})`);
      } else {
        console.log(`Partner bank ${bankData.code} already exists`);
      }
    }

    console.log(`\nCreated ${createdCount} new partner banks`);
    
    // Show final status
    const finalBanks = await PartnerBank.find({});
    console.log('\nAll partner banks:');
    finalBanks.forEach(bank => {
      console.log(`- ${bank.name} (${bank.code})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
};

// Run the function
createAllPartnerBanks(); 