import crypto from 'crypto';

// Configuration - Adjusted for Ethiopian market and lending engine harmony
export const SCORE_CONFIG = {
  BASE_RANGE: { MIN: 300, MAX: 850 },
  CLASSIFICATIONS: {
    EXCELLENT: 800,
    VERY_GOOD: 740,
    GOOD: 670,
    FAIR: 580
  },
  WEIGHTS: {
    PAYMENT_HISTORY: 35, // Aligned with FICO
    UTILIZATION: 30,    // Aligned with FICO
    CREDIT_AGE: 15,
    CREDIT_MIX: 10,
    INQUIRIES: 5,
    DTI: 15            // Increased weight to emphasize DTI
  },
  DTI_THRESHOLDS: {
    IDEAL: 0.20,
    WARNING: 0.40,     // Aligned with lending engine's 40% cap
    DANGER: 0.65       // Aligned with lending engine's rejection threshold
  },
  PENALTIES: {
    APPLICATION: { base: 1.5, recent: 2.0, older: 1.0, recentThreshold: 6 },
    DEFAULT_HISTORY: { base: 3, recent: 4, older: 2, recentThreshold: 12 },
    MISSED_STREAK: { base: 2, recent: 3, older: 1, recentThreshold: 6 },
    MISSED_12: [0, 3, 1],
    DELINQUENCY: [6, 12, 2],
    INACTIVITY: { threshold: 360, value: 2, max: 720, maxValue: 5 }, // Adjusted for 12-month threshold
    LOAN_COUNT: 5,
    HIGH_DTI: [0.40, 0.65, 5] // Aligned with lending engine
  },
  BONUSES: {
    ACTIVITY: { threshold: 5, value: 3 }, // Lowered threshold for recent activity
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
    LOW_DTI: { threshold: 0.30, value: 3 }
  },
  LOAN_TYPES: {
    CONSUMER: { PAYMENT_HISTORY: 35, UTILIZATION: 30, DTI: 15 },
    MORTGAGE: { PAYMENT_HISTORY: 30, UTILIZATION: 25, DTI: 20 },
    AUTO: { PAYMENT_HISTORY: 35, UTILIZATION: 25, DTI: 15 }
  },
  // Harmonized with lending engine
  decisionMatrix: {
    approveScore: 700,
    conditionalApprove: { score: 650, maxDti: 0.40 },
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
    qualityThreshold: 0.6,
    recessionQualityThreshold: 0.7,
    loanToValueRatio: 0.7,
    requiredForHighRisk: true
  },
  recessionAdjustments: {
    rateIncrease: 2.0,
    maxAmountReduction: 0.85,
    collateralDiscount: 0.8,
    maxTerm: 36
  },
  baseAmounts: {
    EXCELLENT: 500000, // Adjusted for Ethiopia
    VERY_GOOD: 300000,
    GOOD: 200000,
    FAIR: 100000,
    POOR: 30000
  },
  incomeMultipliers: {
    EXCELLENT: 8,
    VERY_GOOD: 7,
    GOOD: 6,
    FAIR: 4,
    POOR: 2
  },
  inactivityThresholdMonths: 12 // Aligned with lending engine
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
    if (ratio < 0.20) return 'Excellent';
    if (ratio < 0.40) return 'Good'; // Aligned with lending engine
    if (ratio < 0.65) return 'Fair';
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
  const salt = process.env.PHONE_SALT;
  if (!salt) {
    throw new CreditScoreError('PHONE_SALT environment variable is required for phone hashing');
  }
  return crypto.createHash('sha256')
    .update(salt + phone)
    .digest('hex');
};

const cap100 = v => Math.max(0, Math.min(100, v));

const validateInput = (key, value, min, max) => {
  if (typeof value !== 'number' || isNaN(value) || value < min || value > max) {
    throw new CreditScoreError(
      `Invalid ${key}: ${value}. Must be number between ${min}-${max}`
    );
  }
};

