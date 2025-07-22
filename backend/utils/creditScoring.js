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
    PAYMENT_HISTORY: 35,     // Aligned with FICO
    UTILIZATION: 30,         // Aligned with FICO
    CREDIT_AGE: 15,
    CREDIT_MIX: 10,
    INQUIRIES: 5,
    DTI: 10                 // Adjusted for balance
  },
  DTI_THRESHOLDS: {
    IDEAL: 0.35,
    WARNING: 0.50,
    DANGER: 0.70
  },
  PENALTIES: {
    APPLICATION: { base: 1.5, recent: 2.0, older: 1.0, recentThreshold: 6 }, // months
    DEFAULT_HISTORY: { base: 3, recent: 4, older: 2, recentThreshold: 12 },
    MISSED_STREAK: { base: 2, recent: 3, older: 1, recentThreshold: 6 },
    MISSED_12: [0, 3, 1],
    DELINQUENCY: [6, 12, 2],
    INACTIVITY: { threshold: 180, value: 2, max: 365, maxValue: 5 },
    LOAN_COUNT: 5,
    HIGH_DTI: [0.5, 0.7, 5]
  },
  BONUSES: {
    ACTIVITY: { threshold: 10, value: 3 },
    ACCOUNT_AGE: [
      { months: 24, value: 1 },
      { months: 36, value: 2 }
    ],
    PAYMENT_RATE: [
      { threshold: 0.95, value: 5 },
      { threshold: 0.85, value: 2 }
    ],
    RECENT_ON_TIME: [
      { threshold: 0.95, value: 2 },
      { threshold: 0.85, value: 1 }
    ],
    LOW_DTI: { threshold: 0.3, value: 3 }
  },
  LOAN_TYPES: {
    CONSUMER: { PAYMENT_HISTORY: 35, UTILIZATION: 30, DTI: 10 },
    MORTGAGE: { PAYMENT_HISTORY: 30, UTILIZATION: 25, DTI: 20 },
    AUTO: { PAYMENT_HISTORY: 35, UTILIZATION: 25, DTI: 15 }
  },
  // --- Added for lending decision logic ---
  decisionMatrix: {
    approveScore: 700,
    conditionalApprove: {
      score: 650,
      maxDti: 0.4
    },
    reviewScore: 600
  },
  riskTiers: [
    { minScore: 800, tier: 'Low Risk', label: 'Prime', defaultRisk: 'Very Low', baseRate: 7.99 },
    { minScore: 740, tier: 'Low Risk', label: 'Prime', defaultRisk: 'Low', baseRate: 9.99 },
    { minScore: 670, tier: 'Moderate Risk', label: 'Near Prime', defaultRisk: 'Moderate', baseRate: 12.49 },
    { minScore: 580, tier: 'High Risk', label: 'Subprime', defaultRisk: 'High', baseRate: 18.99 },
    { minScore: 300, tier: 'Very High Risk', label: 'Deep Subprime', defaultRisk: 'Very High', baseRate: 29.99 }
  ],
  collateral: {
    minValue: 5000,
    qualityThreshold: 0.7,
    requiredForHighRisk: true
  },
  recessionAdjustments: {
    rateIncrease: 2.5,
    maxAmountReduction: 0.8,
    maxTerm: 36
  },
  maxInterestRate: 35.99,
  baseAmounts: {
    'Excellent': 100000,
    'Very Good': 75000,
    'Good': 50000,
    'Fair': 25000,
    'Poor': 10000
  }
};

// Cached config for performance
const CACHED_CONFIG = { ...SCORE_CONFIG };

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
  creditMix: (mix) => {
    return mix >= 0.7 ? 'Excellent' : 
           mix >= 0.5 ? 'Good' : 
           mix >= 0.3 ? 'Fair' : 'Poor';
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
  },
  dti: (ratio) => {
    if (ratio < 0.2) return 'Excellent';
    if (ratio < 0.35) return 'Good';
    if (ratio < 0.5) return 'Fair';
    return 'Poor';
  }
};

