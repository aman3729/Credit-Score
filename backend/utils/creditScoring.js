import crypto from 'crypto';

// Configuration - Easily adjustable parameters
export const SCORE_CONFIG = {
  BASE_RANGE: { MIN: 300, MAX: 850 },
  CLASSIFICATIONS: {
    EXCELLENT: 800,
    VERY_GOOD: 740,
    GOOD: 670,
    FAIR: 580
  },
  WEIGHTS: {
    PAYMENT_HISTORY: 35,
    UTILIZATION: 30,
    CREDIT_AGE: 15,
    CREDIT_MIX: 10,
    INQUIRIES: 10
  },
  PENALTIES: {
    APPLICATION: 1.5,
    DEFAULT_HISTORY: 3,
    MISSED_STREAK: 2,
    MISSED_12: [0, 3, 1], // Thresholds: [warning, severe, penalty value]
    DELINQUENCY: [6, 12, 2], // Months thresholds: [recent, moderate, penalty value]
    INACTIVITY: 180, // Days
    LOAN_COUNT: 5
  },
  BONUSES: {
    ACTIVITY: { threshold: 30, value: 3 },
    ACCOUNT_AGE: { threshold: 36, value: 2 },
    PAYMENT_RATE: [
      { threshold: 0.95, value: 5 },
      { threshold: 0.85, value: 2 }
    ],
    RECENT_ON_TIME: [
      { threshold: 0.95, value: 2 },
      { threshold: 0.85, value: 1 }
    ]
  }
};

// Centralized classification functions
const CLASSIFIERS = {
  paymentHistory: (rate) => {
    if (rate >= 0.98) return 'Excellent';
    if (rate >= 0.95) return 'Good';
    if (rate >= 0.85) return 'Fair';
    return 'Poor';
  },
  utilization: (util) => {
    if (util < 0.1) return 'Excellent';
    if (util < 0.3) return 'Good';
    if (util < 0.5) return 'Fair';
    return 'Poor';
  },
  creditAge: (age) => {
    if (age >= 0.9) return 'Excellent';
    if (age >= 0.6) return 'Good';
    if (age >= 0.3) return 'Fair';
    return 'Poor';
  },
  accountCount: (count) => {
    if (count >= 5) return 'Excellent';
    if (count >= 3) return 'Good';
    if (count >= 1) return 'Fair';
    return 'Poor';
  },
  inquiries: (inq) => {
    if (inq === 0) return 'Excellent';
    if (inq <= 2) return 'Good';
    if (inq <= 4) return 'Fair';
    return 'Poor';
  }
};

// Helper functions
const hashPhone = (phone) => 
  crypto.createHash('sha256').update(phone).digest('hex');

const cap100 = v => Math.max(0, Math.min(100, v));

const validateInput = (key, value, min, max) => {
  if (value < min || value > max) {
    throw new Error(`Invalid ${key}: ${value}. Must be between ${min}-${max}`);
  }
};

