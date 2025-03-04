import { logger } from '../../../common/utils/logger'; // Import logger for logging provider operations
import { RefundRequest } from '../../../common/interfaces/refund.interface'; // Import RefundRequest interface
import { validateTimeframeRule } from '../validators/timeframe.validator'; // Import validateTimeframeRule for validating timeframe rules
import { validateAmountRule } from '../validators/amount.validator'; // Import validateAmountRule for validating amount rules
import { validateMethodRule } from '../validators/method.validator'; // Import validateMethodRule for validating method rules
import { complianceRuleRepo } from '../../../database/repositories/compliance-rule.repo'; // Import complianceRuleRepo for retrieving regulatory rules
import {
  IComplianceRule,
  RuleType,
  EntityType,
  ProviderType,
} from '../../../database/models/compliance-rule.model'; // Import type definitions for compliance rules

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
 * @interface ComplianceViolation
 * @description Represents a violation of a regulatory compliance rule
 * @property {string} violationCode - Code that identifies the violation
 * @property {string} violationMessage - Message that describes the violation
 * @property {string} severity - Severity level of the violation
 * @property {string} remediation - Steps to remediate the violation
 * @property {Record<string, any>} details - Additional details about the violation
 */
interface ComplianceViolation {
  violationCode: string;
  violationMessage: string;
  severity: string;
  remediation: string;
  details: Record<string, any>;
}

/**
 * @interface ComplianceContext
 * @description Context information needed for regulatory compliance evaluation
 * @property {string} merchantId - ID of the merchant
 * @property {Record<string, any>} transactionDetails - Details of the transaction
 * @property {string} customerCountry - Country of the customer
 * @property {string} merchantCountry - Country of the merchant
 * @property {number} transactionAmount - Amount of the transaction
 * @property {string} currency - Currency of the transaction
 */
interface ComplianceContext {
  merchantId: string;
  transactionDetails: Record<string, any>;
  customerCountry: string;
  merchantCountry: string;
  transactionAmount: number;
  currency: string;
}

/**
 * Retrieves applicable regulatory compliance rules based on provided context
 * @param   {object} context - Context object
 * @returns {Promise<IComplianceRule[]>} Array of applicable regulatory rules
 */
async function getRules(context: any): Promise<IComplianceRule[]> {
  // Extract relevant context information (country, region, transaction type)
  const { merchantId } = context;

  // Log start of retrieving regulatory rules
  logger.info('Retrieving regulatory compliance rules', { merchantId });

  // Query complianceRuleRepo.findRegulatoryRules with context filters
  let rules = await complianceRuleRepo.findRegulatoryRules();

  // Filter rules by active status and current date within effective date range
  rules = rules.filter(rule => rule.active);

  // If no rules found in database, get default regulatory rules
  if (!rules || rules.length === 0) {
    logger.info('No regulatory rules found in database, using default rules');
    rules = getDefaultRegulatoryRules(context);
  }

  // Log number of rules found
  logger.info(`Found ${rules.length} regulatory compliance rules`, {
    merchantId,
    ruleCount: rules.length,
  });

  // Return the list of applicable regulatory rules
  return rules;
}

/**
 * Evaluates if a refund request meets all regulatory compliance rules
 * @param   {RefundRequest} refundRequest - refundRequest
 * @param   {IComplianceRule[]} rules - rules
 * @param   {object} context - context
 * @returns {Promise<boolean>} True if compliant with all rules, false otherwise
 */
async function evaluate(refundRequest: RefundRequest, rules: IComplianceRule[], context: any): Promise<boolean> {
  // Log evaluation start with refund request details and regulatory context
  logger.info('Evaluating regulatory compliance', {
    refundRequestId: refundRequest.refundRequestId,
    transactionId: refundRequest.transactionId,
    merchantId: context.merchantId,
  });

  // Process each rule through getViolations method
  const violations = await getViolations(refundRequest, rules, context);

  // If any violations are returned, return false (non-compliant)
  if (violations && violations.length > 0) {
    logger.warn('Regulatory compliance violations found', {
      refundRequestId: refundRequest.refundRequestId,
      violationCount: violations.length,
    });
    return false;
  }

  // If no violations are found, return true (compliant)
  logger.info('Refund request is regulatory compliant', {
    refundRequestId: refundRequest.refundRequestId,
  });
  return true;
}

/**
 * Identifies all violations of regulatory rules for a refund request
 * @param   {RefundRequest} refundRequest - refundRequest
 * @param   {IComplianceRule[]} rules - rules
 * @param   {object} context - context
 * @returns {Promise<Array<any>>} Array of compliance violations found
 */
