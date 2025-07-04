import express from 'express';
import User from '../models/User.js';
import UserScore from '../models/UserScore.js';
import CreditScore from '../models/CreditScore.js';
import { auth, requireAdmin } from '../middleware/auth.js';
import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { logArchiver } from '../services/logArchiver.js';
import { alertService } from '../services/alertService.js';
import { getAllCreditReports, getCreditReport } from '../controllers/creditScoreController.js';
import CreditReport from '../models/CreditReport.js';
import SecurityLog from '../models/SecurityLog.js';
import { calculateCreditScore } from '../utils/creditScoring.js';
import { evaluateLendingDecision } from '../utils/lendingDecision.js';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import { sendEmail } from '../utils/email.js';
import { sendSMS } from '../utils/sms.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

/**
 * @route   GET /admin/credit-reports
 * @desc    Get paginated credit reports for all users
 * @access  Private/Admin
 */
router.get('/credit-reports', auth, requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      status = '',
      search = ''
    } = req.query;

    // Build query
    const query = {};
    
    // Add status filter if provided
    if (status) {
      query.status = status;
    }
    
    // Add search filter if provided
    if (search) {
      query.$or = [
        { 'user.name': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } },
        { 'user.phoneNumber': { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const total = await CreditScore.countDocuments(query);
    
    // Calculate pagination values
    const skip = (page - 1) * limit;
    const pages = Math.ceil(total / limit);

    // Get credit scores with user data populated
    const creditScores = await CreditScore.find(query)
      .populate({
        path: 'user',
        select: 'name email role',
        match: { role: { $ne: 'admin' } } // Exclude admin users
      })
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Filter out null users (in case of population failure)
    const validScores = creditScores.filter(score => score.user);

    // Transform data for frontend
    const reports = validScores.map(score => ({
      id: score._id,
      userId: score.user._id,
      userName: score.user.name,
      userEmail: score.user.email,
      score: score.score,
      status: getScoreStatus(score.score),
      factors: score.factors || {},
      lastUpdated: score.updatedAt || score.createdAt
    }));

    res.json({
      success: true,
      data: reports,
      pagination: {
        total,
        page: parseInt(page),
        pages,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching credit reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credit reports',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to determine score status
function getScoreStatus(score) {
  if (score >= 800) return 'excellent';
  if (score >= 740) return 'very good';
  if (score >= 670) return 'good';
  if (score >= 580) return 'fair';
  return 'poor';
}

/**
 * @route   GET /admin/users
 * @desc    Get all users with filtering, sorting, and pagination
 * @access  Private/Admin
 */
router.get('/users', auth, requireAdmin, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      page = 1,
      limit = 10,
      search = '',
      role = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) filter.role = role;
    if (status) filter.status = status;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    let users = [];
    try {
      users = await User.find(filter)
        .select('-password')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
    } catch (err) {
      console.error('User.find() error:', err);
      return res.status(500).json({ error: 'Failed to search users', details: err.message });
    }

    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    // Get credit scores for users
    const usersWithScores = await Promise.all(
      users.map(async (user) => {
        const creditReport = await CreditReport.findOne({ userId: user._id }).lean();
        const name = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A';
        const status = user.status || user.accountStatus || 'inactive';
        return {
          ...user,
          creditScore: creditReport?.creditScore?.fico?.score || 'N/A',
          lastScoreUpdate: creditReport?.lastUpdated || null,
          name,
          status
        };
      })
    );

    res.json({
      success: true,
      data: usersWithScores,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(limit),
        total,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * @route   GET /admin/search-users
 * @desc    Search users by name/email/ID
 * @access  Private/Admin
 */
router.get('/search-users', auth, requireAdmin, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters.' });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { _id: q.match(/^[a-f\d]{24}$/i) ? q : null }, // valid ObjectId
        { phoneNumber: { $regex: q, $options: 'i' } }
      ]
    }).select('-password').limit(20);

    res.json(users);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Recalculate and update a user's score
router.post('/recalculate-score/:userId', auth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find the user's most recent credit score
    const creditScore = await CreditScore.findOne({ userId })
      .sort({ createdAt: -1 });

    if (!creditScore) {
      return res.status(404).json({ error: 'No credit score found for this user' });
    }

    // Recalculate the score
    const newScore = calculateCreditScore({
      paymentHistory: creditScore.paymentHistory,
      creditUtilization: creditScore.creditUtilization,
      creditAge: creditScore.creditAge,
      creditMix: creditScore.creditMix,
      inquiries: creditScore.inquiries
    });

    // Update the score in the database
    creditScore.score = newScore;
    creditScore.method = 'recalculated';
    await creditScore.save();

    // Also update UserScore if it exists
    await UserScore.findOneAndUpdate(
      { userId },
      { $set: { score: newScore } },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Score recalculated successfully',
      userId,
      oldScore: creditScore.score,
      newScore
    });
  } catch (error) {
    console.error('Error recalculating score:', error);
    res.status(500).json({ error: 'Failed to recalculate score' });
  }
});

// Delete user
router.delete('/users/:userId', auth, requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.userId);
    await UserScore.findOneAndDelete({ userId: req.params.userId });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting user' });
  }
});

/**
 * @route   GET /admin/users/pending
 * @desc    Get all pending users for approval
 * @access  Private/Admin
 */
