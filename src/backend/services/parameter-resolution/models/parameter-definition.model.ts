/**
 * Represents the result of a parameter validation.
 */
export interface ValidationResult {
  /** Whether the validation was successful */
  valid: boolean;
  /** Error messages if validation failed */
  errors: string[];
}

/**
 * Supported data types for parameters in the system.
 */
export enum ParameterDataType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  OBJECT = 'OBJECT',
  ARRAY = 'ARRAY',
  DECIMAL = 'DECIMAL'
}

/**
 * Types of validation rules that can be applied to parameters.
 */
export enum ValidationRuleType {
  RANGE = 'RANGE',
  PATTERN = 'PATTERN',
  ENUM = 'ENUM'
}

/**
 * Base interface for all validation rules.
 */
export interface IValidationRule {
  /** The type of validation rule */
  type: ValidationRuleType;
}

/**
 * Validation rule for numeric range checking.
 */
export interface IRangeValidationRule extends IValidationRule {
  type: ValidationRuleType.RANGE;
  /** The minimum allowed value (optional) */
  min?: number;
  /** The maximum allowed value (optional) */
  max?: number;
}

/**
 * Validation rule for string pattern matching.
 */
export interface IPatternValidationRule extends IValidationRule {
  type: ValidationRuleType.PATTERN;
  /** Regular expression pattern to match against */
  pattern: string;
}

/**
 * Validation rule for enumerated values.
 */
export interface IEnumValidationRule extends IValidationRule {
  type: ValidationRuleType.ENUM;
  /** Array of allowed values */
  values: any[];
}

/**
 * Interface for initializing a parameter definition.
 */
export interface IParameterDefinitionInit {
  /** Unique name of the parameter */
  name: string;
  /** Description of the parameter's purpose */
  description: string;
  /** Data type of the parameter */
  dataType: ParameterDataType;
  /** Default value for the parameter */
  defaultValue: any;
  /** Validation rules to apply to the parameter (optional) */
  validationRules?: IValidationRule[];
  /** Whether this parameter can be overridden at lower levels (optional) */
  overridable?: boolean;
  /** Functional category of the parameter (optional) */
  category?: string;
  /** Sensitivity level of the parameter (optional) */
  sensitivity?: string;
  /** Whether changes to this parameter require audit logging (optional) */
  auditRequired?: boolean;
}

/**
 * Defines the structure, constraints, and validation rules for a refund parameter.
 * Used by the Parameter Resolution Service to validate and manage configuration values.
 * 
 * @example
 * ```typescript
 * const maxRefundAmountParam = new ParameterDefinition({
 *   name: 'maxRefundAmount',
 *   description: 'Maximum amount that can be refunded in a single transaction',
 *   dataType: ParameterDataType.DECIMAL,
 *   defaultValue: 10000.00,
 *   validationRules: [
 *     {
 *       type: ValidationRuleType.RANGE,
 *       min: 0.01,
 *       max: 100000.00
 *     }
 *   ],
 *   overridable: true,
 *   category: 'limits',
 *   sensitivity: 'internal',
 *   auditRequired: true
 * });
 * 
 * const validationResult = maxRefundAmountParam.validate(5000);
 * // validationResult: { valid: true, errors: [] }
 * ```
 */
export default class ParameterDefinition {
  /** Unique name of the parameter */
  public readonly name: string;
  
  /** Description of the parameter's purpose */
  public readonly description: string;
  
  /** Data type of the parameter */
  public readonly dataType: ParameterDataType;
  
  /** Default value for the parameter */
  public readonly defaultValue: any;
  
  /** Validation rules to apply to the parameter */
  public readonly validationRules: IValidationRule[];
  
  /** Whether this parameter can be overridden at lower levels */
  public readonly overridable: boolean;
  
  /** Functional category of the parameter */
  public readonly category: string;
  
  /** Sensitivity level of the parameter */
  public readonly sensitivity: string;
  
  /** Whether changes to this parameter require audit logging */
  public readonly auditRequired: boolean;

  /**
   * Creates a new parameter definition instance.
   * @param init Initialization parameters
   */
  constructor(init: IParameterDefinitionInit) {
    this.name = init.name;
    this.description = init.description;
    this.dataType = init.dataType;
    this.defaultValue = init.defaultValue;
    this.validationRules = init.validationRules || [];
    this.overridable = init.overridable !== undefined ? init.overridable : true;
    this.category = init.category || 'general';
    this.sensitivity = init.sensitivity || 'internal';
    this.auditRequired = init.auditRequired || false;
  }

