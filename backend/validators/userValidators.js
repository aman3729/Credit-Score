import { body, param, validationResult } from 'express-validator';

// Validation result handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User update validation
export const userUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  body('phoneNumber')
    .optional()
    .matches(/^\+?\d{9,15}$/)
    .withMessage('Please provide a valid phone number (9-15 digits, can start with +)'),
  body('bankId')
    .optional()
    .isIn([
      'CBE', 'DBE', 'AWASH', 'DASHEN', 'ABYSSINIA', 'WEGAGEN', 'NIB', 'HIBRET', 'LION', 'COOP',
      'ZEMEN', 'OROMIA', 'BUNNA', 'BERHAN', 'ABAY', 'ADDIS', 'DEBUB', 'ENAT', 'GADAA', 'HIJRA',
      'SHABELLE', 'SIINQEE', 'TSEHAY', 'AMHARA', 'AHADU', 'GOH', 'AMAN'
    ])
    .withMessage('Please select a valid bank'),
  body('monthlyIncome')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Monthly income must be a positive number'),
  body('monthlySavings')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Monthly savings must be a positive number'),
  body('totalDebt')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total debt must be a positive number'),
  body('bankBalance')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Bank balance must be a positive number'),
  body('mobileMoneyBalance')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Mobile money balance must be a positive number'),
  handleValidationErrors
];

// User ID parameter validation
export const userIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  handleValidationErrors
];

// User search validation
export const userSearchValidation = [
  body('query')
    .optional()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters long'),
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  handleValidationErrors
];

// Password change validation
export const passwordChangeValidation = [
  body('currentPassword')
    .isLength({ min: 1 })
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('New password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('New password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('New password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('New password must contain at least one special character'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
  handleValidationErrors
];

// Profile picture validation
export const profilePictureValidation = [
  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('Please provide a valid image URL'),
  handleValidationErrors
];

// Notification settings validation
export const notificationSettingsValidation = [
  body('emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('Email notifications must be a boolean value'),
  body('smsNotifications')
    .optional()
    .isBoolean()
    .withMessage('SMS notifications must be a boolean value'),
  body('pushNotifications')
    .optional()
    .isBoolean()
    .withMessage('Push notifications must be a boolean value'),
  handleValidationErrors
]; 