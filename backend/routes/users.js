import express from 'express';
import mongoose from 'mongoose';
import { protect, authorize } from '../middleware/auth.js';
import { check, body } from 'express-validator';
import User from '../models/User.js';
import CreditScore from '../models/CreditScore.js';
import { logger } from '../config/logger.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import { getAllLenderAccessHistory } from '../controllers/userController.js';

const router = express.Router();

// @desc    Search users by email, name, or ID
// @route   GET /api/v1/users/search
// @access  Private
router.get(
  '/search',
  protect,
  catchAsync(async (req, res, next) => {
    const { query } = req.query;
    
    if (!query) {
      return next(new AppError('Search query is required', 400));
    }

    // Check if query is a valid ObjectId
    const isObjectId = mongoose.Types.ObjectId.isValid(query);
    
    // Build search query
    const searchQuery = {
      $or: [
        { email: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }
      ]
    };

    // If query is a valid ObjectId, also search by _id
    if (isObjectId) {
      searchQuery.$or.push({ _id: new mongoose.Types.ObjectId(query) });
    }

    // Find users matching the search query
    const users = await User.find(searchQuery, {
      password: 0,
      __v: 0,
      refreshToken: 0,
      resetPasswordToken: 0,
      resetPasswordExpires: 0
    }).limit(10);

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
  })
);

// @desc    Get all users (Admin only)
// @route   GET /api/v1/users
// @access  Private/Admin
router.get(
  '/',
  protect,
  authorize('admin'),
  catchAsync(async (req, res, next) => {
    const users = await User.find({}).select('-password');
    
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users,
      },
    });
  })
);

