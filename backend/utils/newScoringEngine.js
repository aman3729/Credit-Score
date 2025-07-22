/**
 * Creditworthiness Scoring Engine for Thin-File Borrowers (Based on 5 Cs of Credit)
 * Version: v1.5.8
 * Max Score: 1000
 *
 * Categories (Adjusted for Thin-File Borrowers):
 * - Capacity: 500 pts - Income, expenses, average daily balance, monthly debt payments
 * - Character: 300 pts - Employment, residence, financial literacy
 * - Capital: 150 pts - Savings consistency, cash flow stability, average daily balance
 * - Collateral: 25 pts - Secured card deposit or other assets
 * - Conditions: 25 pts - Loan context and macro conditions
 *
 * Changes in v1.5.8 (Ethiopia-Specific):
 * - Added dynamic currency rate via options.currencyRate or fetchCentralBankRate() (mocked at 1 USD = 139 ETB).
 * - Added validation for collateralType when collateralValue > 0.
 * - Implemented memoization for debtServiceRatio and financialLiteracyScore.
 * - Added sanitizeForLogging to redact sensitive data in audit logs.
 * - Added handleNoIncomeScenario for zero-income applicants.
 * - Added JSDoc for all parameters and functions.
 * - Added snapshot testing setup (mocked for Jest).
 * - Added hysteresis to circuit breaker (30s delay before reset).
 * - Added cultural context notes for informal employment and cash-based payments in Ethiopia.
 * - Integrated Zod validation schema for inputs.
 * - Retained v1.5.7 features: ETB support, proxy-based monitoring, verification prompts.
 *
 * @param {Object} data - Applicant's financial and behavioral data
 * @param {number} data.monthlyIncome - Monthly income (ETB, >=0)
 * @param {number} data.monthlyDebtPayments - Monthly debt payments (ETB, >=0)
 * @param {number} data.monthlyExpenses - Monthly non-debt expenses (ETB, >=0)
 * @param {number} data.averageDailyBalance - Average daily bank balance (ETB, >=0)
 * @param {number} data.utilityPayments - On-time utility payment rate (0–1)
 * @param {number} data.rentPayments - On-time rent payment rate (0–1)
 * @param {string} data.employmentStability - Employment stability ('stable', 'moderate', 'unstable')
 * @param {number} data.jobTenureMonths - Months in current job (>=0)
 * @param {number} data.financialLiteracyScore - Financial literacy score (0–100)
 * @param {string} data.industryRisk - Industry risk level ('low', 'medium', 'high')
 * @param {string} data.loanPurpose - Loan purpose ('productive', 'neutral', 'discretionary')
 * @param {number} data.savingsConsistencyScore - Percentage of months with savings deposits (0–100)
 * @param {number} data.cashFlowStability - Cash flow stability score (0–100)
 * @param {number} data.downPayment - Down payment for secured card (ETB, >=0)
 * @param {number} data.collateralValue - Collateral value (ETB, >=0)
 * @param {string} data.collateralLiquidity - Collateral liquidity ('high', 'medium', 'low')
 * @param {string} data.collateralType - Collateral type ('realEstate', 'vehicle', 'securedDeposit', 'other')
 * @param {number} data.interestRate - Interest rate (>=0)
 * @param {number} data.loanTermMonths - Loan term in months (>=0)
 * @param {string} data.macroRiskLevel - Macro risk level ('low', 'medium', 'high')
 * @param {string} data.sectorRisk - Sector risk level ('low', 'medium', 'high')
 * @param {number} data.bankruptcies - Number of bankruptcies (>=0)
 * @param {number} data.legalIssues - Number of legal issues (>=0)
 * @param {number} data.residenceStabilityMonths - Months at current residence (>=0)
 * @param {number} data.jobHopsInLast2Years - Job changes in last 2 years (>=0)
 * @param {string[]} data.behavioralRedFlags - Array of behavioral flags
 * @param {Object[]} data.paymentHistory - Array of payment records (e.g., [{ onTime: boolean }])
 * @param {number} data.utilizationRate - Credit utilization ratio (0–1)
 * @param {Object} [options] - Configuration options
 * @param {Object} [options.weights] - Custom weights for scoring categories
 * @param {Object} [options.thresholds] - Custom score thresholds
 * @param {Object} [options.creditLimits] - Custom credit limits (USD)
 * @param {string} [options.loanType] - Loan type ('personal', 'mortgage', 'business', 'creditCard')
 * @param {boolean} [options.isSecuredCard] - Flag for secured card
 * @param {boolean} [options.fetchExternalData] - Enable external data fetch (mocked)
 * @param {boolean} [options.enableMonitoring] - Enable usage monitoring
 * @param {Object} [options.macroConditions] - Macroeconomic conditions
 * @param {number} [options.currencyRate] - ETB-to-USD exchange rate (e.g., 1/139)
 * @param {Function} [options.logger] - Custom logger function
 * @returns {Object} Scoring result with breakdown, credit limit (ETB), and metadata
 * @throws {Error} If input data is invalid or missing
 */
