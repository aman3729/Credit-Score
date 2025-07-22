/**
 * Lending Decision Engine (v2.4)
 * Enhanced with economic sensitivity, regulatory compliance, and risk management
 * 
 * Key Improvements:
 * 1. Fixed collateral evaluation during recessions
 * 2. Added comprehensive configuration fallbacks
 * 3. Enhanced unemployment rejection logic
 * 4. Improved rate ceiling enforcement
 * 5. Configurable term selection fallbacks
 * 
 * @param {Object} scoreData - Result from calculateCreditScore (v2.1+)
 * @param {Object} userData - Financial and behavioral profile
 * @returns {Object} Lending decision and offer
 * @throws {Error} If required data is missing or invalid
 */
import { SCORE_CONFIG } from './creditScoring.js';

// Adverse Action Code Registry (Regulatory Compliance)
const ADVERSE_ACTION_CODES = {
  INVALID_INCOME: 'AA101',
  REGULATORY_REJECT: 'AA201',
  UNEMPLOYED: 'AA202',
  EXCESSIVE_APPLICATIONS: 'AA203',
  NO_TERMS_AVAILABLE: 'AA301',
  INSUFFICIENT_COLLATERAL: 'AA302'
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
    'Low Risk': 12,
    'Medium Risk': 8,
    'High Risk': 4,
    default: 6
  },
  maxInterestRate: 35.99,
  usuryCap: 35.99
};

