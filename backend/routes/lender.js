import express from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/auth.js';
import CreditReport from '../models/CreditReport.js';
import User from '../models/User.js';
import { evaluateLendingDecision } from '../utils/lendingDecision.js';

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
    const creditReport = await CreditReport.findOne({ userId })
      .populate('userId', 'email name')
      .lean();
    
    if (creditReport) {
      console.log(`[Credit Report] Found legacy credit report`);
      return res.json(creditReport);
    }
    
    // If still not found, return 404
    const error = new Error('Credit report not found');
    error.status = 404;
    error.details = `No credit report or score exists for user ID: ${userId}`;
    console.error('[Credit Report] Credit report not found:', error.details);
    return res.status(404).json({ 
      error: error.message,
      details: error.details
    });

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
    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        error: 'Invalid user ID format',
        details: 'The provided user ID is not a valid MongoDB ObjectId'
      });
    }

    // Authorization check - lenders can only view their own decisions
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ 
        error: 'Not authorized',
        details: 'You can only view lending decisions for your own account'
      });
    }

    // Get user data with credit report
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        details: `No user found with ID: ${userId}`
      });
    }

    // Get credit report data
    const creditReport = await CreditReport.findOne({ userId });
    if (!creditReport) {
      return res.status(404).json({
        error: 'Credit report not found',
        details: 'No credit report exists for this user'
      });
    }

    // Prepare data for decision making
    const decisionData = {
      ...user,
      creditScore: creditReport.creditScore?.fico?.score,
      totalDebt: creditReport.totalDebt || 0,
      monthlyIncome: user.monthlyIncome || 0,
      recentMissedPayments: creditReport.paymentHistory?.missedPayments || 0,
      recentDefaults: creditReport.paymentHistory?.defaults || 0,
      creditUtilization: creditReport.creditUtilization || 0,
      creditAge: creditReport.creditAge || 0
    };

    // Evaluate lending decision
    const decision = evaluateLendingDecision(decisionData);

    // Return the decision
    res.json({
      success: true,
      userId,
      decision: decision.decision,
      creditScore: decision.scoreData?.score,
      creditScoreClassification: decision.scoreData?.classification,
      reasons: decision.reasons,
      recommendations: decision.recommendations,
      evaluatedAt: new Date()
    });

  } catch (error) {
    console.error('Error evaluating lending decision:', error);
    res.status(500).json({
      error: 'Failed to evaluate lending decision',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

// Get lending decision for a specific user
// Log all incoming requests for debugging
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('Request Headers:', req.headers);
  console.log('Request Body:', req.body);
  next();
});

// Test endpoint to verify route registration
router.get('/test', (req, res) => {
  res.json({ message: 'Lender routes are working!' });
});

// Debug endpoint to list all available routes
router.get('/debug/routes', (req, res) => {
  const routes = [
    { method: 'GET', path: '/api/v1/lender/test' },
    { method: 'GET', path: '/api/v1/lender/debug/routes' },
    { method: 'GET', path: '/api/v1/lender/credit-report/:userId' },
    { method: 'POST', path: '/api/v1/lender/decision/:userId' },
    // Add other routes as needed
  ];
  res.json({ routes });
});

router.post('/decision/:userId', auth, async (req, res) => {
  console.log('Decision endpoint hit with params:', req.params);
  console.log('Request user:', req.user);
  console.log('Request body:', req.body);
  
  const { userId } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.error('Invalid user ID format:', userId);
    return res.status(400).json({ 
      error: 'Invalid user ID format',
      details: 'The provided user ID is not a valid MongoDB ObjectId'
    });
  }
  
  console.log('Lending decision request received for user:', userId);
  
  try {
    // Authorization check
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      console.log('Unauthorized access attempt:', { 
        userId, 
        requesterId: req.user.id, 
        requesterRole: req.user.role 
      });
      return res.status(403).json({ 
        error: 'Not authorized to access this resource',
        details: 'You do not have permission to access this user\'s data'
      });
    }

    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Invalid user ID format:', userId);
      return res.status(400).json({
        error: 'Invalid user ID format',
        details: 'The provided user ID is not a valid MongoDB ObjectId',
        receivedValue: userId
      });
    }

    const userIdObj = new mongoose.Types.ObjectId(userId);
    
    // Check user existence
    console.log('Checking user existence:', userIdObj);
    const user = await User.findById(userIdObj).lean();
    if (!user) {
      console.error('User not found:', userIdObj);
      return res.status(404).json({ 
        error: 'User not found',
        details: `No user found with ID: ${userId}`,
        solution: 'Please check the user ID and try again'
      });
    }
    
    console.log('User found, checking for credit report...');
    
    // Get latest credit report with fallback
    let creditReport;
    try {
      console.log('=== DEBUGGING CREDIT REPORT QUERY ===');
      
      // Log the user ID in different formats
      console.log('User ID details:', {
        userId: userIdObj,
        userIdType: typeof userIdObj,
        userIdString: userIdObj.toString(),
        userIdHexString: userIdObj.toString('hex'),
        userIdToHexString: userIdObj.toHexString()
      });
      
      // Try different query formats
      const queries = [
        { name: 'Direct ObjectId', query: { userId: userIdObj } },
        { name: 'String ID', query: { userId: userIdObj.toString() } },
        { name: 'Hex String', query: { userId: userIdObj.toHexString() } },
        { name: 'Nested _id', query: { 'userId._id': userIdObj } },
        { name: 'Nested _id String', query: { 'userId._id': userIdObj.toString() } }
      ];
      
      // Try each query and log results
      for (const {name, query} of queries) {
        console.log(`\n=== Trying query: ${name} ===`);
        console.log('Query:', JSON.stringify(query, null, 2));
        
        try {
          const count = await CreditReport.countDocuments(query);
          console.log(`Found ${count} credit reports`);
          
          if (count > 0) {
            const sample = await CreditReport.findOne(query).lean();
            console.log('Sample document:', {
              _id: sample._id,
              userId: sample.userId,
              userIdType: typeof sample.userId,
              hasCreditScore: !!sample.creditScore,
              createdAt: sample.createdAt
            });
          }
        } catch (queryError) {
          console.error(`Error with query ${name}:`, queryError.message);
        }
      }
      
      // Also try a raw MongoDB query to see all credit reports
      console.log('\n=== All credit reports in collection ===');
      try {
        const allReports = await CreditReport.find({}).limit(5).lean();
        console.log(`Total credit reports in collection: ${allReports.length}`);
        
        allReports.forEach((report, index) => {
          console.log(`\nReport ${index + 1}:`);
          console.log(JSON.stringify({
            _id: report._id?.toString(),
            _idType: typeof report._id,
            userId: report.userId?.toString(),
            userIdType: typeof report.userId,
            userIdConstructor: report.userId?.constructor?.name,
            hasCreditScore: !!report.creditScore,
            creditScore: report.creditScore?.fico?.score,
            createdAt: report.createdAt,
            // Include any other relevant fields that might help with debugging
            ...(report.userId && { userIdLength: report.userId.toString().length }),
            ...(report.userId && { userIdValue: report.userId.toString() })
          }, null, 2));
        });
        
        // Try to find any report with a similar user ID structure
        if (allReports.length > 0) {
          const sampleReport = allReports[0];
          console.log('\n=== Sample Report Structure ===');
          console.log(Object.keys(sampleReport));
          console.log('userId in report:', sampleReport.userId);
          console.log('userId type:', typeof sampleReport.userId);
          console.log('userId constructor:', sampleReport.userId?.constructor?.name);
          console.log('userId toString:', sampleReport.userId?.toString());
          console.log('userId toHexString:', sampleReport.userId?.toHexString?.());
        }
      } catch (error) {
        console.error('Error fetching all reports:', error);
      }
      
      // Try to find any credit report with the user ID in any field
      console.log('\n=== Searching for user ID in any field ===');
      try {
        const userIdString = userIdObj.toString();
        const userIdHexString = userIdObj.toHexString();
        
        console.log('Searching with:', {
          userIdObj: userIdObj.toString(),
          userIdString,
          userIdHexString
        });
        
        // Try different query formats
        const queries = [
          { name: 'Direct ObjectId', query: { userId: userIdObj } },
          { name: 'String ID', query: { userId: userIdString } },
          { name: 'Hex String', query: { userId: userIdHexString } },
          { name: 'Nested _id', query: { 'userId._id': userIdObj } },
          { name: 'Nested _id String', query: { 'userId._id': userIdString } },
          { name: 'Raw find with manual check', query: {} }
        ];
        
        for (const {name, query} of queries) {
          try {
            console.log(`\nTrying query: ${name}`);
            
            if (name === 'Raw find with manual check') {
              // Get all reports and manually check
              const allReports = await CreditReport.find({}).lean();
              console.log(`Checking ${allReports.length} reports manually`);
              
              for (const report of allReports) {
                const reportUserId = report.userId?.toString();
                if (reportUserId === userIdString || reportUserId === userIdHexString) {
                  console.log('Found matching report with manual check:', {
                    _id: report._id,
                    reportUserId,
                    searchId: userIdString
                  });
                  creditReport = report;
                  break;
                }
              }
            } else {
              const result = await CreditReport.findOne(query).lean();
              if (result) {
                console.log(`Match found with ${name}:`, {
                  _id: result._id,
                  userId: result.userId,
                  userIdType: typeof result.userId,
                  queryUsed: query
                });
                creditReport = result;
                break;
              }
            }
          } catch (queryError) {
            console.error(`Error with query ${name}:`, queryError.message);
          }
        }
        
        if (!creditReport) {
          console.log('No credit reports found with any matching criteria');
        }
      } catch (broadError) {
        console.error('Error in broad search:', broadError);
      }
    } catch (reportError) {
      console.error('Error fetching credit report:', {
        error: reportError.message,
        stack: reportError.stack,
        userId: userIdObj
      });
      return res.status(500).json({
        error: 'Error fetching credit report',
        details: 'An error occurred while retrieving the credit report',
        ...(process.env.NODE_ENV === 'development' && { 
          errorDetails: reportError.message 
        })
      });
    }

    if (!creditReport) {
      console.error('No credit report found for user:', userIdObj);
      return res.status(404).json({ 
        error: 'Credit report not found',
        details: `No credit report exists for user ${userId}`,
        solution: 'Please generate a credit report first',
        debug: {
          userId: userId,
          userIdType: typeof userId,
          userIdIsValid: mongoose.Types.ObjectId.isValid(userId),
          userExists: true
        }
      });
    }
    
    console.log('Credit report found, extracting credit score...');
    
    // Extract credit score from the credit report
    const creditScore = creditReport.creditScore?.fico?.score;
    
    if (typeof creditScore !== 'number' || creditScore < 300 || creditScore > 850) {
      console.error('Invalid credit score in report:', {
        score: creditScore,
        userId: userIdObj,
        reportId: creditReport._id
      });
      return res.status(400).json({
        error: 'Invalid credit score data',
        details: 'The credit report contains an invalid credit score',
        solution: 'Please regenerate the credit report',
        debug: {
          userId: userId,
          creditScore: creditScore,
          creditScoreType: typeof creditScore,
          creditReportId: creditReport._id
        }
      });
    }

    // Prepare decision data
    const decisionData = {
      ...user,
      ...creditReport,
      currentScore: creditScore,  // creditScore is already the score number
      scoreData: creditReport.creditScore  // Include full score data
    };

    // Generate decision
    console.log('Generating lending decision with data:', {
      userId: user._id,
      hasCreditScore: !!creditReport.creditScore,
      decisionDataKeys: Object.keys(decisionData)
    });
    
    try {
      const decision = evaluateLendingDecision(decisionData);
      
      // Add metadata to response
      decision.timestamp = new Date().toISOString();
      decision.userId = userId;
      decision.userEmail = user.email;
      decision.creditReportId = creditReport._id;

      console.log('Generated lending decision:', {
        decision,
        creditScore: creditReport.creditScore?.fico?.score,
        hasCreditScore: !!creditReport.creditScore
      });

      res.json(decision);
    } catch (decisionError) {
      console.error('Error in evaluateLendingDecision:', {
        error: decisionError.message,
        stack: decisionError.stack,
        decisionData: {
          userId: user._id,
          creditScore: creditReport.creditScore?.fico?.score,
          hasCreditScore: !!creditReport.creditScore
        }
      });
      
      throw new Error(`Failed to generate lending decision: ${decisionError.message}`);
    }
  } catch (error) {
    console.error('Error generating lending decision:', error);
    
    // Handle specific error types
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid ID format',
        details: 'One of the provided IDs is not valid'
      });
    }

    res.status(500).json({ 
      error: 'Error generating lending decision',
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

    res.json({
      status: 'success',
      results: recentDecisions.length,
      data: {
        decisions: recentDecisions
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

// Export the router as default
export default router;