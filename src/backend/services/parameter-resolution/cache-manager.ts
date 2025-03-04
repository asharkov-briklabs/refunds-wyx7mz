import { logger } from '../../common/utils/logger';
import { redisClient, redisConfig } from '../../config/redis';
import { ParameterValue, ParameterEntityType } from './models/index';

// Default TTL if not specified in config or method call
const DEFAULT_TTL = redisConfig.ttl || 300; // 5 minutes default

// Standard prefix for parameter keys
const PARAMETER_KEY_PREFIX = redisConfig.keyPrefix 
  ? `${redisConfig.keyPrefix}:parameter:` 
  : 'parameter:';

/**
 * Creates a consistent cache key for parameter values
 * 
 * @param parameterName - Name of the parameter
 * @param entityId - ID of the entity (merchant, organization, etc.)
 * @returns Formatted cache key
 */
export function cacheKey(parameterName: string, entityId: string): string {
  // Normalize the parameter name
  const normalizedName = parameterName.trim().toLowerCase();
  
  // Return formatted key
  return `${PARAMETER_KEY_PREFIX}${normalizedName}:${entityId}`;
}

/**
 * Creates a pattern key for invalidating hierarchical parameters
 * 
 * @param parameterName - Name of the parameter
 * @param entityType - Type of entity (MERCHANT, ORGANIZATION, etc.)
 * @param entityId - ID of the entity
 * @returns Pattern key for hierarchy invalidation
 */
function hierarchyPatternKey(
  parameterName: string, 
  entityType: ParameterEntityType, 
  entityId: string
): string {
  // Normalize the parameter name
  const normalizedName = parameterName.trim().toLowerCase();
  
  // Create a pattern based on parameter name to invalidate all related entries
  return `${PARAMETER_KEY_PREFIX}${normalizedName}:*`;
}

/**
 * Manages Redis-based caching for parameter values with appropriate TTL and invalidation strategies
 */
class ParameterCache {
  private defaultTtl: number;

  /**
   * Creates a new parameter cache instance
   * 
   * @param ttl - Default TTL in seconds for cached values
   */
  constructor(ttl?: number) {
    this.defaultTtl = ttl || DEFAULT_TTL;
  }

  /**
   * Retrieves a parameter value from cache
   * 
   * @param parameterName - Name of the parameter to retrieve
   * @param entityId - ID of the entity
   * @returns Cached parameter value or null if not found
   */
  async get(parameterName: string, entityId: string): Promise<ParameterValue | null> {
    try {
      const key = cacheKey(parameterName, entityId);
      logger.debug(`Retrieving parameter from cache: ${key}`);
      
      const cachedValue = await redisClient.get(key);
      
      if (!cachedValue) {
        logger.debug(`Cache miss for parameter: ${key}`);
        return null;
      }
      
      // Parse the cached JSON and convert to ParameterValue
      const parsedValue = JSON.parse(cachedValue);
      logger.debug(`Cache hit for parameter: ${key}`);
      
      return parsedValue as ParameterValue;
    } catch (err) {
      logger.error(`Error retrieving parameter from cache: ${err.message}`, { 
        parameterName, 
        entityId, 
        error: err 
      });
      return null;
    }
  }

  /**
   * Stores a parameter value in cache with TTL
   * 
   * @param parameterName - Name of the parameter
   * @param entityId - ID of the entity
   * @param value - Parameter value to store
   * @param ttl - Optional TTL in seconds (overrides default)
   * @returns True if successful, false otherwise
   */
  async set(
    parameterName: string, 
    entityId: string, 
    value: ParameterValue, 
    ttl?: number
  ): Promise<boolean> {
    try {
      const key = cacheKey(parameterName, entityId);
      const expiryTime = ttl || this.defaultTtl;
      
      logger.debug(`Storing parameter in cache: ${key}, TTL: ${expiryTime}s`);
      
      // Convert value to JSON string for storage
      const valueJson = JSON.stringify(value);
      
      // Store in Redis with expiration
      await redisClient.setex(key, expiryTime, valueJson);
      
      return true;
    } catch (err) {
      logger.error(`Error storing parameter in cache: ${err.message}`, { 
        parameterName, 
        entityId, 
        error: err 
      });
      return false;
    }
  }

  /**
   * Retrieves multiple parameter values in a single operation
   * 
   * @param parameterNames - Array of parameter names to retrieve
   * @param entityId - ID of the entity
   * @returns Map of parameter names to values for those found in cache
   */
  async getBulk(
    parameterNames: string[], 
    entityId: string
  ): Promise<Map<string, ParameterValue>> {
    try {
      if (!parameterNames || parameterNames.length === 0) {
        return new Map();
      }
      
      // Generate cache keys for all parameters
      const keys = parameterNames.map(name => cacheKey(name, entityId));
      
      logger.debug(`Retrieving bulk parameters from cache: ${keys.join(', ')}`);
      
      // Use Redis MGET to retrieve multiple values in one operation
      const cachedValues = await redisClient.mget(...keys);
      
      // Process results into a Map
      const result = new Map<string, ParameterValue>();
      
      parameterNames.forEach((name, index) => {
        const value = cachedValues[index];
        if (value) {
          try {
            // Parse the cached JSON and add to result map
            result.set(name, JSON.parse(value) as ParameterValue);
          } catch (parseErr) {
            logger.error(`Error parsing cached value for parameter ${name}: ${parseErr.message}`);
            // Continue with other parameters even if one fails to parse
          }
        }
      });
      
      logger.debug(`Retrieved ${result.size} of ${parameterNames.length} parameters from cache`);
      
      return result;
    } catch (err) {
      logger.error(`Error retrieving bulk parameters from cache: ${err.message}`, { 
        parameterNames, 
        entityId,
        error: err 
      });
      return new Map();
    }
  }

