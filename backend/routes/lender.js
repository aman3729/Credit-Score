import express from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/auth.js';
import CreditReport from '../models/CreditReport.js';
import User from '../models/User.js';
import { LoanCalculator } from '../utils/LoanCalculator.js';

const router = express.Router();

// Test endpoint to verify route registration
router.get('/test', (req, res) => {
  res.json({ message: 'Lender routes are working!' });
});

// Debug route to list all credit reports (temporary)
router.get('/debug/credit-reports', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const reports = await CreditReport.find({}).populate('userId', 'email name').lean();
    
    res.json({
      count: reports.length,
      reports: reports.map(r => ({
        _id: r._id,
        userId: r.userId?._id || r.userId,
        userEmail: r.userId?.email,
        userName: r.userId?.name,
        'creditScore.fico.score': r.creditScore?.fico?.score,
        updatedAt: r.updatedAt,
        hasCreditScore: !!r.creditScore
      }))
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Debug error', details: error.message });
  }
});

// Debug endpoint to check credit report structure
router.get('/debug/credit-report-structure', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Get all credit reports with populated user data
    const reports = await CreditReport.find({})
      .populate('userId', 'email name _id')
      .lean();
    
    // Get all users without reports
    const usersWithoutReports = await User.aggregate([
      {
        $lookup: {
          from: 'creditreports',
          localField: '_id',
          foreignField: 'userId',
          as: 'report'
        }
      },
      { $match: { report: { $size: 0 } } },
      { $project: { _id: 1, email: 1, name: 1 } }
    ]);
    
    // Get all reports with potential ID mismatches
    const reportsWithMismatches = reports.filter(report => {
      if (!report.userId) return true;
      return report.userId._id.toString() !== report.userId.toString();
    });
    
    res.json({
      totalReports: reports.length,
      totalUsers: await User.countDocuments(),
      usersWithoutReports,
      reportsWithMismatches,
      sampleReport: reports[0] || null,
      allReports: reports.map(r => ({
        _id: r._id,
        userId: r.userId?._id || r.userId,
        userEmail: r.userId?.email,
        userName: r.userId?.name,
        hasCreditScore: !!r.creditScore,
        updatedAt: r.updatedAt
      }))
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ 
      error: 'Debug error', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Debug endpoint to list all users and their credit reports
router.get('/debug/all-users-reports', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Get all users with their credit reports
    const users = await User.aggregate([
      {
        $lookup: {
          from: 'creditreports',
          localField: '_id',
          foreignField: 'userId',
          as: 'creditReport'
        }
      },
      {
        $project: {
          _id: 1,
          email: 1,
          name: 1,
          hasCreditReport: { $gt: [{ $size: '$creditReport' }, 0] },
          creditReportId: { $arrayElemAt: ['$creditReport._id', null] },
          hasCreditScore: {
            $cond: {
              if: { $gt: [{ $size: '$creditReport' }, 0] },
              then: { $ifNull: [{ $gt: [{ $ifNull: [{ $arrayElemAt: ['$creditReport.creditScore', 0] }, {}] }, {}] }, false] },
              else: false
            }
          },
          updatedAt: { $arrayElemAt: ['$creditReport.updatedAt', null] }
        }
      },
      { $sort: { hasCreditReport: -1, email: 1 } }
    ]);
    
    res.json({
      totalUsers: users.length,
      usersWithReports: users.filter(u => u.hasCreditReport).length,
      users: users
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ 
      error: 'Debug error', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Import the CreditScore model if not already imported
import CreditScore from '../models/CreditScore.js';

// Get list of borrowers with credit reports
router.get('/borrowers', auth, async (req, res) => {
  try {
    // Only allow lenders and admins to access this endpoint
    if (!['lender', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied',
        details: 'Only lenders and admins can view borrower lists'
      });
    }

    // Find all users who have a credit report
    const borrowers = await User.aggregate([
      {
        $lookup: {
          from: 'creditreports',
          localField: '_id',
          foreignField: 'userId',
          as: 'creditReport'
        }
      },
      { $match: { 'creditReport.0': { $exists: true } } },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          createdAt: 1,
          updatedAt: 1,
          creditReportId: { $arrayElemAt: ['$creditReport._id', null] },
          creditScore: { $ifNull: [{ $arrayElemAt: ['$creditReport.creditScore.fico.score', 0] }, null] },
          reportUpdatedAt: { $arrayElemAt: ['$creditReport.updatedAt', 0] }
        }
      },
      { $sort: { name: 1 } }
    ]);

    res.json({
      success: true,
      data: borrowers
    });
  } catch (error) {
    console.error('Error fetching borrowers:', error);
    res.status(500).json({
      error: 'Failed to fetch borrowers',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get credit report for a specific user
router.get('/credit-report/:userId', auth, async (req, res) => {
  const { userId } = req.params;
  console.log(`[Credit Report] Request for user ID: ${userId} from user:`, req.user.id);
  
  try {
    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      const error = new Error('Invalid user ID format');
      error.status = 400;
      error.details = 'The provided user ID is not a valid MongoDB ObjectId';
      console.error('[Credit Report] Validation error:', error);
      return res.status(400).json({ 
        error: error.message,
        details: error.details
      });
    }

    // Authorization check - allow lenders to view reports for their clients
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      const error = new Error('Not authorized to access this resource');
      error.status = 403;
      console.error('[Credit Report] Authorization error:', { 
        error: error.message,
        requestedUserId: userId,
        currentUserId: req.user.id,
        role: req.user.role
      });
      return res.status(403).json({ error: error.message });
    }
    
    // Check user existence
    console.log(`[Credit Report] Checking if user exists: ${userId}`);
    const user = await User.findById(userId).lean();
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      error.details = `No user found with ID: ${userId}`;
      console.error('[Credit Report] User not found:', error.details);
      return res.status(404).json({ 
        error: error.message,
        details: error.details
      });
    }
    
    console.log(`[Credit Report] User found:`, { 
      userId: user._id, 
      email: user.email,
      name: user.name 
    });
    
    // First try to get credit score using the same approach as admin dashboard
    console.log(`[Credit Report] Searching for credit score with userId:`, userId);
    const creditScore = await CreditScore.findOne({ user: userId })
      .populate('user', 'email name')
      .lean();
    
    if (creditScore) {
      console.log(`[Credit Report] Found credit score using admin dashboard method`);
      return res.json({
        ...creditScore,
        // Map to expected frontend format if needed
        creditScore: {
          score: creditScore.score,
          // Add other fields as needed
        },
        userId: creditScore.user._id,
        user: undefined // Remove the populated user object if not needed
      });
    }
    
    // If no credit score found, try the old CreditReport method for backward compatibility
    console.log(`[Credit Report] No credit score found, trying legacy CreditReport method`);
    let creditReport = await CreditReport.findOne({ userId });
    if (!creditReport) {
      // Try again with ObjectId if not found and userId is a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(userId)) {
        creditReport = await CreditReport.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      }
    }
    if (!creditReport) {
    return res.status(404).json({ 
        error: 'Credit report not found',
        details: 'No credit report exists for this user'
    });
    }

    // Remove sensitive data
    const { ssn, ...safeReport } = creditReport;
    res.json(safeReport);
  } catch (error) {
    console.error('Error fetching credit report:', error);
    res.status(500).json({ 
      error: 'Error fetching credit report',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get fraud check for a specific user
router.get('/fraud-check/:userId', auth, async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        error: 'Invalid user ID format',
        details: 'The provided user ID is not a valid MongoDB ObjectId'
      });
    }

    // Authorization check
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Not authorized to access this resource' });
    }

    // Mock fraud check implementation
    res.json({
      userId,
      riskScore: Math.floor(Math.random() * 100),
      flags: [],
      lastUpdated: new Date(),
      status: 'low_risk'
    });
  } catch (error) {
    console.error('Error in fraud check:', error);
    res.status(500).json({ error: 'Error performing fraud check' });
  }
});

// Get summarized credit report (for quick decisions)
// Get lending decision for a specific user
router.get('/lending-decision/:userId', auth, async (req, res) => {
  const { userId } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    let creditReport = await CreditReport.findOne({ userId });
    if (!creditReport) {
      creditReport = await CreditReport.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    }
    if (!creditReport) {
      return res.status(404).json({ error: 'Credit report not found', details: 'No credit report exists for this user' });
    }

    // Try to return the most recent lending decision if it exists
    let latestDecision = null;
    if (Array.isArray(creditReport.lendingDecisionHistory) && creditReport.lendingDecisionHistory.length > 0) {
      latestDecision = creditReport.lendingDecisionHistory[creditReport.lendingDecisionHistory.length - 1];
    } else if (creditReport.lendingDecision) {
      latestDecision = creditReport.lendingDecision;
    }

    if (latestDecision) {
      return res.json({ success: true, userId, lendingDecision: latestDecision, evaluatedAt: latestDecision.timestamp || new Date() });
    }

    // Otherwise, generate a new decision as before
    const scoreInput = {
      paymentHistory: creditReport.paymentHistory ?? 0,
      creditUtilization: creditReport.creditUtilization ?? 1,
      creditAge: creditReport.creditAge ?? 0,
      creditMix: creditReport.creditMix ?? 0,
      inquiries: creditReport.inquiries ?? 1,
      activeLoanCount: creditReport.openAccounts ?? 0,
    };
    const { LoanCalculator } = await import('../utils/LoanCalculator.js');
    const scoreData = {
      score: creditReport.creditScore?.fico?.score ?? 0,
      classification: creditReport.creditScore?.classification ?? 'Unknown',
      version: 'v101',
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
    lendingDecision.decision = lendingDecision.approved === true
      ? 'Approve'
      : (lendingDecision.approved === false ? 'Reject' : 'Review');
    res.json({ success: true, userId, lendingDecision, evaluatedAt: new Date() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to evaluate lending decision', details: error.message });
  }
});

// POST /lending-decision/:userId/recalculate
router.post('/lending-decision/:userId/recalculate', auth, async (req, res) => {
  const { userId } = req.params;
  const updates = req.body || {};
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    let creditReport = await CreditReport.findOne({ userId });
    if (!creditReport) {
      creditReport = await CreditReport.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    }
    if (!creditReport) {
      return res.status(404).json({ error: 'Credit report not found', details: 'No credit report exists for this user' });
    }
    // Build userData from template fields, merge updates
    const userData = {
      email: user.email,
      paymentHistory: user.paymentHistory ?? 1,
      creditUtilization: user.creditUtilization ?? creditReport.creditUtilization ?? 0,
      creditAge: user.creditAge ?? creditReport.creditAge ?? 0,
      creditMix: user.creditMix ?? 0,
      inquiries: user.inquiries ?? 0,
      totalDebt: user.totalDebt ?? creditReport.totalDebt ?? 0,
      recentMissedPayments: user.recentMissedPayments ?? 0,
      recentDefaults: user.recentDefaults ?? 0,
      lastActiveDate: user.lastActiveDate ?? null,
      activeLoanCount: user.activeLoanCount ?? 0,
      oldestAccountAge: user.oldestAccountAge ?? 0,
      transactionsLast90Days: user.transactionsLast90Days ?? 0,
      onTimePaymentRate: user.onTimePaymentRate ?? 1,
      recentLoanApplications: user.recentLoanApplications ?? 0,
      defaultCountLast3Years: user.defaultCountLast3Years ?? 0,
      consecutiveMissedPayments: user.consecutiveMissedPayments ?? 0,
      monthlyIncome: user.monthlyIncome ?? 5000,
      debtToIncome: user.debtToIncome ?? creditReport.debtToIncome ?? 0,
      loanPurpose: user.loanPurpose ?? 'personal',
      isExistingCustomer: user.isExistingCustomer ?? true,
      engineVersion: user.engineVersion ?? 'v200',
      economicIndicator: user.economicIndicator ?? 'stable',
      primeRate: user.primeRate ?? 3.5,
      ...updates // merge in any updated fields from the request
    };
    // Build scoreData
    const scoreData = {
      score: creditReport.creditScore?.fico?.score ?? 0,
      classification: creditReport.creditScore?.classification ?? 'Unknown',
      engineVersion: userData.engineVersion,
      economicIndicator: userData.economicIndicator,
      primeRate: userData.primeRate
    };
    let offer;
    try {
      const calculator = new LoanCalculator(scoreData, userData);
      offer = calculator.run();
    } catch (calcError) {
      return res.status(200).json({ success: false, userId, error: 'Failed to evaluate lending decision', details: calcError.message });
    }
    res.json({ success: true, userId, offer, evaluatedAt: new Date() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to evaluate lending decision', details: error.message });
  }
});

// Get quick report for a user
router.get('/quick-report/:userId', auth, async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        error: 'Invalid user ID format',
        details: 'The provided user ID is not a valid MongoDB ObjectId'
      });
    }

    // Authorization check
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Not authorized to access this resource' });
    }
    
    // Check user existence
    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
      return res.status(404).json({ 
        error: 'User not found',
        details: 'The specified user does not exist'
      });
    }
    
    // Fetch credit report
    const creditReport = await CreditReport.findOne({ userId });
    if (!creditReport) {
      return res.status(404).json({ 
        error: 'Credit report not found',
        details: 'No credit report exists for this user'
      });
    }

    // Initialize metrics
    let totalAccounts = 0;
    let openAccounts = 0;
    let totalBalance = 0;
    let recentInquiries = 0;
    let delinquencies = 0;

    // Calculate metrics
    if (Array.isArray(creditReport.creditAccounts)) {
      totalAccounts = creditReport.creditAccounts.length;
      openAccounts = creditReport.creditAccounts.filter(acc => acc?.status === 'open').length;
      totalBalance = creditReport.creditAccounts.reduce((sum, acc) => sum + (acc?.balance || 0), 0);
    }

    if (Array.isArray(creditReport.inquiries)) {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      recentInquiries = creditReport.inquiries.filter(inq => 
        inq?.date && new Date(inq.date) > ninetyDaysAgo
      ).length;
    }

    // Calculate delinquencies
    if (Array.isArray(creditReport.creditAccounts)) {
      const twentyFourMonthsAgo = new Date();
      twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);
      
      delinquencies = creditReport.creditAccounts.reduce((count, account) => {
        if (!Array.isArray(account?.paymentHistory)) return count;
        
        return count + account.paymentHistory.filter(payment => 
          payment?.status !== 'on_time' && 
          payment?.date && 
          new Date(payment.date) > twentyFourMonthsAgo
        ).length;
      }, 0);
    }

    res.json({
      ficoScore: creditReport.creditScore?.fico,
      vantageScore: creditReport.creditScore?.vantageScore,
      creditUtilization: creditReport.creditUtilization?.overall,
      accountSummary: {
        total: totalAccounts,
        open: openAccounts,
        totalBalance
      },
      delinquencies,
      recentInquiries,
      creditAge: creditReport.creditAge,
      riskFactors: creditReport.riskFactors || [],
      fraudAlerts: creditReport.fraudAlerts || [],
      debtToIncome: creditReport.debtToIncome
    });
  } catch (error) {
    console.error('Error fetching quick report:', error);
    res.status(500).json({ 
      error: 'Error fetching quick report',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get recent lending decisions
router.get('/recent-decisions', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    // Get recent credit reports with user data
    const recentDecisions = await CreditReport.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { 
        $project: {
          'user.password': 0,
          'user.__v': 0,
          'user.createdAt': 0,
          'user.updatedAt': 0,
          '__v': 0
        }
      },
      { $sort: { updatedAt: -1 } },
      { $limit: limit }
    ]);

    // Add lendingDecision to each decision using LoanCalculator
    const { LoanCalculator } = await import('../utils/LoanCalculator.js');
    const enhancedDecisions = await Promise.all(recentDecisions.map(async (report) => {
      try {
        const scoreInput = {
          paymentHistory: report.paymentHistory ?? 0,
          creditUtilization: report.creditUtilization ?? 1,
          creditAge: report.creditAge ?? 0,
          creditMix: report.creditMix ?? 0,
          inquiries: report.inquiries ?? 1,
          activeLoanCount: report.openAccounts ?? 0,
        };
        const scoreData = {
          score: report.creditScore?.fico?.score ?? 0,
          classification: report.creditScore?.classification ?? 'Unknown',
          version: 'v101',
        };
        const userData = {
          ...scoreInput,
          onTimePaymentRate: report.onTimePaymentRate ?? 1,
          onTimeRateLast6Months: report.onTimeRateLast6Months ?? 1,
          loanTypeCounts: report.loanTypeCounts ?? {},
          missedPaymentsLast12: report.missedPaymentsLast12 ?? 0,
          recentLoanApplications: report.recentLoanApplications ?? 0,
          defaultCountLast3Years: report.defaultCountLast3Years ?? 0,
          consecutiveMissedPayments: report.consecutiveMissedPayments ?? 0,
          recentDefaults: report.recentDefaults ?? 0,
          monthsSinceLastDelinquency: report.monthsSinceLastDelinquency ?? 999,
          activeLoanCount: report.openAccounts ?? 0,
          monthlyIncome: report.monthlyIncome ?? 0,
          totalDebt: report.totalDebt ?? 0,
        };
        const calculator = new LoanCalculator(scoreData, userData);
        const lendingDecision = calculator.run();
        lendingDecision.decision = lendingDecision.approved === true
          ? 'Approve'
          : (lendingDecision.approved === false ? 'Reject' : 'Review');
        return { ...report, lendingDecision };
      } catch (err) {
        return { ...report, lendingDecision: { error: 'Failed to generate lending decision', details: err.message } };
      }
    }));

    res.json({
      status: 'success',
      results: enhancedDecisions.length,
      data: {
        decisions: enhancedDecisions
      }
    });
  } catch (error) {
    console.error('Error fetching recent decisions:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch recent decisions',
      error: error.message
    });
  }
});

