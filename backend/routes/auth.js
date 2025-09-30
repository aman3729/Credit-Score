import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import crypto from 'crypto';
import { emailTemplates, sendEmail } from '../config/email.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import AppError from '../utils/appError.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Simple RefreshToken model inline to avoid extra imports (uses mongoose if available)
const refreshTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  tokenHash: { type: String, index: true },
  expiresAt: { type: Date, index: true },
  revokedAt: Date,
  replacedBy: String,
  userAgent: String,
  ip: String
}, { timestamps: true });

const RefreshToken = mongoose.models.RefreshToken || mongoose.model('RefreshToken', refreshTokenSchema);

function signAccessToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRES || '7d' });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

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

// Test endpoint to verify auth routes are working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Logout endpoint: clear auth cookies
router.post('/logout', (req, res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  };
  try {
    res.clearCookie('jwt', cookieOptions);
    // Clear potential legacy or auxiliary cookies
    res.clearCookie('token', cookieOptions);
    res.clearCookie('XSRF-TOKEN', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    });
  } catch (e) {
    // ignore clear errors
  }
  return res.status(200).json({ status: 'success', message: 'Logged out' });
});

// Login endpoint
router.post('/login', rateLimiter.auth, async (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    const hasIdentifier = Boolean(req.body?.identifier);
    console.log('[Login] Request received', { hasIdentifier, ip: req.ip });
  }
  
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    console.log('[Login] Missing identifier or password');
    return next(new AppError('Identifier and password are required.', 400));
  }
  
  let user = null;
  if (identifier.includes('@')) {
    user = await User.findOne({ email: identifier }).select('+password');
    console.log('[Login] Searching by email:', identifier, 'User found:', !!user);
  } else {
    user = await User.findOne({ phoneNumber: identifier }).select('+password');
    console.log('[Login] Searching by phone:', identifier, 'User found:', !!user);
  }
  
  if (!user) {
    console.log('[Login] User not found');
    return next(new AppError('Invalid credentials', 401));
  }

  // Check password
  const isPasswordValid = await user.matchPassword(password);
  console.log('[Login] Password validation:', isPasswordValid);
  if (!isPasswordValid) {
    console.log('[Login] Invalid password');
    return next(new AppError('Invalid credentials', 401));
  }

  // Check if email is verified
  if (!user.emailVerified) {
    console.log('[Login] Email not verified');
    return next(new AppError('Email verification required', 403));
  }

  // Check account status
  if (user.status === 'pending') {
    console.log('[Login] Account pending');
    return next(new AppError('Account pending verification', 403));
  }

  if (user.status === 'suspended') {
    console.log('[Login] Account suspended');
    return next(new AppError('Account suspended', 403));
  }

  if (user.status === 'deactivated') {
    console.log('[Login] Account deactivated');
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
  console.log('[Login] JWT token generated successfully');

  // Set Access Token as httpOnly cookie
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });

  // Issue Refresh Token and set cookie
  const rt = signRefreshToken({ id: user._id });
  
  // Validate refresh token was generated
  if (!rt) {
    console.error('[Login] Failed to generate refresh token');
    return next(new AppError('Failed to generate refresh token', 500));
  }
  
  const rtHash = hashToken(rt);
  
  try {
    const rtDoc = new RefreshToken({
      user: user._id,
      tokenHash: rtHash,
      expiresAt: new Date(Date.now() + (process.env.REFRESH_TOKEN_MAX_AGE_MS ? parseInt(process.env.REFRESH_TOKEN_MAX_AGE_MS, 10) : 7 * 24 * 60 * 60 * 1000)),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    await rtDoc.save();
  } catch (error) {
    console.error('[Login] Error saving refresh token:', error);
    // Don't fail the login if we can't save the refresh token
    // The user can still use the access token until it expires
  }

  res.cookie('refresh_token', rt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: process.env.REFRESH_TOKEN_MAX_AGE_MS ? parseInt(process.env.REFRESH_TOKEN_MAX_AGE_MS, 10) : 7 * 24 * 60 * 60 * 1000
  });

  console.log('[Login] Login successful for user:', user.email);

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
  if (process.env.NODE_ENV !== 'production') {
    const hasEmail = Boolean(req.body?.email);
    const hasPhone = Boolean(req.body?.phoneNumber);
    console.log('[Signup] /register route hit', { hasEmail, hasPhone });
  }
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

    // Generate verification token
    const verificationToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    newUser.emailVerificationToken = hashedToken;
    newUser.emailVerificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await newUser.save();

    const verificationLink = `http://localhost:3000/api/v1/auth/verify-email/${verificationToken}`;
    if (process.env.NODE_ENV !== 'production') {
      console.log('VERIFICATION LINK (dev):', verificationLink);
    }
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Attempting to send verification email via SMTP...', newUser.email);
      }
      await sendEmail({
        to: newUser.email,
        ...emailTemplates.emailVerification(newUser.username || newUser.name, verificationLink)
      });
      if (process.env.NODE_ENV !== 'production') {
        console.log('Verification email sent via SMTP!');
      }
    } catch (err) {
      console.error('Failed to send verification email via SMTP:', err);
      await User.findByIdAndDelete(newUser._id); // Remove user if email fails
      return res.status(500).json({ status: 'error', message: 'There was an error sending the verification email. Please try again later!' });
    }

    res.status(201).json({ success: true, user: { _id: newUser._id, name: newUser.name, phoneNumber: newUser.phoneNumber } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Registration failed', details: err.message });
  }
});

