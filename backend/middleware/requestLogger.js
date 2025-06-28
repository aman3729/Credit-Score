import { logger } from '../config/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request logging middleware that logs detailed information about each request
 */
const requestLogger = (req, res, next) => {
  // Skip logging for health checks and static files
  if (req.path === '/health' || req.path.includes('.')) {
    return next();
  }

  const requestId = uuidv4();
  const start = Date.now();
  
  // Store the request ID for use in other middleware and controllers
  req.requestId = requestId;
  
  // Log the incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query: req.query,
    headers: {
      'content-type': req.get('content-type'),
      'user-agent': req.get('user-agent'),
      'x-forwarded-for': req.get('x-forwarded-for') || req.connection.remoteAddress
    },
    body: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
    timestamp: new Date().toISOString()
  });

  // Store the original response.end() function
  const originalEnd = res.end;
  
  // Override the response.end() function to log the response
  res.end = function (chunk, encoding) {
    const responseTime = Date.now() - start;
    
    // Log the response
    logger.info('Outgoing response', {
      requestId,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    });
    
    // Call the original response.end() function
    originalEnd.apply(res, arguments);
  };
  
  // Handle errors
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      logger.error('Request error', {
        requestId,
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        responseTime: `${Date.now() - start}ms`,
        error: res.locals.error || {},
        stack: res.locals.error?.stack
      });
    }
  });
  
  next();
};

export default requestLogger;
