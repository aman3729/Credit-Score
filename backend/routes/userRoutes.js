import express from 'express';
import { auth } from '../middleware/auth.js';
import { requireValidConsent } from '../middleware/auth.js';
import User from '../models/User.js';
import CreditReport from '../models/CreditReport.js';
import { evaluateLendingDecision } from '../utils/lendingDecision.js';
import { calculateCreditScore } from '../utils/creditScoring.js';
import { generateReasoning, generateImprovementSuggestions } from '../utils/reasoningEngine.js';
import mongoose from 'mongoose';
import { grantOrRenewConsent, getConsentStatus, adminOverrideConsent, getConsentAuditLog, getLenderAccessHistory, getAllLenderAccessHistory } from '../controllers/userController.js';

const router = express.Router();

/**
 * @route   GET /api/users/:identifier/credit-data
 * @desc    Get user's credit data and scores
 * @access  Private
 */
router.get('/:identifier/credit-data', auth, requireValidConsent, async (req, res) => {
  try {
    const { identifier } = req.params;
    const authenticatedUserId = req.user?.id;
    
    console.log('Fetching credit data for:', identifier, 'by user:', authenticatedUserId);

    // Validate identifier format if it's an ID
    if (!identifier.includes('@') && !mongoose.Types.ObjectId.isValid(identifier)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user identifier format',
        identifierType: 'id'
      });
    }

    let user;
    if (identifier.includes('@')) {
      user = await User.findOne({ email: identifier })
        .select('-password -resetPasswordToken -resetPasswordExpire')
        .lean();
    } else {
      user = await User.findById(identifier)
        .select('-password -resetPasswordToken -resetPasswordExpire')
        .lean();
    }

    if (!user) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'User not found',
        identifier
      });
    }

    // Authorization check
    const isAuthorized = req.user.role === 'admin' || req.user.id === user._id.toString();
    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false,
        error: 'Not authorized to access this data',
        requestedUser: user._id,
        authenticatedUser: req.user.id
      });
    }

    // Get user's credit report
    let creditReport;
    try {
      creditReport = await CreditReport.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(user._id) } },
        {
          $addFields: {
            sortDate: {
              $ifNull: [
                '$creditScore.fico.lastUpdated',
                '$lastUpdated'
              ]
            }
          }
        },
        { $sort: { sortDate: -1 } },
        { $limit: 1 }
      ]).then(docs => docs[0] || null);
    } catch (dbError) {
      console.error('Database aggregation error:', dbError);
      return res.status(500).json({ 
        status: 'error', 
        message: 'Failed to retrieve credit report',
        details: process.env.NODE_ENV === 'development' ? dbError.message : null
      });
    }

    if (!creditReport) {
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

    // Handle missing FICO score
    if (!creditReport.creditScore?.fico?.score) {
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

    // Get credit history
    let creditReports = [];
    try {
      creditReports = await CreditReport.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(user._id) } },
        {
          $addFields: {
            sortDate: {
              $ifNull: [
                '$creditScore.fico.lastUpdated',
                '$lastUpdated',
                '$createdAt'
              ]
            },
            hasScore: { $ne: ['$creditScore.fico.score', null] }
          }
        },
        { $match: { hasScore: true } },
        { $sort: { sortDate: 1 } }
      ]);
    } catch (historyError) {
      console.error('Failed to get credit history:', historyError);
      // Continue with empty history
    }

    // Format credit history
    const creditScores = creditReports.map((report, index) => {
      const score = report.creditScore.fico.score;
      const date = new Date(
        report.creditScore.fico.lastUpdated || 
        report.lastUpdated || 
        report.createdAt
      );
      
      const prevScore = index > 0 ? creditReports[index - 1].creditScore.fico.score : null;
      const change = prevScore !== null ? score - prevScore : 0;
      
      const events = [];
      if (Array.isArray(report.closedAccounts) && report.closedAccounts.length > 0) {
        events.push('Credit card closed');
      }
      if (Array.isArray(report.newLoans) && report.newLoans.length > 0) {
        events.push('New loan opened');
      }
      if (typeof report.missedPayments === 'number' && report.missedPayments > 0) {
        const month = date.toLocaleString('default', { month: 'short' });
        events.push(`${report.missedPayments} missed payments in ${month}`);
      }
      
      return {
        score,
        date: date.toISOString(),
        change: Math.round(change * 100) / 100,
        reportId: report._id,
        factors: report.creditScore?.factors || report.factors || [],
        events,
      };
    });

    // Generate lending decision if missing
    if (!creditReport.lendingDecision || !creditReport.lendingDecision.decision) {
      try {
        const scoreData = {
          score: creditReport.creditScore.fico.score,
          classification: creditReport.creditScore?.classification || 'Unknown',
          version: 'v101',
        };
        
        const userData = {
          paymentHistory: creditReport.paymentHistory || 0,
          creditUtilization: creditReport.creditUtilization || 0,
          creditAge: creditReport.creditAge || 0,
          creditMix: creditReport.creditMix || 0,
          inquiries: creditReport.inquiries || 0,
          activeLoanCount: creditReport.openAccounts || 0,
          onTimePaymentRate: creditReport.onTimePaymentRate || 1,
          onTimeRateLast6Months: creditReport.onTimeRateLast6Months || 1,
          loanTypeCounts: creditReport.loanTypeCounts || {},
          missedPaymentsLast12: creditReport.missedPaymentsLast12 || 0,
          recentLoanApplications: creditReport.recentLoanApplications || 0,
          defaultCountLast3Years: creditReport.defaultCountLast3Years || 0,
          consecutiveMissedPayments: creditReport.consecutiveMissedPayments || 0,
          recentDefaults: creditReport.recentDefaults || 0,
          monthsSinceLastDelinquency: creditReport.monthsSinceLastDelinquency || 999,
          monthlyIncome: creditReport.monthlyIncome || 0,
          totalDebt: creditReport.totalDebt || 0,
        };
        
        const decision = evaluateLendingDecision(scoreData, userData);
        
        // Map approvedAmount to maxLoanAmount
        if (decision.offer?.maxAmount) {
          decision.maxLoanAmount = decision.offer.maxAmount;
        } else if (decision.approvedAmount) {
          decision.maxLoanAmount = decision.approvedAmount;
        } else {
          decision.maxLoanAmount = 0;
        }
        
        creditReport.lendingDecision = decision;
        
        // Update database
        await CreditReport.updateOne(
          { _id: creditReport._id },
          { 
            $set: { lendingDecision: decision },
            $push: { lendingDecisionHistory: decision }
          }
        );
      } catch (decisionError) {
        console.error('Failed to generate lending decision:', decisionError);
        creditReport.lendingDecision = {
          decision: 'Error',
          reasons: ['Failed to generate decision'],
          recommendation: null,
          riskFlags: ['ENGINE_ERROR'],
          engineVersion: 'v101',
          evaluatedAt: new Date()
        };
      }
    }

    // Calculate DTI consistently
    const calculatedDti = (creditReport.monthlyIncome > 0 && creditReport.totalDebt) 
      ? +(creditReport.totalDebt / creditReport.monthlyIncome).toFixed(4)
      : 0;
    
    // Prepare base response
    const responseData = {
      success: true,
      data: {
        user: {
          ...user,
          password: undefined,
          resetPasswordToken: undefined,
          resetPasswordExpire: undefined,
          __v: undefined
        },
        creditScores,
        currentScore: creditReport.creditScore.fico.score,
        factors: creditReport.factors || [],
        creditReport: {
          id: creditReport._id,
          lastUpdated: creditReport.lastUpdated || new Date().toISOString(),
          hasFicoScore: !!creditReport.creditScore?.fico,
          ficoScore: creditReport.creditScore?.fico?.score
        },
        monthlyIncome: creditReport.monthlyIncome || null,
        totalDebt: creditReport.totalDebt || null,
        recentMissedPayments: creditReport.recentMissedPayments || null,
        recentDefaults: creditReport.recentDefaults || null,
        creditUtilization: creditReport.creditUtilization || null,
        creditMix: creditReport.creditMix || null,
        creditAgeMonths: creditReport.creditAgeMonths || null,
        totalAccounts: creditReport.totalAccounts || null,
        openAccounts: creditReport.openAccounts || null,
        lendingDecisionHistory: creditReport.lendingDecisionHistory || [],
        dti: calculatedDti
      }
    };

    // Add calculated credit score details
    try {
      const scoreInput = {
        paymentHistory: creditReport.paymentHistory || 0,
        creditUtilization: typeof creditReport.creditUtilization === 'number'
          ? creditReport.creditUtilization
          : (typeof creditReport.creditUtilization?.overall === 'number'
              ? creditReport.creditUtilization.overall
              : 0),
        creditAge: creditReport.creditAge || 0,
        creditMix: creditReport.creditMix || 0,
        inquiries: (typeof creditReport.inquiries === 'number' && !isNaN(creditReport.inquiries))
          ? creditReport.inquiries
          : 0,
        activeLoanCount: creditReport.openAccounts || 0,
        monthlyIncome: creditReport.monthlyIncome || 0,
        monthlyDebtPayments: (creditReport.totalDebt || 0) * 0.1 // Estimate monthly payments as 10% of total debt
      };
      
      // Use the existing score from the database instead of recalculating
      const existingScore = creditReport.creditScore?.fico?.score || responseData.currentScore;
      const existingClassification = creditReport.creditScore?.classification || 'Good';
      
      // Calculate the score for breakdown purposes only
      const scoreResult = calculateCreditScore(scoreInput);
      
      // Create a score result object using the existing score and classification
      const scoreResultForLending = {
        ...scoreResult,
        score: existingScore,
        classification: existingClassification
      };
      
      // Generate fresh lending decision using evaluateLendingDecision
      const { evaluateLendingDecision } = await import('../utils/lendingDecision.js');
      const userDataForLending = {
        ...scoreInput,
        onTimePaymentRate: creditReport.onTimePaymentRate || 1,
        onTimeRateLast6Months: creditReport.onTimeRateLast6Months || 1,
        loanTypeCounts: creditReport.loanTypeCounts || {},
        missedPaymentsLast12: creditReport.missedPaymentsLast12 || 0,
        recentLoanApplications: creditReport.recentLoanApplications || 0,
        defaultCountLast3Years: creditReport.defaultCountLast3Years || 0,
        consecutiveMissedPayments: creditReport.consecutiveMissedPayments || 0,
        recentDefaults: creditReport.recentDefaults || 0,
        monthsSinceLastDelinquency: creditReport.monthsSinceLastDelinquency || 999,
        activeLoanCount: creditReport.openAccounts || 0,
        monthlyIncome: creditReport.monthlyIncome || 0,
        totalDebt: creditReport.totalDebt || 0,
        employmentStatus: 'employed', // Default assumption
        collateralValue: 0
      };
      
      console.log('DEBUG: Using existing score:', existingScore, 'classification:', existingClassification);
      console.log('DEBUG: scoreResultForLending:', JSON.stringify(scoreResultForLending, null, 2));
      console.log('DEBUG: userDataForLending:', JSON.stringify(userDataForLending, null, 2));
      
      let freshLendingDecision;
      try {
        freshLendingDecision = evaluateLendingDecision(scoreResultForLending, userDataForLending);
        console.log('DEBUG: freshLendingDecision:', JSON.stringify(freshLendingDecision, null, 2));
      } catch (lendingError) {
        console.error('DEBUG: Lending decision error:', lendingError);
        // Fallback to basic decision
        freshLendingDecision = {
          decision: 'Review',
          score: existingScore,
          classification: existingClassification,
          riskTier: 'Unknown',
          riskTierLabel: 'Unknown',
          defaultRiskEstimate: 'Unknown',
          engineVersion: 'v2.1',
          reasons: ['Error calculating lending decision'],
          riskFlags: [],
          offer: {
            maxAmount: 0,
            availableTerms: [],
            interestRate: null,
            samplePayment: null,
            sampleTerm: null,
            collateralRequired: false
          },
          dti: scoreResultForLending.dti || 0,
          dtiRating: 'Unknown',
          timestamp: new Date().toISOString(),
          scoringDetails: {
            recessionMode: false,
            aiEnabled: false
          },
          customerProfile: {
            employmentStatus: 'unknown',
            activeLoans: userDataForLending.activeLoanCount || 0,
            lastDelinquency: userDataForLending.monthsSinceLastDelinquency || 'N/A'
          }
        };
      }
      
      // Ensure we use the classification from the existing score
      freshLendingDecision.classification = existingClassification;
      
      // Map offer fields to expected frontend format
      if (freshLendingDecision.offer) {
        freshLendingDecision.maxLoanAmount = freshLendingDecision.offer.maxAmount || 0;
        freshLendingDecision.suggestedInterestRate = freshLendingDecision.offer.interestRate || 0;
      }
      

      
      // Ensure breakdown structure exists
      if (!scoreResultForLending.breakdown) scoreResultForLending.breakdown = {};
      if (!scoreResultForLending.breakdown.componentRatings) {
        scoreResultForLending.breakdown.componentRatings = {};
      }
      
      // Add DTI component with consistent calculation
      scoreResultForLending.breakdown.componentRatings.dti = {
        value: calculatedDti, // Use decimal value directly
        label: calculatedDti < 0.2 ? 'Excellent' : 
               calculatedDti < 0.35 ? 'Good' : 
               calculatedDti < 0.5 ? 'Fair' : 'Poor'
      };
      
      // Update the score result DTI
      scoreResultForLending.dti = calculatedDti;
      
      responseData.data.scoreResult = scoreResultForLending;
      responseData.data.lendingDecision = freshLendingDecision;
      
      // Generate reasoning and suggestions
      const userDataForReasoning = {
        ...scoreInput,
        monthlyIncome: creditReport.monthlyIncome || 0,
        totalDebt: creditReport.totalDebt || 0,
        recentMissedPayments: creditReport.recentMissedPayments || 0,
        recentDefaults: creditReport.recentDefaults || 0,
        creditAge: creditReport.creditAge || 0,
        creditMix: creditReport.creditMix || 0,
        inquiries: (typeof creditReport.inquiries === 'number' && !isNaN(creditReport.inquiries))
          ? creditReport.inquiries
          : 0,
      };
      
      responseData.data.alerts = generateReasoning(userDataForReasoning, scoreResultForLending, freshLendingDecision).summary;
      responseData.data.recommendations = generateReasoning(userDataForReasoning, scoreResultForLending, freshLendingDecision).recommendations;
      responseData.data.improvementSuggestions = generateImprovementSuggestions(userDataForReasoning, scoreResultForLending);
      
    } catch (calculationError) {
      console.error('Score calculation error:', calculationError);
      responseData.data.scoreError = 'Failed to calculate detailed score breakdown';
    }

    res.json(responseData);
    
  } catch (error) {
    console.error('Error in user credit data route:', {
      message: error.message,
      stack: error.stack,
      path: req.path,
      params: req.params,
      user: req.user ? { id: req.user.id, role: req.user.role } : 'no user'
    });
    
    res.status(500).json({ 
      status: 'error', 
      message: 'Server error', 
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/users/:userId/refresh-credit-score
 * @desc    Refresh user's credit score (Premium feature)
 * @access  Private
 */
router.post('/:userId/refresh-credit-score', auth, requireValidConsent, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Authorization check
    const isAuthorized = req.user.role === 'admin' || req.user.id === userId;
    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false,
        error: 'Not authorized to refresh this user\'s credit score'
      });
    }
    
    // Check user existence
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    
    // Premium check
    if (!user.premium?.isPremium && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Premium feature - upgrade required'
      });
    }
    
    // Get latest report
    const latestReport = await CreditReport.findOne({ userId })
      .sort({ 'creditScore.fico.lastUpdated': -1, lastUpdated: -1 });
    
    if (!latestReport) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'No credit report found for user' 
      });
    }
    
    // Update timestamps
    const updateData = {
      lastUpdated: new Date(),
      'creditScore.fico.lastUpdated': new Date()
    };
    
    const updatedReport = await CreditReport.findByIdAndUpdate(
      latestReport._id,
      updateData,
      { new: true }
    );
    
    res.json({
      success: true,
      data: {
        message: 'Credit score refreshed successfully',
        lastUpdated: updatedReport.lastUpdated,
        score: updatedReport.creditScore?.fico?.score
      }
    });
    
  } catch (error) {
    console.error('Error refreshing credit score:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to refresh credit score', 
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

// Grant or renew user consent
router.patch('/:userId/consent', auth, grantOrRenewConsent);

// Consent status endpoint
router.get('/me/consent-status', auth, getConsentStatus);

// Admin override consent endpoint (admin only)
router.patch('/:userId/consent/admin-override', auth, adminOverrideConsent);

// Admin: get consent audit log for a user
router.get('/:userId/consent/audit-log', auth, getConsentAuditLog);

// Admin: get lender access history
router.get('/lenders/:lenderId/access-history', auth, getLenderAccessHistory);

// Admin: get all lender access history (global)
router.get('/lenders/all/access-history', auth, getAllLenderAccessHistory);

export default router;