const validateDate = (dateStr) => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new CreditScoreError(`Invalid date: ${dateStr}`);
  }
  return date;
};

const normalizeUtilization = (util) => {
  return Math.max(0, 1 - Math.log10(1 + 9 * util));
};

const normalizeInquiries = (inq) => {
  return Math.max(0, 1 - Math.log10(1 + 2 * inq));
};

const calculateDtiScore = (dti, config, userData) => {
  let dtiRatio = dti;
  if (userData.monthlyIncome <= 0 && userData.assets) {
    dtiRatio = userData.monthlyDebtPayments / (userData.assets / 12);
  }

  let dtiScore;
  if (dtiRatio <= config.DTI_THRESHOLDS.IDEAL) {
    dtiScore = 1.0;
  } else if (dtiRatio <= config.DTI_THRESHOLDS.WARNING) {
    dtiScore = 1 - Math.pow((dtiRatio - config.DTI_THRESHOLDS.IDEAL) /
                   (config.DTI_THRESHOLDS.WARNING - config.DTI_THRESHOLDS.IDEAL), 2) * 0.4;
  } else if (dtiRatio <= config.DTI_THRESHOLDS.DANGER) {
    dtiScore = 0.6 - Math.pow((dtiRatio - config.DTI_THRESHOLDS.WARNING) /
                     (config.DTI_THRESHOLDS.DANGER - config.DTI_THRESHOLDS.WARNING), 2) * 0.5;
  } else {
    dtiScore = 0.1 * Math.exp(-dtiRatio);
  }

  return Math.max(0.1, dtiScore);
};

const calculateCreditMix = (loanTypeCounts, existingMix) => {
  const types = [
    loanTypeCounts.creditCard || 0,
    loanTypeCounts.carLoan || 0,
    loanTypeCounts.personalLoan || 0,
    loanTypeCounts.mortgage || 0,
    loanTypeCounts.studentLoan || 0
  ].filter(count => count > 0);

  const diversityScore = Math.min(1, types.length / 5);
  const totalAccounts = types.reduce((sum, v) => sum + v, 0);
  const balanceScore = totalAccounts > 0 ? 1 - Math.max(...types) / totalAccounts : 0;

  return Math.min(1,
    (existingMix * 0.4) +
    (diversityScore * 0.4) +
    (balanceScore * 0.2)
  );
};

