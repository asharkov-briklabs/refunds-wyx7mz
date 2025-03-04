import { ApiError } from './api-error';
import { ErrorCode } from '../constants/error-codes';

/**
 * Enumeration of gateway error codes that can be retried
 */
export enum RetryableGatewayErrorCodes {
  GATEWAY_TIMEOUT = ErrorCode.GATEWAY_TIMEOUT,
  GATEWAY_CONNECTION_ERROR = ErrorCode.GATEWAY_CONNECTION_ERROR
}

/**
 * Interface defining the structure of gateway error details
 * including error code, message, and additional data from the gateway
 */
export interface GatewayErrorDetail {
  gatewayErrorCode?: string;
  gatewayMessage?: string;
  additionalData?: Record<string, unknown>;
}

/**
 * Interface defining the structure of gateway error responses with error code,
 * message, gateway-specific details, and retryability
 */
export interface GatewayErrorResponse {
  code: string;
  message: string;
  gatewayErrorCode?: string;
  gatewayMessage?: string;
  retryable: boolean;
  detail?: GatewayErrorDetail;
  details?: Record<string, any>;
  stack?: string;
}

/**
 * Specialized error class for handling payment gateway integration errors.
 * Provides information about the type of gateway error, whether it is retryable,
 * and any gateway-specific details.
 */
export class GatewayError extends ApiError {
  public readonly detail?: GatewayErrorDetail;
  public readonly gatewayErrorCode?: string;
  public readonly gatewayMessage?: string;
  public readonly retryable: boolean;

  /**
   * Creates a new GatewayError with the specified error code, optional custom message,
   * and optional gateway-specific details.
   * 
   * @param errorCode - The error code identifying the type of error
   * @param message - Custom error message (overrides default message from ERROR_DETAILS)
   * @param detail - Gateway-specific error details
   * @param cause - The underlying cause of the error
   */
  constructor(
    errorCode: ErrorCode,
    message?: string,
    detail?: GatewayErrorDetail,
    cause?: Error
  ) {
    // Call parent ApiError constructor with errorCode, message, and cause
    super(errorCode, message);
    
    // Set the name property to 'GatewayError'
    this.name = 'GatewayError';
    
    // Store gateway error detail in the detail property
    this.detail = detail;
    
    // Set gatewayErrorCode from detail if provided
    this.gatewayErrorCode = detail?.gatewayErrorCode;
    
    // Set gatewayMessage from detail if provided
    this.gatewayMessage = detail?.gatewayMessage;
    
    // Determine if the error is retryable based on the error code
    this.retryable = this.isRetryable();
    
    // Add cause to details if provided
    if (cause) {
      this.details = {
        ...(this.details || {}),
        cause: {
          message: cause.message,
          stack: cause.stack
        }
      };
    }
  }

  /**
   * Converts the gateway error to a JSON-serializable object for API responses.
   * 
   * @returns A JSON representation of the gateway error including gateway-specific details
   */
  toJSON(): GatewayErrorResponse {
    // Get the base error representation from parent toJSON method
    const baseError = super.toJSON();
    
    // Add gateway-specific properties
    return {
      ...baseError,
      gatewayErrorCode: this.gatewayErrorCode,
      gatewayMessage: this.gatewayMessage,
      retryable: this.retryable,
      detail: this.detail
    };
  }

  /**
   * Determines if the gateway error is retryable based on the error code.
   * 
   * @returns True if the error is retryable, false otherwise
   */
  isRetryable(): boolean {
    // Check if the error code is in the RetryableGatewayErrorCodes enum
    return Object.values(RetryableGatewayErrorCodes).includes(this.code as RetryableGatewayErrorCodes);
  }

  /**
   * Factory method to create a generic gateway error.
   * 
   * @param message - Custom error message
   * @param detail - Gateway-specific error details
   * @param cause - The underlying cause of the error
   * @returns A new GatewayError for general gateway issues
   */
  static createGatewayError(
    message: string,
    detail?: GatewayErrorDetail,
    cause?: Error
  ): GatewayError {
    return new GatewayError(ErrorCode.GATEWAY_ERROR, message, detail, cause);
  }

  /**
   * Factory method to create a gateway timeout error.
   * 
   * @param message - Custom error message
   * @param detail - Gateway-specific error details
   * @param cause - The underlying cause of the error
   * @returns A new GatewayError for gateway timeout issues
   */
  static createGatewayTimeoutError(
    message?: string,
    detail?: GatewayErrorDetail,
    cause?: Error
  ): GatewayError {
    const defaultMessage = 'The payment gateway request timed out';
    return new GatewayError(
      ErrorCode.GATEWAY_TIMEOUT,
      message || defaultMessage,
      detail,
      cause
    );
  }

  /**
   * Factory method to create a gateway connection error.
   * 
   * @param message - Custom error message
   * @param detail - Gateway-specific error details
   * @param cause - The underlying cause of the error
   * @returns A new GatewayError for gateway connection issues
   */
  static createGatewayConnectionError(
    message?: string,
    detail?: GatewayErrorDetail,
    cause?: Error
  ): GatewayError {
    const defaultMessage = 'Failed to connect to the payment gateway';
    return new GatewayError(
      ErrorCode.GATEWAY_CONNECTION_ERROR,
      message || defaultMessage,
      detail,
      cause
    );
  }

  /**
   * Factory method to create a gateway authentication error.
   * 
   * @param message - Custom error message
   * @param detail - Gateway-specific error details
   * @param cause - The underlying cause of the error
   * @returns A new GatewayError for gateway authentication issues
   */
  static createGatewayAuthenticationError(
    message?: string,
    detail?: GatewayErrorDetail,
    cause?: Error
  ): GatewayError {
    const defaultMessage = 'Authentication with the payment gateway failed';
    return new GatewayError(
      ErrorCode.GATEWAY_AUTHENTICATION_ERROR,
      message || defaultMessage,
      detail,
      cause
    );
  }

  /**
   * Factory method to create a gateway validation error.
   * 
   * @param message - Custom error message
   * @param detail - Gateway-specific error details
   * @param cause - The underlying cause of the error
   * @returns A new GatewayError for gateway validation issues
   */
  static createGatewayValidationError(
    message?: string,
    detail?: GatewayErrorDetail,
    cause?: Error
  ): GatewayError {
    const defaultMessage = 'The payment gateway rejected the request due to validation errors';
    return new GatewayError(
      ErrorCode.GATEWAY_VALIDATION_ERROR,
      message || defaultMessage,
      detail,
      cause
    );
  }

  /**
   * Factory method to create a gateway rejection error.
   * 
   * @param message - Custom error message
   * @param detail - Gateway-specific error details
   * @param cause - The underlying cause of the error
   * @returns A new GatewayError for requests rejected by the gateway
   */
  static createGatewayRejectionError(
    message?: string,
    detail?: GatewayErrorDetail,
    cause?: Error
  ): GatewayError {
    const defaultMessage = 'The payment gateway rejected the refund request';
    return new GatewayError(
      ErrorCode.GATEWAY_REJECTION,
      message || defaultMessage,
      detail,
      cause
    );
  }
}