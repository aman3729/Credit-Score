import express from 'express';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';

// Configure logging
const log = (...args) => {
  const message = `[${new Date().toISOString()}] ${args.join(' ')}`;
  console.log(message);
  try {
    writeFileSync('server.log', message + '\n', { flag: 'a' });
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
};

// Load environment variables
log('=== Starting Server ===');
log(`Node.js version: ${process.version}`);
log(`Current directory: ${process.cwd()}`);

const envPath = new URL('.env', import.meta.url).pathname.replace(/^\/([A-Z]:\/)/, '$1');
log(`Loading .env from: ${envPath}`);

try {
  const result = config({ path: envPath });
  if (result.error) throw result.error;
  log('✅ Environment variables loaded');
} catch (err) {
  log(`❌ Error loading .env: ${err.message}`);
  process.exit(1);
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  log('GET /');
  res.json({
    status: 'ok',
    message: 'Server is running',
    node_env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  log('GET /health');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  log(`\n=== Server Started ===`);
  log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  log(`Server running on port ${PORT}`);
  log(`MongoDB URI: ${process.env.MONGODB_URI ? '***' : 'Not set'}`);
  log(`Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);
  log(`Press Ctrl+C to stop\n`);
});

// Handle graceful shutdown
const shutdown = () => {
  log('\nShutting down server...');
  server.close(() => {
    log('Server has been stopped');
    process.exit(0);
  });

  // Force shutdown after 5 seconds
  setTimeout(() => {
    console.error('Forcing shutdown...');
    process.exit(1);
  }, 5000);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  log('Unhandled Rejection:', err);
  // Don't exit in development to allow for debugging
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  log('Uncaught Exception:', err);
  // Don't exit in development to allow for debugging
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});