const calculatePenalties = (userData, config, currentDate, lastActiveDate) => {
  const {
    applicationDates = [],
    defaultDates = [],
    missedPaymentDates = [],
    activeLoanCount = 0,
    monthlyIncome = 1,
    monthlyDebtPayments = 0,
    missedPaymentsLast12 = 0,
    monthsSinceLastDelinquency = 999,
    transactionsLast90Days = 0
  } = userData;

  const applicationPenalty = applicationDates.reduce((sum, date) => {
    const months = (currentDate - validateDate(date)) / (1000 * 60 * 60 * 24 * 30);
    return sum + (months <= config.PENALTIES.APPLICATION.recentThreshold ?
      config.PENALTIES.APPLICATION.recent : config.PENALTIES.APPLICATION.older);
  }, 0);

  const defaultHistoryPenalty = defaultDates.reduce((sum, date) => {
    const months = (currentDate - validateDate(date)) / (1000 * 60 * 60 * 24 * 30);
    return sum + (months <= config.PENALTIES.DEFAULT_HISTORY.recentThreshold ?
      config.PENALTIES.DEFAULT_HISTORY.recent : config.PENALTIES.DEFAULT_HISTORY.older);
  }, 0);

  const missedStreakPenalty = missedPaymentDates.reduce((sum, date) => {
    const months = (currentDate - validateDate(date)) / (1000 * 60 * 60 * 24 * 30);
    return sum + (months <= config.PENALTIES.MISSED_STREAK.recentThreshold ?
      config.PENALTIES.MISSED_STREAK.recent : config.PENALTIES.MISSED_STREAK.older);
  }, 0);

  const missedPenalty =
    missedPaymentsLast12 >= config.PENALTIES.MISSED_12[1] ?
      -config.PENALTIES.MISSED_12[2] :
      missedPaymentsLast12 >= config.PENALTIES.MISSED_12[0] ?
        -config.PENALTIES.MISSED_12[2] / 2 : 0;

  const delinquencyPenalty =
    monthsSinceLastDelinquency <= config.PENALTIES.DELINQUENCY[0] ? -config.PENALTIES.DELINQUENCY[2] :
    monthsSinceLastDelinquency <= config.PENALTIES.DELINQUENCY[1] ? -config.PENALTIES.DELINQUENCY[2] / 2 : 0;

  // Inactivity penalty adjusted for recent activity
  const inactivityDays = (currentDate - lastActiveDate) / (1000 * 60 * 60 * 24);
  const inactivityPenalty = (inactivityDays > config.PENALTIES.INACTIVITY.threshold && transactionsLast90Days === 0) ?
    -config.PENALTIES.INACTIVITY.value * Math.min(1, inactivityDays / config.PENALTIES.INACTIVITY.max) : 0;

  const loanCountPenalty = activeLoanCount > config.PENALTIES.LOAN_COUNT ? -2 : 0;

  const dtiRatio = monthlyIncome > 0 ? monthlyDebtPayments / monthlyIncome : 0;
  const dtiPenalty =
    dtiRatio >= config.PENALTIES.HIGH_DTI[1] ?
      -config.PENALTIES.HIGH_DTI[2] :
      dtiRatio >= config.PENALTIES.HIGH_DTI[0] ?
        -config.PENALTIES.HIGH_DTI[2] / 2 : 0;

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
      missedStreakPenalty,
      missedPenalty,
      delinquencyPenalty,
      inactivityPenalty,
      loanCountPenalty,
      dtiPenalty
    ].reduce((sum, val) => sum + val, 0)
  };
};

const calculateBonuses = (userData, config) => {
  const {
    transactionsLast90Days = 0,
    oldestAccountAge = 0,
    onTimePaymentRate = 1,
    onTimeRateLast6Months = 1,
    monthlyIncome = 1,
    monthlyDebtPayments = 0
  } = userData;

  const activityBonus = transactionsLast90Days >= config.BONUSES.ACTIVITY.threshold ?
    config.BONUSES.ACTIVITY.value : 0;

  let accountAgeBonus = 0;
  config.BONUSES.ACCOUNT_AGE.forEach(tier => {
    if (oldestAccountAge >= tier.months) {
      accountAgeBonus = Math.max(accountAgeBonus, tier.value);
    }
  });

  const paymentRateBonus = config.BONUSES.PAYMENT_RATE.reduce((max, b) =>
    onTimePaymentRate >= b.threshold ? Math.max(max, b.value) : max, 0);

  const recentOnTimeBonus = config.BONUSES.RECENT_ON_TIME.reduce((max, b) =>
    onTimeRateLast6Months >= b.threshold ? Math.max(max, b.value) : max, 0);

  const dtiRatio = monthlyIncome > 0 ? monthlyDebtPayments / monthlyIncome : 0;
  const lowDtiBonus = dtiRatio <= config.BONUSES.LOW_DTI.threshold ?
    config.BONUSES.LOW_DTI.value : 0;

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
  } else {
    console.warn('[CreditScore] Plugin must be a function');
  }
};

// AI integration placeholder
const applyAIModel = (userData, score, options) => {
  if (!options.aiEnabled) return { adjustment: 0, explanation: [] };

  const explanation = ['AI adjustment applied based on behavioral patterns'];
  return { adjustment: 0, explanation };
};

// Main scoring function
/**
 * Calculates credit score based on comprehensive financial data
 * @param {Object} userData - User's financial profile
 * @param {Object} [options={}] - Calculation options
 * @returns {Object} - Credit score result with detailed breakdown
 * @throws {CreditScoreError} - For invalid inputs or calculation errors
 */
