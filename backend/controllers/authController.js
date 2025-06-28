const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { sendWelcomeEmail, sendEmailVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
const { logger, securityLogger } = require('../config/logger');

// Generate JWT token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Create and send JWT token
const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);
  
  // Set cookie options
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
    sameSite: 'strict',
  };

  // Set cookie
  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

// User signup
const signup = catchAsync(async (req, res, next) => {
  // 1) Check if user already exists
  const existingUser = await User.findOne({ email: req.body.email });
  if (existingUser) {
    return next(new AppError('Email already in use', 400));
  }

  // 2) Create new user
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role || 'user',
  });

  // 3) Generate email verification token
  const verificationToken = newUser.createEmailVerificationToken();
  await newUser.save({ validateBeforeSave: false });

  try {
    // 4) Send welcome email with verification link
    const verificationURL = `${req.protocol}://${req.get('host')}/api/v1/auth/verify-email/${verificationToken}`;
    
    await sendWelcomeEmail({
      name: newUser.name,
      email: newUser.email,
      verificationURL,
    });
    
    // 5) Log the signup
    securityLogger.info('New user signed up', {
      userId: newUser._id,
      email: newUser.email,
      ip: req.ip,
    });
    
    // 6) Send response
    createSendToken(newUser, 201, req, res);
  } catch (err) {
    // If email sending fails, remove the user and pass the error
    await User.findByIdAndDelete(newUser._id);
    return next(
      new AppError('There was an error sending the email. Please try again later!', 500)
    );
  }
});

// User login
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');
  
  if (!user || !(await user.correctPassword(password, user.password))) {
    securityLogger.warn('Failed login attempt', { email, ip: req.ip });
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) Check if email is verified (if required)
  if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.isEmailVerified) {
    return next(
      new AppError(
        'Please verify your email address before logging in. Check your email for the verification link.',
        401
      )
    );
  }

  // 4) If everything ok, send token to client
  createSendToken(user, 200, req, res);
  
  // 5) Log the successful login
  securityLogger.info('User logged in', {
    userId: user._id,
    email: user.email,
    ip: req.ip,
  });
});

// User logout
const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  
  securityLogger.info('User logged out', {
    userId: req.user?._id,
    email: req.user?.email,
    ip: req.ip,
  });
  
  res.status(200).json({ status: 'success' });
};

// Protect routes - check if user is authenticated
const protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists.', 401)
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Restrict to certain roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lender']. role='user'
    if (!roles.includes(req.user.role)) {
      securityLogger.warn('Unauthorized access attempt', {
        userId: req.user._id,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.originalUrl,
        ip: req.ip,
      });
      
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

// Forgot password
const forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/auth/reset-password/${resetToken}`;
    
    await sendPasswordResetEmail({
      name: user.name,
      email: user.email,
      resetURL,
    });

    securityLogger.info('Password reset token sent', {
      userId: user._id,
      email: user.email,
      ip: req.ip,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    securityLogger.error('Error sending password reset email', {
      userId: user._id,
      email: user.email,
      error: err.message,
      ip: req.ip,
    });

    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500
    );
  }
});

// Reset password
const resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Log the password reset
  securityLogger.info('Password reset successful', {
    userId: user._id,
    email: user.email,
    ip: req.ip,
  });

  // 4) Log the user in, send JWT
  createSendToken(user, 200, req, res);
});

// Update password
const updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    securityLogger.warn('Incorrect current password provided', {
      userId: user._id,
      ip: req.ip,
    });
    
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  
  // 4) Log the password change
  securityLogger.info('Password updated successfully', {
    userId: user._id,
    ip: req.ip,
  });

  // 5) Log user in, send JWT
  createSendToken(user, 200, req, res);
});

// Verify email
const verifyEmail = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, verify the email
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  // 3) Update user document
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });
  
  // 4) Log the email verification
  securityLogger.info('Email verified successfully', {
    userId: user._id,
    email: user.email,
    ip: req.ip,
  });

  res.status(200).json({
    status: 'success',
    message: 'Email verified successfully!',
  });
});

// Resend verification email
const resendVerificationEmail = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  
  // 1) Get user based on email
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('No user found with that email address.', 404));
  }
  
  // 2) Check if email is already verified
  if (user.isEmailVerified) {
    return next(new AppError('Email is already verified.', 400));
  }
  
  // 3) Generate new verification token
  const verificationToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });
  
  try {
    // 4) Send verification email
    const verificationURL = `${req.protocol}://${req.get('host')}/api/v1/auth/verify-email/${verificationToken}`;
    
    await sendEmailVerificationEmail({
      name: user.name,
      email: user.email,
      verificationURL,
    });
    
    // 5) Log the email resend
    securityLogger.info('Verification email resent', {
      userId: user._id,
      email: user.email,
      ip: req.ip,
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Verification email sent!',
    });
  } catch (err) {
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });
    
    securityLogger.error('Error sending verification email', {
      userId: user._id,
      email: user.email,
      error: err.message,
      ip: req.ip,
    });
    
    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500
    );
  }
});

module.exports = {
  signup,
  login,
  logout,
  protect,
  restrictTo,
  forgotPassword,
  resetPassword,
  updatePassword,
  verifyEmail,
  resendVerificationEmail,
};
