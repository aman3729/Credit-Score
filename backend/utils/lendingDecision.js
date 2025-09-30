/**
 * Lending Decision Engine (v4.0)
 * Enhanced with bank-specific engine configurations and multi-engine support
 *
 * Key Improvements:
 * 1. Bank-specific engine configurations
 * 2. Dynamic scoring weights and penalties
 * 3. Configurable rejection rules
 * 4. Multi-engine scoring support
 * 5. Enhanced validation and error handling
 *
 * @param {Object} scoreData - Result from calculateCreditScore (v2.1+)
 * @param {Object} userData - Financial and behavioral profile
 * @param {Object} bankConfig - Bank-specific configuration
 * @returns {Object} Lending decision and offer
 * @throws {Error} If required data is missing or invalid
 */
import { SCORE_CONFIG } from './creditScoring.js';
import bankConfigService from '../services/bankConfigService.js';

// Adverse Action Code Registry (Regulatory Compliance)
const ADVERSE_ACTION_CODES = {
  INVALID_INCOME: 'AA101',
  REGULATORY_REJECT: 'AA201',
  UNEMPLOYED: 'AA202',
  EXCESSIVE_APPLICATIONS: 'AA203',
  NO_TERMS_AVAILABLE: 'AA301',
  INSUFFICIENT_COLLATERAL: 'AA302',
  ENGINE_REJECTION: 'AA401',
  CONFIGURATION_ERROR: 'AA402'
};

// Default configuration fallbacks
const DEFAULT_CONFIG = {
  decisionMatrix: {
    approveScore: 700,
    conditionalApprove: { score: 650, maxDti: 0.45 },
    reviewScore: 600
  },
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
  incomeMultipliers: {
    EXCELLENT: 12,
    VERY_GOOD: 10,
    GOOD: 8,
    FAIR: 6,
    POOR: 4
  },
  maxInterestRate: 35.99,
  usuryCap: 35.99,
  baseAmounts: {
    EXCELLENT: 1000000,
    VERY_GOOD: 500000,
    GOOD: 300000,
    FAIR: 150000,
    POOR: 50000
  }
};