export function calculateCreditworthiness(data, options = {}) {
  if (!data) throw new Error('Applicant data is required');

  // Zod validation schema
  const zod = require('zod');
  const inputSchema = zod.object({
    monthlyIncome: zod.number().min(0, 'monthlyIncome cannot be negative'),
    monthlyDebtPayments: zod.number().min(0, 'monthlyDebtPayments cannot be negative'),
    monthlyExpenses: zod.number().min(0, 'monthlyExpenses cannot be negative'),
    averageDailyBalance: zod.number().min(0, 'averageDailyBalance cannot be negative'),
    utilityPayments: zod.number().min(0).max(1, 'utilityPayments must be between 0 and 1'),
    rentPayments: zod.number().min(0).max(1, 'rentPayments must be between 0 and 1'),
    employmentStability: zod.enum(['stable', 'moderate', 'unstable']),
    jobTenureMonths: zod.number().min(0, 'jobTenureMonths cannot be negative'),
    financialLiteracyScore: zod.number().min(0).max(100, 'financialLiteracyScore must be between 0 and 100'),
    industryRisk: zod.enum(['low', 'medium', 'high']),
    loanPurpose: zod.enum(['productive', 'neutral', 'discretionary']),
    savingsConsistencyScore: zod.number().min(0).max(100, 'savingsConsistencyScore must be between 0 and 100'),
    cashFlowStability: zod.number().min(0).max(100, 'cashFlowStability must be between 0 and 100'),
    downPayment: zod.number().min(0, 'downPayment cannot be negative'),
    collateralValue: zod.number().min(0, 'collateralValue cannot be negative'),
    collateralLiquidity: zod.enum(['high', 'medium', 'low']),
    collateralType: zod.string().refine((val) => !data.collateralValue || ['realEstate', 'vehicle', 'securedDeposit', 'other'].includes(val), {
      message: 'collateralType required when collateralValue > 0'
    }),
    interestRate: zod.number().min(0, 'interestRate cannot be negative'),
    loanTermMonths: zod.number().min(0, 'loanTermMonths cannot be negative'),
    macroRiskLevel: zod.enum(['low', 'medium', 'high']),
    sectorRisk: zod.enum(['low', 'medium', 'high']),
    bankruptcies: zod.number().min(0, 'bankruptcies cannot be negative'),
    legalIssues: zod.number().min(0, 'legalIssues cannot be negative'),
    residenceStabilityMonths: zod.number().min(0, 'residenceStabilityMonths cannot be negative'),
    jobHopsInLast2Years: zod.number().min(0, 'jobHopsInLast2Years cannot be negative'),
    behavioralRedFlags: zod.array(zod.string()),
    paymentHistory: zod.array(zod.object({ onTime: zod.boolean() })),
    utilizationRate: zod.number().min(0).max(1, 'utilizationRate must be between 0 and 1'),
    phoneNumber: zod.string().optional()
  });

  // Performance metrics
  const performanceMetrics = {
    startTime: performance.now(),
    components: {}
  };

  // Rate limiting and circuit breaker with hysteresis
  const RATE_LIMIT = {
    maxCalls: 100,
    windowMs: 60 * 1000,
    calls: [],
    isRateLimited: () => {
      const now = Date.now();
      performanceMetrics.components.rateLimitCheck = performance.now();
      const recentCalls = RATE_LIMIT.calls.filter(t => now - t < RATE_LIMIT.windowMs);
      RATE_LIMIT.calls = recentCalls;
      const isLimited = recentCalls.length >= RATE_LIMIT.maxCalls;
      performanceMetrics.components.rateLimitCheck = performance.now() - performanceMetrics.components.rateLimitCheck;
      return isLimited;
    },
    recordCall: () => RATE_LIMIT.calls.push(Date.now())
  };

  const CIRCUIT_BREAKER = {
    failureCount: 0,
    maxFailures: 3,
    resetTimeoutMs: 5 * 60 * 1000,
    hysteresisDelayMs: 30 * 1000, // 30s delay before reset
    lastFailureTime: null,
    isOpen: () => {
      if (CIRCUIT_BREAKER.failureCount >= CIRCUIT_BREAKER.maxFailures) {
        const now = Date.now();
        if (now - CIRCUIT_BREAKER.lastFailureTime < CIRCUIT_BREAKER.resetTimeoutMs + CIRCUIT_BREAKER.hysteresisDelayMs) {
          return true;
        }
        CIRCUIT_BREAKER.failureCount = 0;
        CIRCUIT_BREAKER.lastFailureTime = null;
      }
      return false;
    },
    recordFailure: () => {
      CIRCUIT_BREAKER.failureCount++;
      CIRCUIT_BREAKER.lastFailureTime = Date.now();
    },
    recordSuccess: () => {
      CIRCUIT_BREAKER.failureCount = 0;
      CIRCUIT_BREAKER.lastFailureTime = null;
    }
  };

  // Audit logging with sanitization
  const defaultLogger = (log) => console.log(`[AUDIT ${new Date().toISOString()}] ${JSON.stringify(log)}`);
  const logger = options.logger || defaultLogger;

  /**
   * Sanitizes sensitive data for logging
   * @param {Object} data - Input data to sanitize
   * @returns {Object} Sanitized data
   */
  const sanitizeForLogging = (data) => {
    const sensitiveFields = ['monthlyIncome', 'monthlyDebtPayments', 'monthlyExpenses', 'averageDailyBalance', 'downPayment', 'collateralValue'];
    const sanitized = { ...data };
    sensitiveFields.forEach(field => {
      if (sanitized[field] !== undefined) sanitized[field] = '[REDACTED]';
    });
    return sanitized;
  };

  const auditLog = {
    timestamp: new Date().toISOString(),
    operation: 'calculateCreditworthiness',
    input: { data: sanitizeForLogging(data), options },
    result: null,
    errors: []
  };

  // Configuration
  const DEFAULT_CONFIG = {
    WEIGHTS: {
      capacity: 500,
      character: 300,
      capital: 150,
      collateral: 25,
      conditions: 25
    },
    WEIGHT_PRESETS: {
      creditCard: { capacity: 500, character: 300, capital: 150, collateral: 25, conditions: 25 },
      personal: { capacity: 450, character: 300, capital: 150, collateral: 50, conditions: 50 },
      mortgage: { capacity: 400, character: 250, capital: 150, collateral: 100, conditions: 100 },
      business: { capacity: 450, character: 250, capital: 150, collateral: 50, conditions: 100 }
    },
    THRESHOLDS: {
      excellent: 700,
      veryGood: 600,
      good: 500,
      fair: 400
    },
    CREDIT_LIMITS: {
      excellent: 5000,
      veryGood: 2000,
      good: 1000,
      fair: 500,
      poor: 200
    },
    DEBT_SERVICE_THRESHOLDS: {
      excellent: 0.15,
      good: 0.25,
      fair: 0.35
    },
    BANK_BALANCE_THRESHOLDS: {
      high: 5000,
      medium: 1000,
      low: 0
    },
    SECURED_CARD_MIN_DEPOSIT: 49,
    SECURED_CARD_MAX_DEPOSIT: 200,
    BEHAVIORAL_RED_FLAGS: {
      frequentOverdrafts: 15,
      lateUtilityPayments: 10,
      legalDisputes: 20,
      highRiskTransactions: 10
    },
    COLLATERAL_TYPES: {
      realEstate: { multiplier: 1.2, maxScore: 50 },
      vehicle: { multiplier: 1.0, maxScore: 30 },
      securedDeposit: { multiplier: 1.0, maxScore: 25 },
      other: { multiplier: 0.8, maxScore: 20 }
    },
    SAVINGS_CONSISTENCY_THRESHOLDS: {
      high: 80,
      medium: 60,
      low: 40
    },
    CASH_FLOW_THRESHOLDS: {
      high: 80,
      medium: 60,
      low: 40
    },
    FINANCIAL_LITERACY_THRESHOLDS: {
      high: 80,
      medium: 60,
      low: 40
    },
    INCOME_THRESHOLD: 5000,
    CURRENCY_CONVERSION: {
      ETB_TO_USD: options.currencyRate || 1 / 139 // Default to 1 USD = 139 ETB
    }
  };

  /**
   * Mock function to fetch central bank exchange rate
   * @returns {number} ETB-to-USD exchange rate
   */
  const fetchCentralBankRate = () => {
    // Mocked; replace with real API call to National Bank of Ethiopia if available
    return 1 / 139;
  };

  const config = { ...DEFAULT_CONFIG, ...options };
  config.CURRENCY_CONVERSION.ETB_TO_USD = options.currencyRate || fetchCentralBankRate();
  const loanType = options.loanType || 'creditCard';
  const weights = { ...config.WEIGHT_PRESETS[loanType] || config.WEIGHTS, ...options.weights };
  const thresholds = { ...config.THRESHOLDS, ...options.thresholds };
  const creditLimits = { ...config.CREDIT_LIMITS, ...options.creditLimits };
  const isSecuredCard = options.isSecuredCard || false;
  const fetchExternalData = options.fetchExternalData || false;
  const enableMonitoring = options.enableMonitoring || false;

  // Snapshot versioning
  const snapshot = {
    version: 'v1.5.8',
    timestamp: new Date().toISOString(),
    inputData: { ...data },
    options: { ...options },
    config: { ...config }
  };

  // Dynamic threshold adjustment
  let macroAdjustmentFactor = 1.0;
  if (options.macroConditions) {
    const { inflationRate = 0.02, unemploymentRate = 0.05 } = options.macroConditions;
    macroAdjustmentFactor = 1.0 + (inflationRate - 0.02) + (unemploymentRate - 0.05);
    macroAdjustmentFactor = Math.max(0.8, Math.min(1.2, macroAdjustmentFactor));
  }
  const dynamicDebtServiceThresholds = {
    excellent: config.DEBT_SERVICE_THRESHOLDS.excellent * macroAdjustmentFactor,
    good: config.DEBT_SERVICE_THRESHOLDS.good * macroAdjustmentFactor,
    fair: config.DEBT_SERVICE_THRESHOLDS.fair * macroAdjustmentFactor
  };
  const dynamicBankBalanceThresholds = {
    high: config.BANK_BALANCE_THRESHOLDS.high * macroAdjustmentFactor,
    medium: config.BANK_BALANCE_THRESHOLDS.medium * macroAdjustmentFactor,
    low: config.BANK_BALANCE_THRESHOLDS.low
  };

  // Input destructuring (convert ETB to USD)
  const {
    phoneNumber = '',
    monthlyIncome = 0,
    monthlyDebtPayments = 0,
    monthlyExpenses = 0,
    averageDailyBalance = 0,
    utilityPayments = 0,
    rentPayments = 0,
    employmentStability = 'unstable',
    jobTenureMonths = 0,
    financialLiteracyScore = 0,
    industryRisk = 'high',
    loanPurpose = 'discretionary',
    savingsConsistencyScore = 0,
    cashFlowStability = 0,
    downPayment = 0,
    collateralValue = isSecuredCard ? downPayment : 0,
    collateralLiquidity = isSecuredCard ? 'high' : 'low',
    collateralType = isSecuredCard ? 'securedDeposit' : 'other',
    interestRate = 0.18,
    loanTermMonths = 12,
    macroRiskLevel = 'medium',
    sectorRisk = 'medium',
    bankruptcies = 0,
    legalIssues = 0,
    residenceStabilityMonths = 0,
    jobHopsInLast2Years = 0,
    behavioralRedFlags = [],
    paymentHistory = [],
    utilizationRate = 0
  } = {
    ...data,
    monthlyIncome: data.monthlyIncome * config.CURRENCY_CONVERSION.ETB_TO_USD,
    monthlyDebtPayments: data.monthlyDebtPayments * config.CURRENCY_CONVERSION.ETB_TO_USD,
    monthlyExpenses: data.monthlyExpenses * config.CURRENCY_CONVERSION.ETB_TO_USD,
    averageDailyBalance: data.averageDailyBalance * config.CURRENCY_CONVERSION.ETB_TO_USD,
    downPayment: data.downPayment * config.CURRENCY_CONVERSION.ETB_TO_USD,
    collateralValue: (data.collateralValue || (isSecuredCard ? data.downPayment : 0)) * config.CURRENCY_CONVERSION.ETB_TO_USD
  };

  // Input validation with Zod
  performanceMetrics.components.validation = performance.now();
  try {
    inputSchema.parse(data);
    if (collateralValue > 0 && !collateralType) {
      throw new Error('collateralType required when collateralValue > 0');
    }
  } catch (error) {
    auditLog.errors.push(error.message || error.errors.map(e => e.message).join('; '));
    logger(auditLog);
    throw error;
  }
  performanceMetrics.components.validation = performance.now() - performanceMetrics.components.validation;

  /**
   * Handles zero-income applicants
   * @param {Object} data - Applicant data
   * @returns {Object} Scoring result for zero-income case
   */
  const handleNoIncomeScenario = (data) => {
    const result = {
      engine: '5C-Creditworthiness-ThinFile',
      version: 'v1.5.8',
      totalScore: 0,
      classification: 'Poor',
      recommendedCreditLimit: 0,
      disclosures: ['ZERO_INCOME_WARNING: Zero income detected; consider alternative income sources or secured card.'],
      breakdown: { capacity: 0, character: 0, capital: 0, collateral: 0, conditions: 0, externalData: 0, monitoring: 0 },
      weights,
      thresholds,
      creditLimits,
      loanType,
      input: data,
      explainable: true,
      timestamp: new Date().toISOString(),
      snapshot,
      performanceMetrics,
      notes: ['Zero income detected; scoring aborted.', 'Submit proof of alternative income sources to improve score.']
    };
    auditLog.result = result;
    logger(auditLog);
    return result;
  };

  if (monthlyIncome === 0) {
    return handleNoIncomeScenario(data);
  }

  // Memoization cache
  const memoCache = new Map();
  const memoize = (key, fn, deps) => {
    const cacheKey = JSON.stringify([key, ...deps]);
    if (memoCache.has(cacheKey)) return memoCache.get(cacheKey);
    const result = fn();
    memoCache.set(cacheKey, result);
    return result;
  };

  // Loan type adjustments
  const loanTypeAdjustments = {
    creditCard: { collateralWeightMultiplier: isSecuredCard ? 1 : 0, conditionsWeightMultiplier: 0.5 },
    personal: { collateralWeightMultiplier: 1, conditionsWeightMultiplier: 1 },
    mortgage: { collateralWeightMultiplier: 1.2, conditionsWeightMultiplier: 0.8 },
    business: { collateralWeightMultiplier: 0.8, conditionsWeightMultiplier: 1.2 }
  };
  const { collateralWeightMultiplier, conditionsWeightMultiplier } = loanTypeAdjustments[loanType] || loanTypeAdjustments.creditCard;

  // === Capacity (500) ===
  performanceMetrics.components.capacity = performance.now();
  const debtServiceRatio = memoize('debtServiceRatio', () => monthlyIncome > 0 ? monthlyDebtPayments / monthlyIncome : 1, [monthlyIncome, monthlyDebtPayments]);
  const disposableIncome = monthlyIncome - monthlyExpenses - monthlyDebtPayments;
  const debtServiceScore = debtServiceRatio <= dynamicDebtServiceThresholds.excellent ? 200 :
                          debtServiceRatio <= dynamicDebtServiceThresholds.good ? 150 :
                          debtServiceRatio <= dynamicDebtServiceThresholds.fair ? 100 : 50;
  const employmentScore = employmentStability === 'stable' ? 150 : employmentStability === 'moderate' ? 100 : 50;
  const industryScore = industryRisk === 'low' ? 50 : industryRisk === 'medium' ? 25 : 0;
  const cashFlowScore = disposableIncome > 2000 ? 50 : disposableIncome > 1000 ? 40 : disposableIncome > 0 ? 30 : 0;
  const averageDailyBalanceScore = averageDailyBalance >= dynamicBankBalanceThresholds.high ? 50 :
                                   averageDailyBalance >= dynamicBankBalanceThresholds.medium ? 30 : 10;
  const utilityPaymentScore = utilityPayments >= 0.95 ? 20 : utilityPayments >= 0.85 ? 10 : 0;
  const rentPaymentScore = rentPayments >= 0.95 ? 20 : rentPayments >= 0.85 ? 10 : 0;
  const capacityScore = Math.min(
    debtServiceScore + employmentScore + industryScore + cashFlowScore + averageDailyBalanceScore + utilityPaymentScore + rentPaymentScore,
    weights.capacity
  );
  performanceMetrics.components.capacity = performance.now() - performanceMetrics.components.capacity;

  // === Character (300) ===
  performanceMetrics.components.character = performance.now();
  const legalScore = (bankruptcies + legalIssues) > 0 ? 0 : 100;
  let residenceScore = residenceStabilityMonths >= 24 ? 60 : residenceStabilityMonths >= 12 ? 40 : 20;
  let jobStabilityScore = jobHopsInLast2Years === 0 ? 60 : jobHopsInLast2Years === 1 ? 40 : jobHopsInLast2Years === 2 ? 20 : 10;
  let financialLiteracyScorePoints = memoize('financialLiteracyScorePoints', () =>
    financialLiteracyScore >= config.FINANCIAL_LITERACY_THRESHOLDS.high ? 60 :
    financialLiteracyScore >= config.FINANCIAL_LITERACY_THRESHOLDS.medium ? 40 :
    financialLiteracyScore >= config.FINANCIAL_LITERACY_THRESHOLDS.low ? 20 : 0,
    [financialLiteracyScore]
  );
  if (monthlyIncome >= config.INCOME_THRESHOLD) {
    financialLiteracyScorePoints = Math.round(financialLiteracyScorePoints / 3); // Scale down to 0–20
    const redistributedPoints = (60 - financialLiteracyScorePoints) / 2; // Redistribute up to 40
    residenceScore = Math.min(residenceScore + redistributedPoints, 100);
    jobStabilityScore = Math.min(jobStabilityScore + redistributedPoints, 100);
  }
  const behavioralPenalty = behavioralRedFlags.reduce((sum, flag) => sum + (config.BEHAVIORAL_RED_FLAGS[flag] || 0), 0);
  const characterScore = Math.min(Math.max(0, legalScore + residenceScore + jobStabilityScore + financialLiteracyScorePoints - behavioralPenalty), weights.character);
  const verificationNotes = totalScore >= thresholds.veryGood ? ['Submit bank statements or receipts within 30 days to verify utility, rent, savings, and financial literacy data.'] : [];
  performanceMetrics.components.character = performance.now() - performanceMetrics.components.character;

  // === Capital (150) ===
  performanceMetrics.components.capital = performance.now();
  const savingsScore = savingsConsistencyScore >= config.SAVINGS_CONSISTENCY_THRESHOLDS.high ? 50 :
                       // FIX: Remove variable shadowing and ensure correct variable names for clarity
                       savingsConsistencyScore >= config.SAVINGS_CONSISTENCY_THRESHOLDS.medium ? 30 :
                       savingsConsistencyScore >= config.SAVINGS_CONSISTENCY_THRESHOLDS.low ? 20 : 10;
  const cashFlowCapitalScore = cashFlowStability >= config.CASH_FLOW_THRESHOLDS.high ? 40 :
                               cashFlowStability >= config.CASH_FLOW_THRESHOLDS.medium ? 25 :
                               cashFlowStability >= config.CASH_FLOW_THRESHOLDS.low ? 15 : 0;
  const averageDailyBalanceCapitalScore = averageDailyBalance >= 10000 ? 40 :
                                          averageDailyBalance >= 5000 ? 25 :
                                          averageDailyBalance >= 1000 ? 15 : 0;
  const capitalScore = Math.min(savingsScore + cashFlowCapitalScore + averageDailyBalanceCapitalScore, weights.capital);
  performanceMetrics.components.capital = performance.now() - performanceMetrics.components.capital;

  // === Collateral (25) ===
  performanceMetrics.components.collateral = performance.now();
  const collateralConfig = config.COLLATERAL_TYPES[collateralType] || config.COLLATERAL_TYPES.other;
  const ltv = collateralValue > 0 ? monthlyDebtPayments / collateralValue : 1;
  const ltvScore = ltv <= 1.0 ? collateralConfig.maxScore * 0.6 : collateralConfig.maxScore * 0.2;
  const liquidityScore = collateralLiquidity === 'high' ? collateralConfig.maxScore * 0.3 :
                        collateralLiquidity === 'medium' ? collateralConfig.maxScore * 0.2 : collateralConfig.maxScore * 0.1;
  const collateralScore = Math.min((ltvScore + liquidityScore) * collateralConfig.multiplier * collateralWeightMultiplier, weights.collateral);
  performanceMetrics.components.collateral = performance.now() - performanceMetrics.components.collateral;

  // === Conditions (25) ===
  performanceMetrics.components.conditions = performance.now();
  const termScore = loanTermMonths <= 12 ? 10 : loanTermMonths <= 24 ? 5 : 0;
  const macroScore = macroRiskLevel === 'low' ? 10 : macroRiskLevel === 'medium' ? 5 : 0;
  const sectorScore = sectorRisk === 'low' ? 5 : sectorRisk === 'medium' ? 3 : 0;
  const purposeScore = loanPurpose === 'productive' ? 5 : loanPurpose === 'neutral' ? 2 : 0;
  const conditionsScore = Math.min(termScore + macroScore + sectorScore + purposeScore, weights.conditions * conditionsWeightMultiplier);
  performanceMetrics.components.conditions = performance.now() - performanceMetrics.components.conditions;

  // === External Data (Mock) ===
  performanceMetrics.components.externalData = performance.now();
  let externalDataScore = 0;
  let externalDataNotes = [];
  if (fetchExternalData) {
    if (RATE_LIMIT.isRateLimited()) {
      externalDataNotes.push('Rate limit exceeded for external data fetch.');
      auditLog.errors.push('Rate limit exceeded for external data fetch.');
    } else if (CIRCUIT_BREAKER.isOpen()) {
      externalDataNotes.push('Circuit breaker open: External data fetch disabled.');
      auditLog.errors.push('Circuit breaker open: External data fetch disabled.');
    } else {
      RATE_LIMIT.recordCall();
      try {
        const mockExternalData = {
          consistentTransactions: averageDailyBalance > dynamicBankBalanceThresholds.medium,
          verifiedRentalHistory: rentPayments >= 0.95,
          consistentSavings: savingsConsistencyScore >= config.SAVINGS_CONSISTENCY_THRESHOLDS.medium,
          lowDebtPayments: debtServiceRatio <= dynamicDebtServiceThresholds.good,
          highFinancialLiteracy: financialLiteracyScore >= config.FINANCIAL_LITERACY_THRESHOLDS.medium
        };
        externalDataScore = (mockExternalData.consistentTransactions ? 10 : 0) +
                           (mockExternalData.verifiedRentalHistory ? 5 : 0) +
                           (mockExternalData.consistentSavings ? 5 : 0) +
                           (mockExternalData.lowDebtPayments ? 5 : 0) +
                           (mockExternalData.highFinancialLiteracy ? 5 : 0);
        externalDataNotes = [
          mockExternalData.consistentTransactions ? 'Added 10 points for consistent bank transactions.' : '',
          mockExternalData.verifiedRentalHistory ? 'Added 5 points for verified rental payment history.' : '',
          mockExternalData.consistentSavings ? 'Added 5 points for consistent savings behavior.' : '',
          mockExternalData.lowDebtPayments ? 'Added 5 points for low monthly debt payments.' : '',
          mockExternalData.highFinancialLiteracy ? 'Added 5 points for high financial literacy.' : ''
        ].filter(note => note);
        CIRCUIT_BREAKER.recordSuccess();
      } catch (error) {
        CIRCUIT_BREAKER.recordFailure();
        auditLog.errors.push(`External data fetch failed: ${error.message}`);
        externalDataNotes.push('External data fetch failed.');
      }
    }
  }
  performanceMetrics.components.externalData = performance.now() - performanceMetrics.components.externalData;

  // === Monitoring ===
  performanceMetrics.components.monitoring = performance.now();
  let monitoringAdjustment = 0;
  let monitoringNotes = [];
  if (enableMonitoring && paymentHistory.length > 0) {
    const recentPayments = paymentHistory.slice(-3);
    const onTimeRate = recentPayments.filter(p => p.onTime).length / recentPayments.length;
    monitoringAdjustment = onTimeRate >= 0.9 ? 10 : onTimeRate >= 0.7 ? 5 : -5;
    if (utilizationRate > 0.3) monitoringAdjustment -= 5;
    monitoringNotes = [
      onTimeRate >= 0.9 ? 'Added 10 points for excellent payment history.' :
      onTimeRate >= 0.7 ? 'Added 5 points for good payment history.' :
      'Deducted 5 points for poor payment history.',
      utilizationRate > 0.3 ? 'Deducted 5 points for high utilization rate.' : 'Utilization rate within recommended range.',
      'Enable autopay to ensure on-time payments.',
      'Monitor utilization and send alerts if above 30%.'
    ];
  } else if (enableMonitoring) {
    const proxyPaymentHistory = (utilityPayments + rentPayments) / 2;
    monitoringAdjustment = proxyPaymentHistory >= 0.9 ? 10 : proxyPaymentHistory >= 0.7 ? 5 : -5;
    monitoringNotes = [
      proxyPaymentHistory >= 0.9 ? 'Added 10 points for strong utility/rent payment history.' :
      proxyPaymentHistory >= 0.7 ? 'Added 5 points for good utility/rent payment history.' :
      'Deducted 5 points for poor utility/rent payment history.',
      'Submit bank statements or receipts to verify payment history.'
    ];
  }
  performanceMetrics.components.monitoring = performance.now() - performanceMetrics.components.monitoring;

  // === Final Score & Classification ===
  performanceMetrics.components.finalCalculation = performance.now();
  const totalScore = Math.round(capacityScore + characterScore + capitalScore + collateralScore + conditionsScore + externalDataScore + monitoringAdjustment);

  let classification = 'Poor';
  if (totalScore >= thresholds.excellent) classification = 'Excellent';
  else if (totalScore >= thresholds.veryGood) classification = 'Very Good';
  else if (totalScore >= thresholds.good) classification = 'Good';
  else if (totalScore >= thresholds.fair) classification = 'Fair';

  // === Credit Limit Recommendation (in ETB) ===
  const recommendedCreditLimitUSD = isSecuredCard ? Math.min(
    Math.max(collateralValue, config.SECURED_CARD_MIN_DEPOSIT),
    config.SECURED_CARD_MAX_DEPOSIT
  ) : (
    totalScore >= thresholds.excellent ? creditLimits.excellent :
    totalScore >= thresholds.veryGood ? creditLimits.veryGood :
    totalScore >= thresholds.good ? creditLimits.good :
    totalScore >= thresholds.fair ? creditLimits.fair : creditLimits.poor
  );
  const adjustedCreditLimitUSD = enableMonitoring ? recommendedCreditLimitUSD * (1 + (monitoringAdjustment / 100)) : recommendedCreditLimitUSD;
  const adjustedCreditLimitETB = Math.round(adjustedCreditLimitUSD / config.CURRENCY_CONVERSION.ETB_TO_USD);

  // === Compliance Disclosures ===
  const disclosures = [];
  if (totalScore < thresholds.fair) disclosures.push('LOW_SCORE_NOTICE: Consider a secured card to build credit.');
  if (debtServiceRatio > dynamicDebtServiceThresholds.fair) disclosures.push('HIGH_DEBT_SERVICE_WARNING: High monthly debt payments relative to income detected.');
  if (isSecuredCard) disclosures.push('SECURED_CARD_DISCLOSURE: Credit limit equals refundable deposit.');
  if (monitoringAdjustment < 0) disclosures.push('MONITORING_WARNING: Poor utility/rent payment history detected.');
  if (monthlyIncome >= config.INCOME_THRESHOLD) disclosures.push('HIGH_INCOME_ADJUSTMENT: Financial literacy score contribution reduced due to high income.');
  if (totalScore >= thresholds.veryGood) disclosures.push('VERIFICATION_REQUIRED: Submit bank statements or receipts within 30 days to verify data.');

  performanceMetrics.components.finalCalculation = performance.now() - performanceMetrics.components.finalCalculation;

  // === Finalize Audit Log and Performance Metrics ===
  auditLog.result = {
    totalScore,
    classification,
    recommendedCreditLimit: adjustedCreditLimitETB,
    disclosures,
    breakdown: {
      capacity: capacityScore,
      character: characterScore,
      capital: capitalScore,
      collateral: collateralScore,
      conditions: conditionsScore,
      externalData: externalDataScore,
      monitoring: monitoringAdjustment
    }
  };
  performanceMetrics.total = performance.now() - performanceMetrics.startTime;
  logger(auditLog);

  return {
    engine: '5C-Creditworthiness-ThinFile',
    version: 'v1.5.8',
    totalScore,
    classification,
    recommendedCreditLimit: adjustedCreditLimitETB,
    disclosures,
    breakdown: {
      capacity: capacityScore,
      character: characterScore,
      capital: capitalScore,
      collateral: collateralScore,
      conditions: conditionsScore,
      externalData: externalDataScore,
      monitoring: monitoringAdjustment
    },
    weights,
    thresholds,
    creditLimits,
    loanType,
    input: data,
    explainable: true,
    timestamp: new Date().toISOString(),
    snapshot,
    performanceMetrics,
    notes: [
      'Adjusted for thin-file borrowers with limited credit history in Ethiopia.',
      `Currency rate used: 1 USD = ${1 / config.CURRENCY_CONVERSION.ETB_TO_USD} ETB.`,
      'Inputs accepted in Ethiopian Birr (ETB), converted to USD for scoring.',
      'Capacity and Character heavily weighted due to lack of credit data.',
      isSecuredCard ? 'Secured card: Credit limit equals deposit, refundable upon account closure.' : 'Unsecured card: Low credit limit recommended for thin-file borrowers.',
      'Make on-time payments (100% impact on future credit score) and keep utilization below 30% to build credit.',
      'Report activity to local banks to establish credit history.',
      'Enable autopay and spending alerts to manage your card responsibly.',
      `Macroeconomic adjustment factor: ${macroAdjustmentFactor.toFixed(2)} based on provided conditions.`,
      'Average daily balance and savings consistency score used to prevent manipulation.',
      'Monthly debt payments used to assess ongoing repayment obligations.',
      monthlyIncome >= config.INCOME_THRESHOLD ? 'Financial literacy score contribution reduced due to high monthly income.' : 'Financial literacy score based on user-reported budgeting and payment behavior.',
      'Utility and rent payment history used as proxy for payment monitoring.',
      'Cultural context: Informal employment common in Ethiopia; employmentStability may reflect self-employment or cash-based jobs.',
      'Cultural context: Cash-based utility and rent payments common; verification via receipts or bank statements critical.',
      ...externalDataNotes,
      ...monitoringNotes,
      ...verificationNotes
    ]
  };
}

