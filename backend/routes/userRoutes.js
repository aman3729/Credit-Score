import express from 'express';
import { auth } from '../middleware/auth.js';
import User from '../models/User.js';
import CreditReport from '../models/CreditReport.js';
import { evaluateLendingDecision } from '../utils/lendingDecision.js';

const router = express.Router();

/**
 * @route   GET /api/users/:userId/credit-data
 * @desc    Get user's credit data and scores
 * @access  Private
 */
router.get('/:identifier/credit-data', auth, async (req, res) => {
  try {
    console.log('Fetching user data for identifier:', req.params.identifier);
    console.log('Authenticated user ID:', req.user?.id);
    
    const { identifier } = req.params;
    
    try {
      let user;
      
      // Check if identifier is an email
      if (identifier.includes('@')) {
        console.log('Searching by email:', identifier);
        user = await User.findOne({ email: identifier })
          .select('-password -resetPasswordToken -resetPasswordExpire')
          .lean();
      } else {
        // Otherwise treat as user ID
        console.log('Searching by ID:', identifier);
        user = await User.findById(identifier)
          .select('-password -resetPasswordToken -resetPasswordExpire')
          .lean();
      }
      
      console.log('Found user:', user ? 'Yes' : 'No');
      
      if (!user) {
        console.log('User not found');
        return res.status(404).json({ 
          success: false,
          error: 'User not found',
          identifier,
          type: identifier.includes('@') ? 'email' : 'id'
        });
      }
      
      // Verify the requesting user is either an admin or the user themselves
      const isAuthorized = req.user.role === 'admin' || req.user.id === user._id.toString();
      console.log('User authorized:', isAuthorized);
      
      if (!isAuthorized) {
        return res.status(403).json({ 
          success: false,
          error: 'Not authorized to access this data',
          requestedUser: user._id,
          authenticatedUser: req.user.id
        });
      }
      
      // Get user's credit report
      console.log('Fetching credit report for user:', user._id);
      
      // Find all credit reports and sort by either creditScore.fico.lastUpdated or lastUpdated
      const creditReport = await CreditReport.aggregate([
        { $match: { userId: user._id } },
        {
          $addFields: {
            // Use creditScore.fico.lastUpdated if it exists, otherwise fall back to lastUpdated
            sortDate: {
              $ifNull: [
                '$creditScore.fico.lastUpdated',
                '$lastUpdated'
              ]
            }
          }
        },
        { $sort: { sortDate: -1 } },
        { $limit: 1 },
        { $project: { sortDate: 0 } } // Remove the temporary field
      ]).then(docs => docs[0]); // Get the first (and only) result
      
      // If no credit report exists, return empty arrays
      if (!creditReport) {
        console.log('No credit report found for user');
        return res.json({
          success: true,
          data: {
            user,
            creditScores: [],
            currentScore: null,
            factors: []
          }
        });
      }
      
      // If no FICO score is available in the report, log detailed info
      if (!creditReport.creditScore?.fico) {
        console.log('[DEBUG] No FICO score found in the credit report');
        console.log('[DEBUG] Report structure:', JSON.stringify({
          hasCreditScore: !!creditReport.creditScore,
          hasFico: !!creditReport.creditScore?.fico,
          ficoScore: creditReport.creditScore?.fico?.score,
          lastUpdated: creditReport.lastUpdated,
          hasScoreHistory: Array.isArray(creditReport.scoreHistory) && creditReport.scoreHistory.length > 0
        }, null, 2));
        
        return res.json({
          success: true,
          data: {
            user: {
              ...user,
              creditScore: null,
              creditScoreLastUpdated: null
            },
            creditScores: [],
            currentScore: null,
            factors: []
          }
        });
      }
      
      // Get all credit reports for history
      const creditReports = await CreditReport.aggregate([
        { $match: { userId: user._id } },
        {
          $addFields: {
            // Use creditScore.fico.lastUpdated if it exists, otherwise fall back to lastUpdated
            sortDate: {
              $ifNull: [
                '$creditScore.fico.lastUpdated',
                '$lastUpdated',
                '$createdAt'
              ]
            },
            // Ensure we have a score to sort by
            hasScore: { $ne: ['$creditScore.fico.score', null] }
          }
        },
        { $match: { hasScore: true } }, // Only include reports with scores
        { $sort: { sortDate: 1 } } // Oldest first for history
      ]);
      
      // Format the history
      const creditScores = creditReports
        .map((report, index, array) => {
          const score = report.creditScore.fico.score;
          // Use creditScore.fico.lastUpdated, lastUpdated, or createdAt, in that order
          const date = new Date(
            report.creditScore.fico.lastUpdated || 
            report.lastUpdated || 
            report.createdAt || 
            new Date()
          );
          
          // Calculate change from previous score
          const prevScore = index > 0 ? array[index - 1]?.creditScore?.fico?.score : null;
          const change = prevScore !== null ? score - prevScore : 0;
          
          return {
            score,
            date: date.toISOString(),
            change: Math.round(change * 100) / 100, // Round to 2 decimal places
            reportId: report._id,
            factors: report.creditScore?.factors || report.factors || []
          };
        });
      
      console.log('Found credit score history:', creditScores.length, 'entries');
      
      // Prepare base response data
      const responseData = {
        success: true,
        data: {
          user: {
            ...user,
            // Ensure we don't send sensitive data
            password: undefined,
            resetPasswordToken: undefined,
            resetPasswordExpire: undefined,
            __v: undefined
          },
          creditScores,
          currentScore: creditReport.creditScore.fico.score,
          factors: creditReport.factors || [],
          // Include additional credit report data
          creditReport: {
            id: creditReport._id,
            lastUpdated: creditReport.lastUpdated || new Date().toISOString(),
            hasFicoScore: !!creditReport.creditScore?.fico,
            ficoScore: creditReport.creditScore?.fico?.score || null
          }
        }
      };
      
      // Log the complete response data for debugging
      console.log('Sending credit data response:', JSON.stringify({
        responseData: {
          ...responseData,
          data: {
            ...responseData.data,
            // Truncate large arrays for logging
            creditScores: responseData.data.creditScores?.length || 0,
            factors: responseData.data.factors?.length || 0
          }
        },
        timestamp: new Date().toISOString()
      }, null, 2));

      // Add lending decision if we have the required data
      try {
        const lendingData = {
          ...creditReport.creditScore.fico,
          totalDebt: creditReport.totalDebt || 0,
          monthlyIncome: creditReport.monthlyIncome || 0,
          recentMissedPayments: creditReport.recentMissedPayments || 0,
          recentDefaults: creditReport.recentDefaults || 0
        };
        
        const lendingDecision = evaluateLendingDecision(lendingData);
        responseData.data.lendingDecision = {
          decision: lendingDecision.decision,
          reasons: lendingDecision.reasons,
          recommendations: lendingDecision.recommendations
        };
      } catch (lendingError) {
        console.error('Error calculating lending decision:', lendingError);
        // Don't fail the request if lending decision fails
        responseData.data.lendingDecision = {
          error: 'Could not calculate lending decision',
          details: process.env.NODE_ENV === 'development' ? lendingError.message : undefined
        };
      }
      
      res.json(responseData);
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }
    
  } catch (error) {
    console.error('Error in user credit data route:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      path: req.path,
      params: req.params,
      user: req.user ? { id: req.user.id, role: req.user.role } : 'no user'
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

export default router;
