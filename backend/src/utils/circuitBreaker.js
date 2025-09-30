import { EventEmitter } from 'events';
import { logger } from '../../config/logger.js';

/**
 * Circuit Breaker implementation for external service calls
 * Implements the circuit breaker pattern to handle failures gracefully
 */
export class CircuitBreaker extends EventEmitter {
  constructor(options = {}) {
    super();
    this.failureThreshold = options.failureThreshold || 5; // Number of failures before opening the circuit
    this.resetTimeout = options.resetTimeout || 30000; // Time in ms to wait before attempting to close the circuit
    this.timeout = options.timeout || 10000; // Time in ms before a request is considered a failure
    this.failures = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, or HALF-OPEN
    this.lastFailure = null;
    this.name = options.name || 'external-service';
  }

  async call(serviceCall, ...args) {
    if (this.state === 'OPEN') {
      if (this.lastFailure && (Date.now() - this.lastFailure) > this.resetTimeout) {
        this.state = 'HALF-OPEN';
      } else {
        throw new Error(`Circuit breaker is OPEN for ${this.name}`);
      }
    }

    try {
      const result = await Promise.race([
        serviceCall(...args),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Service call timeout')), this.timeout)
        )
      ]);
      
      // On success in HALF-OPEN state, reset the circuit
      if (this.state === 'HALF-OPEN') {
        this.reset();
      }
      return result;
    } catch (error) {
      this.recordFailure(error);
      throw error;
    }
  }

  recordFailure(error) {
    this.failures++;
    this.lastFailure = Date.now();
    
    logger.warn(`Circuit breaker failure (${this.name}): ${error.message}`, {
      failureCount: this.failures,
      state: this.state,
      error: error.message
    });

    if (this.failures >= this.failureThreshold) {
      this.trip();
    }
  }

  trip() {
    this.state = 'OPEN';
    logger.error(`Circuit breaker tripped to OPEN state for ${this.name}`);
    
    // Try to reset after resetTimeout
    setTimeout(() => {
      this.state = 'HALF-OPEN';
      logger.info(`Circuit breaker moved to HALF-OPEN state for ${this.name}`);
    }, this.resetTimeout);

    this.emit('open');
  }

  reset() {
    this.failures = 0;
    this.lastFailure = null;
    this.state = 'CLOSED';
    logger.info(`Circuit breaker reset to CLOSED state for ${this.name}`);
    this.emit('close');
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailure,
      name: this.name
    };
  }
}

// Create a singleton instance for the application
const circuitBreaker = new CircuitBreaker({
  name: 'external-service',
  failureThreshold: 5,
  resetTimeout: 30000,
  timeout: 10000
});

export default circuitBreaker;