async function getViolations(refundRequest: RefundRequest, rules: IComplianceRule[], context: any): Promise<any[]> {
  // Initialize an empty array for violations
  const violations: any[] = [];

  // For each rule, determine the rule type (TIMEFRAME, AMOUNT, METHOD, etc.)
  for (const rule of rules) {
    // Log rule being processed
    logger.debug(`Processing regulatory rule: ${rule.rule_name}`, {
      ruleId: rule.rule_id,
      ruleType: rule.rule_type,
    });

    let violation: any | null = null;

    // For TIMEFRAME rules, use validateTimeframeRule
    if (rule.rule_type === RuleType.TIMEFRAME) {
      violation = validateTimeframeRule(refundRequest, rule, context);
    }

    // For AMOUNT rules, use validateAmountRule
    else if (rule.rule_type === RuleType.AMOUNT) {
      violation = await validateAmountRule(refundRequest, rule, context);
    }

    // For METHOD rules, use validateMethodRule
    else if (rule.rule_type === RuleType.METHOD) {
      violation = await validateMethodRule(refundRequest, rule, context);
    }

    // For DOCUMENTATION rules, validate required documentation
    else if (rule.rule_type === RuleType.DOCUMENTATION) {
      violation = validateDataProtectionRule(refundRequest, rule, context);
    }

    // For DATA_PROTECTION rules, validate privacy requirements
    else if (rule.rule_type === RuleType.FREQUENCY) {
      violation = validateCrossBorderRule(refundRequest, rule, context);
    }

    // For CROSS_BORDER rules, validate international transaction rules
    else if (rule.rule_type === RuleType.FREQUENCY) {
      violation = validateCrossBorderRule(refundRequest, rule, context);
    }

    // Add violation to array if found
    if (violation) {
      violations.push(violation);
    }
  }

  // Log violations found, if any
  if (violations.length > 0) {
    logger.warn(`Found ${violations.length} regulatory compliance violations`, {
      refundRequestId: refundRequest.refundRequestId,
      violationCount: violations.length,
    });
  }

  // Return the array of violations found
  return violations;
}

/**
 * Validates if a refund request meets data protection requirements (GDPR, etc.)
 * @param   {RefundRequest} refundRequest - refundRequest
 * @param   {IComplianceRule} rule - rule
 * @param   {object} context - context
 * @returns {any | null} Violation if requirements not met, null otherwise
 */
function validateDataProtectionRule(refundRequest: RefundRequest, rule: IComplianceRule, context: any): any | null {
  // Extract data protection requirements from the rule evaluation object
  const { dataRetentionPeriod, consentRequired, region } = rule.evaluation;

  // Check if PII data handling complies with regional requirements
  if (region === 'EU') {
    // Validate consent requirements for specific regions (EU, California, etc.)
    if (consentRequired && !context.customerConsent) {
      return {
        violation_code: 'GDPR_CONSENT_MISSING',
        violation_message: 'Customer consent is required for processing refunds in the EU',
        severity: 'ERROR',
        remediation: 'Obtain customer consent before processing the refund',
      };
    }

    // Verify data minimization practices are followed
    if (refundRequest.metadata && Object.keys(refundRequest.metadata).length > 10) {
      return {
        violation_code: 'GDPR_DATA_MINIMIZATION',
        violation_message: 'Refund request contains excessive metadata, violating data minimization principles',
        severity: 'WARNING',
        remediation: 'Remove unnecessary metadata from the refund request',
      };
    }
  }

  // If requirements not met, create and return a ComplianceViolation
  // Otherwise return null (rule passed)
  return null;
}

/**
 * Validates cross-border transaction requirements for international refunds
 * @param   {RefundRequest} refundRequest - refundRequest
 * @param   {IComplianceRule} rule - rule
 * @param   {object} context - context
 * @returns {any | null} Violation if requirements not met, null otherwise
 */
function validateCrossBorderRule(refundRequest: RefundRequest, rule: IComplianceRule, context: any): any | null {
  // Extract cross-border requirements from the rule evaluation object
  const { sourceCountry, destinationCountry, currencyExchangeRequired } = rule.evaluation;

  // Determine source and destination countries/regions for the transaction
  if (context.merchantCountry !== sourceCountry || context.customerCountry !== destinationCountry) {
    return {
      violation_code: 'CROSS_BORDER_MISMATCH',
      violation_message: 'Transaction does not meet cross-border requirements',
      severity: 'ERROR',
      remediation: 'Ensure transaction meets cross-border requirements',
    };
  }

  // Check for country-specific restrictions or reporting requirements
  if (sourceCountry === 'SanctionedCountry') {
    return {
      violation_code: 'SANCTIONED_COUNTRY',
      violation_message: 'Transaction involves a sanctioned country',
      severity: 'ERROR',
      remediation: 'Sanctioned countries are restricted',
    };
  }

  // Validate currency exchange documentation if applicable
  if (currencyExchangeRequired && !refundRequest.metadata?.currencyExchangeDocument) {
    return {
      violation_code: 'CURRENCY_EXCHANGE_MISSING',
      violation_message: 'Currency exchange documentation is required for this transaction',
      severity: 'WARNING',
      remediation: 'Provide currency exchange documentation',
    };
  }

  // Verify sanctions compliance for restricted countries
  // If requirements not met, create and return a ComplianceViolation
  // Otherwise return null (rule passed)
  return null;
}

