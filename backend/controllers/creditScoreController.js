import { generateAIScore } from '../utils/gptScoring.js';
import { calculateCreditScore as calculateScore } from '../utils/creditScoring.js';
import { evaluateLendingDecision } from '../utils/lendingDecision.js';
import CreditReport from '../models/CreditReport.js';
import CreditScore from '../models/CreditScore.js';
import User from '../models/User.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { logger, securityLogger } from '../config/logger.js';
import { sendCreditScoreUpdateEmail } from '../utils/email.js';

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
  if (!previousScore) return null;
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
  const { paymentHistory, creditUtilization, creditAge, creditMix, inquiries } = req.body;
  const useAI = req.query.aiEnabled === 'true';
  
  // Validate required fields
  const requiredFields = { paymentHistory, creditUtilization, creditAge, creditMix, inquiries };
  const missingFields = Object.entries(requiredFields)
    .filter(([_, value]) => value === undefined)
    .map(([key]) => key);
    
  if (missingFields.length > 0) {
    return next(new AppError(`Missing required credit factors: ${missingFields.join(', ')}`, 400));
  }
  
  let result;
  
  try {
    if (useAI) {
      // Use AI scoring if enabled
      result = await generateAIScore({
        paymentHistory,
        creditUtilization,
        creditAge,
        creditMix,
        inquiries
      });
    } else {
      // Use manual scoring
      const score = calculateScore({
        paymentHistory,
        creditUtilization,
        creditAge,
        creditMix,
        inquiries
      });
      
      result = {
        score,
        summary: 'Manual scoring completed',
        ai: false,
        category: getCreditScoreCategory(score),
        factors: {
          paymentHistory,
          creditUtilization,
          creditAge,
          creditMix,
          inquiries
        }
      };
    }
    
    // Log the calculation
    logger.info('Credit score calculated', {
      userId: req.user?.id,
      score: result.score,
      method: useAI ? 'AI' : 'Manual',
      factors: result.factors || {}
    });
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    logger.error('Error calculating credit score', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    
    return next(new AppError('Failed to calculate credit score. Please try again later.', 500));
  }
});

/**
 * @desc    Save a credit score for the current user
 * @route   POST /api/v1/credit-scores
 * @access  Private
 */
const saveCreditScore = catchAsync(async (req, res, next) => {
  const { score: scoreData, factors, notes } = req.body;
  
  // Validate required fields
  if (!scoreData || !factors) {
    return next(new AppError('Score and factors are required', 400));
  }
  
  // Extract score value from scoreData if it's an object
  const score = typeof scoreData === 'object' ? scoreData.score : scoreData;
  const classification = scoreData.classification || getCreditScoreCategory(score);
  const breakdown = scoreData.breakdown || {};
  
  // Validate score is a number
  if (typeof score !== 'number' || isNaN(score)) {
    return next(new AppError('Invalid score format. Score must be a number', 400));
  }
  
  // Get the previous score for comparison
  const previousScore = await CreditScore.findOne({ user: req.user.id })
    .sort({ createdAt: -1 })
    .select('score');
  
  // Evaluate lending decision
  const lendingDecision = evaluateLendingDecision({
    score,
    classification,
    breakdown,
    ...userData // Include any additional user data needed for decision making
  });

  // Create new credit score record with lending decision
  const creditScore = await CreditScore.create({
    user: req.user.id,
    score,
    classification,
    breakdown,
    factors,
    notes,
    previousScore: previousScore?.score || null,
    lendingDecision: {
      decision: lendingDecision.decision,
      reasons: lendingDecision.reasons,
      recommendations: lendingDecision.recommendations,
      evaluatedAt: new Date()
    }
  });
  
  // Update user's current score if this is higher than their current score
  if (!req.user.creditScore || score > req.user.creditScore) {
    req.user.creditScore = score;
    await req.user.save({ validateBeforeSave: false });
    
    // If there was a previous score and it's different, send update email
    if (previousScore?.score && previousScore.score !== score) {
      try {
        await sendCreditScoreUpdateEmail({
          name: req.user.name,
          email: req.user.email,
          score,
          previousScore: previousScore.score,
          change: score - previousScore.score
        });
      } catch (error) {
        logger.error('Error sending credit score update email', {
          error: error.message,
          userId: req.user.id
        });
        // Don't fail the request if email sending fails
      }
    }
  }
  
  // Log the score save
  securityLogger.info('Credit score saved', {
    userId: req.user.id,
    score,
    previousScore: previousScore?.score || null,
    ip: req.ip
  });
  
  res.status(201).json({
    status: 'success',
    data: {
      creditScore
    }
  });
});

/**
 * @desc    Get or create a credit report for a user
 * @route   GET /api/v1/credit-reports/:userId
 * @access  Private/Admin
 */
