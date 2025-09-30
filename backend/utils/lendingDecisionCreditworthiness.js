// Lending Decision Engine with Loan Offer Generation
// Version: v3.0.0
// Enhanced with configurable parameters, regulatory compliance, and security features

import { calculateCreditworthiness } from './creditworthinessEngine.js';

// Custom error classes for domain-specific errors
class DomainError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = this.constructor.name;
  }
}

class MissingDataError extends DomainError {
  constructor(field) {
    super(`Missing required field: ${field}`, 'MISSING_DATA');
    this.field = field;
  }
}

class ConfigurationError extends DomainError {
  constructor(configKey) {
    super(`Invalid configuration: ${configKey}`, 'CONFIG_ERROR');
    this.configKey = configKey;
  }
}

// Default configuration
const DEFAULT_CONFIG = {
  thresholds: {
    secured: 300,
    unsecured: 400
  },
  maxDTI: 40,
  maxLTV: 80,
  rateMatrix: {
    secured: {
      Excellent: 11.5,
      'Very Good': 13.0,
      Good: 15.5,
      Fair: 18.0,
      Poor: 22.0
    },
    unsecured: {
      Excellent: 12.5,
      'Very Good': 14.5,
      Good: 17.0,
      Fair: 20.0,
      Poor: 25.0
    }
  },
  feeStructure: {
    personal: {
      origination: { type: 'percentage', value: 0.01, min: 0, max: 500 },
      latePayment: { type: 'fixed', value: 200 },
      prepayment: { type: 'fixed', value: 0 }
    },
    creditCard: {
      annual: { type: 'riskBased', Excellent: 0, 'Very Good': 300, Good: 400, Fair: 500, Poor: 500 },
      latePayment: { type: 'fixed', value: 300 },
      cashAdvance: { type: 'percentage', value: 0.03 }
    },
    business: {
      origination: { type: 'percentage', value: 0.015 },
      latePayment: { type: 'fixed', value: 500 },
      prepayment: { type: 'percentage', value: 0.005 }
    }
  },
  currency: 'ETB',
  maxTerm: 60,
  maxAPR: 36.0,
  termAdjustments: [
    { minTerm: 24, adjustment: 1.0 },
    { minTerm: 36, adjustment: 0.5 }
  ]
};

export function makeLendingDecision(data, options = {}) {
  if (!data) throw new MissingDataError('Applicant data');
  
  const config = { ...DEFAULT_CONFIG, ...options.config };
  const performanceMetrics = { startTime: performance.now(), components: {} };
  const logger = options.logger || defaultLogger;
  const auditLog = createAuditLog(data, options);

  try {
    // Validate configuration
    validateConfiguration(config);

    // Calculate creditworthiness
    performanceMetrics.components.scoring = performance.now();
    const scoreResult = calculateCreditworthiness(data, options);
    performanceMetrics.components.scoring = performance.now() - performanceMetrics.components.scoring;

    // Make lending decision
    performanceMetrics.components.decisionLogic = performance.now();
    const decision = generateLoanDecision(scoreResult, data, config);
    performanceMetrics.components.decisionLogic = performance.now() - performanceMetrics.components.decisionLogic;

    // Generate loan offers
    performanceMetrics.components.offerGeneration = performance.now();
    const loanOffers = generateLoanOffers(decision, scoreResult, data, config);
    performanceMetrics.components.offerGeneration = performance.now() - performanceMetrics.components.offerGeneration;

    // Prepare result
    const result = {
      engine: 'LendingDecisionEngine',
      version: 'v3.0.0',
      timestamp: new Date().toISOString(),
      decision,
      loanOffers,
      scoreDetails: scoreResult,
      performanceMetrics
    };

    // Sign and encrypt sensitive data
    const secureResult = secureResultData(result, config);
    auditLog.result = sanitizeForLogging(secureResult);
    logger(auditLog);
    
    return secureResult;
  } catch (error) {
    auditLog.errors.push({ message: error.message, code: error.code, stack: error.stack });
    logger(auditLog);
    throw error;
  }
}

// Helper functions
function validateConfiguration(config) {
  if (!config.thresholds.secured || config.thresholds.secured < 0) {
    throw new ConfigurationError('thresholds.secured');
  }
  if (!config.maxAPR || config.maxAPR > 100) {
    throw new ConfigurationError('maxAPR');
  }
  // Add additional validation as needed
}

