import { Request, Response, NextFunction } from 'express'; // express@^4.18.2
import { ApiError } from '../errors/api-error';
import { ValidationError } from '../errors/validation-error';
import { BusinessError } from '../errors/business-error';
import { GatewayError } from '../errors/gateway-error';
import { ErrorCode } from '../constants/error-codes';
import { logger, getCorrelationId } from '../utils/logger';
import { recordError } from '../utils/metrics';

/**
 * Interface defining the structure of standardized API error responses
 */
interface ApiErrorResponse {
  code: string;
  message: string;
  details?: Record<string, any>;
  correlationId?: string;
  stack?: string;
}

/**
 * Express middleware that handles errors and formats standardized API responses
 * 
 * This middleware captures errors thrown during request processing and converts
 * them into a consistent error response format. It also handles logging, metrics
 * tracking, and ensures correlation IDs are preserved for tracing.
 * 
 * @param err - The error that was thrown
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  // Log the error with appropriate level and context
  if (err instanceof ApiError) {
    logger.error('API Error', { 
      error: err.message, 
      code: err.code, 
      httpStatus: err.httpStatus, 
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined 
    });
  } else {
    logger.error('Unexpected error', { 
      error: err.message, 
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined 
    });
  }

  // Extract correlation ID from the request context
  const correlationId = getCorrelationId();

  // Record the error metrics for monitoring
  recordError('api', err instanceof ApiError ? err.code : 'INTERNAL_SERVER_ERROR', getErrorMetricTags(err, req));

  // Determine the HTTP status code based on error type
  const statusCode = getErrorStatusCode(err);

  // Convert the error to a standardized format
  const errorResponse = formatErrorResponse(err, correlationId);

  // Send the formatted error response to the client
  res.status(statusCode).json(errorResponse);
}

/**
 * Formats different error types into standardized API error responses
 * 
 * @param err - Error object to format
 * @param correlationId - Optional correlation ID for request tracing
 * @returns Standardized error response object
 */
function formatErrorResponse(err: Error, correlationId?: string): ApiErrorResponse {
  let errorResponse: ApiErrorResponse;

  if (err instanceof ApiError) {
    // For ApiError and its subclasses, use the toJSON method
    errorResponse = err.toJSON();
  } else {
    // For other errors, create a generic internal server error
    errorResponse = {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: err.message || 'An unexpected error occurred'
    };
    
    // Include stack trace for non-production environments
    if (process.env.NODE_ENV !== 'production' && err.stack) {
      errorResponse.stack = err.stack;
    }
  }

  // Add correlation ID to the error response for tracing
  if (correlationId) {
    errorResponse.correlationId = correlationId;
  }

  // Remove sensitive data from error details in production
  return sanitizeErrorResponse(errorResponse);
}

/**
 * Determines the appropriate HTTP status code for different error types
 * 
 * @param err - The error to determine the status code for
 * @returns HTTP status code for the error
 */
function getErrorStatusCode(err: Error): number {
  if (err instanceof ApiError) {
    // ApiError instances have a specific HTTP status code
    return err.httpStatus;
  }
  
  // Default to 500 Internal Server Error for unexpected errors
  return 500;
}

/**
 * Generates metric tags for error tracking based on error type and context
 * 
 * @param err - The error to generate tags for
 * @param req - Express request object
 * @returns Tags object for error metrics
 */
function getErrorMetricTags(err: Error, req: Request): Record<string, string> {
  const tags: Record<string, string> = {
    path: req.path,
    method: req.method
  };

  // Extract error type based on error class name
  if (err instanceof ValidationError) {
    tags.error_type = 'validation';
    
    // Include field names with errors for validation errors
    if (err.fieldErrors && err.fieldErrors.length > 0) {
      tags.validation_fields = err.fieldErrors.map(f => f.field).join(',');
    }
  } else if (err instanceof BusinessError) {
    tags.error_type = 'business';
    
    // Include rule name if available for business errors
    if (err.ruleName) {
      tags.rule_name = err.ruleName;
    }
  } else if (err instanceof GatewayError) {
    tags.error_type = 'gateway';
    
    // Include gateway type if available for gateway errors
    if (err.gatewayErrorCode) {
      tags.gateway_error_code = err.gatewayErrorCode;
    }
  } else if (err instanceof ApiError) {
    tags.error_type = 'api';
  } else {
    tags.error_type = 'system';
  }

  // Include error code for ApiError instances
  if (err instanceof ApiError) {
    tags.error_code = err.code;
  }

  return tags;
}

/**
 * Removes sensitive information from error responses in production
 * 
 * @param errorResponse - Error response to sanitize
 * @returns Sanitized error response
 */
function sanitizeErrorResponse(errorResponse: ApiErrorResponse): ApiErrorResponse {
  const sanitized = { ...errorResponse };
  
  // In production, remove potentially sensitive information
  if (process.env.NODE_ENV === 'production') {
    // Remove stack trace in production
    delete sanitized.stack;
    
    // If details exist, sanitize them
    if (sanitized.details) {
      const safeDetails: Record<string, any> = {};
      
      // Copy only non-sensitive fields to safe details
      // This is a simplified approach - in reality, specific fields would be handled
      Object.keys(sanitized.details).forEach(key => {
        // Skip fields that might contain sensitive data
        if (![
          'password', 'token', 'secret', 'key', 'apiKey', 
          'credentials', 'cardNumber', 'cvv', 'accountNumber'
        ].includes(key.toLowerCase())) {
          safeDetails[key] = sanitized.details[key];
        }
      });
      
      sanitized.details = safeDetails;
    }
  }
  
  return sanitized;
}