// Custom error class
class CreditScoreError extends Error {
  constructor(message) {
    super(`[CreditScore] ${message}`);
    this.name = 'CreditScoreError';
  }
}

// Helper functions
const hashPhone = (phone) => {
  const salt = process.env.PHONE_SALT || 'default-salt-value';
  return crypto.createHash('md5') // Lighter hashing for performance
    .update(salt + phone)
    .digest('hex');
};

// Helper to clamp values between 0 and 100
const cap100 = v => Math.max(0, Math.min(100, v));

const validateInput = (key, value, min, max) => {
  if (typeof value !== 'number' || value < min || value > max) {
    throw new CreditScoreError(
      `Invalid ${key}: ${value}. Must be number between ${min}-${max}`
    );
  }
};

const validateDate = (dateStr, currentDate) => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new CreditScoreError(`Invalid date: ${dateStr}`);
  }
  return date;
};

// Non-linear normalization
const normalizeUtilization = (util) => {
  return Math.max(0, 1 - Math.log10(1 + 9 * util)); // Logarithmic decay
};

const normalizeInquiries = (inq) => {
  return Math.max(0, 1 - Math.log10(1 + 2 * inq)); // Logarithmic decay
};

// Calculate DTI score with fallback
const calculateDtiScore = (dti, config, userData) => {
  let dtiRatio = dti;
  if (userData.monthlyIncome <= 0 && userData.assets) {
    dtiRatio = userData.monthlyDebtPayments / (userData.assets / 12); // Assets-based fallback
  }
  
  // Non-linear DTI scoring
  let dtiScore;
  if (dtiRatio <= config.DTI_THRESHOLDS.IDEAL) {
    dtiScore = 1.0;
  } else if (dtiRatio <= config.DTI_THRESHOLDS.WARNING) {
    dtiScore = 1 - Math.pow((dtiRatio - config.DTI_THRESHOLDS.IDEAL) / 
                   (config.DTI_THRESHOLDS.WARNING - config.DTI_THRESHOLDS.IDEAL), 2) * 0.3;
  } else if (dtiRatio <= config.DTI_THRESHOLDS.DANGER) {
    dtiScore = 0.7 - Math.pow((dtiRatio - config.DTI_THRESHOLDS.WARNING) / 
                     (config.DTI_THRESHOLDS.DANGER - config.DTI_THRESHOLDS.WARNING), 2) * 0.4;
  } else {
    dtiScore = 0.3 * Math.exp(-dtiRatio); // Exponential decay for high DTI
  }
  
  return Math.max(0.1, dtiScore);
};

// Enhanced credit mix calculation
const calculateCreditMix = (loanTypeCounts, existingMix) => {
  const types = [
    loanTypeCounts.creditCard || 0,
    loanTypeCounts.carLoan || 0,
    loanTypeCounts.personalLoan || 0,
    loanTypeCounts.mortgage || 0,
    loanTypeCounts.studentLoan || 0
  ].filter(count => count > 0);
  
  const diversityScore = Math.min(1, types.length / 5); // Max 5 types
  const balanceScore = types.length > 1 ? 1 - Math.max(...types) / (types.reduce((sum, v) => sum + v, 0) || 1) : 0;
  return Math.min(1, (existingMix + 0.5 * diversityScore + 0.3 * balanceScore) / 10);
};

