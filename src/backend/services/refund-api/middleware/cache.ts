import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { redisClient } from '../../../config/redis';
import config from '../../../config';
import { logger } from '../../../common/utils/logger';
import { StatusCode, HTTP_STATUS_CODES } from '../../../common/constants/status-codes';

/**
 * List of HTTP status codes that are cacheable
 */
export const CACHEABLE_STATUS_CODES = [
  HTTP_STATUS_CODES[StatusCode.OK],          // 200
  HTTP_STATUS_CODES[StatusCode.NO_CONTENT],  // 204
  300, // Multiple choices
  301, // Moved permanently
  302, // Found
  304, // Not modified
  307, // Temporary redirect
  308  // Permanent redirect
];

/**
 * Interface defining cache middleware options
 */
interface CacheOptions {
  /** TTL in seconds */
  ttl?: number;
  /** Cache key prefix */
  keyPrefix?: string;
  /** Whether to include user ID in cache key */
  userSensitive?: boolean;
  /** Whether to include user roles in cache key */
  roleSensitive?: boolean;
  /** Custom function to check if request is cacheable */
  isCacheableCheck?: (req: Request) => boolean;
  /** Custom function to generate cache key */
  keyGenerator?: (req: Request) => string;
}

/**
 * Default cache middleware with standard configuration
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function cacheMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Get default cache settings from config
  const options: CacheOptions = {
    ttl: config.server?.cache?.ttl || 3600, // 1 hour default
    keyPrefix: config.server?.cache?.keyPrefix || 'refund-api:',
    userSensitive: true,
    roleSensitive: true
  };
  
  // Create and apply a cache middleware using the default settings
  const middleware = createCacheMiddleware(options);
  return middleware(req, res, next);
}

/**
 * Factory function to create a custom cache middleware with specified options
 * 
 * @param options - Cache middleware options
 * @returns Configured cache middleware function
 */
export function createCacheMiddleware(options: CacheOptions = {}) {
  // Default options
  const defaultOptions: CacheOptions = {
    ttl: config.server?.cache?.ttl || 3600, // 1 hour default
    keyPrefix: config.server?.cache?.keyPrefix || 'refund-api:',
    userSensitive: true,
    roleSensitive: true
  };
  
  // Merge provided options with defaults
  const mergedOptions: CacheOptions = { ...defaultOptions, ...options };
  
  // Return middleware function
  return async function(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Only cache cacheable requests
      if (!isCacheable(req, mergedOptions)) {
        return next();
      }
      
      // Generate cache key
      const cacheKey = generateCacheKey(req, mergedOptions);
      
      try {
        // Try to get from cache
        const cachedResponse = await redisClient.get(cacheKey);
        
        if (cachedResponse) {
          // Cache hit
          logger.debug('Cache hit', { cacheKey, path: req.path });
          
          try {
            const parsedResponse = JSON.parse(cachedResponse);
            
            // Send cached response
            res.status(parsedResponse.status);
            
            // Set headers from cached response
            if (parsedResponse.headers) {
              Object.entries(parsedResponse.headers).forEach(([key, value]) => {
                if (typeof value !== 'undefined' && key.toLowerCase() !== 'set-cookie') {
                  res.setHeader(key, value as string);
                }
              });
            }
            
            // Add header indicating cache hit
            res.setHeader('X-Cache', 'HIT');
            
            // Send cached response body
            return res.send(parsedResponse.body);
          } catch (parseError) {
            logger.error('Error parsing cached response', { cacheKey, error: parseError.message });
            // Continue with request if parsing fails
          }
        }
        
        // Cache miss - capture response
        logger.debug('Cache miss', { cacheKey, path: req.path });
        
        // Add header indicating cache miss
        res.setHeader('X-Cache', 'MISS');
        
        // Store original send method to restore later
        const originalSend = res.send;
        
        // Override send method to capture response
        res.send = function(body: any): Response {
          // Restore original send to prevent recursion
          res.send = originalSend;
          
          // Call original send to deliver response to client
          const result = originalSend.call(this, body);
          
          // Only cache if status code is cacheable
          if (isCacheableStatus(res.statusCode)) {
            // Prepare response for caching
            const responseToCache = {
              status: res.statusCode,
              headers: res.getHeaders(),
              body
            };
            
            // Cache the response
            redisClient.setex(cacheKey, mergedOptions.ttl || 3600, JSON.stringify(responseToCache))
              .catch(err => {
                logger.error('Error caching response', { cacheKey, error: err.message });
              });
          }
          
          return result;
        };
        
        // Proceed with the request
        next();
      } catch (redisError) {
        logger.error('Redis error in cache middleware', { 
          cacheKey, 
          path: req.path, 
          error: redisError.message 
        });
        next();
      }
    } catch (error) {
      logger.error('Unexpected error in cache middleware', {
        path: req.path,
        error: error.message
      });
      next();
    }
  };
}

