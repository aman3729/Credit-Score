import mongoose from 'mongoose';
import PartnerBank from '../models/PartnerBank.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://parzival:theoasis@credit-score-dashboard.w2bwj1o.mongodb.net/credit-score-dashboard?retryWrites=true&w=majority';

const updatePartnerBanksEnhanced = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to database');

    // Get existing partner banks
    const existingBanks = await PartnerBank.find({});
    console.log(`Found ${existingBanks.length} existing partner banks`);

    // Enhanced configurations for each bank
    const enhancedConfigs = {
      CBE: {
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
        accessControls: {
          canExportData: true,
          apiAccessEnabled: false,
          maxFileSizeMb: 5,
          visibleTabs: ['Loan Decisions', 'Applications', 'Upload', 'Simulation', 'Config', 'Analytics']
        },
        branding: {
          primaryColor: '#004aad',
          theme: 'light',
          currency: 'ETB',
          language: 'en'
        }
      },
      AMAN: {
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
        accessControls: {
          canExportData: true,
          apiAccessEnabled: false,
          maxFileSizeMb: 3,
          visibleTabs: ['Loan Decisions', 'Applications', 'Upload', 'Simulation']
        },
        branding: {
          primaryColor: '#2e7d32',
          theme: 'light',
          currency: 'ETB',
          language: 'en'
        }
      }
    };

    let updatedCount = 0;
    for (const bank of existingBanks) {
      const enhancedConfig = enhancedConfigs[bank.code];
      if (enhancedConfig) {
        // Update the bank with enhanced configuration
        bank.engineConfig = enhancedConfig.engineConfig;
        bank.lendingPolicy = enhancedConfig.lendingPolicy;
        bank.accessControls = enhancedConfig.accessControls;
        bank.branding = enhancedConfig.branding;
        
        await bank.save();
        updatedCount++;
        console.log(`Updated partner bank: ${bank.name} (${bank.code}) with enhanced configuration`);
      }
    }

    console.log(`\nUpdated ${updatedCount} partner banks with enhanced configuration`);
    
    // Show final status
    const finalBanks = await PartnerBank.find({});
    console.log('\nAll partner banks with enhanced configuration:');
    finalBanks.forEach(bank => {
      console.log(`- ${bank.name} (${bank.code})`);
      console.log(`  Engine1: ${Object.keys(bank.engineConfig?.engine1?.scoringWeights || {}).length} scoring weights`);
      console.log(`  Engine2: ${Object.keys(bank.engineConfig?.engine2?.weights || {}).length} 5Cs weights`);
      console.log(`  Lending Policy: ${Object.keys(bank.lendingPolicy?.baseLoanAmounts || {}).length} loan amounts`);
      console.log(`  Access Controls: ${bank.accessControls?.visibleTabs?.length || 0} visible tabs`);
      console.log(`  Branding: ${bank.branding?.primaryColor || 'default'} color`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
};

// Run the function
updatePartnerBanksEnhanced(); 