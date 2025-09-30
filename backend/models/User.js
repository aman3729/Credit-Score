import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
// Simple email validation function
const isValidEmail = (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};
import jwt from 'jsonwebtoken';
import { getRolePermissions, ROLE_VALUES } from '../constants/roles.js';

const userSchema = new mongoose.Schema({
  bankId: {
    type: String,
    required: [true, 'Bank selection is required'],
    enum: [
      'CBE', 'DBE', 'AWASH', 'DASHEN', 'ABYSSINIA', 'WEGAGEN', 'NIB', 'HIBRET', 'LION', 'COOP',
      'ZEMEN', 'OROMIA', 'BUNNA', 'BERHAN', 'ABAY', 'ADDIS', 'DEBUB', 'ENAT', 'GADAA', 'HIJRA',
      'SHABELLE', 'SIINQEE', 'TSEHAY', 'AMHARA', 'AHADU', 'GOH', 'AMAN'
    ],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    validate: [isValidEmail, 'Please provide a valid email'],
    required: false
  },
  username: {
    type: String,
    unique: true,
    required: [true, 'Username is required'],
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot be more than 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain alphanumeric characters and underscores'],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false
  },
  passwordChangedAt: Date,
  role: {
    type: String,
    enum: ROLE_VALUES,
    default: 'user'
  },
  permissions: {
    type: [String],
    default: function() {
      return getRolePermissions(this.role);
    }
  },
  nationalId: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^\d{16}$/.test(v);
      },
      message: props => `${props.value} is not a valid 16-digit national ID`
    },
    select: false
  },
  monthlyIncome: {
    type: Number,
    min: 0,
    default: 0
  },
  monthlySavings: {
    type: Number,
    min: 0,
    default: 0
  },
  totalDebt: {
    type: Number,
    min: 0,
    default: 0
  },
  bankBalance: {
    type: Number,
    min: 0,
    default: 0
  },
  mobileMoneyBalance: {
    type: Number,
    min: 0,
    default: 0
  },
  creditFactors: {
    overrideScore: {
      type: Number,
      min: 300,
      max: 850
    },
    riskAdjustment: {
      type: Number,
      min: -50,
      max: 50
    },
    lastUpdated: Date,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationTokenExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  lastLogin: Date,
  status: {
    type: String,
    enum: ['pending', 'active', 'deactivated', 'rejected'],
    default: 'pending'
  },
  profile: {
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    dateOfBirth: Date,
    avatar: String,
    // Enhanced registration fields
    fullAddress: String,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say']
    },
    employmentStatus: {
      type: String,
      enum: ['employed', 'self-employed', 'unemployed', 'student', 'retired']
    },
    employerName: String,
    industry: {
      type: String,
      enum: ['technology', 'finance', 'healthcare', 'education', 'retail', 'manufacturing', 'agriculture', 'construction', 'transportation', 'other']
    }
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  // Premium User Features
  premium: {
    isPremium: {
      type: Boolean,
      default: false
    },
    subscriptionType: {
      type: String,
      enum: ['monthly', 'yearly', 'lifetime'],
      required: false
    },
    subscriptionStartDate: Date,
    subscriptionEndDate: Date,
    features: {
      realTimeCreditRefresh: { type: Boolean, default: false },
      fullCreditReport: { type: Boolean, default: false },
      fraudAlerts: { type: Boolean, default: false },
      creditMonitoring: { type: Boolean, default: false },
      personalizedInsights: { type: Boolean, default: false },
      lendingEligibilityReports: { type: Boolean, default: false },
      customLoanOffers: { type: Boolean, default: false },
      priorityDisputeHandling: { type: Boolean, default: false },
      financialCoaching: { type: Boolean, default: false },
      exportOptions: { type: Boolean, default: false },
      multiSourceCreditMerge: { type: Boolean, default: false },
      customNotifications: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      auditLogs: { type: Boolean, default: false },
      idVerificationReports: { type: Boolean, default: false },
      complianceCertificates: { type: Boolean, default: false },
      creditSimulator: { type: Boolean, default: false }
    },
    usage: {
      creditRefreshesThisMonth: { type: Number, default: 0 },
      reportsGenerated: { type: Number, default: 0 },
      simulationsRun: { type: Number, default: 0 },
      lastCreditRefresh: Date
    }
  },
  metadata: {
    signupSource: String,
    lastIpAddress: String,
    userAgent: String
  },
  // Credit Score Fields
  creditScore: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CreditScore',
    default: null
  },
  latestScore: {
    type: Number,
    min: 300,
    max: 850,
    default: null
  },
  creditScoreLastUpdated: {
    type: Date,
    default: null
  },
  creditHistory: [{
    score: {
      type: Number,
      required: true,
      min: 300,
      max: 850  // Added min/max to match top-level validation
    },
    date: {
      type: Date,
      default: Date.now
    },
    source: {
      type: String,
      enum: ['manual', 'batch_upload', 'api', 'system', 'system-generated'],
      required: true
    },
    factors: {
      paymentHistory: Number,
      creditUtilization: Number,  // Fixed typo (removed extra 'i')
      creditAge: Number,
      creditMix: Number,
      inquiries: Number
    }
  }],
  // Admin-only fields
  adminFields: {
    initialCreditScore: {
      type: Number,
      min: 300,
      max: 850
    },
    sourceNotes: String,
    adminNotes: String, // Admin notes for approval/rejection
    branchVerification: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verificationDate: Date
  },
  // Legal consent fields
  legalConsent: {
    termsAccepted: {
      type: Boolean,
      default: false
    },
    creditChecksAuthorized: {
      type: Boolean,
      default: false
    },
    consentDate: Date,
    consentGivenAt: { type: Date },
    consentExpiresAt: { type: Date }
  },
  phoneNumber: {
    type: String,
    required: [true, 'Please provide your phone number'],
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\+?\d{9,15}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number (must be 9-15 digits, can start with +)`
    }
  },
  nextCreditReviewDate: {
    type: Date,
    default: () => {
      const now = new Date();
      now.setMonth(now.getMonth() + 1); // 30 days from now
      return now;
    }
  },
  scoreHistory: [{
    date: { type: Date, default: Date.now },
    score: Number,
    classification: String,
    decision: String,
    reason: String,
    triggeredBy: String
  }],
  adminOverride: {
    score: Number,
    reason: String,
    appliedBy: { type: String, ref: 'User' },
    timestamp: Date
  },
  riskFlags: [{ type: String }],
  verificationToken: { type: String },
  verificationTokenExpires: { type: Date },
  isVerified: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  // If not a new user, set passwordChangedAt
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000; // Subtract 1s to ensure token iat < changedAt
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  try {
    // Debug logs removed for production security
    if (!enteredPassword) {
      if (process.env.NODE_ENV === 'development') {
        console.error('No password provided for comparison');
      }
      return false;
    }
    if (!this.password) {
      if (process.env.NODE_ENV === 'development') {
        console.error('No hashed password found for user');
      }
      return false;
    }
    const enteredPasswordStr = String(enteredPassword);
    const storedPasswordHash = String(this.password);
    const isHash = /^\$2[aby]?\$\d{1,2}\$[./0-9A-Za-z]{53}$/.test(storedPasswordHash);
    if (!isHash) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Stored password is not a valid bcrypt hash');
      }
      return false;
    }
    const isMatch = await bcrypt.compare(enteredPasswordStr, storedPasswordHash);
    return isMatch;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in matchPassword:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        name: error.name
      });
    }
    throw error;
  }
};

// Alias for backward compatibility
userSchema.methods.comparePassword = async function(enteredPassword) {
  try {
    if (!enteredPassword) {
      if (process.env.NODE_ENV === 'development') {
        console.error('No password provided for comparison');
      }
      throw new Error('No password provided for comparison');
    }
    if (!this.password) {
      if (process.env.NODE_ENV === 'development') {
        console.error('No hashed password found for this user');
      }
      throw new Error('No hashed password found for this user');
    }
    return await this.matchPassword(enteredPassword);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in comparePassword:', error);
    }
    throw error;
  }
};

// correctPassword method (used by auth controller)
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  try {
    // Debug logs removed for production security
    if (!candidatePassword) {
      if (process.env.NODE_ENV === 'development') {
        console.error('No password provided for comparison');
      }
      return false;
    }
    if (!userPassword) {
      if (process.env.NODE_ENV === 'development') {
        console.error('No hashed password found for user');
      }
      return false;
    }
    const candidatePasswordStr = String(candidatePassword);
    const storedPasswordHash = String(userPassword);
    const isHash = /^\$2[aby]?\$\d{1,2}\$[./0-9A-Za-z]{53}$/.test(storedPasswordHash);
    if (!isHash) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Stored password is not a valid bcrypt hash');
      }
      return false;
    }
    const isMatch = await bcrypt.compare(candidatePasswordStr, storedPasswordHash);
    return isMatch;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in correctPassword:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        name: error.name
      });
    }
    throw error;
  }
};

// Generate reset password token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

// Generate email verification token
userSchema.methods.getEmailVerificationToken = function () {
  const verificationToken = crypto.randomBytes(20).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  this.emailVerificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return verificationToken;
};

// Generate JWT token
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// Virtual for credit scores
userSchema.virtual('creditScores', {
  ref: 'CreditScore',
  localField: '_id',
  foreignField: 'user',
  justOne: false
});

// Indexes
userSchema.index({ name: 'text', email: 'text', 'profile.phone': 'text' });
userSchema.index({ email: 1, role: 1 });
userSchema.index({ phoneNumber: 1 });
userSchema.index({ status: 1 });

// Premium User Methods
userSchema.methods.isPremiumUser = function() {
  return this.premium?.isPremium === true;
};

userSchema.methods.hasPremiumFeature = function(featureName) {
  if (!this.isPremiumUser()) return false;
  return this.premium?.features?.[featureName] === true;
};

userSchema.methods.canRefreshCredit = function() {
  if (!this.isPremiumUser()) return false;
  
  // Basic users get monthly refresh, premium users get weekly
  const lastRefresh = this.premium?.usage?.lastCreditRefresh;
  if (!lastRefresh) return true;
  
  const now = new Date();
  const daysSinceLastRefresh = (now - lastRefresh) / (1000 * 60 * 60 * 24);
  
  return daysSinceLastRefresh >= 7; // Weekly for premium users
};

userSchema.methods.getPremiumFeatures = function() {
  if (!this.isPremiumUser()) return [];
  
  const features = [];
  const premiumFeatures = this.premium?.features || {};
  
  Object.entries(premiumFeatures).forEach(([feature, enabled]) => {
    if (enabled) {
      features.push(feature);
    }
  });
  
  return features;
};

userSchema.methods.getSubscriptionStatus = function() {
  if (!this.isPremiumUser()) return 'none';
  
  const now = new Date();
  const endDate = this.premium?.subscriptionEndDate;
  
  if (!endDate) return 'active';
  
  if (now > endDate) return 'expired';
  if (now > new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)) return 'expiring_soon';
  
  return 'active';
};

const User = mongoose.model('User', userSchema);
export default User;