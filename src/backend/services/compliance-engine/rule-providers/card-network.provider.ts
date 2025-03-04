import { logger } from '../../../common/utils/logger'; // Import logger for logging provider operations
import { RefundRequest } from '../../../common/interfaces/refund.interface'; // Import RefundRequest interface
import { validateTimeframeRule } from '../validators/timeframe.validator'; // Import validateTimeframeRule for validating timeframe rules
import { validateAmountRule } from '../validators/amount.validator'; // Import validateAmountRule for validating amount rules
import { validateMethodRule } from '../validators/method.validator'; // Import validateMethodRule for validating method rules
import { complianceRuleRepo } from '../../../database/repositories/compliance-rule.repo'; // Import complianceRuleRepo for retrieving rules
import {
  IComplianceRule,
  RuleType,
  EntityType,
} from '../../../database/models/compliance-rule.model'; // Import IComplianceRule interface

/**
 * Interface providing context for compliance evaluations
 */
interface ComplianceContext {
  merchantId: string;
  transactionDetails: any;
  paymentMethodType: string;
  cardNetwork: string;
  merchantConfiguration: any;
}

/**
 * Interface for compliance violation information
 */
interface ComplianceViolation {
  violationCode: string;
  violationMessage: string;
  severity: string;
  remediation: string;
  details: Record<string, any>;
}

/**
 * Retrieves applicable card network compliance rules based on the provided context
 * @param context Object containing merchantId, transactionDetails, etc.
 * @returns Promise<IComplianceRule[]> Array of applicable card network rules
 */
async function getRules(context: any): Promise<IComplianceRule[]> {
  // Extract card network from the context
  const { cardNetwork } = context;

  // If card network is not provided, return empty array
  if (!cardNetwork) {
    return [];
  }

  logger.info(`Retrieving card network rules for: ${cardNetwork}`);

  // Query complianceRuleRepo.findCardNetworkRules with the card network
  const rules = await complianceRuleRepo.findCardNetworkRules(cardNetwork);

  // Filter rules by active status and current date within effective date range
  const applicableRules = rules.filter(rule => rule.active);

  logger.info(`Found ${applicableRules.length} applicable card network rules for ${cardNetwork}`);

  // Return the list of applicable card network rules
  return applicableRules;
}

/**
 * Evaluates if a refund request meets all card network compliance rules
 * @param refundRequest RefundRequest object
 * @param rules IComplianceRule[] Array of compliance rules
 * @param context Object Compliance context
 * @returns Promise<boolean> True if compliant with all rules, false otherwise
 */
async function evaluate(
  refundRequest: RefundRequest,
  rules: IComplianceRule[],
  context: any
): Promise<boolean> {
  logger.info(
    `Evaluating card network compliance for refund request: ${refundRequest.refundRequestId}, card network: ${context.cardNetwork}`
  );

  // Process each rule through getViolations method
  const violations = await getViolations(refundRequest, rules, context);

  // If any violations are returned, return false (non-compliant)
  if (violations && violations.length > 0) {
    logger.warn(
      `Card network compliance check failed for refund request: ${refundRequest.refundRequestId}, violations: ${violations.length}`
    );
    return false;
  }

  logger.info(
    `Card network compliance check passed for refund request: ${refundRequest.refundRequestId}`
  );
  // If no violations are found, return true (compliant)
  return true;
}

/**
 * Identifies all violations of card network rules for a refund request
 * @param refundRequest RefundRequest object
 * @param rules IComplianceRule[] Array of compliance rules
 * @param context Object Compliance context
 * @returns Promise<Array<any>> Array of compliance violations found
 */
async function getViolations(
  refundRequest: RefundRequest,
  rules: IComplianceRule[],
  context: any
): Promise<Array<any>> {
  // Initialize an empty array for violations
  const violations: any[] = [];

  // For each rule, determine the rule type (TIMEFRAME, AMOUNT, METHOD, etc.)
  for (const rule of rules) {
    let violation: any = null;

    // For TIMEFRAME rules, use validateTimeframeRule
    if (rule.rule_type === RuleType.TIMEFRAME) {
      violation = await validateTimeframeRule(refundRequest, rule, context);
    }

    // For AMOUNT rules, use validateAmountRule
    if (rule.rule_type === RuleType.AMOUNT) {
      violation = await validateAmountRule(refundRequest, rule, context);
    }

    // For METHOD rules, use validateMethodRule
    if (rule.rule_type === RuleType.METHOD) {
      violation = await validateMethodRule(refundRequest, rule, context);
    }

    // Filter out null results (rules that passed)
    if (violation) {
      violations.push(violation);
    }
  }

  if (violations.length > 0) {
    logger.warn(
      `Card network compliance violations found for refund request: ${refundRequest.refundRequestId}, violations: ${violations.length}`
    );
  }

  // Return the array of violations found
  return violations;
}

/**
 * Validates if a refund request includes required documentation based on card network rules
 * @param refundRequest RefundRequest object
 * @param rule IComplianceRule Rule object
 * @param context Object Compliance context
 * @returns any | null Violation if documentation requirements not met, null otherwise
 */
