import SchemaMapping from '../models/SchemaMapping.js';
import { logSecurityEvent } from './securityLogs.js';
import User from '../models/User.js';
import CreditReport from '../models/CreditReport.js';
import UploadHistory from '../models/UploadHistory.js';
import mongoose from 'mongoose';

// Constants
export const SCHEMA_VERSION = '1.2';
const BATCH_SIZE = 1000;
const MAX_MEMORY_RESULTS = 10000;
const MIN_CONFIDENCE_THRESHOLD = 0.4;
const SUGGESTION_THRESHOLD = 0.2;
const VALID_FIELD_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;

// Internal schema definition
export const INTERNAL_SCHEMA_FIELDS = Object.freeze({
  phoneNumber: {
    type: 'string',
    required: false,
    description: 'User phone number',
    examples: ['phoneNumber', 'phone_number', 'mobile', 'mobileNumber'],
    valuePattern: 'phone'
  },
  employmentStatus: {
    type: 'string',
    required: false,
    description: 'Employment status of the user',
    examples: ['employmentStatus', 'employment_status', 'jobStatus', 'job_status'],
    valuePattern: null
  },
  paymentHistory: {
    type: 'number',
    required: false,
    description: 'Payment history ratio (0-1)',
    examples: ['paymentHistory', 'payment_history'],
    valuePattern: null
  },
  creditUtilization: {
    type: 'number',
    required: false,
    description: 'Credit utilization ratio (0-1)',
    examples: ['creditUtilization', 'credit_utilization'],
    valuePattern: null
  },
  creditAge: {
    type: 'number',
    required: false,
    description: 'Credit age in years',
    examples: ['creditAge', 'credit_age'],
    valuePattern: null
  },
  creditMix: {
    type: 'number',
    required: false,
    description: 'Credit mix ratio (0-1)',
    examples: ['creditMix', 'credit_mix'],
    valuePattern: null
  },
  inquiries: {
    type: 'number',
    required: false,
    description: 'Number of credit inquiries',
    examples: ['inquiries'],
    valuePattern: null
  },
  totalDebt: {
    type: 'number',
    required: false,
    description: 'Total debt amount',
    examples: ['totalDebt', 'total_debt'],
    valuePattern: null
  },
  activeLoanCount: {
    type: 'number',
    required: false,
    description: 'Number of active loans',
    examples: ['activeLoanCount', 'active_loan_count'],
    valuePattern: null
  },
  consecutiveMissedPayments: {
    type: 'number',
    required: false,
    description: 'Consecutive missed payments',
    examples: ['consecutiveMissedPayments', 'consecutive_missed_payments'],
    valuePattern: null
  },
  recentLoanApplications: {
    type: 'number',
    required: false,
    description: 'Recent loan applications',
    examples: ['recentLoanApplications', 'recent_loan_applications'],
    valuePattern: null
  },
  oldestAccountAge: {
    type: 'number',
    required: false,
    description: 'Oldest account age (months)',
    examples: ['oldestAccountAge', 'oldest_account_age'],
    valuePattern: null
  },
  transactionsLast90Days: {
    type: 'number',
    required: false,
    description: 'Transactions in last 90 days',
    examples: ['transactionsLast90Days', 'transactions_last_90_days'],
    valuePattern: null
  },
  onTimePaymentRate: {
    type: 'number',
    required: false,
    description: 'On-time payment rate',
    examples: ['onTimePaymentRate', 'on_time_payment_rate'],
    valuePattern: null
  },
  missedPaymentsLast12: {
    type: 'number',
    required: false,
    description: 'Missed payments in last 12 months',
    examples: ['missedPaymentsLast12', 'missed_payments_last_12'],
    valuePattern: null
  },
  onTimeRateLast6Months: {
    type: 'number',
    required: false,
    description: 'On-time payment rate in last 6 months',
    examples: ['onTimeRateLast6Months', 'on_time_rate_last_6_months'],
    valuePattern: null
  },
  monthsSinceLastDelinquency: {
    type: 'number',
    required: false,
    description: 'Months since last delinquency',
    examples: ['monthsSinceLastDelinquency', 'months_since_last_delinquency'],
    valuePattern: null
  },
  monthlyIncome: {
    type: 'number',
    required: false,
    description: 'Monthly income',
    examples: ['monthlyIncome', 'monthly_income'],
    valuePattern: null
  },
  monthlyDebtPayments: {
    type: 'number',
    required: false,
    description: 'Monthly debt payments',
    examples: ['monthlyDebtPayments', 'monthly_debt_payments'],
    valuePattern: null
  },
  monthlyExpenses: {
    type: 'number',
    required: false,
    description: 'Monthly non-debt expenses',
    examples: ['monthlyExpenses', 'monthly_expenses', 'expenses'],
    valuePattern: null
  },
  totalAccounts: {
    type: 'number',
    required: false,
    description: 'Total number of accounts',
    examples: ['totalAccounts', 'total_accounts'],
    valuePattern: null
  },
  lastActiveDate: {
    type: 'date',
    required: false,
    description: 'Date of last account activity',
    examples: ['lastActiveDate', 'last_active_date', 'lastActivityDate'],
    valuePattern: 'date'
  },
  defaultCountLast3Years: {
    type: 'number',
    required: false,
    description: 'Number of defaults in the last 3 years',
    examples: ['defaultCountLast3Years', 'defaultsLast3Years', 'defaults_3y'],
    valuePattern: null
  },
  loanTypeCounts: {
    type: 'object',
    required: false,
    description: 'Counts of different loan types (e.g., creditCard, personalLoan, etc.)',
    examples: ['loanTypeCounts', 'loan_type_counts'],
    valuePattern: null
  },
  collateralValue: {
    type: 'number',
    required: false,
    description: 'Value of collateral provided by the user',
    examples: ['collateralValue', 'collateral_value'],
    valuePattern: null
  },
  averageDailyBalance: {
    type: 'number',
    required: false,
    description: 'Average daily bank balance',
    examples: ['averageDailyBalance', 'average_daily_balance', 'avgDailyBalance', 'avg_daily_balance'],
    valuePattern: null
  },
  utilityPayments: {
    type: 'number',
    required: false,
    description: 'On-time utility payment rate (0–1)',
    examples: ['utilityPayments', 'utility_payments', 'onTimeUtilityPayments', 'on_time_utility_payments'],
    valuePattern: null
  },
  rentPayments: {
    type: 'number',
    required: false,
    description: 'On-time rent payment rate (0–1)',
    examples: ['rentPayments', 'rent_payments', 'onTimeRentPayments', 'on_time_rent_payments'],
    valuePattern: null
  },
  employmentStability: {
    type: 'string',
    required: false,
    description: 'Employment stability (stable, moderate, unstable)',
    examples: ['employmentStability', 'employment_stability', 'jobStability', 'job_stability'],
    valuePattern: null
  },
  budgetingConsistency: {
    type: 'number',
    required: false,
    description: 'Budgeting consistency score (0-100)',
    examples: ['budgetingConsistency', 'budgeting_consistency', 'budgetScore', 'budget_score'],
    valuePattern: null
  },
  savingsConsistencyScore: {
    type: 'number',
    required: false,
    description: 'Savings consistency score (0-100)',
    examples: ['savingsConsistencyScore', 'savings_consistency_score', 'savingsScore', 'savings_score'],
    valuePattern: null
  },
  hasFinancialCourse: {
    type: 'boolean',
    required: false,
    description: 'Has completed financial literacy course',
    examples: ['hasFinancialCourse', 'has_financial_course', 'completedFinancialCourse', 'completed_financial_course'],
    valuePattern: null
  },
  industryRisk: {
    type: 'string',
    required: false,
    description: "Industry risk level ('low', 'medium', 'high')",
    examples: ['industryRisk', 'industry_risk'],
    valuePattern: null
  },
  residenceStabilityMonths: {
    type: 'number',
    required: false,
    description: 'Months at current residence',
    examples: ['residenceStabilityMonths', 'residence_stability_months'],
    valuePattern: null
  },
  jobHopsInLast2Years: {
    type: 'number',
    required: false,
    description: 'Job changes in last 2 years',
    examples: ['jobHopsInLast2Years', 'job_hops_in_last_2_years'],
    valuePattern: null
  },
  bankruptcies: {
    type: 'number',
    required: false,
    description: 'Number of bankruptcies',
    examples: ['bankruptcies'],
    valuePattern: null
  },
  legalIssues: {
    type: 'number',
    required: false,
    description: 'Number of legal issues',
    examples: ['legalIssues', 'legal_issues'],
    valuePattern: null
  },
  collateralValue: {
    type: 'number',
    required: false,
    description: 'Collateral value (ETB)',
    examples: ['collateralValue', 'collateral_value'],
    valuePattern: null
  },
  collateralType: {
    type: 'string',
    required: false,
    description: "Collateral type ('realEstate', 'vehicle', 'securedDeposit', 'other')",
    examples: ['collateralType', 'collateral_type'],
    valuePattern: null
  },
  fileUpload: {
    type: 'object',
    required: false,
    description: 'File upload object (e.g., income verification PDF)',
    examples: ['fileUpload', 'file_upload'],
    valuePattern: null
  },
  currencyRate: {
    type: 'number',
    required: false,
    description: 'Currency rate (e.g., ETB to USD)',
    examples: ['currencyRate', 'currency_rate'],
    valuePattern: null
  }
});