// Resend verification email
router.post('/resend-verification', protect, rateLimiter.auth, async (req, res, next) => {
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
router.get('/verify-email/:token', rateLimiter.auth, async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      // Render a user-friendly error page
      return res.status(400).send(`
        <!DOCTYPE html>
        <html><head><title>Email Verification Failed</title></head>
        <body style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 30px;">
          <div style="max-width: 500px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #eee; padding: 30px;">
            <h2 style="color: #d32f2f;">Email Verification Failed</h2>
            <p>The verification link is invalid or has expired.</p>
            <p>Please request a new verification email or contact support if you need help.</p>
            <a href="/" style="color: #2d6cdf; text-decoration: underline;">Go to Home</a>
          </div>
        </body></html>
      `);
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;
    await user.save();

    // Render a user-friendly success page
    return res.send(`
      <!DOCTYPE html>
      <html><head><title>Email Verified</title></head>
      <body style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 30px;">
        <div style="max-width: 500px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #eee; padding: 30px;">
          <h2 style="color: #2d6cdf;">Email Verified!</h2>
          <p>Your email has been successfully verified. You can now log in to your account.</p>
          <a href="/" style="background: #2d6cdf; color: #fff; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold;">Go to Home</a>
        </div>
      </body></html>
    `);
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html><head><title>Email Verification Error</title></head>
      <body style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 30px;">
        <div style="max-width: 500px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #eee; padding: 30px;">
          <h2 style="color: #d32f2f;">Server Error</h2>
          <p>There was an error verifying your email. Please try again later or contact support.</p>
          <a href="/" style="color: #2d6cdf; text-decoration: underline;">Go to Home</a>
        </div>
      </body></html>
    `);
  }
});

// Forgot Password (send code)
router.post('/forgot-password', async (req, res, next) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ status: 'error', message: 'Email is required' });
  const user = await User.findOne({ email });
  if (!user) return res.status(200).json({ status: 'success', message: 'If that email exists, a reset code has been sent.' });

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
  user.resetPasswordCode = hashedCode;
  user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save();

  // Send code via email
  try {
    await sendEmail({
      to: user.email,
      subject: 'Your Password Reset Code',
      html: `<div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 30px;"><div style="max-width: 500px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #eee; padding: 30px;"><h2 style="color: #2d6cdf;">Password Reset Code</h2><p>Your password reset code is:</p><p style="font-size: 2em; font-weight: bold; letter-spacing: 4px; color: #2d6cdf; text-align: center;">${code}</p><p>This code will expire in 10 minutes.</p><hr><p style="font-size: 12px; color: #888;">If you did not request a password reset, you can safely ignore this email.</p></div></div>`
    });
    return res.status(200).json({ status: 'success', message: 'If that email exists, a reset code has been sent.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to send reset code. Please try again later.' });
  }
});

