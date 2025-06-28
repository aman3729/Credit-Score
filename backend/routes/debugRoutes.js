import express from 'express';
import User from '../models/User.js';
import CreditReport from '../models/CreditReport.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Debug route to check if a user exists and their credit reports
router.get('/user/:email', async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Math.random().toString(36).substr(2, 9)}`;
  const { email } = req.params;
  
  // Log request details
  logger.info(`[${requestId}] Debug request started`, {
    method: req.method,
    url: req.originalUrl,
    params: req.params,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString()
  });
  
  try {
    logger.info(`[${requestId}] Looking up user by email: ${email}`);
    
    // Find user by email with detailed logging
    const user = await User.findOne({ email })
      .select('-password')
      .lean()
      .maxTimeMS(10000); // 10 second timeout
      
    logger.info(`[${requestId}] User lookup completed`, { 
      userFound: !!user,
      userId: user?._id,
      duration: Date.now() - startTime
    });
    
    if (!user) {
      const response = {
        success: false,
        message: 'User not found',
        email,
        requestId,
        timestamp: new Date().toISOString()
      };
      
      logger.warn(`[${requestId}] User not found: ${email}`, response);
      return res.status(404).json(response);
    }
    
    logger.info(`[${requestId}] Looking up credit reports for user: ${user._id}`);
    
    // Find credit reports for this user with detailed logging
    const creditReports = await CreditReport.find({ userId: user._id })
      .lean()
      .maxTimeMS(10000); // 10 second timeout
      
    logger.info(`[${requestId}] Found ${creditReports.length} credit reports`, {
      userId: user._id,
      reportIds: creditReports.map(r => r._id),
      duration: Date.now() - startTime
    });
    
    // Prepare response data
    const responseData = {
      success: true,
      requestId,
      timestamp: new Date().toISOString(),
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      creditReports: creditReports.map(report => ({
        _id: report._id,
        creditScore: report.creditScore,
        status: report.status,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        reportSummary: {
          paymentHistory: report.paymentHistory,
          creditUtilization: report.creditUtilization,
          creditAgeMonths: report.creditAgeMonths,
          totalAccounts: report.totalAccounts
        }
      }))
    };
    
    // Log successful response (without sensitive data)
    logger.info(`[${requestId}] Sending successful response`, {
      userId: user._id,
      reportCount: responseData.creditReports.length,
      duration: Date.now() - startTime
    });
    
    res.json(responseData);
    
  } catch (error) {
    // Log the full error with stack trace
    logger.error(`[${requestId}] Error in debug route`, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue
      },
      duration: Date.now() - startTime
    });
    
    // Send error response
    const errorResponse = {
      success: false,
      error: error.message,
      errorType: error.name,
      requestId,
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        code: error.code,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue
      } : undefined
    };
    
    res.status(500).json(errorResponse);
  } finally {
    logger.info(`[${requestId}] Request completed`, {
      duration: `${Date.now() - startTime}ms`,
      memoryUsage: process.memoryUsage()
    });
  }
});

// Add a health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    nodeEnv: process.env.NODE_ENV,
    nodeVersion: process.version
  });
});

export default router;
