/**
 * Redis Configuration Module
 * 
 * This module configures and exports the Redis client for the Refunds Service.
 * It handles connection to Redis based on environment-specific settings,
 * provides a wrapper around common Redis operations, and manages the connection
 * lifecycle.
 * 
 * The module supports both standalone Redis and Redis Cluster modes and provides
 * fault tolerance through connection event handling and graceful error recovery.
 * 
 * @module config/redis
 */

import Redis, { Cluster, Redis as RedisClient } from 'ioredis'; // ioredis ^5.3.0
import { getConfig } from './index';
import { logger } from '../common/utils/logger';

// Determine current environment
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Redis configuration interface
 */
export interface RedisConfig {
  // Connection properties
  host: string;
  port: number;
  password: string | null;
  db: number;
  keyPrefix: string;
  ttl: number;
  
  // Configuration options
  cluster: boolean;
  tls: boolean;
  connectTimeout?: number;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  enableOfflineQueue?: boolean;
  
  // Cluster-specific options
  nodes?: { host: string; port: number }[];
}

// Track the Redis client instance
let redisClient: RedisClient | Cluster | null = null;

/**
 * Retrieves Redis configuration for the current environment
 * 
 * @param overrides - Optional configuration overrides
 * @returns Redis configuration with any overrides applied
 */
export function getRedisConfig(overrides: Partial<RedisConfig> = {}): RedisConfig {
  const config = getConfig();
  const redisConfig = config.redis || {};
  
  // Apply overrides to the base configuration
  return {
    ...redisConfig,
    ...overrides
  };
}

/**
 * Creates and configures a Redis client based on environment configuration
 * 
 * @param redisConfig - Redis configuration object
 * @returns Configured Redis client instance
 */
export function createRedisClient(redisConfig: RedisConfig): RedisClient | Cluster {
  const { 
    cluster, host, port, password, db, tls, connectTimeout,
    maxRetriesPerRequest, enableReadyCheck, enableOfflineQueue,
    keyPrefix
  } = redisConfig;
  
  let client: RedisClient | Cluster;
  
  logger.info(`Initializing Redis client in ${cluster ? 'cluster' : 'standalone'} mode`, { host, port });
  
  if (cluster) {
    // Create a Redis Cluster client
    const nodes = redisConfig.nodes || [{ host, port }];
    
    logger.debug('Creating Redis cluster client', { nodes });
    
    client = new Cluster(nodes, {
      redisOptions: {
        password: password || undefined,
        tls: tls ? {} : undefined,
        db: 0, // Cluster mode doesn't support db selection
        keyPrefix,
        connectTimeout: connectTimeout || 5000,
        maxRetriesPerRequest: maxRetriesPerRequest || 3,
        enableReadyCheck: enableReadyCheck !== false,
        enableOfflineQueue: enableOfflineQueue !== false,
      },
      scaleReads: 'slave', // Read from replicas when possible
      maxRedirections: 16,
      retryDelayOnFailover: 100
    });
  } else {
    // Create a standard Redis client
    logger.debug('Creating Redis standalone client', { host, port, db });
    
    client = new Redis({
      host,
      port,
      password: password || undefined,
      db,
      tls: tls ? {} : undefined,
      keyPrefix,
      connectTimeout: connectTimeout || 5000,
      maxRetriesPerRequest: maxRetriesPerRequest || 3,
      enableReadyCheck: enableReadyCheck !== false,
      enableOfflineQueue: enableOfflineQueue !== false,
    });
  }
  
  // Set up event handlers for connection management
  client.on('connect', () => {
    logger.info('Redis client connected', { host, port });
  });
  
  client.on('ready', () => {
    logger.info('Redis client ready and accepting commands');
  });
  
  client.on('error', (err) => {
    logger.error('Redis client error', { error: err.message, stack: err.stack });
  });
  
  client.on('close', () => {
    logger.info('Redis client connection closed');
  });
  
  client.on('reconnecting', (timeToReconnect) => {
    logger.info('Redis client reconnecting', { timeToReconnect });
  });
  
  client.on('end', () => {
    logger.info('Redis client connection ended');
  });
  
  return client;
}

/**
 * Safely closes the Redis client connection
 * 
 * @returns Promise that resolves when connection is closed
 */
export async function closeConnection(): Promise<void> {
  if (redisClient) {
    try {
      logger.info('Closing Redis connection');
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis connection closed successfully');
    } catch (error) {
      logger.error('Error closing Redis connection', { error });
      throw error;
    }
  }
}

