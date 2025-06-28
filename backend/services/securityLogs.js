import SecurityLog from '../models/SecurityLog.js';
import { logToFile } from './fileLogger.js';

/**
 * Log a security event
 * @param {Object} param0 
 * @param {String} param0.userId - The ID of the user performing the action
 * @param {String} param0.action - The action being performed (e.g., 'USER_LOGIN', 'BATCH_UPLOAD')
 * @param {Object} param0.details - Additional details about the event
 * @param {String} param0.ipAddress - IP address of the user
 * @param {String} param0.userAgent - User agent string
 * @returns {Promise<Object>} The created security log
 */
export const logSecurityEvent = async ({
  userId,
  action,
  details,
  ipAddress,
  userAgent
}) => {
  try {
    const log = new SecurityLog({
      user: userId,
      action,
      details,
      ipAddress,
      userAgent,
      timestamp: new Date()
    });

    await log.save();
    
    // Also log to file for redundancy
    logToFile('security', {
      timestamp: new Date().toISOString(),
      userId,
      action,
      details,
      ipAddress,
      userAgent
    });

    return log;
  } catch (error) {
    console.error('Error logging security event:', error);
    // Even if logging fails, we don't want to break the application
    return null;
  }
};

/**
 * Get security logs with pagination
 * @param {Object} options - Query options
 * @param {String} options.userId - Filter by user ID
 * @param {String} options.action - Filter by action
 * @param {Date} options.startDate - Start date for filtering
 * @param {Date} options.endDate - End date for filtering
 * @param {Number} options.page - Page number (1-based)
 * @param {Number} options.limit - Number of logs per page
 * @returns {Promise<Object>} Paginated security logs
 */
export const getSecurityLogs = async ({
  userId,
  action,
  startDate,
  endDate,
  page = 1,
  limit = 50
} = {}) => {
  try {
    const query = {};
    
    if (userId) query.user = userId;
    if (action) query.action = action;
    
    // Date range filtering
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      SecurityLog.find(query)
        .populate('user', 'username email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SecurityLog.countDocuments(query)
    ]);
    
    return {
      logs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    };
  } catch (error) {
    console.error('Error fetching security logs:', error);
    throw error;
  }
};