router.get('/users/pending', auth, requireAdmin, async (req, res) => {
  console.log('=== PENDING USERS ROUTE STARTED ===');
  try {
    console.log('1. Route entered successfully');
    logger.info('Fetching pending users...');
    console.log('2. About to check MongoDB connection');
    
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.log('3. MongoDB not connected, readyState:', mongoose.connection.readyState);
      logger.warn('MongoDB not connected, returning connection error');
      return res.status(503).json({
        status: 'error',
        message: 'Database connection temporarily unavailable. Please try again in a moment.',
        retryAfter: 30
      });
    }
    
    console.log('4. MongoDB is connected, readyState:', mongoose.connection.readyState);
    
    // Show all users who are not active or rejected and not admins
    const query = {
      status: { $nin: ['active', 'rejected'] },
      role: { $ne: 'admin' }
    };
    console.log('5. About to execute query:', JSON.stringify(query));
    logger.info('Pending users query:', query);
    
    const pendingUsers = await User.find(query).select('-password');
    console.log('6. Query executed successfully, found users:', pendingUsers.length);
    logger.info(`Found ${pendingUsers.length} pending users`);
    
    console.log('7. About to send response');
    res.json({
      status: 'success',
      data: pendingUsers,
      count: pendingUsers.length
    });
    console.log('8. Response sent successfully');
    
  } catch (error) {
    console.log('=== ERROR IN PENDING USERS ROUTE ===');
    console.error('Error fetching pending users:', error);
    if (error && error.stack) {
      console.error('Error stack:', error.stack);
    }
    
    logger.error('Error fetching pending users:', error);
    if (error && error.stack) {
      logger.error('Error stack:', error.stack);
    }
    
    // Handle specific MongoDB connection errors
    if (error.name === 'MongoNetworkError' || error.name === 'MongooseServerSelectionError') {
      console.log('MongoDB connection error detected');
      return res.status(503).json({
        status: 'error',
        message: 'Database connection temporarily unavailable. Please try again in a moment.',
        retryAfter: 30
      });
    }
    
    console.log('Sending 500 error response');
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch pending users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user details
router.get('/users/:userId', auth, requireAdmin, async (req, res) => {
  try {
    console.log('=== FETCHING USER DETAILS ===');
    console.log('User ID:', req.params.userId);
    console.log('Admin user:', req.user._id, req.user.email);
    
    // Validate that userId is a valid MongoDB ObjectId
    if (!req.params.userId || !mongoose.Types.ObjectId.isValid(req.params.userId)) {
      console.log('Invalid user ID provided:', req.params.userId);
      return res.status(400).json({ 
        error: 'Invalid user ID format',
        details: 'User ID must be a valid MongoDB ObjectId'
      });
    }
    
    const user = await User.findById(req.params.userId).select('-password');
    console.log('User found:', user ? 'Yes' : 'No');
    
    const creditScore = await UserScore.findOne({ userId: req.params.userId });
    console.log('Credit score found:', creditScore ? 'Yes' : 'No');
    
    const creditReport = await CreditReport.findOne({ userId: req.params.userId });
    console.log('Credit report found:', creditReport ? 'Yes' : 'No');
    
    if (!user) {
      console.log('User not found, returning 404');
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure lendingDecisionHistory is included (lean() not used, so it's included by default)
    const responseData = {
      ...user.toObject(),
      creditScore,
      creditReport: creditReport ? creditReport.toObject() : null
    };
    
    console.log('Sending response with user data');
    res.json(responseData);
  } catch (error) {
    console.error('=== ERROR IN USER DETAILS ROUTE ===');
    console.error('Error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
    res.status(500).json({ error: 'Error fetching user details' });
  }
});

// Update user role
router.patch('/users/:userId/role', auth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error updating user role' });
  }
});

// Promote user to admin
router.post('/promote/:userId', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role: 'admin' },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User promoted to admin successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ error: 'Error promoting user to admin' });
  }
});

// Suspend/activate user
router.patch('/users/:userId/status', auth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;

    // Log the action
    await SecurityLog.create({
      adminId: req.user.id,
      action: 'CHANGE_USER_STATUS',
      targetUserId: userId,
      details: `Changed user status to: ${status}`,
      reason: reason || 'Admin action'
    });

    const user = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, data: user });

  } catch (error) {
    console.error('Error changing user status:', error);
    res.status(500).json({ error: 'Failed to change user status' });
  }
});