// Reset Password (with code)
router.post('/reset-password', async (req, res, next) => {
  const { email, code, password, passwordConfirm } = req.body;
  if (!email || !code || !password || !passwordConfirm) {
    return res.status(400).json({ status: 'error', message: 'All fields are required.' });
  }
  if (password !== passwordConfirm) {
    return res.status(400).json({ status: 'error', message: 'Passwords do not match.' });
  }
  const user = await User.findOne({ email });
  if (!user || !user.resetPasswordCode || !user.resetPasswordExpires) {
    return res.status(400).json({ status: 'error', message: 'Invalid or expired code.' });
  }
  if (user.resetPasswordExpires < Date.now()) {
    return res.status(400).json({ status: 'error', message: 'Reset code has expired.' });
  }
  const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
  if (hashedCode !== user.resetPasswordCode) {
    return res.status(400).json({ status: 'error', message: 'Invalid reset code.' });
  }
  // Update password
  user.password = await bcrypt.hash(password, 12);
  user.resetPasswordCode = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  return res.status(200).json({ status: 'success', message: 'Password has been reset. You can now log in.' });
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

// Refresh access token with rotation and reuse detection
router.post('/refresh-token', rateLimiter.auth, async (req, res, next) => {
  try {
    const rt = req.cookies?.refresh_token;
    if (!rt) {
      console.error('[Refresh Token] No refresh token provided');
      return next(new AppError('Refresh token missing', 401));
    }

    // Validate token format
    if (typeof rt !== 'string' || rt.trim() === '') {
      console.error('[Refresh Token] Invalid refresh token format');
      return next(new AppError('Invalid refresh token format', 401));
    }

    let payload;
    try {
      payload = jwt.verify(rt, process.env.JWT_REFRESH_SECRET);
      if (!payload || !payload.id) {
        throw new Error('Invalid token payload');
      }
    } catch (e) {
      console.error('[Refresh Token] Token verification failed:', e.message);
      return next(new AppError('Invalid or expired refresh token', 401));
    }

    const tokenHash = hashToken(rt);
    const stored = await RefreshToken.findOne({ tokenHash });
    
    if (!stored) {
      console.error('[Refresh Token] Token not found in database');
      return next(new AppError('Invalid refresh token', 401));
    }

    // Reuse detection: token not found or already revoked
    if (!stored || stored.revokedAt || (stored.expiresAt && stored.expiresAt < new Date())) {
      // Revoke all tokens for this user as a precaution
      if (stored?.user) {
        await RefreshToken.updateMany({ user: stored.user, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
      }
      res.clearCookie('refresh_token');
      res.clearCookie('jwt');
      return next(new AppError('Refresh token reuse detected. Please log in again.', 401));
    }

    const user = await User.findById(payload.id);
    if (!user) return next(new AppError('User not found', 401));

    // Rotate: revoke old and issue new
    const newRt = signRefreshToken({ id: user._id });
    const newRtHash = hashToken(newRt);
    stored.revokedAt = new Date();
    stored.replacedBy = newRtHash;
    await stored.save();

    const newRtDoc = new RefreshToken({
      user: user._id,
      tokenHash: newRtHash,
      expiresAt: new Date(Date.now() + (process.env.REFRESH_TOKEN_MAX_AGE_MS ? parseInt(process.env.REFRESH_TOKEN_MAX_AGE_MS, 10) : 7 * 24 * 60 * 60 * 1000)),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    await newRtDoc.save();

    const access = signAccessToken(user);

    // Set new cookies
    const common = {
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    };
    res.cookie('jwt', access, { ...common, httpOnly: true, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', newRt, { ...common, httpOnly: true, maxAge: process.env.REFRESH_TOKEN_MAX_AGE_MS ? parseInt(process.env.REFRESH_TOKEN_MAX_AGE_MS, 10) : 7 * 24 * 60 * 60 * 1000 });

    return res.json({ status: 'success' });
  } catch (error) {
    next(error);
  }
});

// Revoke on logout (clear cookies and revoke stored refresh token)
router.post('/logout', async (req, res, next) => {
  try {
    const rt = req.cookies?.refresh_token;
    if (rt) {
      const tokenHash = hashToken(rt);
      await RefreshToken.updateOne({ tokenHash }, { $set: { revokedAt: new Date() } });
    }
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    };
    res.clearCookie('jwt', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);
    res.clearCookie('XSRF-TOKEN', { httpOnly: false, secure: cookieOptions.secure, sameSite: cookieOptions.sameSite });
    return res.status(200).json({ status: 'success', message: 'Logged out' });
  } catch (e) {
    return res.status(200).json({ status: 'success', message: 'Logged out' });
  }
});

export default router;