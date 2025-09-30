import rateLimit from 'express-rate-limit';
import { logger } from '../config/logger.js';

/**
 * Rate limiter configuration and instances
 */
export const rateLimiter = {
  /**
   * General rate limiter for all API endpoints
   */
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // Limit each IP to 300 requests per windowMs
    message: {
      status: 'error',
      message: 'Too many requests from this IP, please try again later',
      retryAfter: Math.ceil(15 * 60 / 60) // minutes
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({
        status: 'error',
        message: 'Too many requests from this IP, please try again later',
        retryAfter: Math.ceil(15 * 60 / 60)
      });
    }
  }),

  /**
   * Stricter rate limiter for authentication endpoints
   */
  auth: rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 requests per windowMs
    message: {
      status: 'error',
      message: 'Too many login attempts, please try again later',
      retryAfter: Math.ceil(15 * 60 / 60)
    },
  standardHeaders: true,
  legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Auth rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
    res.status(429).json({
        status: 'error',
        message: 'Too many login attempts, please try again later',
        retryAfter: Math.ceil(15 * 60 / 60)
      });
    }
  }),

  /**
   * Rate limiter for file uploads
   */
  upload: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 uploads per hour
    message: {
      status: 'error',
      message: 'Too many file uploads, please try again later',
      retryAfter: Math.ceil(60 / 60)
    },
  standardHeaders: true,
  legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Upload rate limit exceeded', {
      ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent')
    });
    res.status(429).json({
        status: 'error',
        message: 'Too many file uploads, please try again later',
        retryAfter: Math.ceil(60 / 60)
      });
    }
  }),

  /**
   * Rate limiter for admin endpoints
   */
  admin: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      status: 'error',
      message: 'Too many admin requests, please try again later',
      retryAfter: Math.ceil(15 * 60 / 60)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Admin rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({
        status: 'error',
        message: 'Too many admin requests, please try again later',
        retryAfter: Math.ceil(15 * 60 / 60)
      });
    }
  }),

  /**
   * Rate limiter for credit score calculations
   */
  scoring: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Limit each IP to 50 scoring requests per hour
    message: {
      status: 'error',
      message: 'Too many credit score calculations, please try again later',
      retryAfter: Math.ceil(60 / 60)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Scoring rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({
        status: 'error',
        message: 'Too many credit score calculations, please try again later',
        retryAfter: Math.ceil(60 / 60)
      });
    }
  })
};

/**
 * Create a custom rate limiter with specific configuration
 * @param {Object} options - Rate limiter options
 * @returns {Function} Rate limiter middleware
 */
export function createRateLimiter(options) {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      status: 'error',
      message: 'Rate limit exceeded, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
  };

  const config = { ...defaultOptions, ...options };

  return rateLimit({
    ...config,
    handler: (req, res) => {
      logger.warn('Custom rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
        limit: config.max,
        windowMs: config.windowMs
      });
      res.status(429).json(config.message);
    }
  });
} 