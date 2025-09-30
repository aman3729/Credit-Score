import { evaluateLendingDecision } from '../utils/lendingDecision.js';
import PartnerBank from '../models/PartnerBank.js';
import bankConfigService from '../services/bankConfigService.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';

/**
 * Calculate monthly payment for a loan
 */
function calculateMonthlyPayment(amount, term, annualRate) {
  if (annualRate <= 0) return amount / term;
  
  const monthlyRate = annualRate / 12 / 100;
  const payment = (amount * monthlyRate * Math.pow(1 + monthlyRate, term)) / 
                  (Math.pow(1 + monthlyRate, term) - 1);
  
  return parseFloat(payment.toFixed(2));
}

// Make loan decision with bank-specific configuration
export const makeLoanDecision = catchAsync(async (req, res, next) => {
  const { scoreData, userData } = req.body;

  if (!scoreData || !userData) {
    return next(new AppError('Score data and user data are required', 400));
  }

  // Get user's bank code
  const bankCode = req.user.bankId;
  if (!bankCode) {
    return next(new AppError('User is not associated with any bank', 400));
    }

  try {
    // Pass bank code to the lending decision engine
    const decision = await evaluateLendingDecision(scoreData, userData, bankCode);

    res.status(200).json({
      status: 'success',
      data: decision
    });
  } catch (error) {
    console.error('Loan decision error:', error);
    return next(new AppError(`Loan decision failed: ${error.message}`, 500));
  }
});

// Get available loan terms based on bank configuration
export const getAvailableTerms = catchAsync(async (req, res, next) => {
  const { productType = 'personal' } = req.query;
  
  // Get user's bank code
  const bankCode = req.user.bankId;
  if (!bankCode) {
    return next(new AppError('User is not associated with any bank', 400));
  }

  try {
    // Get bank configuration
    const bankConfig = await bankConfigService.getBankConfig(bankCode);
    
    // Get terms from lending policy or legacy config
    const terms = bankConfig.lendingPolicy?.termOptions || 
                  bankConfig.legacyConfig?.termOptions?.[productType] || 
                  [12, 24, 36, 48];

    res.status(200).json({
      status: 'success',
      data: {
        bankCode,
        productType,
        terms
      }
    });
  } catch (error) {
    return next(new AppError(`Failed to get available terms: ${error.message}`, 500));
  }
});

// Get loan calculator with bank-specific rates
export const getLoanCalculator = catchAsync(async (req, res, next) => {
  const { amount, term, productType = 'personal' } = req.query;
  
  // Get user's bank code
  const bankCode = req.user.bankId;
  if (!bankCode) {
    return next(new AppError('User is not associated with any bank', 400));
  }

  try {
    // Get bank configuration
    const bankConfig = await bankConfigService.getBankConfig(bankCode);
    
    // Get base rate from lending policy
    const baseRate = bankConfig.lendingPolicy?.interestRateRules?.baseRate || 12.5;
    const maxRate = bankConfig.lendingPolicy?.interestRateRules?.maxRate || 35.99;

    // Calculate monthly payment
    const monthlyRate = baseRate / 100 / 12;
    const monthlyPayment = (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -term));
    const totalInterest = (monthlyPayment * term) - amount;

    res.status(200).json({
      status: 'success',
      data: {
        bankCode,
        amount: parseFloat(amount),
        term: parseInt(term),
        productType,
        baseRate,
        maxRate,
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        totalPayment: Math.round((monthlyPayment * term) * 100) / 100
      }
    });
  } catch (error) {
    return next(new AppError(`Failed to calculate loan: ${error.message}`, 500));
  }
});

// Get bank-specific loan limits
export const getLoanLimits = catchAsync(async (req, res, next) => {
  const { productType = 'personal' } = req.query;
  
  // Get user's bank code
  const bankCode = req.user.bankId;
  if (!bankCode) {
    return next(new AppError('User is not associated with any bank', 400));
  }

  try {
    // Get bank configuration
    const bankConfig = await bankConfigService.getBankConfig(bankCode);
    
    // Get limits from lending policy or legacy config
    const baseAmounts = bankConfig.lendingPolicy?.baseLoanAmounts || 
                       bankConfig.legacyConfig?.loanAmounts?.[productType] || 
                       { EXCELLENT: 100000, VERY_GOOD: 75000, GOOD: 50000, FAIR: 30000, POOR: 10000 };

    const incomeMultipliers = bankConfig.lendingPolicy?.incomeMultipliers || 
                             bankConfig.legacyConfig?.dtiRules?.incomeMultipliers || 
                             { EXCELLENT: 10, VERY_GOOD: 8, GOOD: 6, FAIR: 4, POOR: 2 };

    res.status(200).json({
      status: 'success',
      data: {
        bankCode,
        productType,
        baseAmounts,
        incomeMultipliers
      }
    });
  } catch (error) {
    return next(new AppError(`Failed to get loan limits: ${error.message}`, 500));
  }
});