  /**
   * Stores multiple parameter values in a single operation
   * 
   * @param parameterValues - Map of parameter names to values
   * @param entityId - ID of the entity
   * @param ttl - Optional TTL in seconds (overrides default)
   * @returns True if successful, false otherwise
   */
  async setBulk(
    parameterValues: Map<string, ParameterValue>, 
    entityId: string,
    ttl?: number
  ): Promise<boolean> {
    try {
      if (!parameterValues || parameterValues.size === 0) {
        return true; // Nothing to store
      }
      
      const expiryTime = ttl || this.defaultTtl;
      
      logger.debug(`Storing ${parameterValues.size} parameters in cache for entity ${entityId}`);
      
      // Use pipeline for efficient multi-key setting
      const pipeline = redisClient.pipeline();
      
      // Add each parameter to pipeline
      for (const [name, value] of parameterValues.entries()) {
        const key = cacheKey(name, entityId);
        const valueJson = JSON.stringify(value);
        
        // Add SETEX command to pipeline
        pipeline.setex(key, expiryTime, valueJson);
      }
      
      // Execute pipeline
      await pipeline.exec();
      
      return true;
    } catch (err) {
      logger.error(`Error storing bulk parameters in cache: ${err.message}`, { 
        parameterCount: parameterValues.size,
        entityId,
        error: err 
      });
      return false;
    }
  }

  /**
   * Invalidates a specific cached parameter
   * 
   * @param parameterName - Name of the parameter to invalidate
   * @param entityId - ID of the entity
   * @returns True if successful, false otherwise
   */
  async invalidate(parameterName: string, entityId: string): Promise<boolean> {
    try {
      const key = cacheKey(parameterName, entityId);
      
      logger.debug(`Invalidating parameter cache: ${key}`);
      
      // Delete key from Redis
      await redisClient.del(key);
      
      return true;
    } catch (err) {
      logger.error(`Error invalidating parameter cache: ${err.message}`, { 
        parameterName, 
        entityId,
        error: err 
      });
      return false;
    }
  }

  /**
   * Invalidates all related parameters in a hierarchy when a parameter changes
   * 
   * @param parameterName - Name of the parameter
   * @param entityType - Type of entity that changed
   * @param entityId - ID of the entity that changed
   * @returns Number of keys invalidated
   */
  async invalidateHierarchy(
    parameterName: string, 
    entityType: ParameterEntityType, 
    entityId: string
  ): Promise<number> {
    try {
      // Generate pattern for hierarchy invalidation
      const pattern = hierarchyPatternKey(parameterName, entityType, entityId);
      
      logger.debug(`Invalidating parameter hierarchy: ${pattern}`);
      
      // Find all matching keys
      const keys = await redisClient.keys(pattern);
      
      if (keys.length === 0) {
        logger.debug(`No keys found for pattern: ${pattern}`);
        return 0;
      }
      
      // Delete all matching keys
      await redisClient.del(...keys);
      
      logger.debug(`Invalidated ${keys.length} parameter cache entries`);
      
      return keys.length;
    } catch (err) {
      logger.error(`Error invalidating parameter hierarchy: ${err.message}`, { 
        parameterName, 
        entityType,
        entityId,
        error: err 
      });
      return 0;
    }
  }

  /**
   * Invalidates cache entries based on a key pattern
   * 
   * @param pattern - Redis key pattern to match
   * @returns Number of keys invalidated
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      // Ensure pattern includes the parameter key prefix
      const fullPattern = pattern.startsWith(PARAMETER_KEY_PREFIX) 
        ? pattern 
        : `${PARAMETER_KEY_PREFIX}${pattern}`;
      
      logger.debug(`Invalidating cache by pattern: ${fullPattern}`);
      
      // Find all matching keys
      const keys = await redisClient.keys(fullPattern);
      
      if (keys.length === 0) {
        logger.debug(`No keys found for pattern: ${fullPattern}`);
        return 0;
      }
      
      // Delete all matching keys
      await redisClient.del(...keys);
      
      logger.debug(`Invalidated ${keys.length} cache entries for pattern: ${fullPattern}`);
      
      return keys.length;
    } catch (err) {
      logger.error(`Error invalidating cache by pattern: ${err.message}`, { 
        pattern,
        error: err 
      });
      return 0;
    }
  }
}

export default ParameterCache;
export { cacheKey };