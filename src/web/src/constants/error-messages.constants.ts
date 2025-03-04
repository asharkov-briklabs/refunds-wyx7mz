/**
 * Error message constants used throughout the Refunds Service frontend application.
 * This file centralizes all error messages to ensure consistency in error handling and display.
 */

/**
 * Standard form validation error messages
 */
export const VALIDATION_ERROR_MESSAGES = {
  REQUIRED_FIELD: 'The {{field}} field is required.',
  INVALID_FORMAT: 'The {{field}} format is invalid.',
  MIN_LENGTH: 'The {{field}} must be at least {{minLength}} characters.',
  MAX_LENGTH: 'The {{field}} cannot exceed {{maxLength}} characters.',
  MIN_VALUE: 'The {{field}} must be at least {{minValue}}.',
  MAX_VALUE: 'The {{field}} cannot exceed {{maxValue}}.',
  PASSWORDS_MUST_MATCH: 'Passwords must match.',
  INVALID_EMAIL: 'Please enter a valid email address.',
};

/**
 * Bank account validation error messages
 */
export const BANK_ACCOUNT_ERROR_MESSAGES = {
  INVALID_ROUTING_NUMBER: 'Invalid routing number. Please enter a valid 9-digit routing number.',
  INVALID_ACCOUNT_NUMBER: 'Invalid account number. Please enter a valid account number between 4-17 digits.',
  ACCOUNT_NUMBERS_MUST_MATCH: 'Account numbers must match.',
  BANK_ACCOUNT_REQUIRED: 'A bank account is required for the selected refund method.',
};

/**
 * Refund-specific error messages
 */
export const REFUND_ERROR_MESSAGES = {
  INVALID_AMOUNT: 'The refund amount must be greater than zero.',
  MAX_AMOUNT_EXCEEDED: 'The refund amount cannot exceed the original transaction amount.',
  INVALID_REFUND_METHOD: 'Please select a valid refund method.',
  REASON_REQUIRED: 'Please select a reason for the refund.',
  DOCUMENTATION_REQUIRED: 'Supporting documentation is required for this type of refund.',
};

/**
 * Payment gateway related error messages
 */
export const GATEWAY_ERROR_MESSAGES = {
  GENERIC_GATEWAY_ERROR: 'There was an error processing your refund. Please try again later.',
  CARD_NETWORK_REJECTION: 'The refund was rejected by the card network. Please try an alternative refund method.',
  GATEWAY_TIMEOUT: 'The payment processor is taking longer than expected. Your refund will continue to process.',
  INSUFFICIENT_FUNDS: 'Insufficient funds to process this refund.',
};

/**
 * General application error messages
 */
export const GENERIC_ERROR_MESSAGES = {
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again later.',
  NETWORK_ERROR: 'Network connection issue. Please check your internet connection and try again.',
  TIMEOUT_ERROR: 'The operation timed out. Please try again.',
  AUTHENTICATION_ERROR: 'Authentication failed. Please log in again.',
  PERMISSION_ERROR: 'You do not have permission to perform this action.',
  SERVER_ERROR: 'A server error occurred. Our team has been notified.',
};

/**
 * Maps error codes to their corresponding error message constants
 */
export const ERROR_MESSAGE_MAP: Record<string, string> = {
  VALIDATION_ERROR: 'VALIDATION_ERROR_MESSAGES',
  NETWORK_ERROR: 'GENERIC_ERROR_MESSAGES.NETWORK_ERROR',
  TIMEOUT_ERROR: 'GENERIC_ERROR_MESSAGES.TIMEOUT_ERROR',
  AUTH_ERROR: 'GENERIC_ERROR_MESSAGES.AUTHENTICATION_ERROR',
  PERMISSION_DENIED: 'GENERIC_ERROR_MESSAGES.PERMISSION_ERROR',
  SERVER_ERROR: 'GENERIC_ERROR_MESSAGES.SERVER_ERROR',
  GATEWAY_ERROR: 'GATEWAY_ERROR_MESSAGES.GENERIC_GATEWAY_ERROR',
  REFUND_AMOUNT_INVALID: 'REFUND_ERROR_MESSAGES.INVALID_AMOUNT',
  REFUND_AMOUNT_EXCEEDED: 'REFUND_ERROR_MESSAGES.MAX_AMOUNT_EXCEEDED',
  CARD_NETWORK_REJECTED: 'GATEWAY_ERROR_MESSAGES.CARD_NETWORK_REJECTION',
  INSUFFICIENT_FUNDS: 'GATEWAY_ERROR_MESSAGES.INSUFFICIENT_FUNDS',
};

