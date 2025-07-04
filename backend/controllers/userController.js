const User = require('../models/User');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const { logger, securityLogger } = require('../config/logger');
const AuditLog = require('../models/AuditLog');

// Helper function to filter out unwanted fields that are not allowed to be updated
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// Get current user's profile
const getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// Update current user's profile
const updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(
    req.body,
    'name',
    'email',
    'phone',
    'address',
    'dateOfBirth',
    'profileImage'
  );

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  // 4) Log the profile update
  securityLogger.info('User profile updated', {
    userId: req.user.id,
    updatedFields: Object.keys(filteredBody),
    ip: req.ip,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// Deactivate current user's account (soft delete)
const deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  // Log the account deactivation
  securityLogger.info('User account deactivated', {
    userId: req.user.id,
    ip: req.ip,
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Get all users (admin only)
const getAllUsers = factory.getAll(User);

// Get user by ID (admin only)
const getUser = factory.getOne(User);

// Create new user (admin only)
const createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined! Please use /signup instead',
  });
};

// Update user (admin only)
const updateUser = factory.updateOne(User);

// Delete user (admin only)
const deleteUser = factory.deleteOne(User);

// Get user statistics (admin only)
const getUserStats = catchAsync(async (req, res, next) => {
  const stats = await User.aggregate([
    {
      $match: { role: 'user' },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        numUsers: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

// Get user activity log (admin only)
const getUserActivity = catchAsync(async (req, res, next) => {
  // This would typically query an activity log collection
  // For now, we'll return a placeholder response
  res.status(200).json({
    status: 'success',
    data: {
      message: 'User activity logs would be returned here',
    },
  });
});

// Update user role (admin only)
const updateUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;
  
  // Validate role
  const validRoles = ['user', 'lender', 'admin'];
  if (!validRoles.includes(role)) {
    return next(new AppError('Invalid role specified', 400));
  }
  
  // Prevent self-demotion of last admin
  if (req.user.id === req.params.id && role !== 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      return next(
        new AppError('Cannot remove the last admin. Please assign another admin first.', 400)
      );
    }
  }
  
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    {
      new: true,
      runValidators: true,
    }
  );
  
  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }
  
  // Log the role update
  securityLogger.info('User role updated', {
    adminId: req.user.id,
    targetUserId: user._id,
    newRole: role,
    ip: req.ip,
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// Admin override endpoint (example)
const adminOverrideScore = async (req, res) => {
  const { userId } = req.params;
  const { score, reason, riskFlags } = req.body;
  const adminId = req.user?._id || 'admin';
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const before = { adminOverride: user.adminOverride, riskFlags: user.riskFlags };
  user.adminOverride = { score, reason, appliedBy: adminId, timestamp: new Date() };
  if (riskFlags) user.riskFlags = Array.from(new Set([...(user.riskFlags || []), ...riskFlags]));
  await user.save();
  await AuditLog.create({
    action: 'Score Overridden',
    by: adminId,
    userId: user._id,
    before,
    after: { adminOverride: user.adminOverride, riskFlags: user.riskFlags },
    timestamp: new Date()
  });
  res.json({ success: true, user });
};

// Compliance check before scoring (example)
const checkComplianceAndScore = async (req, res, next) => {
  const user = await User.findById(req.params.userId);
  if (!user.legalConsent?.creditChecksAuthorized) {
    return res.status(400).json({ error: 'Cannot calculate score: no user consent' });
  }
  // ...proceed with scoring logic...
  next();
};

module.exports = {
  getMe,
  updateMe,
  deleteMe,
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
  getUserActivity,
  updateUserRole,
  adminOverrideScore,
  checkComplianceAndScore,
};
