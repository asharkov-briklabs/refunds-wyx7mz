/**
 * Error Codes
 * 
 * Defines standardized error codes and their associated details for consistent
 * error handling across the Refunds Service. This includes API validation errors,
 * business rule violations, payment gateway errors, and system errors.
 * 
 * The error codes provide:
 * - Consistent identification of error conditions
 * - Mapping to appropriate HTTP status codes
 * - Human-readable error messages
 * - Identification of retryable errors
 */

import { StatusCode, HTTP_STATUS_CODES } from './status-codes';

/**
 * Enumeration of all error codes used in the Refunds Service
 */
export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_STATE = 'INVALID_STATE',
  INVALID_TRANSITION = 'INVALID_TRANSITION',
  
  // Authentication errors
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // Authorization errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Resource not found errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  REFUND_NOT_FOUND = 'REFUND_NOT_FOUND',
  TRANSACTION_NOT_FOUND = 'TRANSACTION_NOT_FOUND',
  MERCHANT_NOT_FOUND = 'MERCHANT_NOT_FOUND',
  BANK_ACCOUNT_NOT_FOUND = 'BANK_ACCOUNT_NOT_FOUND',
  PARAMETER_NOT_FOUND = 'PARAMETER_NOT_FOUND',
  
  // Business rule violations
  RULE_VIOLATION = 'RULE_VIOLATION',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION',
  MAX_REFUND_AMOUNT_EXCEEDED = 'MAX_REFUND_AMOUNT_EXCEEDED',
  REFUND_TIME_LIMIT_EXCEEDED = 'REFUND_TIME_LIMIT_EXCEEDED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  
  // Conflict errors
  DUPLICATE_REQUEST = 'DUPLICATE_REQUEST',
  CONCURRENT_MODIFICATION = 'CONCURRENT_MODIFICATION',
  IDEMPOTENCY_KEY_CONFLICT = 'IDEMPOTENCY_KEY_CONFLICT',
  
  // Gateway errors
  GATEWAY_ERROR = 'GATEWAY_ERROR',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
  GATEWAY_CONNECTION_ERROR = 'GATEWAY_CONNECTION_ERROR',
  GATEWAY_AUTHENTICATION_ERROR = 'GATEWAY_AUTHENTICATION_ERROR',
  GATEWAY_VALIDATION_ERROR = 'GATEWAY_VALIDATION_ERROR',
  GATEWAY_REJECTION = 'GATEWAY_REJECTION',
  GATEWAY_NOT_SUPPORTED = 'GATEWAY_NOT_SUPPORTED',
  
  // Service errors
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
  
  // System errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}

/**
 * Interface defining the structure of error code details
 */
export interface ErrorCodeDetails {
  code: string;
  message: string;
  httpStatus: number;
}

/**
 * Mapping of error codes to their details including messages and HTTP status codes
 * This provides a centralized definition of error information for consistent handling
 */
