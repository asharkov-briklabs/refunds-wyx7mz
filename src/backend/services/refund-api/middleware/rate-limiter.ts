/**
 * Rate Limiter Middleware for Refund API
 * 
 * This middleware implements rate limiting to prevent API abuse and ensure fair usage.
 * It uses Redis to track request counts across distributed services and supports
 * different rate limits for different user roles and endpoints.
 * 
 * @module middleware/rate-limiter
 */

import { Request, Response, NextFunction } from 'express'; // express ^4.18.2
import ms from 'ms'; // ms ^2.1.3
import { redisClient } from '../../../config/redis';
import config from '../../../config';
import { ApiError } from '../../../common/errors/api-error';
import { ErrorCode } from '../../../common/constants/error-codes';
import { logger } from '../../../common/utils/logger';
import { incrementCounter } from '../../../common/utils/metrics';

/**
 * Interface for rate limiter configuration options
 */
interface RateLimiterOptions {
  /** Maximum number of requests allowed within the window */
  max: number;
  
  /** Time window in milliseconds or as a string (e.g., '15m', '1h') */
  windowMs: number | string;
  
  /** Message to send when rate limit is exceeded */
  message?: string;
  
  /** Function to generate a unique key for the client */
  keyGenerator?: (req: Request) => string;
  
  /** Whether to skip the middleware entirely */
  skip?: (req: Request) => boolean;
  
  /** Redis key prefix */
  keyPrefix?: string;
  
  /** Whether to send rate limit headers with the response */
  headers?: boolean;
}

/**
 * Default rate limiter options
 */
const defaultOptions: RateLimiterOptions = {
  max: 100, // Default 100 requests per window
  windowMs: 60 * 1000, // Default 1 minute window
  message: 'Rate limit exceeded, please try again later',
  keyPrefix: 'ratelimit:',
  headers: true
};

/**
 * Generates a unique key for rate limiting based on client IP or user ID
 * 
 * @param req - Express request object
 * @returns Unique key for the client
 */
function generateKey(req: Request): string {
  // Get client IP from X-Forwarded-For header or connection
  const ip = (req.headers['x-forwarded-for'] || 
              req.connection.remoteAddress || 
              '').toString().split(',')[0].trim();
  
  // If user is authenticated, use user ID
  const userId = req.user?.id || '';
  
  // Get the route path for route-specific limiting
  const path = req.path;
  
  // If user ID is available, use it with the path
  if (userId) {
    return `${userId}:${path}`;
  }
  
  // Otherwise, use IP with the path
  return `${ip}:${path}`;
}

/**
 * Generates rate limit HTTP headers based on the current limit state
 * 
 * @param limit - Maximum requests allowed
 * @param remaining - Remaining requests allowed
 * @param resetTime - Time when the limit resets (Unix timestamp)
 * @returns Object containing rate limit headers
 */
function getHeaders(limit: number, remaining: number, resetTime: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetTime.toString(),
    'X-RateLimit-Resource': 'refund-api'
  };
}

/**
 * Determines the appropriate rate limits based on the user's role
 * 
 * @param req - Express request object
 * @param defaultLimits - Default rate limit options
 * @returns Rate limit configuration for the user
 */
function getUserLimits(req: Request, defaultLimits: RateLimiterOptions): RateLimiterOptions {
  // If no user is authenticated, use default limits
  if (!req.user) {
    return defaultLimits;
  }

  // Get user role from the request
  const userRole = req.user.role;

  // Apply role-based rate limit configuration
  if (userRole === 'BARRACUDA_ADMIN' || userRole === 'BANK_ADMIN') {
    // Higher limits for admin users
    return {
      ...defaultLimits,
      max: defaultLimits.max * 2, // Double the default limit
    };
  } 
  else if (userRole === 'ORGANIZATION_ADMIN') {
    // Medium limits for organization admins
    return {
      ...defaultLimits,
      max: Math.floor(defaultLimits.max * 1.5), // 1.5x the default limit
    };
  }
  else if (userRole === 'API_CLIENT') {
    // Configurable limits for API clients
    const apiClientConfig = config.server?.rateLimit?.apiClient || {};
    return {
      ...defaultLimits,
      max: apiClientConfig.max || defaultLimits.max,
      windowMs: apiClientConfig.windowMs || defaultLimits.windowMs
    };
  }

  // Standard limits for regular users (MERCHANT_ADMIN, etc.)
  return defaultLimits;
}

