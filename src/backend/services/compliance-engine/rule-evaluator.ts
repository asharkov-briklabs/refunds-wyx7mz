import { logger } from '../../../common/utils/logger';
import { RefundRequest } from '../../../common/interfaces/refund.interface';

/**
 * Compliance rule types
 */
enum RuleType {
  TIMEFRAME = 'timeframe',
  AMOUNT = 'amount',
  METHOD = 'method',
  DOCUMENTATION = 'documentation',
  FREQUENCY = 'frequency',
  COMPOSITE = 'composite'
}

/**
 * Compliance result containing evaluation status and any violations
 */
interface ComplianceResult {
  compliant: boolean;
  violations: ComplianceViolation[];
  blocking_violations: ComplianceViolation[];
  warning_violations: ComplianceViolation[];
}

/**
 * Represents a compliance rule
 */
interface ComplianceRule {
  rule_id: string;
  rule_name: string;
  description: string;
  evaluation: {
    type: string;
    field?: string;
    operator?: string;
    value?: any;
    allowedMethods?: string[];
    requiredTypes?: string[];
    condition?: any;
    rules?: ComplianceRule[];
    [key: string]: any;
  };
  violation_code: string;
  violation_message: string;
  severity: string;
  remediation?: string;
}

/**
 * Represents a violation of a compliance rule
 */
interface ComplianceViolation {
  violation_code: string;
  violation_message: string;
  severity: string;
  remediation?: string;
  details?: Record<string, any>;
  is_blocker?: boolean;
}

/**
 * Context for compliance evaluation
 */
interface ComplianceContext {
  merchantId: string;
  transactionDetails?: any;
  paymentMethodType?: string;
  cardNetwork?: string;
  merchantConfiguration?: Record<string, any>;
  programId?: string;
  [key: string]: any;
}

/**
 * Evaluates compliance rules against a refund request and returns any violations
 * 
 * @param refundRequest The refund request to evaluate
 * @param context Context for evaluation including transaction details, merchant configuration, etc.
 * @returns Result of compliance evaluation containing any violations
 */