export const ERROR_DETAILS: Record<ErrorCode, ErrorCodeDetails> = {
  [ErrorCode.VALIDATION_ERROR]: {
    code: ErrorCode.VALIDATION_ERROR,
    message: 'The request contains invalid data',
    httpStatus: HTTP_STATUS_CODES[StatusCode.BAD_REQUEST]
  },
  [ErrorCode.INVALID_INPUT]: {
    code: ErrorCode.INVALID_INPUT,
    message: 'The input provided is invalid',
    httpStatus: HTTP_STATUS_CODES[StatusCode.BAD_REQUEST]
  },
  [ErrorCode.REQUIRED_FIELD_MISSING]: {
    code: ErrorCode.REQUIRED_FIELD_MISSING,
    message: 'A required field is missing',
    httpStatus: HTTP_STATUS_CODES[StatusCode.BAD_REQUEST]
  },
  [ErrorCode.INVALID_FORMAT]: {
    code: ErrorCode.INVALID_FORMAT,
    message: 'The format of the provided data is invalid',
    httpStatus: HTTP_STATUS_CODES[StatusCode.BAD_REQUEST]
  },
  [ErrorCode.INVALID_STATE]: {
    code: ErrorCode.INVALID_STATE,
    message: 'The operation cannot be performed in the current state',
    httpStatus: HTTP_STATUS_CODES[StatusCode.UNPROCESSABLE_ENTITY]
  },
  [ErrorCode.INVALID_TRANSITION]: {
    code: ErrorCode.INVALID_TRANSITION,
    message: 'The requested state transition is not allowed',
    httpStatus: HTTP_STATUS_CODES[StatusCode.UNPROCESSABLE_ENTITY]
  },
  [ErrorCode.AUTHENTICATION_FAILED]: {
    code: ErrorCode.AUTHENTICATION_FAILED,
    message: 'Authentication failed',
    httpStatus: HTTP_STATUS_CODES[StatusCode.UNAUTHORIZED]
  },
  [ErrorCode.TOKEN_EXPIRED]: {
    code: ErrorCode.TOKEN_EXPIRED,
    message: 'The authentication token has expired',
    httpStatus: HTTP_STATUS_CODES[StatusCode.UNAUTHORIZED]
  },
  [ErrorCode.INVALID_CREDENTIALS]: {
    code: ErrorCode.INVALID_CREDENTIALS,
    message: 'The provided credentials are invalid',
    httpStatus: HTTP_STATUS_CODES[StatusCode.UNAUTHORIZED]
  },
  [ErrorCode.PERMISSION_DENIED]: {
    code: ErrorCode.PERMISSION_DENIED,
    message: 'Permission denied for this operation',
    httpStatus: HTTP_STATUS_CODES[StatusCode.FORBIDDEN]
  },
  [ErrorCode.UNAUTHORIZED_ACCESS]: {
    code: ErrorCode.UNAUTHORIZED_ACCESS,
    message: 'You are not authorized to access this resource',
    httpStatus: HTTP_STATUS_CODES[StatusCode.FORBIDDEN]
  },
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: {
    code: ErrorCode.INSUFFICIENT_PERMISSIONS,
    message: 'You do not have sufficient permissions for this operation',
    httpStatus: HTTP_STATUS_CODES[StatusCode.FORBIDDEN]
  },
  [ErrorCode.RESOURCE_NOT_FOUND]: {
    code: ErrorCode.RESOURCE_NOT_FOUND,
    message: 'The requested resource was not found',
    httpStatus: HTTP_STATUS_CODES[StatusCode.NOT_FOUND]
  },
  [ErrorCode.REFUND_NOT_FOUND]: {
    code: ErrorCode.REFUND_NOT_FOUND,
    message: 'The requested refund was not found',
    httpStatus: HTTP_STATUS_CODES[StatusCode.NOT_FOUND]
  },
  [ErrorCode.TRANSACTION_NOT_FOUND]: {
    code: ErrorCode.TRANSACTION_NOT_FOUND,
    message: 'The specified transaction was not found',
    httpStatus: HTTP_STATUS_CODES[StatusCode.NOT_FOUND]
  },
  [ErrorCode.MERCHANT_NOT_FOUND]: {
    code: ErrorCode.MERCHANT_NOT_FOUND,
    message: 'The specified merchant was not found',
    httpStatus: HTTP_STATUS_CODES[StatusCode.NOT_FOUND]
  },
  [ErrorCode.BANK_ACCOUNT_NOT_FOUND]: {
    code: ErrorCode.BANK_ACCOUNT_NOT_FOUND,
    message: 'The specified bank account was not found',
    httpStatus: HTTP_STATUS_CODES[StatusCode.NOT_FOUND]
  },
  [ErrorCode.PARAMETER_NOT_FOUND]: {
    code: ErrorCode.PARAMETER_NOT_FOUND,
    message: 'The specified parameter was not found',
    httpStatus: HTTP_STATUS_CODES[StatusCode.NOT_FOUND]
  },
  [ErrorCode.RULE_VIOLATION]: {
    code: ErrorCode.RULE_VIOLATION,
    message: 'The operation violates a business rule',
    httpStatus: HTTP_STATUS_CODES[StatusCode.UNPROCESSABLE_ENTITY]
  },
  [ErrorCode.COMPLIANCE_VIOLATION]: {
    code: ErrorCode.COMPLIANCE_VIOLATION,
    message: 'The operation violates a compliance rule',
    httpStatus: HTTP_STATUS_CODES[StatusCode.UNPROCESSABLE_ENTITY]
  },
  [ErrorCode.MAX_REFUND_AMOUNT_EXCEEDED]: {
    code: ErrorCode.MAX_REFUND_AMOUNT_EXCEEDED,
    message: 'The refund amount exceeds the maximum allowed',
    httpStatus: HTTP_STATUS_CODES[StatusCode.UNPROCESSABLE_ENTITY]
  },
  [ErrorCode.REFUND_TIME_LIMIT_EXCEEDED]: {
    code: ErrorCode.REFUND_TIME_LIMIT_EXCEEDED,
    message: 'The time limit for processing this refund has been exceeded',
    httpStatus: HTTP_STATUS_CODES[StatusCode.UNPROCESSABLE_ENTITY]
  },
  [ErrorCode.INSUFFICIENT_BALANCE]: {
    code: ErrorCode.INSUFFICIENT_BALANCE,
    message: 'The merchant balance is insufficient for this refund',
    httpStatus: HTTP_STATUS_CODES[StatusCode.UNPROCESSABLE_ENTITY]
  },
  [ErrorCode.METHOD_NOT_ALLOWED]: {
    code: ErrorCode.METHOD_NOT_ALLOWED,
    message: 'The requested refund method is not allowed for this transaction',
    httpStatus: HTTP_STATUS_CODES[StatusCode.UNPROCESSABLE_ENTITY]
  },
  [ErrorCode.DUPLICATE_REQUEST]: {
    code: ErrorCode.DUPLICATE_REQUEST,
    message: 'A duplicate request was detected',
    httpStatus: HTTP_STATUS_CODES[StatusCode.CONFLICT]
  },
  [ErrorCode.CONCURRENT_MODIFICATION]: {
    code: ErrorCode.CONCURRENT_MODIFICATION,
    message: 'The resource was modified concurrently',
    httpStatus: HTTP_STATUS_CODES[StatusCode.CONFLICT]
  },
  [ErrorCode.IDEMPOTENCY_KEY_CONFLICT]: {
    code: ErrorCode.IDEMPOTENCY_KEY_CONFLICT,
    message: 'An operation with this idempotency key is already in progress',
    httpStatus: HTTP_STATUS_CODES[StatusCode.CONFLICT]
  },
  [ErrorCode.GATEWAY_ERROR]: {
    code: ErrorCode.GATEWAY_ERROR,
    message: 'An error occurred while communicating with the payment gateway',
    httpStatus: HTTP_STATUS_CODES[StatusCode.BAD_GATEWAY]
  },
  [ErrorCode.GATEWAY_TIMEOUT]: {
    code: ErrorCode.GATEWAY_TIMEOUT,
    message: 'The payment gateway request timed out',
    httpStatus: HTTP_STATUS_CODES[StatusCode.GATEWAY_TIMEOUT]
  },
  [ErrorCode.GATEWAY_CONNECTION_ERROR]: {
    code: ErrorCode.GATEWAY_CONNECTION_ERROR,
    message: 'Failed to connect to the payment gateway',
    httpStatus: HTTP_STATUS_CODES[StatusCode.BAD_GATEWAY]
  },
  [ErrorCode.GATEWAY_AUTHENTICATION_ERROR]: {
    code: ErrorCode.GATEWAY_AUTHENTICATION_ERROR,
    message: 'Authentication with the payment gateway failed',
    httpStatus: HTTP_STATUS_CODES[StatusCode.BAD_GATEWAY]
  },
  [ErrorCode.GATEWAY_VALIDATION_ERROR]: {
    code: ErrorCode.GATEWAY_VALIDATION_ERROR,
    message: 'The payment gateway rejected the request due to validation errors',
    httpStatus: HTTP_STATUS_CODES[StatusCode.BAD_REQUEST]
  },
  [ErrorCode.GATEWAY_REJECTION]: {
    code: ErrorCode.GATEWAY_REJECTION,
    message: 'The payment gateway rejected the refund request',
    httpStatus: HTTP_STATUS_CODES[StatusCode.UNPROCESSABLE_ENTITY]
  },
  [ErrorCode.GATEWAY_NOT_SUPPORTED]: {
    code: ErrorCode.GATEWAY_NOT_SUPPORTED,
    message: 'The payment gateway does not support this operation',
    httpStatus: HTTP_STATUS_CODES[StatusCode.UNPROCESSABLE_ENTITY]
  },
  [ErrorCode.SERVICE_UNAVAILABLE]: {
    code: ErrorCode.SERVICE_UNAVAILABLE,
    message: 'The service is currently unavailable',
    httpStatus: HTTP_STATUS_CODES[StatusCode.SERVICE_UNAVAILABLE]
  },
  [ErrorCode.RATE_LIMIT_EXCEEDED]: {
    code: ErrorCode.RATE_LIMIT_EXCEEDED,
    message: 'Rate limit exceeded, please try again later',
    httpStatus: HTTP_STATUS_CODES[StatusCode.TOO_MANY_REQUESTS]
  },
  [ErrorCode.CIRCUIT_OPEN]: {
    code: ErrorCode.CIRCUIT_OPEN,
    message: 'The service is temporarily unavailable due to circuit breaker',
    httpStatus: HTTP_STATUS_CODES[StatusCode.SERVICE_UNAVAILABLE]
  },
  [ErrorCode.DATABASE_ERROR]: {
    code: ErrorCode.DATABASE_ERROR,
    message: 'An error occurred while accessing the database',
    httpStatus: HTTP_STATUS_CODES[StatusCode.INTERNAL_SERVER_ERROR]
  },
  [ErrorCode.CONFIGURATION_ERROR]: {
    code: ErrorCode.CONFIGURATION_ERROR,
    message: 'The service is misconfigured',
    httpStatus: HTTP_STATUS_CODES[StatusCode.INTERNAL_SERVER_ERROR]
  },
  [ErrorCode.INTERNAL_SERVER_ERROR]: {
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    message: 'An unexpected error occurred',
    httpStatus: HTTP_STATUS_CODES[StatusCode.INTERNAL_SERVER_ERROR]
  }
};

/**
 * Enumeration of error codes that are considered retryable by default
 * These are typically transient errors that may resolve on retry
 */
export enum RetryableErrorCodes {
  GATEWAY_TIMEOUT = ErrorCode.GATEWAY_TIMEOUT,
  GATEWAY_CONNECTION_ERROR = ErrorCode.GATEWAY_CONNECTION_ERROR,
  SERVICE_UNAVAILABLE = ErrorCode.SERVICE_UNAVAILABLE
}