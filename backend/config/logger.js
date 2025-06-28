import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const { format } = winston;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { combine, timestamp, json, printf, colorize, align } = format;

// Ensure log directory exists
const LOG_DIR = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  const stackString = stack ? `\n${stack}` : '';
  return `${timestamp} [${level}]: ${message}${metaString}${stackString}`;
});

// Define transports
const transports = [
  // Console transport for development
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.errors({ stack: true }),
      consoleFormat
    ),
    handleExceptions: true,
    handleRejections: true,
  }),
  // File transport for all logs
  new winston.transports.DailyRotateFile({
    filename: path.join(LOG_DIR, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info',
    format: combine(
      timestamp(),
      format.errors({ stack: true }),
      json()
    ),
  }),
  // File transport for errors
  new winston.transports.DailyRotateFile({
    filename: path.join(LOG_DIR, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: combine(
      timestamp(),
      format.errors({ stack: true }),
      json()
    ),
  }),
];

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'credit-score-api' },
  transports,
  exceptionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: path.join(LOG_DIR, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
  rejectionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: path.join(LOG_DIR, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
  exitOnError: false,
});

// Create a stream for morgan (HTTP request logging)
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

// Create a child logger for security-related logs
const securityLogger = logger.child({ category: 'security' });

// Log unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle process termination
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down...');
  process.exit(0);
});

export { logger, securityLogger };