export async function evaluateLendingDecision(scoreData, userData, bankCode = null) {
  // Validate input data
  if (!scoreData || typeof scoreData.score !== 'number' || !userData) {
    throw new Error('[Lending Decision] Missing or invalid scoreData or userData');
  }

  let bankConfig = null;
  let engineConfig = null;
  let lendingPolicy = null;

  // Load bank-specific configuration if bankCode is provided
  if (bankCode) {
    try {
      bankConfig = await bankConfigService.getBankConfig(bankCode);
      engineConfig = bankConfig.engineConfig;
      lendingPolicy = bankConfig.lendingPolicy;
    } catch (error) {
      console.warn(`[Lending Decision] Failed to load bank config for ${bankCode}, using defaults:`, error.message);
    }
  }

  // Merge configuration with defaults and scoring config
  const config = { 
    ...DEFAULT_CONFIG, 
    ...(SCORE_CONFIG || {}),
    ...(bankConfig?.legacyConfig || {})
  };

  // Apply bank-specific engine configurations
  if (engineConfig) {
    config.engine1 = engineConfig.engine1;
    config.engine2 = engineConfig.engine2;
  }

  // Apply bank-specific lending policy
  if (lendingPolicy) {
    config.lendingPolicy = lendingPolicy;
  }

  // Validate scoring data structure
  if (!scoreData.breakdown?.componentRatings?.dti) {
    console.warn('[Lending Decision] DTI component missing, flagging for manual review');
    scoreData.breakdown = scoreData.breakdown || {};
    scoreData.breakdown.componentRatings = scoreData.breakdown.componentRatings || {};
    scoreData.breakdown.componentRatings.dti = {
      value: null,
      label: 'Manual Review'
    };
  }

  // Extract scoring engine metadata with fallbacks
  const {
    score,
    classification,
    version = 'v4.0',
    requiredDisclosures = [],
    breakdown = {},
    recessionMode = false,
    aiEnabled = false
  } = scoreData;

  // Apply bank-specific engine scoring if available
  let adjustedScore = score;
  let engineReasons = [];
  
  if (engineConfig?.engine1) {
    const engine1Result = applyEngine1Scoring(scoreData, userData, engineConfig.engine1);
    adjustedScore = engine1Result.score;
    engineReasons = engine1Result.reasons;
  }

  // Check engine-specific rejection rules
  const engineRejection = checkEngineRejectionRules(adjustedScore, userData, engineConfig);
  if (engineRejection.rejected) {
    return formatRejection(
      scoreData,
      userData,
      engineRejection.reasons,
      requiredDisclosures,
      version,
      recessionMode,
      aiEnabled,
      userData.employmentStatus || 'unknown',
      userData.activeLoanCount || 0,
      userData.monthsSinceLastDelinquency || Infinity,
      userData.dti || 0,
      ADVERSE_ACTION_CODES.ENGINE_REJECTION
    );
  }

  // Ensure risk tiers exist
  if (!config.riskTiers) {
    console.warn('[Lending Decision] Using fallback risk tiers');
    config.riskTiers = [
      { minScore: 800, tier: 'Low Risk', label: 'Prime', baseRate: 7.99, defaultRisk: 'Very Low' },
      { minScore: 740, tier: 'Low Risk', label: 'Prime', baseRate: 9.99, defaultRisk: 'Low' },
      { minScore: 670, tier: 'Moderate Risk', label: 'Near Prime', baseRate: 12.49, defaultRisk: 'Moderate' },
      { minScore: 580, tier: 'High Risk', label: 'Subprime', baseRate: 18.99, defaultRisk: 'High' },
      { minScore: 300, tier: 'Very High Risk', label: 'Deep Subprime', baseRate: 29.99, defaultRisk: 'Very High' }
    ];
  }

  // Extract financial data with safe defaults
  const {
    monthlyIncome = 0,
    alternativeIncome = 0,
    employmentStatus = 'unknown',
    collateralValue = 0,
    collateralQuality = 0,
    activeLoanCount = 0,
    monthsSinceLastDelinquency = Infinity,
    recentLoanApplications = 0,
    consecutiveMissedPayments = 0,
    lastActiveDate = null,
    transactionsLast90Days = 0
  } = userData;

  // Validate monthly income
  const totalIncome = monthlyIncome + alternativeIncome;
  if (totalIncome <= 0) {
    return formatRejection(
      scoreData,
      userData,
      ['Invalid or zero income'],
      requiredDisclosures,
      version,
      recessionMode,
      aiEnabled,
      employmentStatus,
      activeLoanCount,
      monthsSinceLastDelinquency,
      0,
      ADVERSE_ACTION_CODES.INVALID_INCOME
    );
  }

  // Validate employment status
  const validEmploymentStatuses = ['employed', 'self-employed', 'unemployed', 'retired', 'student', 'other'];
  if (!validEmploymentStatuses.includes(employmentStatus)) {
    console.warn(`[Lending Decision] Invalid employment status: ${employmentStatus}, defaulting to 'other'`);
    userData.employmentStatus = 'other';
  }

  // Validate lastActiveDate and transactionsLast90Days
  let inactivityMonths = Infinity;
  if (lastActiveDate) {
    const lastActive = new Date(lastActiveDate);
    const currentDate = new Date();
    inactivityMonths = (currentDate - lastActive) / (1000 * 60 * 60 * 24 * 30);
    if (transactionsLast90Days > 0 && inactivityMonths > 3) {
      console.warn('[Lending Decision] Inactivity conflict: transactionsLast90Days > 0 but lastActiveDate is old');
      inactivityMonths = 0; // Assume recent activity overrides old date
    }
  }

  // Use DTI from scoring engine or calculate if missing
  let dti = breakdown?.componentRatings?.dti?.value;
  if (dti === null || dti === undefined) {
    const monthlyDebt = userData.monthlyDebtPayments || 0;
    dti = totalIncome > 0 ? monthlyDebt / totalIncome : 0;
  }

  // Check hard rejection criteria with bank-specific rules
  const hardReject = checkHardRejection({
    score: adjustedScore,
    dti,
    employmentStatus,
    totalIncome,
    monthsSinceLastDelinquency,
    consecutiveMissedPayments,
    recentLoanApplications,
    inactivityMonths,
    recessionMode,
    engineConfig
  });

  if (hardReject) {
    return formatRejection(
      scoreData,
      userData,
      hardReject.reasons,
      requiredDisclosures,
      version,
      recessionMode,
      aiEnabled,
      employmentStatus,
      activeLoanCount,
      monthsSinceLastDelinquency,
      dti || 0,
      hardReject.codes.join(',')
    );
  }

  // Risk factor analysis with bank-specific weights
  const riskFactors = analyzeRiskFactors({
    breakdown,
    recentLoanApplications,
    employmentStatus,
    dtiRating: getDtiRating(dti),
    collateralValue,
    collateralQuality,
    recessionMode,
    engineConfig
  }, config);

  const reasons = [...engineReasons, ...riskFactors];

  // Decision matrix with bank-specific thresholds
  const decisionMatrix = config.decisionMatrix || DEFAULT_CONFIG.decisionMatrix;
  let decision = 'Review';
  
  if (adjustedScore >= decisionMatrix.approveScore) {
    decision = 'Approve';
  } else if (
    adjustedScore >= decisionMatrix.conditionalApprove.score &&
    dti !== null &&
    dti <= decisionMatrix.conditionalApprove.maxDti
  ) {
    decision = 'Approve';
  } else if (adjustedScore < decisionMatrix.reviewScore) {
    decision = 'Review';
  }

  // Risk tier classification with bank-specific ranges
  const riskTier = getRiskTier(adjustedScore, config);

  // Dynamic pricing model with bank-specific rules
  const pricing = getRiskBasedPricing(riskTier, {
    dti,
    dtiRating: getDtiRating(dti),
    recessionMode,
    paymentRating: breakdown?.componentRatings?.paymentHistory?.label,
    engineConfig
  }, config);

  // Apply bank-specific rate limits
  const maxAllowedRate = Math.min(
    config.maxInterestRate || DEFAULT_CONFIG.maxInterestRate,
    config.usuryCap || DEFAULT_CONFIG.usuryCap,
    lendingPolicy?.interestRateRules?.maxRate || 35.99
  );
  pricing.finalRate = Math.min(pricing.finalRate, maxAllowedRate);

  // Loan offer calculation with bank-specific amounts
  const offer = calculateLoanOffer(
    adjustedScore, 
    classification,
    pricing,
    userData,
    getDtiRating(dti), 
    riskTier,
    recessionMode,
    config,
    totalIncome,
    dti,
    lendingPolicy
  );

  // Handle no available terms scenario
  if (offer.decision === 'Reject') {
    return offer;
  }

  // AI transparency
  const aiExplanations = aiEnabled ? {
    engineUsed: engineConfig ? 'Bank-specific multi-engine' : 'Standard',
    confidence: Math.min(0.95, Math.max(0.7, adjustedScore / 850)),
    factors: reasons.slice(0, 3)
  } : null;

  return {
    decision,
    score: adjustedScore,
    originalScore: score,
    classification,
    reasons,
    offer: {
      maxAmount: offer.maxAmount,
      recommendedAmount: offer.recommendedAmount,
      termMonths: offer.termMonths,
      interestRate: pricing.finalRate,
      monthlyPayment: offer.monthlyPayment,
      totalInterest: offer.totalInterest,
      apr: pricing.finalRate,
      dti: dti,
    riskTier: riskTier.tier,
      engineAdjustments: engineReasons.length > 0 ? engineReasons : null
    },
    // Flattened fields for frontend compatibility
    riskTier: riskTier.tier,
    riskTierLabel: riskTier.label,
    defaultRiskEstimate: riskTier.defaultRisk || null,
    dti,
    dtiRating: getDtiRating(dti),
    engineVersion: version,
    maxLoanAmount: offer.maxAmount,
    suggestedInterestRate: pricing.finalRate,
    termMonths: offer.termMonths,
    collateralValue,
    apr: pricing.finalRate,
    monthlyPayment: offer.monthlyPayment,
    totalInterest: offer.totalInterest,
    customerProfile: {
      employmentStatus,
      activeLoans: activeLoanCount,
      lastDelinquency: Number.isFinite(monthsSinceLastDelinquency) ? Math.round(monthsSinceLastDelinquency) : 'N/A'
    },
    riskFactors,
    aiExplanations,
    version,
    requiredDisclosures,
    recessionMode,
    bankCode,
    timestamp: new Date().toISOString()
  };
}

