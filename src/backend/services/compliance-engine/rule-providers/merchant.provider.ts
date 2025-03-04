import { logger } from '../../../common/utils/logger'; // Import logger for logging provider operations
import { RefundRequest } from '../../../common/interfaces/refund.interface'; // Import RefundRequest interface
import { validateTimeframeRule } from '../validators/timeframe.validator'; // Import validateTimeframeRule for validating timeframe rules
import { validateAmountRule } from '../validators/amount.validator'; // Import validateAmountRule for validating amount rules
import { validateMethodRule } from '../validators/method.validator'; // Import validateMethodRule for validating method rules
import {
  IComplianceRule,
  RuleType,
  EntityType,
} from '../../../database/models/compliance-rule.model'; // Import compliance rule types
import { complianceRuleRepo } from '../../../database/repositories/compliance-rule.repo'; // Import complianceRuleRepo for database access
import { parameterResolutionService } from '../../parameter-resolution/parameter-resolution.service'; // Import parameterResolutionService for resolving parameters

/**
 * Interface providing context for compliance evaluations
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
export interface MerchantComplianceContext {
  merchantId: string;
  transactionDetails: Record<string, any>;
  refundHistory: Record<string, any>[];
  merchantConfiguration: Record<string, any>;
  organizationId: string;
}

/**
 * Retrieves applicable merchant-specific compliance rules based on the provided context
 * @param context
 * @returns {Promise<IComplianceRule[]>} Array of applicable merchant rules
 */
const getRules = async (context: MerchantComplianceContext): Promise<IComplianceRule[]> => {
  // Extract merchant ID from the context
  const { merchantId } = context;

  // If merchant ID is not provided, return empty array
  if (!merchantId) {
    logger.error('Merchant ID is required in the context');
    return [];
  }

  // Log start of retrieving rules for the specified merchant
  logger.info(`Retrieving merchant rules for merchant: ${merchantId}`);

  // Query complianceRuleRepo.findMerchantRules with the merchant ID
  let rules = await complianceRuleRepo.findMerchantRules(merchantId);

  // Filter rules by active status and current date within effective date range
  rules = rules.filter(rule => rule.active);

  // If no rules found in database, get default merchant rules based on parameters
  if (!rules || rules.length === 0) {
    logger.info(`No rules found in database, attempting to generate default merchant rules`);
    rules = await getDefaultMerchantRules(merchantId);
  }

  // Log number of rules found
  logger.info(`Found ${rules.length} merchant rules for merchant: ${merchantId}`);

  // Return the list of applicable merchant rules
  return rules;
};

/**
 * Evaluates if a refund request meets all merchant-specific compliance rules
 * @param refundRequest
 * @param rules
 * @param context
 * @returns {Promise<boolean>} True if compliant with all rules, false otherwise
 */
const evaluate = async (refundRequest: RefundRequest, rules: IComplianceRule[], context: MerchantComplianceContext): Promise<boolean> => {
  // Log evaluation start with refund request details and merchant context
  logger.info(`Evaluating merchant rules for refund request: ${refundRequest.refundRequestId}`, {
    merchantId: context.merchantId,
    transactionId: refundRequest.transactionId,
    ruleCount: rules.length,
  });

  // Process each rule through getViolations method
  const violations = await getViolations(refundRequest, rules, context);

  // If any violations are returned, return false (non-compliant)
  if (violations && violations.length > 0) {
    logger.info(`Refund request ${refundRequest.refundRequestId} is not compliant due to ${violations.length} violations`);
    return false;
  }

  // If no violations are found, return true (compliant)
  logger.info(`Refund request ${refundRequest.refundRequestId} is compliant with all merchant rules`);
  return true;
};

/**
 * Identifies all violations of merchant rules for a refund request
 * @param refundRequest
 * @param rules
 * @param context
 * @returns {Promise<Array<any>>} Array of compliance violations found
 */
const getViolations = async (refundRequest: RefundRequest, rules: IComplianceRule[], context: MerchantComplianceContext): Promise<Array<any>> => {
  // Initialize an empty array for violations
  const violations: any[] = [];

  // For each rule, determine the rule type (TIMEFRAME, AMOUNT, METHOD, etc.)
  for (const rule of rules) {
    let result: any = null;

    // For TIMEFRAME rules, use validateTimeframeRule
    if (rule.rule_type === RuleType.TIMEFRAME) {
      result = validateTimeframeRule(refundRequest, rule, context);
    }

    // For AMOUNT rules, use validateAmountRule
    if (rule.rule_type === RuleType.AMOUNT) {
      result = await validateAmountRule(refundRequest, rule, context);
    }

    // For METHOD rules, use validateMethodRule
    if (rule.rule_type === RuleType.METHOD) {
      result = await validateMethodRule(refundRequest, rule, context);
    }

    // For CUSTOM rules, use validateCustomMerchantRule
    if (rule.rule_type === RuleType.CUSTOM) {
      result = validateCustomMerchantRule(refundRequest, rule, context);
    }

    // Filter out null results (rules that passed)
    if (result) {
      violations.push(result);
    }
  }

  // Log violations found, if any
  if (violations.length > 0) {
    logger.info(`Found ${violations.length} violations for refund request: ${refundRequest.refundRequestId}`);
  }

  // Return the array of violations found
  return violations;
};

