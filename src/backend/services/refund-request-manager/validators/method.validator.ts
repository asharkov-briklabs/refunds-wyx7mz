import { ValidationError } from '../../../../common/errors/validation-error';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { RefundMethod } from '../../../../common/enums/refund-method.enum';
import { ValidationResult, createValidationError } from '../../../../common/utils/validation-utils';
import { logger } from '../../../../common/utils/logger';
import parameterResolutionService from '../../../parameter-resolution/parameter-resolution.service';
import balanceServiceClient from '../../../integrations/balance-service/client';
import bankAccountManager from '../../../services/bank-account-manager/bank-account-manager.service';
import { BankAccountVerificationStatus, BankAccountStatus } from '../../../common/interfaces/bank-account.interface';

/**
 * Validates if a refund method is valid according to business rules and constraints
 * @param refundMethod 
 * @param transaction 
 * @param merchantId 
 * @param bankAccountId 
 * @returns Returns true if method is valid, or ValidationError with details if invalid
 */
export const validateMethod = async (
  refundMethod: RefundMethod,
  transaction: any,
  merchantId: string,
  bankAccountId?: string
): Promise<boolean | ValidationError> => {
  logger.debug(`Validating refund method: ${refundMethod} for transaction: ${transaction.id}`);

  // Verify the refundMethod is a valid enum value
  if (!Object.values(RefundMethod).includes(refundMethod)) {
    logger.error(`Unsupported refund method: ${refundMethod}`);
    return new ValidationError(ErrorCode.UNSUPPORTED_REFUND_METHOD, `Unsupported refund method: ${refundMethod}`);
  }

  // Retrieve allowed refund methods configuration for the merchant
  const allowedMethods = await getAllowedRefundMethods(merchantId);

  // Check if the provided refund method is allowed based on configuration
  if (!allowedMethods.includes(refundMethod)) {
    logger.warn(`Refund method not allowed: ${refundMethod} for merchant: ${merchantId}`);
    return new ValidationError(ErrorCode.METHOD_NOT_ALLOWED, `Refund method ${refundMethod} is not allowed for this merchant`);
  }

  // Based on refund method, perform method-specific validation
  switch (refundMethod) {
    case RefundMethod.ORIGINAL_PAYMENT:
      // For ORIGINAL_PAYMENT, check if original payment is still valid for refund
      if (!transaction.payment_method_valid_for_refund) {
        logger.warn(`Original payment method not valid for refund for transaction: ${transaction.id}`);
        return new ValidationError(ErrorCode.INVALID_INPUT, 'Original payment method is not valid for refund');
      }
      break;

    case RefundMethod.BALANCE:
      // For BALANCE, check if merchant has sufficient balance
      const hasSufficientBalance = await balanceServiceClient.hasSufficientBalance(merchantId, transaction.amount, transaction.currency);
      if (!hasSufficientBalance) {
        logger.warn(`Insufficient balance for refund for merchant: ${merchantId}`);
        return new ValidationError(ErrorCode.INSUFFICIENT_BALANCE, 'Insufficient balance for refund');
      }
      break;

    case RefundMethod.OTHER:
      // For OTHER, validate bank account exists and is verified
      if (!bankAccountId) {
        logger.warn(`Bank account ID is required for OTHER refund method`);
        return new ValidationError(ErrorCode.INVALID_INPUT, 'Bank account ID is required for OTHER refund method');
      }

      const bankAccount = await bankAccountManager.getDefaultBankAccount(merchantId, 'system');

      if (!bankAccount) {
        logger.warn(`No bank account found for merchant: ${merchantId}`);
        return new ValidationError(ErrorCode.NO_BANK_ACCOUNT, 'No bank account found for merchant');
      }

      if (bankAccount.verificationStatus !== BankAccountVerificationStatus.VERIFIED) {
        logger.warn(`Bank account not verified for merchant: ${merchantId}`);
        return new ValidationError(ErrorCode.UNVERIFIED_BANK_ACCOUNT, 'Bank account not verified');
      }

      if (bankAccount.status !== BankAccountStatus.ACTIVE) {
        logger.warn(`Bank account is not active for merchant: ${merchantId}`);
        return new ValidationError(ErrorCode.INVALID_INPUT, 'Bank account is not active');
      }
      break;

    default:
      logger.error(`Unsupported refund method: ${refundMethod}`);
      return new ValidationError(ErrorCode.UNSUPPORTED_REFUND_METHOD, `Unsupported refund method: ${refundMethod}`);
  }

  // Return true if all validations pass
  logger.debug(`Refund method: ${refundMethod} is valid for transaction: ${transaction.id}`);
  return true;
};

/**
 * Checks if a specific refund method is available for a transaction
 * @param refundMethod 
 * @param transaction 
 * @param merchantId 
 * @param bankAccountId 
 * @returns Validation result indicating if the method is available and any error details
 */
