import rateLimit from 'express-rate-limit';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { securityLogger } from '../config/logger.js';
import { alertService } from '../services/alertService.js';

// Whitelist configuration
const WHITELISTED_IPS = new Set([
  '127.0.0.1',                    // localhost
  process.env.OFFICE_IP,          // office IP
  process.env.ADMIN_IP            // admin IP
].filter(Boolean)); // Remove undefined values

// Enhanced logging function
const logSecurityEvent = (type, data) => {
  const { severity = 'info', ...eventData } = data;
  securityLogger[severity](type, eventData);
};

// Store for tracking progressive delays
const progressiveDelayStore = new Map();

// Monitor suspicious patterns
const suspiciousActivityStore = new Map();

const monitorSuspiciousActivity = (ip, endpoint) => {
  // Skip monitoring for whitelisted IPs
  if (WHITELISTED_IPS.has(ip)) {
    return;
  }

  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  const activity = suspiciousActivityStore.get(key) || { count: 0, firstAttempt: now };
  
  activity.count += 1;
  
  // Alert on suspicious patterns
  if (activity.count > 10 && (now - activity.firstAttempt) < 5 * 60 * 1000) {
    logSecurityEvent('suspicious_activity', {
      ip,
      endpoint,
      attemptCount: activity.count,
      timeWindow: '5m',
      severity: 'warning'
    });
  }
  
  suspiciousActivityStore.set(key, activity);
  
  // Clear old entries every hour
  if (now % (60 * 60 * 1000) < 1000) {
    suspiciousActivityStore.clear();
  }
};

// Check if IP is whitelisted
const isWhitelisted = (ip) => WHITELISTED_IPS.has(ip);

// Basic rate limiter for all routes - Production optimized
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    // Different limits based on user role
    if (isWhitelisted(req.ip)) return 0; // No limit for whitelisted IPs
    
    // Higher limits for authenticated users
    if (req.user) {
      switch (req.user.role) {
        case 'admin':
          return 1000; // 1000 requests per 15 minutes for admins
        case 'lender':
          return 500;  // 500 requests per 15 minutes for lenders
        case 'premium':
          return 200;  // 200 requests per 15 minutes for premium users
        default:
          return 100;  // 100 requests per 15 minutes for regular users
      }
    }
    
    return 50; // 50 requests per 15 minutes for unauthenticated users
  },
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isWhitelisted(req.ip),
  handler: async (req, res) => {
    await alertService.trackRateLimit(req.ip, req.path);
    
    // Return more informative error message
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please wait before trying again.',
      retryAfter: Math.ceil(15 * 60 / 60), // Retry after 15 minutes
      userRole: req.user?.role || 'unauthenticated'
    });
  }
});

// Stricter rate limiter for authentication routes
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: (req) => isWhitelisted(req.ip) ? 0 : 5,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isWhitelisted(req.ip),
  handler: async (req, res) => {
    await alertService.trackFailedLogin(req.ip, req.body.username || 'unknown');
    logSecurityEvent('auth_limit_exceeded', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'error'
    });
    res.status(429).json({
      error: 'Too many login attempts. Please try again later.'
    });
  }
});

// Rate limiter for email verification with progressive delays
export const verificationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: (req) => isWhitelisted(req.ip) ? 0 : 8,
  skipFailedRequests: true,
  skip: (req) => isWhitelisted(req.ip),
  handler: async (req, res) => {
    const ip = req.ip;
    
    if (!isWhitelisted(ip)) {
      await alertService.trackRateLimit(ip, 'email-verification');
      
      const attempts = progressiveDelayStore.get(ip) || 0;
      const delay = Math.min(Math.pow(2, attempts) * 1000, 30 * 60 * 1000);
      const nextAttemptTime = new Date(Date.now() + delay);
      
      progressiveDelayStore.set(ip, attempts + 1);

      logSecurityEvent('verification_limit_exceeded', {
        ip,
        attempts,
        nextAttemptTime,
        severity: 'warning',
        userAgent: req.headers['user-agent']
      });
      
      res.status(429).json({
        error: 'Too many verification attempts',
        message: `Please wait ${Math.round(delay / 1000)} seconds before trying again`,
        nextAttemptTime: nextAttemptTime.toISOString()
      });
    }
  }
});

// Rate limiter for resending verification emails
export const resendVerificationLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: (req) => isWhitelisted(req.ip) ? 0 : 3,
  skip: (req) => isWhitelisted(req.ip),
  handler: async (req, res) => {
    const ip = req.ip;
    
    if (!isWhitelisted(ip)) {
      await alertService.trackRateLimit(ip, 'resend-verification');
      
      const nextValidRequest = new Date(Date.now() + 30 * 60 * 1000);
      
      logSecurityEvent('resend_limit_exceeded', {
        ip,
        nextValidRequest,
        severity: 'warning'
      });
      
      res.status(429).json({
        error: 'Too many verification email requests',
        message: 'Please wait 30 minutes before requesting another verification email.',
        nextValidRequest: nextValidRequest.toISOString()
      });
    }
  }
});

// Memory store for tracking failed login attempts
const loginLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60 * 60
});

// Middleware for tracking failed login attempts
export const loginAttemptLimiter = async (req, res, next) => {
  const ip = req.ip;
  
  if (isWhitelisted(ip)) {
    return next();
  }

  try {
    await loginLimiter.consume(ip);
    next();
  } catch (error) {
    await alertService.trackFailedLogin(ip, req.body.username || 'unknown');
    logSecurityEvent('login_attempts_exceeded', {
      ip,
      severity: 'error'
    });
    
    res.status(429).json({
      error: 'Too many failed login attempts. Please try again later.'
    });
  }
};

// Clear stores periodically
setInterval(() => {
  progressiveDelayStore.clear();
  logSecurityEvent('stores_cleared', {
    type: 'maintenance',
    severity: 'info'
  });
}, 24 * 60 * 60 * 1000);

// Rate limiter for dashboard endpoints - More lenient for authenticated users
export const dashboardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    if (isWhitelisted(req.ip)) return 0;
    
    // Higher limits for dashboard endpoints
    if (req.user) {
      switch (req.user.role) {
        case 'admin':
          return 2000; // 2000 requests per 15 minutes for admins
        case 'lender':
          return 1000; // 1000 requests per 15 minutes for lenders
        case 'premium':
          return 500;  // 500 requests per 15 minutes for premium users
        default:
          return 200;  // 200 requests per 15 minutes for regular users
      }
    }
    
    return 100; // 100 requests per 15 minutes for unauthenticated users
  },
  skip: (req) => isWhitelisted(req.ip),
  handler: async (req, res) => {
    await alertService.trackRateLimit(req.ip, req.path);
    res.status(429).json({
      error: 'Dashboard rate limit exceeded',
      message: 'Too many dashboard requests. Please wait before trying again.',
      retryAfter: Math.ceil(15 * 60 / 60),
      userRole: req.user?.role || 'unauthenticated'
    });
  }
});

export default {
  rateLimiter,
  authLimiter,
  loginAttemptLimiter,
  verificationLimiter,
  resendVerificationLimiter,
  dashboardLimiter
}; 