/**
 * Apply Engine 1 (Credit-Based) scoring with bank-specific weights
 */
function applyEngine1Scoring(scoreData, userData, engineConfig) {
  const { score, breakdown } = scoreData;
  let adjustedScore = score;
  const reasons = [];

  // Apply scoring weights
  if (breakdown?.componentRatings) {
    const weights = engineConfig.scoringWeights;
    const ratings = breakdown.componentRatings;
    
    // Calculate weighted score adjustments
    Object.keys(weights).forEach(factor => {
      if (ratings[factor]?.value !== undefined) {
        const weight = weights[factor] / 100;
        const factorScore = ratings[factor].value;
        adjustedScore += (factorScore - score) * weight;
      }
    });
  }

  // Apply penalties
  const penalties = engineConfig.penalties;
  
  // Recent defaults penalty
  if (userData.recentDefaults > 0) {
    adjustedScore += penalties.recentDefaults;
    reasons.push(`Recent defaults penalty: ${penalties.recentDefaults} points`);
  }

  // Missed payments penalty
  if (userData.missedPaymentsLast12 > penalties.missedPaymentsLast12.threshold) {
    adjustedScore += penalties.missedPaymentsLast12.penalty;
    reasons.push(`High missed payments penalty: ${penalties.missedPaymentsLast12.penalty} points`);
  }

  // Low on-time rate penalty
  if (userData.onTimeRateLast6Months < penalties.lowOnTimeRate.threshold) {
    adjustedScore += penalties.lowOnTimeRate.penalty;
    reasons.push(`Low on-time rate penalty: ${penalties.lowOnTimeRate.penalty} points`);
  }

  // High inquiries penalty
  if (userData.recentLoanApplications > penalties.highInquiries.threshold) {
    adjustedScore += penalties.highInquiries.penalty;
    reasons.push(`High inquiries penalty: ${penalties.highInquiries.penalty} points`);
  }

  // Apply bonuses
  const bonuses = engineConfig.bonuses;
  
  // Perfect payment rate bonus
  if (userData.onTimeRateLast6Months >= 1.0) {
    adjustedScore += bonuses.perfectPaymentRate;
    reasons.push(`Perfect payment bonus: +${bonuses.perfectPaymentRate} points`);
  }

  // Good credit mix bonus
  if (userData.creditMix >= 0.7) {
    adjustedScore += bonuses.goodCreditMix;
    reasons.push(`Good credit mix bonus: +${bonuses.goodCreditMix} points`);
  }

  // High transaction volume bonus
  if (userData.transactionsLast90Days > 50) {
    adjustedScore += bonuses.highTransactionVolume;
    reasons.push(`High transaction volume bonus: +${bonuses.highTransactionVolume} points`);
  }

  // Ensure score stays within bounds
  adjustedScore = Math.max(engineConfig.minScore, Math.min(engineConfig.maxScore, adjustedScore));

  return { score: adjustedScore, reasons };
}