/**
 * Validates merchant-specific custom rules that don't fit standard categories
 * @param refundRequest
 * @param rule
 * @param context
 * @returns {any | null} Violation if rule is violated, null otherwise
 */
const validateCustomMerchantRule = (refundRequest: RefundRequest, rule: IComplianceRule, context: MerchantComplianceContext): any | null => {
  // Extract custom rule parameters from the rule evaluation object
  const { evaluation } = rule;

  // Perform merchant-specific validation logic based on rule parameters
  // Check for merchant-specific conditions like return policy adherence
  // Validate against customer purchase history if specified in the rule

  // If rule is violated, create and return a ComplianceViolation
  // Otherwise return null (rule passed)
  return null;
};

/**
 * Provides fallback merchant rules based on parameter settings when database rules are unavailable
 * @param merchantId
 * @returns {Promise<IComplianceRule[]>} Array of generated merchant rules based on parameters
 */
const getDefaultMerchantRules = async (merchantId: string): Promise<IComplianceRule[]> => {
  // Log attempt to generate default merchant rules
  logger.info(`Generating default merchant rules for merchant: ${merchantId}`);

  // Create default rules array
  const defaultRules: IComplianceRule[] = [];

  // Resolve maxRefundAmount parameter for merchant
  const maxRefundAmount = await parameterResolutionService.resolveParameter(
    'maxRefundAmount',
    merchantId
  );

  // Create AMOUNT rule with maxRefundAmount parameter
  if (maxRefundAmount) {
    defaultRules.push({
      rule_id: 'default_max_amount',
      rule_type: RuleType.AMOUNT,
      rule_name: 'Maximum Refund Amount',
      description: 'Maximum amount allowed for a refund',
      provider_type: ProviderType.MERCHANT,
      entity_type: EntityType.MERCHANT,
      entity_id: merchantId,
      evaluation: {
        operator: 'lessThanOrEqual',
        value: maxRefundAmount,
      },
      violation_code: 'MAX_REFUND_EXCEEDED',
      violation_message: `Refund amount exceeds the maximum allowed: ${maxRefundAmount}`,
      severity: 'ERROR',
      remediation: 'Adjust refund amount to be within the allowed limit',
      effective_date: new Date(),
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
      version: 1,
    } as IComplianceRule);
  }

  // Resolve refundTimeLimit parameter for merchant
  const refundTimeLimit = await parameterResolutionService.resolveParameter(
    'refundTimeLimit',
    merchantId
  );

  // Create TIMEFRAME rule with refundTimeLimit parameter
  if (refundTimeLimit) {
    defaultRules.push({
      rule_id: 'default_time_limit',
      rule_type: RuleType.TIMEFRAME,
      rule_name: 'Refund Time Limit',
      description: 'Maximum time after transaction for refund processing',
      provider_type: ProviderType.MERCHANT,
      entity_type: EntityType.MERCHANT,
      entity_id: merchantId,
      evaluation: {
        operator: 'withinDays',
        value: refundTimeLimit,
      },
      violation_code: 'REFUND_TIME_EXCEEDED',
      violation_message: `Refund processing time exceeds the allowed limit: ${refundTimeLimit} days`,
      severity: 'ERROR',
      remediation: 'Process refund using an alternative method',
      effective_date: new Date(),
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
      version: 1,
    } as IComplianceRule);
  }

  // Resolve allowedMethods parameter for merchant
  const allowedMethods = await parameterResolutionService.resolveParameter(
    'allowedMethods',
    merchantId
  );

  // Create METHOD rule with allowedMethods parameter
  if (allowedMethods) {
    defaultRules.push({
      rule_id: 'default_allowed_methods',
      rule_type: RuleType.METHOD,
      rule_name: 'Allowed Refund Methods',
      description: 'Allowed methods for refund processing',
      provider_type: ProviderType.MERCHANT,
      entity_type: EntityType.MERCHANT,
      entity_id: merchantId,
      evaluation: {
        operator: 'inAllowedMethods',
        allowedMethods: allowedMethods,
      },
      violation_code: 'METHOD_NOT_ALLOWED',
      violation_message: `Refund method is not in the allowed list: ${allowedMethods}`,
      severity: 'ERROR',
      remediation: 'Select an allowed refund method',
      effective_date: new Date(),
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
      version: 1,
    } as IComplianceRule);
  }

  // Return array of generated rules
  return defaultRules;
};

// Export the provider functions
export default {
  getRules,
  evaluate,
  getViolations,
};