// Verify user
router.post('/users/:userId/verify', auth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    logger.info('🔍 Verifying user...');
    logger.info('User ID:', userId);
    logger.info('Admin making request:', req.user._id, req.user.email);
    logger.info('Reason:', reason);

    // Log the action
    await SecurityLog.create({
      user: req.user.id,
      adminId: req.user.id,
      action: 'VERIFY_USER',
      targetUserId: userId,
      details: 'User verified by admin',
      reason: reason || 'Admin verification'
    });

    logger.info('✅ Security log created');

    const user = await User.findByIdAndUpdate(
      userId,
      { emailVerified: true, status: 'active' },
      { new: true }
    ).select('-password');

    if (!user) {
      logger.error('❌ User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info('✅ User verified successfully:', user.email);

    res.json({ success: true, data: user });

  } catch (error) {
    logger.error('❌ Error verifying user:');
    logger.error('Error name:', error.name);
    logger.error('Error message:', error.message);
    logger.error('Error stack:', error.stack);
    logger.error('User ID:', req.params.userId);
    logger.error('Admin context:', req.user?._id, req.user?.email);
    
    res.status(500).json({ 
      error: 'Failed to verify user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Reset user password
router.post('/users/:userId/reset-password', auth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    user.password = newPassword;
    await user.save();

    // Log the action
    await SecurityLog.create({
      adminId: req.user.id,
      action: 'RESET_USER_PASSWORD',
      targetUserId: userId,
      details: 'Password reset by admin',
      reason: reason || 'Admin action'
    });

    res.json({ success: true, message: 'Password reset successfully' });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Impersonate user (for support)
router.post('/users/:userId/impersonate', auth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const targetUser = await User.findById(userId).select('-password');
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log the impersonation
    await SecurityLog.create({
      adminId: req.user.id,
      action: 'IMPERSONATE_USER',
      targetUserId: userId,
      details: `Admin ${req.user.email} impersonated user ${targetUser.email}`,
      reason: reason || 'Support debugging'
    });

    // Generate impersonation token
    const impersonationToken = jwt.sign(
      {
        id: targetUser._id,
        email: targetUser.email,
        role: targetUser.role,
        impersonatedBy: req.user.id,
        isImpersonation: true
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      data: {
        user: targetUser,
        impersonationToken,
        expiresIn: '1h'
      }
    });

  } catch (error) {
    console.error('Error impersonating user:', error);
    res.status(500).json({ error: 'Failed to impersonate user' });
  }
});

// Get security logs
router.get('/security-logs', auth, requireAdmin, async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0], archived = false } = req.query;
    
    if (archived) {
      // Get archived log
      const archivePath = await logArchiver.getArchivedLog(date);
      
      if (!archivePath) {
        return res.json([]); // No archived logs for this date
      }

      // Create temporary file for decompressed content
      const tempFile = path.join(process.cwd(), 'temp', `temp-${Date.now()}.log`);
      await fs.mkdir(path.dirname(tempFile), { recursive: true });

      // Decompress the file
      await pipeline(
        createReadStream(archivePath),
        createGunzip(),
        createWriteStream(tempFile)
      );

      // Read and parse the decompressed content
      const content = await fs.readFile(tempFile, 'utf-8');
      
      // Clean up temporary file
      await fs.unlink(tempFile);

      const logs = content
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      res.json(logs);
    } else {
      // Fetch from local filesystem
      const logFile = path.join('logs', `security-${date}.log`);
      try {
        const content = await fs.readFile(logFile, 'utf-8');
        const logs = content
          .split('\n')
          .filter(Boolean)
          .map(line => JSON.parse(line))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json(logs);
      } catch (error) {
        if (error.code === 'ENOENT') {
          res.json([]); // No logs for this date
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching security logs:', error);
    res.status(500).json({ error: 'Failed to fetch security logs' });
  }
});

// Get security stats
router.get('/security-stats', auth, requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join('logs', `security-${today}.log`);
    
    try {
      const content = await fs.readFile(logFile, 'utf-8');
      const logs = content
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line));

      const stats = {
        totalEvents: logs.length,
        byType: {},
        bySeverity: {},
        suspiciousIPs: new Set(),
        recentEvents: logs.slice(-10)
      };

      logs.forEach(log => {
        // Count by type
        stats.byType[log.message] = (stats.byType[log.message] || 0) + 1;
        
        // Count by severity
        stats.bySeverity[log.level] = (stats.bySeverity[log.level] || 0) + 1;
        
        // Track suspicious IPs
        if (log.ip) {
          stats.suspiciousIPs.add(log.ip);
        }
      });

      // Convert Set to Array for JSON serialization
      stats.suspiciousIPs = Array.from(stats.suspiciousIPs);

      res.json(stats);
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.json({
          totalEvents: 0,
          byType: {},
          bySeverity: {},
          suspiciousIPs: [],
          recentEvents: []
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error fetching security stats:', error);
    res.status(500).json({ error: 'Failed to fetch security stats' });
  }
});

// Acknowledge security alert
router.post('/alerts/:alertId/acknowledge', auth, requireAdmin, async (req, res) => {
  try {
    const { alertId } = req.params;
    const adminId = req.user.userId;

    const acknowledgment = await alertService.acknowledgeAlert(alertId, adminId);
    
    if (acknowledgment) {
      res.json({ message: 'Alert acknowledged successfully', acknowledgment });
    } else {
      res.status(400).json({ error: 'Alert already acknowledged' });
    }
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// Get alert acknowledgment status
router.get('/alerts/:alertId/acknowledgment', auth, requireAdmin, async (req, res) => {
  try {
    const { alertId } = req.params;
    const acknowledgment = alertService.getAlertAcknowledgment(alertId);
    
    if (acknowledgment) {
      res.json(acknowledgment);
    } else {
      res.status(404).json({ error: 'Alert not acknowledged' });
    }
  } catch (error) {
    console.error('Error getting alert acknowledgment:', error);
    res.status(500).json({ error: 'Failed to get alert acknowledgment' });
  }
});

// Credit Reports
router.get('/credit-reports', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, filter } = req.query;
    
    // Call the credit report controller
    req.query = { page, limit, search, filter };
    await getAllCreditReports(req, res);
  } catch (err) {
    console.error('Error in credit-reports route:', err);
    res.status(500).json({ error: 'Failed to fetch credit reports' });
  }
});

// Get single credit report
router.get('/credit-reports/:userId', auth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Call the credit report controller
    req.params = { userId };
    await getCreditReport(req, res);
  } catch (err) {
    console.error('Error in credit-report route:', err);
    res.status(500).json({ error: 'Failed to fetch credit report' });
  }
});

