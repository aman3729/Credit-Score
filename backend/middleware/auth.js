import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { logger, securityLogger } from '../config/logger.js';
import AppError from '../utils/appError.js';

/**
 * Middleware to protect routes - verifies JWT token from header, cookie, or query parameter
 */
const protect = async (req, res, next) => {
  let token;

  // 1) Get token from header, cookie, or query parameter
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Get token from header
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // Get token from cookie
    token = req.cookies.token;
  } else if (req.query && req.query.token) {
    // Get token from query parameter (for email verification, password reset, etc.)
    token = req.query.token;
  }

  // 2) Check if token exists
  if (!token) {
    securityLogger.warn('Authentication failed: No token provided', { 
      ip: req.ip,
      path: req.originalUrl,
      method: req.method
    });
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  try {
    // 3) Verify token
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);

    // 4) Check if user still exists
    const currentUser = await User.findById(decoded.id).select('+passwordChangedAt');
    if (!currentUser) {
      securityLogger.warn('Authentication failed: User no longer exists', { 
        userId: decoded.id,
        ip: req.ip 
      });
      return next(
        new AppError('The user belonging to this token no longer exists.', 401)
      );
    }

    // 5) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      securityLogger.warn('Authentication failed: User recently changed password', { 
        userId: currentUser._id,
        ip: req.ip 
      });
      return next(
        new AppError('User recently changed password! Please log in again.', 401)
      );
    }

    // 6) Check if user account is active
    if (currentUser.status !== 'active') {
      securityLogger.warn('Authentication failed: User account is not active', { 
        userId: currentUser._id,
        status: currentUser.status,
        ip: req.ip 
      });
      return next(
        new AppError('Your account has been ' + currentUser.status + '. Please contact support.', 401)
      );
    }

    // 7) Check if email is verified (if required)
    if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && 
        !currentUser.isEmailVerified && 
        !req.path.includes('verify-email') &&
        !req.path.includes('resend-verification')) {
      securityLogger.warn('Authentication failed: Email not verified', { 
        userId: currentUser._id,
        email: currentUser.email,
        ip: req.ip 
      });
      return next(
        new AppError('Please verify your email address to continue.', 403)
      );
    }

    // 8) Grant access to protected route
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
  } catch (error) {
    securityLogger.error('Authentication failed: Invalid token', { 
      error: error.message, 
      ip: req.ip,
      path: req.originalUrl
    });
    
    let errorMessage = 'Invalid or expired token. Please log in again.';
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Your token has expired! Please log in again.';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid token. Please log in again.';
    }
    
    return next(new AppError(errorMessage, 401));
  }
};

/**
 * Middleware to restrict access to specific roles
 * @param {...String} roles - The roles that are allowed to access the route
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      securityLogger.warn('Authorization failed: Insufficient permissions', { 
        userId: req.user._id, 
        userRole: req.user.role, 
        requiredRoles: roles,
        ip: req.ip, 
        path: req.originalUrl 
      });
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

/**
 * Middleware to check if user is logged in (for views)
 */
const isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) Verify token
      const decoded = await jwt.verify(req.cookies.jwt, process.env.JWT_SECRET);

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // 4) There is a logged in user
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

/**
 * Middleware to restrict access to specific roles with permissions
 * @param {Array<String>} rolesArray - Array of roles that are allowed to access the route
 * @param {String} [permission=null] - Optional permission required
 */
const requireRole = (rolesArray, permission = null) => {
  // Handle both array and rest parameters for backward compatibility
  const roles = Array.isArray(rolesArray) ? rolesArray : [rolesArray];
  return [
    // First verify authentication
    protect,
    
    // Then check role and permissions
    (req, res, next) => {
      // Check if user has one of the required roles
      if (!roles.includes(req.user.role)) {
        securityLogger.warn('Authorization failed: Insufficient role', {
          userId: req.user._id,
          requiredRoles: roles,
          userRole: req.user.role,
          ip: req.ip,
          path: req.originalUrl
        });
        return next(
          new AppError('You do not have permission to perform this action', 403)
        );
      }

      // If a specific permission is required, check if user has it
      if (permission && !req.user.permissions?.includes(permission)) {
        securityLogger.warn('Authorization failed: Missing permission', {
          userId: req.user._id,
          requiredPermission: permission,
          userPermissions: req.user.permissions,
          ip: req.ip,
          path: req.originalUrl
        });
        return next(
          new AppError('Insufficient permissions to perform this action', 403)
        );
      }

      // Grant access
      next();
    }
  ];
};

// Aliases for backward compatibility
const requireAdmin = requireRole(['admin']);
const requireLender = requireRole(['lender']);
const requireUser = requireRole(['user', 'premium']);
const requireAnalyst = requireRole(['admin', 'analyst']);
const requirePremium = requireRole(['premium']);

// Import ROLES from constants
import { ROLES } from '../constants/roles.js';

// Export all middleware functions
export {
  protect as auth,
  protect,
  authorize,
  isLoggedIn,
  requireRole,
  requireAdmin,
  requireLender,
  requireUser,
  requireAnalyst,
  requirePremium,
  maskSensitiveResponse,
  ROLES
};

// Helper function to mask sensitive data
const maskSensitiveData = (data) => {
  if (!data) return data;
  if (typeof data === 'string' && data.length > 4) {
    return '*'.repeat(data.length - 4) + data.slice(-4);
  }
  return data;
};

// Middleware to mask sensitive data in responses
const maskSensitiveResponse = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (data?.data?.nationalId) {
      data.data.nationalId = maskSensitiveData(data.data.nationalId);
    }
    if (data?.nationalId) {
      data.nationalId = maskSensitiveData(data.nationalId);
    }
    originalJson.call(this, data);
  };
  
  next();
};

// Add JWT helper methods to the User model
User.prototype.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

User.prototype.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};