// Field detection patterns
const FIELD_PATTERNS = Object.freeze({
  // ... (patterns remain unchanged)
});

// Value patterns for enhanced field detection
const VALUE_PATTERNS = Object.freeze({
  phone: /^((\+\d{1,3})?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})$/,
  percentage: /^(100(\.0+)?%?|\d{1,2}(\.\d+)?%?)$/, // Fixed regex to handle 0-100 percentages
  date: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3}Z?)?)?$/
});

export class SchemaMappingService {
  /**
   * Detect fields in uploaded data
   * @param {Object[]|Object} sampleData - Sample data for detection
   * @returns {Object} Detection results
   */
  static async detectFields(sampleData) {
    if (!sampleData || (Array.isArray(sampleData) && sampleData.length === 0)) {
      throw new Error('No sample data provided for field detection');
    }

    const sample = Array.isArray(sampleData) ? sampleData[0] : sampleData;
    const detectedFields = [];
    const suggestions = [];

    for (const [fieldName, fieldValue] of Object.entries(sample)) {
      const normalizedFieldName = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const match = this.findBestMatch(normalizedFieldName, fieldValue);
      
      if (match && match.confidence > MIN_CONFIDENCE_THRESHOLD) {
        detectedFields.push({
          sourceField: fieldName,
          targetField: match.targetField,
          confidence: match.confidence,
          transformation: match.transformation,
          isRequired: INTERNAL_SCHEMA_FIELDS[match.targetField]?.required || false,
          description: INTERNAL_SCHEMA_FIELDS[match.targetField]?.description,
          valuePattern: INTERNAL_SCHEMA_FIELDS[match.targetField]?.valuePattern,
          detectedType: this.detectFieldType(fieldValue),
          sampleValue: fieldValue
        });
      } else {
        const fieldSuggestions = this.suggestMappings(normalizedFieldName, fieldValue);
        if (fieldSuggestions.length > 0 && fieldSuggestions[0].confidence > SUGGESTION_THRESHOLD) {
          suggestions.push({
            sourceField: fieldName,
            suggestions: fieldSuggestions,
            fieldType: this.detectFieldType(fieldValue),
            valuePattern: this.detectValuePattern(fieldValue),
            sampleValue: fieldValue
          });
        }
      }
    }

    return {
      detectedFields,
      suggestions,
      totalFields: Object.keys(sample).length,
      mappedFields: detectedFields.length
    };
  }