// Initialize the Redis client
try {
  const config = getRedisConfig();
  redisClient = createRedisClient(config);
  logger.info('Redis client initialized successfully');
} catch (error) {
  logger.error('Failed to initialize Redis client', { error });
  // Allow the application to continue without Redis if in development
  if (NODE_ENV === 'production' || NODE_ENV === 'staging') {
    throw error;
  }
}

// Export Redis client and configuration
export const redisConfig = getRedisConfig();

/**
 * Redis client wrapper with common operations
 */
const redis = {
  /**
   * Get a value by key
   * 
   * @param key - Cache key
   * @returns Stored value or null
   */
  async get(key: string): Promise<string | null> {
    if (!redisClient) return null;
    
    try {
      return await redisClient.get(key);
    } catch (error) {
      logger.error('Redis get error', { key, error });
      return null;
    }
  },
  
  /**
   * Set a value with optional expiration
   * 
   * @param key - Cache key
   * @param value - Value to store
   * @param ttl - Time to live in seconds (optional, uses default if not specified)
   * @returns Success status
   */
  async set(key: string, value: string | number | boolean, ttl?: number): Promise<string | null> {
    if (!redisClient) return null;
    
    try {
      const config = getRedisConfig();
      const expiry = ttl || config.ttl || 3600;
      
      return await redisClient.set(key, String(value), 'EX', expiry);
    } catch (error) {
      logger.error('Redis set error', { key, error });
      return null;
    }
  },
  
  /**
   * Delete a key
   * 
   * @param key - Cache key
   * @returns Number of keys removed
   */
  async del(key: string): Promise<number> {
    if (!redisClient) return 0;
    
    try {
      return await redisClient.del(key);
    } catch (error) {
      logger.error('Redis del error', { key, error });
      return 0;
    }
  },
  
  /**
   * Find keys matching a pattern
   * 
   * @param pattern - Key pattern
   * @returns Matching keys
   */
  async keys(pattern: string): Promise<string[]> {
    if (!redisClient) return [];
    
    try {
      return await redisClient.keys(pattern);
    } catch (error) {
      logger.error('Redis keys error', { pattern, error });
      return [];
    }
  },
  
  /**
   * Get multiple values
   * 
   * @param keys - Array of keys
   * @returns Array of values
   */
  async mget(...keys: string[]): Promise<(string | null)[]> {
    if (!redisClient) return keys.map(() => null);
    
    try {
      return await redisClient.mget(...keys);
    } catch (error) {
      logger.error('Redis mget error', { keys, error });
      return keys.map(() => null);
    }
  },
  
  /**
   * Set multiple key-value pairs
   * 
   * @param keyValues - Key-value pairs object
   * @returns Success status
   */
  async mset(keyValues: Record<string, string | number | boolean>): Promise<string | null> {
    if (!redisClient) return null;
    
    try {
      const entries = Object.entries(keyValues)
        .reduce((acc, [key, value]) => [...acc, key, String(value)], [] as string[]);
      
      return await redisClient.mset(...entries);
    } catch (error) {
      logger.error('Redis mset error', { error });
      return null;
    }
  },
  
  /**
   * Set value with expiration
   * 
   * @param key - Cache key
   * @param ttl - Time to live in seconds
   * @param value - Value to store
   * @returns Success status
   */
  async setex(key: string, ttl: number, value: string | number | boolean): Promise<string | null> {
    if (!redisClient) return null;
    
    try {
      return await redisClient.setex(key, ttl, String(value));
    } catch (error) {
      logger.error('Redis setex error', { key, ttl, error });
      return null;
    }
  },
  
  /**
   * Increment a value
   * 
   * @param key - Cache key
   * @returns Incremented value
   */
  async incr(key: string): Promise<number> {
    if (!redisClient) return 0;
    
    try {
      return await redisClient.incr(key);
    } catch (error) {
      logger.error('Redis incr error', { key, error });
      return 0;
    }
  },
  
  /**
   * Set expiration timestamp
   * 
   * @param key - Cache key
   * @param timestamp - UNIX timestamp
   * @returns Success (1) or failure (0)
   */
  async expireat(key: string, timestamp: number): Promise<number> {
    if (!redisClient) return 0;
    
    try {
      return await redisClient.expireat(key, timestamp);
    } catch (error) {
      logger.error('Redis expireat error', { key, timestamp, error });
      return 0;
    }
  },
  
  /**
   * Check connection health
   * 
   * @returns PONG or null if error
   */
  async ping(): Promise<string | null> {
    if (!redisClient) return null;
    
    try {
      return await redisClient.ping();
    } catch (error) {
      logger.error('Redis ping error', { error });
      return null;
    }
  }
};

// Export the wrapper and Redis client
export default redis;
export { redisClient };