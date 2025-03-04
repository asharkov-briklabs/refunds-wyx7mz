import { logger } from '../../../common/utils/logger';
import { GatewayError } from '../../../common/errors/gateway-error';
import { incrementCounter, recordGauge } from '../../../common/utils/metrics';

/**
 * Enum representing the possible states of a circuit breaker
 */
export enum CircuitState {
  /** Circuit is closed, requests are allowed through */
  CLOSED,
  /** Circuit is open, requests are blocked */
  OPEN,
  /** Circuit is half-open, test requests are allowed through */
  HALF_OPEN
}

/**
 * Interface defining circuit breaker configuration options
 */
export interface CircuitBreakerOptions {
  /** Name of the circuit breaker for identification */
  name?: string;
  /** Number of failures required to open the circuit */
  failureThreshold?: number;
  /** Time in milliseconds before recording consecutive failures */
  failureTimeout?: number;
  /** Time in milliseconds to wait before transitioning from OPEN to HALF-OPEN */
  resetTimeout?: number;
  /** Optional function to check if the service is healthy */
  healthCheck?: () => Promise<boolean>;
}

/**
 * Error thrown when a call is attempted while the circuit is open
 */
export class CircuitOpenError extends Error {
  constructor(message: string = 'Circuit is open') {
    super(message);
    this.name = 'CircuitOpenError';
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CircuitOpenError);
    }
  }
}

/**
 * Implements the circuit breaker pattern to prevent cascading failures
 * when communicating with external payment gateways
 */
export class CircuitBreaker {
  private failureThreshold: number;
  private failureTimeout: number;
  private resetTimeout: number;
  private failureCount: number;
  private name: string;
  private lastFailureTime: Date | null;
  private state: CircuitState;
  private healthCheck?: () => Promise<boolean>;

  /**
   * Creates a new CircuitBreaker instance
   * 
   * @param options - Circuit breaker configuration options
   */
  constructor(options: CircuitBreakerOptions = {}) {
    this.name = options.name || 'default';
    this.failureThreshold = options.failureThreshold || 5;
    this.failureTimeout = options.failureTimeout || 60000; // 1 minute
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.healthCheck = options.healthCheck;
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
    this.lastFailureTime = null;
    
    logger.info(`Circuit breaker '${this.name}' initialized`, {
      failureThreshold: this.failureThreshold,
      failureTimeout: this.failureTimeout,
      resetTimeout: this.resetTimeout
    });
  }

  /**
   * Executes a function with circuit breaker protection
   * 
   * @param func - Function to execute
   * @param fallback - Optional fallback function to execute if the circuit is open
   * @returns Result of the executed function or fallback
   * @throws CircuitOpenError if the circuit is open and no fallback is provided
   */
  async execute<T>(func: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    // Check if we should allow the call
    if (!this._shouldRetryCall()) {
      logger.debug(`Circuit '${this.name}' is open, blocking call`);
      incrementCounter('circuit_breaker.blocked', 1, { name: this.name });
      
      if (fallback) {
        return fallback();
      }
      
      throw new CircuitOpenError(`Circuit '${this.name}' is open`);
    }
    
    try {
      // Execute the function
      const result = await func();
      
      // Record success
      this.recordSuccess();
      
      return result;
    } catch (error) {
      // Record failure
      this.recordFailure(error);
      
      // If we have a fallback, use it
      if (fallback) {
        return fallback();
      }
      
      // Re-throw the error
      throw error;
    }
  }

  /**
   * Manually forces the circuit into the open state
   */
  forceOpen(): void {
    const previousState = this.state;
    this.state = CircuitState.OPEN;
    
    if (previousState !== CircuitState.OPEN) {
      logger.info(`Circuit '${this.name}' manually forced open`);
      recordGauge('circuit_breaker.state', CircuitState.OPEN, { name: this.name });
    }
  }

