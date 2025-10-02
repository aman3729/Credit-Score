// Application.js
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

export class Application {
  constructor() {
    this.app = express();
    this.server = null;
    this.io = null;
  }

  initialize() {
    this.setupSecurity();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();

    logger.info('Application initialized successfully');
  }

  setupSecurity() {
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://storage.googleapis.com"],
            // ✅ allow your API + Netlify frontend
            connectSrc: [
              "'self'",
              "https://credit-score-production.up.railway.app",
              "https://mvoscore.netlify.app"
            ],
            frameAncestors: ["'none'"],
            objectSrc: ["'none'"],
          },
        },
        crossOriginResourcePolicy: { policy: "cross-origin" },
        xContentTypeOptions: true,
        xFrameOptions: { action: 'deny' },
        hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      })
    );

    // ✅ CORS fix
    const corsOptions = {
      origin: [
        "http://localhost:5177", // dev
        "https://mvoscore.netlify.app" // prod frontend
      ],
      credentials: true, // allow cookies
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
    };

    this.app.use(cors(corsOptions));
    this.app.options('*', cors(corsOptions));

    this.app.use(mongoSanitize());
    this.app.use(xss());
    this.app.use(hpp());

    this.app.use(
      timeout.handler({
        timeout: 10000,
        onTimeout: (req, res) => {
          logger.warn('Request timeout', {
            url: req.originalUrl,
            method: req.method,
            ip: req.ip,
          });
          res.status(503).json({
            status: 'error',
            message: 'Request timeout - please try again',
          });
        },
      })
    );
  }

  setupMiddleware() {
    this.app.use(compression());
    this.app.use(express.json({ limit: '100kb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '100kb' }));
    this.app.use(cookieParser());

    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    }

    this.app.use(requestLogger);

    this.app.use('/api', rateLimiter.general);
    this.app.use('/api/v1/auth', rateLimiter.auth);

    // ✅ CSRF config
    this.app.use(
      csrfProtection({
        cookie: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'None', // ✅ required for cross-origin cookies
        },
        ignorePaths: [
          '/api/v1/auth/login',
          '/api/v1/auth/register',
          '/api/v1/auth/verify',
          '/api/v1/auth/forgot-password',
          '/api/v1/auth/reset-password',
          '/api/v1/auth/refresh-token',
          '/api/v1/upload/public/mapping-profiles',
          '/api/v1/upload/public/mapping-profiles/*',
        ],
      })
    );

    this.app.get('/api/v1/csrf-token', getCSRFToken);
  }

  setupRoutes() {
    this.app.get('/api/v1/health', (req, res) => {
      res.status(200).json({
        status: 'success',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
      });
    });

    registerRoutes(this.app);

    this.app.use('*', (req, res) => {
      res.status(404).json({
        status: 'error',
        message: `Route ${req.originalUrl} not found`,
      });
    });
  }

  setupErrorHandling() {
    this.app.use(errorHandler);
  }

  async createServer() {
    const http = await import('http');
    this.server = http.createServer(this.app);
    this.io = initializeWebSocket(this.server);
    this.app.set('io', this.io);
    return this.server;
  }

  async start(port = process.env.PORT || 3000, host = '0.0.0.0') {
    try {
      await this.createServer();
      this.server.listen(port, host, () => {
        logger.info(
          `Server running on http://${host}:${port} [${process.env.NODE_ENV}]`
        );
      });
      return this.server;
    } catch (error) {
      logger.error('Failed to start server:', error);
      throw error;
    }
  }

  getApp() {
    return this.app;
  }
  getServer() {
    return this.server;
  }
  getIO() {
    return this.io;
  }
}

export default Application;
