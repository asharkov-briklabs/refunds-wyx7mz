import Joi from 'joi'; // ^17.9.2
import { ValidationError } from '../../../common/errors/validation-error';
import { validate } from '../../../common/utils/validation-utils';

/**
 * Validates a request to create a new parameter
 * 
 * @param req - The request object containing parameter data
 * @returns Promise that resolves if validation passes, rejects with ValidationError if validation fails
 */
export async function validateParameterCreate(req: any): Promise<void> {
  try {
    // Create and validate against the schema
    const schema = createParameterSchema();
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const fieldErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      throw ValidationError.createFromFieldErrors(
        fieldErrors,
        'Parameter validation failed'
      );
    }
    
    // Perform additional type-specific validation
    if (!validateParameterValue(
      value.data_type, 
      value.parameter_value, 
      value.validation_rules
    )) {
      throw ValidationError.createFromFieldErrors(
        [{
          field: 'parameter_value',
          message: `Value is not valid for type ${value.data_type}`
        }],
        `Parameter value is not valid for type ${value.data_type}`
      );
    }
  } catch (error) {
    // If it's not already a ValidationError, wrap it
    if (!(error instanceof ValidationError)) {
      throw new ValidationError(
        undefined,
        error.message || 'Parameter validation failed'
      );
    }
    
    // Re-throw ValidationError
    throw error;
  }
}

/**
 * Validates a request to update an existing parameter
 * 
 * @param req - The request object containing parameter update data
 * @returns Promise that resolves if validation passes, rejects with ValidationError if validation fails
 */
export async function validateParameterUpdate(req: any): Promise<void> {
  try {
    // Create and validate against the schema
    const schema = updateParameterSchema();
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const fieldErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      throw ValidationError.createFromFieldErrors(
        fieldErrors,
        'Parameter update validation failed'
      );
    }
    
    // If data_type is provided in request params, we can validate the parameter value
    const dataType = req.params.data_type || req.body.data_type;
    if (dataType && value.parameter_value !== undefined) {
      if (!validateParameterValue(
        dataType,
        value.parameter_value,
        value.validation_rules
      )) {
        throw ValidationError.createFromFieldErrors(
          [{
            field: 'parameter_value',
            message: `Value is not valid for type ${dataType}`
          }],
          `Parameter value is not valid for type ${dataType}`
        );
      }
    }
  } catch (error) {
    // If it's not already a ValidationError, wrap it
    if (!(error instanceof ValidationError)) {
      throw new ValidationError(
        undefined,
        error.message || 'Parameter update validation failed'
      );
    }
    
    // Re-throw ValidationError
    throw error;
  }
}

/**
 * Validates a request to retrieve parameters
 * 
 * @param req - The request object containing parameter retrieval criteria
 * @returns Promise that resolves if validation passes, rejects with ValidationError if validation fails
 */
export async function validateParameterGet(req: any): Promise<void> {
  try {
    const schema = Joi.object({
      entity_type: Joi.string().valid('PROGRAM', 'BANK', 'ORGANIZATION', 'MERCHANT').required(),
      entity_id: Joi.string().required(),
      parameter_name: Joi.string()
    });
    
    const { error } = schema.validate(req.query, { abortEarly: false });
    
    if (error) {
      const fieldErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      throw ValidationError.createFromFieldErrors(
        fieldErrors,
        'Parameter retrieval validation failed'
      );
    }
  } catch (error) {
    // If it's not already a ValidationError, wrap it
    if (!(error instanceof ValidationError)) {
      throw new ValidationError(
        undefined,
        error.message || 'Parameter retrieval validation failed'
      );
    }
    
    // Re-throw ValidationError
    throw error;
  }
}

/**
 * Validates a request to delete a parameter
 * 
 * @param req - The request object containing parameter deletion criteria
 * @returns Promise that resolves if validation passes, rejects with ValidationError if validation fails
 */
export async function validateParameterDelete(req: any): Promise<void> {
  try {
    const schema = Joi.object({
      entity_type: Joi.string().valid('PROGRAM', 'BANK', 'ORGANIZATION', 'MERCHANT').required(),
      entity_id: Joi.string().required(),
      parameter_name: Joi.string().required()
    });
    
    const { error } = schema.validate(req.params, { abortEarly: false });
    
    if (error) {
      const fieldErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      throw ValidationError.createFromFieldErrors(
        fieldErrors,
        'Parameter deletion validation failed'
      );
    }
  } catch (error) {
    // If it's not already a ValidationError, wrap it
    if (!(error instanceof ValidationError)) {
      throw new ValidationError(
        undefined,
        error.message || 'Parameter deletion validation failed'
      );
    }
    
    // Re-throw ValidationError
    throw error;
  }
}

