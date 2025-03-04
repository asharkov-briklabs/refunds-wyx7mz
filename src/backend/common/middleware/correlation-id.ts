import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { setCorrelationId, getCorrelationId, logger } from '../utils/logger';

// Header name for correlation ID
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Express middleware that ensures every request has a correlation ID for tracking across services
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Extract or generate correlation ID
  const correlationId = extractCorrelationId(req);
  
  // Store in AsyncLocalStorage for the current execution context
  setCorrelationId(correlationId);
  
  // Add to response headers for client visibility
  res.setHeader(CORRELATION_ID_HEADER, correlationId);
  
  // Log with debug level
  logger.debug(`Request correlation ID: ${correlationId}`, {
    path: req.path,
    method: req.method,
    isNewId: !req.headers[CORRELATION_ID_HEADER.toLowerCase()]
  });
  
  // Continue to next middleware
  next();
}

/**
 * Extracts correlation ID from request headers if present, otherwise generates a new one
 * 
 * @param req - Express request object
 * @returns Correlation ID (either extracted or newly generated)
 */
function extractCorrelationId(req: Request): string {
  // Look for existing correlation ID in request headers (case-insensitive)
  const headerNames = Object.keys(req.headers);
  const correlationIdHeaderName = headerNames.find(
    h => h.toLowerCase() === CORRELATION_ID_HEADER.toLowerCase()
  );

  // If header exists, use its value
  if (correlationIdHeaderName && req.headers[correlationIdHeaderName]) {
    return req.headers[correlationIdHeaderName] as string;
  }

  // Otherwise generate a new UUID
  return uuidv4();
}

/**
 * Utility function to add correlation ID to headers for outgoing requests to other services
 * 
 * @param headers - Headers object for the outgoing request
 * @returns Headers object with correlation ID added
 */
export function attachCorrelationIdToClient(headers: Record<string, string> = {}): Record<string, string> {
  const correlationId = getCorrelationId();
  
  if (correlationId) {
    headers[CORRELATION_ID_HEADER] = correlationId;
  }
  
  return headers;
}