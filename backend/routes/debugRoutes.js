import express from 'express';
import User from '../models/User.js';
import CreditReport from '../models/CreditReport.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';

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

// Temporary endpoint to fix admin password
router.post('/fix-admin-password', async (req, res) => {
  try {
    console.log('🔧 Fixing admin password...');
    
    // Find admin user
    const adminUser = await User.findOne({ email: 'admin@example.com' }).select('+password');
    
    if (!adminUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admin user not found' 
      });
    }
    
    console.log('✅ Found admin user:', adminUser.email);
    console.log('Current role:', adminUser.role);
    
    // Test current password
    const testPassword = 'Admin123!';
    const currentMatch = await bcrypt.compare(testPassword, adminUser.password);
    console.log('Current password test result:', currentMatch);
    
    if (!currentMatch) {
      console.log('🔧 Creating new password hash...');
      
      // Create new password hash
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(testPassword, salt);
      
      // Update the password
      adminUser.password = hashedPassword;
      await adminUser.save();
      
      console.log('✅ Password updated');
      
      // Test the new password
      const newMatch = await bcrypt.compare(testPassword, adminUser.password);
      console.log('New password test result:', newMatch);
      
      if (newMatch) {
        console.log('🎉 SUCCESS! Admin password fixed');
        return res.json({
          success: true,
          message: 'Admin password fixed successfully',
          email: 'admin@example.com',
          password: 'Admin123!'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Password fix failed'
        });
      }
    } else {
      console.log('✅ Admin password is already correct');
      return res.json({
        success: true,
        message: 'Admin password is already correct',
        email: 'admin@example.com',
        password: 'Admin123!'
      });
    }
    
  } catch (error) {
    console.error('❌ Error fixing admin password:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fixing admin password',
      error: error.message
    });
  }
});

// Temporary endpoint to verify admin email and fix admin user
router.post('/fix-admin-user', async (req, res) => {
  try {
    console.log('🔧 Fixing admin user...');
    
    // Find admin user by email from .env
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminUser = await User.findOne({ email: adminEmail }).select('+password');
    
    if (!adminUser) {
      return res.status(404).json({ 
        success: false, 
        message: `Admin user ${adminEmail} not found` 
      });
    }
    
    console.log('✅ Found admin user:', adminUser.email);
    console.log('Current role:', adminUser.role);
    console.log('Email verified:', adminUser.isEmailVerified);
    
    // Fix email verification
    if (!adminUser.isEmailVerified) {
      adminUser.isEmailVerified = true;
      adminUser.emailVerified = true;
      console.log('✅ Email verification fixed');
    }
    
    // Fix password if needed
    const testPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
    const currentMatch = await bcrypt.compare(testPassword, adminUser.password);
    console.log('Current password test result:', currentMatch);
    
    if (!currentMatch) {
      console.log('🔧 Creating new password hash...');
      
      // Create new password hash
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(testPassword, salt);
      
      // Update the password
      adminUser.password = hashedPassword;
      console.log('✅ Password updated');
    }
    
    // Save all changes
    await adminUser.save();
    
    console.log('🎉 SUCCESS! Admin user fixed');
    return res.json({
      success: true,
      message: 'Admin user fixed successfully',
      email: adminUser.email,
      password: testPassword,
      role: adminUser.role,
      emailVerified: adminUser.isEmailVerified
    });
    
  } catch (error) {
    console.error('❌ Error fixing admin user:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fixing admin user',
      error: error.message
    });
  }
});

export default router;
