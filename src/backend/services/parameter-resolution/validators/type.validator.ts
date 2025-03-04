/**
 * Type validator for parameter resolution service
 * 
 * Provides validation functions to ensure parameter values conform to their
 * defined data types. This is a critical component in the parameter resolution
 * service for maintaining configuration integrity across the hierarchical
 * parameter structure.
 */

import { ParameterDataType, ValidationResult } from '../models/parameter-definition.model';
import { isString, isNumber, isArray } from '../../../common/utils/validation-utils';
import { ValidationError } from '../../../common/errors/validation-error';
import { ErrorCode } from '../../../common/constants/error-codes';
import { logger } from '../../../common/utils/logger';

/**
 * Validates that a parameter value conforms to the expected data type
 * 
 * @param value - The value to validate
 * @param dataType - The expected data type
 * @returns Validation result with success flag and error messages if validation fails
 */
export default function validateType(value: any, dataType: ParameterDataType): ValidationResult {
  logger.debug(`Validating value type: ${getValueType(value)}, expected: ${dataType}`);
  
  // Check if value is null or undefined
  if (value === null || value === undefined) {
    return {
      valid: false,
      errors: [`Value is required and cannot be null or undefined`]
    };
  }
  
  switch (dataType) {
    case ParameterDataType.STRING:
      if (!isString(value)) {
        return {
          valid: false,
          errors: [`Expected a string value, but got ${getValueType(value)}`]
        };
      }
      break;
      
    case ParameterDataType.NUMBER:
      if (!isNumber(value) || isNaN(value)) {
        return {
          valid: false,
          errors: [`Expected a number value, but got ${getValueType(value)}`]
        };
      }
      break;
      
    case ParameterDataType.BOOLEAN:
      if (typeof value !== 'boolean') {
        return {
          valid: false,
          errors: [`Expected a boolean value, but got ${getValueType(value)}`]
        };
      }
      break;
      
    case ParameterDataType.OBJECT:
      if (typeof value !== 'object' || value === null || isArray(value)) {
        return {
          valid: false,
          errors: [`Expected an object value, but got ${getValueType(value)}`]
        };
      }
      break;
      
    case ParameterDataType.ARRAY:
      if (!isArray(value)) {
        return {
          valid: false,
          errors: [`Expected an array value, but got ${getValueType(value)}`]
        };
      }
      break;
      
    case ParameterDataType.DECIMAL:
      // DECIMAL is especially important for financial calculations
      // Ensure it's a valid number that can be safely used for financial calculations
      if (!isNumber(value) || isNaN(value)) {
        return {
          valid: false,
          errors: [`Expected a decimal number value, but got ${getValueType(value)}`]
        };
      }
      break;
      
    default:
      return {
        valid: false,
        errors: [`Unknown data type: ${dataType}`]
      };
  }
  
  // If we get here, validation passed
  return {
    valid: true,
    errors: []
  };
}

/**
 * Creates a standardized ValidationError for type validation failures
 * 
 * @param value - The value that failed validation
 * @param expectedType - The expected data type
 * @param parameterName - The name of the parameter being validated
 * @returns Validation error with details about the type mismatch
 */
export function createTypeValidationError(
  value: any,
  expectedType: ParameterDataType,
  parameterName: string
): ValidationError {
  const actualType = getValueType(value);
  const message = `Parameter '${parameterName}' has invalid type. Expected ${expectedType}, got ${actualType}`;
  
  const fieldError = {
    field: parameterName,
    message,
    code: ErrorCode.INVALID_DATA_TYPE
  };
  
  return ValidationError.createFromFieldErrors([fieldError], message);
}

/**
 * Gets a human-readable type name for a value
 * 
 * @param value - The value to get the type name for
 * @returns Human-readable type name
 */
export function getValueType(value: any): string {
  if (value === null) {
    return 'null';
  }
  
  if (value === undefined) {
    return 'undefined';
  }
  
  if (isArray(value)) {
    return 'array';
  }
  
  return typeof value;
}