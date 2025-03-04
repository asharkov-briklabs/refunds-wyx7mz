import { logger } from '../../../common/utils/logger'; // Import logger for logging validator operations
import { RefundRequest } from '../../../common/interfaces/refund.interface'; // Import RefundRequest interface
import { RefundMethod } from '../../../common/enums/refund-method.enum'; // Import RefundMethod enum
import { parameterResolutionService } from '../../parameter-resolution/parameter-resolution.service'; // Import parameterResolutionService

/**
 * Interface providing context for compliance evaluations
 */
export interface ComplianceContext {
  merchantId: string;
  transactionDetails: any;
  paymentMethodType: string;
  cardNetwork: string;
  merchantConfiguration: any;
}

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
 * Validates if a refund request's method complies with the specified rule
 * @param refundRequest Refund request object
 * @param rule Rule object containing evaluation details
 * @param context Compliance context object
 * @returns Violation details if rule is violated, null otherwise
 */
export const validateMethodRule = async (
  refundRequest: RefundRequest,
  rule: any,
  context: ComplianceContext
): Promise<ComplianceViolation | null> => {
  // Extract rule evaluation details including operator and allowed methods
  const { operator } = rule.evaluation;

  // Log beginning of method rule validation
  logger.debug(`Validating method rule with operator: ${operator}`);

  // Get refund method from request using getMethodFromRequest()
  const refundMethod = getMethodFromRequest(refundRequest);

  // If operator is 'inAllowedMethods', validate method is in allowed methods list
  if (operator === 'inAllowedMethods') {
    // Extract allowed methods from rule
    const allowedMethods = rule.evaluation.allowedMethods as RefundMethod[];

    // Validate method is in allowed methods
    if (!validateAgainstAllowedMethods(refundMethod, allowedMethods)) {
      // If method is not permitted, create and return a ComplianceViolation with details
      return createMethodViolation(rule, {
        used_method: refundMethod,
        allowed_methods: allowedMethods,
      });
    }
  }

  // If operator is 'isOriginalPayment', validate method is ORIGINAL_PAYMENT
  if (operator === 'isOriginalPayment') {
    if (refundMethod !== RefundMethod.ORIGINAL_PAYMENT) {
      // If method is not permitted, create and return a ComplianceViolation with details
      return createMethodViolation(rule, {
        used_method: refundMethod,
        allowed_method: RefundMethod.ORIGINAL_PAYMENT,
      });
    }
  }

  // If operator is 'merchantAllowedMethods', check against merchant configuration
  if (operator === 'merchantAllowedMethods') {
    // Retrieve merchant-specific allowed refund methods from configuration
    const merchantAllowedMethods = await getMerchantAllowedMethods(context.merchantId, context);

    // Validate method is in allowed methods
    if (!validateAgainstAllowedMethods(refundMethod, merchantAllowedMethods)) {
      // If method is not permitted, create and return a ComplianceViolation with details
      return createMethodViolation(rule, {
        used_method: refundMethod,
        allowed_methods: merchantAllowedMethods,
      });
    }
  }

  // If operator is 'cardNetworkAllowedMethods', check against card network rules
  if (operator === 'cardNetworkAllowedMethods') {
    // Retrieve card network-specific allowed refund methods
    const cardNetworkAllowedMethods = await getCardNetworkAllowedMethods(context.cardNetwork, context);

    // Validate method is in allowed methods
    if (!validateAgainstAllowedMethods(refundMethod, cardNetworkAllowedMethods)) {
      // If method is not permitted, create and return a ComplianceViolation with details
      return createMethodViolation(rule, {
        used_method: refundMethod,
        allowed_methods: cardNetworkAllowedMethods,
      });
    }
  }

  // If method is permitted, return null (no violation)
  return null;
};

/**
 * Extracts the refund method from a refund request
 * @param refundRequest Refund request object
 * @returns The refund method specified in the request
 */
export const getMethodFromRequest = (refundRequest: RefundRequest): RefundMethod => {
  // Extract the refundMethod property from refund request
  const { refundMethod } = refundRequest;

  // Return the refund method as a RefundMethod enum value
  return refundMethod as RefundMethod;
};

/**
 * Validates if the refund method is in the list of allowed methods
 * @param refundMethod Refund method to validate
 * @param allowedMethods Array of allowed refund methods
 * @returns True if method is allowed, false otherwise
 */
const validateAgainstAllowedMethods = (refundMethod: RefundMethod, allowedMethods: RefundMethod[]): boolean => {
  // Check if the refundMethod is included in the allowedMethods array
  return allowedMethods.includes(refundMethod);
};

/**
 * Retrieves merchant-specific allowed refund methods from configuration
 * @param merchantId Merchant ID to retrieve configuration for
 * @param context Compliance context object
 * @returns Array of refund methods allowed for the merchant
 */
const getMerchantAllowedMethods = async (merchantId: string, context: ComplianceContext): Promise<RefundMethod[]> => {
  // Resolve 'allowedRefundMethods' parameter for this merchant using parameterResolutionService
  const allowedRefundMethods = await parameterResolutionService.resolveParameter(
    'allowedRefundMethods',
    merchantId
  );

  // If no configuration found, return all methods as default
  if (!allowedRefundMethods) {
    return [RefundMethod.ORIGINAL_PAYMENT, RefundMethod.BALANCE, RefundMethod.OTHER];
  }

  // Parse and return the configured allowed methods
  return allowedRefundMethods as RefundMethod[];
};

/**
 * Retrieves card network-specific allowed refund methods
 * @param cardNetwork Card network to retrieve methods for
 * @param context Compliance context object
 * @returns Array of refund methods allowed for the card network
 */
const getCardNetworkAllowedMethods = async (cardNetwork: string, context: ComplianceContext): Promise<RefundMethod[]> => {
  // Extract card network from context
  const { transactionDetails } = context;
  const paymentMethod = transactionDetails.paymentMethod;

  // Based on card network, determine allowed refund methods
  if (cardNetwork === 'Visa' || cardNetwork === 'Mastercard') {
    // For some card networks (e.g., Visa, Mastercard), only ORIGINAL_PAYMENT may be allowed
    return [RefundMethod.ORIGINAL_PAYMENT];
  }

  // Return array of allowed methods for the specified card network
  return [RefundMethod.ORIGINAL_PAYMENT, RefundMethod.BALANCE, RefundMethod.OTHER];
};

/**
 * Creates a standardized compliance violation for method-related rules
 * @param rule Rule object that was violated
 * @param details Additional details about the violation
 * @returns Formatted compliance violation object
 */
const createMethodViolation = (rule: any, details: any): ComplianceViolation => {
  // Extract violation details from rule
  const { violationCode, violationMessage, severity, remediation } = rule;

  // Create ComplianceViolation object with appropriate fields
  const violation: ComplianceViolation = {
    violationCode,
    violationMessage,
    severity,
    remediation,
    details: {
      ...details,
    },
  };

  // Include relevant details like used_method, allowed_methods
  logger.debug(`Creating method violation: ${violationCode}`, violation);

  // Return the violation object
  return violation;
};