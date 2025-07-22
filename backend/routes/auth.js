import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import crypto from 'crypto';
import { emailTemplates, sendEmail } from '../config/email.js';
import { verificationLimiter, resendVerificationLimiter, authLimiter } from '../middleware/rateLimiter.js';
import AppError from '../utils/appError.js';

const router = express.Router();
const skipEmailVerification = process.env.SKIP_EMAIL_VERIFICATION === 'true';

// Validation middleware
const registerValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').trim().isEmail().withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain a special character'),
  body('passwordConfirm').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password confirmation does not match password');
    }
    return true;
  }).withMessage('Password confirmation does not match password'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('dateOfBirth').isISO8601().withMessage('Please enter a valid date of birth'),
  body('nationalId')
    .optional()
    .matches(/^\d{16}$/).withMessage('National ID must be exactly 16 digits')
    .trim(),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('role').optional().isIn(['user', 'premium', 'lender', 'admin', 'analyst']).withMessage('Invalid role'),
  body('monthlyIncome')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 }).withMessage('Monthly income must be a positive number'),
  body('monthlySavings')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 }).withMessage('Monthly savings must be a positive number'),
  body('totalDebt')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 }).withMessage('Total debt must be a positive number'),
  body('bankBalance')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 }).withMessage('Bank balance must be a positive number'),
  body('mobileMoneyBalance')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 }).withMessage('Mobile money balance must be a positive number'),
  body('employmentStatus').isIn(['employed', 'self-employed', 'unemployed', 'student', 'retired']).withMessage('Invalid employment status'),
  body('employerName').optional().trim(),
  body('industry').isIn(['technology', 'finance', 'healthcare', 'education', 'retail', 'manufacturing', 'agriculture', 'construction', 'transportation', 'other']).withMessage('Invalid industry'),
  body('gender').optional().isIn(['male', 'female', 'other', 'prefer-not-to-say']).withMessage('Invalid gender'),
  body('agreeTerms').isBoolean().withMessage('Terms acceptance is required'),
  body('authorizeCreditChecks').isBoolean().withMessage('Credit check authorization is required'),
  body('adminFields.initialCreditScore')
    .optional()
    .isInt({ min: 300, max: 850 })
    .withMessage('Initial credit score must be between 300 and 850'),
  body('adminFields.sourceNotes').optional().trim(),
  body('adminFields.branchVerification').optional().isBoolean(),
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
router.get('/verify-token', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return next(new AppError('User not found', 404));
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
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return next(new AppError('User not found', 404));
    
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
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// Login endpoint
router.post('/login', authLimiter, async (req, res, next) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return next(new AppError('Identifier and password are required.', 400));
  }
  let user = null;
  if (identifier.includes('@')) {
    user = await User.findOne({ email: identifier }).select('+password');
  } else {
    user = await User.findOne({ phoneNumber: identifier }).select('+password');
  }
  if (!user) {
    return next(new AppError('Invalid credentials', 401));
  }

  // Check password
  const isPasswordValid = await user.matchPassword(password);
  if (!isPasswordValid) {
    return next(new AppError('Invalid credentials', 401));
  }

  // Check if email is verified
  if (!user.emailVerified) {
    return next(new AppError('Email verification required', 403));
  }

  // Check account status
  if (user.status === 'pending') {
    return next(new AppError('Account pending verification', 403));
  }

  if (user.status === 'suspended') {
    return next(new AppError('Account suspended', 403));
  }

  if (user.status === 'deactivated') {
    return next(new AppError('Account deactivated', 403));
  }

  // Update last login
  user.lastLogin = new Date();
  if (user.phoneNumber) {
    await user.save();
  } else {
    // For legacy users without phoneNumber, do not save to avoid validation error
    // Optionally, you could add a migration to patch these users
  }

  // Generate JWT token
  const token = user.getSignedJwtToken();

  // Set JWT as httpOnly cookie
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });

  // Respond with new structure
  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        status: user.status
      }
    }
  });
});

// Registration endpoint
router.post('/register', [
  body('username').notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain alphanumeric characters and underscores'),
  body('name').notEmpty().withMessage('Name is required'),
  body('phoneNumber').notEmpty().withMessage('Phone number is required')
    .matches(/^\+?\d{9,15}$/).withMessage('Phone number must be 9-15 digits, can start with +'),
  body('password').notEmpty().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], async (req, res, next) => {
  console.log('[Signup] /register route hit. Payload:', req.body);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { username, name, phoneNumber, email, password } = req.body;
  try {
    // Check for existing user by phone number
    let user = await User.findOne({ phoneNumber });
    if (user) {
      return next(new AppError('Phone number already registered', 400));
    }
    // Optionally check for existing email
    if (email) {
      user = await User.findOne({ email });
      if (user) {
        return next(new AppError('Email already registered', 400));
      }
    }
    // Create user
    const newUser = new User(req.body);
    if (req.body.password) await newUser.save();
    else await newUser.save({ validateBeforeSave: false });
    res.status(201).json({ success: true, user: { _id: newUser._id, name: newUser.name, phoneNumber: newUser.phoneNumber } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Registration failed', details: err.message });
  }
});

// Resend verification email
router.post('/resend-verification', protect, resendVerificationLimiter, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(new AppError('User not found', 404));
    if (user.emailVerified) return next(new AppError('Email is already verified', 400));

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
    res.status(500).json({ status: 'error', message: 'Failed to resend verification email' });
  }
});

// Verify email
router.get('/verify-email/:token', verificationLimiter, async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) return next(new AppError('Invalid or expired verification token', 400));

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ status: 'error', message: 'Failed to verify email' });
  }
});

// Get user profile
router.get('/user-profile', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -ssnLast4 -twoFactorSecret -resetPasswordToken -resetPasswordExpire');
    
    if (!user) return next(new AppError('User not found', 404));
    
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
    res.status(500).json({ status: 'error', message: 'Error fetching user profile' });
  }
});

/**
 * @route   GET /api/v1/auth/check-email
 * @desc    Check if email is available
 * @access  Public
 */
router.get('/check-email', async (req, res, next) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return next(new AppError('Email parameter is required', 400));
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    
    res.json({
      available: !existingUser,
      email: email
    });
  } catch (error) {
    console.error('Email check error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

/**
 * @route   PUT /api/v1/auth/approve-user/:userId
 * @desc    Approve user after branch verification (Admin only)
 * @access  Private (Admin)
 */
router.put('/approve-user/:userId', protect, async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return next(new AppError('Access denied', 403));
    }

    const { userId } = req.params;
    const { branchVerification = true, notes } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Update user status and admin fields
    user.status = 'active';
    user.adminFields = {
      ...user.adminFields,
      branchVerification,
      sourceNotes: notes,
      verifiedBy: req.user._id,
      verificationDate: new Date()
    };

    await user.save();

    res.json({
      message: 'User approved successfully',
      user: {
        id: user._id,
        email: user.email,
        status: user.status,
        verifiedBy: req.user._id,
        verificationDate: user.adminFields.verificationDate
      }
    });
  } catch (error) {
    console.error('User approval error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error', details: error.message });
  }
});

// REMOVED: /update-plan endpoint since User model doesn't have plan fields

export default router;