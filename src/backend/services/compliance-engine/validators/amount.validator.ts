import { logger } from '../../../common/utils/logger';
import { RefundRequest } from '../../../common/interfaces/refund.interface';
import parameterResolutionService from '../../parameter-resolution/parameter-resolution.service';

/**
 * Interface for compliance violation information
 */
export interface ComplianceViolation {
  violationCode: string;
  violationMessage: string;
  severity: string;
  remediation: string;
  details: Record<string, any>;
}

/**
 * Interface providing context for compliance evaluations
 */
export interface ComplianceContext {
  merchantId: string;
  transactionDetails: any; // Replace 'any' with the actual type of transaction details
  paymentMethodType: string;
  cardNetwork: string;
  merchantConfiguration: any; // Replace 'any' with the actual type of merchant configuration
}

/**
 * Validates a refund request against a specific amount-related compliance rule
 * @param refundRequest The refund request to validate
 * @param rule The compliance rule to apply
 * @param context The compliance context
 * @returns Violation details if rule is violated, null otherwise
 */
export function validateAmountRule(
  refundRequest: RefundRequest,
  rule: any, // Replace 'any' with the actual type of the rule object
  context: ComplianceContext
): ComplianceViolation | null {
  // Extract the rule operator and expected values from the rule object
  const { operator, value } = rule.evaluation;

  logger.debug('Validating amount rule', {
    refundRequestId: refundRequest.refundRequestId,
    ruleId: rule.ruleId,
    operator,
    value,
  });

  // Get the refund amount from the request
  const refundAmount = refundRequest.amount;

  // Perform different validations based on the operator
  if (operator === 'lessThanOrEqual') {
    // Check if the refund amount is less than or equal to the maximum allowed amount
    if (refundAmount > value) {
      return createAmountViolation(rule, {
        refund_amount: refundAmount,
        limit_amount: value,
        currency: refundRequest.currency,
      });
    }
  } else if (operator === 'greaterThanOrEqual') {
    // Check if the refund amount is greater than or equal to the minimum allowed amount
    if (refundAmount < value) {
      return createAmountViolation(rule, {
        refund_amount: refundAmount,
        limit_amount: value,
        currency: refundRequest.currency,
      });
    }
  } else if (operator === 'lessThanOriginal') {
    // Check if the refund amount is less than the original transaction amount
    const originalAmount = context.transactionDetails.amount;
    if (refundAmount > originalAmount) {
      return createAmountViolation(rule, {
        refund_amount: refundAmount,
        original_amount: originalAmount,
        currency: refundRequest.currency,
      });
    }
  } else if (operator === 'withinPercentage') {
    // Check if the refund amount is within a specified percentage of the original amount
    const originalAmount = context.transactionDetails.amount;
    const percentage = parseFloat(value);
    const maxAllowedAmount = originalAmount * (percentage / 100);
    if (refundAmount > maxAllowedAmount) {
      return createAmountViolation(rule, {
        refund_amount: refundAmount,
        max_allowed_amount: maxAllowedAmount,
        percentage: percentage,
        currency: refundRequest.currency,
      });
    }
  } else if (operator === 'maxCumulativeAmount') {
    // Check if the refund amount exceeds the merchant's cumulative refund limit for a time period
    // This requires querying historical refund data, which is not yet implemented
    // Placeholder for future implementation
    logger.error('maxCumulativeAmount validation is not yet implemented');
  }

  // If all checks pass, return null (no violation)
  return null;
}

/**
 * Checks if refund amount exceeds the original transaction amount
 * @param refundAmount The amount of the refund
 * @param transaction The transaction object
 * @returns Violation details if amount exceeds original, null otherwise
 */
export function validateAgainstOriginalAmount(
  refundAmount: number,
  transaction: any // Replace 'any' with the actual type of the transaction object
): ComplianceViolation | null {
  // Extract original transaction amount
  const originalAmount = transaction.amount;

  // Compare refund amount to original amount
  if (refundAmount > originalAmount) {
    // If refund amount exceeds original amount, create and return violation
    return {
      violationCode: 'REFUND_EXCEEDS_ORIGINAL',
      violationMessage: `Refund amount ${refundAmount} exceeds original transaction amount ${originalAmount}`,
      severity: 'ERROR',
      remediation: 'Adjust refund amount to be less than or equal to the original transaction amount',
      details: {
        refundAmount,
        originalAmount,
      },
    };
  }

  // Otherwise return null
  return null;
}

