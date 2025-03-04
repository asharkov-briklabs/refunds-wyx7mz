import { ErrorCode, ERROR_DETAILS } from '../constants/error-codes';

/**
 * Interface defining the structure of API error responses
 */
export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}

/**
 * Base error class for all API errors in the Refunds Service.
 * Provides standardized error handling with error codes, HTTP status mapping,
 * and JSON serialization for consistent API error responses.
 *
 * This class should be extended or used directly for all errors that may be
 * returned from API endpoints to ensure consistent error format.
 */
export class ApiError extends Error {
  /**
   * The error code identifying the type of error
   */
  public readonly code: ErrorCode;
  
  /**
   * The HTTP status code associated with this error
   */
  public readonly httpStatus: number;
  
  /**
   * Additional details about the error
   */
  public readonly details?: Record<string, any>;

  /**
   * Creates a new ApiError with the specified error code, optional custom message, and optional details.
   * 
   * @param code - The error code identifying the type of error
   * @param message - Custom error message (overrides default message from ERROR_DETAILS)
   * @param details - Additional error details
   */
  constructor(code: ErrorCode, message?: string, details?: Record<string, any>) {
    // Ensure the error code exists in our mapping or use INTERNAL_SERVER_ERROR as fallback
    const errorDetails = ERROR_DETAILS[code] || ERROR_DETAILS[ErrorCode.INTERNAL_SERVER_ERROR];
    
    // Use provided message or default message from ERROR_DETAILS
    super(message || errorDetails.message);
    
    // Set error code
    this.code = code;
    
    // Set HTTP status from mapping
    this.httpStatus = errorDetails.httpStatus;
    
    // Store additional details if provided
    this.details = details;
    
    // Set the name property to match the class name
    this.name = 'ApiError';
    
    // Capture stack trace (works in V8 environments)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Converts the error to a JSON-serializable object for API responses.
   * 
   * @returns A JSON representation of the error with code, message, and optional details
   */
  toJSON(): ApiErrorResponse {
    // Create base response with code and message
    const response: ApiErrorResponse = {
      code: this.code,
      message: this.message
    };
    
    // Include details if they exist
    if (this.details) {
      response.details = this.details;
    }
    
    // Include stack trace in non-production environments
    if (process.env.NODE_ENV !== 'production' && this.stack) {
      response.stack = this.stack;
    }
    
    return response;
  }
}