export const evaluateCompliance = async (
  refundRequest: RefundRequest,
  context: ComplianceContext
): Promise<ComplianceResult> => {
  logger.info(`Evaluating compliance for refund ${refundRequest.refundRequestId}`, {
    merchantId: context.merchantId,
    refundAmount: refundRequest.amount,
    refundMethod: refundRequest.refundMethod
  });

  const violations: ComplianceViolation[] = [];

  try {
    // Get all applicable rule providers based on context
    const ruleProviders = getApplicableRuleProviders(context);

    // Evaluate rules from each provider
    for (const provider of ruleProviders) {
      try {
        // Get rules from provider
        const rules = await provider.getRules(context);
        
        // Evaluate rules
        const providerViolations = await provider.getViolations(refundRequest, rules, context);
        
        // Add any violations
        violations.push(...providerViolations);
        
        logger.debug(`Evaluated rules from provider ${provider.name}`, {
          ruleCount: rules.length,
          violationCount: providerViolations.length
        });
      } catch (error) {
        logger.error(`Error evaluating rules from provider ${provider.name}`, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Categorize violations by severity
    const blockingViolations = violations.filter(v => 
      v.severity === 'ERROR' || v.is_blocker === true
    );
    
    const warningViolations = violations.filter(v => 
      v.severity === 'WARNING' && v.is_blocker !== true
    );

    // Create compliance result
    const result: ComplianceResult = {
      compliant: blockingViolations.length === 0,
      violations,
      blocking_violations: blockingViolations,
      warning_violations: warningViolations
    };

    logger.info(`Completed compliance evaluation for refund ${refundRequest.refundRequestId}`, {
      compliant: result.compliant,
      violationCount: violations.length,
      blockingViolationCount: blockingViolations.length
    });

    return result;
  } catch (error) {
    logger.error(`Error during compliance evaluation`, {
      refundId: refundRequest.refundRequestId,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Return a non-compliant result with system error
    return {
      compliant: false,
      violations: [{
        violation_code: 'SYSTEM_ERROR',
        violation_message: 'An error occurred during compliance evaluation',
        severity: 'ERROR',
        details: {
          error: error instanceof Error ? error.message : String(error)
        },
        is_blocker: true
      }],
      blocking_violations: [{
        violation_code: 'SYSTEM_ERROR',
        violation_message: 'An error occurred during compliance evaluation',
        severity: 'ERROR',
        details: {
          error: error instanceof Error ? error.message : String(error)
        },
        is_blocker: true
      }],
      warning_violations: []
    };
  }
};

/**
 * Helper function to get applicable rule providers based on context
 */
function getApplicableRuleProviders(context: ComplianceContext): any[] {
  // In a real implementation, this would dynamically determine which providers to use
  // based on the context (e.g., card network type, merchant configuration)
  
  return [
    {
      name: 'CardNetworkRuleProvider',
      getRules: async (ctx: ComplianceContext) => {
        // In a real implementation, this would fetch card network specific rules
        // from a database or service based on the card network in the context
        return ctx.cardNetwork ? getMockCardNetworkRules(ctx.cardNetwork) : [];
      },
      getViolations: async (refundRequest: RefundRequest, rules: ComplianceRule[], context: ComplianceContext) => {
        const violations: ComplianceViolation[] = [];
        
        for (const rule of rules) {
          const violation = evaluateRule(rule, refundRequest, context);
          if (violation) {
            violations.push(violation);
          }
        }
        
        return violations;
      }
    },
    {
      name: 'RegulatoryRuleProvider',
      getRules: async (ctx: ComplianceContext) => {
        // Would fetch regulatory rules
        return getMockRegulatoryRules();
      },
      getViolations: async (refundRequest: RefundRequest, rules: ComplianceRule[], context: ComplianceContext) => {
        const violations: ComplianceViolation[] = [];
        
        for (const rule of rules) {
          const violation = evaluateRule(rule, refundRequest, context);
          if (violation) {
            violations.push(violation);
          }
        }
        
        return violations;
      }
    },
    {
      name: 'MerchantPolicyProvider',
      getRules: async (ctx: ComplianceContext) => {
        // Would fetch merchant-specific rules
        return ctx.merchantId ? getMockMerchantRules(ctx.merchantId) : [];
      },
      getViolations: async (refundRequest: RefundRequest, rules: ComplianceRule[], context: ComplianceContext) => {
        const violations: ComplianceViolation[] = [];
        
        for (const rule of rules) {
          const violation = evaluateRule(rule, refundRequest, context);
          if (violation) {
            violations.push(violation);
          }
        }
        
        return violations;
      }
    }
  ];
}

/**
 * Mock function to get card network rules for testing
 */
function getMockCardNetworkRules(cardNetwork: string): ComplianceRule[] {
  if (cardNetwork === 'VISA') {
    return [
      {
        rule_id: 'VISA_TIME_LIMIT',
        rule_name: 'Visa Refund Time Limit',
        description: 'Refunds must be processed within 180 days of the original transaction',
        evaluation: {
          type: 'timeframe',
          field: 'transactionDetails.processedAt',
          operator: 'withinDays',
          value: 180
        },
        violation_code: 'VISA_REFUND_TIME_EXCEEDED',
        violation_message: 'Visa refunds must be processed within 180 days of the original transaction',
        severity: 'ERROR',
        remediation: 'Use alternative refund method such as BALANCE or OTHER'
      },
      {
        rule_id: 'VISA_AMOUNT_LIMIT',
        rule_name: 'Visa Refund Amount Limit',
        description: 'Refund amount cannot exceed the original transaction amount',
        evaluation: {
          type: 'amount',
          operator: 'lessThanOrEqual',
          value: 'transactionDetails.amount'
        },
        violation_code: 'VISA_REFUND_AMOUNT_EXCEEDED',
        violation_message: 'Refund amount cannot exceed the original transaction amount',
        severity: 'ERROR',
        remediation: 'Adjust refund amount to be less than or equal to the original transaction amount'
      }
    ];
  } else if (cardNetwork === 'MASTERCARD') {
    return [
      {
        rule_id: 'MC_TIME_LIMIT',
        rule_name: 'Mastercard Refund Time Limit',
        description: 'Refunds must be processed within 120 days of the original transaction',
        evaluation: {
          type: 'timeframe',
          field: 'transactionDetails.processedAt',
          operator: 'withinDays',
          value: 120
        },
        violation_code: 'MC_REFUND_TIME_EXCEEDED',
        violation_message: 'Mastercard refunds must be processed within 120 days of the original transaction',
        severity: 'ERROR',
        remediation: 'Use alternative refund method such as BALANCE or OTHER'
      }
    ];
  }
  
  return [];
}

/**
 * Mock function to get regulatory rules for testing
 */
function getMockRegulatoryRules(): ComplianceRule[] {
  return [
    {
      rule_id: 'REG_DOCUMENTATION',
      rule_name: 'High Value Refund Documentation',
      description: 'Refunds over $2,500 require supporting documentation',
      evaluation: {
        type: 'documentation',
        requiredTypes: ['PROOF_OF_PURCHASE'],
        condition: {
          field: 'amount',
          operator: 'greaterThan',
          value: 2500
        }
      },
      violation_code: 'HIGH_VALUE_REFUND_DOCUMENTATION_REQUIRED',
      violation_message: 'Refunds over $2,500 require proof of purchase documentation',
      severity: 'ERROR',
      remediation: 'Upload proof of purchase documentation'
    }
  ];
}

/**
 * Mock function to get merchant-specific rules for testing
 */
function getMockMerchantRules(merchantId: string): ComplianceRule[] {
  return [
    {
      rule_id: `${merchantId}_METHOD_RESTRICTION`,
      rule_name: 'Merchant Refund Method Restriction',
      description: 'Merchant allows only certain refund methods',
      evaluation: {
        type: 'method',
        allowedMethods: ['ORIGINAL_PAYMENT', 'BALANCE']
      },
      violation_code: 'MERCHANT_REFUND_METHOD_RESTRICTED',
      violation_message: 'This merchant only allows refunds to original payment method or balance',
      severity: 'ERROR',
      remediation: 'Select an allowed refund method'
    }
  ];
}

/**
 * Evaluates a single rule against a refund request
 * 
 * @param rule The rule to evaluate
 * @param refundRequest The refund request to evaluate against
 * @param context Context for evaluation
 * @returns Violation if rule is not satisfied, null otherwise
 */
function evaluateRule(
  rule: ComplianceRule,
  refundRequest: RefundRequest,
  context: ComplianceContext
): ComplianceViolation | null {
  try {
    // Determine rule type
    const ruleType = rule.evaluation.type;
    
    // Evaluate based on rule type
    switch (ruleType) {
      case RuleType.TIMEFRAME:
        return evaluateTimeframeRule(rule, refundRequest, context);
        
      case RuleType.AMOUNT:
        return evaluateAmountRule(rule, refundRequest, context);
        
      case RuleType.METHOD:
        return evaluateMethodRule(rule, refundRequest, context);
        
      case RuleType.DOCUMENTATION:
        return evaluateDocumentationRule(rule, refundRequest, context);
        
      case RuleType.FREQUENCY:
        return evaluateFrequencyRule(rule, refundRequest, context);
        
      case RuleType.COMPOSITE:
        // For composite rules, evaluate all child rules
        const childRules = rule.evaluation.rules || [];
        const operator = rule.evaluation.operator || 'AND';
        const childViolations: ComplianceViolation[] = [];
        
        for (const childRule of childRules) {
          const violation = evaluateRule(childRule, refundRequest, context);
          if (violation) {
            childViolations.push(violation);
            if (operator === 'OR') break; // Short-circuit for OR
          } else if (operator === 'AND') {
            return null; // Short-circuit for AND
          }
        }
        
        if ((operator === 'AND' && childViolations.length > 0) || 
            (operator === 'OR' && childViolations.length === 0)) {
          return {
            violation_code: rule.violation_code,
            violation_message: rule.violation_message,
            severity: rule.severity,
            remediation: rule.remediation,
            details: { operator, childRuleCount: childRules.length }
          };
        }
        return null;
        
      default:
        logger.warning(`Unknown rule type: ${ruleType}`, { ruleId: rule.rule_id });
        return null;
    }
  } catch (error) {
    logger.error(`Error evaluating rule ${rule.rule_id}`, {
      error: error instanceof Error ? error.message : String(error),
      rule
    });
    
    // Return a generic violation for system errors
    return {
      violation_code: 'RULE_EVALUATION_ERROR',
      violation_message: `Error evaluating rule: ${rule.rule_name}`,
      severity: 'ERROR',
      details: {
        ruleId: rule.rule_id,
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

/**
 * Evaluates a timeframe-based rule against a refund request
 * 
 * @param rule The timeframe rule to evaluate
 * @param refundRequest The refund request to evaluate against
 * @param context Context for evaluation
 * @returns Violation if timeframe rule is not satisfied, null otherwise
 */
function evaluateTimeframeRule(
  rule: ComplianceRule,
  refundRequest: RefundRequest,
  context: ComplianceContext
): ComplianceViolation | null {
  // Extract field path from rule
  const fieldPath = rule.evaluation.field;
  
  // Get field value from context
  const fieldValue = getFieldValue(context, fieldPath);
  
  // If field not available, return field not available violation
  if (fieldValue === undefined) {
    return {
      violation_code: 'FIELD_NOT_AVAILABLE',
      violation_message: `Required field ${fieldPath} not available for evaluation`,
      severity: 'ERROR',
      details: {
        fieldPath,
        ruleId: rule.rule_id
      }
    };
  }
  
  // Convert to date if string
  let dateValue: Date;
  if (typeof fieldValue === 'string') {
    dateValue = new Date(fieldValue);
  } else if (fieldValue instanceof Date) {
    dateValue = fieldValue;
  } else {
    return {
      violation_code: 'INVALID_DATE_FORMAT',
      violation_message: `Field ${fieldPath} is not a valid date`,
      severity: 'ERROR',
      details: {
        fieldPath,
        fieldValue,
        ruleId: rule.rule_id
      }
    };
  }
  
  const currentTime = new Date();
  const operator = rule.evaluation.operator;
  const value = rule.evaluation.value;
  
  if (operator === 'withinDays') {
    // Calculate days difference
    const differenceMs = currentTime.getTime() - dateValue.getTime();
    const daysDifference = Math.floor(differenceMs / (1000 * 60 * 60 * 24));
    
    if (daysDifference > value) {
      return {
        violation_code: rule.violation_code,
        violation_message: rule.violation_message,
        severity: rule.severity,
        remediation: rule.remediation,
        details: {
          limit_days: value,
          actual_days: daysDifference,
          original_date: dateValue.toISOString()
        }
      };
    }
  } else if (operator === 'afterDays') {
    // Calculate days difference
    const differenceMs = currentTime.getTime() - dateValue.getTime();
    const daysDifference = Math.floor(differenceMs / (1000 * 60 * 60 * 24));
    
    if (daysDifference < value) {
      return {
        violation_code: rule.violation_code,
        violation_message: rule.violation_message,
        severity: rule.severity,
        remediation: rule.remediation,
        details: {
          minimum_days: value,
          actual_days: daysDifference,
          original_date: dateValue.toISOString()
        }
      };
    }
  } else if (operator === 'beforeDate') {
    const limitDate = new Date(value);
    
    if (dateValue > limitDate) {
      return {
        violation_code: rule.violation_code,
        violation_message: rule.violation_message,
        severity: rule.severity,
        remediation: rule.remediation,
        details: {
          limit_date: limitDate.toISOString(),
          actual_date: dateValue.toISOString()
        }
      };
    }
  } else if (operator === 'afterDate') {
    const limitDate = new Date(value);
    
    if (dateValue < limitDate) {
      return {
        violation_code: rule.violation_code,
        violation_message: rule.violation_message,
        severity: rule.severity,
        remediation: rule.remediation,
        details: {
          limit_date: limitDate.toISOString(),
          actual_date: dateValue.toISOString()
        }
      };
    }
  }
  
  // No violation
  return null;
}

/**
 * Evaluates an amount-based rule against a refund request
 * 
 * @param rule The amount rule to evaluate
 * @param refundRequest The refund request to evaluate against
 * @param context Context for evaluation
 * @returns Violation if amount rule is not satisfied, null otherwise
 */
function evaluateAmountRule(
  rule: ComplianceRule,
  refundRequest: RefundRequest,
  context: ComplianceContext
): ComplianceViolation | null {
  // Extract amount from refund request
  const refundAmount = parseFloat(refundRequest.amount.toString());
  
  // Get comparison value and operator
  let comparisonValue = rule.evaluation.value;
  const operator = rule.evaluation.operator;
  
  // If comparison value references another field, resolve it
  if (typeof comparisonValue === 'string' && comparisonValue.includes('.')) {
    const fieldValue = getFieldValue(context, comparisonValue);
    
    if (fieldValue === undefined) {
      return {
        violation_code: 'FIELD_NOT_AVAILABLE',
        violation_message: `Reference field ${comparisonValue} not available for amount comparison`,
        severity: 'ERROR',
        details: {
          fieldPath: comparisonValue,
          ruleId: rule.rule_id
        }
      };
    }
    
    comparisonValue = parseFloat(fieldValue.toString());
  }
  
  // Perform comparison based on operator
  let violation = null;
  
  switch (operator) {
    case 'lessThan':
      if (!(refundAmount < comparisonValue)) {
        violation = createAmountViolation(rule, refundAmount, comparisonValue, operator);
      }
      break;
      
    case 'lessThanOrEqual':
      if (!(refundAmount <= comparisonValue)) {
        violation = createAmountViolation(rule, refundAmount, comparisonValue, operator);
      }
      break;
      
    case 'greaterThan':
      if (!(refundAmount > comparisonValue)) {
        violation = createAmountViolation(rule, refundAmount, comparisonValue, operator);
      }
      break;
      
    case 'greaterThanOrEqual':
      if (!(refundAmount >= comparisonValue)) {
        violation = createAmountViolation(rule, refundAmount, comparisonValue, operator);
      }
      break;
      
    case 'equals':
      if (refundAmount !== comparisonValue) {
        violation = createAmountViolation(rule, refundAmount, comparisonValue, operator);
      }
      break;
      
    case 'notEquals':
      if (refundAmount === comparisonValue) {
        violation = createAmountViolation(rule, refundAmount, comparisonValue, operator);
      }
      break;
      
    default:
      logger.warning(`Unsupported amount operator: ${operator}`, { ruleId: rule.rule_id });
  }
  
  return violation;
}

/**
 * Helper function to create an amount violation
 */
function createAmountViolation(
  rule: ComplianceRule,
  refundAmount: number,
  comparisonValue: number,
  operator: string
): ComplianceViolation {
  return {
    violation_code: rule.violation_code,
    violation_message: rule.violation_message,
    severity: rule.severity,
    remediation: rule.remediation,
    details: {
      refund_amount: refundAmount,
      limit_amount: comparisonValue,
      operator
    }
  };
}

/**
 * Evaluates a method-based rule against a refund request
 * 
 * @param rule The method rule to evaluate
 * @param refundRequest The refund request to evaluate against
 * @param context Context for evaluation
 * @returns Violation if method rule is not satisfied, null otherwise
 */
function evaluateMethodRule(
  rule: ComplianceRule,
  refundRequest: RefundRequest,
  context: ComplianceContext
): ComplianceViolation | null {
  // Extract refund method from request
  const refundMethod = refundRequest.refundMethod;
  
  // Extract allowed methods from rule
  const allowedMethods = rule.evaluation.allowedMethods || [];
  
  // Check if refund method is allowed
  if (!allowedMethods.includes(refundMethod)) {
    return {
      violation_code: rule.violation_code,
      violation_message: rule.violation_message,
      severity: rule.severity,
      remediation: rule.remediation,
      details: {
        requested_method: refundMethod,
        allowed_methods: allowedMethods
      }
    };
  }
  
  // No violation
  return null;
}

/**
 * Evaluates a documentation-based rule against a refund request
 * 
 * @param rule The documentation rule to evaluate
 * @param refundRequest The refund request to evaluate against
 * @param context Context for evaluation
 * @returns Violation if documentation rule is not satisfied, null otherwise
 */
function evaluateDocumentationRule(
  rule: ComplianceRule,
  refundRequest: RefundRequest,
  context: ComplianceContext
): ComplianceViolation | null {
  // Extract supporting documents from refund request
  const supportingDocuments = refundRequest.supportingDocuments || [];
  
  // Get required document types from rule
  const requiredTypes = rule.evaluation.requiredTypes || [];
  
  // Check if document is required based on conditions
  let documentationRequired = true;
  
  if (rule.evaluation.condition) {
    // Evaluate condition (e.g., amount > 500)
    const condition = rule.evaluation.condition;
    const field = condition.field === 'amount' 
      ? parseFloat(refundRequest.amount.toString())
      : getFieldValue(refundRequest, condition.field);
    
    const compareValue = condition.value;
    
    switch (condition.operator) {
      case 'greaterThan':
        documentationRequired = field > compareValue;
        break;
      case 'lessThan':
        documentationRequired = field < compareValue;
        break;
      // Add other operators as needed
    }
  }
  
  // If documentation is required, check if all required types are present
  if (documentationRequired && requiredTypes.length > 0) {
    const documentTypes = supportingDocuments.map(doc => doc.documentType);
    
    for (const requiredType of requiredTypes) {
      if (!documentTypes.includes(requiredType)) {
        return {
          violation_code: rule.violation_code,
          violation_message: rule.violation_message,
          severity: rule.severity,
          remediation: rule.remediation,
          details: {
            missing_document_type: requiredType,
            required_types: requiredTypes,
            provided_types: documentTypes
          }
        };
      }
    }
  }
  
  // No violation
  return null;
}

/**
 * Evaluates a frequency-based rule against a refund request
 * 
 * @param rule The frequency rule to evaluate
 * @param refundRequest The refund request to evaluate against
 * @param context Context for evaluation
 * @returns Violation if frequency rule is not satisfied, null otherwise
 */
function evaluateFrequencyRule(
  rule: ComplianceRule,
  refundRequest: RefundRequest,
  context: ComplianceContext
): ComplianceViolation | null {
  // This would typically require a call to another service to get refund history
  // Mock implementation for now
  const frequencyLimit = rule.evaluation.limit || 3;
  const timePeriod = rule.evaluation.timePeriod || '30 days';
  const refundCount = context.refundCount || 0;
  
  if (refundCount >= frequencyLimit) {
    return {
      violation_code: rule.violation_code,
      violation_message: rule.violation_message,
      severity: rule.severity,
      remediation: rule.remediation,
      details: {
        refund_count: refundCount,
        frequency_limit: frequencyLimit,
        time_period: timePeriod
      }
    };
  }
  
  // No violation
  return null;
}

/**
 * Extracts a field value from an object using a path notation
 * 
 * @param obj The object to extract from
 * @param path Path to the field (e.g., "transaction.processedDate")
 * @returns Value at the specified path or undefined if not found
 */
function getFieldValue(obj: any, path: string): any {
  if (!obj || !path) {
    return undefined;
  }
  
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    
    current = current[part];
  }
  
  return current;
}

/**
 * Generates a human-readable explanation of a compliance violation
 * 
 * @param violation The violation to explain
 * @returns Detailed explanation of the violation with context-specific details
 */
export function explainViolation(violation: ComplianceViolation): string {
  if (!violation) {
    return 'No violation details provided';
  }
  
  const baseExplanation = violation.violation_message;
  let detailedExplanation = '';
  
  // Add context-specific explanation based on violation code
  if (violation.violation_code.includes('TIME') || violation.violation_code.includes('DATE')) {
    const days = violation.details?.actual_days;
    const limit = violation.details?.limit_days;
    const originalDate = violation.details?.original_date;
    
    if (days !== undefined && limit !== undefined) {
      detailedExplanation = `This transaction was processed ${days} days ago`;
      
      if (originalDate) {
        detailedExplanation += ` (${new Date(originalDate).toLocaleDateString()})`;
      }
      
      detailedExplanation += `, which exceeds the ${limit}-day limit.`;
    }
  } else if (violation.violation_code.includes('AMOUNT')) {
    const amount = violation.details?.refund_amount;
    const limit = violation.details?.limit_amount;
    
    if (amount !== undefined && limit !== undefined) {
      detailedExplanation = `The refund amount ${amount} `;
      
      const operator = violation.details?.operator;
      if (operator === 'lessThan' || operator === 'lessThanOrEqual') {
        detailedExplanation += `exceeds the maximum allowed amount of ${limit}.`;
      } else if (operator === 'greaterThan' || operator === 'greaterThanOrEqual') {
        detailedExplanation += `is below the minimum required amount of ${limit}.`;
      } else {
        detailedExplanation += `does not meet the required amount criteria (${limit}).`;
      }
    }
  } else if (violation.violation_code.includes('METHOD')) {
    const requestedMethod = violation.details?.requested_method;
    const allowedMethods = violation.details?.allowed_methods;
    
    if (requestedMethod && allowedMethods) {
      detailedExplanation = `The requested refund method "${requestedMethod}" is not allowed. `;
      
      if (Array.isArray(allowedMethods) && allowedMethods.length > 0) {
        detailedExplanation += `Allowed methods are: ${allowedMethods.join(', ')}.`;
      }
    }
  } else if (violation.violation_code.includes('DOCUMENTATION')) {
    const missingType = violation.details?.missing_document_type;
    
    if (missingType) {
      detailedExplanation = `Missing required documentation: ${missingType}.`;
    }
  } else if (violation.violation_code.includes('FREQUENCY')) {
    const count = violation.details?.refund_count;
    const limit = violation.details?.frequency_limit;
    const period = violation.details?.time_period;
    
    if (count !== undefined && limit !== undefined) {
      detailedExplanation = `This customer has already received ${count} refunds`;
      
      if (period) {
        detailedExplanation += ` in the past ${period}`;
      }
      
      detailedExplanation += `, exceeding the limit of ${limit}.`;
    }
  }
  
  // Combine explanations and add remediation if available
  let fullExplanation = baseExplanation;
  
  if (detailedExplanation) {
    fullExplanation += ` ${detailedExplanation}`;
  }
  
  if (violation.remediation) {
    fullExplanation += ` Recommendation: ${violation.remediation}`;
  }
  
  return fullExplanation;
}