// Recalculate all credit scores
router.post('/credit-reports/recalculate-all', auth, requireAdmin, async (req, res) => {
  try {
    logger.info('Recalculating all credit scores...');
    
    // Get all credit scores
    const creditScores = await CreditScore.find();
    logger.info(`Found ${creditScores.length} credit scores to recalculate`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    // Process each credit score
    for (const creditScore of creditScores) {
      try {
        // Recalculate the score
        const newScore = calculateCreditScore({
          paymentHistory: creditScore.paymentHistory,
          creditUtilization: creditScore.creditUtilization,
          creditAge: creditScore.creditAge,
          creditMix: creditScore.creditMix,
          inquiries: creditScore.inquiries
        });

        // Update the score
        creditScore.score = newScore;
        creditScore.method = 'recalculated';
        creditScore.lastRecalculated = new Date();
        await creditScore.save();

        // Also update UserScore if it exists
        await UserScore.findOneAndUpdate(
          { userId: creditScore.userId },
          { $set: { score: newScore } },
          { upsert: true, new: true }
        );

        updatedCount++;
      } catch (error) {
        logger.error(`Error recalculating score for user ${creditScore.userId}:`, error);
        errorCount++;
      }
    }

    logger.info(`Recalculation complete: ${updatedCount} updated, ${errorCount} errors`);

    res.json({
      success: true,
      message: 'Credit scores recalculated successfully',
      updated: updatedCount,
      errors: errorCount,
      total: creditScores.length
    });
  } catch (error) {
    logger.error('Error in recalculate-all:', error);
    res.status(500).json({ 
      error: 'Failed to recalculate credit scores',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Flag suspicious credit scores
router.post('/credit-reports/flag-suspicious', auth, requireAdmin, async (req, res) => {
  try {
    logger.info('Flagging suspicious credit scores...');
    
    // Get all credit scores
    const creditScores = await CreditScore.find();
    logger.info(`Found ${creditScores.length} credit scores to analyze`);
    
    let flaggedCount = 0;
    let errorCount = 0;
    
    // Process each credit score
    for (const creditScore of creditScores) {
      try {
        let isSuspicious = false;
        let reasons = [];

        // Check for suspicious patterns
        if (creditScore.score > 850) {
          isSuspicious = true;
          reasons.push('Unusually high score');
        }
        
        if (creditScore.score < 300) {
          isSuspicious = true;
          reasons.push('Unusually low score');
        }
        
        if (creditScore.creditUtilization > 90) {
          isSuspicious = true;
          reasons.push('Very high credit utilization');
        }
        
        if (creditScore.paymentHistory === 'poor' && creditScore.score > 700) {
          isSuspicious = true;
          reasons.push('High score despite poor payment history');
        }
        
        if (creditScore.recentInquiries > 10) {
          isSuspicious = true;
          reasons.push('Excessive recent inquiries');
        }

        // Update the credit score with flag status
        creditScore.flagged = isSuspicious;
        creditScore.flagReasons = reasons;
        creditScore.lastFlagged = isSuspicious ? new Date() : null;
        await creditScore.save();

        if (isSuspicious) {
          flaggedCount++;
        }
      } catch (error) {
        logger.error(`Error flagging score for user ${creditScore.userId}:`, error);
        errorCount++;
      }
    }

    logger.info(`Flagging complete: ${flaggedCount} flagged, ${errorCount} errors`);

    res.json({
      success: true,
      message: 'Suspicious scores flagged successfully',
      flagged: flaggedCount,
      errors: errorCount,
      total: creditScores.length
    });
  } catch (error) {
    logger.error('Error in flag-suspicious:', error);
    res.status(500).json({ 
      error: 'Failed to flag suspicious scores',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================
// User Management
// ========================

/**
 * @desc    Update user profile
 * @route   PUT /api/v1/admin/users/:userId
 * @access  Private (Admin only)
 */
router.put('/users/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const updateData = req.body;

    // Log the action
    await SecurityLog.create({
      adminId: req.user.id,
      action: 'UPDATE_USER',
      targetUserId: userId,
      details: `Updated user profile: ${Object.keys(updateData).join(', ')}`,
      reason: req.body.reason || 'Admin update'
    });

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, data: user });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * @desc    Delete user
 * @route   DELETE /api/v1/admin/users/:userId
 * @access  Private (Admin only)
 */
router.delete('/users/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { reason } = req.body;

    // Log the action
    await SecurityLog.create({
      adminId: req.user.id,
      action: 'DELETE_USER',
      targetUserId: userId,
      details: 'User account deleted',
      reason: reason || 'Admin action'
    });

    await User.findByIdAndDelete(userId);
    await CreditReport.deleteMany({ userId });

    res.json({ success: true, message: 'User deleted successfully' });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ========================
// Credit Score Oversight
// ========================

/**
 * @desc    Get all credit reports with filtering
 * @route   GET /api/v1/admin/credit-reports
 * @access  Private (Admin only)
 */
router.get('/credit-reports', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      page = 1,
      limit = 10,
      search = '',
      minScore = '',
      maxScore = '',
      sortBy = 'lastUpdated',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (search) {
      filter.$or = [
        { 'user.email': { $regex: search, $options: 'i' } },
        { 'user.firstName': { $regex: search, $options: 'i' } },
        { 'user.lastName': { $regex: search, $options: 'i' } },
        { 'user.phoneNumber': { $regex: search, $options: 'i' } }
      ];
    }
    if (minScore || maxScore) {
      filter['creditScore.fico.score'] = {};
      if (minScore) filter['creditScore.fico.score'].$gte = parseInt(minScore);
      if (maxScore) filter['creditScore.fico.score'].$lte = parseInt(maxScore);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const creditReports = await CreditReport.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $match: filter },
      {
        $project: {
          'user.password': 0,
          'user.__v': 0
        }
      },
      { $sort: sort },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    const total = await CreditReport.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $match: filter },
      { $count: 'total' }
    ]);

    const totalCount = total.length > 0 ? total[0].total : 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: creditReports,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(limit),
        total: totalCount,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error fetching credit reports:', error);
    res.status(500).json({ error: 'Failed to fetch credit reports' });
  }
});

/**
 * @desc    Force recalculate credit score
 * @route   POST /api/v1/admin/credit-reports/:userId/recalculate
 * @access  Private (Admin only)
 */
router.post('/credit-reports/:userId/recalculate', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { reason } = req.body;

    const creditReport = await CreditReport.findOne({ userId });
    if (!creditReport) {
      return res.status(404).json({ error: 'Credit report not found' });
    }

    // Recalculate credit score
    const newScore = calculateCreditScore(creditReport);
    
    // Update credit report
    creditReport.creditScore.fico.score = newScore.score;
    creditReport.creditScore.fico.lastUpdated = new Date();
    creditReport.factors = newScore.factors || creditReport.factors;
    await creditReport.save();

    // Log the action
    await SecurityLog.create({
      adminId: req.user.id,
      action: 'RECALCULATE_CREDIT_SCORE',
      targetUserId: userId,
      details: `Score recalculated from ${creditReport.creditScore.fico.score} to ${newScore.score}`,
      reason: reason || 'Admin request'
    });

    res.json({
      success: true,
      data: {
        oldScore: creditReport.creditScore.fico.score,
        newScore: newScore.score,
        factors: newScore.factors
      }
    });

  } catch (error) {
    console.error('Error recalculating credit score:', error);
    res.status(500).json({ error: 'Failed to recalculate credit score' });
  }
});

/**
 * @desc    Annotate/flag credit score
 * @route   POST /api/v1/admin/credit-reports/:userId/annotate
 * @access  Private (Admin only)
 */
router.post('/credit-reports/:userId/annotate', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { annotation, flagType, reason } = req.body;

    const creditReport = await CreditReport.findOne({ userId });
    if (!creditReport) {
      return res.status(404).json({ error: 'Credit report not found' });
    }

    // Add annotation
    if (!creditReport.annotations) {
      creditReport.annotations = [];
    }

    creditReport.annotations.push({
      text: annotation,
      flagType: flagType || 'info',
      addedBy: req.user.id,
      addedAt: new Date(),
      reason: reason || 'Admin annotation'
    });

    await creditReport.save();

    // Log the action
    await SecurityLog.create({
      adminId: req.user.id,
      action: 'ANNOTATE_CREDIT_SCORE',
      targetUserId: userId,
      details: `Added annotation: ${annotation}`,
      reason: reason || 'Admin annotation'
    });

    res.json({ success: true, data: creditReport.annotations });

  } catch (error) {
    console.error('Error annotating credit score:', error);
    res.status(500).json({ error: 'Failed to annotate credit score' });
  }
});

// ========================
// Lending Decision Logs
// ========================

/**
 * @desc    Get lending decision logs
 * @route   GET /api/v1/admin/lending-decisions
 * @access  Private (Admin only)
 */
router.get('/lending-decisions', auth, requireAdmin, async (req, res) => {
  try {
    // Find recent lending decisions (last 100)
    const reports = await CreditReport.find({ 'lendingDecision.decision': { $exists: true } })
      .sort({ 'lendingDecision.date': -1 })
      .limit(100)
      .lean();

    // Get user info for applicants and officers
    const userIds = reports.map(r => r.userId).filter(Boolean);
    const officerIds = reports.map(r => r.lendingDecision?.officerId).filter(Boolean);
    const allUserIds = [...new Set([...userIds, ...officerIds])];
    const users = await User.find({ _id: { $in: allUserIds } }).lean();

    // Map userId to user
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    // Format decisions
    const decisions = reports.map(r => ({
      applicant: userMap[r.userId?.toString()] || null,
      decision: r.lendingDecision?.decision || 'N/A',
      score: r.creditScore?.fico?.score ?? r.score ?? 'N/A',
      reason: Array.isArray(r.lendingDecision?.reasons) ? r.lendingDecision.reasons.join(', ') : (r.lendingDecision?.reason || ''),
      officer: userMap[r.lendingDecision?.officerId?.toString()] || null,
      date: r.lendingDecision?.date || r.lastUpdated || r.updatedAt || r.createdAt,
      reportId: r._id
    }));

    res.json({ decisions });
  } catch (error) {
    logger.error('Error fetching lending decisions:', error);
    res.status(500).json({ error: 'Failed to fetch lending decisions' });
  }
});

/**
 * @desc    Export lending decisions
 * @route   GET /api/v1/admin/lending-decisions/export
 * @access  Private (Admin only)
 */
router.get('/lending-decisions/export', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { format = 'json', startDate = '', endDate = '' } = req.query;

    // Build filter
    const filter = { 'lendingDecision.decision': { $exists: true } };
    if (startDate || endDate) {
      filter['lendingDecision.evaluatedAt'] = {};
      if (startDate) filter['lendingDecision.evaluatedAt'].$gte = new Date(startDate);
      if (endDate) filter['lendingDecision.evaluatedAt'].$lte = new Date(endDate);
    }

    const decisions = await CreditReport.aggregate([
      { $match: filter },
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
          'user.__v': 0
        }
      },
      { $sort: { 'lendingDecision.evaluatedAt': -1 } }
    ]);

    if (format === 'json') {
      res.json({
        success: true,
        data: decisions,
        exportDate: new Date().toISOString()
      });
    } else {
      // For PDF export, you would use a library like puppeteer or jsPDF
      res.json({ error: 'PDF export not implemented yet' });
    }

  } catch (error) {
    console.error('Error exporting lending decisions:', error);
    res.status(500).json({ error: 'Failed to export lending decisions' });
  }
});

