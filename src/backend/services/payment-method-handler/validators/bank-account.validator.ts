import { ValidationResult, combineValidationResults } from '../../../../common/utils/validation-utils';
import validateRoutingNumber from '../../../bank-account-manager/validators/routing-number.validator';
import validateAccountNumber from '../../../bank-account-manager/validators/account-number.validator';
import { RefundRequest } from '../../../../common/interfaces/refund.interface';
import { 
  IBankAccount, 
  BankAccountStatus,
  BankAccountVerificationStatus 
} from '../../../../common/interfaces/bank-account.interface';
import { Transaction } from '../../../../common/interfaces/payment.interface';
import { logger } from '../../../../common/utils/logger';

/**
 * Validates a refund request using the OTHER method with bank account details
 * 
 * @param refundRequest - The refund request to validate
 * @param transaction - The original transaction being refunded
 * @param bankAccount - The bank account to be used for the refund
 * @returns Validation result with success flag and error messages
 */
async function validateBankAccountRefund(
  refundRequest: RefundRequest,
  transaction: Transaction,
  bankAccount: IBankAccount
): Promise<ValidationResult> {
  logger.debug(`Validating bank account refund for request ${refundRequest.bankAccountId}`, {
    transactionId: refundRequest.transactionId,
    merchantId: refundRequest.merchantId
  });

  const validationResults: ValidationResult[] = [];
  
  // Validate bank account exists
  if (!bankAccount) {
    return {
      success: false,
      errors: [{
        field: 'bankAccountId',
        message: 'Bank account not found',
        code: 'BANK_ACCOUNT_NOT_FOUND'
      }]
    };
  }
  
  // Validate bank account belongs to merchant
  validationResults.push(validateBankAccountAccess(bankAccount, refundRequest.merchantId));
  
  // Validate bank account status
  validationResults.push(validateBankAccountStatus(bankAccount));
  
  // Validate refund amount doesn't exceed transaction amount
  if (refundRequest.amount > transaction.amount) {
    validationResults.push({
      success: false,
      errors: [{
        field: 'amount',
        message: 'Refund amount cannot exceed original transaction amount',
        code: 'MAX_REFUND_AMOUNT_EXCEEDED'
      }]
    });
  }
  
  // Combine all validation results
  return combineValidationResults(validationResults);
}

/**
 * Validates that a bank account belongs to the merchant and is accessible
 * 
 * @param bankAccount - The bank account to validate
 * @param merchantId - The merchant ID to validate against
 * @returns Validation result with success flag and error messages
 */
function validateBankAccountAccess(
  bankAccount: IBankAccount,
  merchantId: string
): ValidationResult {
  const errors = [];
  
  // Check if bank account exists
  if (!bankAccount) {
    errors.push({
      field: 'bankAccountId',
      message: 'Bank account not found',
      code: 'BANK_ACCOUNT_NOT_FOUND'
    });
    return { success: false, errors };
  }
  
  // Check if bank account belongs to the merchant
  if (bankAccount.merchantId !== merchantId) {
    errors.push({
      field: 'bankAccountId',
      message: 'Bank account does not belong to this merchant',
      code: 'UNAUTHORIZED_ACCESS'
    });
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Validates that a bank account is active and verified for use in refunds
 * 
 * @param bankAccount - The bank account to validate
 * @returns Validation result with success flag and error messages
 */
function validateBankAccountStatus(bankAccount: IBankAccount): ValidationResult {
  const errors = [];
  
  // Check if bank account is active
  if (bankAccount.status !== BankAccountStatus.ACTIVE) {
    errors.push({
      field: 'bankAccountId',
      message: 'Bank account is not active',
      code: 'INVALID_STATE'
    });
  }
  
  // Check if bank account is verified
  if (bankAccount.verificationStatus !== BankAccountVerificationStatus.VERIFIED) {
    errors.push({
      field: 'bankAccountId',
      message: 'Bank account is not verified',
      code: 'VERIFICATION_REQUIRED'
    });
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Retrieves a bank account for validation based on refund request details
 * 
 * @param refundRequest - The refund request containing bank account ID
 * @param merchantId - The merchant ID for access validation
 * @param bankAccountManagerGetter - Function to get bank account manager
 * @returns Bank account entity for validation
 */
async function getBankAccountForValidation(
  refundRequest: RefundRequest,
  merchantId: string,
  bankAccountManagerGetter: Function
): Promise<IBankAccount> {
  logger.debug('Retrieving bank account for validation', {
    refundRequestId: refundRequest.refundRequestId,
    bankAccountId: refundRequest.bankAccountId,
    merchantId
  });
  
  try {
    // Get bank account manager
    const bankAccountManager = bankAccountManagerGetter();
    
    // Get bank account for refund
    return await bankAccountManager.getBankAccountForRefund(refundRequest, merchantId);
  } catch (error) {
    logger.error('Error retrieving bank account for validation', {
      error,
      refundRequestId: refundRequest.refundRequestId,
      bankAccountId: refundRequest.bankAccountId,
      merchantId
    });
    throw error;
  }
}

export default validateBankAccountRefund;
export { validateBankAccountAccess, validateBankAccountStatus, getBankAccountForValidation };