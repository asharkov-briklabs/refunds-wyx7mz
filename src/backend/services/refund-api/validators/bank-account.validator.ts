/**
 * Bank Account Validator
 * 
 * Provides validation logic for bank account operations in the Refunds Service,
 * ensuring that bank account data meets format requirements, business rules, 
 * and security standards before processing.
 */

import { 
  ValidationResult, 
  validateRequiredFields, 
  validateDataType, 
  validateStringLength, 
  validateEnum, 
  combineValidationResults,
  createValidationError
} from '../../../common/utils/validation-utils';
import { 
  BankAccountCreationRequest, 
  BankAccountUpdateRequest, 
  BankAccountVerificationRequest,
  BankAccountType,
  BankAccountStatus,
  BankAccountVerificationMethod
} from '../../../common/interfaces/bank-account.interface';
import { ValidationError } from '../../../common/errors/validation-error';
import { ErrorCode } from '../../../common/constants/error-codes';
import { logger } from '../../../common/utils/logger';
import { isValidRoutingNumber } from '../../bank-account-manager/validators/routing-number.validator';
import { isValidAccountNumber } from '../../bank-account-manager/validators/account-number.validator';

/**
 * Validates a bank account creation request against format requirements and business rules
 * 
 * @param bankAccount - The bank account creation request to validate
 * @returns Validation result with success flag and errors if validation fails
 */
export function validateBankAccount(bankAccount: BankAccountCreationRequest): ValidationResult {
  logger.debug('Validating bank account creation request');
  
  // Validate required fields
  const requiredFields = [
    'merchantId', 
    'accountHolderName', 
    'accountType', 
    'routingNumber', 
    'accountNumber'
  ];
  const requiredFieldsResult = validateRequiredFields(bankAccount, requiredFields);
  
  // Validate data types
  const dataTypeResult = validateDataType(bankAccount, {
    merchantId: 'string',
    accountHolderName: 'string',
    routingNumber: 'string',
    accountNumber: 'string',
    isDefault: 'boolean',
    initiateVerification: 'boolean'
  });
  
  // Validate string lengths
  let lengthResults: ValidationResult[] = [];
  if (bankAccount.accountHolderName) {
    lengthResults.push(
      validateStringLength(bankAccount.accountHolderName, 'accountHolderName', 2, 100)
    );
  }
  
  // Validate accountType is a valid enum value
  let accountTypeResult: ValidationResult = { success: true, errors: [] };
  if (bankAccount.accountType) {
    accountTypeResult = validateEnum(
      bankAccount.accountType, 
      'accountType', 
      Object.values(BankAccountType)
    );
  }
  
  // Validate routingNumber
  let routingNumberResult: ValidationResult = { success: true, errors: [] };
  if (bankAccount.routingNumber) {
    if (!isValidRoutingNumber(bankAccount.routingNumber)) {
      routingNumberResult = {
        success: false,
        errors: [{
          field: 'routingNumber',
          message: 'Invalid routing number',
          code: ErrorCode.INVALID_FORMAT
        }]
      };
    }
  }
  
  // Validate accountNumber
  let accountNumberResult: ValidationResult = { success: true, errors: [] };
  if (bankAccount.accountNumber) {
    if (!isValidAccountNumber(bankAccount.accountNumber)) {
      accountNumberResult = {
        success: false,
        errors: [{
          field: 'accountNumber',
          message: 'Account number must be between 4 and 17 digits',
          code: ErrorCode.INVALID_FORMAT
        }]
      };
    }
  }
  
  // Validate verificationMethod if provided
  let verificationMethodResult: ValidationResult = { success: true, errors: [] };
  if (bankAccount.verificationMethod) {
    verificationMethodResult = validateEnum(
      bankAccount.verificationMethod, 
      'verificationMethod', 
      Object.values(BankAccountVerificationMethod)
    );
  }
  
  // Combine all validation results
  return combineValidationResults([
    requiredFieldsResult,
    dataTypeResult,
    ...lengthResults,
    accountTypeResult,
    routingNumberResult,
    accountNumberResult,
    verificationMethodResult
  ]);
}

