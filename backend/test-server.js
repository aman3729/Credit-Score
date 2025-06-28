import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

// Load environment variables
dotenv.config();

// Constants
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Create Express app
const app = express();

// CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5177',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5177'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Test route
app.get('/api/v1/health', (req, res) => {
  console.log('Health check called');
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log(`Test server running on http://${HOST}:${PORT}`);
  console.log('CORS allowed origins:', corsOptions.origin);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server has been terminated');
    process.exit(0);
  });
});
