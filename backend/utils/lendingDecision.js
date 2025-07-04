/**
 * Lending Decision Engine (v2.0)
 * Integrated with new credit scoring engine
 * 
 * @param {Object} scoreData - Result from calculateCreditScore
 * @param {Object} userData - Financial and behavioral profile
 * @returns {Object} Lending decision and offer
 */
export function evaluateLendingDecision(scoreData, userData) {
  if (!scoreData || !scoreData.score || !userData) {
    throw new Error('[Lending Decision] Missing scoreData or userData');
  }

  // Extract scoring engine metadata
  const {
    score,
    classification,
    version = 'v2.0',
    requiredDisclosures = [],
    breakdown,
    recessionMode = false,
    aiEnabled = false
  } = scoreData;

  // Extract financial data
  const {
    monthlyIncome = 0,
    totalDebt = 0,
    employmentStatus = 'unknown',
    collateralValue = 0,
    activeLoanCount = 0,
    monthsSinceLastDelinquency = 'N/A'
  } = userData;

  // Initialize decision components
  let decision = 'Review';
  const reasons = [];
  const riskFlags = [...requiredDisclosures];
  const dti = monthlyIncome > 0 ? totalDebt / monthlyIncome : 0;

  // 🚫 Hard rejection conditions (regulatory compliance)
  const hasHardReject = () => {
    if (breakdown?.penalties?.defaultHistoryPenalty < -6) {
      return ['Major default history'];
    }
    if (userData.monthsSinceLastDelinquency < 3) {
      return ['Recent delinquency (<3 months)'];
    }
    if (userData.consecutiveMissedPayments >= 4) {
      return ['Chronic payment delinquency'];
    }
    if (dti > 0.65) {
      return ['Excessive debt burden (DTI >65%)'];
    }
    return null;
  };

  // Check for hard rejects
  let rejectReasons;
  if (rejectReasons = hasHardReject()) {
    return formatRejection(scoreData, userData, rejectReasons, riskFlags, version, recessionMode, aiEnabled, employmentStatus, activeLoanCount, monthsSinceLastDelinquency);
  }

  // 🟡 Risk factor analysis
  const analyzeRiskFactors = () => {
    const factors = [];
    
    // Payment behavior
    const paymentRating = breakdown?.componentRatings?.paymentHistory?.label;
    if (paymentRating === 'Fair' || paymentRating === 'Poor') {
      factors.push('Suboptimal payment history');
      riskFlags.push('PAYMENT_RISK');
    }

    // Credit utilization
    if (breakdown?.componentRatings?.creditUtilization?.value > 40) {
      factors.push('High credit utilization');
      riskFlags.push('HIGH_UTILIZATION');
    }

    // Recent applications
    if (userData.recentLoanApplications > 3) {
      factors.push('Multiple recent applications');
      riskFlags.push('APPLICATION_VELOCITY');
    }

    // Employment status
    if (!['employed', 'self-employed'].includes(employmentStatus)) {
      factors.push('Unstable employment status');
      riskFlags.push('EMPLOYMENT_RISK');
    }

    return factors;
  };

  // 📊 Decision matrix
  if (score >= 700) decision = 'Approve';
  if (score >= 650 && dti <= 0.45) decision = 'Approve';
  if (score < 600) decision = 'Review';

  // Add risk factors to reasons
  reasons.push(...analyzeRiskFactors());

  // 🏆 Risk tier classification
  const riskTier = getRiskTier(score);
  
  // 💰 Dynamic pricing model
  const pricing = getRiskBasedPricing(riskTier, {
    dti,
    recessionMode,
    paymentRating: breakdown?.componentRatings?.paymentHistory?.label
  });

  // 📦 Loan offer calculation
  const offer = calculateLoanOffer(score, classification, pricing, userData);

  return {
    decision,
    score,
    classification,
    riskTier: riskTier.tier,
    riskTierLabel: riskTier.label,
    defaultRiskEstimate: riskTier.defaultRisk,
    engineVersion: version,
    reasons: reasons.length ? reasons : ['Favorable credit profile'],
    riskFlags,
    offer,
    dti: +dti.toFixed(3),
    timestamp: new Date().toISOString(),
    scoringDetails: {
      recessionMode,
      aiEnabled
    },
    customerProfile: {
      employmentStatus,
      activeLoans: activeLoanCount,
      lastDelinquency: monthsSinceLastDelinquency
    }
  };
}

