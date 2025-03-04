import { isValidCurrencyAmount, compareCurrencyAmounts } from './currency.utils';
import { 
  VALIDATION_ERROR_MESSAGES, 
  BANK_ACCOUNT_ERROR_MESSAGES, 
  REFUND_ERROR_MESSAGES,
  formatErrorWithParams 
} from '../constants/error-messages.constants';
import { RefundMethod } from '../types/refund.types';

// Regular expression for validating email addresses
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validates that a field has a non-empty value
 * 
 * @param value - The value to validate
 * @param fieldName - The name of the field for the error message
 * @returns Error message if validation fails, null if validation passes
 */
export const validateRequired = (
  value: any,
  fieldName: string
): string | null => {
  if (value === null || value === undefined || value === '') {
    return formatErrorWithParams(VALIDATION_ERROR_MESSAGES.REQUIRED_FIELD, { field: fieldName });
  }
  return null;
};

/**
 * Validates that a string meets the minimum length requirement
 * 
 * @param value - The string value to validate
 * @param minLength - The minimum length required
 * @param fieldName - The name of the field for the error message
 * @returns Error message if validation fails, null if validation passes
 */
export const validateMinLength = (
  value: string,
  minLength: number,
  fieldName: string
): string | null => {
  if (!value || value.length < minLength) {
    return formatErrorWithParams(VALIDATION_ERROR_MESSAGES.MIN_LENGTH, { 
      field: fieldName,
      minLength: minLength.toString()
    });
  }
  return null;
};

/**
 * Validates that a string does not exceed the maximum length
 * 
 * @param value - The string value to validate
 * @param maxLength - The maximum length allowed
 * @param fieldName - The name of the field for the error message
 * @returns Error message if validation fails, null if validation passes
 */
export const validateMaxLength = (
  value: string,
  maxLength: number,
  fieldName: string
): string | null => {
  if (value && value.length > maxLength) {
    return formatErrorWithParams(VALIDATION_ERROR_MESSAGES.MAX_LENGTH, { 
      field: fieldName,
      maxLength: maxLength.toString()
    });
  }
  return null;
};

/**
 * Validates that a string is a properly formatted email address
 * 
 * @param value - The email string to validate
 * @returns Error message if validation fails, null if validation passes
 */
export const validateEmail = (value: string): string | null => {
  if (!value) {
    return formatErrorWithParams(VALIDATION_ERROR_MESSAGES.REQUIRED_FIELD, { field: 'email' });
  }
  
  if (!EMAIL_REGEX.test(value)) {
    return VALIDATION_ERROR_MESSAGES.INVALID_EMAIL;
  }
  
  return null;
};

/**
 * Validates a bank routing number using the ABA routing number algorithm
 * 
 * @param routingNumber - The routing number to validate
 * @returns Error message if validation fails, null if validation passes
 */
export const validateRoutingNumber = (routingNumber: string): string | null => {
  // Check if the routing number is exactly 9 digits
  if (!routingNumber || !/^\d{9}$/.test(routingNumber)) {
    return BANK_ACCOUNT_ERROR_MESSAGES.INVALID_ROUTING_NUMBER;
  }
  
  // Apply the ABA routing number checksum validation algorithm
  // The algorithm is: 3(d1 + d4 + d7) + 7(d2 + d5 + d8) + (d3 + d6 + d9) mod 10 = 0
  const digits = routingNumber.split('').map(Number);
  
  const sum = 
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    (digits[2] + digits[5] + digits[8]);
  
  if (sum % 10 !== 0) {
    return BANK_ACCOUNT_ERROR_MESSAGES.INVALID_ROUTING_NUMBER;
  }
  
  return null;
};

/**
 * Validates a bank account number format
 * 
 * @param accountNumber - The account number to validate
 * @returns Error message if validation fails, null if validation passes
 */