// Admin: get all lenders (for dropdown)
router.get('/lenders', protect, async (req, res, next) => {
  try {
    const lenders = await User.find({ role: 'lender' }).select('_id name email');
    res.status(200).json({ status: 'success', data: lenders });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch lenders' });
  }
});
// Admin: get all lender access history (global)
router.get('/lenders/all/access-history', protect, getAllLenderAccessHistory);

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private
router.get(
  '/:id',
  protect,
  catchAsync(async (req, res, next) => {
    // Regular users can only access their own profile, admins can access any
    if (req.params.id !== req.user.id && req.user.role !== 'admin') {
      return next(
        new AppError('You are not authorized to view this user', 403)
      );
    }

    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return next(new AppError('No user found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  })
);

// @desc    Update user
// @route   PATCH /api/v1/users/:id
// @access  Private
router.patch(
  '/:id',
  protect,
  [
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail(),
    body('phone').optional().trim(),
    body('address').optional().trim(),
    body('city').optional().trim(),
    body('state').optional().trim(),
    body('zipCode').optional().trim(),
    body('country').optional().trim(),
    body('dateOfBirth').optional().isISO8601(),
    body('ssn').optional().trim(),
  ],
  catchAsync(async (req, res, next) => {
    // Check if user is updating their own profile or is an admin
    if (req.params.id !== req.user.id && req.user.role !== 'admin') {
      return next(
        new AppError('You are not authorized to update this user', 403)
      );
    }

    // Remove password and role from req.body to prevent updating them here
    const { password, role, ...updateData } = req.body;

    // If user is not admin, remove restricted fields
    if (req.user.role !== 'admin') {
      delete updateData.role;
      delete updateData.isEmailVerified;
      delete updateData.isActive;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).select('-password');

    if (!user) {
      return next(new AppError('No user found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  })
);

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
router.delete(
  '/:id',
  protect,
  authorize('admin'),
  catchAsync(async (req, res, next) => {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return next(new AppError('No user found with that ID', 404));
    }

    // Also delete user's credit scores
    await CreditScore.deleteMany({ user: req.params.id });

    res.status(204).json({
      status: 'success',
      data: null,
    });
  })
);

// @desc    Get user's credit scores
// @route   GET /api/v1/users/:userId/credit-scores
// @access  Private
router.get(
  '/:userId/credit-scores',
  protect,
  catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    const { id: requestingUserId, role } = req.user;
    
    console.log(`Credit scores requested for user ${userId} by ${requestingUserId} (${role})`);
    
    // Check if user is accessing their own data or is an admin
    if (userId !== requestingUserId && role !== 'admin') {
      console.log(`Unauthorized access attempt: User ${requestingUserId} tried to access scores for ${userId}`);
      return next(
        new AppError('You are not authorized to access this resource', 403)
      );
    }

    console.log(`Looking up credit scores for user: ${userId}`);
    const creditScores = await CreditScore.find({ user: userId })
      .sort('-createdAt')
      .limit(12) // Get last 12 months
      .lean();

    console.log(`Found ${creditScores.length} credit scores for user ${userId}`);
    
    // Log first score details if available
    if (creditScores.length > 0) {
      console.log('Sample score:', {
        id: creditScores[0]._id,
        score: creditScores[0].score,
        date: creditScores[0].createdAt,
        user: creditScores[0].user
      });
    }

    res.status(200).json({
      status: 'success',
      results: creditScores.length,
      data: {
        creditScores,
      },
    });
  })
);

// @desc    Update user password
// @route   PATCH /api/v1/users/update-password
// @access  Private
router.patch(
  '/update-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
      .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
      .matches(/[0-9]/).withMessage('Password must contain a number')
      .matches(/[^A-Za-z0-9]/).withMessage('Password must contain a special character'),
  ],
  catchAsync(async (req, res, next) => {
    // 1) Get user from collection
    const user = await User.findById(req.user.id).select('+password');

    // 2) Check if POSTed current password is correct
    if (!(await user.matchPassword(req.body.currentPassword, user.password))) {
      return next(new AppError('Your current password is wrong.', 401));
    }

    // 3) If so, update password
    user.password = req.body.newPassword;
    await user.save();

    // 4) Log user in, send JWT
    const token = user.getSignedJwtToken();

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  })
);

// @desc    Get user's credit data and scores (with scoreResult)
// @route   GET /api/v1/users/:userId/credit-data
// @access  Private
router.get(
  '/:userId/credit-data',
  protect,
  catchAsync(async (req, res, next) => {
    console.log('DEBUG: /api/v1/users/:userId/credit-data route HIT', { params: req.params, user: req.user });
    const { userId } = req.params;
    // Only allow self or admin
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('You are not authorized to view this user', 403));
    }
    // Find user
    const user = await User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpire -__v').lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    // Get latest credit report
    const creditReport = await mongoose.model('CreditReport').findOne({ userId: user._id }).sort({ 'creditScore.fico.lastUpdated': -1, lastUpdated: -1 }).lean();
    if (!creditReport || !creditReport.creditScore?.fico) {
      return res.json({
        success: true,
        data: {
          user: { ...user, creditScore: null, creditScoreLastUpdated: null },
          creditScores: [],
          currentScore: null,
          factors: []
        }
      });
    }
    // Get all credit reports for history
    const creditReports = await mongoose.model('CreditReport').find({ userId: user._id }).sort({ 'creditScore.fico.lastUpdated': 1, lastUpdated: 1, createdAt: 1 }).lean();
    const creditScores = creditReports.map((report, index, array) => {
      const score = report.creditScore.fico.score;
      const date = new Date(report.creditScore.fico.lastUpdated || report.lastUpdated || report.createdAt || new Date());
      const prevScore = index > 0 ? array[index - 1]?.creditScore?.fico?.score : null;
      const change = prevScore !== null ? score - prevScore : 0;
      return {
        score,
        date: date.toISOString(),
        change: Math.round(change * 100) / 100,
        reportId: report._id,
        factors: report.creditScore?.factors || report.factors || []
      };
    });
    // Prepare response
    const responseData = {
      success: true,
      data: {
        user,
        creditScores,
        currentScore: creditReport.creditScore.fico.score,
        factors: creditReport.factors || [],
        creditReport: {
          id: creditReport._id,
          lastUpdated: creditReport.lastUpdated || new Date().toISOString(),
          hasFicoScore: !!creditReport.creditScore?.fico,
          ficoScore: creditReport.creditScore?.fico?.score || null
        },
        monthlyIncome: creditReport.monthlyIncome ?? null,
        totalDebt: creditReport.totalDebt ?? null,
        recentMissedPayments: creditReport.recentMissedPayments ?? null,
        recentDefaults: creditReport.recentDefaults ?? null,
        creditUtilization: creditReport.creditUtilization ?? null,
        creditMix: creditReport.creditMix ?? null,
        creditAgeMonths: creditReport.creditAgeMonths ?? null,
        totalAccounts: creditReport.totalAccounts ?? null,
        openAccounts: creditReport.openAccounts ?? null,
        paymentHistory: creditReport.paymentHistory ?? null,
        creditAge: creditReport.creditAge ?? null
      }
    };
    // Use existing score and classification from database
    const existingScore = creditReport.creditScore.fico.score;
    const existingClassification = creditReport.creditScore?.classification || 'Good';
    
    // Calculate scoreResult for breakdown purposes only
    const { calculateCreditScore } = await import('../utils/creditScoring.js');
    const scoreInput = {
      paymentHistory: creditReport.paymentHistory ?? 0,
      creditUtilization: typeof creditReport.creditUtilization === 'number'
        ? creditReport.creditUtilization
        : (typeof creditReport.creditUtilization?.overall === 'number'
            ? creditReport.creditUtilization.overall
            : 1),
      creditAge: creditReport.creditAge ?? 0,
      creditMix: creditReport.creditMix ?? 0,
      inquiries: (typeof creditReport.inquiries === 'number' && !isNaN(creditReport.inquiries) && creditReport.inquiries >= 0 && creditReport.inquiries <= 50)
        ? creditReport.inquiries
        : 1,
      activeLoanCount: creditReport.openAccounts ?? 0,
    };
    const calculatedScore = calculateCreditScore(scoreInput);
    
    // Use existing score and classification
    responseData.data.scoreResult = {
      ...calculatedScore,
      score: existingScore,
      classification: existingClassification
    };

    // --- Add lendingDecision using LoanCalculator ---
    try {
      const { LoanCalculator } = await import('../utils/LoanCalculator.js');
      const scoreData = {
        score: responseData.data.currentScore,
        classification: existingClassification,
        version: responseData.data.scoreResult?.version || 'v101',
      };
      const userData = {
        ...scoreInput,
        onTimePaymentRate: creditReport.onTimePaymentRate ?? 1,
        onTimeRateLast6Months: creditReport.onTimeRateLast6Months ?? 1,
        loanTypeCounts: creditReport.loanTypeCounts ?? {},
        missedPaymentsLast12: creditReport.missedPaymentsLast12 ?? 0,
        recentLoanApplications: creditReport.recentLoanApplications ?? 0,
        defaultCountLast3Years: creditReport.defaultCountLast3Years ?? 0,
        consecutiveMissedPayments: creditReport.consecutiveMissedPayments ?? 0,
        recentDefaults: creditReport.recentDefaults ?? 0,
        monthsSinceLastDelinquency: creditReport.monthsSinceLastDelinquency ?? 999,
        activeLoanCount: creditReport.openAccounts ?? 0,
        monthlyIncome: creditReport.monthlyIncome ?? 0,
        totalDebt: creditReport.totalDebt ?? 0,
      };
      const calculator = new LoanCalculator(scoreData, userData);
      const lendingDecision = calculator.run();
      
      // Map approvedAmount to maxLoanAmount for frontend compatibility
      if (lendingDecision.approvedAmount) {
        lendingDecision.maxLoanAmount = lendingDecision.approvedAmount;
      } else if (lendingDecision.approved === false) {
        // For rejected loans, set maxLoanAmount to 0
        lendingDecision.maxLoanAmount = 0;
      } else {
        // Fallback for any other case
        lendingDecision.maxLoanAmount = 0;
      }
      
      responseData.data.lendingDecision = lendingDecision;
    } catch (err) {
      responseData.data.lendingDecision = { error: 'Failed to generate lending decision', details: err.message };
    }

    console.log('DEBUG: FINAL RESPONSE', JSON.stringify(responseData, null, 2));
    res.json(responseData);
  })
);

export default router;