// Snapshot testing setup (for Jest)
if (typeof jest !== 'undefined') {
  describe('calculateCreditworthiness', () => {
    it('should calculate score correctly for sample input', () => {
      const data = {
        monthlyIncome: 834000, // ~$6,000 USD
        monthlyDebtPayments: 27800, // ~$200 USD
        monthlyExpenses: 194600, // ~$1,400 USD
        averageDailyBalance: 347500, // ~$2,500 USD
        utilityPayments: 0.833,
        rentPayments: 1.0,
        employmentStability: 'moderate',
        financialLiteracyScore: 69.16,
        industryRisk: 'medium',
        loanPurpose: 'neutral',
        savingsConsistencyScore: 66.67,
        cashFlowStability: 65,
        collateralValue: 0,
        collateralLiquidity: 'low',
        collateralType: 'other',
        residenceStabilityMonths: 12,
        jobHopsInLast2Years: 1,
        behavioralRedFlags: [],
        paymentHistory: [],
        utilizationRate: 0
      };
      const options = {
        loanType: 'creditCard',
        isSecuredCard: false,
        fetchExternalData: true,
        enableMonitoring: true,
        currencyRate: 1 / 139,
        macroConditions: { inflationRate: 0.02, unemploymentRate: 0.05 }
      };
      const result = calculateCreditworthiness(data, options);
      expect(result).toMatchSnapshot();
    });
    it('should handle zero-income scenario', () => {
      const data = { monthlyIncome: 0, monthlyDebtPayments: 0, monthlyExpenses: 0, averageDailyBalance: 0 };
      const result = calculateCreditworthiness(data, { loanType: 'creditCard' });
      expect(result.totalScore).toBe(0);
      expect(result.disclosures).toContain('ZERO_INCOME_WARNING: Zero income detected; consider alternative income sources or secured card.');
    });
  });
} 