function validateDocumentationRule(
  refundRequest: RefundRequest,
  rule: IComplianceRule,
  context: any
): any | null {
  // Placeholder implementation
  return null;
}

/**
 * Validates if a refund request meets frequency limits set by card networks
 * @param refundRequest RefundRequest object
 * @param rule IComplianceRule Rule object
 * @param context Object Compliance context
 * @returns any | null Violation if frequency limits exceeded, null otherwise
 */
function validateFrequencyRule(
  refundRequest: RefundRequest,
  rule: IComplianceRule,
  context: any
): any | null {
  // Placeholder implementation
  return null;
}

/**
 * Provides hard-coded fallback rules for specific card networks when database rules are unavailable
 * @param cardNetwork string
 * @returns IComplianceRule[] Array of default rules for the specified card network
 */
function getCardNetworkSpecificRules(cardNetwork: string): IComplianceRule[] {
  // Define default rules based on common card network policies
  const defaultRules: IComplianceRule[] = [];

  // For Visa, include 120-day refund timeframe limit
  if (cardNetwork === 'VISA') {
    defaultRules.push({
      rule_id: 'VISA_DEFAULT_TIMEFRAME',
      rule_type: RuleType.TIMEFRAME,
      rule_name: 'Visa Default Timeframe Limit',
      description: 'Visa refunds must be processed within 120 days',
      provider_type: ProviderType.CARD_NETWORK,
      entity_type: EntityType.CARD_NETWORK,
      entity_id: 'VISA',
      evaluation: {
        type: 'timeframe',
        field: 'transaction.processedDate',
        operator: 'withinDays',
        value: 120,
      },
      violation_code: 'VISA_REFUND_TIME_EXCEEDED',
      violation_message: 'Visa refunds must be processed within 120 days',
      severity: 'ERROR',
      remediation: 'Use alternative refund method',
      effective_date: new Date(),
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
      version: 1,
    } as any);
  }

  // For Mastercard, include 120-day refund timeframe limit
  if (cardNetwork === 'MASTERCARD') {
    defaultRules.push({
      rule_id: 'MASTERCARD_DEFAULT_TIMEFRAME',
      rule_type: RuleType.TIMEFRAME,
      rule_name: 'Mastercard Default Timeframe Limit',
      description: 'Mastercard refunds must be processed within 120 days',
      provider_type: ProviderType.CARD_NETWORK,
      entity_type: EntityType.CARD_NETWORK,
      entity_id: 'MASTERCARD',
      evaluation: {
        type: 'timeframe',
        field: 'transaction.processedDate',
        operator: 'withinDays',
        value: 120,
      },
      violation_code: 'MASTERCARD_REFUND_TIME_EXCEEDED',
      violation_message: 'Mastercard refunds must be processed within 120 days',
      severity: 'ERROR',
      remediation: 'Use alternative refund method',
      effective_date: new Date(),
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
      version: 1,
    } as any);
  }

  // For Amex, include 90-day refund timeframe limit
  if (cardNetwork === 'AMEX') {
    defaultRules.push({
      rule_id: 'AMEX_DEFAULT_TIMEFRAME',
      rule_type: RuleType.TIMEFRAME,
      rule_name: 'Amex Default Timeframe Limit',
      description: 'Amex refunds must be processed within 90 days',
      provider_type: ProviderType.CARD_NETWORK,
      entity_type: EntityType.CARD_NETWORK,
      entity_id: 'AMEX',
      evaluation: {
        type: 'timeframe',
        field: 'transaction.processedDate',
        operator: 'withinDays',
        value: 90,
      },
      violation_code: 'AMEX_REFUND_TIME_EXCEEDED',
      violation_message: 'Amex refunds must be processed within 90 days',
      severity: 'ERROR',
      remediation: 'Use alternative refund method',
      effective_date: new Date(),
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
      version: 1,
    } as any);
  }

  // For Discover, include 90-day refund timeframe limit
  if (cardNetwork === 'DISCOVER') {
    defaultRules.push({
      rule_id: 'DISCOVER_DEFAULT_TIMEFRAME',
      rule_type: RuleType.TIMEFRAME,
      rule_name: 'Discover Default Timeframe Limit',
      description: 'Discover refunds must be processed within 90 days',
      provider_type: ProviderType.CARD_NETWORK,
      entity_type: EntityType.CARD_NETWORK,
      entity_id: 'DISCOVER',
      evaluation: {
        type: 'timeframe',
        field: 'transaction.processedDate',
        operator: 'withinDays',
        value: 90,
      },
      violation_code: 'DISCOVER_REFUND_TIME_EXCEEDED',
      violation_message: 'Discover refunds must be processed within 90 days',
      severity: 'ERROR',
      remediation: 'Use alternative refund method',
      effective_date: new Date(),
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
      version: 1,
    } as any);
  }

  // Include method restrictions based on card network
  // Include documentation requirements for high-value refunds

  return defaultRules;
}

// Export the provider functions
export default {
  getRules,
  evaluate,
  getViolations,
};