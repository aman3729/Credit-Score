import CreditReport from '../models/CreditReport.js';
import { validationResult } from 'express-validator';
import { evaluateLendingDecision } from '../utils/lendingDecision.js';

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
    return res.status(400).json({ errors: errors.array() });
  }

  const { borrowerId, loanAmount, loanTerm, interestRate, useAI = false } = req.body;

  try {
    // Get the borrower's credit data
    const creditData = await CreditReport.findOne({ userId: borrowerId });
    
    if (!creditData) {
      return res.status(404).json({ 
        success: false,
        error: 'Credit data not found for this user' 
      });
    }

    // Convert credit data to the format expected by evaluateLendingDecision
    const userData = {
      ...creditData.toObject(),
      totalDebt: creditData.outstandingDebt || 0,
      monthlyIncome: creditData.monthlyIncome || 0,
      recentMissedPayments: creditData.latePayments30 || 0,
      recentDefaults: creditData.latePayments90 || 0
    };

    // Use the existing lending decision engine
    const decision = evaluateLendingDecision(userData);
    
    // Determine if approved based on the decision
    const approved = decision.decision === 'Approve';
    const maxLoanAmount = creditData.monthlyIncome * 12 * 0.36; // 36% DTI

    // Prepare response
    const response = {
      success: true,
      data: {
        approved,
        creditScore: decision.scoreData?.score || 0,
        dti: (userData.totalDebt / (userData.monthlyIncome * 12)) || 0,
        maxLoanAmount: parseFloat(maxLoanAmount.toFixed(2)),
        message: decision.reasons.join('. '),
        decision: decision.decision,
        reasons: decision.reasons,
        recommendations: decision.recommendations,
        terms: {
          amount: parseFloat(loanAmount.toFixed(2)),
          term: loanTerm,
          interestRate: parseFloat(interestRate.toFixed(2)),
          monthlyPayment: calculateMonthlyPayment(loanAmount, loanTerm, interestRate)
        },
        scoreData: decision.scoreData,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Loan decision error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during loan decision processing',
      details: error.message
    });
  }
};

export { makeLoanDecision };