function createAuditLog(data, options) {
  return {
    timestamp: new Date().toISOString(),
    operation: 'makeLendingDecision',
    input: { data: sanitizeForLogging(data), options },
    result: null,
    errors: []
  };
}

function sanitizeForLogging(data) {
  const sensitiveFields = [
    'monthlyIncome', 'monthlyDebtPayments', 'collateralValue', 
    'requestedAmount', 'socialSecurityNumber', 'bankAccountNumber'
  ];
  
  const sanitized = { ...data };
  sensitiveFields.forEach(field => {
    if (sanitized[field] !== undefined) sanitized[field] = '[REDACTED]';
  });
  return sanitized;
}

function secureResultData(result, config) {
  // In a real implementation, this would encrypt sensitive fields
  // and add digital signature for data integrity
  return {
    ...result,
    security: {
      integrityCheck: 'HMAC-SHA256:placeholder-signature',
      encryption: 'AES-256-GCM:placeholder-iv'
    }
  };
}

function generateLoanDecision(scoreResult, data, config) {
  const { totalScore, classification, recommendedCreditLimit } = scoreResult;
  const requestedAmount = data.requestedAmount || 0;
  const isSecuredCard = data.isSecuredCard || false;
  
  // Initialize decision object
  const decision = {
    status: 'denied',
    reason: 'Credit score below minimum threshold',
    approvedAmount: 0,
    riskCategory: classification,
    dtiStatus: 'acceptable',
    loanToValue: 0,
    debtServiceCoverageRatio: 0,
    verificationFlags: []
  };

  // Check minimum score thresholds
  if (totalScore < config.thresholds.secured) {
    return {
      ...decision,
      reason: `Credit score (${totalScore}) below minimum secured threshold (${config.thresholds.secured})`
    };
  }

  // Calculate financial ratios
  const monthlyIncome = data.monthlyIncome || 1;
  const monthlyDebt = data.monthlyDebtPayments || 0;
  const collateralValue = data.collateralValue || 0;
  const collateralType = data.collateralType || 'other';
  
  // Include proposed payment in DTI calculation
  const samplePayment = calculateInstallmentPayment(
    Math.min(requestedAmount, recommendedCreditLimit),
    config.rateMatrix.unsecured[classification] || 18.0,
    12
  );
  
  const dti = ((monthlyDebt + samplePayment) / monthlyIncome) * 100;
  const ltv = collateralValue > 0 ? 
    (Math.min(requestedAmount, recommendedCreditLimit) / collateralValue) * 100 : 0;
  
  const disposableIncome = monthlyIncome - monthlyDebt - (data.monthlyExpenses || 0);
  const dscr = disposableIncome > 0 ? disposableIncome / (monthlyDebt + samplePayment) : 0;

  // Update decision with financial metrics
  decision.dtiStatus = dti <= config.maxDTI ? 'acceptable' : 'high';
  decision.loanToValue = ltv;
  decision.debtServiceCoverageRatio = dscr;

  // Add verification flags for higher risk categories
  if (totalScore >= (scoreResult.thresholds.veryGood || 700)) {
    decision.verificationFlags = [
      'INCOME_VERIFICATION_REQUIRED',
      'ADDRESS_VERIFICATION_REQUIRED'
    ];
    
    // Add collateral verification if applicable
    if (collateralValue > 0) {
      decision.verificationFlags.push(`${collateralType.toUpperCase()}_APPRAISAL_REQUIRED`);
    }
  }

  // Decision logic
  if (isSecuredCard) {
    decision.status = 'approved';
    decision.reason = 'Secured card approved based on deposit';
    decision.approvedAmount = recommendedCreditLimit;
  } 
  else if (totalScore >= config.thresholds.unsecured) {
    if (dti <= config.maxDTI && ltv <= config.maxLTV) {
      decision.status = requestedAmount <= recommendedCreditLimit ? 'approved' : 'counteroffer';
      decision.reason = requestedAmount <= recommendedCreditLimit 
        ? 'Approved within recommended limit' 
        : 'Counteroffer: Requested amount exceeds recommended limit';
      decision.approvedAmount = Math.min(requestedAmount, recommendedCreditLimit);
    } else {
      decision.status = 'counteroffer';
      decision.reason = 'Counteroffer: DTI or LTV constraints require adjusted terms';
      decision.approvedAmount = recommendedCreditLimit * 0.8;
    }
  } 
  else if (totalScore >= config.thresholds.secured && collateralValue > 0) {
    decision.status = 'counteroffer';
    decision.reason = 'Consider secured loan option';
    decision.approvedAmount = Math.min(
      recommendedCreditLimit, 
      collateralValue * config.maxLTV / 100
    );
  }

  // Add co-applicant consideration
  if (data.coApplicant) {
    decision.coApplicantRequired = true;
    decision.reason += ' (Co-applicant recommended)';
  }

  return decision;
}

