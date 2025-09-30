import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import { BaseService } from './BaseService.js';
import User from '../../models/User.js';
import { logger } from '../../config/logger.js';
import AppError from '../../utils/appError.js';

/**
 * User service for handling user-related business logic
 */
export class UserService extends BaseService {
  constructor() {
    super(User);
  }

  /**
   * Create a new user with proper validation and password hashing
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  async createUser(userData) {
    try {
      // Check for existing user
      const existingUser = await this.checkExistingUser(userData.email, userData.username);
      if (existingUser) {
        throw new AppError(existingUser.message, 400);
      }

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      // Create user with hashed password
      const user = await this.create({
        ...userData,
        password: hashedPassword,
        status: userData.status || 'pending',
        emailVerified: userData.emailVerified || false
      });

      logger.info('User created successfully', { 
        userId: user._id,
        email: user.email,
        role: user.role 
      });

      return user;
    } catch (error) {
      logger.error('Failed to create user', { 
        error: error.message,
        email: userData.email 
      });
      throw error;
    }
  }

  /**
   * Authenticate user with email/username and password
   * @param {string} identifier - Email or username
   * @param {string} password - Password
   * @returns {Promise<Object>} Authenticated user
   */
  async authenticateUser(identifier, password) {
    try {
      // Find user by email or username
      const user = await this.findUserByIdentifier(identifier);
      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      // Check if user is active
      if (user.status !== 'active') {
        throw new AppError('Account is not active', 401);
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401);
      }

      // Update last login
      await this.updateById(user._id, { 
        lastLoginAt: new Date(),
        loginAttempts: 0 
      });

      logger.info('User authenticated successfully', { 
        userId: user._id,
        email: user.email 
      });

      return user;
    } catch (error) {
      logger.error('Authentication failed', { 
        identifier,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Generate JWT token for user
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateToken(user) {
    return jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
  }

  /**
   * Generate refresh token for user
   * @param {Object} user - User object
   * @returns {string} Refresh token
   */
  generateRefreshToken(user) {
    return jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Update user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Updated user
   */
  async updatePassword(userId, currentPassword, newPassword) {
    try {
      const user = await this.findById(userId, { select: '+password' });
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Verify current password
      const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new AppError('Current password is incorrect', 400);
      }

      // Hash new password
      const hashedNewPassword = await this.hashPassword(newPassword);

      // Update password
      const updatedUser = await this.updateById(userId, {
        password: hashedNewPassword,
        passwordChangedAt: new Date()
      });

      logger.info('Password updated successfully', { userId });

      return updatedUser;
    } catch (error) {
      logger.error('Failed to update password', { 
        userId,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Reset user password (forgot password flow)
   * @param {string} email - User email
   * @returns {Promise<Object>} Reset token
   */
  async initiatePasswordReset(email) {
    try {
      const user = await this.findOne({ email });
      if (!user) {
        // Don't reveal if user exists or not
        return { message: 'If the email exists, a reset link has been sent' };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Update user with reset token
      await this.updateById(user._id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetTokenExpiry
      });

      logger.info('Password reset initiated', { userId: user._id });

      return {
        message: 'If the email exists, a reset link has been sent',
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
      };
    } catch (error) {
      logger.error('Failed to initiate password reset', { 
        email,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Complete password reset
   * @param {string} resetToken - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Updated user
   */
  async completePasswordReset(resetToken, newPassword) {
    try {
      const user = await this.findOne({
        passwordResetToken: resetToken,
        passwordResetExpires: { $gt: new Date() }
      });

      if (!user) {
        throw new AppError('Invalid or expired reset token', 400);
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update user
      const updatedUser = await this.updateById(user._id, {
        password: hashedPassword,
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
        passwordChangedAt: new Date()
      });

      logger.info('Password reset completed', { userId: user._id });

      return updatedUser;
    } catch (error) {
      logger.error('Failed to complete password reset', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get users with advanced filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated users
   */
  async getUsers(filters = {}, options = {}) {
    try {
      const queryFilters = this.buildUserFilters(filters);
      
      return await this.findWithPagination(queryFilters, {
        ...options,
        select: '-password -passwordResetToken -passwordResetExpires'
      });
    } catch (error) {
      logger.error('Failed to get users', { 
        error: error.message,
        filters 
      });
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user
   */
  async updateProfile(userId, updateData) {
    try {
      // Remove sensitive fields from update
      const { password, email, role, ...safeUpdateData } = updateData;

      const updatedUser = await this.updateById(userId, safeUpdateData, {
        select: '-password -passwordResetToken -passwordResetExpires'
      });

      logger.info('User profile updated', { userId });

      return updatedUser;
    } catch (error) {
      logger.error('Failed to update user profile', { 
        userId,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Check if user exists by email or username
   * @param {string} email - Email
   * @param {string} username - Username
   * @returns {Promise<Object|null>} Error message if user exists
   */
  async checkExistingUser(email, username) {
    if (email) {
      const existingEmail = await this.findOne({ email });
      if (existingEmail) {
        return { message: 'Email already in use' };
      }
    }

    if (username) {
      const existingUsername = await this.findOne({ username });
      if (existingUsername) {
        return { message: 'Username already in use' };
      }
    }

    return null;
  }

  /**
   * Find user by email or username
   * @param {string} identifier - Email or username
   * @returns {Promise<Object|null>} Found user
   */
  async findUserByIdentifier(identifier) {
    return await this.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier }
      ]
    }, { select: '+password' });
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} Password validity
   */
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Build user filters for querying
   * @param {Object} filters - Raw filters
   * @returns {Object} Processed filters
   */
  buildUserFilters(filters) {
    const queryFilters = {};

    if (filters.role) {
      queryFilters.role = filters.role;
    }

    if (filters.status) {
      queryFilters.status = filters.status;
    }

    if (filters.bankId) {
      queryFilters.bankId = filters.bankId;
    }

    if (filters.search) {
      queryFilters.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { username: { $regex: filters.search, $options: 'i' } }
      ];
    }

    if (filters.dateFrom || filters.dateTo) {
      queryFilters.createdAt = {};
      if (filters.dateFrom) {
        queryFilters.createdAt.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        queryFilters.createdAt.$lte = new Date(filters.dateTo);
      }
    }

    return queryFilters;
  }
}

export default new UserService(); 