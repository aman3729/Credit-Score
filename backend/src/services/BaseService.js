import { logger } from '../../config/logger.js';
import AppError from '../../utils/appError.js';

/**
 * Base service class providing common functionality
 */
export class BaseService {
  constructor(model) {
    this.model = model;
    this.serviceName = this.constructor.name;
  }

  /**
   * Create a new record
   * @param {Object} data - Data to create
   * @returns {Promise<Object>} Created record
   */
  async create(data) {
    try {
      logger.debug(`${this.serviceName}: Creating new record`, { data: this.sanitizeLogData(data) });
      
      const record = await this.model.create(data);
      
      logger.info(`${this.serviceName}: Record created successfully`, { 
        id: record._id,
        type: this.model.modelName 
      });
      
      return record;
    } catch (error) {
      logger.error(`${this.serviceName}: Failed to create record`, { 
        error: error.message,
        data: this.sanitizeLogData(data)
      });
      throw this.handleError(error);
    }
  }

  /**
   * Find record by ID
   * @param {string} id - Record ID
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Found record
   */
  async findById(id, options = {}) {
    try {
      logger.debug(`${this.serviceName}: Finding record by ID`, { id });
      
      const record = await this.model.findById(id, options.select, options);
      
      if (!record) {
        logger.warn(`${this.serviceName}: Record not found`, { id });
        return null;
      }
      
      logger.debug(`${this.serviceName}: Record found`, { id });
      return record;
    } catch (error) {
      logger.error(`${this.serviceName}: Failed to find record by ID`, { 
        id, 
        error: error.message 
      });
      throw this.handleError(error);
    }
  }

  /**
   * Find records with pagination
   * @param {Object} filter - Query filter
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated results
   */
  async findWithPagination(filter = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = { createdAt: -1 },
        select,
        populate
      } = options;

      const skip = (page - 1) * limit;
      
      logger.debug(`${this.serviceName}: Finding records with pagination`, { 
        filter: this.sanitizeLogData(filter),
        page,
        limit,
        skip
      });

      const [records, total] = await Promise.all([
        this.model
          .find(filter, select)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate(populate),
        this.model.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);
      
      logger.info(`${this.serviceName}: Records found`, { 
        count: records.length,
        total,
        page,
        totalPages
      });

      return {
        records,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error(`${this.serviceName}: Failed to find records with pagination`, { 
        error: error.message,
        filter: this.sanitizeLogData(filter)
      });
      throw this.handleError(error);
    }
  }

  /**
   * Update record by ID
   * @param {string} id - Record ID
   * @param {Object} data - Update data
   * @param {Object} options - Update options
   * @returns {Promise<Object|null>} Updated record
   */
  async updateById(id, data, options = {}) {
    try {
      logger.debug(`${this.serviceName}: Updating record`, { 
        id,
        data: this.sanitizeLogData(data)
      });

      const record = await this.model.findByIdAndUpdate(
        id,
        data,
        { 
          new: true, 
          runValidators: true,
          ...options 
        }
      );

      if (!record) {
        logger.warn(`${this.serviceName}: Record not found for update`, { id });
        return null;
      }

      logger.info(`${this.serviceName}: Record updated successfully`, { id });
      return record;
    } catch (error) {
      logger.error(`${this.serviceName}: Failed to update record`, { 
        id,
        error: error.message,
        data: this.sanitizeLogData(data)
      });
      throw this.handleError(error);
    }
  }

  /**
   * Delete record by ID
   * @param {string} id - Record ID
   * @param {Object} options - Delete options
   * @returns {Promise<Object|null>} Deleted record
   */
  async deleteById(id, options = {}) {
    try {
      logger.debug(`${this.serviceName}: Deleting record`, { id });

      const record = await this.model.findByIdAndDelete(id, options);

      if (!record) {
        logger.warn(`${this.serviceName}: Record not found for deletion`, { id });
        return null;
      }

      logger.info(`${this.serviceName}: Record deleted successfully`, { id });
      return record;
    } catch (error) {
      logger.error(`${this.serviceName}: Failed to delete record`, { 
        id,
        error: error.message 
      });
      throw this.handleError(error);
    }
  }

  /**
   * Find one record by filter
   * @param {Object} filter - Query filter
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Found record
   */
  async findOne(filter, options = {}) {
    try {
      logger.debug(`${this.serviceName}: Finding one record`, { 
        filter: this.sanitizeLogData(filter)
      });

      const record = await this.model.findOne(filter, options.select, options);

      if (!record) {
        logger.debug(`${this.serviceName}: Record not found`, { 
          filter: this.sanitizeLogData(filter)
        });
        return null;
      }

      return record;
    } catch (error) {
      logger.error(`${this.serviceName}: Failed to find one record`, { 
        error: error.message,
        filter: this.sanitizeLogData(filter)
      });
      throw this.handleError(error);
    }
  }

  /**
   * Find all records by filter
   * @param {Object} filter - Query filter
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Found records
   */
  async findAll(filter = {}, options = {}) {
    try {
      logger.debug(`${this.serviceName}: Finding all records`, { 
        filter: this.sanitizeLogData(filter)
      });

      const records = await this.model.find(filter, options.select, options);
      
      logger.debug(`${this.serviceName}: Found records`, { count: records.length });
      return records;
    } catch (error) {
      logger.error(`${this.serviceName}: Failed to find all records`, { 
        error: error.message,
        filter: this.sanitizeLogData(filter)
      });
      throw this.handleError(error);
    }
  }

  /**
   * Count records by filter
   * @param {Object} filter - Query filter
   * @returns {Promise<number>} Count of records
   */
  async count(filter = {}) {
    try {
      logger.debug(`${this.serviceName}: Counting records`, { 
        filter: this.sanitizeLogData(filter)
      });

      const count = await this.model.countDocuments(filter);
      
      logger.debug(`${this.serviceName}: Count result`, { count });
      return count;
    } catch (error) {
      logger.error(`${this.serviceName}: Failed to count records`, { 
        error: error.message,
        filter: this.sanitizeLogData(filter)
      });
      throw this.handleError(error);
    }
  }

  /**
   * Handle and transform errors
   * @param {Error} error - Original error
   * @returns {AppError} Transformed error
   */
  handleError(error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return new AppError(messages.join(', '), 400);
    }

    // Handle Mongoose duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return new AppError(`${field} already exists`, 400);
    }

    // Handle Mongoose cast errors
    if (error.name === 'CastError') {
      return new AppError('Invalid ID format', 400);
    }

    // Return original error if not handled
    return error;
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   */
  sanitizeLogData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    const sensitiveFields = [
      'password',
      'token',
      'refreshToken',
      'secret',
      'apiKey',
      'authorization',
      'creditCard',
      'ssn',
      'nationalId'
    ];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
} 