  /**
   * Find best match for a field
   * @param {string} fieldName - Source field name
   * @param {*} fieldValue - Sample field value
   * @returns {Object|null} Best match information
   */
  static findBestMatch(fieldName, fieldValue) {
    let bestMatch = null;
    let bestScore = 0;

    for (const [targetField, config] of Object.entries(INTERNAL_SCHEMA_FIELDS)) {
      const score = this.calculateMatchScore(fieldName, fieldValue, config);
      
      if (score > bestScore && score > MIN_CONFIDENCE_THRESHOLD) {
        bestScore = score;
        bestMatch = {
          targetField,
          confidence: score,
          transformation: this.suggestTransformation(fieldValue, config.type)
        };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate match score between field and target
   * @param {string} fieldName - Source field name
   * @param {*} fieldValue - Sample field value
   * @param {Object} config - Target field configuration
   * @returns {number} Match confidence score
   */
  static calculateMatchScore(fieldName, fieldValue, config) {
    let score = 0;
    const normalizedFieldName = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Exact match checks
    if (config.examples.includes(fieldName)) { // Fixed: check all examples
      score += 1.0;
    }
    
    for (const example of config.examples) {
      const normalizedExample = example.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      if (normalizedFieldName === normalizedExample) {
        score += 1.0;
      }
      else if (normalizedFieldName.includes(normalizedExample) && normalizedExample.length > 3) {
        score += 0.7;
      }
    }
    
    // Pattern matching
    for (const [patternName, pattern] of Object.entries(FIELD_PATTERNS)) {
      if (pattern.test(fieldName)) {
        if (config.examples.some(ex => ex.includes('phone')) && patternName === 'phone') {
          if (fieldName.toLowerCase().includes('phone') || fieldName.toLowerCase().includes('mobile')) {
            score += 0.8;
          }
        } else {
          score += 0.5;
        }
      }
    }
    
    // Value pattern matching
    if (config.valuePattern) {
      const pattern = VALUE_PATTERNS[config.valuePattern];
      if (pattern && pattern.test(String(fieldValue))) {
        score += 0.4;
      }
    }
    
    // Type matching
    const fieldType = this.detectFieldType(fieldValue);
    if (fieldType === config.type) {
      score += 0.3;
    }
    
    return Math.max(0, Math.min(score, 1.0));
  }

  /**
   * Detect JavaScript type of a value
   * @param {*} value - Value to check
   * @returns {string} Detected type
   */
  static detectFieldType(value) {
    if (value === null || value === undefined) return 'unknown';
    if (Array.isArray(value)) return 'array'; // Added array detection
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'string') {
      if (this.isISODate(value) || this.isCommonDate(value)) return 'date';
      if (this.isNumericString(value)) return 'number';
      return 'string';
    }
    return 'unknown';
  }

  /**
   * Create a new schema mapping
   * @param {Object} mappingData - Mapping configuration
   * @param {string} userId - User ID creating the mapping
   * @returns {Object} Created mapping document
   */
  static async createMapping(mappingData, userId) {
    try {
      mappingData.schemaVersion = SCHEMA_VERSION;
      
      // Convert fieldMappings to Map if needed
      let fieldMappings = mappingData.fieldMappings;
      if (!(fieldMappings instanceof Map)) {
        if (typeof fieldMappings === 'object' && fieldMappings !== null) {
          fieldMappings = new Map(Object.entries(fieldMappings));
        } else {
          throw new Error('fieldMappings must be a Map or plain object');
        }
      }
      
      // Validate field names
      for (const fieldName of fieldMappings.keys()) {
        if (!VALID_FIELD_REGEX.test(fieldName)) {
          throw new Error(`Invalid field name: ${fieldName}`);
        }
      }
      
      // Get engine type from mapping data (default to 'default' if not specified)
      const engineType = mappingData.engineType || 'default';
      
      // Validate each field mapping
      for (const [targetField, mapping] of fieldMappings) {
        this.validateFieldMapping(mapping, mapping.sampleValue);
      }
      
      // Only validate required fields for the default engine
      if (engineType === 'default') {
        const requiredFields = Object.keys(INTERNAL_SCHEMA_FIELDS).filter(
          field => INTERNAL_SCHEMA_FIELDS[field].required
        );
        const mappedRequiredFields = requiredFields.filter(field => 
          Array.from(fieldMappings.values()).some(m => m.targetField === field)
        );
        if (mappedRequiredFields.length < requiredFields.length) {
          const missing = requiredFields.filter(field => !mappedRequiredFields.includes(field));
          throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
      } else {
        // Skip required fields validation for all non-default engines
        console.log(`Skipping required fields validation for engineType: ${engineType}`);
      }

      const mapping = new SchemaMapping({
        ...mappingData,
        fieldMappings,
        createdBy: userId
      });

      await mapping.save();
      
      await logSecurityEvent({
        userId,
        action: 'schema_mapping_created',
        details: {
          mappingId: mapping._id,
          fieldCount: fieldMappings.size,
          schemaVersion: SCHEMA_VERSION
        }
      });

      return mapping;
    } catch (error) {
      throw new Error(`Mapping creation failed: ${error.message}`);
    }
  }

  /**
   * Validate field mapping configuration
   * @param {Object} mapping - Field mapping object
   * @param {*} sampleValue - Sample value for type validation
   */
  static validateFieldMapping(mapping, sampleValue = null) {
    const target = INTERNAL_SCHEMA_FIELDS[mapping.targetField];
    if (!target) {
      throw new Error(`Invalid target field: ${mapping.targetField}`);
    }
    
    if (sampleValue !== null) {
      const sourceType = this.detectFieldType(sampleValue);
      if (!this.areTypesCompatible(sourceType, target.type)) {
        throw new Error(`Type mismatch for ${mapping.targetField}. Source: ${sourceType}, Target: ${target.type}`);
      }
    }
    
    if (mapping.transformation && mapping.transformation !== 'none') {
      const validTransformations = [
        'trim', 'to_lower', 'to_upper', 'parse_date', 
        'parse_number', 'sanitize', 'phone_format', 
        'date_format', 'number_format'
      ];
      if (!validTransformations.includes(mapping.transformation)) {
        throw new Error(`Invalid transformation: ${mapping.transformation}`);
      }
    }
    
    if (target.required && !mapping.isRequired) {
      throw new Error(`Required field not mapped: ${mapping.targetField}`);
    }
  }

  /**
   * Apply mapping to dataset
   * @param {Object[]} data - Input data
   * @param {string} mappingId - Schema mapping ID
   * @param {string} partnerId - Partner ID
   * @param {Object} options - Processing options
   * @returns {Object} Processing results
   */
  static async applyMappingToData(data, mappingId, partnerId, options = {}) {
    return this._processData(data, mappingId, partnerId, {
      ...options,
      streamProcessing: false
    });
  }

  /**
   * Apply mapping to large dataset with streaming
   * @param {Object[]} data - Input data
   * @param {string} mappingId - Schema mapping ID
   * @param {string} partnerId - Partner ID
   * @param {Object} options - Processing options
   * @returns {Object} Processing results
   */
  static async applyMappingToDataStream(data, mappingId, partnerId, options = {}) {
    return this._processData(data, mappingId, partnerId, {
      ...options,
      streamProcessing: true,
      batchSize: options.batchSize || BATCH_SIZE,
      maxMemoryResults: options.maxMemoryResults || MAX_MEMORY_RESULTS
    });
  }

  /**
   * Internal data processing method
   * @private
   */
  static async _processData(data, mappingId, partnerId, options = {}) {
    try {
      const mapping = await SchemaMapping.findById(mappingId);
      if (!mapping) throw new Error('Schema mapping not found');
      if (mapping.partnerId !== partnerId) throw new Error('Unauthorized mapping access');

      const results = [];
      const errors = [];
      let successCount = 0;
      const batchSize = options.batchSize || BATCH_SIZE;
      const maxMemoryResults = options.maxMemoryResults || MAX_MEMORY_RESULTS;
      const streamProcessing = options.streamProcessing || false;

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map((row, index) => this._processRow(row, i + index, mapping))
        );

        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            const rowResult = result.value;
            if (rowResult.success) {
              if (!streamProcessing || results.length < maxMemoryResults) {
                results.push({ ...rowResult.data });
              }
              successCount++;
            } else {
              errors.push({
                row: rowResult.row,
                errors: rowResult.errors || [rowResult.error],
                originalData: rowResult.originalData
              });
            }
          } else {
            errors.push({
              row: i + 1,
              errors: [result.reason?.message || 'Unknown error'],
              originalData: null
            });
          }
        }
        }

      // Update mapping usage stats
      mapping.usageCount += 1;
      mapping.lastUsed = new Date();
      mapping.successRate = successCount / data.length;
      await mapping.save();

      // Create upload history
      await this._createUploadHistory(
        options.filename || 'batch-upload',
        options.uploadedBy,
        data.length,
        successCount,
        errors.length,
        errors
      );
      
      return {
        mappedData: results,
        errors,
        successCount,
        errorCount: errors.length,
        successRate: successCount / data.length,
        totalProcessed: data.length,
        performance: {
          batchSize,
          batchesProcessed: Math.ceil(data.length / batchSize),
          streamProcessing,
          ...(streamProcessing && {
            memoryOptimized: true,
            resultsInMemory: results.length,
            maxMemoryResults
          })
        }
      };
    } catch (error) {
      throw new Error(`Data processing failed: ${error.message}`);
    }
  }

  /**
   * Process a single data row
   * @private
   */
  static async _processRow(row, rowNum, mapping) {
    console.log(`[SCHEMA_MAPPING] _processRow called for rowNum: ${rowNum}, phoneNumber: ${row.phoneNumber || row.userId || 'N/A'}`);
    try {
      const sanitizedData = {};
      for (const [key, value] of Object.entries(row)) {
        sanitizedData[key] = this.sanitizeValue(value);
      }
      
      // Apply mapping transformations
      const mappedData = {};
      const errors = [];
      const fieldMappings = mapping.fieldMappings instanceof Map 
        ? Object.fromEntries(mapping.fieldMappings) 
        : mapping.fieldMappings;

      for (const [sourceField, mappingConfig] of Object.entries(fieldMappings)) {
        if (!(sourceField in sanitizedData)) {
          if (mappingConfig.isRequired) {
            errors.push(`Missing required field: ${sourceField}`);
          }
          continue;
        }

        let value = sanitizedData[sourceField];
        const targetField = mappingConfig.targetField;
        
        // Apply transformation
        try {
          value = this.applyTransformation(value, mappingConfig.transformation);
        } catch (error) {
          errors.push(`Transformation failed for ${sourceField}: ${error.message}`);
        }

        // Validate value pattern
        const internalConfig = INTERNAL_SCHEMA_FIELDS[targetField];
        if (internalConfig?.valuePattern) {
          const pattern = VALUE_PATTERNS[internalConfig.valuePattern];
          if (pattern && !pattern.test(String(value))) {
            errors.push(`Value for ${targetField} does not match pattern ${internalConfig.valuePattern}`);
          }
        }

        mappedData[targetField] = value;
      }
      
      return errors.length === 0 
        ? { success: true, data: mappedData, row: rowNum + 1 }
        : { 
            success: false, 
            row: rowNum + 1, 
            errors, 
            originalData: row 
          };
    } catch (error) {
      return {
        success: false,
        row: rowNum + 1,
        error: error.message,
        originalData: row
      };
    }
  }

  /**
   * Apply transformation to a value
   * @param {*} value - Input value
   * @param {string} transformation - Transformation type
   * @returns {*} Transformed value
   */
  static applyTransformation(value, transformation) {
    if (!transformation || transformation === 'none') return value;
    
    switch (transformation) {
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      case 'to_lower':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'to_upper':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'parse_date':
        return this.parseDate(value);
      case 'parse_number':
        return this.parseNumber(value);
      case 'sanitize':
        return this.sanitizeValue(value);
      case 'phone_format':
        return this.formatPhoneNumber(value);
      case 'date_format':
        return this.formatDate(value);
      case 'number_format':
        return this.formatNumber(value);
      default:
        return value;
    }
  }

  /**
   * Parse date from various formats
   * @param {*} value - Input value
   * @returns {Date|string} Parsed date or original value
   */
  static parseDate(value) {
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      if (!isNaN(parsed)) return new Date(parsed);
    }
    return value;
  }

  /**
   * Format date to ISO string
   * @param {*} value - Input value
   * @returns {string} Formatted date
   */
  static formatDate(value) {
    const date = this.parseDate(value);
    return date instanceof Date ? date.toISOString() : value;
  }

  /**
   * Parse number from string
   * @param {*} value - Input value
   * @returns {number} Parsed number
   */
  static parseNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.-]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? value : num;
    }
    return value;
  }

  /**
   * Format number to fixed decimal
   * @param {*} value - Input value
   * @returns {number|string} Formatted number
   */
  static formatNumber(value) {
    const num = this.parseNumber(value);
    return typeof num === 'number' ? Number(num.toFixed(2)) : value;
  }

  /**
   * Create upload history record
   * @private
   */
  static async _createUploadHistory(filename, uploadedBy, recordCount, successCount, errorCount, errors) {
    if (!uploadedBy) throw new Error('uploadedBy is required');
    
    const uploadedByObjId = typeof uploadedBy === 'string' 
      ? new mongoose.Types.ObjectId(uploadedBy) 
      : uploadedBy;

    await UploadHistory.create({
      filename,
      uploadedBy: uploadedByObjId,
      recordCount,
      successCount,
      errorCount,
      status: errorCount === 0 ? 'completed' : 'partial',
      errorList: errors.map(e => ({ 
        row: e.row, 
        message: Array.isArray(e.errors) 
          ? e.errors.join('; ') 
          : e.errors || e.error || 'Unknown error'
      })),
      uploadedAt: new Date(),
      completedAt: new Date()
    });
  }

  // ----------------------
  // UTILITY METHODS
  // ----------------------
  
  static isISODate(str) {
    return !isNaN(Date.parse(str)) && /^\d{4}-\d{2}-\d{2}/.test(str);
  }

  static isCommonDate(str) {
    return /(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})|(\d{4}[\/-]\d{1,2}[\/-]\d{1,2})/.test(str);
  }

  static isNumericString(str) {
    return !isNaN(str) && !isNaN(parseFloat(str));
  }

  static detectValuePattern(value) {
    if (value == null) return null;
    const strVal = String(value);
    
    if (VALUE_PATTERNS.phone.test(strVal)) return 'phone';
    if (VALUE_PATTERNS.percentage.test(strVal)) return 'percentage';
    if (VALUE_PATTERNS.date.test(strVal) || this.isISODate(strVal) || this.isCommonDate(strVal)) return 'date';
    
    return null;
  }

  static suggestMappings(fieldName, fieldValue) {
    const suggestions = [];
    const fieldType = this.detectFieldType(fieldValue);
    const valuePattern = this.detectValuePattern(fieldValue);
    
    for (const [targetField, config] of Object.entries(INTERNAL_SCHEMA_FIELDS)) {
      const typeCompatible = this.areTypesCompatible(fieldType, config.type);
      const patternCompatible = !valuePattern || !config.valuePattern || valuePattern === config.valuePattern;
      
      if (typeCompatible && patternCompatible) {
        const confidence = this.calculateMatchScore(fieldName, fieldValue, config);
        if (confidence > 0.1) {
          suggestions.push({
            targetField,
            confidence,
            description: config.description,
            valuePattern: config.valuePattern,
            isRequired: config.required
          });
        }
      }
    }
    
    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  static areTypesCompatible(sourceType, targetType) {
    if (sourceType === targetType) return true;
    if (targetType === 'string') return true;
    if (targetType === 'number' && ['number', 'string'].includes(sourceType)) return true;
    if (targetType === 'date' && ['date', 'string'].includes(sourceType)) return true;
    if (targetType === 'object' && sourceType === 'object') return true;
    return false;
  }

  static suggestTransformation(value, targetType) {
    const currentType = this.detectFieldType(value);
    if (currentType === targetType) return 'none';
    
    if (targetType === 'string') {
      if (currentType === 'number') return 'number_format';
      if (currentType === 'date') return 'date_format';
      return 'trim';
    }
    
    if (targetType === 'number') {
      return currentType === 'string' && this.isNumericString(value) 
        ? 'parse_number' 
        : 'none';
    }
    
    if (targetType === 'date') {
      return currentType === 'string' && 
        (this.isISODate(value) || this.isCommonDate(value)) 
          ? 'parse_date' 
          : 'none';
    }
    
    return 'none';
  }

  static sanitizeValue(value) {
    return typeof value === 'string' 
      ? value.replace(/[<>"'`;]/g, '') 
      : value;
  }

  static formatPhoneNumber(value) {
    if (typeof value !== 'string') return value;
    const cleaned = value.replace(/\D/g, '');
    
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    
    return cleaned.length >= 9 && cleaned.length <= 15 ? cleaned : value;
  }

  /**
   * Get all schema mappings for a partner
   * @param {string} partnerId - Partner ID
   * @returns {Array} List of schema mappings
   */
  static async getPartnerMappings(partnerId) {
    try {
      return await SchemaMapping.find({ partnerId });
    } catch (error) {
      throw new Error(`Failed to get partner mappings: ${error.message}`);
    }
  }
}

export function mapToCreditworthinessSchema(rawData) {
  return {
    monthlyIncome: Number(rawData.monthlyIncome) || 0,
    monthlyDebtPayments: Number(rawData.monthlyDebtPayments) || 0,
    monthlyExpenses: Number(rawData.monthlyExpenses) || 0,
    averageDailyBalance: Number(rawData.averageDailyBalance) || 0,
    utilityPayments: Number(rawData.utilityPayments) || 0,
    rentPayments: Number(rawData.rentPayments) || 0,
    employmentStability: rawData.employmentStability || 'unstable',
    jobTenureMonths: Number(rawData.jobTenureMonths) || 0,
    financialLiteracyScore: typeof rawData.financialLiteracyScore === 'number' ? rawData.financialLiteracyScore : (rawData.hasFinancialCourse ? 80 : 60),
    industryRisk: rawData.industryRisk || 'high',
    loanPurpose: rawData.loanPurpose || 'productive',
    savingsConsistencyScore: typeof rawData.savingsConsistencyScore === 'number' ? rawData.savingsConsistencyScore : (rawData.budgetingConsistency || 0),
    cashFlowStability: Number(rawData.cashFlowStability) || 60,
    downPayment: Number(rawData.downPayment) || 0,
    collateralValue: Number(rawData.collateralValue) || 0,
    collateralLiquidity: rawData.collateralLiquidity || 'medium',
    collateralType: rawData.collateralType || 'other',
    interestRate: Number(rawData.interestRate) || 0.18,
    loanTermMonths: Number(rawData.loanTermMonths) || 12,
    macroRiskLevel: rawData.macroRiskLevel || 'medium',
    sectorRisk: rawData.sectorRisk || 'medium',
    bankruptcies: Number(rawData.bankruptcies) || 0,
    legalIssues: Number(rawData.legalIssues) || 0,
    residenceStabilityMonths: Number(rawData.residenceStabilityMonths) || 0,
    jobHopsInLast2Years: Number(rawData.jobHopsInLast2Years) || 0,
    behavioralRedFlags: Array.isArray(rawData.behavioralRedFlags) ? rawData.behavioralRedFlags : [],
    paymentHistory: Array.isArray(rawData.paymentHistory) ? rawData.paymentHistory : [],
    utilizationRate: Number(rawData.utilizationRate) || 0.3
  };
}

export default SchemaMappingService;