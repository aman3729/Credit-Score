import { generateAIScore } from '../utils/gptScoring.js';
import { calculateCreditScore as calculateScore } from '../utils/creditScoring.js';
import { evaluateLendingDecision } from '../utils/lendingDecision.js';
import CreditReport from '../models/CreditReport.js';
import CreditScore from '../models/CreditScore.js';
import User from '../models/User.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { logger, securityLogger } from '../config/logger.js';
import { sendCreditScoreUpdateEmail } from '../config/email.js';
import { calculateCreditworthiness } from '../utils/creditworthinessEngine.js';
import { mapToCreditworthinessSchema } from '../services/schemaMappingService.js';

// Helper function to determine credit score category
const getCreditScoreCategory = (score) => {
  if (score >= 800) return 'Exceptional';
  if (score >= 740) return 'Very Good';
  if (score >= 670) return 'Good';
  if (score >= 580) return 'Fair';
  return 'Poor';
};

// Helper function to calculate score change
const calculateScoreChange = (currentScore, previousScore) => {
  if (previousScore === null || previousScore === undefined) return null;
  return {
    points: currentScore - previousScore,
    percentage: ((currentScore - previousScore) / previousScore) * 100,
  };
};

/**
 * @desc    Calculate a credit score
 * @route   POST /api/v1/credit-scores/calculate
 * @access  Private
 */
const calculateCreditScore = catchAsync(async (req, res, next) => {
  const { engine } = req.query;
  const creditData = req.body;

  // Validate required fields for the default engine
  if (!engine) {
    const requiredFields = [
      'paymentHistory', 
      'creditUtilization', 
      'creditAge', 
      'creditMix', 
      'inquiries'
    ];
    
    const missingFields = requiredFields.filter(
      field => creditData[field] === undefined
    );

    if (missingFields.length > 0) {
      return next(new AppError(
        `Missing required credit factors: ${missingFields.join(', ')}`, 
        400
      ));
    }
  }

  let result;

  try {
    switch (engine) {
      case 'ai':
        result = await generateAIScore(creditData);
        result.engine = 'ai';
        result.engineVersion = result.version || null;
        break;
      case 'creditworthiness':
        const mappedData = mapToCreditworthinessSchema(creditData);
        result = calculateCreditworthiness(mappedData, req.body.options || {});
        result.engine = 'creditworthiness';
        result.engineVersion = result.version || null;
        break;
      default:
        const score = calculateScore(creditData);
        result = {
          score,
          summary: 'Manual scoring completed',
          ai: false,
          category: getCreditScoreCategory(score),
          factors: creditData,
          engine: 'default',
          engineVersion: null
        };
        break;
    }

    logger.info('Credit score calculated', {
      userId: req.user?.id,
      score: result.score,
      method: engine || 'default',
      engineVersion: result.engineVersion
    });

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    logger.error('Error calculating credit score', {
      error: error.message,
      userId: req.user?.id,
      engine
    });

    return next(new AppError(
      error.message || 'Failed to calculate credit score', 
      error.statusCode || 500
    ));
  }
});

/**
 * @desc    Save a credit score for the current user
 * @route   POST /api/v1/credit-scores
 * @access  Private
 */