export function evaluateLendingDecision(scoreData, userData) {
  // Validate input data
  if (!scoreData || typeof scoreData.score !== 'number' || !userData || typeof userData.monthlyIncome !== 'number') {
    throw new Error('[Lending Decision] Missing or invalid scoreData or userData');
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
    version = 'v2.4',
    requiredDisclosures = [],
    breakdown = {},
    recessionMode = false,
    aiEnabled = false
  } = scoreData;

  // Merge configuration with defaults
  const config = { ...DEFAULT_CONFIG, ...SCORE_CONFIG };
  if (!config.riskTiers) {
    console.error('[Lending Decision] Missing riskTiers in configuration, using fallback');
    config.riskTiers = [
      { minScore: 800, tier: 'A+', label: 'Exceptional', baseRate: 4.5, defaultRisk: '<2%' },
      { minScore: 740, tier: 'A', label: 'Excellent', baseRate: 5.5, defaultRisk: '2-5%' },
      { minScore: 680, tier: 'B', label: 'Good', baseRate: 8.0, defaultRisk: '5-10%' },
      { minScore: 620, tier: 'C', label: 'Fair', baseRate: 12.0, defaultRisk: '10-20%' },
      { minScore: 0, tier: 'D', label: 'High Risk', baseRate: 18.0, defaultRisk: '>20%' }
    ];
  }

  // Extract financial data with safe defaults
  const {
    monthlyIncome = 0,
    employmentStatus = 'unknown',
    collateralValue = 0,
    collateralQuality = 0,
    activeLoanCount = 0,
    monthsSinceLastDelinquency = 'N/A',
    recentLoanApplications = 0,
    consecutiveMissedPayments = 0,
    alternativeIncome = 0
  } = userData;

  // Validate monthly income
  if (monthlyIncome <= 0 && alternativeIncome <= 0) {
    return formatRejection(
      scoreData,
      userData,
      ['Invalid or zero monthly income'],
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
    console.warn(`[Lending Decision] Invalid employment status: ${employmentStatus}, defaulting to 'unknown'`);
    userData.employmentStatus = 'unknown';
  }

  // Use DTI from scoring engine or flag for review
  const dti = breakdown.componentRatings.dti?.value
    ? breakdown.componentRatings.dti.value / 100
    : null;
  const dtiRating = breakdown.componentRatings.dti?.label || 'Unknown';

  // Initialize decision components
  let decision = 'Review';
  const reasons = [];

  // Hard rejection conditions (regulatory compliance)
  const hasHardReject = () => {
    const rejectReasons = [];
    const rejectionCodes = [];
    
    // Regulatory rejection conditions
    if (breakdown?.penalties?.defaultHistoryPenalty < -6) {
      rejectReasons.push('Major default history');
      rejectionCodes.push('REG-01');
    }
    if (monthsSinceLastDelinquency !== 'N/A' && monthsSinceLastDelinquency < 3) {
      rejectReasons.push('Recent delinquency (<3 months)');
      rejectionCodes.push('REG-02');
    }
    if (consecutiveMissedPayments >= 4) {
      rejectReasons.push('Chronic payment delinquency');
      rejectionCodes.push('REG-03');
    }
    if (dti && dti > 0.65) {
      rejectReasons.push('Excessive debt burden (DTI >65%)');
      rejectionCodes.push('REG-04');
    }
    if (dti === null) {
      rejectReasons.push('Missing DTI data requires manual review');
      rejectionCodes.push('REG-05');
    }
    
    // Economic rejection conditions
    if (employmentStatus === 'unemployed' && alternativeIncome <= 0) {
      rejectReasons.push('Unemployment status without alternative income');
      rejectionCodes.push(ADVERSE_ACTION_CODES.UNEMPLOYED);
    }
    if (recentLoanApplications > 5) {
      rejectReasons.push('Excessive recent loan applications (>5)');
      rejectionCodes.push(ADVERSE_ACTION_CODES.EXCESSIVE_APPLICATIONS);
    }
    
    return rejectReasons.length ? { reasons: rejectReasons, codes: rejectionCodes } : null;
  };

  // Check for hard rejects
  const hardReject = hasHardReject();
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

  // Risk factor analysis
  const analyzeRiskFactors = () => {
    const factors = [];
    const paymentRating = breakdown?.componentRatings?.paymentHistory?.label;
    
    // Payment behavior risks
    if (paymentRating === 'Fair' || paymentRating === 'Poor') {
      factors.push(`Suboptimal payment history (${paymentRating})`);
    }
    if (breakdown?.componentRatings?.creditUtilization?.value > 40) {
      factors.push('High credit utilization (>40%)');
    }
    if (recentLoanApplications > 2) {
      factors.push('Multiple recent applications');
    }
    
    // Economic stability risks
    if (!['employed', 'self-employed'].includes(employmentStatus)) {
      factors.push('Non-traditional employment status');
    }
    if (dtiRating === 'Fair' || dtiRating === 'Poor') {
      factors.push(`DTI risk (${dtiRating})`);
    }
    
    // Collateral quality risks
    if (collateralValue > 0) {
      const collateralThreshold = recessionMode 
        ? config.collateral.recessionQualityThreshold 
        : config.collateral.qualityThreshold;
      
      if (collateralQuality < collateralThreshold) {
        factors.push(`Low collateral quality (${collateralQuality} < ${collateralThreshold})`);
      }
    }
    
    // Macroeconomic risks
    if (recessionMode) {
      factors.push('Economic recession conditions');
    }
    
    return factors;
  };

  // Decision matrix with config fallbacks
  const decisionMatrix = config.decisionMatrix || DEFAULT_CONFIG.decisionMatrix;
  if (score >= decisionMatrix.approveScore) {
    decision = 'Approve';
  } else if (
    score >= decisionMatrix.conditionalApprove.score &&
    dti &&
    dti <= decisionMatrix.conditionalApprove.maxDti
  ) {
    decision = 'Approve';
  } else if (score < decisionMatrix.reviewScore) {
    decision = 'Review';
  }

  // Add risk factors to reasons
  reasons.push(...analyzeRiskFactors());

  // Risk tier classification
  const riskTier = getRiskTier(score, config);
  
  // Dynamic pricing model with usury cap
  const pricing = getRiskBasedPricing(riskTier, {
    dti,
    dtiRating,
    recessionMode,
    paymentRating: breakdown?.componentRatings?.paymentHistory?.label
  }, config);
  
  // Apply usury rate cap (regulatory compliance)
  const maxAllowedRate = Math.min(
    config.maxInterestRate || DEFAULT_CONFIG.maxInterestRate,
    config.usuryCap || DEFAULT_CONFIG.usuryCap
  );
  pricing.finalRate = Math.min(pricing.finalRate, maxAllowedRate);

  // Loan offer calculation with economic adjustments
  const offer = calculateLoanOffer(
    score, 
    classification, 
    pricing, 
    userData, 
    dtiRating, 
    riskTier,
    recessionMode,
    config
  );
  
  // Handle no available terms scenario
  if (offer.decision === 'Reject') {
    return offer;
  }
  
  // AI transparency
  const aiExplanations = aiEnabled
    ? ['AI model influenced risk tier based on historical data patterns']
    : [];

  return {
    decision,
    score,
    classification,
    riskTier: riskTier.tier,
    riskTierLabel: riskTier.label,
    defaultRiskEstimate: riskTier.defaultRisk,
    engineVersion: version,
    reasons: reasons.length ? reasons : ['Favorable credit profile'],
    riskFlags: reasons, // Unified with reasons
    offer,
    maxLoanAmount: offer.maxAmount,
    suggestedInterestRate: offer.interestRate,
    dti: dti ? +dti.toFixed(3) : null,
    dtiRating,
    timestamp: new Date().toISOString(),
    scoringDetails: {
      recessionMode,
      aiEnabled,
      aiExplanations
    },
    customerProfile: {
      employmentStatus,
      activeLoans: activeLoanCount,
      lastDelinquency: monthsSinceLastDelinquency
    }
  };
}

/**
 * Formats a rejection response with regulatory codes
 */
function formatRejection(
  scoreData,
  userData,
  reasons,
  riskFlags,
  version,
  recessionMode,
  aiEnabled,
  employmentStatus,
  activeLoanCount,
  monthsSinceLastDelinquency,
  dti,
  rejectionCode
) {
  return {
    decision: 'Reject',
    score: scoreData.score,
    classification: scoreData.classification,
    riskTier: 'High Risk',
    riskTierLabel: 'Not Eligible',
    defaultRiskEstimate: '>25%',
    engineVersion: version,
    reasons,
    riskFlags: [...riskFlags, ...reasons],
    offer: {
      maxAmount: 0,
      availableTerms: [],
      interestRate: null,
      apr: null,
      totalInterest: null,
      totalRepayment: null,
      samplePayment: null,
      sampleTerm: null,
      maxTerm: null,
      collateralRequired: false,
      pricingModel: {
        baseRate: null,
        adjustments: {
          dtiAdjustment: null,
          dtiRatingAdjustment: null,
          recessionAdjustment: null,
          paymentAdjustment: null
        },
        finalRate: null
      }
    },
    dti: dti ? +dti.toFixed(3) : null,
    dtiRating: scoreData.breakdown?.componentRatings?.dti?.label || 'Unknown',
    timestamp: new Date().toISOString(),
    scoringDetails: {
      recessionMode,
      aiEnabled,
      aiExplanations: aiEnabled ? ['AI model flagged high risk'] : []
    },
    customerProfile: {
      employmentStatus,
      activeLoans: activeLoanCount,
      lastDelinquency: monthsSinceLastDelinquency
    },
    rejectionCode,
    adverseActionNotice: `Reasons: ${reasons.join('; ')} | Code: ${rejectionCode}`
  };
}

/**
 * Determines risk tier based on credit score
 */
function getRiskTier(score, config) {
  // Sort tiers by minScore descending for proper matching
  const sortedTiers = [...config.riskTiers].sort((a, b) => b.minScore - a.minScore);
  return sortedTiers.find(tier => score >= tier.minScore) || sortedTiers[sortedTiers.length - 1];
}

/**
 * Calculates risk-based pricing with economic adjustments
 */
function getRiskBasedPricing(riskTier, factors, config) {
  let rate = riskTier.baseRate;
  const adjustments = {
    dtiAdjustment: 0,
    dtiRatingAdjustment: 0,
    recessionAdjustment: 0,
    paymentAdjustment: 0
  };

  // DTI-based adjustments
  if (factors.dti && factors.dti > 0.4) {
    adjustments.dtiAdjustment = 1.5;
    rate += 1.5;
  }
  
  // Recession premium
  if (factors.recessionMode) {
    const recessionConfig = config.recessionAdjustments || DEFAULT_CONFIG.recessionAdjustments;
    adjustments.recessionAdjustment = recessionConfig.rateIncrease;
    rate += recessionConfig.rateIncrease;
  }
  
  // Payment history adjustments
  if (factors.paymentRating === 'Fair') {
    adjustments.paymentAdjustment = 2.0;
    rate += 2.0;
  } else if (factors.paymentRating === 'Poor') {
    adjustments.paymentAdjustment = 4.0;
    rate += 4.0;
  }
  
  // DTI rating adjustments
  if (factors.dtiRating === 'Fair') {
    adjustments.dtiRatingAdjustment = 1.5;
    rate += 1.5;
  } else if (factors.dtiRating === 'Poor') {
    adjustments.dtiRatingAdjustment = 3.0;
    rate += 3.0;
  }

  return {
    baseRate: riskTier.baseRate,
    adjustments,
    finalRate: Math.min(rate, config.maxInterestRate || DEFAULT_CONFIG.maxInterestRate)
  };
}

/**
 * Calculates loan offer with economic sensitivity
 */
function calculateLoanOffer(
  score, 
  classification, 
  pricing, 
  userData, 
  dtiRating, 
  riskTier,
  recessionMode,
  config
) {
  // Fallback for unknown classifications
  const baseAmounts = config.baseAmounts || DEFAULT_CONFIG.baseAmounts;
  if (!baseAmounts[classification]) {
    console.warn(`[Lending Decision] Unknown classification: ${classification}, using 'Good' as fallback`);
    classification = 'Good';
  }

  // Get risk-based income multiplier
  const incomeMultipliers = config.incomeMultipliers || DEFAULT_CONFIG.incomeMultipliers;
  const incomeMultiplier = incomeMultipliers[riskTier.tier] || 
    incomeMultipliers.default || 
    8; // Conservative default

  // Calculate max amount based on income
  const effectiveIncome = Math.max(userData.monthlyIncome, userData.alternativeIncome || 0);
  let maxAmount = Math.min(
    baseAmounts[classification],
    effectiveIncome * incomeMultiplier
  );

  // Apply recession mode reduction
  if (recessionMode) {
    const reductionFactor = config.recessionAdjustments?.maxAmountReduction || 0.85;
    maxAmount *= reductionFactor;
  }

  // Collateral adjustments with recession discounting
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
      userData.collateralQuality >= (recessionMode 
        ? collateralConfig.recessionQualityThreshold 
        : collateralConfig.qualityThreshold)
    ) {
      const collateralBasedAmount = effectiveCollateralValue * collateralConfig.loanToValueRatio;
      maxAmount = Math.max(maxAmount, collateralBasedAmount);
      collateralRequired = riskTier.tier === 'High Risk' && collateralConfig.requiredForHighRisk;
    }
  }

  // Term options based on credit profile
  const termOptions = getAvailableTerms(score, dtiRating, recessionMode, config);
  if (!termOptions.length) {
    return formatRejection(
      { 
        score, 
        classification, 
        breakdown: { 
          componentRatings: { dti: { label: dtiRating } } 
        } 
      },
      userData,
      ['No available loan terms'],
      [],
      'v2.4',
      recessionMode,
      false,
      userData.employmentStatus,
      userData.activeLoanCount,
      userData.monthsSinceLastDelinquency,
      null,
      ADVERSE_ACTION_CODES.NO_TERMS_AVAILABLE
    );
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

  const roundedMonthly = Math.round(monthlyPayment);
  const totalRepayment = roundedMonthly * sampleTerm;
  const totalInterest = totalRepayment - roundedMaxAmount;
  const apr = pricing.finalRate;

  return {
    maxAmount: roundedMaxAmount,
    availableTerms: termOptions,
    interestRate: +pricing.finalRate.toFixed(2),
    apr: +apr.toFixed(2),
    totalInterest: +totalInterest.toFixed(2),
    totalRepayment: +totalRepayment.toFixed(2),
    samplePayment: roundedMonthly,
    sampleTerm,
    maxTerm,
    collateralRequired,
    pricingModel: pricing,
    term: sampleTerm,
    monthlyPayment: roundedMonthly
  };
}