/**
 * Factory function to create a custom rate limiting middleware with specified options
 * 
 * @param options - Custom rate limiter options
 * @returns Configured rate limiting middleware function
 */
function createRateLimiter(options: Partial<RateLimiterOptions> = {}) {
  // Merge with default options
  const opts: RateLimiterOptions = { ...defaultOptions, ...options };
  
  // Convert string windowMs to number if needed
  if (typeof opts.windowMs === 'string') {
    opts.windowMs = ms(opts.windowMs);
  }
  
  // Use custom key generator or default function
  const keyGenerator = opts.keyGenerator || generateKey;
  
  // Return middleware function
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip middleware if requested
    if (opts.skip && opts.skip(req)) {
      return next();
    }
    
    // Apply user-specific limits if applicable
    const userLimits = getUserLimits(req, opts);
    
    // Generate the unique key for this client
    const key = `${opts.keyPrefix}${keyGenerator(req)}`;
    
    try {
      // Get the current count from Redis
      const currentCount = await redisClient.incr(key);
      
      // Set expiration on first request
      if (currentCount === 1) {
        // Calculate reset timestamp (seconds since epoch)
        const windowSeconds = Math.floor(
          typeof userLimits.windowMs === 'string' 
            ? ms(userLimits.windowMs) / 1000 
            : userLimits.windowMs / 1000
        );
        const resetTime = Math.floor(Date.now() / 1000) + windowSeconds;
        await redisClient.expireat(key, resetTime);
      }
      
      // Get Redis TTL to determine reset time
      const ttl = await redisClient.ttl(key);
      const resetTime = Math.floor(Date.now() / 1000) + (ttl > 0 ? ttl : 0);
      
      // Calculate remaining requests
      const remaining = Math.max(0, userLimits.max - currentCount);
      
      // Set rate limit headers if enabled
      if (userLimits.headers !== false) {
        const headers = getHeaders(userLimits.max, remaining, resetTime);
        res.set(headers);
      }
      
      // If limit is exceeded, return error
      if (currentCount > userLimits.max) {
        // Increment rate limit exceeded metric
        incrementCounter('rate_limiter.exceeded', 1, {
          path: req.path,
          method: req.method,
          user_role: req.user?.role || 'anonymous'
        });
        
        // Log rate limit exceeded
        logger.warn('Rate limit exceeded', {
          key,
          limit: userLimits.max,
          current: currentCount,
          path: req.path,
          method: req.method,
          ip: req.ip,
          user_id: req.user?.id
        });
        
        // Create API error
        const error = new ApiError(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          userLimits.message || opts.message,
          {
            limit: userLimits.max,
            current: currentCount,
            remaining: 0,
            retry_after: resetTime - Math.floor(Date.now() / 1000)
          }
        );
        
        // Set Retry-After header
        res.set('Retry-After', String(resetTime - Math.floor(Date.now() / 1000)));
        
        // Return 429 Too Many Requests
        return res.status(error.httpStatus).json(error.toJSON());
      }
      
      // Log rate limit state for debugging
      logger.debug('Rate limit state', {
        key,
        current: currentCount,
        limit: userLimits.max,
        remaining,
        reset: resetTime
      });
      
      // If limit is not exceeded, proceed to next middleware
      return next();
    } catch (error) {
      // Log error
      logger.error('Rate limiter error', { error, key });
      
      // Proceed to next middleware in case of error to avoid blocking requests
      return next();
    }
  };
}

/**
 * Default rate limiting middleware with standard configuration
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Get default rate limit settings from config
  const defaultLimits: RateLimiterOptions = {
    windowMs: config.server?.rateLimit?.windowMs || 900000, // 15 minutes
    max: config.server?.rateLimit?.max || 100, // 100 requests per window
    message: 'Rate limit exceeded, please try again later'
  };
  
  // Create and apply a rate limiter middleware using the default settings
  const limiter = createRateLimiter(defaultLimits);
  return limiter(req, res, next);
};

// Export the rate limiter functions
export {
  rateLimiter,
  createRateLimiter
};