const getCreditReport = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  
  // Find the user to verify they exist
  const user = await User.findById(userId).select('firstName lastName email');
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Check if the requesting user has permission
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return next(new AppError('Not authorized to access this credit report', 403));
  }

  // Try to find existing credit report
  let creditReport = await CreditReport.findOne({ userId });
  
  // If no report exists, create a new one with default values
  if (!creditReport) {
    creditReport = await CreditReport.create({
      userId,
      personalInfo: {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User',
        email: user.email,
        ssn: '',
        addresses: [],
        employers: []
      },
      creditScore: {
        fico: { score: 700, version: 'FICO 9', lastUpdated: new Date() },
        vantageScore: { score: 700, version: 'VantageScore 4.0', lastUpdated: new Date() }
      },
      creditAccounts: [],
      inquiries: [],
      publicRecords: [],
      status: 'active',
      lastUpdated: new Date()
    });
    
    logger.info('Created new credit report', {
      userId,
      reportId: creditReport._id,
      adminId: req.user.role === 'admin' ? req.user.id : null
    });
  }

  // Log the access
  securityLogger.info('Credit report accessed', {
    reportId: creditReport._id,
    userId,
    accessedBy: req.user.id,
    role: req.user.role,
    ip: req.ip
  });

  res.status(200).json({
    status: 'success',
    data: {
      creditReport
    }
  });
});

/**
 * @desc    Update a credit report (admin only)
 * @route   PATCH /api/v1/credit-reports/:userId
 * @access  Private/Admin
 */
const updateCreditReport = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const updates = req.body;
  
  // Find the user to verify they exist
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Find and update the credit report
  const creditReport = await CreditReport.findOneAndUpdate(
    { userId },
    { 
      $set: { 
        ...updates,
        lastUpdated: new Date() 
      } 
    },
    { 
      new: true, 
      runValidators: true,
      context: 'query' 
    }
  ).orFail(new AppError('Credit report not found', 404));
  
  // Log the update
  securityLogger.info('Credit report updated', {
    reportId: creditReport._id,
    userId,
    updatedBy: req.user.id,
    updatedFields: Object.keys(updates),
    ip: req.ip
  });

  res.status(200).json({
    status: 'success',
    data: {
      creditReport
    }
  });
});

/**
 * @desc    Get all credit reports with pagination (admin only)
 * @route   GET /api/v1/credit-reports
 * @access  Private/Admin
 */
