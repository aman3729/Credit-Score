import '../loadEnv.js';
import { createTerminus } from '@godaddy/terminus';
import mongoose from 'mongoose';

import { logger } from '../config/logger.js';
import { connectDB } from '../config/db.js';
import { initAdmin } from '../scripts/init-admin.js';
import Application from './app.js';

/**
 * Main server class that handles application lifecycle
 */
class Server {
  constructor() {
    this.application = new Application();
    this.server = null;
  }

  /**
   * Initialize the server
   */
  async initialize() {
    try {
      logger.info('Starting server initialization...');
      
      // Connect to database
      await connectDB();
      logger.info('Database connected successfully');
      
      // Initialize admin user
      await initAdmin();
      logger.info('Admin user initialized');
      
      // Initialize application
      this.application.initialize();
      
      // Create and start server
      this.server = await this.application.start();
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      logger.info('Server initialization completed successfully');
    } catch (error) {
      logger.error('Server initialization failed:', error);
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.shutdown(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', { promise, reason });
      this.shutdown(1);
    });

    // Setup terminus for graceful shutdown
    createTerminus(this.server, {
      signals: ['SIGINT', 'SIGTERM'],
      onSignal: async () => {
        logger.info('Server shutting down...');
        await this.cleanup();
      },
      onShutdown: () => {
        logger.info('Cleanup completed');
        process.exit(0);
      },
      logger: (msg, err) => logger.error(msg, err)
    });
  }

  /**
   * Perform cleanup operations
   */
  async cleanup() {
    try {
      // Close database connection
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        logger.info('Database connection closed');
      }

      // Close server
      if (this.server) {
        this.server.close();
        logger.info('Server closed');
      }
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }

  /**
   * Force shutdown with exit code
   */
  shutdown(exitCode = 0) {
    this.cleanup().then(() => {
      process.exit(exitCode);
    }).catch(() => {
      process.exit(1);
    });
  }

  /**
   * Get the application instance
   */
  getApplication() {
    return this.application;
  }

  /**
   * Get the server instance
   */
  getServer() {
    return this.server;
  }
}

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  const server = new Server();
  server.initialize().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default Server; 