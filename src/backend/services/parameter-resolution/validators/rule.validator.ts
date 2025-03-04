import { ValidationResult, IValidationRule, ValidationRuleType, IRangeValidationRule, IPatternValidationRule, IEnumValidationRule } from '../models/parameter-definition.model';
import { logger } from '../../../common/utils/logger';
import { ValidationError } from '../../../common/errors/validation-error';
import { ErrorCode } from '../../../common/constants/error-codes';

/**
 * Validates a value against a specific validation rule
 * 
 * @param value - The value to validate
 * @param rule - The validation rule to apply
 * @returns Result of validation with success flag and error messages if any
 */
export default function validateRule(value: any, rule: IValidationRule): ValidationResult {
  logger.debug('Validating rule', { ruleType: rule.type, value });

  switch (rule.type) {
    case ValidationRuleType.RANGE:
      return validateRangeRule(value, rule as IRangeValidationRule);
    case ValidationRuleType.PATTERN:
      return validatePatternRule(value, rule as IPatternValidationRule);
    case ValidationRuleType.ENUM:
      return validateEnumRule(value, rule as IEnumValidationRule);
    default:
      return {
        valid: false,
        errors: [`Unknown validation rule type: ${rule.type}`]
      };
  }
}

/**
 * Validates a numeric value against a range rule with min/max bounds
 * 
 * @param value - The value to validate
 * @param rule - The range validation rule to apply
 * @returns Result of range validation
 */
export function validateRangeRule(value: any, rule: IRangeValidationRule): ValidationResult {
  // Check if the value is a number
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      valid: false,
      errors: ['Value must be a number for range validation']
    };
  }

  // Check minimum bound if defined
  if (rule.min !== undefined && value < rule.min) {
    return {
      valid: false,
      errors: [`Value ${value} is below minimum ${rule.min}`]
    };
  }

  // Check maximum bound if defined
  if (rule.max !== undefined && value > rule.max) {
    return {
      valid: false,
      errors: [`Value ${value} is above maximum ${rule.max}`]
    };
  }

  // Value is within range
  return { valid: true, errors: [] };
}

/**
 * Validates a string value against a regular expression pattern
 * 
 * @param value - The value to validate
 * @param rule - The pattern validation rule to apply
 * @returns Result of pattern validation
 */
export function validatePatternRule(value: any, rule: IPatternValidationRule): ValidationResult {
  // Check if the value is a string
  if (typeof value !== 'string') {
    return {
      valid: false,
      errors: ['Value must be a string for pattern validation']
    };
  }

  // Test against pattern
  try {
    const pattern = new RegExp(rule.pattern);
    if (!pattern.test(value)) {
      return {
        valid: false,
        errors: [`Value "${value}" does not match pattern "${rule.pattern}"`]
      };
    }
  } catch (error) {
    // Handle invalid regex pattern
    return {
      valid: false,
      errors: [`Invalid regular expression in pattern rule: ${rule.pattern}`]
    };
  }

  // Pattern matches
  return { valid: true, errors: [] };
}

/**
 * Validates a value against a list of allowed values
 * 
 * @param value - The value to validate
 * @param rule - The enum validation rule to apply
 * @returns Result of enum validation
 */
export function validateEnumRule(value: any, rule: IEnumValidationRule): ValidationResult {
  // Check if value is in the allowed values
  if (!rule.values.includes(value)) {
    return {
      valid: false,
      errors: [`Value "${value}" is not in allowed values: [${rule.values.join(', ')}]`]
    };
  }

  // Value is allowed
  return { valid: true, errors: [] };
}

/**
 * Creates a standardized ValidationError for rule validation failures
 * 
 * @param value - The value that failed validation
 * @param rule - The validation rule that was violated
 * @param parameterName - The name of the parameter being validated
 * @returns Validation error with details about the rule violation
 */
export function createRuleValidationError(
  value: any,
  rule: IValidationRule,
  parameterName: string
): ValidationError {
  let message: string;

  // Create specific error message based on rule type
  switch (rule.type) {
    case ValidationRuleType.RANGE: {
      const rangeRule = rule as IRangeValidationRule;
      let constraints = [];
      if (rangeRule.min !== undefined) constraints.push(`minimum: ${rangeRule.min}`);
      if (rangeRule.max !== undefined) constraints.push(`maximum: ${rangeRule.max}`);
      message = `Value ${value} for parameter '${parameterName}' violates range constraints (${constraints.join(', ')})`;
      break;
    }
    case ValidationRuleType.PATTERN: {
      const patternRule = rule as IPatternValidationRule;
      message = `Value "${value}" for parameter '${parameterName}' does not match pattern "${patternRule.pattern}"`;
      break;
    }
    case ValidationRuleType.ENUM: {
      const enumRule = rule as IEnumValidationRule;
      message = `Value "${value}" for parameter '${parameterName}' is not in allowed values: [${enumRule.values.join(', ')}]`;
      break;
    }
    default:
      message = `Parameter '${parameterName}' failed validation with unknown rule type`;
  }

  // Create field error
  const fieldError = {
    field: parameterName,
    message
  };

  // Return complete validation error
  return new ValidationError(
    ErrorCode.VALIDATION_FAILED,
    `Parameter validation failed: ${parameterName}`,
    { fieldErrors: [fieldError] }
  );
}