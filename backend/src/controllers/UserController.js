import { logger } from '../../config/logger.js';
import AppError from '../../utils/appError.js';
import { catchAsync } from '../../utils/catchAsync.js';

/**
 * User controller for handling user-related HTTP requests
 */
export class UserController {
  constructor(userService) {
    this.userService = userService;
  }

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
   * Change password
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
   * Get users (admin only)
   */
  getUsers = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 10, role, status, search } = req.query;

    const filters = {};
    if (role) filters.role = role;
    if (status) filters.status = status;
    if (search) filters.search = search;

    const result = await this.userService.getUsers(filters, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.status(200).json({
      status: 'success',
      data: result
    });
  });

  /**
   * Get user by ID (admin only)
   */
  getUserById = catchAsync(async (req, res, next) => {
    const user = await this.userService.findById(req.params.id, {
      select: '-password -passwordResetToken -passwordResetExpires'
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: { user }
    });
  });

  /**
   * Update user (admin only)
   */
  updateUser = catchAsync(async (req, res, next) => {
    const { name, email, role, status, monthlyIncome, monthlySavings, totalDebt, bankBalance } = req.body;

    const updatedUser = await this.userService.updateById(req.params.id, {
      name,
      email,
      role,
      status,
      monthlyIncome,
      monthlySavings,
      totalDebt,
      bankBalance
    }, {
      select: '-password -passwordResetToken -passwordResetExpires'
    });

    if (!updatedUser) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: { user: updatedUser }
    });
  });

  /**
   * Delete user (admin only)
   */
  deleteUser = catchAsync(async (req, res, next) => {
    const user = await this.userService.deleteById(req.params.id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully'
    });
  });
} 