export const validateAccountNumber = (accountNumber: string): string | null => {
  // Account number should only contain digits
  if (!accountNumber || !/^\d+$/.test(accountNumber)) {
    return BANK_ACCOUNT_ERROR_MESSAGES.INVALID_ACCOUNT_NUMBER;
  }
  
  // Account number length should be between 4 and 17 digits (standard US range)
  if (accountNumber.length < 4 || accountNumber.length > 17) {
    return BANK_ACCOUNT_ERROR_MESSAGES.INVALID_ACCOUNT_NUMBER;
  }
  
  return null;
};

/**
 * Validates that account number and confirmation account number match
 * 
 * @param accountNumber - The primary account number
 * @param confirmAccountNumber - The confirmation account number
 * @returns Error message if validation fails, null if validation passes
 */
export const validateAccountsMatch = (
  accountNumber: string,
  confirmAccountNumber: string
): string | null => {
  if (accountNumber && confirmAccountNumber && accountNumber !== confirmAccountNumber) {
    return BANK_ACCOUNT_ERROR_MESSAGES.ACCOUNT_NUMBERS_MUST_MATCH;
  }
  
  return null;
};

/**
 * Validates that a refund amount is valid and within allowed limits
 * 
 * @param amount - The refund amount to validate
 * @param transactionAmount - The original transaction amount
 * @returns Error message if validation fails, null if validation passes
 */
export const validateRefundAmount = (
  amount: number,
  transactionAmount: number
): string | null => {
  // Check if the amount is a valid currency amount
  if (!isValidCurrencyAmount(amount)) {
    return REFUND_ERROR_MESSAGES.INVALID_AMOUNT;
  }
  
  // Check if the refund amount exceeds the original transaction amount
  if (compareCurrencyAmounts(amount, transactionAmount) > 0) {
    return REFUND_ERROR_MESSAGES.MAX_AMOUNT_EXCEEDED;
  }
  
  return null;
};

/**
 * Validates that a refund method is valid and allowed for the transaction
 * 
 * @param method - The refund method to validate
 * @param availableMethods - Optional array of available refund methods
 * @returns Error message if validation fails, null if validation passes
 */
export const validateRefundMethod = (
  method: string | RefundMethod,
  availableMethods?: RefundMethod[]
): string | null => {
  // Check if a method is provided
  if (!method) {
    return REFUND_ERROR_MESSAGES.INVALID_REFUND_METHOD;
  }
  
  // Check if the method is a valid RefundMethod enum value
  const isValidMethod = Object.values(RefundMethod).includes(method as RefundMethod);
  if (!isValidMethod) {
    return REFUND_ERROR_MESSAGES.INVALID_REFUND_METHOD;
  }
  
  // If available methods are provided, check if the selected method is in the list
  if (availableMethods && availableMethods.length > 0) {
    if (!availableMethods.includes(method as RefundMethod)) {
      return REFUND_ERROR_MESSAGES.INVALID_REFUND_METHOD;
    }
  }
  
  return null;
};

/**
 * Validates that a bank account is provided when the refund method is OTHER
 * 
 * @param method - The selected refund method
 * @param bankAccountId - The selected bank account ID
 * @returns Error message if validation fails, null if validation passes
 */
export const validateBankAccountRequired = (
  method: string | RefundMethod,
  bankAccountId: string | null
): string | null => {
  if (method === RefundMethod.OTHER && !bankAccountId) {
    return BANK_ACCOUNT_ERROR_MESSAGES.BANK_ACCOUNT_REQUIRED;
  }
  
  return null;
};

/**
 * Validates a form object against a set of validation rules
 * 
 * @param formData - The form data object to validate
 * @param validationRules - Object mapping field names to validation functions
 * @returns Object with field names as keys and error messages as values
 */
export const validateForm = (
  formData: Record<string, any>,
  validationRules: Record<string, (value: any, formData: Record<string, any>) => string | null>
): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  // Apply each validation rule to the corresponding form field
  Object.keys(validationRules).forEach(fieldName => {
    const validationFn = validationRules[fieldName];
    const errorMessage = validationFn(formData[fieldName], formData);
    
    // If validation failed, add the error message
    if (errorMessage) {
      errors[fieldName] = errorMessage;
    }
  });
  
  return errors;
};