/**
 * Validates refund amount against merchant configured maximum amount
 * @param refundAmount The amount of the refund
 * @param merchantId The ID of the merchant
 * @param context The compliance context
 * @returns Violation details if amount exceeds maximum, null otherwise
 */
export async function validateAgainstMaxRefundAmount(
  refundAmount: number,
  merchantId: string,
  context: ComplianceContext
): Promise<ComplianceViolation | null> {
  // Resolve 'maxRefundAmount' parameter for this merchant using parameterResolutionService
  const maxRefundAmount = await parameterResolutionService.resolveParameter(
    'maxRefundAmount',
    merchantId
  );

  // If no max amount is configured, return null (no violation)
  if (!maxRefundAmount) {
    return null;
  }

  // Compare refund amount against maximum configured amount
  if (refundAmount > maxRefundAmount) {
    // If refund amount exceeds maximum, create and return violation with details
    return {
      violationCode: 'REFUND_EXCEEDS_MAX',
      violationMessage: `Refund amount ${refundAmount} exceeds maximum configured amount ${maxRefundAmount}`,
      severity: 'ERROR',
      remediation: 'Adjust refund amount to be less than or equal to the maximum configured amount',
      details: {
        refundAmount,
        maxRefundAmount,
      },
    };
  }

  // Otherwise return null
  return null;
}

/**
 * Validates if refund amount is within a specified percentage of original amount
 * @param refundAmount The amount of the refund
 * @param transaction The transaction object
 * @param percentage The percentage of the original amount
 * @returns Violation details if percentage rule is violated, null otherwise
 */
export function validatePercentageOfOriginal(
  refundAmount: number,
  transaction: any, // Replace 'any' with the actual type of the transaction object
  percentage: number
): ComplianceViolation | null {
  // Calculate the maximum allowed amount based on percentage of original
  const originalAmount = transaction.amount;
  const maxAllowedAmount = originalAmount * (percentage / 100);

  // Compare refund amount to calculated maximum
  if (refundAmount > maxAllowedAmount) {
    // If refund amount exceeds calculated maximum, create and return violation
    return {
      violationCode: 'REFUND_EXCEEDS_PERCENTAGE',
      violationMessage: `Refund amount ${refundAmount} exceeds ${percentage}% of original transaction amount ${originalAmount}`,
      severity: 'ERROR',
      remediation: `Adjust refund amount to be within ${percentage}% of the original transaction amount`,
      details: {
        refundAmount,
        originalAmount,
        percentage,
        maxAllowedAmount,
      },
    };
  }

  // Otherwise return null
  return null;
}

/**
 * Validates if refund would exceed merchant's cumulative refund limit for a time period
 * @param refundAmount The amount of the refund
 * @param merchantId The ID of the merchant
 * @param timePeriod The time period to check (daily, weekly, monthly)
 * @param context The compliance context
 * @returns Violation details if cumulative limit is exceeded, null otherwise
 */
export async function validateCumulativeAmount(
  refundAmount: number,
  merchantId: string,
  timePeriod: string,
  context: ComplianceContext
): Promise<ComplianceViolation | null> {
  // Resolve 'maxCumulativeRefundAmount' parameter for this merchant
  const maxCumulativeRefundAmount = await parameterResolutionService.resolveParameter(
    'maxCumulativeRefundAmount',
    merchantId
  );

  // Determine time range based on timePeriod (daily, weekly, monthly)
  // Query for total refund amount already processed in the time period
  // Add current refund amount to the total
  // Compare total to maximum cumulative limit

  // If total exceeds limit, create and return violation with details
  // Otherwise return null

  return null; // Placeholder implementation
}

/**
 * Creates a standardized compliance violation for amount-related rules
 * @param rule The compliance rule that was violated
 * @param details Additional details about the violation
 * @returns Formatted compliance violation object
 */
export function createAmountViolation(
  rule: any, // Replace 'any' with the actual type of the rule object
  details: any // Replace 'any' with the actual type of the details object
): ComplianceViolation {
  // Extract violation details from rule
  const { violationCode, violationMessage, severity, remediation } = rule;

  // Create ComplianceViolation object with appropriate fields
  const violation: ComplianceViolation = {
    violationCode,
    violationMessage,
    severity,
    remediation,
    details,
  };

  // Include relevant details like refund_amount, limit_amount, currency, etc.
  // Format currency values for display

  // Return the violation object
  return violation;
}