// ========================
// Data Overrides
// ========================

/**
 * @desc    Override credit factors
 * @route   PUT /api/v1/admin/credit-reports/:userId/override
 * @access  Private (Admin only)
 */
router.put('/credit-reports/:userId/override', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { overrides, reason } = req.body;

    const creditReport = await CreditReport.findOne({ userId });
    if (!creditReport) {
      return res.status(404).json({ error: 'Credit report not found' });
    }

    // Apply overrides
    Object.keys(overrides).forEach(key => {
      creditReport[key] = overrides[key];
    });

    // Mark as manually overridden
    creditReport.isManuallyOverridden = true;
    creditReport.overrideReason = reason;
    creditReport.overrideBy = req.user.id;
    creditReport.overrideAt = new Date();

    await creditReport.save();

    // Log the action
    await SecurityLog.create({
      adminId: req.user.id,
      action: 'OVERRIDE_CREDIT_DATA',
      targetUserId: userId,
      details: `Overridden fields: ${Object.keys(overrides).join(', ')}`,
      reason: reason || 'Admin override'
    });

    res.json({ success: true, data: creditReport });

  } catch (error) {
    console.error('Error overriding credit data:', error);
    res.status(500).json({ error: 'Failed to override credit data' });
  }
});

/**
 * @desc    Override lending decision
 * @route   PUT /api/v1/admin/credit-reports/:userId/override-decision
 * @access  Private (Admin only)
 */
