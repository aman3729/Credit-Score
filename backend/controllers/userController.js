import User from '../models/User.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { logger, securityLogger } from '../config/logger.js';
import AuditLog from '../models/AuditLog.js';
import ConsentAuditLog from '../models/ConsentAuditLog.js';

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

// Get all users (admin and lender)
const getAllUsers = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.user.role === 'lender') {
    filter.bankId = req.user.bankId;
  }
  const users = await User.find(filter);
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users }
  });
});

// Get user by ID (admin and lender)
const getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }
  if (req.user.role === 'lender' && user.bankId !== req.user.bankId) {
    return next(new AppError('You do not have permission to view this user', 403));
  }
  // Log lender profile view
  if (req.user.role === 'lender') {
    securityLogger.info('User profile accessed', {
      targetUserId: user._id,
      accessedBy: req.user.id,
      role: req.user.role,
      ip: req.ip
    });
  }
  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

// Create new user (admin only)
const createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined! Please use /signup instead',
  });
};

// Update user (admin only)
const updateUser = (req, res) => {
  res.status(501).json({ status: 'error', message: 'Not implemented' });
};

// Delete user (admin only)
const deleteUser = (req, res) => {
  res.status(501).json({ status: 'error', message: 'Not implemented' });
};

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
const adminOverrideScore = async (req, res, next) => {
  const { userId } = req.params;
  const { score, reason, riskFlags } = req.body;
  const adminId = req.user?._id || 'admin';
  const user = await User.findById(userId);
  if (!user) return next(new AppError('User not found', 404));
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
    return next(new AppError('Cannot calculate score: no user consent', 400));
  }
  // ...proceed with scoring logic...
  next();
};

// Grant or renew user consent
const grantOrRenewConsent = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  // Only allow self or admin to update consent
  if (req.params.userId !== userId && req.user.role !== 'admin') {
    return next(new AppError('Not authorized to update consent for this user', 403));
  }

  // Set consent fields
  const now = new Date();
  const expires = new Date(now);
  expires.setFullYear(now.getFullYear() + 1); // 12 months from now

  // Allow client to specify which consents are being granted
  const { termsAccepted = true, creditChecksAuthorized = true } = req.body;

  const update = {
    'legalConsent.termsAccepted': termsAccepted,
    'legalConsent.creditChecksAuthorized': creditChecksAuthorized,
    'legalConsent.consentGivenAt': now,
    'legalConsent.consentExpiresAt': expires
  };

  const updatedUser = await User.findByIdAndUpdate(req.params.userId, { $set: update }, { new: true });
  if (!updatedUser) {
    return next(new AppError('User not found', 404));
  }

  securityLogger.info('User consent granted/renewed', {
    userId: req.params.userId,
    updatedBy: req.user.id,
    ip: req.ip,
    consentGivenAt: now,
    consentExpiresAt: expires
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
  await ConsentAuditLog.create({
    userId: req.params.userId,
    action: req.user.role === 'admin' ? 'override' : (req.body.renew ? 'renew' : 'grant'),
    performedBy: req.user.id,
    performedByRole: req.user.role,
    details: update
  });
});

// Get current user's consent status
const getConsentStatus = catchAsync(async (req, res, next) => {
  const consent = req.user?.legalConsent || {};
  const now = new Date();
  const expiresAt = consent.consentExpiresAt ? new Date(consent.consentExpiresAt) : null;
  const lastGivenAt = consent.consentGivenAt ? new Date(consent.consentGivenAt) : null;
  const granted = !!consent.creditChecksAuthorized && expiresAt && expiresAt > now;
  const daysRemaining = expiresAt ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : null;
  const needsRenewal = daysRemaining !== null && daysRemaining <= 30;
  res.status(200).json({
    status: 'success',
    data: {
      granted,
      expiresAt,
      daysRemaining,
      needsRenewal,
      lastGivenAt
    }
  });
});

// Admin override of user consent
const adminOverrideConsent = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new AppError('Only admins can override consent', 403));
  }
  const { userId } = req.params;
  const { consentGivenAt, consentExpiresAt, termsAccepted, creditChecksAuthorized } = req.body;
  const update = {};
  if (consentGivenAt !== undefined) update['legalConsent.consentGivenAt'] = consentGivenAt;
  if (consentExpiresAt !== undefined) update['legalConsent.consentExpiresAt'] = consentExpiresAt;
  if (termsAccepted !== undefined) update['legalConsent.termsAccepted'] = termsAccepted;
  if (creditChecksAuthorized !== undefined) update['legalConsent.creditChecksAuthorized'] = creditChecksAuthorized;
  if (Object.keys(update).length === 0) {
    return next(new AppError('No consent fields provided for override', 400));
  }
  const updatedUser = await User.findByIdAndUpdate(userId, { $set: update }, { new: true });
  if (!updatedUser) {
    return next(new AppError('User not found', 404));
  }
  securityLogger.info('Admin override of user consent', {
    adminId: req.user.id,
    targetUserId: userId,
    update,
    ip: req.ip
  });
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
  await ConsentAuditLog.create({
    userId,
    action: 'override',
    performedBy: req.user.id,
    performedByRole: req.user.role,
    details: update
  });
});

// Admin: get consent audit log for a user
const getConsentAuditLog = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new AppError('Only admins can view consent audit logs', 403));
  }
  const { userId } = req.params;
  const logs = await ConsentAuditLog.find({ userId }).sort({ timestamp: -1 });
  res.status(200).json({
    status: 'success',
    data: logs
  });
});

// Admin: get lender access history (users whose profiles or credit reports were accessed)
const getLenderAccessHistory = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new AppError('Only admins can view lender access history', 403));
  }
  const { lenderId } = req.params;
  // Find security logs for this lender
  const SecurityLog = (await import('../models/SecurityLog.js')).default;
  const logs = await SecurityLog.find({
    accessedBy: lenderId,
    action: { $in: ['Credit report accessed', 'User profile accessed'] }
  }).sort({ timestamp: -1 });
  res.status(200).json({
    status: 'success',
    data: logs
  });
});

// Admin: get all lender access history (global)
const getAllLenderAccessHistory = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new AppError('Only admins can view lender access history', 403));
  }
  const SecurityLog = (await import('../models/SecurityLog.js')).default;
  const logs = await SecurityLog.find({
    role: 'lender',
    action: { $in: ['Credit report accessed', 'User profile accessed'] }
  }).sort({ timestamp: -1 });
  res.status(200).json({
    status: 'success',
    data: logs
  });
});

export {
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
  grantOrRenewConsent,
  getConsentStatus,
  adminOverrideConsent,
  getConsentAuditLog,
  getLenderAccessHistory,
  getAllLenderAccessHistory,
};