const getAllCreditReports = catchAsync(async (req, res, next) => {
  // 1) Parse pagination parameters
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;
  
  // 2) Build the base query
  const query = {};
  
  // 3) Add filters if provided
  if (req.query.status) {
    query.status = req.query.status;
  }
  
  if (req.query.minScore) {
    query['creditScore.fico.score'] = { $gte: parseInt(req.query.minScore, 10) };
  }
  
  if (req.query.maxScore) {
    query['creditScore.fico.score'] = query['creditScore.fico.score'] || {};
    query['creditScore.fico.score'].$lte = parseInt(req.query.maxScore, 10);
  }
  
  // 4) Execute count and find queries in parallel
  const [total, reports] = await Promise.all([
    CreditReport.countDocuments(query),
    CreditReport.find(query)
      .sort({ 'creditScore.fico.score': -1, lastUpdated: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);
  
  // 5) Get user details for each report
  const userIds = reports.map(r => r.userId).filter(Boolean);
  let users = [];
  
  if (userIds.length > 0) {
    users = await User.find({ _id: { $in: userIds } })
      .select('email firstName lastName role')
      .lean();
  }
  
  // 6) Combine reports with user info
  const reportsWithUserInfo = reports.map(report => {
    const user = users.find(u => u && u._id.toString() === report.userId.toString());
    return {
      ...report,
      user: user || null
    };
  });
  
  // 7) Log the access
  securityLogger.info('All credit reports accessed', {
    count: reports.length,
    total,
    page,
    limit,
    accessedBy: req.user.id,
    ip: req.ip
  });

  // 8) Send response
  res.status(200).json({
    status: 'success',
    results: reports.length,
    data: {
      reports: reportsWithUserInfo
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
 * @desc    Get credit score history for a user
 * @route   GET /api/v1/credit-scores/history
 * @access  Private
 */
const getCreditScoreHistory = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const requestingUserId = req.user.id;
  
  // Check if the requesting user has permission
  if (req.user.role !== 'admin' && requestingUserId !== userId) {
    return next(new AppError('Not authorized to access this credit score history', 403));
  }
  
  // Get pagination parameters
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 12; // Default to 12 months
  const skip = (page - 1) * limit;
  
  // Build the query
  const query = { user: userId };
  
  // Add date range filter if provided
  if (req.query.startDate || req.query.endDate) {
    query.createdAt = {};
    if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
    if (req.query.endDate) query.createdAt.$lte = new Date(req.query.endDate);
  }
  
  // Execute count and find queries in parallel
  const [total, scores] = await Promise.all([
    CreditScore.countDocuments(query),
    CreditScore.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
  ]);
  
  // Calculate statistics
  const stats = await CreditScore.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: null,
        averageScore: { $avg: '$score' },
        highestScore: { $max: '$score' },
        lowestScore: { $min: '$score' },
        scoreCount: { $sum: 1 },
        scoreChanges: {
          $push: {
            score: '$score',
            date: '$createdAt',
            previousScore: '$previousScore'
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        averageScore: { $round: ['$averageScore', 2] },
        highestScore: 1,
        lowestScore: 1,
        scoreCount: 1,
        lastUpdated: { $max: '$scoreChanges.date' },
        scoreChanges: {
          $map: {
            input: '$scoreChanges',
            as: 'score',
            in: {
              date: '$$score.date',
              score: '$$score.score',
              change: {
                $cond: [
                  { $eq: ['$$score.previousScore', null] },
                  null,
                  {
                    points: { $subtract: ['$$score.score', '$$score.previousScore'] },
                    percentage: {
                      $multiply: [
                        { $divide: [
                          { $subtract: ['$$score.score', '$$score.previousScore'] },
                          '$$score.previousScore'
                        ]},
                        100
                      ]
                    }
                  }
                ]
              },
              category: {
                $switch: {
                  branches: [
                    { case: { $gte: ['$$score.score', 800] }, then: 'Exceptional' },
                    { case: { $gte: ['$$score.score', 740] }, then: 'Very Good' },
                    { case: { $gte: ['$$score.score', 670] }, then: 'Good' },
                    { case: { $gte: ['$$score.score', 580] }, then: 'Fair' },
                    { case: { $lt: ['$$score.score', 580] }, then: 'Poor' }
                  ],
                  default: 'Unknown'
                }
              }
            }
          }
        }
      }
    }
  ]);
  
  // Log the access
  securityLogger.info('Credit score history accessed', {
    userId,
    accessedBy: requestingUserId,
    role: req.user.role,
    ip: req.ip
  });
  
  // Prepare response
  const result = {
    status: 'success',
    results: scores.length,
    data: {
      scores,
      stats: stats[0] || {
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        scoreCount: 0,
        lastUpdated: null,
        scoreChanges: []
      }
    },
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
  
  res.status(200).json(result);
});

/**
 * @desc    Get credit score statistics (admin only)
 * @route   GET /api/v1/credit-scores/statistics
 * @access  Private/Admin
 */
const getCreditScoreStatistics = catchAsync(async (req, res, next) => {
  // Calculate date ranges
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(now.getDate() - 90);
  
  // Execute all aggregation pipelines in parallel
  const [
    scoreDistribution,
    monthlyTrend,
    scoreRanges,
    averageScoresByRole,
    recentScores
  ] = await Promise.all([
    // Score distribution
    CreditScore.aggregate([
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $gte: ['$score', 800] }, then: '800-850' },
                { case: { $gte: ['$score', 740] }, then: '740-799' },
                { case: { $gte: ['$score', 670] }, then: '670-739' },
                { case: { $gte: ['$score', 580] }, then: '580-669' },
                { case: { $lt: ['$score', 580] }, then: '300-579' }
              ],
              default: 'Unknown'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    
    // Monthly trend (last 12 months)
    CreditScore.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          averageScore: { $avg: '$score' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          period: { $concat: [
            { $toString: '$_id.year' },
            '-',
            { $toString: { $lpad: ['$_id.month', 2, '0'] } }
          ]},
          averageScore: { $round: ['$averageScore', 2] },
          count: 1
        }
      },
      { $sort: { period: 1 } }
    ]),
    
    // Score ranges
    CreditScore.aggregate([
      {
        $group: {
          _id: null,
          averageScore: { $avg: '$score' },
          minScore: { $min: '$score' },
          maxScore: { $max: '$score' },
          medianScore: { $percentile: { p: [0.5], input: '$score', method: 'approximate' } },
          stdDev: { $stdDevPop: '$score' },
          totalScores: { $sum: 1 }
        }
      },
      { $project: { _id: 0 } }
    ]),
    
    // Average scores by user role
    CreditScore.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      {
        $group: {
          _id: '$userInfo.role',
          averageScore: { $avg: '$score' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          role: '$_id',
          averageScore: { $round: ['$averageScore', 2] },
          count: 1
        }
      },
      { $sort: { averageScore: -1 } }
    ]),
    
    // Recent scores (last 10)
    CreditScore.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name email role')
      .lean()
  ]);
  
  // Log the statistics access
  securityLogger.info('Credit score statistics accessed', {
    accessedBy: req.user.id,
    ip: req.ip
  });
  
  // Prepare response
  const result = {
    status: 'success',
    data: {
      scoreDistribution,
      monthlyTrend,
      scoreRanges: scoreRanges[0] || {},
      averageScoresByRole,
      recentScores
    }
  };
  
  res.status(200).json(result);
});

// Export all controller functions
export {
  calculateCreditScore,
  saveCreditScore,
  getCreditReport,
  updateCreditReport,
  getAllCreditReports,
  getCreditScoreHistory,
  getCreditScoreStatistics,
  // Export utility functions for testing
  getCreditScoreCategory,
  calculateScoreChange
};