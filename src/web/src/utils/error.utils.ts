/**
 * Utility module providing functions for standardized error handling, parsing, formatting,
 * and logging throughout the Refunds Service web application.
 */

import { AxiosError } from 'axios'; // axios ^1.4.0
import { 
  ERROR_MESSAGE_MAP, 
  VALIDATION_ERROR_MESSAGES, 
  GENERIC_ERROR_MESSAGES,
  BANK_ACCOUNT_ERROR_MESSAGES,
  REFUND_ERROR_MESSAGES,
  GATEWAY_ERROR_MESSAGES
} from '../constants/error-messages.constants';
import { ApiError } from '../types/api.types';

/**
 * Parses API errors from various sources into a standardized ApiError format
 * @param error Any error object that needs to be standardized
 * @returns A standardized ApiError object
 */
export const parseApiError = (error: any): ApiError => {
  // If it's already an ApiError, return it directly
  if (error && error.code && error.message) {
    return error as ApiError;
  }

  // Handle Axios errors
  if (error && error.isAxiosError) {
    const axiosError = error as AxiosError;
    
    // Handle network errors
    if (!axiosError.response) {
      return {
        code: 'NETWORK_ERROR',
        message: GENERIC_ERROR_MESSAGES.NETWORK_ERROR,
        details: null,
        field: null,
      };
    }
    
    // Handle timeout errors
    if (axiosError.code === 'ECONNABORTED') {
      return {
        code: 'TIMEOUT_ERROR',
        message: GENERIC_ERROR_MESSAGES.TIMEOUT_ERROR,
        details: null,
        field: null,
      };
    }
    
    // Try to extract structured error from response
    if (axiosError.response?.data) {
      const responseData = axiosError.response.data;
      
      // If response data has an error property that looks like ApiError
      if (responseData.error && responseData.error.code) {
        return responseData.error as ApiError;
      }
      
      // If response has standard structure with code and message
      if (responseData.code && responseData.message) {
        return {
          code: responseData.code,
          message: responseData.message,
          details: responseData.details || null,
          field: responseData.field || null,
        };
      }
      
      // Handle validation errors
      if (responseData.validationErrors && Array.isArray(responseData.validationErrors)) {
        return {
          code: 'VALIDATION_ERROR',
          message: 'Validation error occurred',
          details: { validationErrors: responseData.validationErrors },
          field: null,
        };
      }
      
      // If we have any message in the response, use it
      if (responseData.message) {
        return {
          code: responseData.code || 'SERVER_ERROR',
          message: responseData.message,
          details: null,
          field: null,
        };
      }
    }
    
    // Handle different HTTP status codes
    const status = axiosError.response?.status;
    if (status === 401) {
      return {
        code: 'AUTH_ERROR',
        message: GENERIC_ERROR_MESSAGES.AUTHENTICATION_ERROR,
        details: null,
        field: null,
      };
    }
    
    if (status === 403) {
      return {
        code: 'PERMISSION_DENIED',
        message: GENERIC_ERROR_MESSAGES.PERMISSION_ERROR,
        details: null,
        field: null,
      };
    }
    
    if (status === 404) {
      return {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
        details: null,
        field: null,
      };
    }
    
    if (status && status >= 500) {
      return {
        code: 'SERVER_ERROR',
        message: GENERIC_ERROR_MESSAGES.SERVER_ERROR,
        details: null,
        field: null,
      };
    }
  }
  
  // If it's a standard Error object
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || GENERIC_ERROR_MESSAGES.UNKNOWN_ERROR,
      details: null,
      field: null,
    };
  }
  
  // Default catch-all error
  return {
    code: 'UNKNOWN_ERROR',
    message: GENERIC_ERROR_MESSAGES.UNKNOWN_ERROR,
    details: null,
    field: null,
  };
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

/**
 * Logs errors with additional context information to help with debugging
 * @param error The error object to log
 * @param context Additional context about where the error occurred
 * @param additionalInfo Optional additional information to include in the log
 */
export const logError = (
  error: any,
  context: string,
  additionalInfo?: Record<string, any>
): void => {
  console.error(`[ERROR] ${context}:`, error);
  
  // If it's a standard Error, log the stack trace
  if (error instanceof Error) {
    console.error(`Stack trace: ${error.stack}`);
  }
  
  // Log additional info if provided
  if (additionalInfo) {
    console.error('Additional context:', additionalInfo);
  }
  
  // Provide more detailed logging in development environment
  if (process.env.NODE_ENV === 'development') {
    // If it's an AxiosError, log more details about the request and response
    if (error?.isAxiosError) {
      const axiosError = error as AxiosError;
      console.error('Request config:', axiosError.config);
      if (axiosError.response) {
        console.error('Response status:', axiosError.response.status);
        console.error('Response data:', axiosError.response.data);
      }
    }
  }
};

/**
 * Extracts and formats validation errors from API error responses
 * @param error The API error object potentially containing validation errors
 * @returns Object mapping field names to error messages
 */
export const getValidationErrors = (error: ApiError): Record<string, string> => {
  const validationErrors: Record<string, string> = {};
  
  // Check if error has validation details
  if (error.details && error.details.validationErrors && Array.isArray(error.details.validationErrors)) {
    const errorsArray = error.details.validationErrors;
    
    // Transform array of validation errors to field -> message mapping
    errorsArray.forEach(validationError => {
      if (validationError.field && validationError.message) {
        validationErrors[validationError.field] = validationError.message;
      }
    });
  } else if (error.field && error.message) {
    // If the error itself is a field-level validation error
    validationErrors[error.field] = error.message;
  }
  
  return validationErrors;
};

/**
 * Creates a user-friendly error message with optional recommended action
 * @param title The error title or heading
 * @param message The detailed error message
 * @param recommendedAction Optional recommended action to resolve the error
 * @returns Structured error object for display in UI components
 */
export const createErrorMessage = (
  title: string,
  message: string,
  recommendedAction?: string
): { title: string; message: string; recommendedAction?: string } => {
  const errorMessage = { title, message };
  
  if (recommendedAction) {
    return { ...errorMessage, recommendedAction };
  }
  
  return errorMessage;
};