/**
 * Validates a parameter value against its expected data type and rules
 * 
 * @param dataType - The expected data type of the parameter
 * @param value - The parameter value to validate
 * @param validationRules - Optional validation rules to apply
 * @returns True if validation passes, false otherwise
 */
export function validateParameterValue(
  dataType: string,
  value: any,
  validationRules?: any
): boolean {
  // Check basic data type first
  switch (dataType) {
    case 'string':
      if (typeof value !== 'string') {
        return false;
      }
      
      // Apply string-specific validation rules
      if (validationRules) {
        // Check pattern if specified
        if (validationRules.pattern && !new RegExp(validationRules.pattern).test(value)) {
          return false;
        }
        
        // Check min/max length if specified
        if (validationRules.minLength !== undefined && value.length < validationRules.minLength) {
          return false;
        }
        
        if (validationRules.maxLength !== undefined && value.length > validationRules.maxLength) {
          return false;
        }
      }
      return true;
      
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return false;
      }
      
      // Apply number-specific validation rules
      if (validationRules) {
        // Check min/max values if specified
        if (validationRules.min !== undefined && value < validationRules.min) {
          return false;
        }
        
        if (validationRules.max !== undefined && value > validationRules.max) {
          return false;
        }
      }
      return true;
      
    case 'boolean':
      return typeof value === 'boolean';
      
    case 'array':
      if (!Array.isArray(value)) {
        return false;
      }
      
      // Apply array-specific validation rules
      if (validationRules) {
        // Check min/max length if specified
        if (validationRules.minItems !== undefined && value.length < validationRules.minItems) {
          return false;
        }
        
        if (validationRules.maxItems !== undefined && value.length > validationRules.maxItems) {
          return false;
        }
        
        // Check item types if specified
        if (validationRules.itemType && validationRules.itemType !== 'any') {
          for (const item of value) {
            if (!validateParameterValue(validationRules.itemType, item)) {
              return false;
            }
          }
        }
      }
      return true;
      
    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return false;
      }
      
      // Apply object-specific validation rules
      if (validationRules && validationRules.requiredProperties) {
        for (const prop of validationRules.requiredProperties) {
          if (value[prop] === undefined) {
            return false;
          }
        }
      }
      return true;
      
    case 'enum':
      if (!validationRules || !validationRules.allowedValues) {
        return false;
      }
      return validationRules.allowedValues.includes(value);
      
    default:
      return false;
  }
}

/**
 * Creates a Joi validation schema for parameter creation
 * 
 * @returns Joi schema for parameter creation validation
 */
function createParameterSchema() {
  return Joi.object({
    entity_type: Joi.string()
      .valid('PROGRAM', 'BANK', 'ORGANIZATION', 'MERCHANT')
      .required()
      .description('Type of entity this parameter belongs to'),
      
    entity_id: Joi.string()
      .required()
      .description('ID of the entity this parameter belongs to'),
      
    parameter_name: Joi.string()
      .required()
      .description('Name of the parameter'),
      
    parameter_value: Joi.required()
      .description('Value of the parameter, can be any valid JSON type'),
      
    data_type: Joi.string()
      .valid('string', 'number', 'boolean', 'array', 'object', 'enum')
      .required()
      .description('Data type of the parameter value'),
      
    effective_date: Joi.date()
      .iso()
      .description('Date when this parameter value becomes effective'),
      
    expiration_date: Joi.date()
      .iso()
      .greater(Joi.ref('effective_date'))
      .description('Date when this parameter value expires'),
      
    description: Joi.string()
      .description('Description of what this parameter is used for'),
      
    is_overridable: Joi.boolean()
      .default(true)
      .description('Whether this parameter can be overridden at lower levels'),
      
    validation_rules: Joi.object()
      .description('Rules for validating parameter values')
  });
}

/**
 * Creates a Joi validation schema for parameter updates
 * 
 * @returns Joi schema for parameter update validation
 */
function updateParameterSchema() {
  return Joi.object({
    parameter_value: Joi.required()
      .description('New value for the parameter'),
      
    effective_date: Joi.date()
      .iso()
      .description('Date when this parameter value becomes effective'),
      
    expiration_date: Joi.date()
      .iso()
      .greater(Joi.ref('effective_date'))
      .description('Date when this parameter value expires'),
      
    description: Joi.string()
      .description('Description of what this parameter is used for'),
      
    is_overridable: Joi.boolean()
      .description('Whether this parameter can be overridden at lower levels'),
      
    validation_rules: Joi.object()
      .description('Rules for validating parameter values')
  });
}