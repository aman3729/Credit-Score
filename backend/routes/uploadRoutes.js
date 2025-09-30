import express from 'express';
import crypto from 'crypto';
import User from '../models/User.js';
import UserScore from '../models/UserScore.js';
import CreditScore from '../models/CreditScore.js';
import UploadHistory from '../models/UploadHistory.js';
import { requireAdmin, auth } from '../middleware/auth.js';
import ExcelJS from 'exceljs';
import pMap from 'p-map';
import { calculateCreditScore as calculateScore } from '../utils/creditScoring.js';
import { logSecurityEvent } from '../services/securityLogs.js';
import { evaluateLendingDecision } from '../utils/lendingDecision.js';
import CreditReport from '../models/CreditReport.js';
import { uploadSingle, uploadSingleRaw } from '../middleware/upload.js';
import { handleFileUpload } from '../controllers/uploadController.js';
import LoanDecision from '../models/LoanDecision.js';
import path from 'path';
import fs from 'fs';
import MappingProfile from '../models/MappingProfile.js';
import mongoose from 'mongoose';
import SecurityLog from '../models/SecurityLog.js';

const router = express.Router();

// Public Mapping Profile Endpoints (no authentication required)
router.get('/public/mapping-profiles', async (req, res) => {
  try {
    const { partnerId } = req.query;
    const query = partnerId ? { partnerId } : {};
    const profiles = await MappingProfile.find(query).sort({ updatedAt: -1 });
    res.json({ success: true, data: profiles });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/public/mapping-profiles/:id', async (req, res) => {
  try {
    const profile = await MappingProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Mapping profile not found' });
    }
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Ensure the upload directory exists
const uploadDir = path.join('/tmp', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Using hardened upload middleware (size/type/magic-bytes validated)

// Helper function to convert string to camelCase
const toCamelCase = (str) => {
  return str
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((word, index) => (index === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join('');
};

// Helper function to parse a CSV line, handling quoted fields
const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuote = false;

  for (let char of line) {
    if (char === '"') {
      inQuote = !inQuote;
    } else if (char === ',' && !inQuote) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
};

// Helper function to parse CSV content with better error handling and flexibility
const parseCSV = async (content) => {
  return new Promise((resolve, reject) => {
    const rows = [];
    const errors = [];
    
    // Clean and normalize the content
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) {
      return resolve([]);
    }
    
    // Try to detect headers (first non-empty line)
    let headers = [];
    try {
      headers = parseCsvLine(lines[0]).map(toCamelCase);
      console.log('Detected CSV headers:', headers);
    } catch (error) {
      console.error('Error parsing CSV headers:', error);
      return reject(new Error('Invalid CSV format: Could not parse headers'));
    }
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      try {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const values = parseCsvLine(line);
        const row = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        rows.push(row);
      } catch (error) {
        errors.push(`Line ${i + 1}: ${error.message}`);
      }
    }
    
    if (errors.length > 0) {
      console.warn('CSV parsing warnings:', errors);
    }
    
    resolve(rows);
  });
};

// Field validation rules
const fieldValidations = {
  phoneNumber: {
    required: true,
    validate: (value) => {
      if (!value) return 'Phone number is required';
      if (typeof value !== 'string') return 'Phone number must be a string';
      if (value.length < 10) return 'Phone number too short';
      return null;
    }
  },
  paymentHistory: {
    required: true,
    validate: (value) => {
      if (value === undefined || value === null) return 'Payment history is required';
      const num = parseFloat(value);
      if (isNaN(num)) return 'Payment history must be a number';
      if (num < 0 || num > 1) return 'Payment history must be between 0 and 1';
      return null;
    }
  },
  creditUtilization: {
    required: true,
    validate: (value) => {
      if (value === undefined || value === null) return 'Credit utilization is required';
      const num = parseFloat(value);
      if (isNaN(num)) return 'Credit utilization must be a number';
      if (num < 0 || num > 1) return 'Credit utilization must be between 0 and 1';
      return null;
    }
  },
  creditAge: {
    required: true,
    validate: (value) => {
      if (value === undefined || value === null) return 'Credit age is required';
      const num = parseFloat(value);
      if (isNaN(num)) return 'Credit age must be a number';
      if (num < 0) return 'Credit age cannot be negative';
      return null;
    }
  },
  creditMix: {
    required: true,
    validate: (value) => {
      if (value === undefined || value === null) return 'Credit mix is required';
      const num = parseFloat(value);
      if (isNaN(num)) return 'Credit mix must be a number';
      if (num < 0 || num > 1) return 'Credit mix must be between 0 and 1';
      return null;
    }
  },
  inquiries: {
    required: true,
    validate: (value) => {
      if (value === undefined || value === null) return 'Inquiries is required';
      const num = parseFloat(value);
      if (isNaN(num)) return 'Inquiries must be a number';
      if (num < 0) return 'Inquiries cannot be negative';
      return null;
    }
  }
};

// Validate records against field requirements
const validateRecords = (records, validations) => {
  const validRecords = [];
  const invalidRecords = [];
  
  records.forEach((record, index) => {
    const errors = [];
    
    // Check required fields
    Object.entries(validations).forEach(([field, validation]) => {
      if (validation.required) {
        const value = record[field];
        const error = validation.validate(value);
        if (error) {
          errors.push(`${field}: ${error}`);
        }
      }
    });
    
    if (errors.length > 0) {
      invalidRecords.push({
        index,
        record,
        errors
      });
    } else {
      validRecords.push(record);
    }
  });

  return { validRecords, invalidRecords };
};

// Helper function to get factor status
const getFactorStatus = (value, goodThreshold, fairThreshold, direction = 'higher') => {
  value = parseFloat(value) || 0;
  if (direction === 'higher') {
    if (value >= goodThreshold) return 'good';
    if (value >= fairThreshold) return 'fair';
    return 'needs_improvement';
  } else {
    if (value <= goodThreshold) return 'good';
    if (value <= fairThreshold) return 'fair';
    return 'needs_improvement';
  }
};

// Map status to enum values (positive, neutral, negative)
const mapStatus = (status) => {
  const statusMap = {
    'good': 'positive',
    'fair': 'neutral',
    'needs_improvement': 'negative',
    'excellent': 'positive',
    'poor': 'negative'
  };
  return statusMap[status] || 'neutral';
};

// Helper to process a single record
const processRecord = async (record, uploader, aiEnabled, req = {}) => {
  try {
    const phoneNumber = record.phoneNumber || record["phone number"];
    const { paymentHistory, creditUtilization, creditAge, creditMix, inquiries, userId, ...extraFields } = record;
    
    console.log('\n=== PROCESSING RECORD ===');
    console.log('Record data (redacted sensitive fields):', 
      JSON.stringify({
        ...record,
        phoneNumber: record.phoneNumber ? '***REDACTED***' : undefined,
        userId: record.userId || 'N/A'
      }, null, 2)
    );
    
    // Find user by userId or phoneNumber
    let user;
    if (userId) {
      console.log(`Looking up user by ID: ${userId}`);
      // Validate userId format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error(`Invalid user ID format: ${userId}`);
      }
      user = await User.findById(userId);
    } else if (phoneNumber) {
      console.log(`Looking up user by phone: "${phoneNumber}"`);
      user = await User.findOne({ phoneNumber });
    } else {
      throw new Error('Missing required identifier: either userId or phone number must be provided');
    }
    
    if (!user) {
      // Create user if they don't exist (for credit data uploads)
      console.log(`User not found, creating new user for phone: ${phoneNumber}`);
      
      // Validate required fields for user creation
      if (!phoneNumber) {
        throw new Error('Phone number is required to create a new user');
      }
      
      const newUser = new User({
        phoneNumber,
        email: record.email || `${phoneNumber}@temp.com`,
        name: record.fullName || record.name || `User ${phoneNumber}`,
        username: `user_${phoneNumber.replace(/[^0-9]/g, '')}`,
        password: crypto.randomBytes(16).toString('hex'), // Generate random password
        role: 'user',
        bankId: record.bankId || 'CBE', // Default bank
        createdAt: new Date()
      });
      
      try {
        user = await newUser.save();
        console.log(`Created new user: ${user.phoneNumber} (ID: ${user._id})`);
      } catch (saveError) {
        console.error('Error saving new user:', saveError);
        // If username already exists, try with a different username
        if (saveError.code === 11000 && saveError.keyPattern?.username) {
          const timestamp = Date.now();
          newUser.username = `user_${phoneNumber.replace(/[^0-9]/g, '')}_${timestamp}`;
          user = await newUser.save();
          console.log(`Created new user with alternative username: ${user.phoneNumber} (ID: ${user._id})`);
        } else {
          throw saveError;
        }
      }
    }
    
    console.log(`Found user: ${user.phoneNumber} (ID: ${user._id})`);
    
    // Normalize common CSV header variations to expected camelCase keys
    // parseCSV lower-cases headers, so map them back for scoring/decision engines
    const normalizedRecord = {
      ...record,
      paymentHistory: record.paymentHistory ?? record.paymenthistory ?? record.onTimePaymentRate ?? paymentHistory,
      creditUtilization: record.creditUtilization ?? record.creditutilization ?? record.utilization ?? creditUtilization,
      creditAge: record.creditAge ?? record.creditage ?? creditAge,
      creditMix: record.creditMix ?? record.creditmix ?? creditMix,
      inquiries: record.inquiries ?? record.hardinquiries ?? record.recentloanapplications ?? inquiries,
      monthlyIncome: record.monthlyIncome ?? record.monthlyincome,
      monthlyDebtPayments: record.monthlyDebtPayments ?? record.monthlydebtpayments ?? record.monthlydebt ?? 0,
      totalDebt: record.totalDebt ?? record.totaldebt,
      totalCredit: record.totalCredit ?? record.totalcredit,
      openAccounts: record.openAccounts ?? record.openaccounts ?? record.active_loans ?? record.activeloancount,
      activeLoanCount: record.activeLoanCount ?? record.activeloancount ?? record.openaccounts ?? record.active_loans,
      employmentStatus: record.employmentStatus ?? record.employment ?? record.employment_status,
      collateralValue: record.collateralValue ?? record.collateral_value ?? 0,
      collateralQuality: record.collateralQuality ?? record.collateral_quality,
      lastActiveDate: record.lastActiveDate ?? record.lastactivedate,
      recentLoanApplications: record.recentLoanApplications ?? record.recentloanapplications,
      consecutiveMissedPayments: record.consecutiveMissedPayments ?? record.consecutivemissedpayments ?? 0,
    };

    // Process credit factors
    console.log('Processing credit factors for user:', user.phoneNumber);
    
    // Prepare credit factors with proper values
    let rawUtil = normalizedRecord.creditUtilization ?? normalizedRecord.utilization ?? normalizedRecord.creditUtilizationOverall ?? 0;
    let normalizedUtil = parseFloat(rawUtil);
    // Normalize utilization if needed
    if (normalizedUtil > 1) {
      // If both balance and creditLimit are present, use them
      const balance = parseFloat(normalizedRecord.balance ?? normalizedRecord.totalDebt ?? 0);
      const creditLimit = parseFloat(normalizedRecord.creditLimit ?? normalizedRecord.totalCredit ?? 0);
      if (balance > 0 && creditLimit > 0) {
        normalizedUtil = balance / creditLimit;
        console.warn(`[Normalization] Calculated creditUtilization as ratio: ${balance} / ${creditLimit} = ${normalizedUtil}`);
      } else if (normalizedUtil <= 100) {
        normalizedUtil = normalizedUtil / 100;
        console.warn(`[Normalization] Treated creditUtilization as percent: ${rawUtil} -> ${normalizedUtil}`);
      } else {
        console.warn(`[Normalization] creditUtilization value ${rawUtil} is out of expected range, clamping to 1`);
        normalizedUtil = 1;
      }
    }
    const creditFactors = {
      paymentHistory: parseFloat(normalizedRecord.paymentHistory ?? normalizedRecord.onTimePaymentRate ?? 0),
      creditUtilization: {
        overall: normalizedUtil,
        byAccount: []
      },
      creditAge: parseFloat(normalizedRecord.creditAge ?? normalizedRecord.oldestAccountAge ?? normalizedRecord.accountAge ?? 0),
      creditMix: parseFloat(normalizedRecord.creditMix ?? normalizedRecord.mix ?? 0),
      inquiries: parseFloat(normalizedRecord.inquiries ?? normalizedRecord.recentLoanApplications ?? normalizedRecord.hardInquiries ?? 0),
      ...extraFields
    };

    console.log('Credit factors:', JSON.stringify(creditFactors, null, 2));
    
    // Log what is passed to calculateScore
    const scoreInput = {
      paymentHistory: typeof normalizedRecord.paymentHistory === 'number' ? normalizedRecord.paymentHistory : 0,
      creditUtilization: typeof normalizedRecord.creditUtilization === 'number' ? normalizedRecord.creditUtilization : (typeof normalizedRecord.creditUtilization?.overall === 'number' ? normalizedRecord.creditUtilization.overall : 0),
      creditAge: typeof normalizedRecord.creditAge === 'number' ? normalizedRecord.creditAge : 0,
      creditMix: typeof normalizedRecord.creditMix === 'number' ? normalizedRecord.creditMix : 0,
      inquiries: typeof normalizedRecord.inquiries === 'number' ? normalizedRecord.inquiries : 1,
      activeLoanCount: normalizedRecord.activeLoanCount ?? 0,
      monthlyIncome: normalizedRecord.monthlyIncome ?? 0,
      monthlyDebtPayments: typeof normalizedRecord.monthlyDebtPayments === 'number' ? normalizedRecord.monthlyDebtPayments : 0
    };
    console.log('Data passed to calculateScore:', JSON.stringify(scoreInput, null, 2));

    // Log the full record being passed to calculateScore
    console.log('DEBUG: Full record passed to calculateScore:', JSON.stringify(normalizedRecord, null, 2));
    // Calculate score using the entire record
    const score = calculateScore(normalizedRecord);
    console.log('DEBUG: Output from calculateScore:', score);
    console.log('Calculated score result (batch upload):', score);

    // Prepare factors array with consistent structure
    const factors = [
      { 
        name: 'Payment History',
        value: creditFactors.paymentHistory,
        status: getFactorStatus(creditFactors.paymentHistory, 0.9, 0.7, 'higher')
      },
      {
        name: 'Credit Utilization',
        value: creditFactors.creditUtilization.overall,
        status: getFactorStatus(creditFactors.creditUtilization.overall, 0.3, 0.5, 'lower')
      },
      {
        name: 'Credit Age',
        value: creditFactors.creditAge,
        status: getFactorStatus(creditFactors.creditAge, 7, 3, 'higher')
      },
      {
        name: 'Credit Mix',
        value: creditFactors.creditMix,
        status: getFactorStatus(creditFactors.creditMix, 0.7, 0.4, 'higher')
      },
      {
        name: 'Credit Inquiries',
        value: creditFactors.inquiries,
        status: getFactorStatus(creditFactors.inquiries, 2, 4, 'lower')
      }
    ];

    console.log('Creating credit score document...');
    
    // Validate user ID before creating credit score
    if (!user || !user._id) {
      throw new Error('Invalid user reference when creating credit score');
    }
    
    console.log(`Creating credit score for user ID: ${user._id}`);
    
    // Prepare notes as an array of objects if notes exist in record
    const notes = record.notes ? [{
      content: record.notes,
      createdBy: uploader._id.toString()
    }] : [];

    // Helper to normalize classification value
    function normalizeClassification(classification) {
      if (!classification) return 'Unknown';
      const map = {
        'GOOD': 'Good',
        'FAIR': 'Fair',
        'POOR': 'Poor',
        'EXCELLENT': 'Excellent',
        'VERY GOOD': 'Very Good',
        'UNKNOWN': 'Unknown',
      };
      return map[classification.toUpperCase()] || classification;
    }

    // Build scoreData and userData for lending decision
    const scoreData = {
      score: score.score,
      classification: score.classification,
      breakdown: score.breakdown,
      version: score.version || 'v2.3',
      requiredDisclosures: score.requiredDisclosures || [],
      baseScore: score.baseScore || null
    };
    // Build userData for lending engine
    const userData = {
      ...normalizedRecord,
      employmentStatus: normalizedRecord.employmentStatus || 'unknown',
      collateralValue: normalizedRecord.collateralValue !== undefined ? normalizedRecord.collateralValue : 0,
      alternativeIncome: normalizedRecord.alternativeIncome !== undefined ? normalizedRecord.alternativeIncome : 0,
      collateralQuality: normalizedRecord.collateralQuality || 'unknown',
      dti: normalizedRecord.monthlyIncome && normalizedRecord.monthlyIncome > 0 ? (normalizedRecord.monthlyDebtPayments || 0) / normalizedRecord.monthlyIncome : 0,
      // Add any other fields as needed
    };
    console.log('DEBUG: userData passed to lending engine:', JSON.stringify(userData, null, 2));
    // Evaluate lending decision with fallback
    let lendingDecision;
    try {
      lendingDecision = evaluateLendingDecision(scoreData, userData);
    } catch (err) {
      console.error('Error generating lending decision:', err);
      lendingDecision = {
        decision: 'Review', // fallback to valid enum
        reasons: ['Lending decision error'],
        recommendations: [],
        evaluatedAt: new Date()
      };
    }

    // Create credit score document with lending decision
    let creditScore;
    try {
      creditScore = await CreditScore.create({
        user: user._id,
        score: score.score,
        classification: normalizeClassification(score.classification),
        baseScore: score.baseScore,
        breakdown: score.breakdown || {},
        method: aiEnabled ? 'AI' : 'manual',
        uploadedBy: uploader._id,
        uploadedAt: new Date(),
        notes: notes,
        factors: factors.map(factor => ({
          ...factor,
          impact: mapStatus(factor.status),
          status: mapStatus(factor.status),
          description: factor.description || ''
        })),
        lendingDecision: {
          decision: lendingDecision.decision,
          reasons: lendingDecision.reasons,
          recommendation: lendingDecision.recommendation,
          riskFlags: lendingDecision.riskFlags,
          engineVersion: lendingDecision.engineVersion || 'v101',
          evaluatedAt: new Date()
        }
      });
      console.log('CreditScore created (persisted):', creditScore.score);
    } catch (err) {
      console.error('Error creating CreditScore:', err, { userId: user._id, score });
      throw err; // Re-throw to be caught in outer catch
    }

    const numericScore = score.score;
    // Only use creditScore if it was created successfully
    if (creditScore) {
      // Update user's credit score and history
      try {
        console.log('Attempting to update user with new credit score:', {
          userId: user._id,
          creditScoreId: creditScore._id,
          creditScoreLastUpdated: new Date()
        });
        const updateResult = await User.findByIdAndUpdate(user._id, {
          creditScore: creditScore._id, // Store the CreditScore document ID
          creditScoreLastUpdated: new Date(),
          // Sync financial fields from uploaded record if present
          ...(typeof normalizedRecord.monthlyIncome !== 'undefined' && { monthlyIncome: normalizedRecord.monthlyIncome }),
          ...(typeof normalizedRecord.totalDebt !== 'undefined' && { totalDebt: normalizedRecord.totalDebt }),
          ...(typeof normalizedRecord.monthlySavings !== 'undefined' && { monthlySavings: normalizedRecord.monthlySavings }),
          ...(typeof normalizedRecord.bankBalance !== 'undefined' && { bankBalance: normalizedRecord.bankBalance }),
          ...(typeof normalizedRecord.mobileMoneyBalance !== 'undefined' && { mobileMoneyBalance: normalizedRecord.mobileMoneyBalance }),
          ...(typeof normalizedRecord.totalCredit !== 'undefined' && { totalCredit: normalizedRecord.totalCredit }),
          ...(typeof normalizedRecord.openAccounts !== 'undefined' && { openAccounts: normalizedRecord.openAccounts }),
          ...(typeof normalizedRecord.creditMix !== 'undefined' && { creditMix: normalizedRecord.creditMix }),
          ...(typeof normalizedRecord.creditAge !== 'undefined' && { creditAge: normalizedRecord.creditAge }),
          ...(typeof normalizedRecord.paymentHistory !== 'undefined' && { paymentHistory: normalizedRecord.paymentHistory }),
          ...(typeof normalizedRecord.inquiries !== 'undefined' && { inquiries: normalizedRecord.inquiries }),
          ...(typeof normalizedRecord.employmentStatus !== 'undefined' && { employmentStatus: normalizedRecord.employmentStatus }),
          ...(typeof normalizedRecord.collateralValue !== 'undefined' && { collateralValue: normalizedRecord.collateralValue }),
          $push: {
            creditHistory: {
              score: numericScore,
              date: new Date(),
              factors: factors,
              notes: notes,
              breakdown: score.breakdown || {},
              source: 'batch_upload'
            }
          }
        }, { new: true });
        if (!updateResult) {
          console.error('User update failed: No user found with _id', user._id);
        } else {
          console.log('User updated successfully:', updateResult._id);
        }
      } catch (err) {
        console.error('Error updating user:', err, {
          userId: user._id,
          creditScoreId: creditScore._id
        });
      }
    }

    // Update UserScore
    await UserScore.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          score: numericScore,
          lastUpdated: new Date(),
          factors: factors.map(factor => ({
            name: factor.name,
            value: factor.value,
            status: mapStatus(factor.status),
            impact: mapStatus(factor.status)
          })),
          classification: score.classification,
          baseScore: score.baseScore,
          breakdown: score.breakdown || {}
        }
      },
      { upsert: true, new: true }
    );

    // Log successful processing
    try {
      await logSecurityEvent({
        userId: uploader._id,
        action: 'CREDIT_SCORE_UPLOAD',
        details: {
          targetUserId: user._id,
          score: numericScore,
          method: aiEnabled ? 'AI' : 'manual',
          filename: req?.file?.originalname || req?.body?.filename || 'json-upload',
          uploader: uploader._id
        },
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers?.['user-agent'] || 'batch-upload'
      });
    } catch (logError) {
      console.error('Error logging security event:', logError);
      // Don't fail the whole operation if logging fails
    }

    // Prepare creditReportUpdate for CreditReport upsert
    const creditReportUpdate = {
      userId: user._id,
      creditScore: {
        fico: {
          score: numericScore,
          lastUpdated: new Date(),
          version: 'FICO 8',
          range: { min: 300, max: 850 },
          classification: normalizeClassification(score.classification)
        }
      },
      creditAge: creditFactors.creditAge,
      creditUtilization: creditFactors.creditUtilization,
      totalDebt: record.totalDebt,
      monthlyIncome: record.monthlyIncome,
      paymentHistory: record.paymentHistory,
      creditMix: record.creditMix,
      lastActiveDate: record.lastActiveDate,
      openAccounts: record.activeLoanCount,
      updatedAt: new Date()
    };

    // Update or create CreditReport for this user
    try {
      const creditReportResult = await CreditReport.findOneAndUpdate(
        { userId: user._id },
        {
          $set: {
            ...creditReportUpdate
          },
          $push: {
            lendingDecisionHistory: {
              decision: lendingDecision.decision,
              reasons: lendingDecision.reasons,
              recommendation: lendingDecision.recommendation,
              evaluatedAt: new Date()
            }
          }
        },
        { upsert: true, new: true }
      );
      console.log('CreditReport upserted (persisted score):', creditReportResult?.creditScore?.fico?.score);
    } catch (err) {
      console.error('Error upserting CreditReport:', err, { userId: user._id, creditReportUpdate });
    }

    // Upsert LoanDecision for this user
    await LoanDecision.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        creditScore: score.score,
        decision: {
          ...lendingDecision,
          recommendation: lendingDecision.recommendation,
          monthlyPayment: lendingDecision.monthlyPayment
        },
        engineVersion: lendingDecision.engineVersion || 'v101',
        timestamp: new Date()
      },
      { upsert: true, new: true }
    );
    
    // Push into user's loan history
    await User.findByIdAndUpdate(user._id, {
      $push: {
        loanHistory: {
          decision: lendingDecision,
          creditScore: score.score,
          timestamp: new Date()
        }
      }
    });

    return {
      success: true,
      record: {
        phoneNumber: user.phoneNumber,
        userId: user._id,
        score: score,
        creditScoreId: creditScore._id
      }
    };

  } catch (error) {
    console.error('Error processing record:', error);
    return {
      success: false,
      error: error.message,
      record: {
        ...record,
        phoneNumber: record.phoneNumber ? '***REDACTED***' : undefined
      }
    };
  }
};

