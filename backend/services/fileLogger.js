import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOGS_DIR = path.join(__dirname, '../../logs');

// Ensure logs directory exists
const ensureLogsDir = async () => {
  try {
    await fs.mkdir(LOGS_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error('Error creating logs directory:', error);
    }
  }
};

// Initialize logs directory
ensureLogsDir().catch(console.error);

/**
 * Log a message to a file
 * @param {string} logType - Type of log (e.g., 'security', 'error', 'info')
 * @param {Object} data - Data to log
 */
export const logToFile = async (logType, data) => {
  try {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logFile = path.join(LOGS_DIR, `${logType}-${timestamp}.log`);
    const logEntry = `${new Date().toISOString()} - ${JSON.stringify(data)}\n`;
    
    await fs.appendFile(logFile, logEntry, 'utf8');
  } catch (error) {
    console.error('Error writing to log file:', error);
  }
};

// Middleware to log HTTP requests
export const requestLogger = async (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, body, query, params, user, headers } = req;
  
  // Skip logging for health checks
  if (originalUrl === '/health') return next();
  
  res.on('finish', async () => {
    const duration = Date.now() - start;
    const logData = {
      method,
      url: originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      user: user ? user._id : 'anonymous',
      userAgent: headers['user-agent'],
      ip: headers['x-forwarded-for'] || req.connection.remoteAddress
    };
    
    // Log request details
    await logToFile('requests', logData);
    
    // Log errors
    if (res.statusCode >= 400) {
      await logToFile('errors', {
        ...logData,
        request: { body, query, params },
        response: {
          statusMessage: res.statusMessage,
          headers: res.getHeaders()
        }
      });
    }
  });
  
  next();
};
