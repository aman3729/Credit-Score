import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import validator from 'validator';
import jwt from 'jsonwebtoken';
import { getRolePermissions, ROLE_VALUES } from '../constants/roles.js';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot be more than 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain alphanumeric characters and underscores']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false
  },
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
    required: [true, 'National ID is required'],
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
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
  totalDebt: {
    type: Number,
    min: 0,
    default: 0
  },
  totalCredit: {
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
    enum: ['active', 'suspended', 'deactivated'],
    default: 'active'
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
    ssnLast4: {
      type: String,
      select: false
    },
    avatar: String
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
  metadata: {
    signupSource: String,
    lastIpAddress: String,
    userAgent: String
  },
  // Credit Score Fields
  creditScore: {
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
      enum: ['manual', 'batch_upload', 'api', 'system'],
      required: true
    },
    factors: {
      paymentHistory: Number,
      creditUtilization: Number,  // Fixed typo (removed extra 'i')
      creditAge: Number,
      creditMix: Number,
      inquiries: Number
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

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
    console.log('=== PASSWORD COMPARISON DEBUG ===');
    console.log('Entered password length:', enteredPassword?.length || 0);
    console.log('Stored password hash exists:', !!this.password);
    console.log('Stored password hash length:', this.password?.length || 0);
    
    if (!enteredPassword) {
      console.error('No password provided for comparison');
      return false;
    }
    
    if (!this.password) {
      console.error('No hashed password found for user');
      return false;
    }
    
    // Ensure both passwords are strings
    const enteredPasswordStr = String(enteredPassword);
    const storedPasswordHash = String(this.password);
    
    // Check if the stored password is already hashed
    const isHash = /^\$2[aby]?\$\d{1,2}\$[./0-9A-Za-z]{53}$/.test(storedPasswordHash);
    
    if (!isHash) {
      console.error('Stored password is not a valid bcrypt hash');
      return false;
    }
    
    const isMatch = await bcrypt.compare(enteredPasswordStr, storedPasswordHash);
    console.log('Password comparison result:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('Error in matchPassword:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });
    throw error;
  }
};

// Alias for backward compatibility
userSchema.methods.comparePassword = async function(enteredPassword) {
  try {
    if (!enteredPassword) {
      throw new Error('No password provided for comparison');
    }
    if (!this.password) {
      throw new Error('No hashed password found for this user');
    }
    return await this.matchPassword(enteredPassword);
  } catch (error) {
    console.error('Error in comparePassword:', error);
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

const User = mongoose.model('User', userSchema);
export default User;