/**
 * Provides hard-coded fallback regulatory rules when database rules are unavailable
 * @param   {object} context - context
 * @returns {IComplianceRule[]} Array of default regulatory rules
 */
function getDefaultRegulatoryRules(context: any): IComplianceRule[] {
  // Define default regulatory rules based on common standards
  const defaultRules: IComplianceRule[] = [
    {
      rule_id: 'DEFAULT_AML_REPORTING',
      rule_type: RuleType.AMOUNT,
      rule_name: 'AML Reporting Threshold',
      description: 'Report refunds exceeding AML threshold to regulatory authorities',
      provider_type: ProviderType.REGULATORY,
      entity_type: EntityType.REGULATORY,
      entity_id: 'GLOBAL',
      evaluation: {
        operator: 'greaterThanOrEqual',
        value: 10000,
      },
      violation_code: 'AML_REPORTING_REQUIRED',
      violation_message: 'Refund exceeds AML reporting threshold',
      severity: 'WARNING',
      remediation: 'File AML report with regulatory authorities',
      effective_date: new Date(),
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
      version: 1,
    },
  ];

  // Include EU-specific rules (GDPR, PSD2) if context indicates EU region
  if (context.customerCountry === 'EU') {
    defaultRules.push({
      rule_id: 'DEFAULT_GDPR_CONSENT',
      rule_type: RuleType.DOCUMENTATION,
      rule_name: 'GDPR Consent Requirement',
      description: 'Obtain customer consent for processing refunds in the EU',
      provider_type: ProviderType.REGULATORY,
      entity_type: EntityType.REGULATORY,
      entity_id: 'EU',
      evaluation: {
        consentRequired: true,
      },
      violation_code: 'GDPR_CONSENT_MISSING',
      violation_message: 'Customer consent is required for processing refunds in the EU',
      severity: 'ERROR',
      remediation: 'Obtain customer consent before processing the refund',
      effective_date: new Date(),
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
      version: 1,
    });
  }

  // Include US-specific rules (state-level requirements) if context indicates US region
  if (context.customerCountry === 'US') {
    defaultRules.push({
      rule_id: 'DEFAULT_US_STATE_LAW',
      rule_type: RuleType.AMOUNT,
      rule_name: 'US State Law Limit',
      description: 'Comply with state-specific refund limits',
      provider_type: ProviderType.REGULATORY,
      entity_type: EntityType.REGULATORY,
      entity_id: 'US',
      evaluation: {
        operator: 'lessThanOrEqual',
        value: 5000,
      },
      violation_code: 'US_STATE_LAW_VIOLATION',
      violation_message: 'Refund exceeds US state law limit',
      severity: 'WARNING',
      remediation: 'Ensure refund complies with state-specific regulations',
      effective_date: new Date(),
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
      version: 1,
    });
  }

  // Include global AML (Anti-Money Laundering) rules
  defaultRules.push({
    rule_id: 'DEFAULT_GLOBAL_AML',
    rule_type: RuleType.AMOUNT,
    rule_name: 'Global AML Threshold',
    description: 'Comply with global anti-money laundering regulations',
    provider_type: ProviderType.REGULATORY,
    entity_type: EntityType.REGULATORY,
    entity_id: 'GLOBAL',
    evaluation: {
      operator: 'lessThanOrEqual',
      value: 20000,
    },
    violation_code: 'GLOBAL_AML_VIOLATION',
    violation_message: 'Refund exceeds global AML threshold',
    severity: 'ERROR',
    remediation: 'Ensure refund complies with global AML regulations',
    effective_date: new Date(),
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
    version: 1,
  });

  // Include standard reporting requirement rules for high-value transactions
  defaultRules.push({
    rule_id: 'DEFAULT_REPORTING_REQUIREMENT',
    rule_type: RuleType.AMOUNT,
    rule_name: 'Reporting Requirement',
    description: 'Report high-value transactions to regulatory authorities',
    provider_type: ProviderType.REGULATORY,
    entity_type: EntityType.REGULATORY,
    entity_id: 'GLOBAL',
    evaluation: {
      operator: 'greaterThanOrEqual',
      value: 15000,
    },
    violation_code: 'REPORTING_REQUIRED',
    violation_message: 'Refund requires reporting to regulatory authorities',
    severity: 'INFO',
    remediation: 'Report transaction to regulatory authorities',
    effective_date: new Date(),
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
    version: 1,
  });

  // Return appropriate rules based on the context
  return defaultRules;
}

// Export the regulatory rule provider implementation
export default {
  getRules,
  evaluate,
  getViolations,
};