/**
 * Check engine-specific rejection rules
 */
function checkEngineRejectionRules(score, userData, engineConfig) {
  if (!engineConfig?.engine1?.rejectionRules) {
    return { rejected: false, reasons: [] };
  }

  const rules = engineConfig.engine1.rejectionRules;
  const reasons = [];

  // Check consecutive missed payments
  if (!rules.allowConsecutiveMissedPayments && userData.consecutiveMissedPayments > 0) {
    reasons.push('Consecutive missed payments not allowed');
  }

  // Check max missed payments
  if (userData.missedPaymentsLast12 > rules.maxMissedPayments12Mo) {
    reasons.push(`Too many missed payments in last 12 months (${userData.missedPaymentsLast12}/${rules.maxMissedPayments12Mo})`);
  }

  // Check months since last delinquency
  if (userData.monthsSinceLastDelinquency < rules.minMonthsSinceLastDelinquency) {
    reasons.push(`Recent delinquency (${userData.monthsSinceLastDelinquency} months ago, minimum ${rules.minMonthsSinceLastDelinquency} required)`);
  }

  return {
    rejected: reasons.length > 0,
    reasons
  };
}

/**
 * Check hard rejection criteria with bank-specific rules
 */
function checkHardRejection(params) {
  const {
    score,
    dti,
    employmentStatus,
    totalIncome,
    monthsSinceLastDelinquency,
    consecutiveMissedPayments,
    recentLoanApplications,
    inactivityMonths,
    recessionMode,
    engineConfig
  } = params;

  const reasons = [];
  const codes = [];

  // Employment-based rejection
  if (employmentStatus === 'unemployed') {
    reasons.push('Unemployed status');
    codes.push(ADVERSE_ACTION_CODES.UNEMPLOYED);
  }

  // Income validation
  if (totalIncome <= 0) {
    reasons.push('Invalid or zero income');
    codes.push(ADVERSE_ACTION_CODES.INVALID_INCOME);
  }

  // Excessive applications
  if (recentLoanApplications > 5) {
    reasons.push('Excessive recent loan applications');
    codes.push(ADVERSE_ACTION_CODES.EXCESSIVE_APPLICATIONS);
  }

  // Inactivity threshold
  if (inactivityMonths > 12) {
    reasons.push('Account inactivity beyond 12 months');
    codes.push(ADVERSE_ACTION_CODES.REGULATORY_REJECT);
  }

  // Engine-specific rejection rules
  if (engineConfig?.engine1?.rejectionRules) {
    const engineRejection = checkEngineRejectionRules(score, params, engineConfig);
    if (engineRejection.rejected) {
      reasons.push(...engineRejection.reasons);
      codes.push(ADVERSE_ACTION_CODES.ENGINE_REJECTION);
    }
  }

  return reasons.length > 0 ? { reasons, codes } : null;
}

