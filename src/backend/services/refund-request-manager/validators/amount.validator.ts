import { ValidationError } from '../../../../common/errors/validation-error';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { isValidCurrencyAmount, compareCurrency } from '../../../../common/utils/currency-utils';
import { validateRefundAmount, ValidationResult, createValidationError } from '../../../../common/utils/validation-utils';
import { logger } from '../../../../common/utils/logger';
import parameterResolutionService from '../../../parameter-resolution/parameter-resolution.service';

/**
 * Validates if a refund amount is valid according to business rules and constraints
 * @param refundAmount The refund amount
 * @param transaction The transaction
 * @param merchantId The merchantId
 * @returns Returns true if amount is valid, or ValidationError with details if invalid
 */
export async function validateAmount(
  refundAmount: number,
  transaction: any,
  merchantId: string
): Promise<boolean | ValidationError> {
  // Check if refundAmount is a valid currency amount
  if (!isValidCurrencyAmount(refundAmount)) {
    return createValidationError({
      success: false,
      errors: [{
        field: 'refundAmount',
        message: 'The refund amount is not a valid currency amount',
        code: ErrorCode.INVALID_INPUT
      }]
    });
  }

  // Verify refundAmount is greater than zero
  if (refundAmount <= 0) {
    return createValidationError({
      success: false,
      errors: [{
        field: 'refundAmount',
        message: 'The refund amount must be greater than zero',
        code: ErrorCode.INVALID_INPUT
      }]
    });
  }

  // Compare refundAmount with original transaction amount to ensure it doesn't exceed
  if (compareCurrency(refundAmount, transaction.amount) > 0) {
    return createValidationError({
      success: false,
      errors: [{
        field: 'refundAmount',
        message: 'The refund amount cannot exceed the original transaction amount',
        code: ErrorCode.MAX_REFUND_AMOUNT_EXCEEDED
      }]
    });
  }

  // Retrieve maxRefundAmount parameter using parameterResolutionService for the merchant
  try {
    const maxRefundAmount = await parameterResolutionService.getParameterValue('maxRefundAmount', merchantId);

    // If maxRefundAmount is configured, validate refund amount against this limit
    if (maxRefundAmount !== null && refundAmount > maxRefundAmount) {
      return createValidationError({
        success: false,
        errors: [{
          field: 'refundAmount',
          message: `The refund amount cannot exceed the maximum allowed amount of ${maxRefundAmount}`,
          code: ErrorCode.MAX_REFUND_AMOUNT_EXCEEDED
        }]
      });
    }
  } catch (error) {
    logger.error('Error retrieving maxRefundAmount parameter', { error });
    // If there's an error retrieving the parameter, it should not block the refund.
    // Log the error and proceed as if there's no maxRefundAmount configured.
  }

  // If validation fails, return appropriate ValidationError with details
  const validationResult: ValidationResult = validateRefundAmount(refundAmount, transaction.amount);
  if (!validationResult.success) {
    return createValidationError(validationResult);
  }

  // Return true if all validations pass
  return true;
}

/**
 * Validates that a full refund is allowed for the given transaction
 * @param transaction The transaction
 * @param merchantId The merchantId
 * @returns Returns true if full refund is allowed, or ValidationError with details if not
 */
export async function validateFullRefund(
  transaction: any,
  merchantId: string
): Promise<boolean | ValidationError> {
  // Extract the transaction amount
  const transactionAmount = transaction.amount;

  // Call validateAmount with the full transaction amount
  return validateAmount(transactionAmount, transaction, merchantId);
}

/**
 * Validates that a partial refund amount is valid for the given transaction
 * @param partialAmount The partial amount
 * @param transaction The transaction
 * @param merchantId The merchantId
 * @returns Returns true if partial refund amount is valid, or ValidationError with details if not
 */
export async function validatePartialRefund(
  partialAmount: number,
  transaction: any,
  merchantId: string
): Promise<boolean | ValidationError> {
  // Call validateAmount with the partial amount specified
  return validateAmount(partialAmount, transaction, merchantId);
}

/**
 * Retrieves the maximum allowed refund amount for a merchant
 * @param merchantId The merchantId
 * @returns The maximum refund amount or null if no limit is configured
 */
export async function getMaxRefundAmount(merchantId: string): Promise<number | null> {
  // Use parameterResolutionService to resolve maxRefundAmount parameter for the merchant
  try {
    const maxRefundAmount = await parameterResolutionService.getParameterValue('maxRefundAmount', merchantId);
    return maxRefundAmount !== undefined ? maxRefundAmount : null;
  } catch (error) {
    logger.error('Error retrieving maxRefundAmount parameter', { error });
    return null;
  }
}