const saveCreditScore = catchAsync(async (req, res, next) => {
  const { score: scoreData, factors, notes } = req.body;
  
  if (!scoreData || !factors) {
    return next(new AppError('Score and factors are required', 400));
  }
  
  // Extract score value
  const score = typeof scoreData === 'object' ? scoreData.score : scoreData;
  const classification = scoreData.classification || getCreditScoreCategory(score);
  const breakdown = scoreData.breakdown || {};
  
  if (typeof score !== 'number' || isNaN(score)) {
    return next(new AppError('Invalid score format', 400));
  }
  
  // Get previous score
  const previousScoreDoc = await CreditScore.findOne({ user: req.user.id })
    .sort({ createdAt: -1 })
    .select('score');

  const previousScore = previousScoreDoc?.score || null;

  // Evaluate lending decision with proper data
  const lendingDecision = evaluateLendingDecision({
    score,
    classification,
    breakdown,
    factors,
    user: {
      id: req.user.id,
      role: req.user.role,
      bankId: req.user.bankId
    }
  });

  // Create new credit score record
  const creditScore = await CreditScore.create({
    user: req.user.id,
    score,
    classification,
    breakdown,
    factors,
    notes,
    previousScore,
    lendingDecision: {
      decision: lendingDecision.decision,
      reasons: lendingDecision.reasons,
      recommendations: lendingDecision.recommendations,
      evaluatedAt: new Date()
    }
  });
  
  // Update or create credit report
  const creditReportUpdate = {
    userId: req.user.id,
    creditScore: { fico: { score } },
    creditAge: factors.creditAge || 0,
    creditUtilization: {
      overall: factors.creditUtilization || 0,
      byAccount: []
    },
    totalDebt: factors.totalDebt || 0,
    paymentHistory: factors.paymentHistory || 0,
    creditMix: factors.creditMix || 0,
    inquiries: factors.inquiries || 0,
    updatedAt: new Date(),
    lendingDecision: {
      decision: lendingDecision.decision,
      reasons: lendingDecision.reasons,
      recommendations: lendingDecision.recommendations,
      evaluatedAt: new Date()
    }
  };

  await CreditReport.findOneAndUpdate(
    { userId: req.user.id },
    {
      $set: creditReportUpdate,
      $push: {
        lendingDecisionHistory: {
          decision: lendingDecision.decision,
          reasons: lendingDecision.reasons,
          recommendations: lendingDecision.recommendations,
          evaluatedAt: new Date()
        }
      }
    },
    { upsert: true, new: true }
  );
  
  // Update user's current score reference
  req.user.creditScore = creditScore._id;
  await req.user.save({ validateBeforeSave: false });
  
  // Send email notification if score changed
  if (previousScore !== null && previousScore !== score) {
    try {
      await sendCreditScoreUpdateEmail({
        name: req.user.name,
        email: req.user.email,
        score,
        previousScore,
        change: score - previousScore
      });
    } catch (emailError) {
      logger.error('Error sending email', {
        userId: req.user.id,
        error: emailError.message
      });
    }
  }
  
  securityLogger.info('Credit score saved', {
    userId: req.user.id,
    score,
    previousScore,
    ip: req.ip
  });
  
  res.status(201).json({
    status: 'success',
    data: { creditScore }
  });
});

/**
 * @desc    Get or create a credit report for a user
 * @route   GET /api/v1/credit-reports/:userId
 * @access  Private/Admin
 */
const getCreditReport = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  
  const user = await User.findById(userId).select('firstName lastName email bankId');
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Authorization check
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return next(new AppError('Unauthorized access', 403));
  }

  if (req.user.role === 'lender' && user.bankId !== req.user.bankId) {
    return next(new AppError('Access restricted to bank members', 403));
  }

  let creditReport = await CreditReport.findOne({ userId });
  
  // Create new report if not exists
  if (!creditReport) {
    creditReport = await CreditReport.create({
      userId,
      personalInfo: {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
        email: user.email,
        addresses: [],
        employers: []
      },
      creditScore: {
        fico: { score: 700, version: 'FICO 9' },
        vantageScore: { score: 700, version: 'VantageScore 4.0' }
      },
      creditAccounts: [],
      inquiries: [],
      publicRecords: [],
      status: 'active'
    });
    
    logger.info('Created credit report', { userId });
  }

  securityLogger.info('Credit report accessed', {
    reportId: creditReport._id,
    accessedBy: req.user.id,
    role: req.user.role
  });

  res.status(200).json({
    status: 'success',
    data: { creditReport }
  });
});

/**
 * @desc    Update a credit report
 * @route   PATCH /api/v1/credit-reports/:userId
 * @access  Private/Admin
 */
const updateCreditReport = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const updates = req.body;
  
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const creditReport = await CreditReport.findOneAndUpdate(
    { userId },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!creditReport) {
    return next(new AppError('Credit report not found', 404));
  }
  
  securityLogger.info('Credit report updated', {
    reportId: creditReport._id,
    updatedBy: req.user.id,
    updatedFields: Object.keys(updates)
  });

  res.status(200).json({
    status: 'success',
    data: { creditReport }
  });
});

/**
 * @desc    Get all credit reports
 * @route   GET /api/v1/credit-reports
 * @access  Private/Admin
 */
