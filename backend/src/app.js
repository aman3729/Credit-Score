import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import xss from 'xss-clean';
import morgan from 'morgan';
import timeout from 'express-timeout-handler';

import { logger } from '../config/logger.js';
import { errorHandler } from '../middleware/error.js';
import { requestLogger } from '../middleware/requestLogger.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { csrfProtection, getCSRFToken } from '../middleware/csrf.js';

import { registerRoutes } from './routes/index.js';
import { initializeWebSocket } from './websocket/index.js';

/**
 * Application factory that creates and configures the Express app
 */
export class Application {
  constructor() {
    this.app = express();
    this.server = null;
    this.io = null;
  }

  /**
   * Initialize all middleware and configurations
   */
  initialize() {
    this.setupSecurity();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    
    logger.info('Application initialized successfully');
  }

  /**
   * Configure security middleware
   */
  setupSecurity() {
    // Helmet for security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Disallow inline scripts for stronger XSS protection. If inline scripts are required,
          // switch to nonces or hashes and add them here accordingly.
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
          fontSrc: ["'self'", "fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "storage.googleapis.com"],
          connectSrc: ["'self'", "/api/v1"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
        }
      },
      xContentTypeOptions: true,
      xFrameOptions: { action: 'deny' },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    }));

    // CORS configuration
    const corsOptions = {
      origin: this.getCorsOrigins(),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 'Authorization', 'X-Requested-With', 
        'Accept', 'Origin', 'X-Auth-Token'
      ],
      exposedHeaders: [
        'Content-Range', 'X-Total-Count', 'Authorization',
        'Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials'
      ],
      optionsSuccessStatus: 200,
      preflightContinue: false,
      maxAge: 600
    };

    this.app.use(cors(corsOptions));
    this.app.options('*', cors(corsOptions));

    // Additional security middleware
    this.app.use(mongoSanitize());
    this.app.use(xss());
    this.app.use(hpp());

    // Request timeout (10 seconds)
    this.app.use(timeout.handler({
      timeout: 10000,
      onTimeout: (req, res) => {
        logger.warn('Request timeout', { 
          url: req.originalUrl,
          method: req.method,
          ip: req.ip 
        });
        res.status(503).json({ 
          status: 'error', 
          message: 'Request timeout - please try again' 
        });
      }
    }));
  }

  /**
   * Configure general middleware
   */
  setupMiddleware() {
    // Compression
    this.app.use(compression());
    
    // Body parsing with size limits
    this.app.use(express.json({ limit: '100kb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '100kb' }));
    this.app.use(express.text({ limit: '100kb' }));
    this.app.use(express.raw({ limit: '100kb' }));
    this.app.use(cookieParser());

    // Development logging
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    }

    // Request logging
    this.app.use(requestLogger);

    // Rate limiting
    this.app.use('/api', rateLimiter.general);
    this.app.use('/api/v1/auth', rateLimiter.auth);

    // CSRF protection
    this.app.use(csrfProtection({
      ignorePaths: [
        '/api/v1/auth/login',
        '/api/v1/auth/register',
        '/api/v1/auth/verify',
        '/api/v1/auth/forgot-password',
        '/api/v1/auth/reset-password',
        '/api/v1/auth/refresh-token',
        '/api/v1/upload/public/mapping-profiles',
        '/api/v1/upload/public/mapping-profiles/*'
      ]
    }));

    // CSRF token endpoint
    this.app.get('/api/v1/csrf-token', getCSRFToken);
  }

  /**
   * Register all application routes
   */
  setupRoutes() {
    // Health check
    this.app.get('/api/v1/health', (req, res) => {
      res.status(200).json({
        status: 'success',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // Register API routes
    registerRoutes(this.app);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ 
        status: 'error', 
        message: `Route ${req.originalUrl} not found` 
      });
    });
  }

  /**
   * Setup error handling middleware
   */
  setupErrorHandling() {
    this.app.use(errorHandler);
  }

  /**
   * Get CORS origins based on environment
   */
  getCorsOrigins() {
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:5177';
    }
    
    // In production, require specific origins
    const corsOrigins = process.env.CORS_ORIGINS;
    if (!corsOrigins) {
      const message = 'CORS_ORIGINS not set in production. Refusing to start with permissive CORS.';
      logger.error(message);
      throw new Error(message);
    }
    
    return corsOrigins.split(',').map(origin => origin.trim());
  }

  /**
   * Create HTTP/HTTPS server
   */
  async createServer() {
    const http = await import('http');
    const https = await import('https');
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    if (process.env.NODE_ENV === 'production' && !process.env.DISABLE_CUSTOM_SSL) {
      const sslDir = path.join(__dirname, '../ssl');
      const privateKeyPath = path.join(sslDir, 'private.key');
      
      // Check if SSL files exist before trying to use them
      if (fs.existsSync(privateKeyPath)) {
        const options = {
          key: fs.readFileSync(path.join(sslDir, 'private.key')),
          cert: fs.readFileSync(path.join(sslDir, 'certificate.crt')),
          ca: fs.readFileSync(path.join(sslDir, 'ca_bundle.crt')),
        };
        this.server = https.createServer(options, this.app);
        logger.info('HTTPS server created with custom SSL');
      } else {
        // Use HTTP server - Railway will handle SSL termination
        this.server = http.createServer(this.app);
        logger.info('HTTP server created (SSL handled by platform)');
      }
    } else {
      this.server = http.createServer(this.app);
      logger.info('HTTP server created');
    }

    // Initialize WebSocket
    this.io = initializeWebSocket(this.server);
    this.app.set('io', this.io);

    return this.server;
  }

  /**
   * Start the application
   */
  async start(port = process.env.PORT || 3000, host = process.env.HOST || '0.0.0.0') {
    try {
      await this.createServer();
      
      this.server.listen(port, host, () => {
        logger.info(`Server running in ${process.env.NODE_ENV} mode on ${process.env.NODE_ENV === 'production' ? 'HTTPS' : 'HTTP'}://${host}:${port}`);
        logger.info(`API Base URL: ${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://${host}:${port}/api/v1`);
      });

      return this.server;
    } catch (error) {
      logger.error('Failed to start server:', error);
      throw error;
    }
  }

  /**
   * Get the Express app instance
   */
  getApp() {
    return this.app;
  }

  /**
   * Get the server instance
   */
  getServer() {
    return this.server;
  }

  /**
   * Get the Socket.IO instance
   */
  getIO() {
    return this.io;
  }
}

export default Application; 