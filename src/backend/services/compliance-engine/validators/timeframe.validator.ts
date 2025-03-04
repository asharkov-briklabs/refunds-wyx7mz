import { isWithinTimeLimit, calculateDateDifference } from '../../../common/utils/date-utils';
import { logger } from '../../../common/utils/logger';
import { RefundRequest } from '../../../database/models/refund-request.model';

/**
 * Validates if a refund request meets timeframe-related compliance rules
 * 
 * @param refundRequest - The refund request being validated
 * @param rule - The compliance rule to evaluate
 * @param context - Additional context data for validation (transaction details, etc.)
 * @returns Compliance violation if rule is violated, null otherwise
 */
export function validateTimeframeRule(refundRequest: RefundRequest, rule: any, context: object): any | null {
  try {
    // Extract the required field paths from the rule evaluation object
    const evaluation = rule.evaluation || {};
    const fieldPath = evaluation.field;
    const operator = evaluation.operator;
    const value = evaluation.value;

    logger.debug('Validating timeframe rule', {
      ruleId: rule.rule_id,
      ruleName: rule.rule_name,
      fieldPath,
      operator,
      value
    });

    // Check if the required field exists in the context
    const fieldValue = getFieldValue(context, fieldPath);
    if (!fieldValue) {
      logger.debug('Required field not available for timeframe validation', { fieldPath });
      return {
        violation_code: 'FIELD_NOT_AVAILABLE',
        violation_message: `Required field ${fieldPath} not available for evaluation`,
        severity: 'ERROR',
        remediation: 'Ensure all required transaction data is available'
      };
    }

    // Convert string dates to Date objects if needed
    const referenceDate = fieldValue instanceof Date ? fieldValue : new Date(fieldValue);
    const currentDate = new Date();

    // Validate based on the rule operator
    if (operator === 'withinDays') {
      const daysDifference = calculateDateDifference(referenceDate, currentDate, 'day');
      
      if (daysDifference > value) {
        logger.debug('Time limit exceeded', { daysDifference, limit: value });
        return createTimeframeViolation(rule, {
          limit_days: value,
          actual_days: daysDifference,
          original_date: referenceDate.toISOString()
        });
      }
    } 
    else if (operator === 'maxDaysSinceTransaction') {
      const daysSinceTransaction = calculateDateDifference(referenceDate, currentDate, 'day');
      
      if (daysSinceTransaction > value) {
        logger.debug('Maximum days since transaction exceeded', { daysSinceTransaction, limit: value });
        return createTimeframeViolation(rule, {
          limit_days: value,
          actual_days: daysSinceTransaction,
          original_date: referenceDate.toISOString()
        });
      }
    }
    else if (operator === 'beforeDate') {
      const targetDate = new Date(value);
      
      if (currentDate > targetDate) {
        logger.debug('Date is after the allowed target date', { currentDate, targetDate });
        return createTimeframeViolation(rule, {
          target_date: targetDate.toISOString(),
          current_date: currentDate.toISOString()
        });
      }
    }
    else if (operator === 'afterDate') {
      const targetDate = new Date(value);
      
      if (currentDate < targetDate) {
        logger.debug('Date is before the required target date', { currentDate, targetDate });
        return createTimeframeViolation(rule, {
          target_date: targetDate.toISOString(),
          current_date: currentDate.toISOString()
        });
      }
    }
    else if (operator === 'businessDaysLimit') {
      // This would use the businessDays functionality from date-utils
      // But for now we'll use the standard day calculation
      const daysDifference = calculateDateDifference(referenceDate, currentDate, 'day');
      
      if (daysDifference > value) {
        logger.debug('Business days limit exceeded', { daysDifference, limit: value });
        return createTimeframeViolation(rule, {
          limit_days: value,
          actual_days: daysDifference,
          original_date: referenceDate.toISOString()
        });
      }
    }
    else if (operator === 'cardNetworkSpecific') {
      // For card network specific rules, we might need to check the card network
      // and apply network-specific logic
      const cardNetwork = getFieldValue(context, 'transaction.cardNetwork') || 
                          getFieldValue(context, 'cardNetwork');
      
      if (cardNetwork && value[cardNetwork]) {
        const networkLimit = value[cardNetwork];
        const daysDifference = calculateDateDifference(referenceDate, currentDate, 'day');
        
        if (daysDifference > networkLimit) {
          logger.debug('Card network-specific time limit exceeded', { 
            cardNetwork, 
            daysDifference, 
            networkLimit 
          });
          return createTimeframeViolation(rule, {
            card_network: cardNetwork,
            limit_days: networkLimit,
            actual_days: daysDifference,
            original_date: referenceDate.toISOString()
          });
        }
      }
    }
    
    // If we reach here, the rule passed
    logger.debug('Timeframe rule passed validation', { 
      ruleId: rule.rule_id, 
      ruleName: rule.rule_name 
    });
    return null;
  } catch (error) {
    logger.error('Error validating timeframe rule', { 
      error, 
      ruleId: rule.rule_id,
      transactionId: refundRequest.transactionId
    });
    
    return {
      violation_code: 'TIMEFRAME_VALIDATION_ERROR',
      violation_message: 'An error occurred during timeframe validation',
      severity: 'ERROR',
      remediation: 'Please contact support for assistance',
      details: {
        error_message: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

/**
 * Utility function to retrieve a field value from context using dot notation path
 *
 * @param context - The object to extract value from
 * @param fieldPath - Dot notation path to the field (e.g., "transaction.processedDate")
 * @returns Field value if found, undefined otherwise
 */
export function getFieldValue(context: object, fieldPath: string): any {
  if (!context || !fieldPath) {
    return undefined;
  }
  
  try {
    // Split the path by dots to navigate nested objects
    const pathSegments = fieldPath.split('.');
    let value: any = context;
    
    // Traverse the object using the path segments
    for (const segment of pathSegments) {
      if (value === null || value === undefined || typeof value !== 'object') {
        return undefined;
      }
      value = value[segment];
    }
    
    return value;
  } catch (error) {
    logger.error('Error retrieving field value', { fieldPath, error });
    return undefined;
  }
}

/**
 * Creates a standardized compliance violation for timeframe rules
 * 
 * @param rule - The rule that was violated
 * @param details - Additional details about the violation
 * @returns Formatted compliance violation object
 */
function createTimeframeViolation(rule: any, details: object): any {
  return {
    violation_code: rule.violation_code,
    violation_message: rule.violation_message,
    severity: rule.severity || 'ERROR',
    remediation: rule.remediation || 'Process refund using an alternative method',
    details
  };
}