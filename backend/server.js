console.log('SERVER STARTED');
import './loadEnv.js';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import xss from 'xss-clean';
import morgan from 'morgan';
import { createTerminus } from '@godaddy/terminus';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import lenderRoutes from './routes/lender.js';
import { connectDB, closeDB } from './config/db.js';
import { logger } from './config/logger.js';
import { initAdmin } from './scripts/init-admin.js';
import User from './models/User.js';
import csurf from 'csurf';
import AppError from './utils/appError.js';
import { errorHandler } from './middleware/error.js';

// Initialize express app and server
const app = express();
const server = http.createServer(app);

// Constants
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const API_PREFIX = '/api/v1';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in environment variables');
}
const NODE_ENV = process.env.NODE_ENV || 'development';

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Initialize Socket.IO with corrected CORS
const io = new Server(server, {
  cors: {
    origin: NODE_ENV === 'development' ? '*' : process.env.CORS_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/socket.io/'
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// CORS Configuration
// IMPORTANT: In production, lock down CORS to only trusted origins via CORS_ORIGINS env variable
const allowedDevOrigin = 'http://localhost:5177'; // <-- Vite dev server
const corsOptions = {
  origin: NODE_ENV === 'development' ? allowedDevOrigin : process.env.CORS_ORIGINS?.split(',') || '*',
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

// Security Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  console.log('Global cookies:', req.cookies);
  next();
});
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// CSRF protection middleware (cookie-based)
const csrfProtection = csurf({
  cookie: {
    httpOnly: false, // Must be readable by frontend JS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
});

// Add CSRF protection to all state-changing routes
app.use(csrfProtection);

// Endpoint to get CSRF token
app.get('/api/v1/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Rate Limiting
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// Logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Request logging middleware
const requestLogger = (req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
};
app.use(requestLogger);

// Make io available in routes
app.set('io', io);

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/userRoutes.js';
import usersRoutes from './routes/users.js';
import uploadRoutes from './routes/uploadRoutes.js';
import adminRoutes from './routes/admin.js';
import debugRoutes from './routes/debugRoutes.js';
import uploadHistoryRoutes from './routes/uploadHistoryRoutes.js';
import schemaMappingRoutes from './routes/schemaMappingRoutes.js';
import CreditScore from './models/CreditScore.js';

// Mount routes
app.use(`${API_PREFIX}/users`, usersRoutes);
app.use(`${API_PREFIX}/user`, userRoutes);
app.use(`${API_PREFIX}/upload`, uploadRoutes);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/debug`, debugRoutes);
app.use(`${API_PREFIX}/upload-history`, uploadHistoryRoutes);
app.use(`${API_PREFIX}/lenders`, lenderRoutes);
app.use(`${API_PREFIX}/schema-mapping`, schemaMappingRoutes);

// Basic routes
app.get('/', (req, res) => {
  res.send('Credit Score Dashboard API is running');
});

app.get(`${API_PREFIX}/health`, (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Middleware for protected routes
const protect = async (req, res, next) => {
  console.log('Protect middleware cookies:', req.cookies); // Debug log
  console.log('Checking for jwt:', req.cookies.jwt); // Debug log
  let token;
  
  if (req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Authorization token required', 401));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return next(new AppError('User not found', 401));
    }
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    next(new AppError('Invalid or expired token', 401));
  }
};

const admin = (req, res, next) => {
  if (req.user?.role === 'admin') {
    next();
  } else {
    next(new AppError('Admin privileges required', 403));
  }
};

// Credit Data Endpoint
app.get(`${API_PREFIX}/users/:identifier/credit-data`, protect, async (req, res, next) => {
  try {
    const { identifier } = req.params;
    
    // Find user by ID, email, or username
    let user;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      user = await User.findById(identifier);
    } else {
      user = await User.findOne({
        $or: [
          { email: identifier },
          { username: identifier }
        ]
      });
    }

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Check authorization
    if (req.user.role !== 'admin' && req.user._id.toString() !== user._id.toString()) {
      return next(new AppError('Unauthorized access', 403));
    }

    // Find credit scores for the user
    const creditScores = await CreditScore.find({ user: user._id })
      .sort({ reportDate: -1 })
      .limit(12);

    if (creditScores.length === 0) {
      return next(new AppError('No credit data available', 404));
    }

    // Prepare response
    const response = {
      user: { 
        _id: user._id, 
        name: user.name, 
        email: user.email 
      },
      currentScore: creditScores[0].score,
      creditScores: creditScores.map(score => ({
        id: score._id,
        score: score.score,
        date: score.reportDate.toISOString(),
        factors: score.factors
      })),
      factors: creditScores[0].factors,
      lastUpdated: creditScores[0].updatedAt,
      reportDate: creditScores[0].reportDate.toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Credit data error:', error);
    next(new AppError('Server error', 500));
  }
});

// Simple admin user check
const ensureAdminUser = async () => {
  try {
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      logger.info(`Admin user ${existingAdmin.email} exists`);
      return;
    }
    logger.info('No admin user found, but continuing...');
  } catch (error) {
    logger.error('Error checking admin user:', error);
  }
};

/**
 * Starts the server with MongoDB Atlas connection
 */
const startServer = async () => {
  try {
    logger.info('Starting server initialization...');
    
    // Connect to MongoDB using the simplified connectDB function
    await connectDB();
    logger.info('MongoDB connected successfully');
    
    // Ensure admin user exists
    await ensureAdminUser();
    
    // Start HTTP server
    server.listen(PORT, HOST, () => {
      logger.info(`Server running in ${NODE_ENV} mode on http://${HOST}:${PORT}`);
      logger.info(`API Base URL: http://${HOST}:${PORT}${API_PREFIX}`);
    });
    
  } catch (error) {
    logger.error('Server startup failed:', error);
    process.exit(1);
  }
};

// Error Handling
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: `Route ${req.originalUrl} not found` });
});

// NOTE: This project uses both session-based and JWT-based authentication. Document which routes use which method and ensure all sensitive routes are protected by the correct middleware.
app.use(errorHandler);

// Graceful Shutdown
createTerminus(server, {
  signals: ['SIGINT', 'SIGTERM'],
  onSignal: async () => {
    logger.info('Server shutting down');
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  },
  onShutdown: () => logger.info('Cleanup complete'),
  logger: (msg, err) => logger.error(msg, err)
});

// Start the server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// SECURITY: Add npm audit to your CI/CD pipeline to catch vulnerable dependencies.

export default app;