function generateLoanOffers(decision, scoreResult, data, config) {
  if (decision.status === 'denied') return [];
  
  const baseOffers = [
    createLoanOffer('primary', decision, scoreResult, data, config)
  ];

  // Secured alternative offer
  if (!data.isSecuredCard && decision.status !== 'approved' && data.collateralValue > 0) {
    const securedDecision = {
      ...decision,
      approvedAmount: Math.min(
        decision.approvedAmount, 
        data.collateralValue * config.maxLTV / 100
      )
    };
    baseOffers.push(
      createLoanOffer('secured_alternative', securedDecision, scoreResult, { ...data, isSecuredCard: true }, config)
    );
  }

  // Extended term offer
  const requestedTerm = data.requestedTerm || 12;
  if (config.loanType !== 'creditCard' && requestedTerm < config.maxTerm) {
    const extendedTerm = Math.min(config.maxTerm, requestedTerm + 12);
    baseOffers.push(
      createLoanOffer('extended_term', decision, scoreResult, data, { ...config, loanTerm: extendedTerm })
    );
  }

  // Co-applicant offer if applicable
  if (data.coApplicant) {
    const coApplicantOffer = createLoanOffer('co_applicant', decision, scoreResult, data, config);
    coApplicantOffer.conditions.push('CO_APPLICANT_REQUIRED');
    baseOffers.push(coApplicantOffer);
  }

  return baseOffers;
}

function createLoanOffer(offerType, decision, scoreResult, data, config) {
  const { approvedAmount, riskCategory } = decision;
  const isSecuredCard = data.isSecuredCard || false;
  const loanType = config.loanType || 'personal';
  const term = config.loanTerm || data.requestedTerm || 12;
  const securityType = isSecuredCard ? 'secured' : 'unsecured';
  
  // Calculate interest rate with term adjustments
  let interestRate = config.rateMatrix[securityType][riskCategory] || 18.0;
  config.termAdjustments.forEach(adj => {
    if (term >= adj.minTerm) interestRate += adj.adjustment;
  });
  
  // Apply APR cap
  interestRate = Math.min(interestRate, config.maxAPR);
  
  // Calculate fees
  const fees = calculateFees(loanType, approvedAmount, riskCategory, config);
  
  // Generate payment schedule
  const monthlyPayment = loanType !== 'creditCard' 
    ? calculateInstallmentPayment(approvedAmount, interestRate, term) 
    : 0;
  
  const amortizationSchedule = loanType !== 'creditCard' && term <= config.maxTerm
    ? generateAmortizationSchedule(approvedAmount, interestRate, term, 12)
    : [];

  // Build offer
  return {
    offerId: generateOfferId(),
    offerType,
    amount: approvedAmount,
    currency: config.currency,
    term: loanType === 'creditCard' ? 'revolving' : term,
    interestRate,
    apr: calculateCompliantAPR(approvedAmount, interestRate, term, fees),
    monthlyPayment,
    securityType,
    collateralRequired: isSecuredCard,
    collateralType: data.collateralType || null,
    collateralValue: data.collateralValue || 0,
    fees,
    expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    conditions: [
      'FINAL_APPROVAL_SUBJECT_TO_VERIFICATION',
      'OFFER_VALID_FOR_30_DAYS',
      ...(decision.verificationFlags || [])
    ],
    requiredDocuments: getRequiredDocuments(loanType, riskCategory, data.coApplicant),
    amortizationSchedule,
    disclosures: [
      ...(scoreResult.disclosures || []),
      'RATES_AND_TERMS_SUBJECT_TO_CHANGE_WITHOUT_NOTICE',
      'LATE_PAYMENTS_SUBJECT_TO_PENALTIES',
      `MAX_APR:${config.maxAPR}%`
    ]
  };
}