  /**
   * Validates a parameter value against this definition's data type and rules.
   * @param value The value to validate
   * @returns Result of validation with success flag and error messages if any
   */
  public validate(value: any): ValidationResult {
    // First validate the data type
    const typeValidation = this.validateDataType(value);
    if (!typeValidation.valid) {
      return typeValidation;
    }

    // Then validate against each rule
    for (const rule of this.validationRules) {
      const ruleValidation = this.validateRule(value, rule);
      if (!ruleValidation.valid) {
        return ruleValidation;
      }
    }

    // If we get here, validation passed
    return { valid: true, errors: [] };
  }

  /**
   * Internal method to validate a value against the parameter's data type.
   * @param value The value to validate
   * @returns Result of data type validation
   */
  private validateDataType(value: any): ValidationResult {
    // Check for null/undefined
    if (value === null || value === undefined) {
      return {
        valid: false,
        errors: [`Value is required for parameter '${this.name}'`]
      };
    }

    switch (this.dataType) {
      case ParameterDataType.STRING:
        if (typeof value !== 'string') {
          return {
            valid: false,
            errors: [`Parameter '${this.name}' must be a string, got ${typeof value}`]
          };
        }
        break;
        
      case ParameterDataType.NUMBER:
        if (typeof value !== 'number' || isNaN(value)) {
          return {
            valid: false,
            errors: [`Parameter '${this.name}' must be a number, got ${typeof value}`]
          };
        }
        break;
        
      case ParameterDataType.BOOLEAN:
        if (typeof value !== 'boolean') {
          return {
            valid: false,
            errors: [`Parameter '${this.name}' must be a boolean, got ${typeof value}`]
          };
        }
        break;
        
      case ParameterDataType.OBJECT:
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return {
            valid: false,
            errors: [`Parameter '${this.name}' must be an object, got ${Array.isArray(value) ? 'array' : typeof value}`]
          };
        }
        break;
        
      case ParameterDataType.ARRAY:
        if (!Array.isArray(value)) {
          return {
            valid: false,
            errors: [`Parameter '${this.name}' must be an array, got ${typeof value}`]
          };
        }
        break;
        
      case ParameterDataType.DECIMAL:
        if (typeof value !== 'number' || isNaN(value)) {
          return {
            valid: false,
            errors: [`Parameter '${this.name}' must be a decimal number, got ${typeof value}`]
          };
        }
        break;
        
      default:
        return {
          valid: false,
          errors: [`Unknown data type '${this.dataType}' for parameter '${this.name}'`]
        };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Internal method to validate a value against a specific validation rule.
   * @param value The value to validate
   * @param rule The validation rule to apply
   * @returns Result of rule validation
   */
  private validateRule(value: any, rule: IValidationRule): ValidationResult {
    switch (rule.type) {
      case ValidationRuleType.RANGE: {
        const rangeRule = rule as IRangeValidationRule;
        
        if (rangeRule.min !== undefined && value < rangeRule.min) {
          return {
            valid: false,
            errors: [`Value ${value} is below minimum ${rangeRule.min} for parameter '${this.name}'`]
          };
        }
        
        if (rangeRule.max !== undefined && value > rangeRule.max) {
          return {
            valid: false,
            errors: [`Value ${value} is above maximum ${rangeRule.max} for parameter '${this.name}'`]
          };
        }
        break;
      }
        
      case ValidationRuleType.PATTERN: {
        const patternRule = rule as IPatternValidationRule;
        const pattern = new RegExp(patternRule.pattern);
        
        if (!pattern.test(String(value))) {
          return {
            valid: false,
            errors: [`Value "${value}" does not match pattern "${patternRule.pattern}" for parameter '${this.name}'`]
          };
        }
        break;
      }
        
      case ValidationRuleType.ENUM: {
        const enumRule = rule as IEnumValidationRule;
        
        if (!enumRule.values.includes(value)) {
          return {
            valid: false,
            errors: [`Value "${value}" is not in allowed values [${enumRule.values.join(', ')}] for parameter '${this.name}'`]
          };
        }
        break;
      }
        
      default:
        return {
          valid: false,
          errors: [`Unknown validation rule type '${(rule as any).type}' for parameter '${this.name}'`]
        };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Converts the parameter definition to a plain object for serialization.
   * @returns Plain object representation of the parameter definition
   */
  public toJSON(): object {
    return {
      name: this.name,
      description: this.description,
      dataType: this.dataType,
      defaultValue: this.defaultValue,
      validationRules: this.validationRules,
      overridable: this.overridable,
      category: this.category,
      sensitivity: this.sensitivity,
      auditRequired: this.auditRequired
    };
  }
}