/**
 * Determines if a request is eligible for caching
 * 
 * @param req - Express request object
 * @param options - Cache options
 * @returns Whether the request is cacheable
 */
function isCacheable(req: Request, options: CacheOptions): boolean {
  // Check if caching is enabled globally
  if (config.environment === 'development' && config.server?.cache?.enabled === false) {
    return false;
  }
  
  // Only cache GET requests
  if (req.method !== 'GET') {
    return false;
  }
  
  // Check for cache control headers that bypass cache
  const cacheControl = req.headers['cache-control'];
  if (cacheControl && (
    cacheControl.includes('no-cache') || 
    cacheControl.includes('no-store') || 
    cacheControl.includes('max-age=0')
  )) {
    return false;
  }
  
  // Check for cache bypass headers
  if (req.headers['x-bypass-cache'] === 'true') {
    return false;
  }
  
  // Apply custom cacheable check if provided in options
  if (options.isCacheableCheck && !options.isCacheableCheck(req)) {
    return false;
  }
  
  return true;
}

/**
 * Generates a unique cache key based on request properties
 * 
 * @param req - Express request object
 * @param options - Cache options
 * @returns Unique cache key for the request
 */
function generateCacheKey(req: Request, options: CacheOptions): string {
  // Start with the configured key prefix
  let key = options.keyPrefix || '';
  
  // Add normalized URL path
  const path = req.path.endsWith('/') && req.path.length > 1 
    ? req.path.slice(0, -1) 
    : req.path;
  key += path;
  
  // Add sorted query parameters
  if (Object.keys(req.query).length > 0) {
    const sortedQuery = Object.keys(req.query).sort().map(k => {
      const value = req.query[k];
      // Handle array values
      if (Array.isArray(value)) {
        return `${k}=${value.sort().join(',')}`;
      }
      return `${k}=${value}`;
    }).join('&');
    
    key += `?${sortedQuery}`;
  }
  
  // Add user ID if authenticated and userSensitive option is true
  if (options.userSensitive && req.user && (req.user as any).id) {
    key += `|user:${(req.user as any).id}`;
  }
  
  // Add role information if roleSensitive option is true
  if (options.roleSensitive && req.user && (req.user as any).roles) {
    const roles = Array.isArray((req.user as any).roles) 
      ? (req.user as any).roles.sort().join(',')
      : (req.user as any).roles;
    key += `|roles:${roles}`;
  }
  
  // Apply custom key generator function if provided
  if (options.keyGenerator) {
    return options.keyGenerator(req);
  }
  
  // Calculate hash of the combined string for consistent length keys
  return createHash('md5').update(key).digest('hex');
}

/**
 * Checks if an HTTP status code is eligible for caching
 * 
 * @param statusCode - HTTP status code
 * @returns Whether the status code is cacheable
 */
function isCacheableStatus(statusCode: number): boolean {
  return CACHEABLE_STATUS_CODES.includes(statusCode);
}