export function calculateCreditScore(userData, options = {}) {
  if (!userData) throw new CreditScoreError('User data is required for credit scoring');

  try {
    const config = { ...CACHED_CONFIG, ...options.scoringConfig };
    const currentDate = options.currentDate ? validateDate(options.currentDate) : new Date();

    const loanType = options.loanType || 'CONSUMER';
    const weights = { ...config.WEIGHTS, ...(config.LOAN_TYPES[loanType] || {}) };
    const totalWeights = Object.values(weights).reduce((sum, w) => sum + w, 0);

    if (options.recessionMode) {
      weights.PAYMENT_HISTORY += 5;
      weights.UTILIZATION += 5;
      weights.DTI = Math.max(0, weights.DTI - 5);
    }

    const {
      phoneNumber,
      paymentHistory = 0,
      creditUtilization = 0,
      creditAge = 0,
      creditMix = 0,
      inquiries = 0,
      lastActiveDate = currentDate.toISOString(),
      activeLoanCount = 0,
      oldestAccountAge = 0,
      transactionsLast90Days = 0,
      onTimePaymentRate = 1,
      recentLoanApplications = 0,
      applicationDates = [],
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
      assets = 0,
      employmentStatus = 'other',
      collateralValue = 0,
      collateralQuality = 0
    } = userData;

    const lastActiveDateObj = validateDate(lastActiveDate);

    // Validate employment status
    const validEmploymentStatuses = ['employed', 'self-employed', 'unemployed', 'retired', 'student', 'other'];
    if (!validEmploymentStatuses.includes(employmentStatus)) {
      console.warn(`[CreditScore] Invalid employment status: ${employmentStatus}, defaulting to 'other'`);
      userData.employmentStatus = 'other';
    }

    // Validate inputs
    validateInput('paymentHistory', paymentHistory, 0, 1);
    validateInput('creditUtilization', creditUtilization, 0, 5);
    validateInput('creditAge', creditAge, 0, 1);
    validateInput('onTimePaymentRate', onTimePaymentRate, 0, 1);
    validateInput('inquiries', inquiries, 0, 50);
    validateInput('activeLoanCount', activeLoanCount, 0, 100);

    if (monthlyIncome <= 0 && assets <= 0) {
      throw new CreditScoreError('Monthly income or assets must be greater than 0');
    }

    // Check for inactivity conflict
    const inactivityDays = (currentDate - lastActiveDateObj) / (1000 * 60 * 60 * 24);
    if (inactivityDays > config.PENALTIES.INACTIVITY.threshold && transactionsLast90Days > 0) {
      console.warn('[CreditScore] Inactivity conflict: transactionsLast90Days > 0 but lastActiveDate is old');
      userData.lastActiveDate = new Date(currentDate - (90 * 24 * 60 * 60 * 1000)).toISOString();
    }

    if (options.debug) {
      console.debug('[Credit Score][Input]', {
        paymentHistory,
        creditUtilization,
        creditAge,
        creditMix,
        inquiries,
        lastActiveDate: userData.lastActiveDate,
        activeLoanCount,
        oldestAccountAge,
        transactionsLast90Days,
        onTimePaymentRate,
        recentLoanApplications,
        defaultCountLast3Years,
        consecutiveMissedPayments,
        missedPaymentsLast12,
        onTimeRateLast6Months,
        monthsSinceLastDelinquency,
        monthlyIncome,
        monthlyDebtPayments,
        assets,
        employmentStatus,
        collateralValue,
        collateralQuality
      });
    }

    // Normalization
    const utilizationScore = normalizeUtilization(creditUtilization);
    const inquiryScore = normalizeInquiries(inquiries);
    const dtiRatio = monthlyIncome > 0 ?
      monthlyDebtPayments / monthlyIncome :
      monthlyDebtPayments / (assets / 12);
    const dtiScore = calculateDtiScore(dtiRatio, config, { monthlyIncome, monthlyDebtPayments, assets });
    const mixFactor = calculateCreditMix(loanTypeCounts, creditMix);

    // Penalties
    const penalties = calculatePenalties(
      {
        applicationDates,
        defaultDates,
        missedPaymentDates,
        activeLoanCount,
        monthlyIncome,
        monthlyDebtPayments,
        missedPaymentsLast12,
        monthsSinceLastDelinquency,
        transactionsLast90Days
      },
      config,
      currentDate,
      validateDate(userData.lastActiveDate || new Date().toISOString())
    );

    // Bonuses
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

    // Plugin Contributions
    const pluginContributions = plugins.reduce((acc, plugin) => {
      try {
        const result = plugin(userData, config, currentDate);
        return {
          score: acc.score + (result.score || 0),
          explanations: [...acc.explanations, ...(result.explanations || [])]
        };
      } catch (e) {
        console.error('[CreditScore] Plugin error:', e);
        return acc;
      }
    }, { score: 0, explanations: [] });

    // AI Adjustment
    const aiAdjustment = applyAIModel(userData, { penalties, bonuses }, options);

    // Employment status adjustment
    let employmentAdjustment = 0;
    if (employmentStatus === 'self-employed') {
      employmentAdjustment = -2; // Penalty for income volatility
    } else if (employmentStatus === 'unemployed' && assets <= 0) {
      employmentAdjustment = -5;
    }

    // Weighted Score Calculation
    const safe = v => (typeof v === 'number' && !isNaN(v) ? v : 0);
    const baseScore = (
      safe(paymentHistory) * weights.PAYMENT_HISTORY +
      safe(utilizationScore) * weights.UTILIZATION +
      safe(creditAge) * weights.CREDIT_AGE +
      safe(mixFactor) * weights.CREDIT_MIX +
      safe(inquiryScore) * weights.INQUIRIES +
      safe(dtiScore) * weights.DTI
    );

    const normalizedBaseScore = (baseScore / totalWeights) * 100;

    const rawScore = normalizedBaseScore +
      penalties.total +
      bonuses.total +
      pluginContributions.score +
      aiAdjustment.adjustment +
      employmentAdjustment;

    const scaledScore = Math.round(config.BASE_RANGE.MIN +
      (rawScore / 100) * (config.BASE_RANGE.MAX - config.BASE_RANGE.MIN));

    const finalScore = Math.max(
      config.BASE_RANGE.MIN,
      Math.min(scaledScore, config.BASE_RANGE.MAX)
    );

    // Now apply collateral adjustment if needed
    let collateralAdjustment = 0;
    if (collateralValue === 0 && config.collateral.requiredForHighRisk && finalScore < 580) {
      collateralAdjustment = -3; // Penalty for no collateral in high-risk cases
    } else if (collateralValue > 0 && collateralQuality >= config.collateral.qualityThreshold) {
      collateralAdjustment = 2; // Bonus for quality collateral
    }
    // Recalculate finalScore with collateralAdjustment
    const adjustedFinalScore = Math.max(
      config.BASE_RANGE.MIN,
      Math.min(finalScore + collateralAdjustment, config.BASE_RANGE.MAX)
    );

    if (options.debug) {
      console.debug('[Credit Score][Normalization]', {
        utilizationScore,
        inquiryScore,
        dtiRatio,
        dtiScore,
        mixFactor
      });
      console.debug('[Credit Score][Penalties]', penalties);
      console.debug('[Credit Score][Bonuses]', bonuses);
      console.debug('[Credit Score][Plugins]', pluginContributions);
      console.debug('[Credit Score][AI]', aiAdjustment);
      console.debug('[Credit Score][Employment]', { employmentAdjustment });
      console.debug('[Credit Score][Collateral]', { collateralAdjustment });
    }

    // Classification
    let classification = 'POOR';
    if (adjustedFinalScore >= config.CLASSIFICATIONS.EXCELLENT) classification = 'EXCELLENT';
    else if (adjustedFinalScore >= config.CLASSIFICATIONS.VERY_GOOD) classification = 'VERY_GOOD';
    else if (adjustedFinalScore >= config.CLASSIFICATIONS.GOOD) classification = 'GOOD';
    else if (adjustedFinalScore >= config.CLASSIFICATIONS.FAIR) classification = 'FAIR';

    // Compliance & Disclosures
    const requiredDisclosures = [];
    if (finalScore < 650) requiredDisclosures.push('LOW_SCORE_NOTICE');
    if (defaultCountLast3Years > 0) requiredDisclosures.push('DEROGATORY_MARK_WARNING');
    if (dtiRatio > config.DTI_THRESHOLDS.DANGER) requiredDisclosures.push('HIGH_DTI_WARNING');
    if (employmentStatus === 'self-employed') requiredDisclosures.push('INCOME_VERIFICATION_REQUIRED');
    if (collateralValue === 0 && finalScore < 580) requiredDisclosures.push('NO_COLLATERAL_WARNING');
    requiredDisclosures.push(...aiAdjustment.explanation, ...pluginContributions.explanations);

    // Result Construction
    const result = {
      score: adjustedFinalScore,
      classification,
      requiredDisclosures,
      baseScore: +normalizedBaseScore.toFixed(2),
      breakdown: {
        paymentHistory: cap100(paymentHistory * weights.PAYMENT_HISTORY),
        creditUtilization: cap100(utilizationScore * weights.UTILIZATION),
        creditAge: cap100(creditAge * weights.CREDIT_AGE),
        creditMix: cap100(mixFactor * weights.CREDIT_MIX),
        inquiries: cap100(inquiryScore * weights.INQUIRIES),
        dti: cap100(dtiRatio * 100).toFixed(1),
        penalties: {
          applications: +penalties.applicationPenalty.toFixed(2),
          defaults: +penalties.defaultHistoryPenalty.toFixed(2),
          missedStreak: +penalties.missedStreakPenalty.toFixed(2),
          missedPayments: +penalties.missedPenalty.toFixed(2),
          delinquency: +penalties.delinquencyPenalty.toFixed(2),
          inactivity: +penalties.inactivityPenalty.toFixed(2),
          loanCount: +penalties.loanCountPenalty.toFixed(2),
          highDti: +penalties.dtiPenalty.toFixed(2),
          total: +penalties.total.toFixed(2)
        },
        bonuses: {
          activity: +bonuses.activityBonus.toFixed(2),
          accountAge: +bonuses.accountAgeBonus.toFixed(2),
          paymentRate: +bonuses.paymentRateBonus.toFixed(2),
          recentOnTime: +bonuses.recentOnTimeBonus.toFixed(2),
          lowDti: +bonuses.lowDtiBonus.toFixed(2),
          total: +bonuses.total.toFixed(2)
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
        aiAdjustments: aiAdjustment.explanation,
        employmentAdjustment: +employmentAdjustment.toFixed(2),
        collateralAdjustment: +collateralAdjustment.toFixed(2)
      },
      version: '2.5', // Updated version
      calculatedAt: new Date().toISOString(),
      dtiRatio: +dtiRatio.toFixed(4),
      loanType,
      customerProfile: {
        employmentStatus,
        collateralValue,
        collateralQuality
      }
    };

    if (phoneNumber) {
      if (options.hashPII) {
        result.phoneHash = hashPhone(phoneNumber);
      } else {
        result.phoneNumber = phoneNumber;
      }
    }

    return result;

  } catch (err) {
    if (err instanceof CreditScoreError) {
      console.error(err.message);
      throw err;
    }
    console.error('[Credit Scoring] Unexpected Error:', err);
    throw new CreditScoreError(`Scoring failed: ${err.message}`);
  }
}