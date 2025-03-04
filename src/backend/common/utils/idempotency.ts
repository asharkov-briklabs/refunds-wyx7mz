import { v4 as uuidv4 } from 'uuid'; // uuid ^9.0.0
import Redlock from 'redlock'; // redlock ^5.0.0
import { logger } from './logger';
import redisClient from '../../database/connection';

/**
 * Configuration options for idempotency processing
 */
export class IdempotencyOptions {
  /**
   * Time-to-live in seconds for the cached idempotency records
   * Default: 24 hours (86400 seconds)
   */
  ttlSeconds: number;
  
  /**
   * Timeout for distributed lock in milliseconds
   * Default: 10 seconds (10000ms)
   */
  lockTimeoutMs: number;
  
  /**
   * Whether to fail the operation if lock acquisition times out
   * Default: false (will wait for lock)
   */
  failOnLockTimeout: boolean;
  
  /**
   * Prefix for idempotency keys in the cache
   * Default: 'idempotency'
   */
  keyPrefix: string;
  
  /**
   * Initializes idempotency options with default or custom values
   * 
   * @param options - Optional overrides for default configuration values
   */
  constructor(options: Partial<IdempotencyOptions> = {}) {
    this.ttlSeconds = options.ttlSeconds ?? 86400; // 24 hours default
    this.lockTimeoutMs = options.lockTimeoutMs ?? 10000; // 10 seconds default
    this.failOnLockTimeout = options.failOnLockTimeout ?? false;
    this.keyPrefix = options.keyPrefix ?? 'idempotency';
  }
}

/**
 * Generates a unique idempotency key based on input parameters
 * 
 * @param context - Object containing data to generate the idempotency key from
 * @returns A unique idempotency key
 */
export function generateIdempotencyKey(context: Record<string, any>): string {
  if (!context || typeof context !== 'object') {
    // If no valid context is provided, generate a random UUID
    return `idem_${uuidv4()}`;
  }
  
  // If context has an id field, use it as part of the key
  if (context.id) {
    return `idem_${context.id}_${Date.now()}`;
  }
  
  // Generate a deterministic string from the context object
  const contextString = JSON.stringify(
    Object.entries(context)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {} as Record<string, any>)
  );
  
  // Create a hash of the context string
  let hash = 0;
  for (let i = 0; i < contextString.length; i++) {
    const char = contextString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `idem_${hash}_${Date.now()}`;
}

/**
 * Executes a function with idempotency guarantees using distributed locking
 * 
 * @param idempotencyKey - Unique key identifying this specific operation
 * @param operation - Async function to execute with idempotency guarantee
 * @param options - Optional configuration for idempotency processing
 * @returns Result of the operation or cached result if already executed
 */