// Batch upload route
router.post('/batch-upload', 
  auth, 
  requireAdmin, 
  ...uploadSingle('file'), 
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      // Get AI enabled flag from body (default false)
      const aiEnabled = req.body.aiEnabled === 'true' || req.body.aiEnabled === true;

      // Convert buffer to string
      const content = req.file.buffer.toString('utf8');

      // Parse CSV
      let records;
      try {
        records = await parseCSV(content);
      } catch (parseError) {
        console.error('CSV parse error:', parseError);
        return res.status(400).json({ 
          success: false, 
          error: `Error parsing CSV: ${parseError.message}` 
        });
      }

      // Validate records
      const { validRecords, invalidRecords } = validateRecords(records, fieldValidations);

      // Log counts
      console.log(`Valid records: ${validRecords.length}, Invalid: ${invalidRecords.length}`);

      // If no valid records, return error
      if (validRecords.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid records found',
          invalidRecords
        });
      }

      // Process valid records with concurrency (5 at a time)
      const results = await pMap(
        validRecords,
        async (record) => {
          try {
            return await processRecord(record, req.user, aiEnabled, req);
          } catch (err) {
            console.error('Unhandled error in processRecord:', err);
            return {
              success: false,
              error: err.message,
              record: record
            };
          }
        },
        { concurrency: 5 }
      );

      // Count successes and failures
      const successes = results.filter(r => r.success);
      const failures = results.filter(r => !r.success);

      // Create an upload history log
      const history = await UploadHistory.create({
        uploadedBy: req.user._id,
        filename: req.file.originalname,
        recordCount: validRecords.length,
        successCount: successes.length,
        errorCount: failures.length,
        status: 'completed',
        completedAt: new Date()
      });

      // Log security event for batch upload
      await logSecurityEvent({
        userId: req.user._id,
        action: 'BATCH_UPLOAD',
        details: {
          fileName: req.file.originalname,
          recordCount: validRecords.length,
          successCount: successes.length,
          failureCount: failures.length,
          invalidRecordCount: invalidRecords.length,
          historyId: history._id
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      // Respond with results
      res.json({
        success: true,
        message: `Processed ${validRecords.length} records (${successes.length} success, ${failures.length} failures, ${invalidRecords.length} invalid)`,
        results: {
          successes: successes.map(s => ({
            userId: s.record?.userId || 'N/A',
            phoneNumber: s.record?.phoneNumber ? '***REDACTED***' : 'N/A',
            score: s.record?.score?.score
          })),
          failures: failures.map(f => ({
            error: f.error,
            record: {
              // Redact sensitive info
              ...f.record,
              phoneNumber: f.record.phoneNumber ? '***REDACTED***' : undefined,
              userId: f.record.userId || 'N/A'
            }
          })),
          invalidRecords
        },
        historyId: history._id
      });

    } catch (error) {
      console.error('Error in batch upload:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Internal server error' 
      });
    }
  }
);

