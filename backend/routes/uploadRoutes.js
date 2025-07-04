import express from 'express';
import multer from 'multer';
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
import upload from '../middleware/upload.js';
import { handleFileUpload } from '../controllers/uploadController.js';
import LoanDecision from '../models/LoanDecision.js';
import path from 'path';
import fs from 'fs';

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
  "phone number": {
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
    const { "phone number": phoneNumber, paymentHistory, creditUtilization, creditAge, creditMix, inquiries, userId, loanTypeCounts, missedPaymentsLast12, monthsSinceLastDelinquency, ...extraFields } = record;
    
    console.log('\n=== PROCESSING RECORD ===');
    console.log('Record data:', JSON.stringify(record, null, 2));
    
    // Find user by userId or phoneNumber
    let user;
    if (userId) {
      console.log(`Looking up user by ID: ${userId}`);
      user = await User.findById(userId);
    } else if (phoneNumber) {
      console.log(`Looking up user by phone: "${phoneNumber}"`);
      user = await User.findOne({ phoneNumber });
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
    const creditFactors = {
      paymentHistory: parseFloat(paymentHistory ?? record.onTimePaymentRate ?? 0),
      creditUtilization: {
        overall: parseFloat(creditUtilization ?? record.utilization ?? record.creditUtilizationOverall ?? 0),
        byAccount: []
      },
      creditAge: parseFloat(creditAge ?? record.oldestAccountAge ?? record.accountAge ?? 0),
      creditMix: parseFloat(creditMix ?? record.mix ?? 0),
      inquiries: parseFloat(inquiries ?? record.recentLoanApplications ?? record.hardInquiries ?? 0),
      ...extraFields
    };

    console.log('Credit factors:', JSON.stringify(creditFactors, null, 2));
    
    // --- FIX: Ensure lastActiveDate is a Date object ---
    let lastActiveDateValue = record.lastActiveDate;
    if (lastActiveDateValue && typeof lastActiveDateValue === 'string') {
      lastActiveDateValue = new Date(lastActiveDateValue);
      if (isNaN(lastActiveDateValue.getTime())) {
        lastActiveDateValue = new Date(); // fallback to now if invalid
      }
    } else if (!lastActiveDateValue) {
      lastActiveDateValue = new Date();
    }

    // --- FIX: Ensure loanTypeCounts is always extracted and passed correctly ---
    let loanTypeCountsValue = loanTypeCounts;
    if (!loanTypeCountsValue && extraFields.loanTypeCounts) {
      loanTypeCountsValue = extraFields.loanTypeCounts;
    }
    if (!loanTypeCountsValue || typeof loanTypeCountsValue !== 'object') {
      try {
        loanTypeCountsValue = loanTypeCountsValue ? JSON.parse(loanTypeCountsValue) : {};
      } catch {
        loanTypeCountsValue = {};
      }
    }
    console.log('loanTypeCounts in record:', JSON.stringify(record.loanTypeCounts));
    console.log('loanTypeCounts in extraFields:', JSON.stringify(extraFields.loanTypeCounts));
    console.log('loanTypeCountsValue used:', JSON.stringify(loanTypeCountsValue));

    // Log what is passed to calculateScore
    const scoreInput = {
      paymentHistory: creditFactors.paymentHistory,
      creditUtilization: creditFactors.creditUtilization.overall,
      creditAge: creditFactors.creditAge,
      creditMix: creditFactors.creditMix,
      inquiries: creditFactors.inquiries,
      totalDebt: record.totalDebt,
      recentMissedPayments: record.recentMissedPayments,
      recentDefaults: record.recentDefaults,
      lastActiveDate: lastActiveDateValue,
      activeLoanCount: record.activeLoanCount,
      oldestAccountAge: record.oldestAccountAge,
      transactionsLast90Days: record.transactionsLast90Days,
      onTimePaymentRate: record.onTimePaymentRate,
      recentLoanApplications: record.recentLoanApplications,
      defaultCountLast3Years: record.defaultCountLast3Years,
      consecutiveMissedPayments: record.consecutiveMissedPayments,
      loanTypeCounts: loanTypeCountsValue,
      missedPaymentsLast12:
        Number.isFinite(Number(record.missedPaymentsLast12))
          ? Number(record.missedPaymentsLast12)
          : Number.isFinite(Number(record.recentMissedPayments))
            ? Number(record.recentMissedPayments)
            : 0,
      onTimeRateLast6Months: Number.isFinite(Number(record.onTimeRateLast6Months)) ? Number(record.onTimeRateLast6Months) : 1,
      monthsSinceLastDelinquency: Number.isFinite(Number(record.monthsSinceLastDelinquency)) ? Number(record.monthsSinceLastDelinquency) : 999
    };
    console.log('Data passed to calculateScore:', JSON.stringify(scoreInput, null, 2));

    // Calculate score using imported function
    const score = calculateScore(scoreInput);

    console.log('Calculated score:', score);

    // Prepare userData for lending decision engine
    const userData = {
      recentDefaults: parseInt(record.recentDefaults ?? 0),
      consecutiveMissedPayments: parseInt(record.consecutiveMissedPayments ?? 0),
      missedPaymentsLast12: parseInt(record.missedPaymentsLast12 ?? 0),
      recentLoanApplications: parseInt(record.recentLoanApplications ?? 0),
      activeLoanCount: parseInt(record.activeLoanCount ?? 0),
      onTimeRateLast6Months: parseFloat(record.onTimeRateLast6Months ?? 1),
      monthsSinceLastDelinquency: parseInt(record.monthsSinceLastDelinquency ?? 999)
    };

    // Generate lending decision
    let lendingDecision;
    try {
      lendingDecision = evaluateLendingDecision(
        typeof score === 'object' ? score : { score },
        userData
      );
    } catch (err) {
      console.error('Error generating lending decision:', err);
      lendingDecision = {
        decision: 'Error',
        reasons: [err.message],
        recommendation: null,
        riskFlags: ['ENGINE_ERROR'],
        engineVersion: 'v101',
        evaluatedAt: new Date()
      };
    }

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

    // Create credit score document with lending decision
    const creditScore = await CreditScore.create({
      user: userIdStr,
      score: score.score, // Extract the numeric score
      classification: score.classification,
      baseScore: score.baseScore,
      breakdown: score.breakdown || {},
      method: aiEnabled ? 'AI' : 'manual',
      uploadedBy: uploader._id.toString(),
      uploadedAt: new Date(),
      notes: notes,
      factors: factors.map(factor => ({
        name: factor.name,
        value: factor.value,
        impact: factor.impact,
        status: mapStatus(factor.status),
        description: factor.description || ''
      })),
      lendingDecision: {
        decision: lendingDecision.decision,
        reasons: lendingDecision.reasons,
        recommendation: lendingDecision.recommendation,
        riskFlags: lendingDecision.riskFlags,
        engineVersion: lendingDecision.engineVersion,
        evaluatedAt: new Date()
      }
    });
    
    console.log(`Credit score ${creditScore._id} created for user ${userIdStr}`);

    console.log('Credit score created:', creditScore._id);

    // Update user's credit score and history
    const numericScore = typeof score === 'object' ? score.score : score; // Extract numeric score if score is an object
    try {
      console.log('Attempting to update user with new credit score:', {
        userId: user._id,
        creditScoreId: creditScore._id,
        creditScoreLastUpdated: new Date()
      });
      const updateResult = await User.findByIdAndUpdate(user._id, {
        creditScore: creditScore._id, // Store the CreditScore document ID
        creditScoreLastUpdated: new Date(),
        $push: {
          creditHistory: {
            score: numericScore,
            date: new Date(),
            factors: factors,
            notes: notes,
            breakdown: score?.breakdown || {},
            source: 'batch_upload'
          }
        }
      }, { new: true });
      if (!updateResult) {
        console.error('User update failed: No user found with _id', user._id);
      } else {
        console.log('User updated successfully:', updateResult._id, 'Updated user:', updateResult);
      }
    } catch (err) {
      console.error('Error updating user:', err, {
        userId: user._id,
        creditScoreId: creditScore._id
      });
    }

    // Update UserScore
    const userIdString = user._id.toString();
    await UserScore.findOneAndUpdate(
      { userId: userIdString },
      {
        $set: {
          score: numericScore, // Use the numeric score instead of the full score object
          lastUpdated: new Date(),
          factors: factors.map(factor => ({
            name: factor.name,
            value: factor.value,
            status: factor.status,
            impact: factor.impact
          })),
          // Add additional score details if needed
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

    // Update or create CreditReport for this user
    const creditUtilizationValue = factors.find(f => f.name === 'creditUtilization')?.value ?? record.creditUtilization ?? 0;
    const creditReportUpdate = {
      userId: user._id,
      creditScore: { fico: { score: score.score } },
      creditUtilization: { overall: creditUtilizationValue },
      creditAgeMonths: record.creditAge ?? 0,
      creditMix: record.creditMix ?? 0,
      totalDebt: record.totalDebt ?? 0,
      recentMissedPayments: record.recentMissedPayments ?? 0,
      recentDefaults: record.recentDefaults ?? 0,
      openAccounts: record.activeLoanCount ?? 0,
      lastActiveDate: record.lastActiveDate ? new Date(record.lastActiveDate) : undefined,
      paymentHistory: record.paymentHistory ?? 0,
      updatedAt: new Date(),
      lendingDecision: {
        decision: lendingDecision.decision,
        reasons: lendingDecision.reasons,
        recommendations: lendingDecision.recommendations,
        evaluatedAt: new Date()
      }
    };
    await CreditReport.findOneAndUpdate(
      { userId: user._id },
      {
        $set: creditReportUpdate,
        $push: {
          lendingDecisionHistory: {
            decision: lendingDecision.decision,
            reasons: lendingDecision.reasons,
            recommendations: lendingDecision.recommendations,
            evaluatedAt: new Date()
          }
        }
      },
      { upsert: true, new: true }
    );

    // --- NEW: Upsert LoanDecision for this user ---
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
    // --- Optionally, push into user's loan history ---
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
        score,
        creditScoreId: creditScore._id
      }
    };

  } catch (error) {
    console.error('Error processing record:', error);
    return {
      success: false,
      error: error.message,
      record: record
    };
  }
};

/**
 * @route   POST /api/upload/batch
 * @desc    Batch upload user credit data and calculate scores
 * @access  Private/Admin
 */
router.post('/batch', auth, requireAdmin, uploadMulter.single('file'), async (req, res) => {
  // Debug logging to diagnose upload issues
  console.log('DEBUG /batch:', {
    hasFile: !!req.file,
    fileType: req.file?.mimetype,
    fileName: req.file?.originalname,
    fileSize: req.file?.size,
    isJson: req.is('application/json'),
    bodyKeys: Object.keys(req.body)
  });
  // Accept both file upload and direct JSON
  let records = [];
  const uploader = req.user;
  const aiEnabled = req.body.aiEnabled === 'true' || req.body.aiEnabled === true;

  try {
    if (req.file && req.file.buffer) {
      console.log('DEBUG typeof req.file.buffer:', typeof req.file.buffer);
      console.log('DEBUG req.file.buffer:', req.file.buffer);
      const fileBuffer = req.file.buffer;
      const fileContent = fileBuffer.toString('utf8').trim();
      console.log('DEBUG fileContent:', fileContent.substring(0, 200));
      if (fileContent.startsWith('[') || fileContent.startsWith('{')) {
        const parsed = JSON.parse(fileContent);
        records = Array.isArray(parsed)
          ? parsed
          : parsed.batchData
            ? Array.isArray(parsed.batchData) ? parsed.batchData : [parsed.batchData]
            : [parsed];
      } else {
        records = await parseCSV(fileContent);
      }
    } else if (req.is('application/json')) {
      // --- Direct JSON upload path ---
      if (Array.isArray(req.body)) {
        records = req.body;
      } else if (Array.isArray(req.body.batchData)) {
        records = req.body.batchData;
      } else if (typeof req.body === 'object') {
        records = [req.body];
      } else {
        throw new Error('Invalid JSON format');
      }
    } else {
      return res.status(400).json({ error: 'No file uploaded and no valid JSON body' });
    }

    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('No valid records found in the upload');
    }

    // Normalize phone number field for all records
    records = records.map(record => {
      if (record['phone number'] && !record['phoneNumber']) {
        return { ...record, phoneNumber: record['phone number'] };
      }
      return record;
    });

    // Validate records
    const { validRecords, invalidRecords } = validateRecords(records, fieldValidations);
    if (invalidRecords.length > 0) {
      return res.status(400).json({ error: 'Invalid records found', invalidRecords });
    }

    // Process valid records
    const results = await pMap(validRecords, async record => {
      return processRecord(record, uploader, aiEnabled, req);
    }, { concurrency: 5 });

    // Filter out successful results
    const successfulResults = results.filter(result => result.success);
    if (successfulResults.length === 0) {
      throw new Error('No valid records processed');
    }

    return res.status(200).json({ message: 'Batch upload completed successfully', results: successfulResults });
  } catch (error) {
    console.error('Error processing batch upload:', error);
    return res.status(500).json({ error: 'Error processing batch upload' });
  }
});

router.post('/upload', upload.single('file'), handleFileUpload);

export default router;