export async function processWithIdempotency<T>(
  idempotencyKey: string,
  operation: () => Promise<T>,
  options: Partial<IdempotencyOptions> = {}
): Promise<T> {
  if (!idempotencyKey) {
    throw new Error('Idempotency key is required');
  }
  
  // Apply default options
  const idempotencyOptions = new IdempotencyOptions(options);
  
  // Format the cache key with prefix
  const cacheKey = `${idempotencyOptions.keyPrefix}:${idempotencyKey}`;
  
  // Check if the operation has already been executed
  const existingResult = await getIdempotencyRecord(idempotencyKey, idempotencyOptions);
  if (existingResult) {
    logger.info('Retrieved cached result for idempotent operation', { idempotencyKey });
    return existingResult as T;
  }
  
  // Initialize Redlock client
  const redlock = new Redlock(
    [redisClient],
    {
      // Redlock options
      driftFactor: 0.01,
      retryCount: 3,
      retryDelay: 200,
      retryJitter: 200,
      automaticExtensionThreshold: 500
    }
  );
  
  // Lock key for distributed locking
  const lockKey = `lock:${cacheKey}`;
  
  try {
    // Acquire a lock
    logger.debug('Acquiring lock for idempotent operation', { lockKey });
    const lock = await redlock.lock(lockKey, idempotencyOptions.lockTimeoutMs);
    
    try {
      // Double-check if the result now exists (in case of race condition)
      const checkAgain = await getIdempotencyRecord(idempotencyKey, idempotencyOptions);
      if (checkAgain) {
        logger.info('Retrieved cached result after acquiring lock', { idempotencyKey });
        return checkAgain as T;
      }
      
      // Execute the operation
      logger.info('Executing idempotent operation', { idempotencyKey });
      const result = await operation();
      
      // Cache the result
      await redisClient.set(
        cacheKey,
        JSON.stringify(result),
        'EX',
        idempotencyOptions.ttlSeconds
      );
      
      logger.debug('Cached result for idempotent operation', { idempotencyKey, ttl: idempotencyOptions.ttlSeconds });
      
      return result;
    } finally {
      // Release the lock
      logger.debug('Releasing lock for idempotent operation', { lockKey });
      await lock.unlock();
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'LockError') {
      if (idempotencyOptions.failOnLockTimeout) {
        logger.error('Failed to acquire lock for idempotent operation', { 
          idempotencyKey, 
          error: error.message 
        });
        throw new Error(`Failed to acquire lock for idempotent operation: ${error.message}`);
      } else {
        // Retry by calling the function again after a small delay
        logger.warn('Lock acquisition failed, retrying after delay', { idempotencyKey });
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
        return processWithIdempotency(idempotencyKey, operation, options);
      }
    }
    
    // For other errors, just re-throw
    logger.error('Error in idempotent operation', { 
      idempotencyKey, 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw error;
  }
}

/**
 * Removes an idempotency record from the cache
 * 
 * @param idempotencyKey - The idempotency key to clear
 * @param options - Optional configuration for idempotency processing
 * @returns Promise resolving to true if record was successfully removed
 */
export async function clearIdempotencyRecord(
  idempotencyKey: string,
  options: Partial<IdempotencyOptions> = {}
): Promise<boolean> {
  if (!idempotencyKey) {
    throw new Error('Idempotency key is required');
  }
  
  const idempotencyOptions = new IdempotencyOptions(options);
  const cacheKey = `${idempotencyOptions.keyPrefix}:${idempotencyKey}`;
  
  try {
    const result = await redisClient.del(cacheKey);
    logger.debug('Cleared idempotency record', { idempotencyKey, success: result > 0 });
    return result > 0;
  } catch (error) {
    logger.error('Failed to clear idempotency record', { 
      idempotencyKey, 
      error: error instanceof Error ? error.message : String(error) 
    });
    return false;
  }
}

/**
 * Retrieves an idempotency record from the cache
 * 
 * @param idempotencyKey - The idempotency key to retrieve
 * @param options - Optional configuration for idempotency processing
 * @returns Promise resolving to the cached operation result or null if not found
 */
export async function getIdempotencyRecord(
  idempotencyKey: string,
  options: Partial<IdempotencyOptions> = {}
): Promise<any | null> {
  if (!idempotencyKey) {
    throw new Error('Idempotency key is required');
  }
  
  const idempotencyOptions = new IdempotencyOptions(options);
  const cacheKey = `${idempotencyOptions.keyPrefix}:${idempotencyKey}`;
  
  try {
    const cachedData = await redisClient.get(cacheKey);
    
    if (!cachedData) {
      logger.debug('No cached data found for idempotency key', { idempotencyKey });
      return null;
    }
    
    logger.debug('Retrieved cached data for idempotency key', { idempotencyKey });
    return JSON.parse(cachedData);
  } catch (error) {
    logger.error('Error retrieving idempotency record', { 
      idempotencyKey, 
      error: error instanceof Error ? error.message : String(error) 
    });
    return null;
  }
}

/**
 * Manager class that handles idempotency operations with configurable options
 */
export class IdempotencyManager {
  private redlock: Redlock;
  private defaultOptions: IdempotencyOptions;
  
  /**
   * Initializes the idempotency manager with Redis client and default options
   * 
   * @param options - Optional configuration for default idempotency settings
   */
  constructor(options: Partial<IdempotencyOptions> = {}) {
    this.redlock = new Redlock(
      [redisClient],
      {
        driftFactor: 0.01,
        retryCount: 3,
        retryDelay: 200,
        retryJitter: 200,
        automaticExtensionThreshold: 500
      }
    );
    
    this.defaultOptions = new IdempotencyOptions(options);
    
    // Set up error handlers for Redis connectivity issues
    this.redlock.on('error', (error) => {
      logger.error('Redlock error in IdempotencyManager', { error: error.message });
    });
    
    logger.info('IdempotencyManager initialized successfully');
  }
  
  /**
   * Executes an operation with idempotency guarantees
   * 
   * @param idempotencyKey - Unique key identifying this specific operation
   * @param operation - Async function to execute with idempotency guarantee
   * @param options - Optional configuration overrides for this operation
   * @returns Promise resolving to the operation result or cached result
   */
  async processWithIdempotency<T>(
    idempotencyKey: string,
    operation: () => Promise<T>,
    options: Partial<IdempotencyOptions> = {}
  ): Promise<T> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    return processWithIdempotency(idempotencyKey, operation, mergedOptions);
  }
  
  /**
   * Generates a unique idempotency key
   * 
   * @param context - Object containing data to generate the idempotency key from
   * @returns A unique idempotency key
   */
  generateIdempotencyKey(context: Record<string, any>): string {
    return generateIdempotencyKey(context);
  }
  
  /**
   * Removes an idempotency record from the cache
   * 
   * @param idempotencyKey - The idempotency key to clear
   * @returns Promise resolving to true if record was successfully removed
   */
  async clearIdempotencyRecord(idempotencyKey: string): Promise<boolean> {
    return clearIdempotencyRecord(idempotencyKey, this.defaultOptions);
  }
  
  /**
   * Retrieves an idempotency record from the cache
   * 
   * @param idempotencyKey - The idempotency key to retrieve
   * @returns Promise resolving to the cached operation result or null if not found
   */
  async getIdempotencyRecord(idempotencyKey: string): Promise<any | null> {
    return getIdempotencyRecord(idempotencyKey, this.defaultOptions);
  }
}

// Create a singleton instance
const idempotencyManager = new IdempotencyManager();

// Export singleton as default
export default idempotencyManager;