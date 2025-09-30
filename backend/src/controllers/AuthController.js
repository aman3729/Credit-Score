import { logger } from '../../config/logger.js';
import AppError from '../../utils/appError.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../../config/email.js';

/**
 * Authentication controller for handling auth-related HTTP requests
 */
export class AuthController {
  constructor(userService) {
    this.userService = userService;
  }

  /**
   * User registration endpoint
   */
  register = catchAsync(async (req, res, next) => {
    const { name, email, username, password, bankId, role } = req.body;

    logger.info('Registration request received', { email, username });

    // Validate required fields
    if (!name || !email || !username || !password || !bankId) {
      throw new AppError('All required fields must be provided', 400);
    }

    // Validate bank ID
    const validBankIds = [
      'CBE', 'DBE', 'AWASH', 'DASHEN', 'ABYSSINIA', 'WEGAGEN', 'NIB', 'HIBRET', 'LION', 'COOP',
      'ZEMEN', 'OROMIA', 'BUNNA', 'BERHAN', 'ABAY', 'ADDIS', 'DEBUB', 'ENAT', 'GADAA', 'HIJRA',
      'SHABELLE', 'SIINQEE', 'TSEHAY', 'AMHARA', 'AHADU', 'GOH', 'AMAN'
    ];

    if (!validBankIds.includes(bankId)) {
      throw new AppError('Invalid bank selection', 400);
    }

    // Create user
    const user = await this.userService.createUser({
      name,
      email,
      username,
      password,
      bankId,
      role: role || 'user'
    });

    // Send welcome email if email verification is enabled
    if (process.env.SKIP_EMAIL_VERIFICATION !== 'true') {
      try {
        await sendWelcomeEmail(user.email, user.name);
        logger.info('Welcome email sent', { userId: user._id });
      } catch (emailError) {
        logger.error('Failed to send welcome email', { 
          userId: user._id,
          error: emailError.message 
        });
      }
    }

    // Generate tokens
    const token = this.userService.generateToken(user);
    const refreshToken = this.userService.generateRefreshToken(user);

    // Set cookies
    this.setAuthCookies(res, token, refreshToken);

    // Remove password from response
    user.password = undefined;

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user,
        token,
        refreshToken
      }
    });
  });

  /**
   * User login endpoint
   */
  login = catchAsync(async (req, res, next) => {
    const { identifier, password } = req.body;

    logger.info('Login request received', { identifier });

    // Validate required fields
    if (!identifier || !password) {
      throw new AppError('Email/username and password are required', 400);
    }

    // Authenticate user
    const user = await this.userService.authenticateUser(identifier, password);

    // Generate tokens
    const token = this.userService.generateToken(user);
    const refreshToken = this.userService.generateRefreshToken(user);

    // Set cookies
    this.setAuthCookies(res, token, refreshToken);

    // Remove password from response
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user,
        token,
        refreshToken
      }
    });
  });

  /**
   * User logout endpoint
   */
  logout = catchAsync(async (req, res, next) => {
    // Clear cookies
    res.clearCookie('jwt');
    res.clearCookie('refreshToken');

    logger.info('User logged out', { userId: req.user?.id });

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  });

  /**
   * Refresh token endpoint
   */
  refreshToken = catchAsync(async (req, res, next) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      // Get user
      const user = await this.userService.findById(decoded.id);
      if (!user) {
        throw new AppError('User not found', 401);
      }

      // Generate new tokens
      const newToken = this.userService.generateToken(user);
      const newRefreshToken = this.userService.generateRefreshToken(user);

      // Set new cookies
      this.setAuthCookies(res, newToken, newRefreshToken);

      res.status(200).json({
        status: 'success',
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      logger.error('Token refresh failed', { error: error.message });
      throw new AppError('Invalid refresh token', 401);
    }
  });

  /**
   * Forgot password endpoint
   */
  forgotPassword = catchAsync(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Email is required', 400);
    }

    logger.info('Password reset requested', { email });

    const result = await this.userService.initiatePasswordReset(email);

    // Send reset email if user exists
    if (result.message.includes('sent')) {
      try {
        await sendPasswordResetEmail(email, result.resetToken);
        logger.info('Password reset email sent', { email });
      } catch (emailError) {
        logger.error('Failed to send password reset email', { 
          email,
          error: emailError.message 
        });
      }
    }

    res.status(200).json({
      status: 'success',
      message: result.message
    });
  });

  /**
   * Reset password endpoint
   */
  resetPassword = catchAsync(async (req, res, next) => {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      throw new AppError('Reset token and new password are required', 400);
    }

    logger.info('Password reset attempt', { resetToken: resetToken.substring(0, 10) + '...' });

    const user = await this.userService.completePasswordReset(resetToken, newPassword);

    // Generate new tokens
    const token = this.userService.generateToken(user);
    const refreshToken = this.userService.generateRefreshToken(user);

    // Set cookies
    this.setAuthCookies(res, token, refreshToken);

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully',
      data: {
        token,
        refreshToken
      }
    });
  });

  /**
   * Get current user profile
   */
  getProfile = catchAsync(async (req, res, next) => {
    const user = await this.userService.findById(req.user.id, {
      select: '-password -passwordResetToken -passwordResetExpires'
    });

    res.status(200).json({
      status: 'success',
      data: { user }
    });
  });

  /**
   * Update current user profile
   */
  updateProfile = catchAsync(async (req, res, next) => {
    const { name, username, monthlyIncome, monthlySavings, totalDebt, bankBalance } = req.body;

    const updatedUser = await this.userService.updateProfile(req.user.id, {
      name,
      username,
      monthlyIncome,
      monthlySavings,
      totalDebt,
      bankBalance
    });

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });
  });

  /**
   * Change password endpoint
   */
  changePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400);
    }

    await this.userService.updatePassword(req.user.id, currentPassword, newPassword);

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  });

  /**
   * Set authentication cookies
   * @param {Response} res - Express response object
   * @param {string} token - JWT token
   * @param {string} refreshToken - Refresh token
   */
  setAuthCookies(res, token, refreshToken) {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes for JWT
    };

    const refreshCookieOptions = {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days for refresh token
    };

    res.cookie('jwt', token, cookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);
  }
} 