  /**
   * Manually forces the circuit into the closed state
   */
  forceClose(): void {
    const previousState = this.state;
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    
    if (previousState !== CircuitState.CLOSED) {
      logger.info(`Circuit '${this.name}' manually forced closed`);
      recordGauge('circuit_breaker.state', CircuitState.CLOSED, { name: this.name });
    }
  }

  /**
   * Checks if the circuit is currently open
   * 
   * @returns True if the circuit is open, false otherwise
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Gets the current state of the circuit
   * 
   * @returns Current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Records a successful operation and updates circuit state if needed
   */
  recordSuccess(): void {
    // If the circuit is half-open and we have a success, close it
    if (this.state === CircuitState.HALF_OPEN) {
      const previousState = this.state;
      this.state = CircuitState.CLOSED;
      this.failureCount = 0;
      this.lastFailureTime = null;
      
      logger.info(`Circuit '${this.name}' transitioned from ${CircuitState[previousState]} to ${CircuitState[this.state]}`);
      recordGauge('circuit_breaker.state', CircuitState.CLOSED, { name: this.name });
    }
    
    // Reset failure count
    this.failureCount = 0;
    incrementCounter('circuit_breaker.success', 1, { name: this.name });
  }

  /**
   * Records a failed operation and updates circuit state if needed
   * 
   * @param error - The error that caused the failure
   */
  recordFailure(error: Error): void {
    // Increment failure count
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    logger.error(`Circuit '${this.name}' recorded failure ${this.failureCount}/${this.failureThreshold}`, {
      error: error.message,
      stack: error.stack
    });
    
    incrementCounter('circuit_breaker.failure', 1, { name: this.name });
    
    // If in half-open state, any failure transitions back to open
    if (this.state === CircuitState.HALF_OPEN || this.failureCount >= this.failureThreshold) {
      const previousState = this.state;
      this.state = CircuitState.OPEN;
      
      if (previousState !== CircuitState.OPEN) {
        logger.info(`Circuit '${this.name}' transitioned from ${CircuitState[previousState]} to ${CircuitState[this.state]}`);
        recordGauge('circuit_breaker.state', CircuitState.OPEN, { name: this.name });
      }
    }
  }

  /**
   * Returns the current status of the circuit breaker
   * 
   * @returns Status object with circuit breaker details
   */
  getStatus(): object {
    return {
      name: this.name,
      state: CircuitState[this.state],
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  /**
   * Resets the circuit breaker to its initial closed state
   */
  reset(): void {
    const previousState = this.state;
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    
    logger.info(`Circuit '${this.name}' has been reset to CLOSED state`);
    recordGauge('circuit_breaker.state', CircuitState.CLOSED, { name: this.name });
  }

  /**
   * Internal method to determine if a call should be attempted
   * 
   * @returns True if the call should be attempted, false otherwise
   */
  private _shouldRetryCall(): boolean {
    // If the circuit is closed, allow the call
    if (this.state === CircuitState.CLOSED) {
      return true;
    }
    
    // If the circuit is half-open, allow the call (test call)
    if (this.state === CircuitState.HALF_OPEN) {
      return true;
    }
    
    // If the circuit is open, check if the reset timeout has elapsed
    if (this.state === CircuitState.OPEN && this._checkTimeout()) {
      // Transition to half-open state
      this.state = CircuitState.HALF_OPEN;
      logger.info(`Circuit '${this.name}' transitioned from OPEN to HALF_OPEN`);
      recordGauge('circuit_breaker.state', CircuitState.HALF_OPEN, { name: this.name });
      return true;
    }
    
    // Circuit is open and timeout has not elapsed
    return false;
  }

  /**
   * Checks if the reset timeout has elapsed since the last failure
   * 
   * @returns True if the timeout has elapsed, false otherwise
   */
  private _checkTimeout(): boolean {
    if (!this.lastFailureTime) {
      return true;
    }
    
    const currentTime = new Date();
    const elapsedMs = currentTime.getTime() - this.lastFailureTime.getTime();
    
    return elapsedMs > this.resetTimeout;
  }
}