// Time-weighted penalties
const calculatePenalties = (userData, config, currentDate, lastActiveDate) => {
  const {
    recentLoanApplications = 0,
    applicationDates = [], // Array of application dates
    defaultCountLast3Years = 0,
    defaultDates = [], // Array of default dates
    consecutiveMissedPayments = 0,
    missedPaymentDates = [], // Array of missed payment dates
    missedPaymentsLast12 = 0,
    monthsSinceLastDelinquency = 999,
    activeLoanCount = 0,
    monthlyIncome = 1,
    monthlyDebtPayments = 0
  } = userData;

  // Time-weighted application penalty
  const applicationPenalty = applicationDates.reduce((sum, date) => {
    const months = (currentDate - new Date(date)) / (1000 * 60 * 60 * 24 * 30);
    return sum + (months <= config.PENALTIES.APPLICATION.recentThreshold ? 
      config.PENALTIES.APPLICATION.recent : config.PENALTIES.APPLICATION.older);
  }, 0) || -recentLoanApplications * config.PENALTIES.APPLICATION.base;
  
  // Time-weighted default history penalty
  const defaultHistoryPenalty = defaultDates.reduce((sum, date) => {
    const months = (currentDate - new Date(date)) / (1000 * 60 * 60 * 24 * 30);
    return sum + (months <= config.PENALTIES.DEFAULT_HISTORY.recentThreshold ? 
      config.PENALTIES.DEFAULT_HISTORY.recent : config.PENALTIES.DEFAULT_HISTORY.older);
  }, 0) || -defaultCountLast3Years * config.PENALTIES.DEFAULT_HISTORY.base;
  
  // Time-weighted missed payments penalty
  const missedStreakPenalty = missedPaymentDates.reduce((sum, date) => {
    const months = (currentDate - new Date(date)) / (1000 * 60 * 60 * 24 * 30);
    return sum + (months <= config.PENALTIES.MISSED_STREAK.recentThreshold ? 
      config.PENALTIES.MISSED_STREAK.recent : config.PENALTIES.MISSED_STREAK.older);
  }, 0) || -consecutiveMissedPayments * config.PENALTIES.MISSED_STREAK.base;
  
  const missedPenalty = 
    missedPaymentsLast12 >= config.PENALTIES.MISSED_12[1] 
      ? -config.PENALTIES.MISSED_12[2] 
      : missedPaymentsLast12 >= config.PENALTIES.MISSED_12[0] 
        ? -config.PENALTIES.MISSED_12[2] / 2 
        : 0;
  
  // Delinquency penalty
  const delinquencyPenalty =
    monthsSinceLastDelinquency <= config.PENALTIES.DELINQUENCY[0] ? -config.PENALTIES.DELINQUENCY[2] :
    monthsSinceLastDelinquency <= config.PENALTIES.DELINQUENCY[1] ? -config.PENALTIES.DELINQUENCY[2] / 2 : 0;
  
  // Inactivity penalty (sliding scale)
  const inactivityDays = (currentDate - lastActiveDate) / 86400000;
  const inactivityPenalty = 
    inactivityDays > config.PENALTIES.INACTIVITY.max ? -config.PENALTIES.INACTIVITY.maxValue : 
    inactivityDays > config.PENALTIES.INACTIVITY.threshold ? 
      -config.PENALTIES.INACTIVITY.value * (inactivityDays / config.PENALTIES.INACTIVITY.max) : 0;
  
  // Loan count penalty
  const loanCountPenalty = activeLoanCount > config.PENALTIES.LOAN_COUNT ? -2 : 0;
  
  // DTI penalty
  const dtiRatio = monthlyDebtPayments / monthlyIncome;
  const dtiPenalty = 
    dtiRatio >= config.PENALTIES.HIGH_DTI[1] 
      ? -config.PENALTIES.HIGH_DTI[2] 
      : dtiRatio >= config.PENALTIES.HIGH_DTI[0] 
        ? -config.PENALTIES.HIGH_DTI[2] / 2 
        : 0;

  return {
    applicationPenalty,
    defaultHistoryPenalty,
    missedStreakPenalty,
    missedPenalty,
    delinquencyPenalty,
    inactivityPenalty,
    loanCountPenalty,
    dtiPenalty,
    total: [
      applicationPenalty,
      defaultHistoryPenalty,
      missedPenalty,
      delinquencyPenalty,
      inactivityPenalty,
      loanCountPenalty,
      dtiPenalty
    ].reduce((sum, val) => sum + val, 0)
  };
};

