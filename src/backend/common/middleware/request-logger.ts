import { Request, Response, NextFunction } from 'express'; // express 4.18.2
import onFinished from 'on-finished'; // on-finished 2.4.1
import { logger, maskPII, getCorrelationId } from '../utils/logger';

/**
 * Express middleware that logs HTTP request details, handling both request and response phases
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Record the start time of the request
  const startTime = process.hrtime();

  // Extract request information for logging
  const requestInfo = extractRequestInfo(req);

  // Function to log request details after completion
  const logRequest = () => {
    // Calculate response time
    const hrDuration = process.hrtime(startTime);
    const responseTimeMs = (hrDuration[0] * 1000 + hrDuration[1] / 1000000).toFixed(2);

    // Get correlation ID
    const correlationId = getCorrelationId();

    // Prepare log entry
    const logEntry = {
      type: 'request',
      correlationId,
      request: requestInfo,
      response: {
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        responseTime: `${responseTimeMs}ms`,
        contentLength: res.get('content-length') || 0,
        contentType: res.get('content-type') || 'unknown',
      },
      metadata: {
        userAgent: req.headers['user-agent'] || 'unknown',
        referer: req.headers.referer || '',
        ip: getClientIp(req),
        route: getRouteInfo(req),
      }
    };

    // Log at appropriate level based on status code
    if (res.statusCode < 400) {
      if (res.statusCode >= 300) {
        // Redirects
        logger.info('HTTP redirect', logEntry);
      } else {
        // Success
        logger.info('HTTP request completed', logEntry);
      }
    } else if (res.statusCode < 500) {
      // Client errors
      logger.info('HTTP client error', logEntry);
    } else {
      // Server errors
      logger.info('HTTP server error', logEntry);
    }

    // Only log sensitive details in non-production environments
    if (process.env.NODE_ENV !== 'production' && process.env.LOG_LEVEL === 'debug') {
      logger.debug('HTTP request details', {
        ...logEntry,
        request: {
          ...logEntry.request,
          params: req.params,
          body: sanitizeRequestBody(req.body),
        }
      });
    }
  };

  // Register callback for when request finishes
  onFinished(res, logRequest);

  // Continue to next middleware
  next();
};

/**
 * Extracts and sanitizes information from the request object for logging
 *
 * @param req - Express request object
 * @returns Sanitized request information for logging
 */
function extractRequestInfo(req: Request): object {
  // Extract basic request info
  const info: Record<string, any> = {
    method: req.method,
    path: req.path,
    query: req.query,
    headers: maskSensitiveHeaders(req.headers),
  };

  // Add authenticated user info if available
  // This handles various auth middleware patterns
  const user = (req as any).user || (req as any).auth;
  if (user) {
    info['user'] = maskUserInfo(user);
  }

  return info;
}

/**
 * Masks sensitive information in request headers
 *
 * @param headers - Headers object from request
 * @returns Headers with sensitive information masked
 */
function maskSensitiveHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string | string[] | undefined> {
  const maskedHeaders: Record<string, string | string[] | undefined> = {};

  // List of sensitive headers to mask
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'x-access-token',
    'set-cookie',
    'proxy-authorization'
  ];

  // Copy and mask headers
  Object.keys(headers).forEach(key => {
    const value = headers[key];
    
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      if (typeof value === 'string') {
        maskedHeaders[key] = value.startsWith('Bearer ') 
          ? 'Bearer ***' 
          : '***';
      } else if (Array.isArray(value)) {
        maskedHeaders[key] = value.map(() => '***');
      } else {
        maskedHeaders[key] = '***';
      }
    } else {
      maskedHeaders[key] = value;
    }
  });

  return maskedHeaders;
}

/**
 * Gets the client IP address from various possible request headers
 *
 * @param req - Express request object
 * @returns Client IP address
 */
function getClientIp(req: Request): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for may be a comma-separated list
    return (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0]).trim();
  }
  
  return (
    (req.headers['x-real-ip'] as string) ||
    req.ip ||
    (req.connection && req.connection.remoteAddress) ||
    'unknown'
  );
}

/**
 * Gets route information if available from Express router
 *
 * @param req - Express request object
 * @returns Route path or undefined
 */
function getRouteInfo(req: Request): string | undefined {
  // Express route information
  if (req.route && req.route.path) {
    return req.route.path;
  }

  // For routers that attach baseUrl
  if (req.baseUrl) {
    return `${req.baseUrl}${req.path}`;
  }

  return undefined;
}

/**
 * Masks user information while preserving useful identifiers
 *
 * @param user - User object from request
 * @returns Masked user information
 */
function maskUserInfo(user: any): object {
  if (!user) return {};
  
  // Create a safe subset of user information
  const safeUser: Record<string, any> = {};
  
  // Preserve ID fields
  if (user.id) safeUser.id = user.id;
  if (user.userId) safeUser.userId = user.userId;
  if (user.sub) safeUser.sub = user.sub;
  
  // Include roles/permissions for authorization context
  if (user.roles) safeUser.roles = user.roles;
  if (user.permissions) safeUser.permissions = user.permissions;
  
  // Add masked email if present
  if (user.email) safeUser.email = maskPII(user.email);
  
  // Add user type if available
  if (user.type) safeUser.type = user.type;
  
  return safeUser;
}

/**
 * Sanitizes request body for logging by selectively including non-sensitive fields
 *
 * @param body - Request body
 * @returns Sanitized body object or undefined
 */
function sanitizeRequestBody(body: any): object | undefined {
  if (!body || typeof body !== 'object') return undefined;
  
  // Default sensitive field patterns to exclude
  const sensitiveFieldPatterns = [
    /password/i,
    /token/i,
    /secret/i,
    /key/i,
    /credential/i,
    /card/i,
    /cvv/i,
    /cvc/i,
    /ssn/i,
    /social.*security/i,
    /account.*number/i,
    /routing.*number/i,
  ];
  
  // Create sanitized copy
  const sanitized: Record<string, any> = {};
  
  try {
    Object.keys(body).forEach(key => {
      // Skip obviously sensitive fields
      if (sensitiveFieldPatterns.some(pattern => pattern.test(key))) {
        sanitized[key] = '***';
        return;
      }
      
      const value = body[key];
      
      // Handle nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = sanitizeRequestBody(value);
        return;
      }
      
      // Handle potentially sensitive strings by masking PII
      if (typeof value === 'string') {
        sanitized[key] = maskPII(value);
        return;
      }
      
      // Pass through other values
      sanitized[key] = value;
    });
    
    return sanitized;
  } catch (err) {
    return { sanitizationError: 'Body could not be sanitized for logging' };
  }
}