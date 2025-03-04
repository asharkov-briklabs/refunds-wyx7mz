import { ValidationResult } from '../../../../common/utils/validation-utils';
import { ErrorCode } from '../../../../common/constants/error-codes';

/**
 * Determines if a bank account number is valid based on its format and length
 * 
 * @param accountNumber - The account number to validate
 * @returns True if account number is valid, false otherwise
 */
export function isValidAccountNumber(accountNumber: string): boolean {
  // Check if accountNumber is a string
  if (typeof accountNumber !== 'string') {
    return false;
  }

  // Check if the account number is between 4 and 17 characters
  if (accountNumber.length < 4 || accountNumber.length > 17) {
    return false;
  }

  // Check if accountNumber consists only of digits
  const digitRegex = /^\d+$/;
  return digitRegex.test(accountNumber);
}

/**
 * Performs comprehensive validation on a bank account number and returns
 * a validation result with detailed error messages
 * 
 * @param accountNumber - The account number to validate
 * @returns Validation result with success flag and error messages if validation fails
 */
export default function validateAccountNumber(accountNumber: string): ValidationResult {
  const errors: Array<{ field: string; message: string; code?: string }> = [];

  // Check if account number is provided
  if (!accountNumber) {
    errors.push({
      field: 'accountNumber',
      message: 'Account number is required',
      code: ErrorCode.REQUIRED_FIELD_MISSING
    });
  } else {
    // Check if the account number has valid length
    if (accountNumber.length < 4 || accountNumber.length > 17) {
      errors.push({
        field: 'accountNumber',
        message: 'Account number must be between 4 and 17 digits',
        code: ErrorCode.INVALID_FORMAT
      });
    }

    // Check if account number contains only digits
    const digitRegex = /^\d+$/;
    if (!digitRegex.test(accountNumber)) {
      errors.push({
        field: 'accountNumber',
        message: 'Account number must contain only digits',
        code: ErrorCode.INVALID_FORMAT
      });
    }
  }

  return {
    success: errors.length === 0,
    errors
  };
}