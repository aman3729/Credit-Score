import { logger } from '../config/logger.js';
import { randomUUID } from 'crypto';

/**
 * Request logging middleware
 * Logs all incoming requests with relevant metadata
 */
export const requestLogger = (req, res, next) => {
  // Attach or generate a request ID
  const reqId = req.get('X-Request-Id') || randomUUID();
  req.requestId = reqId;
  res.setHeader('X-Request-Id', reqId);

  const startTime = Date.now();
  
  // Capture original end method
  const originalEnd = res.end;
  
  // Override end method to capture response data
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    const contentLength = res.getHeader('Content-Length') || (chunk ? Buffer.byteLength(chunk) : 0);
    const isPreflight = req.method === 'OPTIONS';
    
    // Log request details
    const logData = {
      requestId: reqId,
      method: req.method,
      url: req.originalUrl,
      path: req.path,
      query: req.query,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      responseSize: typeof contentLength === 'number' ? `${contentLength}b` : String(contentLength),
      preflight: isPreflight || undefined,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id || 'anonymous',
      timestamp: new Date().toISOString()
    };

    // Add request body for non-GET requests (sanitized)
    if (req.method !== 'GET' && req.body) {
      logData.requestBody = sanitizeRequestBody(req.body);
    }

    // Log based on status code
    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', logData);
    } else {
      logger.info('Request completed successfully', logData);
    }

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Sanitize request body for logging
 * Removes sensitive information like passwords, tokens, etc.
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
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
