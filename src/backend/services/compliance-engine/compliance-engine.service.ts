// compliance-engine.service.ts
import { logger } from '../../common/utils/logger'; // Import logger for logging service operations
import {
  validateTimeframeRule,
  validateAmountRule,
  validateMethodRule,
  ComplianceViolation,
  ComplianceContext,
} from './validators'; // Import validation functions and interfaces for rule evaluation
import {
  cardNetworkProvider,
  regulatoryProvider,
  merchantProvider,
  ruleProviders,
} from './rule-providers'; // Import rule providers for different compliance categories
import complianceRuleRepository from '../../database/repositories/compliance-rule.repo'; // Repository for accessing compliance rules from the database
import { BusinessError } from '../../common/errors/business-error';
import parameterResolutionService from '../parameter-resolution/parameter-resolution.service'; // Service for resolving compliance-related parameters from configuration

/**
 * Interface for compliance validation results
 */
export interface ComplianceResult {
  compliant: boolean;
  violations: ComplianceViolation[];
  blockingViolations: ComplianceViolation[];
  warningViolations: ComplianceViolation[];
}

/**
 * Service that implements the core compliance engine functionality for evaluating refund requests against various compliance rules
 */
export class ComplianceEngineService {
  private ruleProviderRegistry: Map<string, any>;
  private initialized: boolean;

  /**
   * Initializes the compliance engine service with rule providers and configuration
   */
  constructor() {
    // Initialize ruleProviderRegistry with an empty Map
    this.ruleProviderRegistry = new Map<string, any>();

    // Set initialized flag to false
    this.initialized = false;

    // Register default rule providers
    this.registerRuleProvider('CARD_NETWORK', cardNetworkProvider);
    this.registerRuleProvider('REGULATORY', regulatoryProvider);
    this.registerRuleProvider('MERCHANT', merchantProvider);

    // Set initialized flag to true
    this.initialized = true;
  }

  /**
   * Validates a refund request against applicable compliance rules
   * @param refundRequest
   * @param context
   * @returns {Promise<ComplianceResult>} Result of compliance validation with any violations
   */
  async validateCompliance(refundRequest: any, context: ComplianceContext): Promise<ComplianceResult> {
    // Log validation attempt with refund details
    logger.info(`Attempting to validate compliance for refund request: ${refundRequest.refundRequestId}`, {
      transactionId: refundRequest.transactionId,
      merchantId: context.merchantId,
    });

    // Ensure the service is initialized
    if (!this.initialized) {
      throw new Error('ComplianceEngineService is not initialized');
    }

    // Get applicable rules for the given context
    const applicableRules = await this.getApplicableRules(context);

    // Evaluate refund request against each rule category
    const cardNetworkViolations = await this.evaluateRuleSet(refundRequest, 'CARD_NETWORK', applicableRules.get('CARD_NETWORK') || [], context);
    const regulatoryViolations = await this.evaluateRuleSet(refundRequest, 'REGULATORY', applicableRules.get('REGULATORY') || [], context);
    const merchantViolations = await this.evaluateRuleSet(refundRequest, 'MERCHANT', applicableRules.get('MERCHANT') || [], context);

    // Collect all compliance violations
    const violations = [
      ...cardNetworkViolations,
      ...regulatoryViolations,
      ...merchantViolations,
    ];

    // Create ComplianceResult object with validation results
    const compliant = violations.length === 0;
    const blockingViolations = violations.filter(v => v.severity === 'ERROR');
    const warningViolations = violations.filter(v => v.severity === 'WARNING');

    const complianceResult: ComplianceResult = {
      compliant,
      violations,
      blockingViolations,
      warningViolations,
    };

    // Log validation outcome
    logger.info(`Compliance validation ${compliant ? 'passed' : 'failed'} for refund request: ${refundRequest.refundRequestId}`, {
      compliant,
      violationCount: violations.length,
      blockingViolationCount: blockingViolations.length,
      warningViolationCount: warningViolations.length,
    });

    // Return the compliance result
    return complianceResult;
  }

