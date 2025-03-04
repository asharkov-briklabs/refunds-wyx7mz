import { logger } from '../../../common/utils/logger';
import { GatewayError } from '../../../common/errors/gateway-error';

/**
 * Configurable retry strategy for gateway operations
 * Implements exponential backoff with jitter for resilient processing
 */
export class RetryStrategy {
  private max_attempts: number;
  private initial_delay: number;
  private backoff_factor: number;
  private jitter: number;
  private retryable_errors: string[];
  private current_attempt: number;

  /**
   * Creates a new RetryStrategy with configurable parameters
   * 
   * @param options - Retry configuration options
   */
  constructor(options: {
    max_attempts?: number;
    initial_delay?: number;
    backoff_factor?: number;
    jitter?: number;
    retryable_errors?: string[];
  } = {}) {
    this.max_attempts = options.max_attempts || 3;
    this.initial_delay = options.initial_delay || 1000; // 1 second in milliseconds
    this.backoff_factor = options.backoff_factor || 2;
    this.jitter = options.jitter || 0.25; // 25% jitter
    this.retryable_errors = options.retryable_errors || [
      'GATEWAY_TIMEOUT',
      'GATEWAY_CONNECTION_ERROR',
      'RATE_LIMIT_EXCEEDED',
      'SERVICE_UNAVAILABLE'
    ];
    this.current_attempt = 0;
  }

  /**
   * Determines if an error should trigger a retry attempt
   * 
   * @param error - The error to evaluate
   * @returns True if the error should trigger a retry, false otherwise
   */
  public isRetryable(error: Error): boolean {
    // If it's a GatewayError, check if its error code is in retryable_errors
    if (error instanceof GatewayError) {
      return this.retryable_errors.includes(error.code) || error.retryable;
    }

    // For non-GatewayError types, check if they have a retryable property
    if ((error as any).retryable === true) {
      return true;
    }

    // Check for common timeout/connection error patterns in the message
    const errorMessage = error.message.toLowerCase();
    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('econnrefused') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('network') ||
      errorMessage.includes('temporarily unavailable')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Calculates the delay before the next retry attempt
   * using exponential backoff with jitter
   * 
   * @param attempt - The retry attempt number (starting at 1)
   * @returns Delay in milliseconds before next retry
   */
  public calculateDelay(attempt: number): number {
    // Base delay with exponential backoff
    const baseDelay = this.initial_delay * Math.pow(this.backoff_factor, attempt - 1);
    
    // Calculate jitter range
    const jitterRange = baseDelay * this.jitter;
    
    // Apply random jitter (both positive and negative)
    const jitterValue = (Math.random() * 2 - 1) * jitterRange;
    
    // Return the final delay with jitter, ensuring it's positive
    return Math.max(0, baseDelay + jitterValue);
  }

  /**
   * Executes an operation with retry logic
   * 
   * @param operation - The function to execute with retry logic
   * @param onRetry - Optional callback to invoke before each retry attempt
   * @returns Promise resolving to the result of the operation
   */
  public async execute<T>(
    operation: () => Promise<T>,
    onRetry?: (error: Error, attempt: number, delay: number) => void
  ): Promise<T> {
    // Reset the attempt counter
    this.reset();
    
    let lastError: Error;
    
    // Try up to max_attempts times
    for (let attempt = 1; attempt <= this.max_attempts; attempt++) {
      try {
        // Set current_attempt for external tracking
        this.current_attempt = attempt;
        
        // Apply delay if this is a retry (not the first attempt)
        if (attempt > 1) {
          const delay = this.calculateDelay(attempt - 1);  // attempt - 1 because first retry is after attempt 1
          
          logger.info(`Retry attempt ${attempt - 1}/${this.max_attempts - 1} after ${delay}ms delay`, {
            errorMessage: lastError.message,
            errorCode: (lastError as any).code,
            attempt: attempt - 1,
            maxAttempts: this.max_attempts - 1,
            delay
          });
          
          // Call onRetry callback if provided
          if (onRetry) {
            onRetry(lastError, attempt - 1, delay);
          }
          
          // Wait for the calculated delay
          await sleep(delay);
        }
        
        // Attempt the operation
        return await operation();
      } catch (error) {
        lastError = error;
        
        // If the error is not retryable, throw immediately
        if (!this.isRetryable(error)) {
          throw error;
        }
        
        // If this was the last allowed attempt, throw
        if (attempt === this.max_attempts) {
          logger.warn(`Max attempts (${this.max_attempts}) reached`, {
            error: lastError,
            attempts: this.max_attempts
          });
          throw error;
        }
        
        // Otherwise, continue to the next iteration for a retry
      }
    }
    
    // This should never be reached due to the for loop bounds and throws inside the loop
    throw new Error('Max retry attempts reached');
  }

  /**
   * Executes an operation with retry logic and success/error callbacks
   * 
   * @param operation - The function to execute with retry logic
   * @param onSuccess - Callback invoked when operation succeeds
   * @param onError - Callback invoked when operation ultimately fails
   * @param onRetry - Optional callback to invoke before each retry attempt
   */
  public async executeWithCallback<T>(
    operation: () => Promise<T>,
    onSuccess: (result: T) => void,
    onError: (error: Error) => void,
    onRetry?: (error: Error, attempt: number, delay: number) => void
  ): Promise<void> {
    try {
      const result = await this.execute(operation, onRetry);
      onSuccess(result);
    } catch (error) {
      onError(error);
    }
  }

  /**
   * Resets the retry counter
   */
  public reset(): void {
    this.current_attempt = 0;
  }

  /**
   * Returns the current attempt number
   */
  public getCurrentAttempt(): number {
    return this.current_attempt;
  }
}

/**
 * Utility function to determine if an error is retryable
 * 
 * @param error - The error to evaluate
 * @param retryableErrorCodes - Optional list of error codes considered retryable
 * @returns True if error should be retried, false otherwise
 */
export function isRetryableError(
  error: Error, 
  retryableErrorCodes: string[] = []
): boolean {
  // If it's a GatewayError, check if its error code is in retryableErrorCodes
  if (error instanceof GatewayError) {
    return retryableErrorCodes.includes(error.code) || error.retryable;
  }

  // For non-GatewayError types, check if they have a retryable property
  if ((error as any).retryable === true) {
    return true;
  }

  // Check for common timeout/connection error patterns in the message
  const errorMessage = error.message.toLowerCase();
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('network') ||
    errorMessage.includes('temporarily unavailable')
  ) {
    return true;
  }

  return false;
}

/**
 * Utility function to create a delay using promises
 * 
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after the specified delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}