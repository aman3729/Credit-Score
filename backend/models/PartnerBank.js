import mongoose from 'mongoose';

// Simple validation functions
const isValidURL = (value) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const isValidEmail = (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

const partnerBankSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Bank name is required'],
    trim: true,
    maxlength: [100, 'Bank name cannot be more than 100 characters']
  },
  slug: {
    type: String,
    required: [true, 'Bank slug is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
  },
  code: {
    type: String,
    required: [true, 'Bank code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    enum: [
      'CBE', 'DBE', 'AWASH', 'DASHEN', 'ABYSSINIA', 'WEGAGEN', 'NIB', 'HIBRET', 'LION', 'COOP',
      'ZEMEN', 'OROMIA', 'BUNNA', 'BERHAN', 'ABAY', 'ADDIS', 'DEBUB', 'ENAT', 'GADAA', 'HIJRA',
      'SHABELLE', 'SIINQEE', 'TSEHAY', 'AMHARA', 'AHADU', 'GOH', 'AMAN'
    ]
  },
  logoUrl: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true,
    validate: [isValidURL, 'Please provide a valid website URL']
  },
  contactInfo: {
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: [isValidEmail, 'Please provide a valid email']
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  allowedRoles: {
    type: [String],
    default: ['admin', 'underwriter', 'analyst', 'manager'],
    enum: ['admin', 'underwriter', 'analyst', 'manager', 'viewer']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  
  // Enhanced Engine Configuration
  engineConfig: {
    // Engine 1: Credit-Based Scoring
    engine1: {
      scoringWeights: {
        paymentHistory: { type: Number, min: 0, max: 100, default: 35 },
        creditUtilization: { type: Number, min: 0, max: 100, default: 30 },
        creditAge: { type: Number, min: 0, max: 100, default: 15 },
        creditMix: { type: Number, min: 0, max: 100, default: 10 },
        inquiries: { type: Number, min: 0, max: 100, default: 10 }
      },
      penalties: {
        recentDefaults: { type: Number, min: -50, max: 0, default: -15 },
        missedPaymentsLast12: {
          threshold: { type: Number, min: 0, max: 12, default: 2 },
          penalty: { type: Number, min: -20, max: 0, default: -5 }
        },
        lowOnTimeRate: {
          threshold: { type: Number, min: 0, max: 1, default: 0.85 },
          penalty: { type: Number, min: -20, max: 0, default: -4 }
        },
        highInquiries: {
          threshold: { type: Number, min: 0, max: 20, default: 3 },
          penalty: { type: Number, min: -10, max: 0, default: -2 }
        }
      },
      bonuses: {
        perfectPaymentRate: { type: Number, min: 0, max: 20, default: 5 },
        goodCreditMix: { type: Number, min: 0, max: 10, default: 2 },
        highTransactionVolume: { type: Number, min: 0, max: 10, default: 3 }
      },
      rejectionRules: {
        allowConsecutiveMissedPayments: { type: Boolean, default: false },
        maxMissedPayments12Mo: { type: Number, min: 0, max: 12, default: 3 },
        minMonthsSinceLastDelinquency: { type: Number, min: 0, max: 60, default: 3 }
      },
      maxScore: { type: Number, min: 300, max: 900, default: 850 },
      minScore: { type: Number, min: 300, max: 900, default: 300 },
      allowManualOverride: { type: Boolean, default: true }
    },
    
    // Engine 2: Creditworthiness/5 Cs-based
    engine2: {
      weights: {
        capacity: { type: Number, min: 0, max: 100, default: 35 },
        capital: { type: Number, min: 0, max: 100, default: 20 },
        collateral: { type: Number, min: 0, max: 100, default: 20 },
        conditions: { type: Number, min: 0, max: 100, default: 15 },
        character: { type: Number, min: 0, max: 100, default: 10 }
      },
      subFactors: {
        cashFlowWeight: { type: Number, min: 0, max: 100, default: 50 },
        incomeStabilityWeight: { type: Number, min: 0, max: 100, default: 30 },
        discretionarySpendingWeight: { type: Number, min: 0, max: 100, default: 20 },
        budgetingConsistencyWeight: { type: Number, min: 0, max: 100, default: 10 },
        savingsConsistencyWeight: { type: Number, min: 0, max: 100, default: 10 }
      },
      behavioralThresholds: {
        maxDTI: { type: Number, min: 0.1, max: 1.0, default: 0.45 },
        minSavingsRate: { type: Number, min: 0, max: 1.0, default: 0.1 },
        stableEmploymentRequired: { type: Boolean, default: true }
      },
      riskLabels: {
        highRiskThreshold: { type: Number, min: 0, max: 100, default: 40 },
        moderateRiskThreshold: { type: Number, min: 0, max: 100, default: 60 },
        lowRiskThreshold: { type: Number, min: 0, max: 100, default: 80 }
      },
      allowManualReview: { type: Boolean, default: true }
    }
  },
  
  // Enhanced Lending Policy
  lendingPolicy: {
    baseLoanAmounts: {
      EXCELLENT: { type: Number, min: 0, default: 100000 },
      VERY_GOOD: { type: Number, min: 0, default: 75000 },
      GOOD: { type: Number, min: 0, default: 50000 },
      FAIR: { type: Number, min: 0, default: 30000 },
      POOR: { type: Number, min: 0, default: 10000 }
    },
    incomeMultipliers: {
      EXCELLENT: { type: Number, min: 1, max: 20, default: 10 },
      VERY_GOOD: { type: Number, min: 1, max: 20, default: 8 },
      GOOD: { type: Number, min: 1, max: 20, default: 6 },
      FAIR: { type: Number, min: 1, max: 20, default: 4 },
      POOR: { type: Number, min: 1, max: 20, default: 2 }
    },
    interestRateRules: {
      baseRate: { type: Number, min: 0, max: 100, default: 12.5 },
      adjustments: {
        HIGH_DTI: { type: Number, min: 0, max: 10, default: 3 },
        EMPLOYMENT_UNSTABLE: { type: Number, min: 0, max: 10, default: 2 },
        RECENT_DEFAULT: { type: Number, min: 0, max: 10, default: 5 }
      },
      maxRate: { type: Number, min: 0, max: 100, default: 35.99 }
    },
    termOptions: { type: [Number], default: [12, 24, 36, 48] },
    recessionMode: { type: Boolean, default: false },
    allowCollateralOverride: { type: Boolean, default: true },
    requireCollateralFor: { type: [String], enum: ['EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR'], default: ['POOR', 'FAIR'] }
  },
  
  // Access Controls
  accessControls: {
    canExportData: { type: Boolean, default: true },
    apiAccessEnabled: { type: Boolean, default: false },
    maxFileSizeMb: { type: Number, min: 1, max: 100, default: 5 },
    visibleTabs: { 
      type: [String], 
      enum: ['Loan Decisions', 'Applications', 'Upload', 'Simulation', 'Config', 'Analytics'],
      default: ['Loan Decisions', 'Applications', 'Upload', 'Simulation']
    }
  },
  
  // Branding Configuration
  branding: {
    primaryColor: { type: String, default: '#004aad' },
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
    currency: { type: String, default: 'ETB' },
    language: { type: String, default: 'en' }
  },
  
  // Legacy lending config (for backward compatibility)
  lendingConfig: {
    scoreThresholds: {
      personal: {
        approve: { type: Number, min: 300, max: 850, default: 700 },
        conditional: { type: Number, min: 300, max: 850, default: 650 },
        review: { type: Number, min: 300, max: 850, default: 600 }
      },
      business: {
        approve: { type: Number, min: 300, max: 850, default: 720 },
        conditional: { type: Number, min: 300, max: 850, default: 670 },
        review: { type: Number, min: 300, max: 850, default: 620 }
      },
      mortgage: {
        approve: { type: Number, min: 300, max: 850, default: 750 },
        conditional: { type: Number, min: 300, max: 850, default: 700 },
        review: { type: Number, min: 300, max: 850, default: 650 }
      },
      auto: {
        approve: { type: Number, min: 300, max: 850, default: 680 },
        conditional: { type: Number, min: 300, max: 850, default: 630 },
        review: { type: Number, min: 300, max: 850, default: 580 }
      }
    },
    loanAmounts: {
      personal: {
        EXCELLENT: { type: Number, min: 0, default: 1000000 },
        VERY_GOOD: { type: Number, min: 0, default: 500000 },
        GOOD: { type: Number, min: 0, default: 300000 },
        FAIR: { type: Number, min: 0, default: 150000 },
        POOR: { type: Number, min: 0, default: 50000 }
      },
      business: {
        EXCELLENT: { type: Number, min: 0, default: 5000000 },
        VERY_GOOD: { type: Number, min: 0, default: 2500000 },
        GOOD: { type: Number, min: 0, default: 1000000 },
        FAIR: { type: Number, min: 0, default: 500000 },
        POOR: { type: Number, min: 0, default: 100000 }
      },
      mortgage: {
        EXCELLENT: { type: Number, min: 0, default: 10000000 },
        VERY_GOOD: { type: Number, min: 0, default: 8000000 },
        GOOD: { type: Number, min: 0, default: 6000000 },
        FAIR: { type: Number, min: 0, default: 4000000 },
        POOR: { type: Number, min: 0, default: 2000000 }
      },
      auto: {
        EXCELLENT: { type: Number, min: 0, default: 2000000 },
        VERY_GOOD: { type: Number, min: 0, default: 1500000 },
        GOOD: { type: Number, min: 0, default: 1000000 },
        FAIR: { type: Number, min: 0, default: 500000 },
        POOR: { type: Number, min: 0, default: 200000 }
      }
    },
    interestRates: {
      baseRate: { type: Number, min: 0, max: 100, default: 12.0 },
      maxRate: { type: Number, min: 0, max: 100, default: 35.99 },
      riskAdjustments: {
        EXCELLENT: { type: Number, min: -10, max: 10, default: -2.0 },
        VERY_GOOD: { type: Number, min: -10, max: 10, default: -1.0 },
        GOOD: { type: Number, min: -10, max: 10, default: 0.0 },
        FAIR: { type: Number, min: -10, max: 10, default: 2.0 },
        POOR: { type: Number, min: -10, max: 10, default: 5.0 }
      },
      dtiAdjustments: {
        LOW: { type: Number, min: -5, max: 5, default: -1.0 },
        MEDIUM: { type: Number, min: -5, max: 5, default: 0.0 },
        HIGH: { type: Number, min: -5, max: 5, default: 2.0 }
      },
      recessionAdjustment: { type: Number, min: 0, max: 10, default: 2.0 }
    },
    dtiRules: {
      maxDTI: { type: Number, min: 0.1, max: 1.0, default: 0.45 },
      maxDTIWithCollateral: { type: Number, min: 0.1, max: 1.0, default: 0.55 },
      incomeMultipliers: {
        EXCELLENT: { type: Number, min: 1, max: 20, default: 12 },
        VERY_GOOD: { type: Number, min: 1, max: 20, default: 10 },
        GOOD: { type: Number, min: 1, max: 20, default: 8 },
        FAIR: { type: Number, min: 1, max: 20, default: 6 },
        POOR: { type: Number, min: 1, max: 20, default: 4 }
      },
      minimumIncome: { type: Number, min: 0, default: 5000 }
    },
    collateralRules: {
      requiredFor: { type: [String], enum: ['EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR'], default: ['FAIR', 'POOR'] },
      minValue: { type: Number, min: 0, default: 5000 },
      loanToValueRatio: { type: Number, min: 0.1, max: 1.0, default: 0.7 },
      qualityThreshold: { type: Number, min: 0.1, max: 1.0, default: 0.6 },
      recessionQualityThreshold: { type: Number, min: 0.1, max: 1.0, default: 0.7 },
      recessionDiscount: { type: Number, min: 0.1, max: 1.0, default: 0.8 }
    },
    termOptions: {
      personal: { type: [Number], default: [12, 24, 36, 48, 60] },
      business: { type: [Number], default: [12, 24, 36, 48, 60, 84] },
      mortgage: { type: [Number], default: [120, 180, 240, 300, 360] },
      auto: { type: [Number], default: [12, 24, 36, 48, 60, 72] }
    },
    recessionMode: {
      enabled: { type: Boolean, default: false },
      rateIncrease: { type: Number, min: 0, max: 10, default: 2.0 },
      maxAmountReduction: { type: Number, min: 0.1, max: 1.0, default: 0.85 },
      maxTerm: { type: Number, min: 12, max: 360, default: 36 }
    },
    autoApproval: {
      enabled: { type: Boolean, default: true },
      maxAmount: { type: Number, min: 0, default: 100000 },
      requireManualReview: { type: [String], enum: ['HIGH_DTI', 'LOW_SCORE', 'HIGH_AMOUNT', 'NEW_CUSTOMER', 'RECENT_DELINQUENCY'], default: ['HIGH_AMOUNT', 'NEW_CUSTOMER'] }
    }
  },
  
  // Audit and metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
partnerBankSchema.index({ code: 1 });
partnerBankSchema.index({ slug: 1 });
partnerBankSchema.index({ status: 1 });

// Virtual for full bank name
partnerBankSchema.virtual('fullName').get(function() {
  return `${this.name} (${this.code})`;
});

// Pre-save middleware to ensure slug is set
partnerBankSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

// Static method to get bank by code
partnerBankSchema.statics.findByCode = function(code) {
  return this.findOne({ code: code.toUpperCase() });
};

// Static method to get active banks
partnerBankSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

// Instance method to get lending config for a specific product
partnerBankSchema.methods.getLendingConfig = function(productType = 'personal') {
  return {
    scoreThresholds: this.lendingConfig.scoreThresholds[productType] || this.lendingConfig.scoreThresholds.personal,
    loanAmounts: this.lendingConfig.loanAmounts[productType] || this.lendingConfig.loanAmounts.personal,
    interestRates: this.lendingConfig.interestRates,
    dtiRules: this.lendingConfig.dtiRules,
    collateralRules: this.lendingConfig.collateralRules,
    termOptions: this.lendingConfig.termOptions[productType] || this.lendingConfig.termOptions.personal,
    recessionMode: this.lendingConfig.recessionMode,
    autoApproval: this.lendingConfig.autoApproval
  };
};

// Instance method to get engine configuration
partnerBankSchema.methods.getEngineConfig = function(engineType = 'engine1') {
  return this.engineConfig[engineType] || this.engineConfig.engine1;
};

// Instance method to get complete configuration
partnerBankSchema.methods.getCompleteConfig = function() {
  return {
    engineConfig: this.engineConfig,
    lendingPolicy: this.lendingPolicy,
    accessControls: this.accessControls,
    branding: this.branding,
    legacyConfig: this.lendingConfig
  };
};

// Instance method to validate configuration
partnerBankSchema.methods.validateConfiguration = function() {
  const errors = [];
  
  // Validate engine1 weights sum to 100
  const engine1Weights = this.engineConfig.engine1.scoringWeights;
  const engine1WeightSum = Object.values(engine1Weights).reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(engine1WeightSum - 100) > 1) {
    errors.push(`Engine1 scoring weights must sum to 100 (current: ${engine1WeightSum})`);
  }
  
  // Validate engine2 weights sum to 100
  const engine2Weights = this.engineConfig.engine2.weights;
  const engine2WeightSum = Object.values(engine2Weights).reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(engine2WeightSum - 100) > 1) {
    errors.push(`Engine2 weights must sum to 100 (current: ${engine2WeightSum})`);
  }
  
  // Validate score ranges
  if (this.engineConfig.engine1.maxScore <= this.engineConfig.engine1.minScore) {
    errors.push('Engine1 max score must be greater than min score');
  }
  
  // Validate interest rates
  if (this.lendingPolicy.interestRateRules.baseRate > this.lendingPolicy.interestRateRules.maxRate) {
    errors.push('Base rate cannot be higher than max rate');
  }
  
  return errors;
};

const PartnerBank = mongoose.model('PartnerBank', partnerBankSchema);

export default PartnerBank; 