export const isMethodAvailable = async (
  refundMethod: RefundMethod,
  transaction: any,
  merchantId: string,
  bankAccountId?: string
): Promise<ValidationResult> => {
  logger.debug(`Checking if refund method: ${refundMethod} is available for transaction: ${transaction.id}`);

  switch (refundMethod) {
    case RefundMethod.ORIGINAL_PAYMENT:
      // For ORIGINAL_PAYMENT: Check if original transaction payment method supports refunds
      if (!transaction.payment_method_valid_for_refund) {
        logger.warn(`Original payment method does not support refunds for transaction: ${transaction.id}`);
        return { success: false, errors: [{ field: 'refundMethod', message: 'Original payment method does not support refunds', code: ErrorCode.METHOD_NOT_ALLOWED }] };
      }

      // For ORIGINAL_PAYMENT: Check if within time limits for original payment refunds
      if (transaction.expired_for_original_refund) {
        logger.warn(`Original payment method refund is expired for transaction: ${transaction.id}`);
        return { success: false, errors: [{ field: 'refundMethod', message: 'Original payment method refund is expired', code: ErrorCode.METHOD_NOT_ALLOWED }] };
      }
      break;

    case RefundMethod.BALANCE:
      // For BALANCE: Check if merchant has sufficient balance using balanceServiceClient
      const hasSufficientBalance = await balanceServiceClient.hasSufficientBalance(merchantId, transaction.amount, transaction.currency);
      if (!hasSufficientBalance) {
        logger.warn(`Insufficient balance for refund for merchant: ${merchantId}`);
        return { success: false, errors: [{ field: 'refundMethod', message: 'Insufficient balance for refund', code: ErrorCode.INSUFFICIENT_BALANCE }] };
      }
      break;

    case RefundMethod.OTHER:
      // For OTHER: Check if bank account exists, is active, and is verified
      if (!bankAccountId) {
        logger.warn(`Bank account ID is required for OTHER refund method`);
        return { success: false, errors: [{ field: 'bankAccountId', message: 'Bank account ID is required for OTHER refund method', code: ErrorCode.INVALID_INPUT }] };
      }

      const bankAccount = await bankAccountManager.getDefaultBankAccount(merchantId, 'system');

      if (!bankAccount) {
        logger.warn(`No bank account found for merchant: ${merchantId}`);
        return { success: false, errors: [{ field: 'bankAccountId', message: 'No bank account found for merchant', code: ErrorCode.NO_BANK_ACCOUNT }] };
      }

      if (bankAccount.verificationStatus !== BankAccountVerificationStatus.VERIFIED) {
        logger.warn(`Bank account not verified for merchant: ${merchantId}`);
        return { success: false, errors: [{ field: 'bankAccountId', message: 'Bank account not verified', code: ErrorCode.UNVERIFIED_BANK_ACCOUNT }] };
      }

      if (bankAccount.status !== BankAccountStatus.ACTIVE) {
        logger.warn(`Bank account is not active for merchant: ${merchantId}`);
        return { success: false, errors: [{ field: 'bankAccountId', message: 'Bank account is not active', code: ErrorCode.INVALID_INPUT }] };
      }
      break;
  }

  logger.debug(`Refund method: ${refundMethod} is available for transaction: ${transaction.id}`);
  return { success: true, errors: [] };
};

/**
 * Retrieves the allowed refund methods for a merchant from configuration
 * @param merchantId 
 * @returns Array of allowed refund methods for the merchant
 */
export const getAllowedRefundMethods = async (merchantId: string): Promise<RefundMethod[]> => {
  logger.debug(`Retrieving allowed refund methods for merchant: ${merchantId}`);

  // Use parameterResolutionService to resolve allowedMethods parameter for the merchant
  const allowedMethodsString = await parameterResolutionService.getParameterValue('allowedMethods', merchantId) as string;

  // If no configuration exists, return all refund methods as default
  if (!allowedMethodsString) {
    logger.warn(`No allowedMethods configuration found for merchant: ${merchantId}, returning all methods`);
    return Object.values(RefundMethod);
  }

  // Parse and validate the configured methods
  const configuredMethods = allowedMethodsString.split(',').map(method => method.trim());
  const validMethods: RefundMethod[] = [];

  for (const method of configuredMethods) {
    if (Object.values(RefundMethod).includes(method as RefundMethod)) {
      validMethods.push(method as RefundMethod);
    } else {
      logger.warn(`Invalid refund method configured: ${method}, skipping`);
    }
  }

  // Return the list of allowed methods
  logger.debug(`Allowed refund methods for merchant: ${merchantId}`, { methods: validMethods });
  return validMethods;
};

/**
 * Automatically selects the best refund method for a transaction
 * @param transaction 
 * @param merchantId 
 * @returns The selected refund method
 */
export const selectRefundMethod = async (transaction: any, merchantId: string): Promise<RefundMethod> => {
  logger.debug(`Selecting refund method for transaction: ${transaction.id}`);

  // Try ORIGINAL_PAYMENT first as the default preference
  if (transaction.payment_method_valid_for_refund && !transaction.expired_for_original_refund) {
    logger.debug(`Selecting ORIGINAL_PAYMENT method for transaction: ${transaction.id}`);
    return RefundMethod.ORIGINAL_PAYMENT;
  }

  // If original payment not available, check BALANCE method
  const hasSufficientBalance = await balanceServiceClient.hasSufficientBalance(merchantId, transaction.amount, transaction.currency);
  if (hasSufficientBalance) {
    logger.debug(`Selecting BALANCE method for transaction: ${transaction.id}`);
    return RefundMethod.BALANCE;
  }

  // If balance not available, fall back to OTHER method
  const bankAccount = await bankAccountManager.getDefaultBankAccount(merchantId, 'system');
  if (bankAccount && bankAccount.verificationStatus === BankAccountVerificationStatus.VERIFIED && bankAccount.status === BankAccountStatus.ACTIVE) {
    logger.debug(`Selecting OTHER method for transaction: ${transaction.id}`);
    return RefundMethod.OTHER;
  }

  // If no valid refund method is available, throw an error
  logger.error(`No valid refund method available for transaction: ${transaction.id}`);
  throw new ValidationError(ErrorCode.METHOD_NOT_ALLOWED, 'No valid refund method available for this transaction');
};