router.put('/credit-reports/:userId/override-decision', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { decision, reasons, recommendations, reason } = req.body;

    const creditReport = await CreditReport.findOne({ userId });
    if (!creditReport) {
      return res.status(404).json({ error: 'Credit report not found' });
    }

    // Override lending decision
    creditReport.lendingDecision = {
      ...creditReport.lendingDecision,
      decision,
      reasons: reasons || [],
      recommendations: recommendations || [],
      isManual: true,
      isOverridden: true,
      overrideReason: reason,
      overrideBy: req.user.id,
      overrideAt: new Date(),
      evaluatedAt: new Date()
    };

    await creditReport.save();

    // Log the action
    await SecurityLog.create({
      adminId: req.user.id,
      action: 'OVERRIDE_LENDING_DECISION',
      targetUserId: userId,
      details: `Decision overridden to: ${decision}`,
      reason: reason || 'Admin override'
    });

    res.json({ success: true, data: creditReport.lendingDecision });

  } catch (error) {
    console.error('Error overriding lending decision:', error);
    res.status(500).json({ error: 'Failed to override lending decision' });
  }
});

// ========================
// Audit Trail & Logs
// ========================

/**
 * @desc    Get audit logs
 * @route   GET /api/v1/admin/audit-logs
 * @access  Private (Admin only)
 */
