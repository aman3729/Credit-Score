import express from 'express';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading environment from:', envPath);

const { error } = config({ path: envPath });
if (error) {
  console.error('❌ Failed to load .env file:', error);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Basic route
app.get('/', (req, res) => {
  res.send('Minimal Server is running!');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the server
app.listen(PORT, () => {
  console.log(`\n=== Minimal Server Running ===`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Server running on port ${PORT}`);
  console.log(`MongoDB URI: ${process.env.MONGODB_URI ? '***' : 'Not set'}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);
  console.log(`Press Ctrl+C to stop\n`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