/**
 * Analyze risk factors with bank-specific weights
 */
function analyzeRiskFactors(params, config) {
  const {
    breakdown,
    recentLoanApplications,
    employmentStatus,
    dtiRating,
    collateralValue,
    collateralQuality,
    recessionMode,
    engineConfig
  } = params;

  const reasons = [];

  // Employment risk
  if (employmentStatus === 'self-employed') {
    reasons.push('Self-employed (higher risk)');
  }

  // DTI risk
  if (dtiRating === 'High') {
    reasons.push('High debt-to-income ratio');
  }

  // Recent applications
  if (recentLoanApplications > 2) {
    reasons.push('Multiple recent loan applications');
  }

  // Collateral quality
  if (collateralValue > 0 && collateralQuality < 0.6) {
    reasons.push('Low-quality collateral');
  }

  // Recession mode adjustments
  if (recessionMode) {
    reasons.push('Recession mode - conservative assessment');
  }

  return reasons;
}

/**
 * Get risk tier with bank-specific thresholds
 */
function getRiskTier(score, config) {
  const riskTiers = config.riskTiers || [
    { minScore: 800, tier: 'Low Risk', label: 'Prime', baseRate: 7.99 },
    { minScore: 740, tier: 'Low Risk', label: 'Prime', baseRate: 9.99 },
    { minScore: 670, tier: 'Moderate Risk', label: 'Near Prime', baseRate: 12.49 },
    { minScore: 580, tier: 'High Risk', label: 'Subprime', baseRate: 18.99 },
    { minScore: 300, tier: 'Very High Risk', label: 'Deep Subprime', baseRate: 29.99 }
  ];

  for (const tier of riskTiers) {
    if (score >= tier.minScore) {
      return tier;
    }
  }

  return riskTiers[riskTiers.length - 1];
}

/**
 * Get DTI rating
 */
function getDtiRating(dti) {
  if (dti <= 0.35) return 'Low';
  if (dti <= 0.45) return 'Medium';
  return 'High';
}

/**
 * Get risk-based pricing with bank-specific adjustments
 */