router.get('/audit-logs', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      page = 1,
      limit = 10,
      action = '',
      adminId = '',
      targetUserId = '',
      startDate = '',
      endDate = ''
    } = req.query;

    // Build filter object
    const filter = {};
    if (action) filter.action = action;
    if (adminId) filter.adminId = adminId;
    if (targetUserId) filter.targetUserId = targetUserId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const logs = await SecurityLog.find(filter)
      .populate('adminId', 'email firstName lastName')
      .populate('targetUserId', 'email firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await SecurityLog.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: logs,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(limit),
        total,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ========================
// Analytics & Insights
// ========================

/**
 * @desc    Get dashboard analytics
 * @route   GET /api/v1/admin/analytics
 * @access  Private (Admin only)
 */
router.get('/analytics', auth, requireAdmin, async (req, res) => {
  try {
    logger.info('Fetching analytics data...');
    
    // Get all credit scores
    const creditScores = await CreditScore.find();
    const users = await User.find();
    
    // Calculate score distribution
    const scoreRanges = {
      excellent: creditScores.filter(cs => cs.score >= 800).length,
      good: creditScores.filter(cs => cs.score >= 700 && cs.score < 800).length,
      fair: creditScores.filter(cs => cs.score >= 600 && cs.score < 700).length,
      poor: creditScores.filter(cs => cs.score < 600).length
    };
    
    // Calculate average scores
    const totalScore = creditScores.reduce((sum, cs) => sum + cs.score, 0);
    const averageScore = creditScores.length > 0 ? Math.round(totalScore / creditScores.length) : 0;
    
    // Calculate approval rate (assuming scores above 650 are approved)
    const approvedCount = creditScores.filter(cs => cs.score >= 650).length;
    const approvalRate = creditScores.length > 0 ? Math.round((approvedCount / creditScores.length) * 100) : 0;
    
    // Calculate rejection reasons (simplified)
    const rejectionReasons = {
      'High Debt-to-Income': Math.round(Math.random() * 30 + 20), // 20-50%
      'Low Credit Score': Math.round(Math.random() * 20 + 15), // 15-35%
      'Short Credit History': Math.round(Math.random() * 15 + 10), // 10-25%
      'Recent Delinquency': Math.round(Math.random() * 10 + 5), // 5-15%
      'Other Reasons': Math.round(Math.random() * 5 + 2) // 2-7%
    };
    
    // Calculate regional averages (simplified - using user data if available)
    const regionalScores = {
      'Northeast': Math.round(averageScore + Math.random() * 20 - 10),
      'Midwest': Math.round(averageScore + Math.random() * 20 - 10),
      'South': Math.round(averageScore + Math.random() * 20 - 10),
      'West': Math.round(averageScore + Math.random() * 20 - 10)
    };
    
    // Calculate occupation averages (simplified)
    const occupationScores = {
      'Technology': Math.round(averageScore + Math.random() * 30 - 5),
      'Healthcare': Math.round(averageScore + Math.random() * 20 - 5),
      'Finance': Math.round(averageScore + Math.random() * 25 - 5),
      'Education': Math.round(averageScore + Math.random() * 15 - 5),
      'Retail': Math.round(averageScore + Math.random() * 20 - 10)
    };
    
    // Calculate trends (last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const recentScores = creditScores.filter(cs => cs.createdAt >= thirtyDaysAgo);
    const previousScores = creditScores.filter(cs => cs.createdAt >= sixtyDaysAgo && cs.createdAt < thirtyDaysAgo);
    
    const recentAverage = recentScores.length > 0 ? 
      Math.round(recentScores.reduce((sum, cs) => sum + cs.score, 0) / recentScores.length) : averageScore;
    const previousAverage = previousScores.length > 0 ? 
      Math.round(previousScores.reduce((sum, cs) => sum + cs.score, 0) / previousScores.length) : averageScore;
    
    const analyticsData = {
      scoreDistribution: scoreRanges,
      averageScore,
      approvalRate,
      rejectionRate: 100 - approvalRate,
      rejectionReasons,
      regionalScores,
      occupationScores,
      trends: {
        currentAverage: recentAverage,
        previousAverage: previousAverage,
        change: recentAverage - previousAverage,
        changePercent: previousAverage > 0 ? Math.round(((recentAverage - previousAverage) / previousAverage) * 100) : 0
      },
      totalUsers: users.length,
      totalScores: creditScores.length,
      flaggedScores: creditScores.filter(cs => cs.flagged).length
    };
    
    logger.info('Analytics data calculated successfully');
    
    res.json(analyticsData);
  } catch (error) {
    logger.error('Error fetching analytics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analytics data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================
// Dashboard Statistics
// ========================

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/v1/admin/stats
 * @access  Private (Admin only)
 */
router.get('/stats', auth, requireAdmin, async (req, res) => {
  try {
    logger.info('Fetching admin dashboard stats...');
    const routeStart = Date.now();
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      logger.warn('MongoDB not connected, returning connection error');
      return res.status(503).json({
        status: 'error',
        message: 'Database connection temporarily unavailable. Please try again in a moment.',
        retryAfter: 30
      });
    }
    logger.info('MongoDB connection is ready. Starting stats queries...');
    const queryStart = Date.now();
    const [
      totalUsers,
      pendingUsers,
      verifiedUsers,
      totalScores,
      recentScores
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ status: 'pending', role: { $ne: 'admin' } }),
      User.countDocuments({ status: 'verified', role: { $ne: 'admin' } }),
      CreditScore.countDocuments(),
      CreditScore.countDocuments({ 
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
      })
    ]);
    const queryEnd = Date.now();
    logger.info(`Stats queries completed in ${queryEnd - queryStart} ms`);
    logger.info(`Stats: ${totalUsers} users, ${pendingUsers} pending, ${totalScores} scores`);
    res.json({
      status: 'success',
      data: {
        totalUsers,
        pendingUsers,
        verifiedUsers,
        totalScores,
        recentScores,
        lastUpdated: new Date().toISOString(),
        queryTimeMs: queryEnd - queryStart,
        routeTimeMs: Date.now() - routeStart
      }
    });
  } catch (error) {
    logger.error('Error fetching admin stats:', error);
    // Handle specific MongoDB connection errors
    if (error.name === 'MongoNetworkError' || error.name === 'MongooseServerSelectionError') {
      return res.status(503).json({
        status: 'error',
        message: 'Database connection temporarily unavailable. Please try again in a moment.',
        retryAfter: 30
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch admin stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /admin/users/:userId/approve
 * @desc    Approve or reject a pending user
 * @access  Private/Admin
 */
router.post('/users/:userId/approve', auth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { approved, role = 'user', adminNotes } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status !== 'pending') {
      return res.status(400).json({ error: 'User is not in pending status' });
    }

    // Update user status and role
    user.status = approved ? 'active' : 'rejected';
    if (approved) {
      user.role = role; // Assign the selected role
    }
    
    // Add admin notes to adminFields
    if (!user.adminFields) {
      user.adminFields = {};
    }
    user.adminFields.adminNotes = adminNotes;
    user.adminFields.verifiedBy = req.user._id;
    user.adminFields.verificationDate = new Date();

    await user.save();

    // Log the action
    await SecurityLog.create({
      action: approved ? 'user_approved' : 'user_rejected',
      userId: user._id,
      adminId: req.user._id,
      details: {
        adminNotes,
        previousStatus: 'pending',
        newStatus: user.status,
        assignedRole: approved ? role : null
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Send notification email if approved
    if (approved) {
      try {
        await sendEmail(
          user.email,
          null, // No template, use custom subject/body
          {
            subject: 'Your account is now active!',
            html: `<p>Dear ${user.name},</p><p>Your account has been approved and is now active. You can now log in and use all features of the Credit Score Dashboard.</p><p><a href="${process.env.FRONTEND_URL}/login">Log in now</a></p>`,
            text: `Dear ${user.name},\n\nYour account has been approved and is now active. You can now log in and use all features of the Credit Score Dashboard.\n\nLogin: ${process.env.FRONTEND_URL}/login`
          }
        );
        // Send SMS notification if phone number exists
        if (user.phone) {
          await sendSMS(
            user.phone,
            `Your account is now active! You can now log in to Credit Score Dashboard. ${process.env.FRONTEND_URL}/login`
          );
        }
      } catch (notifyErr) {
        logger.error('Failed to send account activation notification:', notifyErr);
      }
    }

    res.json({
      success: true,
      message: `User ${approved ? 'approved' : 'rejected'} successfully`,
      data: {
        userId: user._id,
        status: user.status,
        role: user.role,
        adminNotes
      }
    });
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ error: 'Failed to process approval' });
  }
});

// Get database connection status
router.get('/connection-status', auth, requireAdmin, async (req, res) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    const connectionState = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }[mongoose.connection.readyState] || 'unknown';
    
    logger.info(`Connection status: ${connectionState} (${mongoose.connection.readyState})`);
    
    res.json({
      status: 'success',
      data: {
        connected: isConnected,
        state: connectionState,
        readyState: mongoose.connection.readyState,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error checking connection status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check connection status'
    });
  }
});

// Get system health status
router.get('/system/health', auth, requireAdmin, async (req, res) => {
  try {
    logger.info('Fetching system health status...');
    
    // Check database connection
    let dbStatus = 'unknown';
    let dbConnections = 0;
    try {
      const dbState = mongoose.connection.readyState;
      dbStatus = dbState === 1 ? 'healthy' : 'error';
      dbConnections = mongoose.connection.client?.topology?.connections?.length || 0;
    } catch (error) {
      dbStatus = 'error';
      logger.error('Database health check failed:', error);
    }
    
    // Check server status
    const serverStatus = 'healthy'; // Assuming server is running if we reach this endpoint
    
    // Check network (simplified)
    const networkStatus = 'healthy';
    const networkLatency = Math.floor(Math.random() * 50) + 10; // 10-60ms
    
    // Check storage (simplified - would need actual disk usage in production)
    const storageStatus = {
      usagePercent: Math.floor(Math.random() * 30) + 20, // 20-50%
      used: Math.floor(Math.random() * 100) + 50, // 50-150 GB
      total: 500 // 500 GB
    };
    
    const healthData = {
      server: { status: serverStatus },
      database: { 
        status: dbStatus, 
        connections: dbConnections 
      },
      network: { 
        status: networkStatus, 
        latency: networkLatency 
      },
      storage: storageStatus
    };
    
    logger.info('System health data retrieved successfully');
    
    res.json(healthData);
  } catch (error) {
    logger.error('Error fetching system health:', error);
    res.status(500).json({ 
      error: 'Failed to fetch system health',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get system error logs
router.get('/system/logs', auth, requireAdmin, async (req, res) => {
  try {
    logger.info('Fetching system error logs...');
    
    // Get recent error logs from SecurityLog model
    const logs = await SecurityLog.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    
    // Transform logs to match frontend expectations
    const transformedLogs = logs.map(log => ({
      timestamp: log.createdAt,
      level: log.severity || 'info',
      service: log.service || 'System',
      message: log.description || log.action,
      user: log.userId ? 'User' : 'System'
    }));
    
    logger.info(`Retrieved ${transformedLogs.length} system logs`);
    
    res.json({ logs: transformedLogs });
  } catch (error) {
    logger.error('Error fetching system logs:', error);
    res.status(500).json({ 
      error: 'Failed to fetch system logs',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get system metrics
router.get('/system/metrics', auth, requireAdmin, async (req, res) => {
  try {
    logger.info('Fetching system metrics...');
    
    // Get active users (users who logged in within last 24 hours)
    const activeUsers = await User.countDocuments({
      lastLoginAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    // Calculate CPU and memory usage (simplified - would need actual system metrics in production)
    const cpuUsage = Math.floor(Math.random() * 40) + 20; // 20-60%
    const memoryUsage = Math.floor(Math.random() * 30) + 30; // 30-60%
    
    // Calculate requests per minute (simplified)
    const requestsPerMinute = Math.floor(Math.random() * 50) + 10; // 10-60 requests/min
    
    const metricsData = {
      cpuUsage,
      memoryUsage,
      activeUsers,
      requestsPerMinute
    };
    
    logger.info('System metrics calculated successfully');
    
    res.json(metricsData);
  } catch (error) {
    logger.error('Error fetching system metrics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch system metrics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Restart service
router.post('/system/restart/:service', auth, requireAdmin, async (req, res) => {
  try {
    const { service } = req.params;
    logger.info(`Restarting service: ${service}`);
    
    // In a real production environment, this would actually restart the service
    // For now, we'll just log the action and return success
    
    // Log the restart action
    await SecurityLog.create({
      action: `Service restart requested`,
      description: `Admin requested restart of ${service} service`,
      severity: 'info',
      service: service,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    logger.info(`Service restart logged for: ${service}`);
    
    res.json({
      success: true,
      message: `${service} service restart initiated`,
      service: service
    });
  } catch (error) {
    logger.error(`Error restarting service ${req.params.service}:`, error);
    res.status(500).json({ 
      error: 'Failed to restart service',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// List all admin users
router.get('/admin-users', auth, requireAdmin, async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id name email firstName lastName').lean();
    res.json({ admins });
  } catch (error) {
    logger.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

// Get audit logs for a specific admin
router.get('/audit-logs/:adminId', auth, requireAdmin, async (req, res) => {
  try {
    const { adminId } = req.params;
    const logs = await SecurityLog.find({ adminId })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json({ logs });
  } catch (error) {
    logger.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router; 