function calculateFees(loanType, amount, riskCategory, config) {
  const feeConfig = config.feeStructure[loanType] || {};
  const fees = {};
  
  for (const [feeType, feeDef] of Object.entries(feeConfig)) {
    switch (feeDef.type) {
      case 'percentage':
        fees[feeType] = amount * feeDef.value;
        if (feeDef.min) fees[feeType] = Math.max(fees[feeType], feeDef.min);
        if (feeDef.max) fees[feeType] = Math.min(fees[feeType], feeDef.max);
        break;
      
      case 'fixed':
        fees[feeType] = feeDef.value;
        break;
      
      case 'riskBased':
        fees[feeType] = feeDef[riskCategory] || feeDef.Poor || 0;
        break;
        
      default:
        fees[feeType] = 0;
    }
  }
  
  return fees;
}

function calculateCompliantAPR(principal, interestRate, termMonths, fees) {
  // Simplified Reg Z/Truth in Lending calculation
  const totalInterest = principal * (interestRate / 100) * (termMonths / 12);
  const totalFees = Object.values(fees).reduce((sum, fee) => sum + fee, 0);
  const totalCost = totalInterest + totalFees;
  
  // More accurate APR calculation using Newton-Raphson approximation
  const payment = calculateInstallmentPayment(principal, interestRate, termMonths);
  const guess = interestRate / 100 / 12;
  
  const calculateBalance = (rate) => {
    let balance = principal;
    for (let i = 0; i < termMonths; i++) {
      balance = balance * (1 + rate) - payment;
    }
    return balance;
  };
  
  let rate = guess;
  let balance = calculateBalance(rate);
  let prevRate = rate;
  let prevBalance = balance;
  
  // Iterate until convergence
  for (let i = 0; i < 20; i++) {
    rate += 0.0001;
    balance = calculateBalance(rate);
    
    if (Math.abs(balance) < 0.01) break;
    
    const derivative = (balance - prevBalance) / (rate - prevRate);
    prevRate = rate;
    prevBalance = balance;
    
    if (Math.abs(derivative) > 0.0001) {
      rate -= balance / derivative;
    }
  }
  
  return (rate * 12 * 100);
}

function generateOfferId() {
  const buffer = new Uint8Array(8);
  crypto.getRandomValues(buffer);
  return 'OFFER-' + Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function calculateInstallmentPayment(principal, annualRate, termMonths) {
  if (termMonths === 0 || principal === 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  return principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
}

function generateAmortizationSchedule(principal, annualRate, termMonths, maxMonths = 12) {
  const monthlyRate = annualRate / 100 / 12;
  let balance = principal;
  const schedule = [];
  const monthlyPayment = calculateInstallmentPayment(principal, annualRate, termMonths);
  
  for (let month = 1; month <= Math.min(termMonths, maxMonths); month++) {
    const interest = balance * monthlyRate;
    const principalPayment = monthlyPayment - interest;
    
    schedule.push({
      month,
      payment: monthlyPayment,
      principal: principalPayment,
      interest,
      remainingBalance: balance - principalPayment
    });
    
    balance -= principalPayment;
  }
  
  return schedule;
}

function getRequiredDocuments(loanType, riskCategory, hasCoApplicant = false) {
  const baseDocs = ['ID_CARD', 'PROOF_OF_ADDRESS'];
  
  if (riskCategory === 'Fair' || riskCategory === 'Poor') {
    baseDocs.push('BANK_STATEMENTS_6_MONTHS');
  }
  
  if (loanType === 'business') {
    baseDocs.push('BUSINESS_REGISTRATION', 'FINANCIAL_STATEMENTS');
  }
  
  if (loanType === 'mortgage') {
    baseDocs.push('PROPERTY_TITLE', 'SALARY_CERTIFICATE');
  }
  
  if (hasCoApplicant) {
    baseDocs.push('CO_APPLICANT_ID', 'CO_APPLICANT_INCOME_PROOF');
  }
  
  return baseDocs;
}

// Default logger implementation
function defaultLogger(log) {
  console.log(`[LENDING_DECISION ${new Date().toISOString()}] ${JSON.stringify(log)}`);
}