/**
 * Determines available loan terms with economic sensitivity
 */
function getAvailableTerms(score, dtiRating, recessionMode, config) {
  // Base terms by credit tier
  const baseTerms = config.termOptions || {
    excellent: [12, 24, 36, 48, 60, 72],
    great: [12, 24, 36, 48, 60],
    good: [12, 24, 36, 48],
    fair: [12, 24, 36],
    poor: [12, 24]
  };

  // Select base terms by score
  let termOptions;
  if (score >= 800) termOptions = [...baseTerms.excellent];
  else if (score >= 740) termOptions = [...baseTerms.great];
  else if (score >= 680) termOptions = [...baseTerms.good];
  else if (score >= 620) termOptions = [...baseTerms.fair];
  else termOptions = [...baseTerms.poor];

  // DTI-based restrictions
  if (dtiRating === 'Poor') {
    termOptions = termOptions.filter(term => term <= 24);
  } else if (dtiRating === 'Fair') {
    termOptions = termOptions.filter(term => term <= 36);
  }

  // Recession restrictions
  if (recessionMode) {
    const recessionConfig = config.recessionAdjustments || DEFAULT_CONFIG.recessionAdjustments;
    const maxTerm = recessionConfig.maxTerm || 36;
    termOptions = termOptions.filter(term => term <= maxTerm);
  }

  return termOptions.length > 0 ? termOptions : [];
}