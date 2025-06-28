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

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Field validation configuration
const fieldValidations = {
  email: {
    required: true,
    type: 'string',
    validate: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    error: 'must be a valid email address'
  },
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
    validate: value => value >= 0 && value <= 1,
    error: 'must be a number between 0 and 1 (e.g., 0.1 for 10%)'
  },
  totalDebt: {
    required: true,
    type: 'number',
    validate: value => value >= 0,
    error: 'must be a positive number'
  },
  totalCredit: {
    required: true,
    type: 'number',
    validate: value => value > 0,
    error: 'must be greater than 0'
  },
  monthlyIncome: {
    required: true,
    type: 'number',
    validate: value => value >= 0,
    error: 'must be a positive number'
  },
  recentMissedPayments: {
    required: true,
    type: 'number',
    validate: value => value >= 0,
    error: 'must be a non-negative integer'
  },
  recentDefaults: {
    required: true,
    type: 'number',
    validate: value => value >= 0,
    error: 'must be a non-negative integer'
  },
  lastActiveDate: {
    required: true,
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
  }
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
    const { email, paymentHistory, creditUtilization, creditAge, creditMix, inquiries, userId, ...extraFields } = record;
    
    console.log('\n=== PROCESSING RECORD ===');
    console.log('Record data:', JSON.stringify(record, null, 2));
    
    // Find user by userId or email
    let user;
    if (userId) {
      console.log(`Looking up user by ID: ${userId}`);
      user = await User.findById(userId);
    } else if (email) {
      // Normalize email: trim and convert to lowercase
      const normalizedEmail = email.toString().trim().toLowerCase();
      console.log(`Looking up user by email: "${email}" (normalized: "${normalizedEmail}")`);
      
      // First try direct match with the exact email
      user = await User.findOne({ email: normalizedEmail });
      
      // If not found, try case-insensitive search with regex
      if (!user) {
        console.log('Exact match not found, trying case-insensitive search...');
        user = await User.findOne({ 
          email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });
      }
      
      // If still not found, log all users for debugging
      if (!user) {
        console.log('User not found with case-insensitive search');
        const allUsers = await User.find({}, 'email').lean();
        console.log('Available users in database:');
        const userEmails = allUsers.map(u => `- "${u.email}"`).join('\n') || 'No users found';
        console.log(userEmails);
        
        // Try direct match with the exact email that exists in the database
        const exactMatch = allUsers.find(u => u.email === normalizedEmail);
        if (exactMatch) {
          console.log('Found exact match with direct comparison');
          user = exactMatch;
        }
      }
    }
    
    if (!user) {
      const errorMsg = `User not found: ${email || userId}. Make sure the user exists in the database.`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    console.log(`Found user: ${user.email} (ID: ${user._id})`);
    
    // Process credit factors
    console.log('Processing credit factors for user:', user.email);
    
    // Prepare credit factors with proper values
    const creditFactors = {
      paymentHistory: parseFloat(paymentHistory),
      creditUtilization: parseFloat(creditUtilization),
      creditAge: parseFloat(creditAge),
      creditMix: parseFloat(creditMix),
      inquiries: parseFloat(inquiries),
      ...extraFields
    };

    console.log('Credit factors:', JSON.stringify(creditFactors, null, 2));
    
    // Calculate score using imported function
    const score = calculateScore({
      paymentHistory: creditFactors.paymentHistory,
      creditUtilization: creditFactors.creditUtilization,
      creditAge: creditFactors.creditAge,
      creditMix: creditFactors.creditMix,
      inquiries: creditFactors.inquiries
    });

    console.log('Calculated score:', score);

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
        value: creditFactors.creditUtilization,
        impact: 'high',
        status: getFactorStatus(creditFactors.creditUtilization, 0.3, 0.5)
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

    // Create credit score document with proper structure
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
      }))
    });
    
    console.log(`Credit score ${creditScore._id} created for user ${userIdStr}`);

    console.log('Credit score created:', creditScore._id);

    // Update user's credit score and history
    const numericScore = typeof score === 'object' ? score.score : score; // Extract numeric score if score is an object
    await User.findByIdAndUpdate(user._id, {
      creditScore: numericScore,
      creditScoreLastUpdated: new Date(),
      $push: {
        creditHistory: {
          score: numericScore,
          date: new Date(),
          factors: factors,
          notes: notes,
          breakdown: score?.breakdown || {}
        }
      }
    });

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
          filename: req?.file?.originalname || 'unknown',
          uploader: uploader._id
        },
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers?.['user-agent'] || 'batch-upload'
      });
    } catch (logError) {
      console.error('Error logging security event:', logError);
      // Don't fail the whole operation if logging fails
    }

    return {
      success: true,
      record: {
        email: user.email,
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
router.post('/batch', auth, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) {
    console.error('No file was uploaded');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  if (!req.user?.id) {
    console.error('Unauthorized upload attempt - no user ID');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const uploader = req.user;
  console.log(`Starting batch upload by user: ${uploader._id} (${uploader.email})`);
  const aiEnabled = req.body.aiEnabled === 'true';
  console.log(`AI scoring is ${aiEnabled ? 'enabled' : 'disabled'}`);
  
  let records = [];
  let fileContent = '';

  try {
    // Log upload start
    console.log('\n===== STARTING FILE UPLOAD =====');
    console.log('Upload details:', {
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
      fields: req.body,
      user: req.user ? req.user.email : 'unknown'
    });
    
    // Parse file content
    const fileBuffer = req.file.buffer;
    fileContent = fileBuffer.toString('utf8').trim();
    
    console.log('\nFile content sample (first 200 chars):');
    console.log('----------------------------------------');
    console.log(fileContent.substring(0, 200) + (fileContent.length > 200 ? '...' : ''));
    console.log('----------------------------------------');
    
    // Log first few lines for CSV or first object for JSON
    if (fileContent.includes('\n')) {
      const lines = fileContent.split('\n').slice(0, 3);
      console.log('First 3 lines of file:', lines);
    }

    if (fileContent.startsWith('[') || fileContent.startsWith('{')) {
      console.log('Processing as JSON file');
      // JSON parsing
      const parsed = JSON.parse(fileContent);
      records = Array.isArray(parsed)
        ? parsed
        : parsed.batchData
          ? Array.isArray(parsed.batchData) ? parsed.batchData : [parsed.batchData]
          : [parsed];
    } else {
      console.log('Processing as CSV file');
      // CSV parsing
      records = await parseCSV(fileContent);
      console.log(`Parsed ${records.length} records from CSV`);
      if (records.length > 0) {
        console.log('First record sample:', JSON.stringify(records[0], null, 2));
      }
    }

    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('No valid records found in the file');
    }

    // Log sample of parsed records before validation
    console.log('Sample of parsed records before validation:', {
      count: records.length,
      firstRecord: records[0] ? {
        keys: Object.keys(records[0]),
        values: Object.entries(records[0]).map(([k, v]) => [k, v, typeof v])
      } : 'No records',
      fieldValidations: Object.keys(fieldValidations)
    });

    // Log all required fields for debugging
    console.log('Required fields:', Object.entries(fieldValidations)
      .filter(([_, v]) => v.required)
      .map(([k, _]) => k)
    );

    // Validate records
    console.log(`Validating ${records.length} records...`);
    const { validRecords, invalidRecords } = validateRecords(records, fieldValidations);
    
    console.log(`Validation results: ${validRecords.length} valid, ${invalidRecords.length} invalid`);
    
    if (invalidRecords.length > 0) {
      console.log('First 3 invalid records with errors:');
      invalidRecords.slice(0, 3).forEach((ir, idx) => {
        console.log(`\nInvalid Record ${idx + 1}:`);
        console.log('Data:', JSON.stringify(ir.record, null, 2));
        console.log('Reason:', ir.reason);
        if (ir.errors && ir.errors.length > 0) {
          console.log('Validation Errors:');
          ir.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
        }
        
        // Log missing required fields
        const missingFields = Object.keys(fieldValidations)
          .filter(field => fieldValidations[field].required && ir.record[field] === undefined);
          
        if (missingFields.length > 0) {
          console.log('Missing required fields:', missingFields);
        }
      });
      
      if (invalidRecords.length > 3) {
        console.log(`... and ${invalidRecords.length - 3} more invalid records`);
      }
    }
    if (validRecords.length === 0) {
      const errorMessage = invalidRecords.length > 0
        ? invalidRecords.map(ir => ir.reason).join('\n')
        : 'No valid records found';
        
      console.error('No valid records found. Details:', {
        totalRecords: records.length,
        invalidCount: invalidRecords.length,
        firstFewErrors: invalidRecords.slice(0, 3).map(ir => ({
          record: Object.keys(ir.record || {}),
          reason: ir.reason,
          errors: ir.errors
        }))
      });
        
      throw new Error(`No valid records found. First error: ${invalidRecords[0]?.reason || 'Unknown error'}`);
    }

    // Create upload history
    const uploadHistory = new UploadHistory({
      filename: req.file.originalname,
      uploadedBy: uploader._id,
      recordCount: validRecords.length,
      successCount: 0,
      errorCount: 0,
      aiEnabled,
      status: 'processing',
      metadata: {
        originalFilename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      }
    });
    await uploadHistory.save();

    // Log security event
    await logSecurityEvent({
      userId: uploader._id,
      action: 'BATCH_UPLOAD_START',
      details: {
        filename: req.file.originalname,
        recordCount: validRecords.length,
        uploadId: uploadHistory._id
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Process records
    const processedRecords = [];
    const failedRecords = [];
    console.log(`Starting to process ${validRecords.length} valid records...`);

    const processedResults = await pMap(validRecords, 
      record => processRecord(record, req.user, aiEnabled, req), 
      { concurrency: 5 }
    );

    console.log(`Processing complete: ${processedResults.length} records processed`);

    processedResults.forEach((result, index) => {
      if (result.success) {
        console.log(`Record ${index + 1} processed successfully:`, JSON.stringify(result, null, 2));
        processedRecords.push(result);
        uploadHistory.successCount++;
      } else {
        console.error(`Error processing record ${index + 1}:`, result.error);
        failedRecords.push({
          index,
          email: result.record?.email || 'unknown',
          error: result.error || 'Unknown error'
        });
        uploadHistory.errorCount++;
      }
    });

    // Finalize upload history
    uploadHistory.status = 'completed';
    uploadHistory.processedAt = new Date();
    await uploadHistory.save();

    // Log completion
    await logSecurityEvent({
      userId: uploader._id,  // Fixed: changed from uploader.userId to uploader._id
      action: 'BATCH_UPLOAD_COMPLETE',
      details: {
        uploadId: uploadHistory._id,
        successCount: processedRecords.length,
        errorCount: failedRecords.length
      }
    });

    return res.json({
      success: true,
      message: 'Batch upload completed',
      totalRecords: validRecords.length,
      successCount: processedRecords.length,
      errorCount: failedRecords.length,
      uploadId: uploadHistory._id
    });
  } catch (error) {
    console.error('===== BATCH UPLOAD ERROR =====');
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Error Name:', error.name);
    console.error('Request Body:', JSON.stringify(req.body, null, 2));
    console.error('File Info:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file uploaded');
    console.error('User:', req.user ? {
      _id: req.user._id,
      email: req.user.email,
      role: req.user.role
    } : 'No user authenticated');
    console.error('=============================');

    // Save error to upload history if possible
    if (req.user?._id && req.file) {
      try {
        const errorHistory = new UploadHistory({
          uploadedBy: req.user._id,
          filename: req.file.originalname,
          status: 'failed',
          errors: [{
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code
          }],
          metadata: {
            error: error.message,
            stack: error.stack,
            requestBody: req.body,
            fileInfo: {
              originalname: req.file.originalname,
              mimetype: req.file.mimetype,
              size: req.file.size
            }
          }
        });
        await errorHistory.save();
      } catch (saveError) {
        console.error('Failed to save upload history:', saveError);
      }
    }

    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('No valid') || error.name === 'ValidationError') {
      statusCode = 400;
    } else if (error.name === 'UnauthorizedError') {
      statusCode = 401;
    } else if (error.name === 'ForbiddenError') {
      statusCode = 403;
    } else if (error.name === 'NotFoundError') {
      statusCode = 404;
    }

    // Prepare error response
    const errorResponse = {
      success: false,
      error: error.message || 'An unexpected error occurred',
      message: error.message || 'An unexpected error occurred during file upload',
      errorType: error.name || 'ServerError',
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown',
    };

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
      errorResponse.details = {
        ...error,
        request: {
          method: req.method,
          url: req.originalUrl,
          headers: req.headers,
          body: req.body,
          file: req.file ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
          } : null
        }
      };
    }

    return res.status(statusCode).json(errorResponse);
  }
});

/**
 * @route   GET /api/upload
 * @desc    Get paginated list of uploads with optional sorting and filtering
 * @access  Private/Admin
 */
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Sorting
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    // Build query
    const query = {};
    
    // Optional filters
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.uploadedBy) {
      query.uploadedBy = req.query.uploadedBy;
    }
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    // Get total count for pagination
    const total = await UploadHistory.countDocuments(query);

    // Get paginated results
    const uploads = await UploadHistory.find(query)
      .populate('uploadedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    res.json({
      data: uploads,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        hasNextPage,
        hasPreviousPage,
        limit
      },
      sort: {
        by: sortBy,
        order: sortOrder === 1 ? 'asc' : 'desc'
      }
    });

  } catch (error) {
    console.error('Error fetching upload history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch upload history',
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/upload/history/:uploadId/report
 * @desc    Generate and download a report for a specific upload
 * @access  Private/Admin
 */
router.get('/history/:uploadId/report', auth, requireAdmin, async (req, res) => {
  try {
    const { uploadId } = req.params;
    const uploadHistory = await UploadHistory.findById(uploadId);
    
    if (!uploadHistory) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Upload Report');

    // Add headers
    worksheet.columns = [
      { header: 'Row', key: 'index', width: 10 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Score', key: 'score', width: 15 },
      { header: 'Message', key: 'message', width: 50 }
    ];

    // Add data (simplified for example)
    worksheet.addRow({
      index: 1,
      email: 'example@test.com',
      status: 'success',
      score: 750,
      message: 'Processed successfully'
    });

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=upload-report-${uploadId}.xlsx`
    );

    // Send workbook
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate report',
      message: error.message 
    });
  }
});

export default router;