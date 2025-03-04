import { ValidationError } from '../../../../common/errors/validation-error';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { ValidationResult } from '../../../../common/utils/validation-utils';
import { RefundMethod } from '../../../../common/enums/refund-method.enum';
import {
  Transaction,
  CardPaymentDetails,
  RefundRequest,
  CardNetworkRules,
  PaymentMethodType,
} from '../../../../common/interfaces/payment.interface';
import parameterResolutionService from '../../../parameter-resolution/parameter-resolution.service';
import { logger } from '../../../../common/utils/logger';

/**
 * Validates a refund request for a debit card transaction against card network rules and time limits
 * @param refundRequest Refund request
 * @param transaction Transaction
 * @returns Result of validation with success flag and any errors
 */
export async function validateDebitCardRefund(
  refundRequest: RefundRequest,
  transaction: Transaction
): Promise<ValidationResult> {
  // Verify the transaction payment method is a debit card
  if (transaction.paymentMethod.type !== PaymentMethodType.DEBIT_CARD) {
    logger.debug(`Transaction is not a debit card transaction: ${transaction.paymentMethod.type}`);
    return {
      success: false,
      errors: [
        new ValidationError(
          ErrorCode.VALIDATION_ERROR,
          'Transaction is not a debit card transaction'
        ),
      ],
    };
  }

  // Extract card payment details from the transaction
  const cardDetails = transaction.paymentMethod as CardPaymentDetails;

  // Get card network from card details
  const cardNetwork = cardDetails.cardNetwork;

  // Retrieve card network-specific rules from parameter resolution service
  const networkRules = await getCardNetworkRules(cardNetwork, refundRequest.merchantId);

  // Check if the refund method is allowed for this card network
  if (
    networkRules.allowedRefundMethods &&
    !networkRules.allowedRefundMethods.includes(refundRequest.refundMethod)
  ) {
    logger.debug(
      `Refund method ${refundRequest.refundMethod} is not allowed for card network ${cardNetwork}`
    );
    return {
      success: false,
      errors: [
        new ValidationError(
          ErrorCode.INVALID_REFUND_METHOD,
          `Refund method ${refundRequest.refundMethod} is not allowed for card network ${cardNetwork}`
        ),
      ],
    };
  }

  // Calculate the time since the original transaction
  const transactionDate = new Date(transaction.processedAt);
  const currentDate = new Date();
  const timeDiff = currentDate.getTime() - transactionDate.getTime();
  const daysSinceTransaction = Math.ceil(timeDiff / (1000 * 3600 * 24));

  // Validate that the refund is within the time limit for the card network
  if (networkRules.timeLimit && daysSinceTransaction > networkRules.timeLimit) {
    logger.debug(
      `Refund time limit exceeded for card network ${cardNetwork}: ${daysSinceTransaction} days`
    );
    return {
      success: false,
      errors: [
        new ValidationError(
          ErrorCode.REFUND_TIME_LIMIT_EXCEEDED,
          `Refund time limit exceeded for card network ${cardNetwork}`
        ),
      ],
    };
  }

  // Check for daily and weekly refund limits specific to debit cards
  const limitCheckResult = await checkDebitCardLimits(refundRequest, cardNetwork, refundRequest.merchantId);
  if (!limitCheckResult.success) {
    return limitCheckResult;
  }

  // Check if the card has expired (warning only, not a hard validation failure)
  if (isCardExpired(cardDetails)) {
    logger.info(`Debit card is expired, but still processing refund: ${cardDetails.lastFour}`);
  }

  // Return validation result with any errors
  return { success: true, errors: [] };
}

/**
 * Checks if a debit card has expired based on its expiry month and year
 * @param cardDetails CardPaymentDetails
 * @returns True if card is expired, false otherwise
 */
export function isCardExpired(cardDetails: CardPaymentDetails): boolean {
  // Get current date
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // Month is 0-indexed

  // Extract expiry month and year from card details
  const expiryMonth = cardDetails.expiryMonth;
  const expiryYear = cardDetails.expiryYear;

  // Convert expiry to a Date object (last day of expiry month)
  const expiryDate = new Date(expiryYear, expiryMonth, 0);

  // Compare with current date to determine if expired
  return expiryDate < now;
}

/**
 * Retrieves card network-specific rules from the parameter resolution service
 * @param cardNetwork Card network
 * @param merchantId 
 * @returns Rules specific to the card network
 */
export async function getCardNetworkRules(cardNetwork: string, merchantId: string): Promise<CardNetworkRules> {
  // Generate parameter name based on card network
  const parameterName = `cardNetworkRules.${cardNetwork}`;

  // Retrieve rules from parameter resolution service
  const rules = await parameterResolutionService.resolveParameter(parameterName, merchantId);

  // If rules not found, use default rules specific to debit cards
  if (!rules) {
    logger.info(`No specific rules found for card network ${cardNetwork}, using default debit card rules`);
    return {
      timeLimit: 120, // Default 120 days
      allowedRefundMethods: [RefundMethod.ORIGINAL_PAYMENT], // Default to original payment
    };
  }

  // Return card network rules
  return rules as CardNetworkRules;
}

/**
 * Checks if the refund amount exceeds daily or weekly limits for debit cards
 * @param refundRequest RefundRequest
 * @param cardNetwork Card network
 * @param merchantId 
 * @returns Result of limit validation
 */
export async function checkDebitCardLimits(
  refundRequest: RefundRequest,
  cardNetwork: string,
  merchantId: string
): Promise<ValidationResult> {
  // Retrieve daily and weekly limits from parameter resolution service
  const dailyLimit = await parameterResolutionService.resolveParameter(
    `debitCard.dailyLimit.${cardNetwork}`,
    merchantId
  );
  const weeklyLimit = await parameterResolutionService.resolveParameter(
    `debitCard.weeklyLimit.${cardNetwork}`,
    merchantId
  );

  // Check current daily and weekly refund totals for the card
  // TODO: Implement logic to retrieve current totals from database or cache

  const currentDailyTotal = 0; // Placeholder
  const currentWeeklyTotal = 0; // Placeholder

  // Validate that the refund amount plus existing totals don't exceed limits
  if (refundRequest.amount + currentDailyTotal > dailyLimit) {
    logger.debug(
      `Refund amount exceeds daily limit for card network ${cardNetwork}: ${refundRequest.amount} > ${dailyLimit}`
    );
    return {
      success: false,
      errors: [
        new ValidationError(
          ErrorCode.RULE_VIOLATION,
          `Refund amount exceeds daily limit for card network ${cardNetwork}`
        ),
      ],
    };
  }

  if (refundRequest.amount + currentWeeklyTotal > weeklyLimit) {
    logger.debug(
      `Refund amount exceeds weekly limit for card network ${cardNetwork}: ${refundRequest.amount} > ${weeklyLimit}`
    );
    return {
      success: false,
      errors: [
        new ValidationError(
          ErrorCode.RULE_VIOLATION,
          `Refund amount exceeds weekly limit for card network ${cardNetwork}`
        ),
      ],
    };
  }

  // Return validation result with any limit violations
  return { success: true, errors: [] };
}