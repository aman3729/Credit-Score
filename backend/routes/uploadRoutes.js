import express from 'express';
import multer from 'multer';
import User from '../models/User.js';
import UserScore from '../models/UserScore.js';
import CreditScore from '../models/CreditScore.js';
import UploadHistory from '../models/UploadHistory.js';
import { requireAdmin, auth, requireValidConsent } from '../middleware/auth.js';
import ExcelJS from 'exceljs';
import pMap from 'p-map';
import { calculateCreditScore as calculateScore } from '../utils/creditScoring.js';
import { logSecurityEvent } from '../services/securityLogs.js';
import { evaluateLendingDecision } from '../utils/lendingDecision.js';
import CreditReport from '../models/CreditReport.js';
import upload from '../middleware/upload.js';
import { handleFileUpload } from '../controllers/uploadController.js';
import LoanDecision from '../models/LoanDecision.js';
import path from 'path';
import fs from 'fs';
import MappingProfile from '../models/MappingProfile.js';
import mongoose from 'mongoose';
import SecurityLog from '../models/SecurityLog.js';

const router = express.Router();

// Ensure the upload directory exists
const uploadDir = path.join('/tmp', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const uploadMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Field validation configuration
const fieldValidations = {
  paymentHistory: {
    required: true,
    type: 'number',
    validate: value => value >= 0 && value <= 1,
    error: 'must be a number between 0 and 1 (e.g., 0.95 for 95%)'
  },
  creditUtilization: {
    required: true,
    type: 'number',
    validate: value => value >= 0 && value <= 1,
    error: 'must be a number between 0 and 1 (e.g., 0.3 for 30%)'
  },
  creditAge: {
    required: true,
    type: 'number',
    validate: value => value >= 0,
    error: 'must be a positive number (in years)'
  },
  creditMix: {
    required: true,
    type: 'number',
    validate: value => value >= 0 && value <= 1,
    error: 'must be a number between 0 and 1 (e.g., 0.8 for 80%)'
  },
  inquiries: {
    required: true,
    type: 'number',
    validate: value => value >= 0,
    error: 'must be a non-negative integer'
  },
  totalDebt: {
    required: true,
    type: 'number',
    validate: value => value >= 0,
    error: 'must be a positive number'
  },
  // New/optional fields for new batch upload component
  activeLoanCount: {
    required: false,
    type: 'number',
    validate: value => value >= 0,
    error: 'must be a non-negative integer'
  },
  consecutiveMissedPayments: {
    required: false,
    type: 'number',
    validate: value => value >= 0,
    error: 'must be a non-negative integer'
  },
  recentLoanApplications: {
    required: false,
    type: 'number',
    validate: value => value >= 0,
    error: 'must be a non-negative integer'
  },
  oldestAccountAge: {
    required: false,
    type: 'number',
    validate: value => value >= 0,
    error: 'must be a non-negative integer (months)'
  },
  transactionsLast90Days: {
    required: false,
    type: 'number',
    validate: value => value >= 0,
    error: 'must be a non-negative integer'
  },
  onTimePaymentRate: {
    required: false,
    type: 'number',
    validate: value => value >= 0 && value <= 1,
    error: 'must be a number between 0 and 1'
  },
  defaultCountLast3Years: {
    required: false,
    type: 'number',
    validate: value => value >= 0,
    error: 'must be a non-negative integer'
  },
  monthlyIncome: {
    required: false,
    type: 'number',
    validate: value => value >= 0,
    error: 'must be a positive number'
  },
  recentMissedPayments: {
    required: false,
    type: 'number',
    validate: value => value >= 0,
    error: 'must be a non-negative integer'
  },
  recentDefaults: {
    required: false,
    type: 'number',
    validate: value => value >= 0,
    error: 'must be a non-negative integer'
  },
  lastActiveDate: {
    required: false,
    type: 'string',
    validate: value => !isNaN(Date.parse(value)),
    error: 'must be a valid date (YYYY-MM-DD)'
  },
  source: {
    required: false,
    type: 'string',
    error: 'must be a string'
  },
  notes: {
    required: false,
    type: 'string',
    error: 'must be a string'
  },
  phoneNumber: { // Fixed key name (removed space)
    required: true,
    type: 'string',
    validate: value => /^((\+\d{9,15})|(0\d{9,15})|(\d{9,15}))$/.test(value),
    error: 'must be a valid phone number (9-15 digits, can start with +, 0, or just digits)'
  },
  loanTypeCounts: {
    required: false,
    type: 'object',
    validate: value => typeof value === 'object' && value !== null,
    error: 'must be an object (e.g., { "creditCard": 2, "carLoan": 1 })'
  },
  onTimeRateLast6Months: {
    required: false,
    type: 'number',
    validate: value => value >= 0 && value <= 1,
    error: 'must be a number between 0 and 1'
  },
  monthsSinceLastDelinquency: {
    required: false,
    type: 'number',
    validate: value => value >= 0,
    error: 'must be a non-negative integer (months)'
  },
};

// Helper function to parse CSV content with better error handling and flexibility
const parseCSV = async content => {
  return new Promise((resolve, reject) => {
    const rows = [];
    const errors = [];
    let lineNumber = 0;
    let headers = [];
    
    // Clean and normalize the content
    const lines = content.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
      return resolve([]);
    }
    
    // Try to detect headers (first non-empty line)
    try {
      const firstLine = lines[0];
      headers = firstLine.split(',').map(h => h.trim().toLowerCase());
      console.log('Detected CSV headers:', headers);
      lineNumber = 1; // Skip header row
    } catch (error) {
      console.error('Error parsing CSV headers:', error);
      return reject(new Error('Invalid CSV format: Could not parse headers'));
    }
    
    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      lineNumber = i + 1;
      const line = lines[i];
      
      try {
        // Skip empty lines
        if (!line || line.trim() === '') continue;
        
        // Simple CSV parsing (handle quoted values)
        const values = [];
        let inQuotes = false;
        let currentValue = '';
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue.trim());
        
        // Create row object with headers as keys
        const row = {};
        headers.forEach((header, index) => {
          if (values[index] !== undefined) {
            row[header] = values[index];
          }
        });
        
        // Only add row if it has data
        if (Object.keys(row).length > 0) {
          rows.push(row);
        }
      } catch (error) {
        console.error(`Error parsing line ${lineNumber}:`, error);
        errors.push(`Line ${lineNumber}: ${error.message}`);
      }
    }
    
    if (errors.length > 0) {
      console.warn(`Encountered ${errors.length} errors while parsing CSV`);
      // Continue with partial results if we have any valid rows
      if (rows.length === 0) {
        return reject(new Error(`CSV parsing errors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...and ' + (errors.length - 5) + ' more' : ''}`));
      }
    }
    
    console.log(`Successfully parsed ${rows.length} rows from CSV`);
    if (rows.length > 0) {
      console.log('First parsed row sample:', JSON.stringify(rows[0], null, 2));
    }
    
    resolve(rows);
  });
};

