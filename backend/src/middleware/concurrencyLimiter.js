import { EventEmitter } from 'events';
import { logger } from '../../config/logger.js';

/**
 * Concurrency limiter for controlling simultaneous operations
 */
export class ConcurrencyLimiter extends EventEmitter {
  constructor(maxConcurrent = 5) {
    super();
    this.maxConcurrent = maxConcurrent;
    this.active = 0;
    this.queue = [];
  }

  /**
   * Run a function with concurrency control
   * @param {Function} fn - The async function to run
   * @param {...any} args - Arguments to pass to the function
   * @returns {Promise<any>} - Result of the function
   */
  async run(fn, ...args) {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          this.active++;
          logger.debug(`Starting task (active: ${this.active}/${this.maxConcurrent})`);
          
          const result = await fn(...args);
          resolve(result);
          
          this.active--;
          this.processQueue();
          
        } catch (error) {
          reject(error);
          
          this.active--;
          this.processQueue();
        }
      };

      if (this.active < this.maxConcurrent) {
        task();
      } else {
        this.queue.push(task);
        logger.debug(`Task queued (queue length: ${this.queue.length})`);
      }
    });
  }

  /**
   * Process the next task in the queue if capacity is available
   */
  processQueue() {
    if (this.queue.length === 0 || this.active >= this.maxConcurrent) {
      return;
    }

    const task = this.queue.shift();
    task();
  }

  /**
   * Get current concurrency metrics
   * @returns {Object} Current state
   */
  getState() {
    return {
      active: this.active,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent
    };
  }

  /**
   * Update the maximum concurrency
   * @param {number} max - New maximum concurrency
   */
  setMaxConcurrent(max) {
    this.maxConcurrent = Math.max(1, max);
    logger.info(`Updated max concurrency to ${this.maxConcurrent}`);
    
    // Process additional tasks if we increased concurrency
    while (this.active < this.maxConcurrent && this.queue.length > 0) {
      this.processQueue();
    }
  }
}

// Create a singleton instance for uploads
const uploadLimiter = new ConcurrencyLimiter(
  parseInt(process.env.MAX_UPLOAD_CONCURRENCY || '3', 10)
);

// Log state changes for monitoring
uploadLimiter.on('error', (error) => {
  logger.error('Concurrency limiter error:', error);
});

export { uploadLimiter };

export const concurrencyMiddleware = (limiter) => {
  return (req, res, next) => {
    // Store the original send function
    const originalSend = res.send;
    
    // Create a promise that resolves when the response is sent
    let responseSent = false;
    const responsePromise = new Promise((resolve) => {
      // Override the send function to know when the response is complete
      res.send = function(...args) {
        if (!responseSent) {
          responseSent = true;
          originalSend.apply(res, args);
          resolve();
        }
        return res;
      };
    });

    // Wrap the next() call in the limiter
    limiter.run(async () => {
      return new Promise((resolve) => {
        // When the response is sent, resolve the outer promise
        responsePromise.then(resolve);
        
        // Call the next middleware
        next();
      });
    }).catch((error) => {
      if (!responseSent) {
        res.status(503).json({
          status: 'error',
          message: 'Service temporarily unavailable due to high load'
        });
      }
      logger.error('Concurrency limiter middleware error:', error);
    });
  };
};
