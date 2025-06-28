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
        { 'user.email': { $regex: search, $options: 'i' } }
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
 * @desc    Get all users with pagination and search
 * @access  Private/Admin
 */
router.get('/users', auth, requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    // Add search filter if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get paginated users
    const users = await User.find(query, {
      password: 0,
      refreshToken: 0,
      resetPasswordToken: 0,
      resetPasswordExpires: 0
    })
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

    res.json({
      success: true,
      data: users,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users',
      error: error.message
    });
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
        { _id: q.match(/^[a-f\d]{24}$/i) ? q : null } // valid ObjectId
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

    // Import the scoring function
    const { calculateCreditScore } = await import('../utils/creditScoring.js');
    
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

// Get all users with their credit scores
router.get('/users', auth, requireAdmin, async (req, res) => {
  try {
    console.log('Fetching all users with scores...');
    
    // Fetch users and scores in parallel
    const [users, userScores] = await Promise.all([
      User.find().select('-password').lean(),
      UserScore.find().lean()
    ]);

    console.log(`Found ${users.length} users and ${userScores.length} scores`);
    
    // Create a map of userId to score for faster lookup
    const scoreMap = new Map();
    userScores.forEach(score => {
      // Handle both ObjectId and string userIds
      const userId = score.userId?.toString();
      if (userId) {
        scoreMap.set(userId, score);
      }
    });

    console.log('Score map size:', scoreMap.size);
    
    const usersWithScores = users.map(user => {
      const userId = user._id.toString();
      const creditScore = scoreMap.get(userId);
      
      if (!creditScore) {
        console.log(`No score found for user ${userId} (${user.email})`);
      }
      
      return {
        ...user,
        creditScore,
        active: user.lastLogin > new Date(Date.now() - 24 * 60 * 60 * 1000)
      };
    });

    res.json(usersWithScores);
  } catch (error) {
    console.error('Error in /admin/users:', error);
    res.status(500).json({ 
      error: 'Error fetching users',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

// Get user details
router.get('/users/:userId', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    const creditScore = await UserScore.findOne({ userId: req.params.userId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      ...user.toObject(),
      creditScore
    });
  } catch (error) {
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
    const { page = 1, limit = 20 } = req.query;
    
    // Call the credit report controller
    req.query = { page, limit };
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

export default router; 