// Helper function to validate records with more flexible type checking
const validateRecords = (records, validations) => {
  const validRecords = [];
  const invalidRecords = [];
  const validationFields = Object.keys(validations);
  
  console.log('=== START VALIDATION ===');
  console.log(`Validating ${records.length} records with fields:`, validationFields);
  console.log('Validation rules:', Object.entries(validations).map(([k, v]) => ({
    field: k,
    required: v.required || false,
    type: v.type,
    validate: !!v.validate
  })));

  for (const [index, record] of records.entries()) {
    console.log(`\n--- Validating record ${index + 1}/${records.length} ---`);
    console.log('Record keys:', Object.keys(record));
    
    if (!record || typeof record !== 'object' || Object.keys(record).length === 0) {
      console.log('❌ Record is empty or invalid');
      invalidRecords.push({ record, reason: 'Record is empty or invalid' });
      continue;
    }

    const errors = [];
    const validatedRecord = {};
    const recordKeys = Object.keys(record);
    
    // Log the record being validated for debugging
    if (index < 3) { // Only log first 3 records to avoid log spam
      console.log(`Validating record ${index + 1}:`, {
        keys: recordKeys,
        values: Object.entries(record).map(([k, v]) => [k, v, typeof v])
      });
    }

    // Check for required fields first
    for (const [field, validation] of Object.entries(validations)) {
      const value = record[field];
      const normalizedField = field.toLowerCase();
      const matchingKey = recordKeys.find(k => k.toLowerCase() === normalizedField);
      const actualValue = matchingKey ? record[matchingKey] : value;
      
      console.log(`\nValidating field: ${field}`);
      console.log(`  - Raw value: ${actualValue} (${typeof actualValue})`);
      console.log(`  - Validation rules:`, {
        required: validation.required || false,
        type: validation.type,
        validate: !!validation.validate
      });
      
      // Skip if field is not required and not present
      if (!validation.required) {
        if (actualValue === undefined || actualValue === null || actualValue === '') {
          console.log(`  - Field '${field}' is not required and not present, skipping`);
          continue;
        }
      }
      
      // Check required fields
      if (validation.required && (actualValue === undefined || actualValue === null || actualValue === '')) {
        const errorMsg = `'${field}' is required`;
        console.log(`  - ❌ ${errorMsg}`);
        errors.push(errorMsg);
        continue;
      }

      // Try to convert types if needed
      let processedValue = actualValue;
      try {
        console.log(`  - Type check: expected ${validation.type}, got ${typeof actualValue}`);
        
        if (validation.type === 'number' && typeof actualValue !== 'number') {
          console.log('  - Attempting to convert to number...');
          // Handle percentage strings (e.g., "85%" -> 0.85)
          if (typeof actualValue === 'string' && actualValue.endsWith('%')) {
            console.log(`  - Converting percentage string: ${actualValue}`);
            processedValue = parseFloat(actualValue) / 100;
          } else {
            processedValue = parseFloat(actualValue);
          }
          console.log(`  - Parsed number value: ${processedValue}`);
          if (isNaN(processedValue)) {
            console.log(`  - ❌ Failed to parse as number: ${actualValue}`);
            throw new Error('Not a number');
          }
        } else if (validation.type === 'date' && typeof actualValue === 'string') {
          console.log(`  - Parsing date: ${actualValue}`);
          processedValue = new Date(actualValue);
          console.log(`  - Parsed date: ${processedValue}`);
          if (isNaN(processedValue.getTime())) {
            console.log('  - ❌ Invalid date');
            throw new Error('Invalid date');
          }
        } else if (typeof actualValue !== validation.type) {
          console.log(`  - ❌ Type mismatch: expected ${validation.type}, got ${typeof actualValue}`);
          throw new Error(`Expected ${validation.type}, got ${typeof actualValue}`);
        } else {
          console.log('  - ✅ Type check passed');
        }
      } catch (e) {
        const errorMsg = `'${field}' must be a ${validation.type} (got: ${typeof actualValue} "${actualValue}")`;
        console.log(`  - ❌ ${errorMsg}`);
        errors.push(errorMsg);
        continue;
      }

      // Run custom validation if provided
      if (validation.validate) {
        try {
          console.log(`  - Running custom validation for '${field}'`);
          const isValid = validation.validate(processedValue);
          console.log(`  - Validation ${isValid ? '✅ passed' : '❌ failed'}`);
          
          if (!isValid) {
            const errorMsg = `'${field}' ${validation.error || 'is invalid'}`;
            console.log(`  - ❌ ${errorMsg}`);
            errors.push(errorMsg);
            continue;
          }
        } catch (e) {
          const errorMsg = `'${field}' validation failed: ${e.message}`;
          console.error(`  - ❌ ${errorMsg}`, e);
          errors.push(errorMsg);
          continue;
        }
      }

      validatedRecord[field] = processedValue;
    }

    // Only check for completely empty records if we have validation fields
    if (validationFields.length > 0 && Object.keys(validatedRecord).length === 0) {
      errors.push('No valid fields found in record');
    }

    // After all fields are processed, ensure missedPaymentsLast12 is preserved if present
    if (
      'missedPaymentsLast12' in record &&
      validatedRecord.missedPaymentsLast12 === undefined
    ) {
      validatedRecord.missedPaymentsLast12 = record.missedPaymentsLast12;
    }

    if (errors.length === 0) {
      validRecords.push(validatedRecord);
    } else {
      invalidRecords.push({
        record,
        reason: `Record ${index + 1} validation failed: ${errors.join('; ')}`,
        errors,
        recordSample: Object.entries(record).slice(0, 3).reduce((obj, [k, v]) => ({
          ...obj,
          [k]: `${v} (${typeof v})`
        }), {})
      });
    }
  }

  console.log(`Validation complete: ${validRecords.length} valid, ${invalidRecords.length} invalid`);
  if (invalidRecords.length > 0) {
    console.log('Sample validation errors:', invalidRecords.slice(0, 3));
  }

  return { validRecords, invalidRecords };
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
      const errorMsg = `User not found: ${phoneNumber || userId}. Make sure the user exists in the database.`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    console.log(`Found user: ${user.phoneNumber} (ID: ${user._id})`);
    
    // Process credit factors
    console.log('Processing credit factors for user:', user.phoneNumber);
    
    // Prepare credit factors with proper values
    let rawUtil = creditUtilization ?? record.utilization ?? record.creditUtilizationOverall ?? 0;
    let normalizedUtil = parseFloat(rawUtil);
    // Normalize utilization if needed
    if (normalizedUtil > 1) {
      // If both balance and creditLimit are present, use them
      const balance = parseFloat(record.balance ?? record.totalDebt ?? 0);
      const creditLimit = parseFloat(record.creditLimit ?? record.totalCredit ?? 0);
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
      paymentHistory: parseFloat(paymentHistory ?? record.onTimePaymentRate ?? 0),
      creditUtilization: {
        overall: normalizedUtil,
        byAccount: []
      },
      creditAge: parseFloat(creditAge ?? record.oldestAccountAge ?? record.accountAge ?? 0),
      creditMix: parseFloat(creditMix ?? record.mix ?? 0),
      inquiries: parseFloat(inquiries ?? record.recentLoanApplications ?? record.hardInquiries ?? 0),
      ...extraFields
    };

    console.log('Credit factors:', JSON.stringify(creditFactors, null, 2));
    
    // Log what is passed to calculateScore
    const scoreInput = {
      paymentHistory: typeof record.paymentHistory === 'number' ? record.paymentHistory : 0,
      creditUtilization: typeof record.creditUtilization === 'number' ? record.creditUtilization : (typeof record.creditUtilization?.overall === 'number' ? record.creditUtilization.overall : 0),
      creditAge: typeof record.creditAge === 'number' ? record.creditAge : 0,
      creditMix: typeof record.creditMix === 'number' ? record.creditMix : 0,
      inquiries: typeof record.inquiries === 'number' ? record.inquiries : 1,
      activeLoanCount: record.activeLoanCount ?? 0,
      monthlyIncome: record.monthlyIncome ?? 0,
      monthlyDebtPayments: typeof record.monthlyDebtPayments === 'number' ? record.monthlyDebtPayments : 0
    };
    console.log('Data passed to calculateScore:', JSON.stringify(scoreInput, null, 2));

    // Calculate score using imported function
    const score = calculateScore(scoreInput);
    console.log('Calculated score result:', score);

    // Map impact values to allowed enum
    const mapImpact = (impact) => {
      if (impact === 'high') return 'positive';
      if (impact === 'medium') return 'neutral';
      if (impact === 'low') return 'negative';
      return 'neutral';
    };

    // Helper function to get factor status
    const getFactorStatus = (value, goodThreshold = 0.7, fairThreshold = 0.4) => {
      if (value >= goodThreshold) return 'good';
      if (value >= fairThreshold) return 'fair';
      return 'needs_improvement';
    };

    // Prepare factors array with consistent structure
    const factors = [
      { 
        name: 'Payment History',
        value: creditFactors.paymentHistory,
        impact: 'high',
        status: getFactorStatus(creditFactors.paymentHistory, 0.9, 0.7)
      },
      {
        name: 'Credit Utilization',
        value: creditFactors.creditUtilization.overall,
        impact: 'high',
        status: getFactorStatus(creditFactors.creditUtilization.overall, 0.3, 0.5)
      },
      {
        name: 'Credit Age',
        value: creditFactors.creditAge,
        impact: 'medium',
        status: getFactorStatus(creditFactors.creditAge / 10, 0.5, 0.3)
      },
      {
        name: 'Credit Mix',
        value: creditFactors.creditMix,
        impact: 'medium',
        status: getFactorStatus(creditFactors.creditMix)
      },
      {
        name: 'Credit Inquiries',
        value: creditFactors.inquiries,
        impact: 'low',
        status: creditFactors.inquiries <= 2 ? 'good' : 
               creditFactors.inquiries <= 4 ? 'fair' : 'needs_improvement'
      }
    ];

    console.log('Creating credit score document...');
    
    // Validate user ID before creating credit score
    if (!user || !user._id) {
      throw new Error('Invalid user reference when creating credit score');
    }
    
    // Ensure user ID is properly converted to string
    const userIdStr = user._id.toString();
    console.log(`Creating credit score for user ID: ${userIdStr}`);
    
    // Prepare notes as an array of objects if notes exist in record
    const notes = record.notes ? [{
      content: record.notes,
      createdBy: uploader._id.toString()
    }] : [];

    // Map factor status to valid enum values
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

    // Build scoreData and userData for lending decision
    const scoreData = {
      score: score.score,
      classification: score.classification,
      breakdown: score.breakdown,
      version: score.version || 'v2.3',
      requiredDisclosures: score.requiredDisclosures || [],
      baseScore: score.baseScore || null
    };
    const userDecisionData = {
      monthlyIncome: record.monthlyIncome,
      totalDebt: record.totalDebt,
      paymentHistory: record.paymentHistory,
      creditUtilization: record.creditUtilization,
      creditAge: record.creditAge,
      creditMix: record.creditMix,
      inquiries: record.inquiries,
      activeLoanCount: record.activeLoanCount,
      onTimePaymentRate: record.onTimePaymentRate,
      onTimeRateLast6Months: record.onTimeRateLast6Months,
      loanTypeCounts: record.loanTypeCounts,
      missedPaymentsLast12: record.missedPaymentsLast12,
      recentLoanApplications: record.recentLoanApplications,
      defaultCountLast3Years: record.defaultCountLast3Years,
      consecutiveMissedPayments: record.consecutiveMissedPayments,
      recentDefaults: record.recentDefaults,
      monthsSinceLastDelinquency: record.monthsSinceLastDelinquency,
      employmentStatus: record.employmentStatus,
      collateralValue: record.collateralValue
    };
    // Evaluate lending decision with fallback
    let lendingDecision;
    try {
      lendingDecision = evaluateLendingDecision(scoreData, userDecisionData);
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
        user: userIdStr,
        score: score.score,
        classification: score.classification,
        baseScore: score.baseScore,
        breakdown: score.breakdown || {},
        method: aiEnabled ? 'AI' : 'manual',
        uploadedBy: uploader._id.toString(),
        uploadedAt: new Date(),
        notes: notes,
        factors: factors.map(factor => ({
          ...factor,
          impact: mapImpact(factor.impact),
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
      console.log('CreditScore created:', creditScore);
    } catch (err) {
      console.error('Error creating CreditScore:', err, { userId: userIdStr, score });
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
          ...(typeof record.monthlyIncome !== 'undefined' && { monthlyIncome: record.monthlyIncome }),
          ...(typeof record.totalDebt !== 'undefined' && { totalDebt: record.totalDebt }),
          ...(typeof record.monthlySavings !== 'undefined' && { monthlySavings: record.monthlySavings }),
          ...(typeof record.bankBalance !== 'undefined' && { bankBalance: record.bankBalance }),
          ...(typeof record.mobileMoneyBalance !== 'undefined' && { mobileMoneyBalance: record.mobileMoneyBalance }),
          ...(typeof record.totalCredit !== 'undefined' && { totalCredit: record.totalCredit }),
          ...(typeof record.openAccounts !== 'undefined' && { openAccounts: record.openAccounts }),
          ...(typeof record.creditMix !== 'undefined' && { creditMix: record.creditMix }),
          ...(typeof record.creditAge !== 'undefined' && { creditAge: record.creditAge }),
          ...(typeof record.paymentHistory !== 'undefined' && { paymentHistory: record.paymentHistory }),
          ...(typeof record.inquiries !== 'undefined' && { inquiries: record.inquiries }),
          ...(typeof record.employmentStatus !== 'undefined' && { employmentStatus: record.employmentStatus }),
          ...(typeof record.collateralValue !== 'undefined' && { collateralValue: record.collateralValue }),
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
    const userIdString = user._id.toString();
    await UserScore.findOneAndUpdate(
      { userId: userIdString },
      {
        $set: {
          score: numericScore,
          lastUpdated: new Date(),
          factors: factors.map(factor => ({
            name: factor.name,
            value: factor.value,
            status: factor.status,
            impact: factor.impact
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
          range: { min: 300, max: 850 }
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
      console.log('CreditReport upserted:', creditReportResult);
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

export { processRecord };

// All batch uploads must use /api/schema-mapping/apply/:mappingId

router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    await handleFileUpload(req, res, next);
    // Audit log: file upload
    if (req.user && req.file) {
      await SecurityLog.create({
        adminId: req.user.id,
        action: 'FILE_UPLOAD',
        targetUserId: req.body.userId || null,
        details: {
          fileName: req.file.originalname,
          uploadedAt: new Date()
        },
        timestamp: new Date()
      });
    }
  } catch (err) {
    next(err);
  }
});

// Add this at the very top of the batch upload handler
console.log('DEBUG: Entered batch upload handler');

// Mapping Profile Endpoints
router.post('/mapping-profiles', requireAdmin, async (req, res) => {
  try {
    const { name, partnerId, fieldsMapping } = req.body;
    const createdBy = req.user ? req.user._id : null;
    const profile = await MappingProfile.create({ name, partnerId, fieldsMapping, createdBy });
    res.status(201).json({ success: true, data: profile });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/mapping-profiles', requireAdmin, async (req, res) => {
  try {
    const { partnerId } = req.query;
    const query = partnerId ? { partnerId } : {};
    const profiles = await MappingProfile.find(query).sort({ updatedAt: -1 });
    res.json({ success: true, data: profiles });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/mapping-profiles/:id', requireAdmin, async (req, res) => {
  try {
    const profile = await MappingProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/mapping-profiles/:id', requireAdmin, async (req, res) => {
  try {
    const { name, fieldsMapping } = req.body;
    const profile = await MappingProfile.findByIdAndUpdate(
      req.params.id,
      { name, fieldsMapping, updatedAt: new Date() },
      { new: true }
    );
    if (!profile) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/mapping-profiles/:id', requireAdmin, async (req, res) => {
  try {
    const profile = await MappingProfile.findByIdAndDelete(req.params.id);
    if (!profile) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;