router.post('/upload', ...uploadSingle('file'), async (req, res, next) => {
  try {
    await handleFileUpload(req, res, next);
    // Audit log: file upload
    if (req.user && req.file) {
      await SecurityLog.create({
        user: req.user.id, // Required field for SecurityLog
        action: 'FILE_UPLOAD',
        details: {
          fileName: req.file.originalname,
          targetUserId: req.body.userId || null,
          uploadedAt: new Date()
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
  } catch (err) {
    next(err);
  }
});

// Chunked Upload Session Management
const uploadSessions = new Map();

// Cleanup old sessions (older than 1 hour)
const cleanupOldSessions = () => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  let cleanedCount = 0;
  
  for (const [sessionId, session] of uploadSessions.entries()) {
    if (session.createdAt < oneHourAgo) {
      uploadSessions.delete(sessionId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} old upload sessions`);
  }
};

// Run cleanup every 30 minutes
setInterval(cleanupOldSessions, 30 * 60 * 1000);

// Create upload session for chunked uploads
router.post('/create-session', auth, requireAdmin, async (req, res) => {
  try {
    const {
      sessionId,
      uploadId,
      fileName,
      fileSize,
      partnerId,
      scoringEngine = 'default',
      totalChunks
    } = req.body;

    // Validate required fields
    if (!sessionId || !uploadId || !fileName || !partnerId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sessionId, uploadId, fileName, partnerId'
      });
    }

    // Create session object
    const session = {
      sessionId,
      uploadId,
      fileName,
      fileSize: parseInt(fileSize) || 0,
      partnerId,
      scoringEngine,
      totalChunks: parseInt(totalChunks) || 1,
      chunks: new Map(),
      receivedChunks: 0,
      status: 'active',
      createdAt: new Date(),
      createdBy: req.user._id,
      metadata: {
        partnerId,
        scoringEngine,
        totalChunks: parseInt(totalChunks) || 1
      }
    };

    // Store session
    uploadSessions.set(sessionId, session);

    // Log security event
    await logSecurityEvent({
      userId: req.user._id,
      action: 'UPLOAD_SESSION_CREATED',
      details: {
        sessionId,
        uploadId,
        fileName,
        fileSize,
        partnerId,
        scoringEngine,
        totalChunks
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    console.log(`Upload session created: ${sessionId} for file: ${fileName}`);

    res.json({
      success: true,
      data: {
        sessionId,
        uploadId,
        status: 'active',
        totalChunks: session.totalChunks,
        message: 'Upload session created successfully'
      }
    });

  } catch (error) {
    console.error('Error creating upload session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create upload session'
    });
  }
});

// Upload chunk
router.post('/upload-chunk', auth, requireAdmin, ...uploadSingleRaw('chunk'), async (req, res) => {
  try {
    const { sessionId, chunkIndex, totalChunks } = req.body;

    if (!sessionId || chunkIndex === undefined || !req.file) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sessionId, chunkIndex, or chunk file'
      });
    }

    const session = uploadSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Upload session not found'
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Upload session is not active'
      });
    }

    const chunkIndexNum = parseInt(chunkIndex);
    const totalChunksNum = parseInt(totalChunks);

    // Store chunk
    session.chunks.set(chunkIndexNum, {
      data: req.file.buffer,
      size: req.file.size,
      uploadedAt: new Date()
    });

    session.receivedChunks++;

    console.log(`Chunk ${chunkIndexNum + 1}/${totalChunksNum} uploaded for session: ${sessionId}`);

    // Check if all chunks received
    if (session.receivedChunks === session.totalChunks) {
      session.status = 'complete';
      
      // Combine chunks
      const combinedBuffer = Buffer.concat(
        Array.from(session.chunks.entries())
          .sort(([a], [b]) => a - b)
          .map(([, chunk]) => chunk.data)
      );

      // Process the complete file
      try {
        const content = combinedBuffer.toString('utf8');
        let records;

        // Parse based on file extension
        const fileExt = session.fileName.split('.').pop().toLowerCase();
        if (fileExt === 'json') {
          records = JSON.parse(content);
          if (!Array.isArray(records)) {
            records = [records];
          }
        } else if (fileExt === 'csv') {
          records = await parseCSV(content);
        } else {
          throw new Error(`Unsupported file type: ${fileExt}`);
        }

        // Validate records
        const { validRecords, invalidRecords } = validateRecords(records, fieldValidations);

        // Process valid records
        const results = await pMap(
          validRecords,
          async (record) => {
            try {
              return await processRecord(record, req.user, session.scoringEngine === 'ai', req);
            } catch (err) {
              console.error('Error processing record:', err);
              return {
                success: false,
                error: err.message,
                record: record
              };
            }
          },
          { concurrency: 5 }
        );

        const successes = results.filter(r => r.success);
        const failures = results.filter(r => !r.success);

        // Create upload history
        const history = await UploadHistory.create({
          uploadedBy: req.user._id,
          filename: session.fileName,
          recordCount: validRecords.length,
          successCount: successes.length,
          errorCount: failures.length + invalidRecords.length,
          status: 'completed',
          completedAt: new Date()
        });

        // Log security event
        await logSecurityEvent({
          userId: req.user._id,
          action: 'CHUNKED_UPLOAD_COMPLETED',
          details: {
            sessionId,
            uploadId: session.uploadId,
            fileName: session.fileName,
            recordCount: validRecords.length,
            successCount: successes.length,
            failureCount: failures.length,
            historyId: history._id
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });

        // Clean up session
        uploadSessions.delete(sessionId);

        res.json({
          success: true,
          data: {
            sessionId,
            status: 'completed',
            message: `Successfully processed ${validRecords.length} records`,
            results: {
              successes: successes.length,
              failures: failures.length,
              invalidRecords: invalidRecords.length
            },
            historyId: history._id
          }
        });

      } catch (processError) {
        console.error('Error processing combined file:', processError);
        session.status = 'error';
        res.status(500).json({
          success: false,
          error: `Error processing file: ${processError.message}`
        });
      }
    } else {
      // More chunks expected
      res.json({
        success: true,
        data: {
          sessionId,
          status: 'chunk_received',
          receivedChunks: session.receivedChunks,
          totalChunks: session.totalChunks,
          message: `Chunk ${chunkIndexNum + 1} uploaded successfully`
        }
      });
    }

  } catch (error) {
    console.error('Error uploading chunk:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload chunk'
    });
  }
});

// Get session status
router.get('/session/:sessionId', auth, requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = uploadSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Upload session not found'
      });
    }

    res.json({
      success: true,
      data: {
        sessionId,
        status: session.status,
        receivedChunks: session.receivedChunks,
        totalChunks: session.totalChunks,
        fileName: session.fileName,
        createdAt: session.createdAt
      }
    });

  } catch (error) {
    console.error('Error getting session status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get session status'
    });
  }
});

// Cancel upload session
router.delete('/session/:sessionId', auth, requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = uploadSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Upload session not found'
      });
    }

    // Clean up session
    uploadSessions.delete(sessionId);

    // Log security event
    await logSecurityEvent({
      userId: req.user._id,
      action: 'UPLOAD_SESSION_CANCELLED',
      details: {
        sessionId,
        fileName: session.fileName,
        receivedChunks: session.receivedChunks,
        totalChunks: session.totalChunks
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: {
        sessionId,
        status: 'cancelled',
        message: 'Upload session cancelled successfully'
      }
    });

  } catch (error) {
    console.error('Error cancelling session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel session'
    });
  }
});

// Finalize upload endpoint (for compatibility with frontend hook)
router.post('/finalize', auth, requireAdmin, async (req, res) => {
  try {
    const { sessionId, uploadId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    const session = uploadSessions.get(sessionId);
    
    // If session doesn't exist, it might have been completed and cleaned up
    if (!session) {
      // Return success since the upload was likely already completed
      res.json({
        success: true,
        data: {
          sessionId,
          uploadId,
          status: 'finalized',
          message: 'Upload already completed and finalized',
          fileName: 'Unknown',
          fileSize: 0,
          totalChunks: 0
        }
      });
      return;
    }

    if (session.status !== 'complete') {
      return res.status(400).json({
        success: false,
        error: 'Upload session is not complete. All chunks must be uploaded first.'
      });
    }

    // The session is already processed when all chunks are received
    // This endpoint just confirms the finalization
    res.json({
      success: true,
      data: {
        sessionId,
        uploadId,
        status: 'finalized',
        message: 'Upload finalized successfully',
        fileName: session.fileName,
        fileSize: session.fileSize,
        totalChunks: session.totalChunks
      }
    });

  } catch (error) {
    console.error('Error finalizing upload:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to finalize upload'
    });
  }
});

// Admin Mapping Profile Endpoints
router.get('/mapping-profiles', auth, requireAdmin, async (req, res) => {
  try {
    const { partnerId } = req.query;
    const query = partnerId ? { partnerId } : {};
    const profiles = await MappingProfile.find(query).sort({ updatedAt: -1 });
    res.json({ success: true, data: profiles });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/mapping-profiles/:id', auth, requireAdmin, async (req, res) => {
  try {
    const profile = await MappingProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Mapping profile not found' });
    }
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Create mapping profile endpoint
router.post('/mapping-profiles', auth, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      partnerId,
      fileType,
      fieldsMapping,
      description,
      createdBy,
      isActive = true
    } = req.body;

    // Validate required fields
    if (!name || !partnerId || !fieldsMapping) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, partnerId, fieldsMapping'
      });
    }

    // Check if profile with same name already exists for this partner
    const existingProfile = await MappingProfile.findOne({
      name,
      partnerId
    });

    if (existingProfile) {
      return res.status(409).json({
        success: false,
        error: 'A mapping profile with this name already exists for this partner'
      });
    }

    // Create the mapping profile
    const mappingProfile = new MappingProfile({
      name: name.trim(),
      partnerId,
      fileType: fileType || 'unknown',
      fieldsMapping,
      description: description || `Custom mapping profile for ${partnerId}`,
      createdBy: req.user._id,
      isActive
    });

    await mappingProfile.save();

    // Log security event
    await logSecurityEvent({
      userId: req.user._id,
      action: 'MAPPING_PROFILE_CREATED',
      details: {
        profileId: mappingProfile._id,
        profileName: name,
        partnerId,
        fieldCount: Object.keys(fieldsMapping).length
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    console.log(`Mapping profile created: ${name} for partner: ${partnerId}`);

    res.status(201).json({
      success: true,
      data: mappingProfile,
      message: 'Mapping profile created successfully'
    });

  } catch (error) {
    console.error('Error creating mapping profile:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create mapping profile'
    });
  }
});

// Update mapping profile endpoint
router.put('/mapping-profiles/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const profile = await MappingProfile.findById(id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Mapping profile not found'
      });
    }

    // Update the profile
    Object.assign(profile, updateData);
    await profile.save();

    // Log security event
    await logSecurityEvent({
      userId: req.user._id,
      action: 'MAPPING_PROFILE_UPDATED',
      details: {
        profileId: profile._id,
        profileName: profile.name,
        partnerId: profile.partnerId
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: profile,
      message: 'Mapping profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating mapping profile:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update mapping profile'
    });
  }
});

// Delete mapping profile endpoint
router.delete('/mapping-profiles/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await MappingProfile.findById(id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Mapping profile not found'
      });
    }

    await MappingProfile.findByIdAndDelete(id);

    // Log security event
    await logSecurityEvent({
      userId: req.user._id,
      action: 'MAPPING_PROFILE_DELETED',
      details: {
        profileId: profile._id,
        profileName: profile.name,
        partnerId: profile.partnerId
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Mapping profile deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting mapping profile:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete mapping profile'
    });
  }
});

export { processRecord };
export default router;