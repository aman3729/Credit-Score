import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import 'winston-daily-rotate-file';
import fs from 'fs';

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create console transport for development
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

// Create file transports
const fileTransports = [
  // - Write all logs with level `error` and below to `error.log`
  new winston.transports.DailyRotateFile({
    level: 'error',
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: logFormat
  }),
  
  // - Write all logs with level `info` and below to `combined.log`
  new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: logFormat
  }),
  
  // - Write all unhandled exceptions to `exceptions.log`
  new winston.transports.File({
    filename: path.join(logDir, 'exceptions.log'),
    handleExceptions: true,
    handleRejections: true
  })
];

// Create the logger
const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'credit-score-backend' },
  transports: [
    consoleTransport,
    ...fileTransports
  ],
  exitOnError: false // Do not exit on handled exceptions
});

// If we're not in production, log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest })`
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
    level: 'debug'
  }));
}

// Create a stream for Morgan to use for HTTP request logging
export const stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

// Handle unhandled exceptions and promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Recommended: close server and exit process
  // server.close(() => process.exit(1));
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Recommended: close server and exit process
  // server.close(() => process.exit(1));
});

export default logger;