  /**
   * Retrieves compliance violations for a refund request without failing on violations
   * @param refundRequest
   * @param context
   * @returns {Promise<ComplianceViolation[]>} Array of compliance violations if any
   */
  async getViolations(refundRequest: any, context: ComplianceContext): Promise<ComplianceViolation[]> {
    // Log validation attempt
    logger.info(`Attempting to retrieve compliance violations for refund request: ${refundRequest.refundRequestId}`, {
      transactionId: refundRequest.transactionId,
      merchantId: context.merchantId,
    });

    // Ensure the service is initialized
    if (!this.initialized) {
      throw new Error('ComplianceEngineService is not initialized');
    }

    // Get applicable rules for the given context
    const applicableRules = await this.getApplicableRules(context);

    // Evaluate refund request against all rule categories without failing
    const cardNetworkViolations = await this.evaluateRuleSet(refundRequest, 'CARD_NETWORK', applicableRules.get('CARD_NETWORK') || [], context).catch(() => []);
    const regulatoryViolations = await this.evaluateRuleSet(refundRequest, 'REGULATORY', applicableRules.get('REGULATORY') || [], context).catch(() => []);
    const merchantViolations = await this.evaluateRuleSet(refundRequest, 'MERCHANT', applicableRules.get('MERCHANT') || [], context).catch(() => []);

    // Collect and merge all violations
    const violations = [
      ...cardNetworkViolations,
      ...regulatoryViolations,
      ...merchantViolations,
    ];

    // Log number of violations found
    logger.info(`Found ${violations.length} compliance violations for refund request: ${refundRequest.refundRequestId}`, {
      violationCount: violations.length,
    });

    // Return array of compliance violations
    return violations;
  }

  /**
   * Generates a human-readable explanation of a compliance violation
   * @param violation
   * @returns {string} Detailed explanation of the violation with remediation steps
   */
  explainViolation(violation: ComplianceViolation): string {
    // Format violation message with appropriate context
    let explanation = `Compliance Violation: ${violation.violationMessage}`;

    // Add details specific to the violation type
    if (violation.details) {
      explanation += ` Details: ${JSON.stringify(violation.details)}`;
    }

    // Append remediation steps if available
    if (violation.remediation) {
      explanation += ` Remediation: ${violation.remediation}`;
    }

    // Return formatted explanation string
    return explanation;
  }

  /**
   * Registers a rule provider with the compliance engine
   * @param providerType
   * @param provider
   */
  registerRuleProvider(providerType: string, provider: any): void {
    // Validate provider implements required methods
    if (typeof provider.getRules !== 'function' || typeof provider.getViolations !== 'function') {
      throw new Error(`Rule provider ${providerType} does not implement required methods`);
    }

    // Add provider to ruleProviderRegistry
    this.ruleProviderRegistry.set(providerType, provider);

    // Log successful registration of provider
    logger.info(`Registered rule provider: ${providerType}`);
  }

  /**
   * Retrieves all applicable compliance rules for a given context
   * @param context
   * @returns {Promise<Map<string, any[]>>} Map of rule provider types to arrays of rules
   */
  async getApplicableRules(context: ComplianceContext): Promise<Map<string, any[]>> {
    // Create results map for each provider type
    const rulesMap: Map<string, any[]> = new Map();

    // Get card network rules if context includes card network
    if (context.cardNetwork) {
      rulesMap.set('CARD_NETWORK', await cardNetworkProvider.getRules(context));
    }

    // Get merchant-specific rules if context includes merchant ID
    if (context.merchantId) {
      rulesMap.set('MERCHANT', await merchantProvider.getRules(context));
    }

    // Get regulatory rules applicable to all refunds
    rulesMap.set('REGULATORY', await regulatoryProvider.getRules(context));

    // Return map of provider types to rule arrays
    return rulesMap;
  }

  /**
   * Evaluates a refund request against a specific set of rules
   * @param refundRequest
   * @param providerType
   * @param rules
   * @param context
   * @returns {Promise<ComplianceViolation[]>} Array of compliance violations for this rule set
   */
  async evaluateRuleSet(refundRequest: any, providerType: string, rules: any[], context: ComplianceContext): Promise<ComplianceViolation[]> {
    // Get provider from ruleProviderRegistry
    const provider = this.ruleProviderRegistry.get(providerType);

    // If provider not found, log warning and return empty array
    if (!provider) {
      logger.warn(`Rule provider not found: ${providerType}`);
      return [];
    }

    // Call provider's getViolations method with refund request and rules
    const violations = await provider.getViolations(refundRequest, rules, context);

    // Return violations array from provider
    return violations;
  }

  /**
   * Initializes the compliance engine with default rule providers
   */
  initialize(): void {
    // Register card network rule provider
    this.registerRuleProvider('CARD_NETWORK', cardNetworkProvider);

    // Register regulatory rule provider
    this.registerRuleProvider('REGULATORY', regulatoryProvider);

    // Register merchant rule provider
    this.registerRuleProvider('MERCHANT', merchantProvider);

    // Set initialized flag to true
    this.initialized = true;

    // Log successful initialization
    logger.info('ComplianceEngineService initialized successfully');
  }
}

// Create a singleton instance of ComplianceEngineService
const complianceEngineService = new ComplianceEngineService();

// Export the ComplianceEngineService class for use throughout the application
export { ComplianceEngineService };

// Export a singleton instance of the ComplianceEngineService
export default complianceEngineService;

// Export the ComplianceResult interface
export { ComplianceResult };