/**
 * Validates a bank account update request against business rules
 * 
 * @param updateData - The bank account update request to validate
 * @returns Validation result with success flag and errors if validation fails
 */
export function validateBankAccountUpdate(updateData: BankAccountUpdateRequest): ValidationResult {
  logger.debug('Validating bank account update request');
  
  const validationResults: ValidationResult[] = [];
  
  // Validate data types if fields are provided
  const dataTypes: Record<string, string> = {};
  if (updateData.accountHolderName !== undefined) dataTypes.accountHolderName = 'string';
  if (updateData.isDefault !== undefined) dataTypes.isDefault = 'boolean';
  if (updateData.status !== undefined) dataTypes.status = 'string';
  
  validationResults.push(validateDataType(updateData, dataTypes));
  
  // Validate accountHolderName length if provided
  if (updateData.accountHolderName) {
    validationResults.push(
      validateStringLength(updateData.accountHolderName, 'accountHolderName', 2, 100)
    );
  }
  
  // Validate status if provided
  if (updateData.status) {
    validationResults.push(
      validateEnum(updateData.status, 'status', Object.values(BankAccountStatus))
    );
  }
  
  return combineValidationResults(validationResults);
}

/**
 * Validates a bank account verification request
 * 
 * @param verificationData - The verification request to validate
 * @returns Validation result with success flag and errors if validation fails
 */
export function validateVerificationRequest(
  verificationData: BankAccountVerificationRequest
): ValidationResult {
  logger.debug('Validating bank account verification request');
  
  // Validate required fields
  const requiredFields = ['verificationId', 'accountId'];
  const requiredFieldsResult = validateRequiredFields(verificationData, requiredFields);
  
  // Validate data types
  const dataTypeResult = validateDataType(verificationData, {
    verificationId: 'string',
    accountId: 'string'
  });
  
  return combineValidationResults([
    requiredFieldsResult,
    dataTypeResult
  ]);
}

/**
 * Validates micro-deposit amounts for bank account verification
 * 
 * @param amounts - Array of micro-deposit amounts to validate
 * @returns Validation result with success flag and errors if validation fails
 */
export function validateMicroDepositAmounts(amounts: number[]): ValidationResult {
  logger.debug('Validating micro-deposit amounts');
  
  const errors = [];
  
  // Check if amounts is an array
  if (!Array.isArray(amounts)) {
    errors.push({
      field: 'amounts',
      message: 'Micro-deposit amounts must be an array',
      code: ErrorCode.INVALID_FORMAT
    });
    return { success: false, errors };
  }
  
  // Check if array has exactly 2 elements
  if (amounts.length !== 2) {
    errors.push({
      field: 'amounts',
      message: 'Micro-deposit verification requires exactly 2 amounts',
      code: ErrorCode.INVALID_FORMAT
    });
    return { success: false, errors };
  }
  
  // Validate each amount is a number between 0.01 and 0.99
  for (let i = 0; i < amounts.length; i++) {
    const amount = amounts[i];
    
    if (typeof amount !== 'number') {
      errors.push({
        field: `amounts[${i}]`,
        message: 'Micro-deposit amount must be a number',
        code: ErrorCode.INVALID_DATA_TYPE
      });
      continue;
    }
    
    if (amount < 0.01 || amount > 0.99) {
      errors.push({
        field: `amounts[${i}]`,
        message: 'Micro-deposit amount must be between 0.01 and 0.99',
        code: ErrorCode.INVALID_FORMAT
      });
    }
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Creates a standardized ValidationError for bank account validation failures
 * 
 * @param validationResult - Validation result with errors
 * @param message - Optional custom error message
 * @returns Formatted validation error with field details
 */
export function createBankAccountValidationError(
  validationResult: ValidationResult,
  message: string = 'Bank account validation failed'
): ValidationError {
  return createValidationError(validationResult, message);
}