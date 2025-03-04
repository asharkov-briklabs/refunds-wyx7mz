import { Request, Response, NextFunction } from 'express'; // express@^4.18.2
import { errorHandler } from '../../common/middleware/error-handler';
import { ApiError, ValidationError, BusinessError, GatewayError } from '../../common/errors';
import { StatusCode, HTTP_STATUS_CODES } from '../../common/constants/status-codes';
import { logger } from '../../common/utils/logger';

/**
 * Interface defining the structure of enhanced API error responses with documentation links
 */
interface ApiErrorResponseWithLinks {
  code: string;
  message: string;
  details?: Record<string, any>;
  correlationId?: string;
  apiVersion?: string;
  request: { url: string; method: string };
  documentation: { links: Record<string, string> };
}

/**
 * Express middleware that handles API-specific errors and formats standardized responses
 * 
 * This middleware extends the common error handler with API-specific functionality,
 * providing detailed error context and helpful documentation links for API consumers.
 * 
 * @param err - The error that was thrown
 * @param req - Express request object
 * @param res - Response object
 * @param next - Express next function
 */
export function apiErrorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  // Log the API error with additional context
  logger.error('API Error', {
    error: err.message,
    path: req.path,
    method: req.method,
    correlationId: req.headers['x-correlation-id'],
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });

  // Determine HTTP status code based on error type
  const statusCode = mapErrorToStatusCode(err);

  // Enhance the error response with API-specific information
  const enhancedResponse = enhanceErrorResponse(err, req);

  // Set API-specific headers
  res.setHeader('Content-Type', 'application/json');
  
  // Add API version header if available
  const apiVersion = process.env.API_VERSION || 'v1';
  res.setHeader('X-API-Version', apiVersion);

  // Allow CORS in development mode
  if (process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Correlation-ID');
  }

  // Send the enhanced error response
  res.status(statusCode).json(enhancedResponse);
}

/**
 * Enhances error responses with API-specific information including documentation links
 * 
 * @param err - Error object to enhance
 * @param req - Express request object for context
 * @returns Enhanced error response with API-specific information
 */
function enhanceErrorResponse(err: Error, req: Request): ApiErrorResponseWithLinks {
  // Use the common error handler to get the base error response
  const errorResponse = errorHandler(err, req, null as any, () => {}) as any;
  
  // Add API version information
  const apiVersion = process.env.API_VERSION || 'v1';
  
  // Capture request information for context
  const request = {
    url: req.originalUrl || req.url,
    method: req.method
  };

  // Include documentation links based on error type
  const documentationLinks = formatDocumentationLinks(err);

  // Build enhanced response
  const enhanced: ApiErrorResponseWithLinks = {
    ...errorResponse,
    apiVersion,
    request,
    documentation: {
      links: documentationLinks
    }
  };

  // Enhance validation errors with field-level details in a more API-friendly format
  if (err instanceof ValidationError && err.fieldErrors?.length > 0) {
    enhanced.details = {
      ...enhanced.details,
      fields: err.fieldErrors.map(field => ({
        field: field.field,
        message: field.message,
        code: field.code || 'INVALID'
      }))
    };
  }
  
  // Enhance business errors with rule information
  if (err instanceof BusinessError && err.ruleName) {
    enhanced.details = {
      ...enhanced.details,
      rule: err.ruleName,
      remediation: err.remediationSteps
    };
  }
  
  // Enhance gateway errors with gateway details
  if (err instanceof GatewayError) {
    enhanced.details = {
      ...enhanced.details,
      gateway: {
        code: err.gatewayErrorCode,
        message: err.gatewayMessage,
        retryable: err.retryable
      }
    };
  }

  return enhanced;
}

/**
 * Maps API-specific errors to appropriate HTTP status codes
 * 
 * @param err - Error to map to status code
 * @returns HTTP status code for the error
 */
function mapErrorToStatusCode(err: Error): number {
  if (err instanceof ApiError) {
    return err.httpStatus;
  }
  
  if (err instanceof ValidationError) {
    return HTTP_STATUS_CODES[StatusCode.BAD_REQUEST];
  }
  
  if (err instanceof BusinessError) {
    return HTTP_STATUS_CODES[StatusCode.UNPROCESSABLE_ENTITY];
  }
  
  if (err instanceof GatewayError) {
    // Different gateway errors might need different status codes
    if (err.code === 'GATEWAY_TIMEOUT') {
      return HTTP_STATUS_CODES[StatusCode.GATEWAY_TIMEOUT];
    }
    
    if (err.code === 'GATEWAY_CONNECTION_ERROR') {
      return HTTP_STATUS_CODES[StatusCode.BAD_GATEWAY];
    }
    
    return HTTP_STATUS_CODES[StatusCode.BAD_GATEWAY];
  }
  
  // Default to internal server error for unknown error types
  return HTTP_STATUS_CODES[StatusCode.INTERNAL_SERVER_ERROR];
}

/**
 * Adds helpful documentation links for specific error types
 * 
 * @param err - Error to generate documentation links for
 * @returns Object containing relevant documentation links
 */
function formatDocumentationLinks(err: Error): Record<string, string> {
  const baseDocsUrl = process.env.API_DOCS_URL || 'https://docs.brik.com/api';
  const links: Record<string, string> = {
    'api_reference': `${baseDocsUrl}/reference`
  };
  
  if (err instanceof ValidationError) {
    links['validation_guide'] = `${baseDocsUrl}/guides/validation`;
    links['error_handling'] = `${baseDocsUrl}/guides/error-handling#validation-errors`;
  } 
  else if (err instanceof BusinessError) {
    links['business_rules'] = `${baseDocsUrl}/guides/business-rules`;
    links['error_handling'] = `${baseDocsUrl}/guides/error-handling#business-errors`;
  } 
  else if (err instanceof GatewayError) {
    links['payment_gateways'] = `${baseDocsUrl}/guides/payment-gateways`;
    links['error_handling'] = `${baseDocsUrl}/guides/error-handling#gateway-errors`;
  } 
  else {
    links['error_handling'] = `${baseDocsUrl}/guides/error-handling`;
  }
  
  return links;
}