// Calculate bonuses
const calculateBonuses = (userData, config) => {
  const {
    transactionsLast90Days = 0,
    oldestAccountAge = 0,
    onTimePaymentRate = 1,
    onTimeRateLast6Months = 1,
    monthlyIncome = 1,
    monthlyDebtPayments = 0
  } = userData;

  const activityBonus = transactionsLast90Days > config.BONUSES.ACTIVITY.threshold 
    ? config.BONUSES.ACTIVITY.value : 0;
  
  let accountAgeBonus = 0;
  config.BONUSES.ACCOUNT_AGE.forEach(tier => {
    if (oldestAccountAge >= tier.months) {
      accountAgeBonus = Math.max(accountAgeBonus, tier.value);
    }
  });
  
  const paymentRateBonus = config.BONUSES.PAYMENT_RATE.find(b => 
    onTimePaymentRate >= b.threshold)?.value || 0;
  
  const recentOnTimeBonus = config.BONUSES.RECENT_ON_TIME.find(b => 
    onTimeRateLast6Months >= b.threshold)?.value || 0;
  
  const dtiRatio = monthlyDebtPayments / monthlyIncome;
  const lowDtiBonus = dtiRatio <= config.BONUSES.LOW_DTI.threshold 
    ? config.BONUSES.LOW_DTI.value : 0;

  return {
    activityBonus,
    accountAgeBonus,
    paymentRateBonus,
    recentOnTimeBonus,
    lowDtiBonus,
    total: [
      activityBonus,
      accountAgeBonus,
      paymentRateBonus,
      recentOnTimeBonus,
      lowDtiBonus
    ].reduce((sum, val) => sum + val, 0)
  };
};

// Plugin system for extensibility
const plugins = [];
export const registerPlugin = (plugin) => {
  if (typeof plugin === 'function') {
    plugins.push(plugin);
  }
};

// AI integration placeholder
const applyAIModel = (userData, score, options) => {
  if (!options.aiEnabled) return { adjustment: 0, explanation: [] };
  // Placeholder for AI model (e.g., ML-based anomaly detection)
  const explanation = ['AI adjustment applied based on behavioral patterns'];
  return { adjustment: 0, explanation }; // To be implemented
};

