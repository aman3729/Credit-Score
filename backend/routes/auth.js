import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import crypto from 'crypto';
import { emailTemplates, sendEmail } from '../config/email.js';
import { verificationLimiter, resendVerificationLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();
const skipEmailVerification = process.env.SKIP_EMAIL_VERIFICATION === 'true';

// Validation middleware
const registerValidation = [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').trim().isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('role').optional().isIn(['user', 'premium', 'lender', 'admin', 'analyst']).withMessage('Invalid role'),
  body('nationalId')
    .matches(/^\d{16}$/).withMessage('National ID must be 16 digits')
    .trim(),
  body('monthlyIncome')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 }).withMessage('Monthly income must be a positive number'),
  body('totalDebt')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 }).withMessage('Total debt must be a positive number'),
  body('totalCredit')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 }).withMessage('Total credit must be a positive number'),
  body('creditFactors.overrideScore')
    .optional()
    .isInt({ min: 300, max: 850 })
    .withMessage('Override score must be between 300 and 850'),
  body('creditFactors.riskAdjustment')
    .optional()
    .isInt({ min: -50, max: 50 })
    .withMessage('Risk adjustment must be between -50 and 50')
];

// Handle OPTIONS requests
router.options('*', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': req.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Request-ID',
    'Access-Control-Allow-Credentials': 'true'
  }).status(204).send();  // Changed to 204 No Content
});

/**
 * @route   GET /api/v1/auth/verify-token
 * @desc    Verify JWT token and return user data
 * @access  Private
 */
router.get('/verify-token', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ valid: false, error: 'User not found' });
    }
    
    // Prepare user data matching the login response format
    const userData = {
      _id: user._id,
      id: user._id,  // Include both _id and id for compatibility
      username: user.username,
      email: user.email,
      name: user.name || user.username,
      role: user.role || 'user',
      emailVerified: user.emailVerified,
      plan: user.plan,
      preferences: user.preferences,
      status: user.status,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    console.log('Token verified for user:', userData.email, 'Role:', userData.role);
    
    res.json({
      valid: true,
      user: userData,
      data: { user: userData }  // Include in data object for backward compatibility
    });
  } catch (error) {
    console.error('Error in verify-token:', error);
    res.status(500).json({ valid: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (err) {
    console.error('Error in /me endpoint:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    console.log(`[${requestId}] Login attempt:`, { 
      email: req.body.email ? `${req.body.email.substring(0, 3)}...` : 'undefined',
      hasPassword: !!req.body.password,
      timestamp: new Date().toISOString()
    });
    
    if (!req.body) {
      console.error(`[${requestId}] No request body received`);
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Request body is required',
        requestId
      });
    }
    
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      console.log('Login failed: Missing email or password');
      return res.status(400).json({ 
        error: 'Email and password are required',
        message: 'Please provide both email and password.'
      });
    }
    
    // Find user by email
    console.log('Looking up user by email:', email);
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    
    if (!user) {
      console.log('Login failed: No user found with email:', email);
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'The email or password you entered is incorrect.'
      });
    }
    
    console.log('User found:', {
      id: user._id,
      email: user.email,
      emailVerified: user.emailVerified,
      status: user.status
    });
    
    // Compare passwords
    console.log('Comparing passwords...');
    let isMatch;
    try {
      console.log(`[${requestId}] Attempting to compare password for user:`, user.email);
      console.log(`[${requestId}] User ID:`, user._id);
      console.log(`[${requestId}] User has password field:`, !!user.password);
      
      if (!user.password) {
        console.error(`[${requestId}] No password hash found for user`);
        return res.status(500).json({
          error: 'Authentication error',
          message: 'User account is not properly configured. Please contact support.'
        });
      }
      
      console.log(`[${requestId}] Password hash length:`, user.password.length);
      console.log(`[${requestId}] Password hash prefix:`, user.password.substring(0, 10) + '...');
      
      isMatch = await user.comparePassword(password);
      console.log(`[${requestId}] Password comparison result:`, isMatch);
    } catch (error) {
      console.error(`[${requestId}] Error comparing passwords:`, {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      });
      
      return res.status(500).json({
        error: 'Authentication error',
        message: 'An error occurred during authentication. Please try again later.',
        requestId,
        timestamp: new Date().toISOString()
      });
    }
    
    if (!isMatch) {
      console.log('Login failed: Incorrect password for user:', user.email);
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'The email or password you entered is incorrect.'
      });
    }
    
    // Check if user is verified
    if (!user.emailVerified && !skipEmailVerification) {
      return res.status(403).json({
        error: 'Email not verified',
        message: 'Please verify your email address before logging in.'
      });
    }
    
    // Generate token
    const token = user.getSignedJwtToken();
    
    // Update last login timestamp
    user.lastLogin = Date.now();
    
    // Clean up creditHistory entries before saving
    if (user.creditHistory && Array.isArray(user.creditHistory)) {
      user.creditHistory = user.creditHistory.map(entry => {
        if (entry && !entry.source) {
          // Set a default source if missing
          return { ...entry, source: 'system-generated' };
        }
        return entry;
      });
    }
    
    // Save with validation disabled to prevent creditHistory validation errors
    await user.save({ validateBeforeSave: false });
    
    // Prepare user data for response (include all necessary fields)
    const userData = {
      _id: user._id,
      id: user._id,  // Include both _id and id for compatibility
      username: user.username,
      email: user.email,
      name: user.name || user.username,
      role: user.role || 'user',
      emailVerified: user.emailVerified,
      plan: user.plan,
      preferences: user.preferences,
      status: user.status,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    console.log('Login successful for user:', userData.email, 'Role:', userData.role);
    
    // Send response with token and user data
    return res.status(200).json({
      success: true,
      token,
      user: userData,
      data: { user: userData }  // Include in data object for backward compatibility
    });
    
  } catch (error) {
    const errorId = `err_${Date.now()}`;
    const errorTime = Date.now() - startTime;
    
    // Log the full error with context
    console.error('Login error:', error);
    console.log({
      requestId,
      errorId,
      request: {
        method: 'POST',
        url: '/api/v1/auth/login',
        body: {
          email: req.body.email ? `${req.body.email.substring(0, 3)}...@...` : 'undefined',
          hasPassword: !!req.body.password
        },
        headers: req.headers
      },
      responseTime: `${errorTime}ms`,
      timestamp: new Date().toISOString()
    });
    
    // Send detailed error response in development, generic in production
    const errorResponse = {
      success: false,
      error: 'Authentication failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred during authentication',
      errorId,
      timestamp: new Date().toISOString()
    };
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
      errorResponse.fullError = error;
    }
    
    res.status(500).json(errorResponse);
  }
});

