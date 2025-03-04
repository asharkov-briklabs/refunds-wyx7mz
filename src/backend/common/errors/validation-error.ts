import { ApiError } from './api-error';
import { ErrorCode } from '../constants/error-codes';

/**
 * Interface defining the structure of validation error details
 */
export interface ValidationErrorDetail {
  fieldErrors: FieldError[];
  additionalData?: Record<string, unknown>;
}

/**
 * Interface defining the structure of field-specific validation errors
 */
export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Interface defining the structure of validation error responses
 */
export interface ValidationErrorResponse {
  code: string;
  message: string;
  fieldErrors?: FieldError[];
  detail?: ValidationErrorDetail;
}

/**
 * Error class for handling validation errors, extending the ApiError class with
 * validation-specific functionality for field-level error details.
 */
export class ValidationError extends ApiError {
  /**
   * Validation error detail containing field-specific errors
   */
  public readonly detail?: ValidationErrorDetail;
  
  /**
   * Array of field-specific errors
   */
  public readonly fieldErrors: FieldError[] = [];

  /**
   * Creates a new ValidationError with the provided error code, optional custom message,
   * and optional validation error detail.
   * 
   * @param errorCode - The error code identifying the type of error
   * @param message - Custom error message (overrides default message from ERROR_DETAILS)
   * @param detail - Validation error detail containing field-specific errors
   * @param cause - The original error that caused this validation error
   */
  constructor(
    errorCode: ErrorCode = ErrorCode.VALIDATION_ERROR,
    message?: string,
    detail?: ValidationErrorDetail,
    cause?: Error
  ) {
    super(errorCode, message);
    
    // Set the name property to match the class name
    this.name = 'ValidationError';
    
    // Store validation error detail
    this.detail = detail;
    
    // Initialize field errors from detail if provided
    if (detail?.fieldErrors) {
      this.fieldErrors = [...detail.fieldErrors];
    }
  }

  /**
   * Converts the validation error to a JSON-serializable object for API responses.
   * 
   * @returns A JSON representation of the validation error including field-level details
   */
  toJSON(): ValidationErrorResponse {
    // Get the base error representation from parent
    const baseError = super.toJSON();
    
    // Create the validation error response
    const response: ValidationErrorResponse = {
      ...baseError,
    };
    
    // Add validation detail if available
    if (this.detail) {
      response.detail = this.detail;
    }
    
    // Add field errors if available
    if (this.fieldErrors.length > 0) {
      response.fieldErrors = [...this.fieldErrors];
    }
    
    return response;
  }

  /**
   * Adds a field-specific error to the validation error.
   * 
   * @param field - The name of the field with the error
   * @param message - The error message for the field
   * @param code - Optional error code specific to this field error
   * @returns The ValidationError instance for method chaining
   */
  addFieldError(field: string, message: string, code?: string): ValidationError {
    this.fieldErrors.push({
      field,
      message,
      ...(code ? { code } : {})
    });
    
    return this;
  }

  /**
   * Checks if the validation error contains any field-specific errors.
   * 
   * @returns True if field errors exist, false otherwise
   */
  hasFieldErrors(): boolean {
    return this.fieldErrors.length > 0;
  }

  /**
   * Gets all field-specific errors.
   * 
   * @returns Array of field errors
   */
  getFieldErrors(): FieldError[] {
    return [...this.fieldErrors];
  }

  /**
   * Factory method to create a validation error from a list of field errors.
   * 
   * @param fieldErrors - Array of field-specific errors
   * @param message - Optional custom error message
   * @returns A new ValidationError with field errors
   */
  static createFromFieldErrors(fieldErrors: FieldError[], message?: string): ValidationError {
    const detail: ValidationErrorDetail = {
      fieldErrors: fieldErrors
    };
    
    return new ValidationError(ErrorCode.VALIDATION_ERROR, message, detail);
  }

  /**
   * Factory method to create an error for a required field that is missing.
   * 
   * @param fieldName - The name of the required field
   * @returns A new ValidationError for missing required field
   */
  static createRequiredFieldError(fieldName: string): ValidationError {
    const fieldError: FieldError = {
      field: fieldName,
      message: `The ${fieldName} field is required`,
      code: 'REQUIRED'
    };
    
    const detail: ValidationErrorDetail = {
      fieldErrors: [fieldError]
    };
    
    return new ValidationError(
      ErrorCode.REQUIRED_FIELD_MISSING,
      `Required field missing: ${fieldName}`,
      detail
    );
  }

  /**
   * Factory method to create an error for invalid format in a field.
   * 
   * @param fieldName - The name of the field with invalid format
   * @param expectedFormat - Description of the expected format
   * @returns A new ValidationError for format validation failure
   */
  static createInvalidFormatError(fieldName: string, expectedFormat: string): ValidationError {
    const message = `The ${fieldName} field has an invalid format. Expected: ${expectedFormat}`;
    
    const fieldError: FieldError = {
      field: fieldName,
      message,
      code: 'INVALID_FORMAT'
    };
    
    const detail: ValidationErrorDetail = {
      fieldErrors: [fieldError]
    };
    
    return new ValidationError(
      ErrorCode.INVALID_FORMAT,
      message,
      detail
    );
  }

  /**
   * Factory method to convert validation library errors to ValidationError.
   * 
   * @param validationErrors - Validation errors from external validation library
   * @returns A new ValidationError containing all validation library errors
   */
  static fromValidationLibrary(validationErrors: Record<string, string[]>): ValidationError {
    const fieldErrors: FieldError[] = [];
    
    // Convert validation library errors to field errors
    Object.entries(validationErrors).forEach(([field, errors]) => {
      errors.forEach(error => {
        fieldErrors.push({
          field,
          message: error
        });
      });
    });
    
    return ValidationError.createFromFieldErrors(fieldErrors);
  }
}