// Main scoring function
export function calculateCreditScore(userData, options = {}) {
  if (!userData) throw new CreditScoreError('User data is required for credit scoring');

  try {
    // Configuration setup
    const config = { ...CACHED_CONFIG, ...options.scoringConfig };
    const currentDate = options.currentDate ? new Date(options.currentDate) : new Date();

    // Dynamic weights based on loan type
    const loanType = options.loanType || 'CONSUMER';
    const weights = { ...config.WEIGHTS, ...(config.LOAN_TYPES[loanType] || {}) };
    if (options.recessionMode) {
      weights.PAYMENT_HISTORY = weights.PAYMENT_HISTORY + 5;
      weights.UTILIZATION = weights.UTILIZATION + 5;
      weights.DTI = weights.DTI - 5;
    }

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
      applicationDates = [], // Ensure default to empty array
      defaultCountLast3Years = 0,
      defaultDates = [],
      consecutiveMissedPayments = 0,
      missedPaymentDates = [],
      loanTypeCounts = {},
      missedPaymentsLast12 = 0,
      onTimeRateLast6Months = 1,
      monthsSinceLastDelinquency = 999,
      monthlyIncome = 1,
      monthlyDebtPayments = 0,
      assets = 0 // For DTI fallback
    } = userData;

    // Validate dates
    const lastActiveDateObj = validateDate(lastActiveDate, currentDate);

    if (options.debug) {
      console.debug('[Credit Score][Input]', {
        paymentHistory,
        creditUtilization,
        creditAge,
        creditMix,
        inquiries,
        lastActiveDate: lastActiveDateObj,
        activeLoanCount,
        oldestAccountAge,
        transactionsLast90Days,
        onTimePaymentRate,
        recentLoanApplications,
        defaultCountLast3Years,
        consecutiveMissedPayments,
        defaultDates,
        missedPaymentDates,
        loanTypeCounts,
        missedPaymentsLast12,
        onTimeRateLast6Months,
        monthsSinceLastDelinquency,
        monthlyIncome,
        monthlyDebtPayments,
        assets
      });
    }

    // Input validation
    validateInput('paymentHistory', paymentHistory, 0, 1);
    validateInput('creditUtilization', creditUtilization, 0, 5);
    validateInput('creditAge', creditAge, 0, 1);
    validateInput('onTimePaymentRate', onTimePaymentRate, 0, 1);
    validateInput('inquiries', inquiries, 0, 50);
    validateInput('activeLoanCount', activeLoanCount, 0, 100);
    
    if (monthlyIncome <= 0 && assets <= 0) {
      throw new CreditScoreError('Monthly income or assets must be greater than 0');
    }

    // --- Step 1: Normalization ---
    const utilizationScore = normalizeUtilization(creditUtilization);
    const inquiryScore = normalizeInquiries(inquiries);
    const dtiRatio = monthlyDebtPayments / monthlyIncome;
    const dtiScore = calculateDtiScore(dtiRatio, config, { monthlyIncome, monthlyDebtPayments, assets });
    
    const mixFactor = calculateCreditMix(loanTypeCounts, creditMix);
    
    if (options.debug) {
      console.debug('[Credit Score][Normalization]', {
        utilizationScore,
        inquiryScore,
        dtiRatio,
        dtiScore,
        mixFactor
      });
    }

    // --- Step 2: Penalties ---
    const penalties = calculatePenalties(
      {
        recentLoanApplications,
        applicationDates,
        defaultCountLast3Years,
        defaultDates,
        consecutiveMissedPayments,
        missedPaymentDates,
        missedPaymentsLast12,
        monthsSinceLastDelinquency,
        activeLoanCount,
        monthlyIncome,
        monthlyDebtPayments
      },
      config,
      currentDate,
      lastActiveDateObj
    );

    // --- Step 3: Bonuses ---
    const bonuses = calculateBonuses(
      {
        transactionsLast90Days,
        oldestAccountAge,
        onTimePaymentRate,
        onTimeRateLast6Months,
        monthlyIncome,
        monthlyDebtPayments
      },
      config
    );

    // --- Step 4: Plugin Contributions ---
    const pluginContributions = plugins.reduce((acc, plugin) => {
      const result = plugin(userData, config, currentDate);
      return {
        score: acc.score + (result.score || 0),
        explanations: [...acc.explanations, ...(result.explanations || [])]
      };
    }, { score: 0, explanations: [] });

    // --- Step 5: AI Adjustment ---
    const aiAdjustment = applyAIModel(userData, { penalties, bonuses }, options);

    if (options.debug) {
      console.debug('[Credit Score][Penalties]', penalties);
      console.debug('[Credit Score][Bonuses]', bonuses);
      console.debug('[Credit Score][Plugins]', pluginContributions);
      console.debug('[Credit Score][AI]', aiAdjustment);
    }

    // --- Step 6: Weighted Score Calculation ---
    // Helper to ensure all values are numbers
    const safe = v => (typeof v === 'number' && !isNaN(v) ? v : 0);
    const weightedScore = (
      safe(paymentHistory) * weights.PAYMENT_HISTORY +
      safe(utilizationScore) * weights.UTILIZATION +
      safe(creditAge) * weights.CREDIT_AGE +
      safe(mixFactor) * weights.CREDIT_MIX +
      safe(inquiryScore) * weights.INQUIRIES +
      safe(dtiScore) * weights.DTI
    );
    
    if (options.debug) {
      console.debug('[Credit Score][Weighted Score]', { weightedScore, weights });
    }

    // Final score calculation
    const rawScore = weightedScore +
      penalties.total +
      bonuses.total +
      pluginContributions.score +
      aiAdjustment.adjustment;
      
    const scaledScore = Math.round(config.BASE_RANGE.MIN + 
      ((rawScore / 100) * (config.BASE_RANGE.MAX - config.BASE_RANGE.MIN)));
      
    const finalScore = Math.max(
      config.BASE_RANGE.MIN, 
      Math.min(scaledScore, config.BASE_RANGE.MAX)
    );
    
    if (options.debug) {
      console.debug('[Credit Score][Final Score]', { rawScore, scaledScore, finalScore });
    }

    // --- Step 7: Classification ---
    let classification = 'Poor';
    if (finalScore >= config.CLASSIFICATIONS.EXCELLENT) classification = 'Excellent';
    else if (finalScore >= config.CLASSIFICATIONS.VERY_GOOD) classification = 'Very Good';
    else if (finalScore >= config.CLASSIFICATIONS.GOOD) classification = 'Good';
    else if (finalScore >= config.CLASSIFICATIONS.FAIR) classification = 'Fair';

    // --- Step 8: Compliance & Security ---
    const requiredDisclosures = [];
    if (finalScore < 650) requiredDisclosures.push('LOW_SCORE_NOTICE');
    if (defaultCountLast3Years > 0) requiredDisclosures.push('DEROGATORY_MARK_WARNING');
    if (dtiRatio > config.DTI_THRESHOLDS.DANGER) requiredDisclosures.push('HIGH_DTI_WARNING');
    requiredDisclosures.push(...aiAdjustment.explanation, ...pluginContributions.explanations);

    // --- Step 9: Result Construction ---
    const result = {
      score: finalScore,
      classification,
      requiredDisclosures,
      baseScore: +weightedScore.toFixed(2),
      breakdown: {
        paymentHistory: cap100(paymentHistory * weights.PAYMENT_HISTORY),
        creditUtilization: cap100(utilizationScore * weights.UTILIZATION),
        creditAge: cap100(creditAge * weights.CREDIT_AGE),
        creditMix: cap100(mixFactor * weights.CREDIT_MIX),
        inquiries: cap100(inquiryScore * weights.INQUIRIES),
        dti: cap100(dtiScore * weights.DTI),
        penalties: {
          inactivity: penalties.inactivityPenalty,
          loanCount: penalties.loanCountPenalty,
          applications: penalties.applicationPenalty,
          defaults: penalties.defaultHistoryPenalty,
          missedPayments: penalties.missedPenalty,
          delinquency: penalties.delinquencyPenalty,
          highDti: penalties.dtiPenalty,
          total: penalties.total
        },
        bonuses: {
          activity: bonuses.activityBonus,
          accountAge: bonuses.accountAgeBonus,
          paymentRate: bonuses.paymentRateBonus,
          recentOnTime: bonuses.recentOnTimeBonus,
          lowDti: bonuses.lowDtiBonus,
          total: bonuses.total
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
            value: +(creditAge * 100).toFixed(1),
            label: CLASSIFIERS.creditAge(creditAge)
          },
          creditMix: {
            value: +(mixFactor * 100).toFixed(1),
            label: CLASSIFIERS.creditMix(mixFactor)
          },
          totalAccounts: {
            value: activeLoanCount,
            label: CLASSIFIERS.accountCount(activeLoanCount)
          },
          inquiries: {
            value: inquiries,
            label: CLASSIFIERS.inquiries(inquiries)
          },
          dti: {
            value: +(dtiRatio * 100).toFixed(1),
            label: CLASSIFIERS.dti(dtiRatio)
          }
        },
        pluginContributions: pluginContributions.explanations,
        aiAdjustments: aiAdjustment.explanation
      },
      version: 'v2.3',
      aiEnabled: !!options.aiEnabled,
      recessionMode: !!options.recessionMode,
      dti: +dtiRatio.toFixed(4)
    };

    // PII Protection
    if (options.hashPII) {
      result.phoneHash = hashPhone(phoneNumber);
    } else if (phoneNumber) {
      result.phoneNumber = phoneNumber;
    }

    return result;

  } catch (err) {
    if (err instanceof CreditScoreError) {
      console.error(err.message);
      throw err;
    }
    console.error('[Credit Scoring] Unexpected Error:', err.message);
    throw new CreditScoreError(`Scoring failed: ${err.message}`);
  }
}