const getAllCreditReports = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;
  
  const query = {};
  
  // Search filter
  if (req.query.search) {
    const users = await User.find({
      $or: [
        { email: { $regex: req.query.search, $options: 'i' } },
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } }
      ]
    }).select('_id');
    
    query.userId = { $in: users.map(u => u._id) };
  }
  
  // Status filter
  if (req.query.status) {
    query.status = req.query.status;
  }
  
  // Score filters
  if (req.query.filter) {
    const scoreRanges = {
      'excellent': { $gte: 800 },
      'good': { $gte: 700, $lt: 800 },
      'fair': { $gte: 600, $lt: 700 },
      'poor': { $lt: 600 }
    };
    
    if (scoreRanges[req.query.filter]) {
      query['creditScore.fico.score'] = scoreRanges[req.query.filter];
    }
  }
  
  // Bank restriction for lenders
  if (req.user.role === 'lender') {
    const bankUsers = await User.find({ bankId: req.user.bankId }).select('_id');
    query.userId = { $in: bankUsers.map(u => u._id) };
  }

  const [total, reports] = await Promise.all([
    CreditReport.countDocuments(query),
    CreditReport.find(query)
      .sort({ 'creditScore.fico.score': -1 })
      .skip(skip)
      .limit(limit)
  ]);
  
  // Get user details
  const userIds = reports.map(r => r.userId);
  const users = await User.find({ _id: { $in: userIds } })
    .select('email firstName lastName role');
  
  const reportsWithUsers = reports.map(report => {
    const user = users.find(u => u._id.equals(report.userId));
    return { ...report.toObject(), user };
  });
  
  securityLogger.info('All credit reports accessed', {
    count: reports.length,
    accessedBy: req.user.id
  });

  res.status(200).json({
    status: 'success',
    results: reports.length,
    data: reportsWithUsers,
    pagination: {
      current: page,
      totalPages: Math.ceil(total / limit),
      total,
      limit
    }
  });
});

/**
 * @desc    Get credit score history
 * @route   GET /api/v1/credit-scores/history
 * @access  Private
 */
const getCreditScoreHistory = catchAsync(async (req, res, next) => {
  // Determine target user
  let userId;
  if (req.user.role === 'admin' && req.query.userId) {
    userId = req.query.userId;
  } else {
    userId = req.user.id;
  }

  // Authorization
  if (req.user.role === 'lender') {
    const user = await User.findById(userId).select('bankId');
    if (!user || user.bankId !== req.user.bankId) {
      return next(new AppError('Unauthorized access', 403));
    }
  } else if (req.user.role !== 'admin' && req.user.id !== userId) {
    return next(new AppError('Unauthorized access', 403));
  }
  
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 12;
  const skip = (page - 1) * limit;
  
  // Query
  const query = { user: userId };
  
  // Date filtering
  if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
  if (req.query.endDate) query.createdAt.$lte = new Date(req.query.endDate);
  
  const [total, scores] = await Promise.all([
    CreditScore.countDocuments(query),
    CreditScore.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
  ]);
  
  // Statistics
  const stats = await CreditScore.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: null,
        averageScore: { $avg: '$score' },
        highestScore: { $max: '$score' },
        lowestScore: { $min: '$score' },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        averageScore: { $round: ['$averageScore', 2] },
        highestScore: 1,
        lowestScore: 1,
        count: 1
      }
    }
  ]);
  
  securityLogger.info('Credit history accessed', {
    userId,
    accessedBy: req.user.id
  });
  
  res.status(200).json({
    status: 'success',
    results: scores.length,
    data: {
      scores,
      stats: stats[0] || null
    },
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Get credit score statistics
 * @route   GET /api/v1/credit-scores/statistics
 * @access  Private/Admin
 */
const getCreditScoreStatistics = catchAsync(async (req, res, next) => {
  const [distribution, trends, scoresByRole] = await Promise.all([
    // Score distribution
    CreditScore.aggregate([
      {
        $bucket: {
          groupBy: "$score",
          boundaries: [300, 580, 670, 740, 800, 851],
          default: "Unknown",
          output: {
            count: { $sum: 1 },
            avgScore: { $avg: "$score" }
          }
        }
      }
    ]),
    
    // Monthly trends
    CreditScore.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          avgScore: { $avg: "$score" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),
    
    // Scores by user role
    CreditScore.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userData"
        }
      },
      { $unwind: "$userData" },
      {
        $group: {
          _id: "$userData.role",
          avgScore: { $avg: "$score" },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  securityLogger.info('Statistics accessed', { by: req.user.id });

  res.status(200).json({
    status: 'success',
    data: {
      distribution,
      trends,
      scoresByRole
    }
  });
});

export {
  calculateCreditScore,
  saveCreditScore,
  getCreditReport,
  updateCreditReport,
  getAllCreditReports,
  getCreditScoreHistory,
  getCreditScoreStatistics,
  getCreditScoreCategory,
  calculateScoreChange
};