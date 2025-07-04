// Debug: Verify file is being executed
console.log('🚀 index.js is starting...');

// Load environment variables first
import 'dotenv/config';
import './config/env.js';

// Core dependencies
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';

// Configurations
import { sessionConfig } from './config/auth.js';
import { connectDB } from './config/db.js';

// Routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import securityRoutes from './routes/security.js';
import paymentRoutes from './routes/payment.js';
import creditScoreRoutes from './routes/creditScore.js';
import lenderRoutes from './routes/lender.js';
import uploadRoutes from './routes/uploadRoutes.js';
import userRoutes from './routes/userRoutes.js';

// Middleware
import { auth } from './middleware/auth.js';

// Initialize Express app and HTTP server
const app = express();
const httpServer = createServer(app);

// Environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  process.env.FRONTEND_URL
].filter(Boolean);

// Security middleware
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || 
        allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      callback(new Error(`CORS error: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Request-Timestamp'],
  maxAge: 600
}));

// JSON and URL-encoded body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 1000, // 15 seconds
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Session configuration
const configureSession = () => {
  app.use(session({
    ...sessionConfig,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions'
    })
  }));
};

// Route configuration
const configureRoutes = () => {
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/security', securityRoutes);
  app.use('/api/v1/payment', paymentRoutes);
  app.use('/api/v1/credit-score', creditScoreRoutes);
  app.use('/api/v1/lender', lenderRoutes);
  app.use('/api/v1/upload', uploadRoutes);
  app.use('/api/v1/user', userRoutes);
};

// Start server after DB connection
const startServer = async () => {
  try {
    const connected = await connectDB();
    if (!connected) {
      process.exit(1);
    }
    configureSession();
    configureRoutes();
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT} [${NODE_ENV}]`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();