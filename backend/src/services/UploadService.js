import { BaseService } from './BaseService.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { logger } from '../../config/logger.js';
import AppError from '../../utils/appError.js';
import { uploadSingle, uploadArray } from '../../middleware/upload.js';

/**
 * Upload service for handling file uploads and processing
 */
export class UploadService extends BaseService {
  constructor() {
    super(null); // No specific model for uploads
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDirectory();
  }

  /**
   * Ensure upload directory exists
   */
  ensureUploadDirectory() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Configure multer for file uploads
   * @param {Object} options - Upload options
   * @returns {multer.Multer} Configured multer instance
   */
  configureMulter(options = {}) {
    // DEPRECATED: Use middleware from '../../middleware/upload.js' instead of disk-based multer.
    // This function now returns wrappers that point to the hardened upload middleware.
    logger.warn('[UploadService] configureMulter is deprecated. Use uploadSingle/uploadArray from middleware/upload.js');
    return {
      single: (fieldName = 'file') => (
        // Return the hardened middleware array; Express accepts arrays in route definitions
        uploadSingle(fieldName)
      ),
      array: (fieldName = 'files', maxCount = 5) => (
        uploadArray(fieldName, maxCount)
      )
    };
  }

  /**
   * Process uploaded file
   * @param {Object} file - Uploaded file object
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processFile(file, options = {}) {
    try {
      logger.info('Processing uploaded file', {
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      });

      const filePath = file.path;
      const fileExtension = path.extname(file.originalname).toLowerCase();

      let result;

      switch (fileExtension) {
        case '.csv':
          result = await this.processCSV(filePath, options);
          break;
        case '.xlsx':
        case '.xls':
          result = await this.processExcel(filePath, options);
          break;
        case '.json':
          result = await this.processJSON(filePath, options);
          break;
        case '.txt':
          result = await this.processText(filePath, options);
          break;
        default:
          throw new AppError(`Unsupported file type: ${fileExtension}`, 400);
      }

      logger.info('File processed successfully', {
        filename: file.filename,
        recordsProcessed: result.records?.length || 0
      });

      return result;
    } catch (error) {
      logger.error('Failed to process file', {
        filename: file.filename,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Process CSV file
   * @param {string} filePath - File path
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processCSV(filePath, options = {}) {
    const csv = await import('csv-parser');
    const fs = await import('fs');

    return new Promise((resolve, reject) => {
      const results = [];
      
      fs.createReadStream(filePath)
        .pipe(csv.default())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          resolve({
            type: 'csv',
            records: results,
            count: results.length
          });
        })
        .on('error', (error) => {
          reject(new AppError(`CSV processing error: ${error.message}`, 400));
        });
    });
  }

  /**
   * Process Excel file
   * @param {string} filePath - File path
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processExcel(filePath, options = {}) {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    
    try {
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.getWorksheet(1);
      const results = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        
        const rowData = {};
        row.eachCell((cell, colNumber) => {
          const header = worksheet.getRow(1).getCell(colNumber).value;
          rowData[header] = cell.value;
        });
        
        if (Object.keys(rowData).length > 0) {
          results.push(rowData);
        }
      });

      return {
        type: 'excel',
        records: results,
        count: results.length
      };
    } catch (error) {
      throw new AppError(`Excel processing error: ${error.message}`, 400);
    }
  }

  /**
   * Process JSON file
   * @param {string} filePath - File path
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processJSON(filePath, options = {}) {
    const fs = await import('fs');
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);
      
      const records = Array.isArray(data) ? data : [data];
      
      return {
        type: 'json',
        records,
        count: records.length
      };
    } catch (error) {
      throw new AppError(`JSON processing error: ${error.message}`, 400);
    }
  }

  /**
   * Process text file
   * @param {string} filePath - File path
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processText(filePath, options = {}) {
    const fs = await import('fs');
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      const records = lines.map((line, index) => ({
        lineNumber: index + 1,
        content: line.trim()
      }));
      
      return {
        type: 'text',
        records,
        count: records.length,
        content
      };
    } catch (error) {
      throw new AppError(`Text processing error: ${error.message}`, 400);
    }
  }

  /**
   * Validate uploaded data
   * @param {Array} records - Data records
   * @param {Object} schema - Validation schema
   * @returns {Promise<Object>} Validation result
   */
  async validateData(records, schema) {
    try {
      const errors = [];
      const validRecords = [];

      records.forEach((record, index) => {
        const recordErrors = this.validateRecord(record, schema);
        if (recordErrors.length > 0) {
          errors.push({
            row: index + 1,
            errors: recordErrors,
            data: record
          });
        } else {
          validRecords.push(record);
        }
      });

      return {
        valid: validRecords,
        errors,
        totalRecords: records.length,
        validCount: validRecords.length,
        errorCount: errors.length
      };
    } catch (error) {
      logger.error('Data validation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate individual record
   * @param {Object} record - Data record
   * @param {Object} schema - Validation schema
   * @returns {Array} Validation errors
   */
  validateRecord(record, schema) {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = record[field];
      
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value !== undefined && value !== null && value !== '') {
        if (rules.type && typeof value !== rules.type) {
          errors.push(`${field} must be of type ${rules.type}`);
        }

        if (rules.min && value < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }

        if (rules.max && value > rules.max) {
          errors.push(`${field} must be at most ${rules.max}`);
        }

        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`${field} format is invalid`);
        }
      }
    }

    return errors;
  }

  /**
   * Clean up uploaded file
   * @param {string} filePath - File path to delete
   * @returns {Promise<void>}
   */
  async cleanupFile(filePath) {
    try {
      const fs = await import('fs');
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info('Uploaded file cleaned up', { filePath });
      }
    } catch (error) {
      logger.error('Failed to cleanup file', { filePath, error: error.message });
    }
  }

  /**
   * Get upload statistics
   * @returns {Promise<Object>} Upload statistics
   */
  async getUploadStats() {
    try {
      const fs = await import('fs');
      
      const stats = {
        totalFiles: 0,
        totalSize: 0,
        fileTypes: {}
      };

      const processDirectory = (dirPath) => {
        if (!fs.existsSync(dirPath)) return;

        const files = fs.readdirSync(dirPath);
        
        files.forEach(file => {
          const filePath = path.join(dirPath, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isFile()) {
            stats.totalFiles++;
            stats.totalSize += stat.size;
            
            const ext = path.extname(file).toLowerCase();
            stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
          }
        });
      };

      processDirectory(this.uploadDir);

      return stats;
    } catch (error) {
      logger.error('Failed to get upload stats', { error: error.message });
      throw error;
    }
  }
} 