// Main scoring function
export function calculateCreditScore(userData, options = {}) {
  if (!userData) throw new Error('User data is required for credit scoring');

  try {
    // Configuration setup
    const config = { ...SCORE_CONFIG, ...options.scoringConfig };
    const currentDate = options.currentDate ? new Date(options.currentDate) : new Date();

    // Input destructuring with defaults
    const {
      phoneNumber,
      paymentHistory = 0,
      creditUtilization = 1,
      creditAge = 0,
      creditMix = 0,
      inquiries = 1,
      lastActiveDate = currentDate,
      activeLoanCount = 0,
      oldestAccountAge = 0,
      transactionsLast90Days = 0,
      onTimePaymentRate = 1,
      recentLoanApplications = 0,
      defaultCountLast3Years = 0,
      consecutiveMissedPayments = 0,
      loanTypeCounts = {},
      missedPaymentsLast12 = 0,
      onTimeRateLast6Months = 1,
      monthsSinceLastDelinquency = 999
    } = userData;

    // Input validation
    validateInput('paymentHistory', paymentHistory, 0, 1);
    validateInput('creditUtilization', creditUtilization, 0, 5);
    validateInput('creditAge', creditAge, 0, 1);
    validateInput('onTimePaymentRate', onTimePaymentRate, 0, 1);

    // --- Step 1: Normalization ---
    const utilizationScore = Math.max(0, 1 - creditUtilization);
    const inquiryScore = Math.max(0, 1 - inquiries * 0.1);
    
    // Credit mix calculation
    const revolving = loanTypeCounts.creditCard || 0;
    const installment = (loanTypeCounts.carLoan || 0) + (loanTypeCounts.personalLoan || 0);
    const hasMixedCredit = revolving > 0 && installment > 0;
    const mixBonus = hasMixedCredit ? 1 : 0;
    const mixFactor = Math.min(10, (creditMix + mixBonus) * 10);

    // --- Step 2: Penalties ---
    const applicationPenalty = Math.min(0, -recentLoanApplications * config.PENALTIES.APPLICATION);
    const defaultHistoryPenalty = Math.min(0, -defaultCountLast3Years * config.PENALTIES.DEFAULT_HISTORY);
    const missedStreakPenalty = Math.min(0, -consecutiveMissedPayments * config.PENALTIES.MISSED_STREAK);
    
    // Combined missed payment penalty (avoid double-counting)
    const missedPenalty = Math.min(
      missedStreakPenalty,
      missedPaymentsLast12 >= config.PENALTIES.MISSED_12[1] 
        ? -config.PENALTIES.MISSED_12[2] 
        : missedPaymentsLast12 >= config.PENALTIES.MISSED_12[0] 
          ? -config.PENALTIES.MISSED_12[2]/2 
          : 0
    );

    // Delinquency penalty
    const delinquencyPenalty =
      monthsSinceLastDelinquency < config.PENALTIES.DELINQUENCY[0] ? -config.PENALTIES.DELINQUENCY[2] :
      monthsSinceLastDelinquency < config.PENALTIES.DELINQUENCY[1] ? -config.PENALTIES.DELINQUENCY[2]/2 : 0;

    // Activity-based penalties
    const inactivityDays = (currentDate - new Date(lastActiveDate)) / (86400000);
    const inactivityPenalty = inactivityDays > config.PENALTIES.INACTIVITY ? -5 : 0;
    const loanCountPenalty = activeLoanCount > config.PENALTIES.LOAN_COUNT ? -2 : 0;

    // --- Step 3: Bonuses ---
    const activityBonus = transactionsLast90Days > config.BONUSES.ACTIVITY.threshold 
      ? config.BONUSES.ACTIVITY.value : 0;
    
    const accountAgeBonus = oldestAccountAge > config.BONUSES.ACCOUNT_AGE.threshold 
      ? config.BONUSES.ACCOUNT_AGE.value : 0;
    
    const paymentRateBonus = config.BONUSES.PAYMENT_RATE.find(b => 
      onTimePaymentRate >= b.threshold)?.value || 0;
    
    const recentOnTimeBonus = config.BONUSES.RECENT_ON_TIME.find(b => 
      onTimeRateLast6Months >= b.threshold)?.value || 0;

    // --- Step 4: Weighted Score Calculation ---
    const weights = options.recessionMode 
      ? { ...config.WEIGHTS, PAYMENT_HISTORY: 40, UTILIZATION: 35 }
      : config.WEIGHTS;

    const weightedScore = (
      paymentHistory * weights.PAYMENT_HISTORY +
      utilizationScore * weights.UTILIZATION +
      creditAge * weights.CREDIT_AGE +
      mixFactor +
      inquiryScore * weights.INQUIRIES
    );

    // Final score calculation
    const rawScore = weightedScore +
      inactivityPenalty +
      activityBonus +
      accountAgeBonus +
      loanCountPenalty +
      paymentRateBonus +
      delinquencyPenalty +
      applicationPenalty +
      defaultHistoryPenalty +
      missedPenalty +
      recentOnTimeBonus;

    const scaledScore = Math.round(config.BASE_RANGE.MIN + 
      ((rawScore / 100) * (config.BASE_RANGE.MAX - config.BASE_RANGE.MIN)));
    
    const finalScore = Math.max(
      config.BASE_RANGE.MIN, 
      Math.min(scaledScore, config.BASE_RANGE.MAX)
    );

    // --- Step 5: Classification ---
    let classification = 'Poor';
    if (finalScore >= config.CLASSIFICATIONS.EXCELLENT) classification = 'Excellent';
    else if (finalScore >= config.CLASSIFICATIONS.VERY_GOOD) classification = 'Very Good';
    else if (finalScore >= config.CLASSIFICATIONS.GOOD) classification = 'Good';
    else if (finalScore >= config.CLASSIFICATIONS.FAIR) classification = 'Fair';

    // --- Step 6: Compliance & Security ---
    const requiredDisclosures = [];
    if (finalScore < 650) requiredDisclosures.push('LOW_SCORE_NOTICE');
    if (defaultCountLast3Years > 0) requiredDisclosures.push('DEROGATORY_MARK_WARNING');

    // --- Step 7: Result Construction ---
    const result = {
      score: finalScore,
      classification,
      requiredDisclosures,
      baseScore: +weightedScore.toFixed(2),
      breakdown: {
        paymentHistory: cap100(paymentHistory * weights.PAYMENT_HISTORY),
        creditUtilization: cap100(utilizationScore * weights.UTILIZATION),
        creditAge: cap100(creditAge * weights.CREDIT_AGE),
        creditMix: cap100(mixFactor),
        inquiries: cap100(inquiryScore * weights.INQUIRIES),
        penalties: {
          inactivityPenalty,
          loanCountPenalty,
          applicationPenalty,
          defaultHistoryPenalty,
          missedPenalty,
          delinquencyPenalty
        },
        bonuses: {
          activityBonus,
          accountAgeBonus,
          paymentRateBonus,
          recentOnTimeBonus
        },
        componentRatings: {
          paymentHistory: {
            value: +(paymentHistory * 100).toFixed(1),
            label: CLASSIFIERS.paymentHistory(paymentHistory)
          },
          creditUtilization: {
            value: +(creditUtilization * 100).toFixed(1),
            label: CLASSIFIERS.utilization(creditUtilization)
          },
          creditAge: {
            value: +(creditAge * 100).toFixed(1), // Fixed percentage
            label: CLASSIFIERS.creditAge(creditAge)
          },
          totalAccounts: {
            value: activeLoanCount,
            label: CLASSIFIERS.accountCount(activeLoanCount)
          },
          inquiries: {
            value: inquiries,
            label: CLASSIFIERS.inquiries(inquiries)
          }
        }
      },
      version: 'v2.0',
      aiEnabled: !!options.aiEnabled,
      recessionMode: !!options.recessionMode
    };

    // PII Protection
    if (options.hashPII) {
      result.phoneHash = hashPhone(phoneNumber);
    } else {
      result.phoneNumber = phoneNumber;
    }

    // Debugging
    if (options.debug) {
      console.debug('[Credit Score]', {
        userData, 
        config,
        calculations: {
          utilizationScore,
          inquiryScore,
          mixBonus,
          rawScore,
          scaledScore
        },
        result
      });
    }

    return result;

  } catch (err) {
    console.error('[Credit Scoring] Error:', err.message);
    throw new Error(`Scoring failed: ${err.message}`);
  }
}

// Example usage:
// const score = calculateCreditScore(userData, { 
//   recessionMode: true,
//   hashPII: true,
//   debug: true
// });
