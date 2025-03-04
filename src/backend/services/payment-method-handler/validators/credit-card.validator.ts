import { ValidationError } from '../../../../common/errors/validation-error';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { ValidationResult } from '../../../../common/utils/validation-utils';
import { RefundMethod } from '../../../../common/enums/refund-method.enum';
import { Transaction, CardPaymentDetails, RefundRequest, CardNetworkRules } from '../../../../common/interfaces/payment.interface';
import parameterResolutionService from '../../../parameter-resolution/parameter-resolution.service';
import { logger } from '../../../../common/utils/logger';

/**
 * Validates a refund request for a credit card transaction against card network rules and time limits
 * @param refundRequest 
 * @param transaction 
 * @returns Result of validation with success flag and any errors
 */
export async function validateCreditCardRefund(refundRequest: RefundRequest, transaction: Transaction): Promise<ValidationResult> {
  // LD1: Verify the transaction payment method is a credit card
  if (transaction.paymentMethod.type !== 'CREDIT_CARD') {
    // LD2: Throw validation error if not a credit card
    return {
      success: false,
      errors: [new ValidationError(ErrorCode.VALIDATION_ERROR, 'Transaction is not a credit card payment')]
    };
  }

  // LD1: Extract card payment details from the transaction
  const cardDetails = transaction.paymentMethod as CardPaymentDetails;

  // LD1: Get card network from card details
  const cardNetwork = cardDetails.cardNetwork;

  // LD1: Retrieve card network-specific rules from parameter resolution service
  const networkRules = await getCardNetworkRules(cardNetwork, transaction.merchantId);

  // LD1: Check if the refund method is allowed for this card network
  if (networkRules.allowedRefundMethods && !networkRules.allowedRefundMethods.includes(refundRequest.refundMethod)) {
    // LD2: Throw validation error if refund method is not allowed
    return {
      success: false,
      errors: [new ValidationError(ErrorCode.INVALID_REFUND_METHOD, `Refund method ${refundRequest.refundMethod} is not allowed for ${cardNetwork}`)]
    };
  }

  // LD1: Calculate the time since the original transaction
  const transactionDate = transaction.processedAt;
  const currentDate = new Date();
  const timeElapsed = currentDate.getTime() - transactionDate.getTime();
  const daysElapsed = timeElapsed / (1000 * 3600 * 24);

  // LD1: Validate that the refund is within the time limit for the card network
  if (networkRules.timeLimit && daysElapsed > networkRules.timeLimit) {
    // LD2: Throw validation error if refund time limit exceeded
    return {
      success: false,
      errors: [new ValidationError(ErrorCode.REFUND_TIME_LIMIT_EXCEEDED, `Refund time limit exceeded for ${cardNetwork}. Maximum allowed days: ${networkRules.timeLimit}`)]
    };
  }

  // LD1: Check if the card has expired (warning only, not a hard validation failure)
  if (isCardExpired(cardDetails)) {
    // LD2: Log a warning if the card is expired
    logger.info(`Card is expired for transaction ${transaction.transactionId}. Proceeding with refund.`);
  }

  // LD1: Return validation result with any errors
  return { success: true, errors: [] };
}

/**
 * Checks if a credit card has expired based on its expiry month and year
 * @param cardDetails 
 * @returns True if card is expired, false otherwise
 */
export function isCardExpired(cardDetails: CardPaymentDetails): boolean {
  // LD1: Get current date
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // Month is 0-indexed

  // LD1: Extract expiry month and year from card details
  const expiryMonth = cardDetails.expiryMonth;
  const expiryYear = cardDetails.expiryYear;

  // LD1: Convert expiry to a Date object (last day of expiry month)
  const expiryDate = new Date(expiryYear, expiryMonth, 0);

  // LD1: Compare with current date to determine if expired
  return expiryDate < currentDate;
}

/**
 * Retrieves card network-specific rules from the parameter resolution service
 * @param cardNetwork 
 * @param merchantId 
 * @returns Rules specific to the card network
 */
export async function getCardNetworkRules(cardNetwork: string, merchantId: string): Promise<CardNetworkRules> {
  // LD1: Generate parameter name based on card network
  const parameterName = `cardNetworkRules.${cardNetwork}`;

  // LD1: Retrieve rules from parameter resolution service
  let rules: CardNetworkRules;
  try {
    rules = await parameterResolutionService.getParameterValue(parameterName, merchantId);
  } catch (error) {
    logger.error(`Failed to retrieve card network rules for ${cardNetwork}. Using default rules.`, error);
  }

  // LD1: If rules not found, use default rules
  if (!rules) {
    rules = {
      timeLimit: 120, // Default 120 days
      allowedRefundMethods: [RefundMethod.ORIGINAL_PAYMENT] // Default to original payment method only
    };
  }

  // LD1: Return card network rules
  return rules;
}