/**
 * Formats an error message by replacing parameter placeholders with actual values
 * @param message The error message template with {{param}} placeholders
 * @param params An object containing parameter values to substitute
 * @returns Formatted error message with parameter substitutions
 */
export const formatErrorWithParams = (
  message: string,
  params?: Record<string, string>
): string => {
  if (!params) return message;
  
  let formattedMessage = message;
  Object.keys(params).forEach(key => {
    formattedMessage = formattedMessage.replace(
      new RegExp(`{{${key}}}`, 'g'), 
      params[key]
    );
  });
  
  return formattedMessage;
};

/**
 * Retrieves an appropriate error message based on an error code, with optional parameter substitution
 * @param errorCode The error code to look up
 * @param params Optional parameters to substitute in the error message
 * @returns Formatted error message with substituted parameters
 */
export const getErrorMessage = (
  errorCode: string,
  params?: Record<string, string>
): string => {
  // If the error code isn't in our map, return a generic error message
  if (!ERROR_MESSAGE_MAP[errorCode]) {
    return GENERIC_ERROR_MESSAGES.UNKNOWN_ERROR;
  }
  
  // Get the path to the error message
  const messagePath = ERROR_MESSAGE_MAP[errorCode];
  
  // Split the path by dot notation
  const pathSegments = messagePath.split('.');
  
  let errorMessage: string;
  
  // If we have nested properties (e.g., 'GENERIC_ERROR_MESSAGES.NETWORK_ERROR')
  if (pathSegments.length > 1) {
    const [objectName, propertyName] = pathSegments;
    
    // Safely access the nested property
    switch (objectName) {
      case 'GENERIC_ERROR_MESSAGES':
        errorMessage = GENERIC_ERROR_MESSAGES[propertyName as keyof typeof GENERIC_ERROR_MESSAGES];
        break;
      case 'GATEWAY_ERROR_MESSAGES':
        errorMessage = GATEWAY_ERROR_MESSAGES[propertyName as keyof typeof GATEWAY_ERROR_MESSAGES];
        break;
      case 'REFUND_ERROR_MESSAGES':
        errorMessage = REFUND_ERROR_MESSAGES[propertyName as keyof typeof REFUND_ERROR_MESSAGES];
        break;
      case 'BANK_ACCOUNT_ERROR_MESSAGES':
        errorMessage = BANK_ACCOUNT_ERROR_MESSAGES[propertyName as keyof typeof BANK_ACCOUNT_ERROR_MESSAGES];
        break;
      case 'VALIDATION_ERROR_MESSAGES':
        errorMessage = VALIDATION_ERROR_MESSAGES[propertyName as keyof typeof VALIDATION_ERROR_MESSAGES];
        break;
      default:
        errorMessage = GENERIC_ERROR_MESSAGES.UNKNOWN_ERROR;
    }
  } else {
    // If it's just a category name (e.g., 'VALIDATION_ERROR_MESSAGES'),
    // we need more specific information about the error
    if (pathSegments[0] === 'VALIDATION_ERROR_MESSAGES') {
      // If the error is related to validation, we need additional context
      // like which field failed validation. If not provided in params,
      // return a generic validation error message.
      return params?.message || 
             'There was an error validating your input. Please check your information and try again.';
    }
    
    // Otherwise, return the unknown error message
    errorMessage = GENERIC_ERROR_MESSAGES.UNKNOWN_ERROR;
  }
  
  // If we couldn't find the specific error message, return the unknown error message
  if (!errorMessage) {
    return GENERIC_ERROR_MESSAGES.UNKNOWN_ERROR;
  }
  
  // Format the message with any provided parameters
  return formatErrorWithParams(errorMessage, params);
};