// 🆕 Helper functions
function formatRejection(scoreData, userData, reasons, riskFlags, version, recessionMode, aiEnabled, employmentStatus, activeLoanCount, monthsSinceLastDelinquency) {
  const { monthlyIncome = 0, totalDebt = 0 } = userData;
  const dti = monthlyIncome > 0 ? totalDebt / monthlyIncome : 0;
  
  return {
    decision: 'Reject',
    score: scoreData.score,
    classification: scoreData.classification,
    riskTier: 'High Risk',
    riskTierLabel: 'Not Eligible',
    defaultRiskEstimate: '>25%',
    engineVersion: version || 'v2.0',
    reasons,
    riskFlags: [...riskFlags, ...(scoreData.requiredDisclosures || [])],
    offer: {
      maxAmount: 0,
      availableTerms: [],
      interestRate: null,
      samplePayment: null,
      sampleTerm: null,
      collateralRequired: false,
      pricingModel: {
        baseRate: null,
        adjustments: {
          dtiAdjustment: null,
          recessionAdjustment: null,
          paymentAdjustment: null
        },
        finalRate: null
      }
    },
    dti: +dti.toFixed(3),
    timestamp: new Date().toISOString(),
    scoringDetails: {
      recessionMode,
      aiEnabled
    },
    customerProfile: {
      employmentStatus,
      activeLoans: activeLoanCount,
      lastDelinquency: monthsSinceLastDelinquency
    },
    rejectionCode: 'REG-01'
  };
}

function getRiskTier(score) {
  // Aligned with new scoring classifications
  if (score >= 800) return { 
    tier: 'Very Low Risk', 
    label: 'Prime Plus', 
    defaultRisk: '<1%' 
  };
  if (score >= 740) return { 
    tier: 'Low Risk', 
    label: 'Prime', 
    defaultRisk: '1-3%' 
  };
  if (score >= 680) return { 
    tier: 'Moderate Risk', 
    label: 'Near Prime', 
    defaultRisk: '4-7%' 
  };
  if (score >= 620) return { 
    tier: 'Medium Risk', 
    label: 'Acceptable', 
    defaultRisk: '8-15%' 
  };
  return { 
    tier: 'High Risk', 
    label: 'Subprime', 
    defaultRisk: '16-25%' 
  };
}

function getRiskBasedPricing(riskTier, factors) {
  // Base rates
  const baseRates = {
    'Very Low Risk': 6.99,
    'Low Risk': 8.99,
    'Moderate Risk': 12.49,
    'Medium Risk': 17.99,
    'High Risk': 24.99
  };

  let rate = baseRates[riskTier.tier];
  
  // Adjustments
  if (factors.dti > 0.4) rate += 1.5;
  if (factors.recessionMode) rate += 0.75;
  if (factors.paymentRating === 'Fair') rate += 2.0;
  if (factors.paymentRating === 'Poor') rate += 4.0;
  
  return {
    baseRate: baseRates[riskTier.tier],
    adjustments: {
      dtiAdjustment: factors.dti > 0.4 ? 1.5 : 0,
      recessionAdjustment: factors.recessionMode ? 0.75 : 0,
      paymentAdjustment: factors.paymentRating === 'Fair' ? 2.0 : 
                         factors.paymentRating === 'Poor' ? 4.0 : 0
    },
    finalRate: Math.min(rate, 35.99)
  };
}

function calculateLoanOffer(score, classification, pricing, userData) {
  // Base amounts by classification
  const baseAmounts = {
    'Excellent': 100000,
    'Very Good': 75000,
    'Good': 50000,
    'Fair': 25000,
    'Poor': 10000
  };

  // Income-based multiplier (max 2x monthly income)
  const incomeMultiplier = Math.min(
    2.0, 
    (userData.monthlyIncome > 0 ? 
      (baseAmounts[classification] / (userData.monthlyIncome * 3)) : 1.0)
  );

  // Calculate max amount
  let maxAmount = baseAmounts[classification] * incomeMultiplier;
  
  // Collateral boost
  if (userData.collateralValue > 0) {
    maxAmount = Math.max(
      maxAmount, 
      userData.collateralValue * 0.7
    );
  }

  // Term options based on risk
  const termOptions = score > 700 ? [24, 36, 48, 60] : 
                      score > 650 ? [24, 36, 48] : 
                      [12, 24, 36];

  // Calculate sample payment (for 36 months)
  const sampleTerm = 36;
  const monthlyPayment = pricing.finalRate > 0 ? 
    (maxAmount * (pricing.finalRate / 100 / 12)) /
    (1 - Math.pow(1 + (pricing.finalRate / 100 / 12), -sampleTerm)) : 0;

  return {
    maxAmount: Math.round(maxAmount),
    availableTerms: termOptions,
    interestRate: +pricing.finalRate.toFixed(2),
    samplePayment: Math.round(monthlyPayment),
    sampleTerm,
    collateralRequired: userData.collateralValue > 0,
    pricingModel: pricing
  };
}
