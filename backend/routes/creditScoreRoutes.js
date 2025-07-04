import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import CreditScore from '../models/CreditScore.js';
import User from '../models/User.js';
import { 
  calculateCreditScore,
  saveCreditScore,
  getCreditReport,
  updateCreditReport,
  getAllCreditReports,
  getCreditScoreHistory,
  getCreditScoreStatistics
} from '../controllers/creditScoreController.js';
import { logger } from '../config/logger.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import { generateReasoning, generateScoreBreakdownReasoning, generateLendingReasoning, generateImprovementSuggestions } from '../utils/reasoningEngine.js';
import LoanDecision from '../models/LoanDecision.js';

const router = express.Router();

// ========================
// Credit Score Calculation
// ========================

/**
 * @desc    Calculate a credit score
 * @route   POST /api/v1/credit-scores/calculate
 * @access  Private
 */
router.post('/calculate', protect, calculateCreditScore);

/**
 * @desc    Save a credit score
 * @route   POST /api/v1/credit-scores
 * @access  Private
 */
router.post('/', protect, saveCreditScore);

// ========================
// Reasoning Engine Endpoints
// ========================

/**
 * @desc    Generate credit reasoning and insights
 * @route   POST /api/v1/credit-scores/reasoning
 * @access  Private
 */
router.post('/reasoning', protect, catchAsync(async (req, res, next) => {
  const { userData, scoreResult, lendingDecision } = req.body;
  
  if (!userData || !scoreResult) {
    return next(new AppError('Missing required data: userData and scoreResult are required', 400));
  }

  // Generate comprehensive reasoning
  const reasoning = generateReasoning(userData, scoreResult, lendingDecision);
  
  res.json({
    status: 'success',
    data: reasoning
  });
}));

/**
 * @desc    Generate score breakdown reasoning
 * @route   POST /api/v1/credit-scores/breakdown-reasoning
 * @access  Private
 */
router.post('/breakdown-reasoning', protect, catchAsync(async (req, res, next) => {
  const { breakdown } = req.body;
  
  if (!breakdown) {
    return next(new AppError('Missing breakdown data', 400));
  }

  const analysis = generateScoreBreakdownReasoning(breakdown);
  
  res.json({
    status: 'success',
    data: analysis
  });
}));

/**
 * @desc    Generate lending decision reasoning
 * @route   POST /api/v1/credit-scores/lending-reasoning
 * @access  Private
 */
router.post('/lending-reasoning', protect, catchAsync(async (req, res, next) => {
  const { lendingDecision, userData } = req.body;
  
  if (!lendingDecision || !userData) {
    return next(new AppError('Missing required data: lendingDecision and userData are required', 400));
  }

  const reasoning = generateLendingReasoning(lendingDecision, userData);
  
  res.json({
    status: 'success',
    data: reasoning
  });
}));

/**
 * @desc    Generate improvement suggestions
 * @route   POST /api/v1/credit-scores/improvement-suggestions
 * @access  Private
 */
router.post('/improvement-suggestions', protect, catchAsync(async (req, res, next) => {
  const { userData, scoreResult } = req.body;
  
  if (!userData || !scoreResult) {
    return next(new AppError('Missing required data: userData and scoreResult are required', 400));
  }

  const suggestions = generateImprovementSuggestions(userData, scoreResult);
  
  res.json({
    status: 'success',
    data: suggestions
  });
}));

// ========================
// Credit Score Management
// ========================

/**
 * @desc    Get credit score for a user
 * @route   GET /api/v1/credit-scores/:userId
 * @access  Private
 */
router.get('/:userId', protect, catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  
  // Check if the user is authorized to access this data
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return next(new AppError('Not authorized to access this credit score', 403));
  }

  // Find or create a credit score record for the user
  let creditScore = await CreditScore.findOne({ userId });
  
  if (!creditScore) {
    // Create a new credit score record with default values if it doesn't exist
    creditScore = new CreditScore({
      userId,
      score: 700, // Default score
      factors: [
        { name: 'Payment History', score: 35, status: 'good' },
        { name: 'Credit Utilization', score: 30, status: 'good' },
        { name: 'Credit History Length', score: 15, status: 'fair' },
        { name: 'Credit Mix', score: 10, status: 'fair' },
        { name: 'New Credit', score: 10, status: 'good' }
      ],
      history: [
        { date: new Date(), score: 700, change: 0 }
      ]
    });
    
    await creditScore.save();
  }

  // Prepare response with lending decision data
  const response = {
    score: creditScore.score,
    factors: creditScore.factors,
    history: creditScore.history,
    lendingDecision: creditScore.lendingDecision ? {
      decision: creditScore.lendingDecision.decision,
      reasons: creditScore.lendingDecision.reasons || [],
      recommendations: creditScore.lendingDecision.recommendations || [],
      evaluatedAt: creditScore.lendingDecision.evaluatedAt
    } : null
  };

  res.json(response);
}));

