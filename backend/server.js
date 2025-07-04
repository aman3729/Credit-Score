import dotenv from 'dotenv';
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
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, closeDB } from './config/db.js';
import { logger } from './config/logger.js';
import { initAdmin } from './scripts/init-admin.js';
import User from './models/User.js';

// Configure environment variables FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
console.log('DEBUG: MONGODB_URI from process.env:', process.env.MONGODB_URI);
console.log('DEBUG: Current working directory:', process.cwd());
console.log('DEBUG: .env file path:', path.join(__dirname, '.env'));

// Initialize express app and server
const app = express();
const server = http.createServer(app);

// Constants
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const API_PREFIX = '/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
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
const corsOptions = {
  origin: NODE_ENV === 'development' ? '*' : process.env.CORS_ORIGINS?.split(',') || '*',
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
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

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
  let token;
  
  if (req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Authorization token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const admin = (req, res, next) => {
  if (req.user?.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin privileges required' });
  }
};

// Credit Data Endpoint
app.get(`${API_PREFIX}/users/:identifier/credit-data`, protect, async (req, res) => {
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
      return res.status(404).json({ 
        status: 'fail',
        message: 'User not found',
        identifier
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({ 
        status: 'fail',
        message: 'Unauthorized access'
      });
    }

    // Find credit scores for the user
    const creditScores = await CreditScore.find({ user: user._id })
      .sort({ reportDate: -1 })
      .limit(12);

    if (creditScores.length === 0) {
      return res.status(404).json({ 
        message: 'No credit data available',
        user: { _id: user._id, name: user.name, email: user.email },
        creditScores: [],
        factors: []
      });
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
    res.status(500).json({ 
      message: 'Server error',
      error: NODE_ENV === 'development' ? error.message : undefined
    });
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
  res.status(404).json({ status: 'fail', message: `Route ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    ...(NODE_ENV === 'development' && { error: err.message })
  });
});

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

// Start the server
startServer();

export { app, server };