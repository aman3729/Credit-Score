import rateLimit from 'express-rate-limit';
import { logger } from '../config/logger.js';

// Rate limiting for different endpoints
export const createRateLimiters = () => {
  // General API rate limiter
  const generalLimiter = rateLimit({
    max: 300,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: {
      status: 'error',
      message: 'Too many requests from this IP, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        status: 'error',
        message: 'Too many requests from this IP, please try again later'
      });
    }
  });

  // Authentication rate limiter (stricter)
  const authLimiter = rateLimit({
    max: 20,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: {
      status: 'error',
      message: 'Too many login attempts, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        status: 'error',
        message: 'Too many login attempts, please try again later'
      });
    }
  });

  // Upload rate limiter
  const uploadLimiter = rateLimit({
    max: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: {
      status: 'error',
      message: 'Too many upload attempts, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  // Admin rate limiter
  const adminLimiter = rateLimit({
    max: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: {
      status: 'error',
      message: 'Too many admin requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  return {
    generalLimiter,
    authLimiter,
    uploadLimiter,
    adminLimiter
  };
};

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

// Request sanitization middleware
export const sanitizeRequest = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Remove potential script tags
        req.body[key] = req.body[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        // Remove potential SQL injection patterns
        req.body[key] = req.body[key].replace(/('|"|;|--|\/\*|\*\/|union|select|insert|update|delete|drop|create|alter)/gi, '');
      }
    });
  }

  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      }
    });
  }

  next();
};

// IP whitelist middleware (for admin routes)
export const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.length === 0 || allowedIPs.includes(clientIP)) {
      next();
    } else {
      logger.warn(`Blocked request from unauthorized IP: ${clientIP}`);
      res.status(403).json({
        status: 'error',
        message: 'Access denied from this IP address'
      });
    }
  };
};

// Request size limiter
export const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    return res.status(413).json({
      status: 'error',
      message: 'Request entity too large'
    });
  }

  next();
};

// Session timeout middleware
export const sessionTimeout = (timeoutMs = 30 * 60 * 1000) => {
  return (req, res, next) => {
    if (req.session && req.session.lastActivity) {
      const now = Date.now();
      const timeSinceLastActivity = now - req.session.lastActivity;

      if (timeSinceLastActivity > timeoutMs) {
        // Session expired
        req.session.destroy();
        return res.status(401).json({
          status: 'error',
          message: 'Session expired, please login again'
        });
      }
    }

    if (req.session) {
      req.session.lastActivity = Date.now();
    }

    next();
  };
}; 