// Save manual lending decision
router.post('/save-decision/:userId', auth, async (req, res) => {
  const { userId } = req.params;
  const { decision, notes, loanDetails, isManual } = req.body;
  
  try {
    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        error: 'Invalid user ID format',
        details: 'The provided user ID is not a valid MongoDB ObjectId'
      });
    }

    // Authorization check - only admins and lenders can save decisions
    if (req.user.role !== 'admin' && req.user.role !== 'lender') {
      return res.status(403).json({ 
        error: 'Not authorized',
        details: 'Only admins and lenders can save lending decisions'
      });
    }

    // Get user data
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        details: `No user found with ID: ${userId}`
      });
    }

    // Get existing credit report
    let creditReport = await CreditReport.findOne({ userId });
    
    if (!creditReport) {
      // Create a new credit report with valid default values
      creditReport = new CreditReport({
        userId,
        creditScore: { 
          fico: { 
            score: 650, // Default valid score
            version: 'FICO 8',
            lastUpdated: new Date(),
            range: { min: 300, max: 850 }
          }
        },
        totalDebt: 0,
        monthlyIncome: 0,
        recentMissedPayments: 0,
        recentDefaults: 0,
        lastUpdated: new Date()
      });
    }

    // Update the lending decision
    const newDecision = {
      decision: decision,
      reasons: req.body.reasons || [],
      recommendations: req.body.recommendations || [],
      isManual: isManual || false,
      manualNotes: notes || '',
      loanDetails: loanDetails || {},
      evaluatedAt: new Date(),
      evaluatedBy: req.user.id,
      maxLoanAmount: req.body.maxLoanAmount || 0,
      suggestedInterestRate: req.body.suggestedInterestRate || 0,
      debtToIncomeRatio: req.body.debtToIncomeRatio || 0
    };
    creditReport.lendingDecision = newDecision;
    // Push to history
    creditReport.lendingDecisionHistory = creditReport.lendingDecisionHistory || [];
    creditReport.lendingDecisionHistory.push(newDecision);
    await creditReport.save();

    res.json({
      success: true,
      message: 'Lending decision saved successfully',
      data: {
        userId,
        decision: creditReport.lendingDecision,
        savedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error saving lending decision:', error);
    res.status(500).json({
      error: 'Failed to save lending decision',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper to escape regex special characters
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Search borrowers by name, email, or phone (for lenders)
router.get('/search-borrowers', auth, async (req, res) => {
  try {
    if (!['lender', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied', details: 'Only lenders and admins can search borrowers' });
    }
    const { search = '' } = req.query;
    if (!search.trim() || search.trim().length < 2) {
      return res.json({ success: true, data: [] });
    }
    const safeSearch = escapeRegex(search);
    // Find users with a credit report and matching search
    const borrowers = await User.aggregate([
      {
        $lookup: {
          from: 'creditreports',
          let: { userId: '$_id', phoneNumber: '$phoneNumber' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$userId', '$$userId'] },
                    { $eq: ['$userId', '$$phoneNumber'] }
                  ]
                }
              }
            }
          ],
          as: 'creditReport'
        }
      },
      { $match: { 'creditReport.0': { $exists: true } } },
      {
        $match: {
          $or: [
            { name: { $regex: safeSearch, $options: 'i' } },
            { email: { $regex: safeSearch, $options: 'i' } },
            { username: { $regex: safeSearch, $options: 'i' } },
            { phoneNumber: { $regex: safeSearch, $options: 'i' } },
            { 'profile.phone': { $regex: safeSearch, $options: 'i' } }
          ]
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          createdAt: 1,
          updatedAt: 1,
          creditReportId: { $arrayElemAt: ['$creditReport._id', 0] },
          creditScore: { $ifNull: [{ $arrayElemAt: ['$creditReport.creditScore.fico.score', 0] }, null] },
          reportUpdatedAt: { $arrayElemAt: ['$creditReport.updatedAt', 0] }
        }
      },
      { $sort: { name: 1 } },
      { $limit: 50 }
    ]);
    res.json({ success: true, data: borrowers });
  } catch (error) {
    console.error('Error searching borrowers:', error);
    res.status(500).json({ error: 'Failed to search borrowers', details: error.message });
  }
});

// Export the router as default
export default router;