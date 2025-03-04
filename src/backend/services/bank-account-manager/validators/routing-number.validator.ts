/**
 * Routing Number Validator
 * 
 * This module provides functions for validating US bank routing numbers,
 * including format validation and checksum calculations to ensure the
 * routing number conforms to standard requirements.
 * 
 * The validation includes checks for:
 * - Proper length (9 digits)
 * - Numeric-only content
 * - ABA routing number checksum algorithm:
 *   3(d₁+d₄+d₇) + 7(d₂+d₅+d₈) + (d₃+d₆+d₉) mod 10 = 0
 */

import { ValidationResult } from '../../../../common/utils/validation-utils';
import { ErrorCode } from '../../../../common/constants/error-codes';

/**
 * Validates if a routing number is valid by checking its length and
 * validating against a checksum algorithm
 * 
 * @param routingNumber - The routing number to validate
 * @returns True if routing number is valid, false otherwise
 */
export function isValidRoutingNumber(routingNumber: string): boolean {
  // Check if routingNumber is a string
  if (typeof routingNumber !== 'string') {
    return false;
  }

  // Verify the routing number is exactly 9 characters
  if (routingNumber.length !== 9) {
    return false;
  }

  // Check if routingNumber consists only of digits
  if (!/^\d{9}$/.test(routingNumber)) {
    return false;
  }

  // Convert routingNumber string to array of digits
  const digits = routingNumber.split('').map(char => parseInt(char, 10));

  // Calculate checksum:
  // 3 * (digits[0] + digits[3] + digits[6]) + 
  // 7 * (digits[1] + digits[4] + digits[7]) + 
  // (digits[2] + digits[5] + digits[8])
  const checksum = 
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    (digits[2] + digits[5] + digits[8]);

  // Valid routing numbers will have a checksum that is a multiple of 10
  return checksum % 10 === 0;
}

/**
 * Performs complete validation on a routing number and returns a validation result
 * with any error messages if validation fails
 * 
 * @param routingNumber - The routing number to validate
 * @returns Validation result with success flag and error messages if validation fails
 */
function validateRoutingNumber(routingNumber: string): ValidationResult {
  const errors = [];

  // Check if routing number is provided
  if (!routingNumber) {
    errors.push({
      field: 'routingNumber',
      message: 'Routing number is required',
      code: ErrorCode.REQUIRED_FIELD_MISSING
    });
    return {
      success: false,
      errors
    };
  }

  // Check if routing number has the correct format
  if (!/^\d{9}$/.test(routingNumber)) {
    errors.push({
      field: 'routingNumber',
      message: 'Routing number must be 9 digits',
      code: ErrorCode.INVALID_FORMAT
    });
    return {
      success: false,
      errors
    };
  }

  // Validate using checksum algorithm
  if (!isValidRoutingNumber(routingNumber)) {
    errors.push({
      field: 'routingNumber',
      message: 'Invalid routing number',
      code: ErrorCode.INVALID_FORMAT
    });
    return {
      success: false,
      errors
    };
  }

  // If we get here, the routing number is valid
  return {
    success: true,
    errors: []
  };
}

export default validateRoutingNumber;