function getRiskBasedPricing(riskTier, factors, config) {
  let baseRate = riskTier.baseRate;

  // Apply DTI adjustments
  if (factors.dtiRating === 'High') {
    baseRate += config.lendingPolicy?.interestRateRules?.adjustments?.HIGH_DTI || 3;
  }

  // Apply employment adjustments
  if (factors.employmentStatus === 'self-employed') {
    baseRate += config.lendingPolicy?.interestRateRules?.adjustments?.EMPLOYMENT_UNSTABLE || 2;
  }

  // Apply recent default adjustments
  if (factors.recentDefaults > 0) {
    baseRate += config.lendingPolicy?.interestRateRules?.adjustments?.RECENT_DEFAULT || 5;
  }

  // Apply recession adjustments
  if (factors.recessionMode) {
    baseRate += config.recessionAdjustments?.rateIncrease || 2.0;
  }

  return {
    baseRate: riskTier.baseRate,
    finalRate: Math.min(baseRate, config.maxInterestRate || DEFAULT_CONFIG.maxInterestRate)
  };
}

/**
 * Calculate loan offer with bank-specific amounts
 */
function calculateLoanOffer(
  score, 
  classification, 
  pricing, 
  userData, 
  dtiRating, 
  riskTier,
  recessionMode,
  config,
  totalIncome,
  dti,
  lendingPolicy
) {
  // Normalize classification to uppercase
  classification = classification.toUpperCase().replace(/\s+/g, '_');
  
  // Get base amounts from bank-specific lending policy or fallback
  const baseAmounts = lendingPolicy?.baseLoanAmounts || config.baseAmounts || DEFAULT_CONFIG.baseAmounts;
  const incomeMultipliers = lendingPolicy?.incomeMultipliers || config.incomeMultipliers || DEFAULT_CONFIG.incomeMultipliers;
  
  // Validate classification
  const validClassifications = ['EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR'];
  if (!validClassifications.includes(classification)) {
    console.warn(`[Lending Decision] Unknown classification: ${classification}, using 'GOOD' as fallback`);
    classification = 'GOOD';
  }

  // Get income multiplier for classification
  const incomeMultiplier = incomeMultipliers[classification] || 8;

  // Calculate max amount based on income
  let maxAmount = Math.min(
    baseAmounts[classification],
    totalIncome * incomeMultiplier
  );

  // Apply recession mode reduction
  if (recessionMode) {
    const reductionFactor = config.recessionAdjustments?.maxAmountReduction || 0.85;
    maxAmount *= reductionFactor;
  }

  // Collateral adjustments
  let collateralRequired = false;
  if (userData.collateralValue > 0) {
    const collateralConfig = config.collateral || DEFAULT_CONFIG.collateral;
    let effectiveCollateralValue = userData.collateralValue;

    // Discount collateral during recessions
    if (recessionMode) {
      const discountFactor = config.recessionAdjustments?.collateralDiscount || 0.8;
      effectiveCollateralValue *= discountFactor;
    }

    if (
      effectiveCollateralValue >= collateralConfig.minValue &&
      (userData.collateralQuality || 1) >= (recessionMode
        ? collateralConfig.recessionQualityThreshold
        : collateralConfig.qualityThreshold)
    ) {
      const collateralBasedAmount = effectiveCollateralValue * collateralConfig.loanToValueRatio;
      maxAmount = Math.max(maxAmount, collateralBasedAmount);
      collateralRequired = riskTier.tier === 'High Risk' && collateralConfig.requiredForHighRisk;
    }
  }

  // Check if collateral is required for this classification
  const requireCollateralFor = lendingPolicy?.requireCollateralFor || ['FAIR', 'POOR'];
  if (requireCollateralFor.includes(classification) && userData.collateralValue <= 0) {
    return {
      decision: 'Reject',
      reasons: ['Collateral required for this credit classification'],
      rejectionCode: ADVERSE_ACTION_CODES.INSUFFICIENT_COLLATERAL
    };
  }

  // Term options based on bank policy
  const termOptions = lendingPolicy?.termOptions || [12, 24, 36, 48];
  if (!termOptions.length) {
    return {
      decision: 'Reject',
      reasons: ['No available loan terms'],
      rejectionCode: ADVERSE_ACTION_CODES.NO_TERMS_AVAILABLE
    };
  }

  // Select maximum term
  const maxTerm = Math.max(...termOptions);
  const roundedMaxAmount = Math.max(0, Math.round(maxAmount));
  const sampleTerm = maxTerm;

  // Calculate monthly payment
  let monthlyPayment;
  if (pricing.finalRate === 0) {
    monthlyPayment = roundedMaxAmount / sampleTerm;
  } else {
    const monthlyRate = pricing.finalRate / 100 / 12;
    monthlyPayment = (roundedMaxAmount * monthlyRate) /
      (1 - Math.pow(1 + monthlyRate, -sampleTerm));
  }

  const roundedMonthly = Math.round(monthlyPayment * 100) / 100;
  const totalRepayment = roundedMonthly * sampleTerm;
  const totalInterest = totalRepayment - roundedMaxAmount;
  const apr = pricing.finalRate;

  return {
    decision: 'Approve',
    maxAmount: roundedMaxAmount,
    recommendedAmount: Math.round(roundedMaxAmount * 0.8), // Recommend 80% of max
    termMonths: sampleTerm,
    monthlyPayment: roundedMonthly,
    totalInterest: Math.round(totalInterest * 100) / 100,
    apr: apr,
    collateralRequired: collateralRequired
  };
}