// Registration endpoint
router.post('/register', registerValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: errors.array() 
    });
  }

  try {
    const { username, email, password, name, role = 'user' } = req.body;

    // Check for existing user
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).json({  // Changed to 409 Conflict
        message: 'User exists',
        error: 'User with this email or username already exists' 
      });
    }

    // Check for existing national ID
    if (req.body.nationalId) {
      const existingNationalId = await User.findOne({ nationalId: req.body.nationalId });
      if (existingNationalId) {
        return res.status(409).json({
          message: 'National ID exists',
          error: 'A user with this national ID already exists'
        });
      }
    }

    // Create new user
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    
    const userData = {
      username,
      email,
      password,
      name: name || email.split('@')[0],
      role: req.user?.role === 'admin' ? role : 'user',
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000,
      nationalId: req.body.nationalId,
      monthlyIncome: req.body.monthlyIncome || 0,
      totalDebt: req.body.totalDebt || 0,
      totalCredit: req.body.totalCredit || 0
    };

    // Add credit factors if user is admin/analyst and has permission
    if ((req.user?.role === 'admin' || req.user?.role === 'analyst') && 
        (req.body.creditFactors?.overrideScore || req.body.creditFactors?.riskAdjustment)) {
      userData.creditFactors = {
        overrideScore: req.body.creditFactors.overrideScore,
        riskAdjustment: req.body.creditFactors.riskAdjustment,
        lastUpdated: new Date(),
        updatedBy: req.user._id
      };
    }

    const user = new User(userData);
    await user.save();

    // Send verification email
    if (!skipEmailVerification) {
      await sendEmail({
        to: email,
        ...emailTemplates.emailVerification(user.username, verificationToken)
      });
    } else {
      // Auto-verify if skipping email verification
      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationTokenExpires = undefined;
      await user.save();
    }

    // Generate JWT token
    const token = user.getSignedJwtToken();

    res.status(201).json({
      message: skipEmailVerification 
        ? 'User registered successfully' 
        : 'User registered successfully. Please check your email to verify your account.',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: 'Internal server error'  // Generic error message
    });
  }
});

// Resend verification email
router.post('/resend-verification', protect, resendVerificationLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.emailVerified) return res.status(400).json({ error: 'Email is already verified' });

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    user.emailVerificationToken = hashedToken;
    user.emailVerificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    // Send email
    await sendEmail({
      to: user.email,
      ...emailTemplates.emailVerification(user.username, verificationToken)
    });

    res.json({ message: 'Verification email sent successfully' });
  } catch (error) {
    console.error('Error resending verification email:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// Verify email
router.get('/verify-email/:token', verificationLimiter, async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ error: 'Invalid or expired verification token' });

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Get user profile
router.get('/user-profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -ssnLast4 -twoFactorSecret -resetPasswordToken -resetPasswordExpire');
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin,
      status: user.status
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Error fetching user profile' });
  }
});

// REMOVED: /update-plan endpoint since User model doesn't have plan fields

export default router;