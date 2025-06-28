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

// MongoDB connection with simplified approach
const connectDB = async () => {
  try {
    console.log('\n' + '🔍 MONGODB CONNECTION'.padEnd(50, ' ') + '🔍');
    console.log(''.padEnd(70, '─'));
    
    // Check if MONGODB_URI is defined
    if (!process.env.MONGODB_URI) {
      const errorMsg = '❌ FATAL: MONGODB_URI is not defined in environment variables';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    // Log the MongoDB URI (masked for security)
    const maskedURI = process.env.MONGODB_URI.replace(
      /(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.+)/, 
      (match, p1, p2, p3) => `${p1}*****${p3}`
    );
    console.log(`• Connection String: ${maskedURI}`);

    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('• Status:          Already connected');
      return true;
    }

    // Configure Mongoose
    mongoose.set('debug', process.env.NODE_ENV === 'development');
    mongoose.set('strictQuery', true);

    console.log('• Status:          Connecting...');
    
    // Attempt connection
    const startTime = Date.now();
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      w: 'majority'
    });

    const endTime = Date.now();
    
    // Event listeners
    mongoose.connection.on('connected', () => {
      console.log('• Status:          Connected');
      console.log(`• Database:         ${mongoose.connection.name}`);
      console.log(`• Host:            ${mongoose.connection.host}`);
      console.log(`• Port:            ${mongoose.connection.port || 'default'}`);
      console.log(`• Connection Time:  ${endTime - startTime}ms`);
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MONGODB ERROR:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('ℹ️  MONGODB DISCONNECTED');
    });

    return true;
    
  } catch (error) {
    console.error('\n❌ MONGODB CONNECTION FAILED');
    console.error('• Error:', error.message);
    console.error('• Code:', error.code);
    console.error('• Reason:', error.reason ? error.reason : 'Unknown reason');
    
    if (error.code === 'MONGODB_DUPLICATE_KEY_ERROR') {
      console.error('  → Duplicate key error detected');
    } else if (error.code === 'MONGODB_SERVER_SELECTION_ERROR') {
      console.error('  → Could not connect to MongoDB server');
      console.error('  → Please check if MongoDB is running and accessible');
    }
    
    return false;
  }
};

// Event handlers for MongoDB connection
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
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
  console.log('Session configuration initialized');
};

// API Routes
const configureRoutes = () => {
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', auth, adminRoutes);
  app.use('/api/security', auth, securityRoutes);
  app.use('/api/payment', auth, paymentRoutes);
  app.use('/api/upload', auth, uploadRoutes);
  app.use('/api/users', auth, userRoutes);
  app.use('/api/lender', auth, lenderRoutes);
  app.use('/api/credit-score', auth, creditScoreRoutes);
  console.log('API routes registered');
};

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server with database connection
const startServer = async () => {
  try {
    // Clear console for better visibility
    console.clear();
    
    // Show server header
    console.log('\n' + '='.repeat(70));
    console.log('🚀  CREDIT SCORE DASHBOARD - SERVER STARTING'.padEnd(68) + '🚀');
    console.log('='.repeat(70));
    
    // Show environment info
    console.log('\n' + '📋 ENVIRONMENT INFO'.padEnd(50, ' ') + '📋');
    console.log(''.padEnd(50, '─'));
    console.log(`• Node Version:    ${process.version}`);
    console.log(`• Environment:     ${process.env.NODE_ENV || 'development'}`);
    console.log(`• Process ID:      ${process.pid}`);
    console.log(`• Directory:       ${process.cwd()}`);
    console.log(`• Time:            ${new Date().toISOString()}`);
    
    // Show important environment variables (masked)
    console.log('\n' + '🔑 ENVIRONMENT VARIABLES'.padEnd(50, ' ') + '🔑');
    console.log(''.padEnd(50, '─'));
    console.log(`• MONGODB_URI:     ${process.env.MONGODB_URI ? '✓ Set' : '✗ Not set'}`);
    console.log(`• JWT_SECRET:      ${process.env.JWT_SECRET ? '✓ Set' : '✗ Not set'}`);
    console.log(`• PORT:            ${process.env.PORT || 3000}`);
    
    // Connect to MongoDB
    console.log('\n' + '-'.repeat(30));
    console.log('🔍 Database Connection');
    console.log('-'.repeat(30));
    
    const dbConnected = await connectDB();
    
    if (!dbConnected) {
      console.error('\n❌ FATAL: Failed to connect to MongoDB. Exiting...');
      process.exit(1);
    }
    
    // Configure session and routes
    console.log('\n' + '-'.repeat(30));
    console.log('⚙️  Server Configuration');
    console.log('-'.repeat(30));
    
    configureSession();
    configureRoutes();

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log('\n' + '='.repeat(70));
      console.log('🚀  SERVER STARTED SUCCESSFULLY'.padEnd(68) + '🚀');
      console.log('='.repeat(70));
      
      console.log('\n' + '🌐 SERVER INFORMATION'.padEnd(50, ' ') + '🌐');
      console.log(''.padEnd(70, '─'));
      console.log(`• Environment:     ${NODE_ENV}`);
      console.log(`• Node Version:    ${process.version}`);
      console.log(`• Process ID:      ${process.pid}`);
      console.log(`• Uptime:          ${process.uptime().toFixed(2)}s`);
      
      console.log('\n' + '🔗 ENDPOINTS'.padEnd(50, ' ') + '🔗');
      console.log(''.padEnd(70, '─'));
      console.log(`• Local:           http://localhost:${PORT}`);
      console.log(`• Health Check:    http://localhost:${PORT}/health`);
      
      console.log('\n' + '📊 RESOURCE USAGE'.padEnd(50, ' ') + '📊');
      console.log(''.padEnd(70, '─'));
      console.log(`• Memory Usage:    ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`• Platform:        ${process.platform}`);
      console.log(`• CPU Cores:       ${require('os').cpus().length}`);
      
      console.log('\n' + '='.repeat(70));
      console.log('🛡️  SERVER IS READY TO HANDLE REQUESTS'.padEnd(68) + '🛡️');
      console.log('='.repeat(70));
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('\n❌ Unhandled Rejection! Shutting down...');
      console.error(err);
      httpServer.close(() => {
        process.exit(1);
      });
    });
    
    // Graceful shutdown
    const gracefulShutdown = async () => {
      console.log('\nShutting down gracefully...');
      httpServer.close(() => {
        console.log('HTTP server closed');
        if (mongoose.connection.readyState === 1) {
          mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
          });
        } else {
          process.exit(0);
        }
      });

      setTimeout(() => {
        console.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
  } catch (error) {
    console.error('Server initialization failed:', error);
    process.exit(1);
  }
};

startServer();