/**
 * @desc    Update credit score for a user
 * @route   PUT /api/v1/credit-scores/:userId
 * @access  Private
 */
router.put('/:userId', protect, catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { score } = req.body;

  // Check if the user is authorized to update this data
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return next(new AppError('Not authorized to update this credit score', 403));
  }

  if (typeof score !== 'number' || score < 300 || score > 850) {
    return next(new AppError('Invalid credit score. Must be between 300 and 850.', 400));
  }

  let creditScore = await CreditScore.findOne({ userId });
  
  if (!creditScore) {
    creditScore = new CreditScore({ userId });
  }

  // Store the previous score to calculate change
  const previousScore = creditScore.score || 700;
  const change = score - previousScore;
  
  // Update the score and add to history
  creditScore.score = score;
  creditScore.history.push({
    date: new Date(),
    score,
    change
  });
  
  // Keep only the last 12 months of history
  if (creditScore.history.length > 12) {
    creditScore.history = creditScore.history.slice(-12);
  }
  
  await creditScore.save();
  
  res.json({ 
    status: 'success',
    data: {
      score: creditScore.score,
      change,
      history: creditScore.history
    }
  });
}));

// ========================
// Credit Reports
// ========================

/**
 * @desc    Get all credit reports (admin only)
 * @route   GET /api/v1/credit-scores/reports
 * @access  Private/Admin
 */
router.get('/reports', protect, authorize('admin'), getAllCreditReports);

/**
 * @desc    Get or create a credit report for a user
 * @route   GET /api/v1/credit-scores/reports/:userId
 * @access  Private
 */
router.get('/reports/:userId', protect, getCreditReport);

/**
 * @desc    Update a credit report (admin only)
 * @route   PATCH /api/v1/credit-scores/reports/:userId
 * @access  Private/Admin
 */
router.patch('/reports/:userId', protect, authorize('admin'), updateCreditReport);

// ========================
// Credit Score History & Analytics
// ========================

/**
 * @desc    Get credit score history for a user
 * @route   GET /api/v1/credit-scores/history/:userId
 * @access  Private
 */
router.get('/history/:userId', protect, getCreditScoreHistory);

/**
 * @desc    Get credit score statistics (admin only)
 * @route   GET /api/v1/credit-scores/statistics
 * @access  Private/Admin
 */
router.get('/statistics', protect, authorize('admin'), getCreditScoreStatistics);

router.get('/decision/:phone', async (req, res) => {
  try {
    const user = await User.findOne({ phoneNumber: req.params.phone });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const loanDecision = await LoanDecision.findOne({ userId: user._id });
    // Extract loanOffer fields if present
    let loanOffer = null;
    if (loanDecision?.decision?.recommendation) {
      const rec = loanDecision.decision.recommendation;
      loanOffer = {
        amount: rec.maxLoanAmount,
        rate: rec.interestRate,
        term: rec.termMonths,
        monthlyPayment: rec.monthlyPayment || loanDecision.decision.monthlyPayment
      };
    }
    // Log for debugging
    console.log('LoanDecision for user:', user.phoneNumber, JSON.stringify(loanDecision, null, 2));
    console.log('Extracted loanOffer:', loanOffer);
    // Generate insight
    let insight = '';
    try {
      insight = generateLendingReasoning(loanDecision?.decision, user.toObject());
    } catch (e) {
      insight = loanDecision?.decision?.reasons?.[0] || '';
    }
    res.json({
      user: user.phoneNumber,
      score: loanDecision?.creditScore,
      decision: loanDecision?.decision?.decision,
      loanOffer,
      riskFlags: loanDecision?.decision?.riskFlags,
      insight
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
