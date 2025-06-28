import mongoose from 'mongoose';

const creditReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  personalInfo: {
    name: String,
    ssn: String, // Should be encrypted in production
    addresses: [{
      street: String,
      city: String,
      state: String,
      zipCode: String,
      dateAdded: Date
    }],
    employers: [{
      name: String,
      position: String,
      startDate: Date,
      endDate: Date
    }]
  },
  creditScore: {
    fico: {
      score: { type: Number, min: 300, max: 850 },
      version: { type: String, default: 'FICO 8' },
      lastUpdated: { type: Date, default: Date.now },
      range: {
        min: { type: Number, default: 300 },
        max: { type: Number, default: 850 }
      }
    },
    factors: [{
      name: String,
      score: Number,
      impact: { type: String, enum: ['positive', 'negative', 'neutral'], default: 'neutral' }
    }]
  },
  // Add fields that were being set in uploadRoutes.js
  paymentHistory: { type: Number, min: 0, max: 100 },
  creditUtilization: { type: Number, min: 0, max: 100 },
  // Renamed to avoid conflict with virtual field
  creditAgeMonths: { type: Number, min: 0, default: 0 },
  creditMix: { type: Number, min: 0, max: 100 },
  inquiries: { type: Number, min: 0 },
  totalAccounts: { type: Number, default: 0 },
  openAccounts: { type: Number, default: 0 },
  totalDebt: { type: Number, default: 0 },
  totalCredit: { type: Number, default: 0 },
  monthlyIncome: { type: Number, default: 0 },
  recentMissedPayments: { type: Number, default: 0 },
  recentDefaults: { type: Number, default: 0 },
  lastActiveDate: { type: Date, default: Date.now },
  scoreHistory: [{
    score: Number,
    date: { type: Date, default: Date.now },
    source: String,
    factors: {
      paymentHistory: Number,
      creditUtilization: Number,
      creditAge: Number,
      creditMix: Number,
      inquiries: Number
    }
  }],
  creditAccounts: [{
    accountType: {
      type: String,
      enum: ['credit_card', 'mortgage', 'auto_loan', 'personal_loan', 'student_loan', 'other']
    },
    accountName: String,
    accountNumber: String, // Last 4 digits only
    balance: Number,
    creditLimit: Number,
    paymentHistory: [{
      date: Date,
      status: {
        type: String,
        enum: ['on_time', 'late_30', 'late_60', 'late_90', 'collection', 'charged_off']
      },
      amount: Number
    }],
    openDate: Date,
    status: {
      type: String,
      enum: ['open', 'closed', 'charged_off', 'collection']
    },
    lastReported: Date
  }],
  creditUtilization: {
    overall: Number, // Percentage
    byAccount: [{
      accountId: String,
      utilization: Number
    }]
  },
  inquiries: [{
    lender: String,
    date: Date,
    type: {
      type: String,
      enum: ['hard', 'soft']
    },
    purpose: String
  }],
  publicRecords: [{
    type: {
      type: String,
      enum: ['bankruptcy', 'tax_lien', 'civil_judgment']
    },
    date: Date,
    amount: Number,
    status: {
      type: String,
      enum: ['filed', 'discharged', 'dismissed', 'satisfied']
    },
    courtInfo: {
      name: String,
      location: String,
      caseNumber: String
    }
  }],
  collections: [{
    creditor: String,
    originalCreditor: String,
    amount: Number,
    dateAssigned: Date,
    status: {
      type: String,
      enum: ['open', 'closed', 'paid', 'disputed']
    },
    lastActivity: Date
  }],
  fraudAlerts: [{
    type: {
      type: String,
      enum: ['initial', 'extended', 'military', 'identity_theft']
    },
    dateAdded: Date,
    expirationDate: Date,
    description: String
  }],
  consumerStatements: [{
    statement: String,
    dateAdded: Date,
    expirationDate: Date
  }],
  riskFactors: [{
    factor: String,
    impact: {
      type: String,
      enum: ['high', 'medium', 'low']
    },
    description: String
  }],
  debtToIncome: {
    ratio: Number,
    monthlyIncome: Number,
    monthlyDebtPayments: Number,
    lastCalculated: Date
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
creditReportSchema.index({ 'creditScore.fico.score': 1 });
creditReportSchema.index({ 'creditScore.vantageScore.score': 1 });
creditReportSchema.index({ 'lastUpdated': 1 });

// Virtual for credit age calculation
creditReportSchema.virtual('creditAge').get(function() {
  if (this.creditAccounts.length === 0) return 0;
  
  const oldestAccount = this.creditAccounts
    .reduce((oldest, account) => 
      account.openDate < oldest ? account.openDate : oldest,
      new Date()
    );
  
  return Math.floor((new Date() - oldestAccount) / (1000 * 60 * 60 * 24 * 365));
});

// Method to calculate average age of accounts
creditReportSchema.methods.calculateAverageAccountAge = function() {
  if (this.creditAccounts.length === 0) return 0;
  
  const totalAge = this.creditAccounts.reduce((sum, account) => {
    const age = (new Date() - account.openDate) / (1000 * 60 * 60 * 24 * 365);
    return sum + age;
  }, 0);
  
  return totalAge / this.creditAccounts.length;
};

const CreditReport = mongoose.model('CreditReport', creditReportSchema);

export default CreditReport; 