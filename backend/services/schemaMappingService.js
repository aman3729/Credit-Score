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
    required: true,
    description: 'Customer phone number',
    examples: ['phone', 'mobile', 'customer_phone', 'msisdn', 'contact_number'],
    valuePattern: 'phone'
  },
  paymentHistory: {
    type: 'number',
    required: true,
    description: 'Payment history score (0-1)',
    examples: ['payment_history', 'pay_hist', 'payment_score'],
    valuePattern: 'percentage'
  },
  creditUtilization: {
    type: 'number',
    required: true,
    description: 'Credit utilization ratio (0-1)',
    examples: ['utilization', 'credit_util', 'utilization_rate'],
    valuePattern: 'percentage'
  },
  creditAge: {
    type: 'number',
    required: true,
    description: 'Credit age in years',
    examples: ['credit_age', 'avg_age', 'account_age']
  },
  creditMix: {
    type: 'number',
    required: true,
    description: 'Credit mix diversity (0-1)',
    examples: ['credit_mix', 'mix_score', 'diversity_score'],
    valuePattern: 'percentage'
  },
  inquiries: {
    type: 'number',
    required: true,
    description: 'Number of recent inquiries',
    examples: ['inquiries', 'inquiry_count', 'hard_pulls']
  },
  totalDebt: {
    type: 'number',
    required: true,
    description: 'Total outstanding debt',
    examples: ['debt', 'total_balance', 'outstanding_amount']
  },
  recentMissedPayments: {
    type: 'number',
    required: false,
    description: 'Recent missed payments count',
    examples: ['missed', 'late', 'missed_payments']
  },
  recentDefaults: {
    type: 'number',
    required: false,
    description: 'Recent defaults count',
    examples: ['defaults', 'default_count', 'charge_offs']
  },
  lastActiveDate: {
    type: 'string',
    required: false,
    description: 'Last active date',
    examples: ['last_active', 'last_activity', 'last_transaction'],
    valuePattern: 'date'
  },
  activeLoanCount: {
    type: 'number',
    required: false,
    description: 'Number of active loans',
    examples: ['loan_count', 'active_loans', 'open_accounts']
  },
  oldestAccountAge: {
    type: 'number',
    required: false,
    description: 'Oldest account age in months',
    examples: ['account_age', 'oldest_account', 'credit_length']
  },
  transactionsLast90Days: {
    type: 'number',
    required: false,
    description: 'Transactions in last 90 days',
    examples: ['tx90', 'txn_last_90', 'recent_transactions']
  },
  onTimePaymentRate: {
    type: 'number',
    required: false,
    description: 'On-time payment rate (0-1)',
    examples: ['on_time_rate', 'payment_accuracy'],
    valuePattern: 'percentage'
  },
  onTimeRateLast6Months: {
    type: 'number',
    required: false,
    description: 'On-time rate last 6 months (0-1)',
    examples: ['on_time_6mo', 'recent_payment_rate'],
    valuePattern: 'percentage'
  },
  missedPaymentsLast12: {
    type: 'number',
    required: false,
    description: 'Missed payments in last 12 months',
    examples: ['missed12', 'missed_payments_12mo']
  },
  recentLoanApplications: {
    type: 'number',
    required: false,
    description: 'Recent loan applications',
    examples: ['apps', 'applications', 'recent_apps']
  },
  defaultCountLast3Years: {
    type: 'number',
    required: false,
    description: 'Defaults in last 3 years',
    examples: ['default_count', 'defaults_3y', 'charge_offs_3y']
  },
  consecutiveMissedPayments: {
    type: 'number',
    required: false,
    description: 'Consecutive missed payments',
    examples: ['missed_streak', 'consecutive_late']
  },
  monthsSinceLastDelinquency: {
    type: 'number',
    required: false,
    description: 'Months since last delinquency',
    examples: ['delinquency_recency', 'months_since_delinquent']
  },
  loanTypeCounts: {
    type: 'object',
    required: false,
    description: 'Loan type breakdown',
    examples: ['loan_breakdown', 'account_types']
  },
  monthlyIncome: {
    type: 'number',
    required: false,
    description: 'Monthly income of the user',
    examples: ['income', 'monthly_income', 'salary']
  },
  monthlyDebtPayments: {
    type: 'number',
    required: false,
    description: 'Monthly debt payments',
    examples: ['monthly_debt_payments', 'debt_payment']
  },
  notes: {
    type: 'string',
    required: false,
    description: 'Freeform notes about the user',
    examples: ['notes', 'comments', 'remarks']
  }
});

// Field detection patterns
const FIELD_PATTERNS = Object.freeze({
  phone: /(phone|mobile|msisdn|contact|number)/i,
  payment: /(payment|pay|on.?time)/i,
  utilization: /(util|usage|ratio)/i,
  age: /(age|length|years|months)/i,
  mix: /(mix|diversity|types)/i,
  inquiry: /(inquiry|pull|check)/i,
  debt: /(debt|balance|outstanding|total)/i,
  missed: /(missed|late|delinquent)/i,
  default: /(default|charge.?off)/i,
  active: /(active|last|recent)/i,
  loan: /(loan|account|credit)/i,
  transaction: /(transaction|txn)/i,
  rate: /(rate|percentage|ratio)/i,
  application: /(application|app)/i,
  consecutive: /(consecutive|streak)/i,
  delinquency: /(delinquency|delinquent)/i
});

// Value patterns for enhanced field detection
const VALUE_PATTERNS = Object.freeze({
  phone: /^((\+\d{1,3})?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})$/,
  percentage: /^(0(\.\d+)?|1(\.0+)?$)/,
  date: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3}Z?)?)?$/
});

export class SchemaMappingService {
  /**
   * Detect fields in uploaded data
   * @param {Object[]|Object} sampleData - Sample data for detection
   * @param {string} fileType - Type of uploaded file
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
    if (fieldName === config.examples[0]) {
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
        if (config.examples[0] === 'phone' && patternName === 'phone') {
          if (fieldName.toLowerCase().includes('phone') || fieldName.toLowerCase().includes('mobile')) {
            score += 0.8;
          }
        } else if (config.examples[0] !== 'phone') {
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
      
      // Validate field mappings
      for (const mapping of fieldMappings.values()) {
        if (mapping.sourceField && !VALID_FIELD_REGEX.test(mapping.sourceField)) {
          throw new Error(`Invalid source field: ${mapping.sourceField}`);
        }
        
        if (mapping.targetField && !VALID_FIELD_REGEX.test(mapping.targetField)) {
          throw new Error(`Invalid target field: ${mapping.targetField}`);
        }
        
        const sampleValue = mappingData.sampleData?.[mapping.sourceField];
        this.validateFieldMapping(mapping, sampleValue);
      }
      
      // Check required fields
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
        throw new Error(`Type mismatch for ${mapping.targetField}`);
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
      
      const { mappedData, errors } = mapping.applyMapping(sanitizedData);
      
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
        message: (e.errors || []).join('; ') 
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

  // Other utility methods (formatDate, formatNumber) remain unchanged

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

export default SchemaMappingService;