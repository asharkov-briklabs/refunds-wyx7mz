import { ValidationError as ValidationErrorClass, FieldError } from '../errors/validation-error';
import { ErrorCode } from '../constants/error-codes';
import { isValidCurrencyAmount } from './currency-utils';
import { logger } from './logger';

/**
 * Standard interface for validation results across the application
 */
export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
}

/**
 * Interface for field-level validation errors
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Type definition for supported validation types
 */
export type ValidationType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'date'
  | 'email'
  | 'uuid';

/**
 * Validates that all required fields are present in the data object
 * 
 * @param data - The data object to validate
 * @param requiredFields - Array of field names that are required
 * @returns Validation result with success flag and errors for missing fields
 */
export function validateRequiredFields(data: object, requiredFields: string[]): ValidationResult {
  const errors: ValidationError[] = [];
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      errors.push({
        field,
        message: `The ${field} field is required`,
        code: ErrorCode.REQUIRED_FIELD_MISSING
      });
    }
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Validates that fields in the data object are of the expected types
 * 
 * @param data - The data object to validate
 * @param fieldTypes - Record mapping field names to expected types
 * @returns Validation result with success flag and type mismatch errors
 */
export function validateDataType(data: object, fieldTypes: Record<string, string>): ValidationResult {
  const errors: ValidationError[] = [];
  
  for (const [field, expectedType] of Object.entries(fieldTypes)) {
    if (data[field] !== undefined && data[field] !== null) {
      const actualType = typeof data[field];
      if (actualType !== expectedType) {
        errors.push({
          field,
          message: `The ${field} field must be of type ${expectedType}, got ${actualType}`,
          code: ErrorCode.INVALID_DATA_TYPE
        });
      }
    }
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Validates that a string field has a length within specified min and max bounds
 * 
 * @param value - The string value to validate
 * @param fieldName - Name of the field being validated
 * @param minLength - Minimum allowed length
 * @param maxLength - Maximum allowed length
 * @returns Validation result with success flag and length violation errors
 */
export function validateStringLength(
  value: string,
  fieldName: string,
  minLength: number,
  maxLength: number
): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (typeof value !== 'string') {
    errors.push({
      field: fieldName,
      message: `The ${fieldName} field must be a string`,
      code: ErrorCode.INVALID_DATA_TYPE
    });
    return { success: false, errors };
  }
  
  if (value.length < minLength) {
    errors.push({
      field: fieldName,
      message: `The ${fieldName} field must be at least ${minLength} characters`,
      code: ErrorCode.INVALID_FORMAT
    });
  }
  
  if (value.length > maxLength) {
    errors.push({
      field: fieldName,
      message: `The ${fieldName} field must not exceed ${maxLength} characters`,
      code: ErrorCode.INVALID_FORMAT
    });
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Validates that a value is one of the allowed enum values
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field being validated
 * @param allowedValues - Array of allowed values
 * @returns Validation result with success flag and enum violation errors
 */
export function validateEnum(value: any, fieldName: string, allowedValues: any[]): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!allowedValues.includes(value)) {
    errors.push({
      field: fieldName,
      message: `The ${fieldName} field must be one of: ${allowedValues.join(', ')}`,
      code: ErrorCode.INVALID_ENUM_VALUE
    });
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Validates a refund amount against transaction amount and other rules
 * 
 * @param refundAmount - The refund amount to validate
 * @param transactionAmount - The original transaction amount
 * @param options - Optional validation options (e.g., maximum refund amount)
 * @returns Validation result with success flag and amount-related errors
 */
export function validateRefundAmount(
  refundAmount: number, 
  transactionAmount: number,
  options?: { maxRefundAmount?: number }
): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Check if it's a valid currency amount
  if (!isValidCurrencyAmount(refundAmount)) {
    errors.push({
      field: 'refundAmount',
      message: 'The refund amount is not a valid currency amount',
      code: ErrorCode.INVALID_FORMAT
    });
    return { success: false, errors };
  }
  
  // Check if it's greater than zero
  if (refundAmount <= 0) {
    errors.push({
      field: 'refundAmount',
      message: 'The refund amount must be greater than zero',
      code: ErrorCode.INVALID_FORMAT
    });
  }
  
  // Check if it exceeds the transaction amount
  if (refundAmount > transactionAmount) {
    errors.push({
      field: 'refundAmount',
      message: 'The refund amount cannot exceed the original transaction amount',
      code: ErrorCode.MAX_REFUND_AMOUNT_EXCEEDED
    });
  }
  
  // Check against maximum refund amount if provided
  if (options?.maxRefundAmount && refundAmount > options.maxRefundAmount) {
    errors.push({
      field: 'refundAmount',
      message: `The refund amount cannot exceed the maximum allowed amount of ${options.maxRefundAmount}`,
      code: ErrorCode.MAX_REFUND_AMOUNT_EXCEEDED
    });
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Validates if a string is a valid ID format (UUID, etc.)
 * 
 * @param id - The ID string to validate
 * @param pattern - Optional regex pattern for custom ID format
 * @returns True if ID is valid, false otherwise
 */
export function isValidId(id: string, pattern?: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  const regex = pattern 
    ? new RegExp(pattern)
    : /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/; // UUID pattern
  
  return regex.test(id);
}

/**
 * Validates an ID field with detailed error information
 * 
 * @param id - The ID string to validate
 * @param fieldName - Name of the field being validated
 * @param pattern - Optional regex pattern for custom ID format
 * @returns Validation result with success flag and ID format errors
 */
export function validateId(id: string, fieldName: string, pattern?: string): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!isValidId(id, pattern)) {
    errors.push({
      field: fieldName,
      message: `The ${fieldName} field must be a valid ID format`,
      code: ErrorCode.INVALID_FORMAT
    });
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Validates if a string is a valid email format
 * 
 * @param email - The email string to validate
 * @param fieldName - Name of the field being validated
 * @returns Validation result with success flag and email format errors
 */
export function validateEmail(email: string, fieldName: string): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (typeof email !== 'string') {
    errors.push({
      field: fieldName,
      message: `The ${fieldName} field must be a string`,
      code: ErrorCode.INVALID_DATA_TYPE
    });
    return { success: false, errors };
  }
  
  // Email regex pattern
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailPattern.test(email)) {
    errors.push({
      field: fieldName,
      message: `The ${fieldName} field must be a valid email address`,
      code: ErrorCode.INVALID_FORMAT
    });
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Validates if a value is a valid date or date string
 * 
 * @param date - The date value to validate
 * @param fieldName - Name of the field being validated
 * @returns Validation result with success flag and date format errors
 */
export function validateDate(date: any, fieldName: string): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Check if it's already a Date object
  if (date instanceof Date) {
    if (isNaN(date.getTime())) {
      errors.push({
        field: fieldName,
        message: `The ${fieldName} field must be a valid date`,
        code: ErrorCode.INVALID_FORMAT
      });
    }
    return { success: errors.length === 0, errors };
  }
  
  // Try to convert string or number to Date
  if (typeof date === 'string' || typeof date === 'number') {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      errors.push({
        field: fieldName,
        message: `The ${fieldName} field must be a valid date format`,
        code: ErrorCode.INVALID_FORMAT
      });
    }
    return { success: errors.length === 0, errors };
  }
  
  // If it's neither a Date, string, nor number
  errors.push({
    field: fieldName,
    message: `The ${fieldName} field must be a valid date`,
    code: ErrorCode.INVALID_DATA_TYPE
  });
  
  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Combines multiple validation results into a single result
 * 
 * @param results - Array of validation results to combine
 * @returns Combined validation result with all errors from input results
 */
export function combineValidationResults(results: ValidationResult[]): ValidationResult {
  const combinedErrors: ValidationError[] = [];
  
  for (const result of results) {
    if (!result.success) {
      combinedErrors.push(...result.errors);
    }
  }
  
  return {
    success: combinedErrors.length === 0,
    errors: combinedErrors
  };
}

/**
 * Creates a ValidationError from validation results
 * 
 * @param validationResult - The validation result to convert to an error
 * @param message - Optional custom error message
 * @returns Validation error with field-specific details
 */
export function createValidationError(
  validationResult: ValidationResult,
  message?: string
): ValidationErrorClass {
  if (validationResult.success || !validationResult.errors.length) {
    logger.debug('Attempted to create validation error from successful validation result');
    return null;
  }
  
  const fieldErrors: FieldError[] = validationResult.errors.map(error => ({
    field: error.field,
    message: error.message,
    code: error.code
  }));
  
  return ValidationErrorClass.createFromFieldErrors(
    fieldErrors,
    message || 'Validation failed'
  );
}