/**
 * Get available terms based on credit profile and bank policy
 */
function getAvailableTerms(score, classification, dtiRating, recessionMode, config) {
  const baseTerms = [12, 24, 36, 48, 60];
  
  // Filter terms based on credit profile
  if (score < 600) {
    return baseTerms.filter(term => term <= 36);
  }
  
  if (dtiRating === 'High') {
    return baseTerms.filter(term => term <= 48);
  }
  
  // Apply recession mode restrictions
  if (recessionMode) {
    const maxTerm = config.recessionAdjustments?.maxTerm || 36;
    return baseTerms.filter(term => term <= maxTerm);
  }
  
  return baseTerms;
}

/**
 * Format rejection response
 */
function formatRejection(scoreData, userData, reasons, requiredDisclosures, version, recessionMode, aiEnabled, employmentStatus, activeLoanCount, monthsSinceLastDelinquency, dti, rejectionCode) {
  // Derive risk tier from score using local defaults (bank thresholds may not be available here)
  const localRiskTiers = [
    { minScore: 800, tier: 'Low Risk', label: 'Prime', baseRate: 7.99, defaultRisk: 'Very Low' },
    { minScore: 740, tier: 'Low Risk', label: 'Prime', baseRate: 9.99, defaultRisk: 'Low' },
    { minScore: 670, tier: 'Moderate Risk', label: 'Near Prime', baseRate: 12.49, defaultRisk: 'Moderate' },
    { minScore: 580, tier: 'High Risk', label: 'Subprime', baseRate: 18.99, defaultRisk: 'High' },
    { minScore: 300, tier: 'Very High Risk', label: 'Deep Subprime', baseRate: 29.99, defaultRisk: 'Very High' }
  ];
  let derivedTier = localRiskTiers[localRiskTiers.length - 1];
  for (const t of localRiskTiers) {
    if (scoreData.score >= t.minScore) { derivedTier = t; break; }
  }

  const derivedDtiRating = getDtiRating(typeof dti === 'number' ? dti : 0);

  return {
    decision: 'Reject',
    score: scoreData.score,
    classification: scoreData.classification,
    reasons,
    requiredDisclosures,
    version,
    recessionMode,
    aiEnabled,
    employmentStatus,
    activeLoanCount,
    monthsSinceLastDelinquency,
    dti,
    dtiRating: derivedDtiRating,
    rejectionCode,
    timestamp: new Date().toISOString(),

    // Frontend-friendly flattened fields
    riskTier: derivedTier.tier,
    riskTierLabel: derivedTier.label,
    defaultRiskEstimate: derivedTier.defaultRisk || null,
    engineVersion: version,
    maxLoanAmount: 0,
    suggestedInterestRate: 0,
    termMonths: null,
    collateralValue: userData?.collateralValue || 0,
    apr: 0,
    monthlyPayment: 0,
    totalInterest: 0,
    customerProfile: {
      employmentStatus: employmentStatus || userData?.employmentStatus || 'unknown',
      activeLoans: activeLoanCount ?? userData?.activeLoanCount ?? 0,
      lastDelinquency: Number.isFinite(monthsSinceLastDelinquency) ? Math.round(monthsSinceLastDelinquency) : 'N/A'
    }
  };
}