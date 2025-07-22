import CreditReport from '../models/CreditReport.js';
import { validationResult } from 'express-validator';
import { evaluateLendingDecision } from '../utils/lendingDecision.js';
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

/**
 * @desc    Make a loan decision based on credit data
 * @route   POST /api/v1/loans/decisions
 * @access  Private
 */
const makeLoanDecision = async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400, { errors: errors.array() }));
  }

  const { borrowerId, loanAmount, loanTerm, interestRate, useAI = false } = req.body;

  try {
    // Get the borrower's credit data
    const creditData = await CreditReport.findOne({ userId: borrowerId });
    
    if (!creditData) {
      return next(new AppError('Credit data not found for this user', 404));
    }

    // Extract scoreData and userData for the lending decision engine
    const scoreData = {
      score: creditData.creditScore || creditData.ficoScore || 0,
      classification: creditData.classification || undefined
    };
    const userData = {
      recentDefaults: creditData.latePayments90 || 0,
      consecutiveMissedPayments: creditData.latePayments60 || 0,
      missedPaymentsLast12: creditData.latePayments30 || 0,
      recentLoanApplications: creditData.recentLoanApplications || 0,
      activeLoanCount: creditData.activeLoanCount || 0,
      onTimeRateLast6Months: creditData.onTimeRateLast6Months || 1,
      monthsSinceLastDelinquency: creditData.monthsSinceLastDelinquency || 999
      // ...add any other fields you want to use
    };

    // Use the lending decision engine
    const decision = evaluateLendingDecision(scoreData, userData);

    // Map approvedAmount to maxLoanAmount for frontend compatibility
    if (decision.offer?.maxAmount) {
      decision.maxLoanAmount = decision.offer.maxAmount;
    } else if (decision.approvedAmount) {
      decision.maxLoanAmount = decision.approvedAmount;
    } else if (decision.approved === false) {
      // For rejected loans, set maxLoanAmount to 0
      decision.maxLoanAmount = 0;
    } else {
      // Fallback for any other case
      decision.maxLoanAmount = 0;
    }

    // Prepare response using the engine's recommendation
    const response = {
      success: true,
      data: {
        approved: decision.decision === 'Approve',
        creditScore: scoreData.score,
        decision: decision.decision,
        reasons: decision.reasons,
        recommendation: decision.recommendation,
        terms: decision.recommendation ? {
          amount: decision.recommendation.maxLoanAmount,
          term: decision.recommendation.termMonths,
          interestRate: decision.recommendation.interestRate,
          monthlyPayment: calculateMonthlyPayment(
            decision.recommendation.maxLoanAmount,
            decision.recommendation.termMonths,
            decision.recommendation.interestRate
          )
        } : null,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Loan decision error:', error);
    next(new AppError('Server error during loan decision processing', 500, { details: error.message }));
  }
};

export {
  makeLoanDecision
};
