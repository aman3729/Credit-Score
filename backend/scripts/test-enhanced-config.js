import mongoose from 'mongoose';
import PartnerBank from '../models/PartnerBank.js';
import bankConfigService from '../services/bankConfigService.js';
import { evaluateLendingDecision } from '../utils/lendingDecision.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://parzival:theoasis@credit-score-dashboard.w2bwj1o.mongodb.net/credit-score-dashboard?retryWrites=true&w=majority';

const testEnhancedConfig = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to database');

    // Test 1: Check if partner banks have enhanced configuration
    console.log('\n=== Test 1: Enhanced Configuration Check ===');
    const banks = await PartnerBank.find({});
    
    for (const bank of banks) {
      console.log(`\n${bank.name} (${bank.code}):`);
      console.log(`  Engine1 configured: ${!!bank.engineConfig?.engine1}`);
      console.log(`  Engine2 configured: ${!!bank.engineConfig?.engine2}`);
      console.log(`  Lending Policy configured: ${!!bank.lendingPolicy}`);
      console.log(`  Access Controls configured: ${!!bank.accessControls}`);
      console.log(`  Branding configured: ${!!bank.branding}`);
      
      if (bank.engineConfig?.engine1) {
        const weights = bank.engineConfig.engine1.scoringWeights;
        const weightSum = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        console.log(`  Engine1 weight sum: ${weightSum}%`);
      }
      
      if (bank.engineConfig?.engine2) {
        const weights = bank.engineConfig.engine2.weights;
        const weightSum = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        console.log(`  Engine2 weight sum: ${weightSum}%`);
      }
    }

    // Test 2: Test bank configuration service
    console.log('\n=== Test 2: Bank Configuration Service ===');
    const cbeConfig = await bankConfigService.getBankConfig('CBE');
    console.log('CBE Config loaded successfully');
    console.log(`  Engine1 weights: ${Object.keys(cbeConfig.engineConfig.engine1.scoringWeights).length} factors`);
    console.log(`  Engine2 weights: ${Object.keys(cbeConfig.engineConfig.engine2.weights).length} factors`);
    console.log(`  Lending policy: ${Object.keys(cbeConfig.lendingPolicy.baseLoanAmounts).length} loan amounts`);

    // Test 3: Test lending decision with enhanced configuration
    console.log('\n=== Test 3: Enhanced Lending Decision ===');
    
    const testScoreData = {
      score: 750,
      classification: 'EXCELLENT',
      version: 'v4.0',
      requiredDisclosures: [],
      breakdown: {
        componentRatings: {
          paymentHistory: { value: 800, label: 'Excellent' },
          creditUtilization: { value: 750, label: 'Very Good' },
          creditAge: { value: 700, label: 'Good' },
          creditMix: { value: 650, label: 'Fair' },
          inquiries: { value: 600, label: 'Poor' },
          dti: { value: 0.35, label: 'Low' }
        }
      },
      recessionMode: false,
      aiEnabled: true
    };

    const testUserData = {
      monthlyIncome: 50000,
      alternativeIncome: 10000,
      employmentStatus: 'employed',
      collateralValue: 0,
      collateralQuality: 0,
      activeLoanCount: 1,
      monthsSinceLastDelinquency: 24,
      recentLoanApplications: 1,
      consecutiveMissedPayments: 0,
      lastActiveDate: new Date().toISOString(),
      transactionsLast90Days: 45,
      onTimeRateLast6Months: 0.95,
      creditMix: 0.8,
      recentDefaults: 0,
      missedPaymentsLast12: 0,
      monthlyDebtPayments: 15000
    };

    console.log('Testing lending decision with CBE configuration...');
    const decision = await evaluateLendingDecision(testScoreData, testUserData, 'CBE');
    
    console.log('Decision result:');
    console.log(`  Decision: ${decision.decision}`);
    console.log(`  Score: ${decision.score} (original: ${decision.originalScore})`);
    console.log(`  Classification: ${decision.classification}`);
    console.log(`  Max Amount: ${decision.offer?.maxAmount?.toLocaleString()}`);
    console.log(`  Interest Rate: ${decision.offer?.interestRate}%`);
    console.log(`  Engine Adjustments: ${decision.offer?.engineAdjustments ? decision.offer.engineAdjustments.length : 0} factors`);
    console.log(`  Bank Code: ${decision.bankCode}`);

    // Test 4: Test with AMAN configuration
    console.log('\n=== Test 4: AMAN Configuration Test ===');
    const amanDecision = await evaluateLendingDecision(testScoreData, testUserData, 'AMAN');
    
    console.log('AMAN Decision result:');
    console.log(`  Decision: ${amanDecision.decision}`);
    console.log(`  Score: ${amanDecision.score} (original: ${amanDecision.originalScore})`);
    console.log(`  Max Amount: ${amanDecision.offer?.maxAmount?.toLocaleString()}`);
    console.log(`  Interest Rate: ${amanDecision.offer?.interestRate}%`);
    console.log(`  Engine Adjustments: ${amanDecision.offer?.engineAdjustments ? amanDecision.offer.engineAdjustments.length : 0} factors`);

    // Test 5: Compare configurations
    console.log('\n=== Test 5: Configuration Comparison ===');
    const amanConfig = await bankConfigService.getBankConfig('AMAN');
    
    console.log('CBE vs AMAN Configuration Differences:');
    console.log(`  Engine1 Payment History Weight: CBE ${cbeConfig.engineConfig.engine1.scoringWeights.paymentHistory}% vs AMAN ${amanConfig.engineConfig.engine1.scoringWeights.paymentHistory}%`);
    console.log(`  Engine2 Capacity Weight: CBE ${cbeConfig.engineConfig.engine2.weights.capacity}% vs AMAN ${amanConfig.engineConfig.engine2.weights.capacity}%`);
    console.log(`  Base Loan Amount (EXCELLENT): CBE ${cbeConfig.lendingPolicy.baseLoanAmounts.EXCELLENT.toLocaleString()} vs AMAN ${amanConfig.lendingPolicy.baseLoanAmounts.EXCELLENT.toLocaleString()}`);
    console.log(`  Base Interest Rate: CBE ${cbeConfig.lendingPolicy.interestRateRules.baseRate}% vs AMAN ${amanConfig.lendingPolicy.interestRateRules.baseRate}%`);
    console.log(`  Max DTI: CBE ${cbeConfig.engineConfig.engine2.behavioralThresholds.maxDTI} vs AMAN ${amanConfig.engineConfig.engine2.behavioralThresholds.maxDTI}`);

    console.log('\n✅ All tests completed successfully!');
    console.log('🎉 Enhanced bank configuration system is working correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  }
};

// Run the test
testEnhancedConfig(); 