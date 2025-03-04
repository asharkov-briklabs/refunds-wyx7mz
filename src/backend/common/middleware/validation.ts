import { Request, Response, NextFunction } from 'express'; // Express 4.18.2
import Joi, { Schema } from 'joi'; // Joi 17.9.2
import { ValidationError } from '../errors/validation-error';
import { logger } from '../utils/logger';

/**
 * Interface defining the validation schemas for different parts of the request
 */
export interface ValidationSchemas {
  body?: Schema;
  query?: Schema;
  params?: Schema;
}

/**
 * Creates a middleware function that validates request data against provided schemas.
 * Supports validation of request body, query parameters, and URL parameters.
 *
 * @param schemas - Object containing Joi schemas for body, query, and/or params
 * @returns Express middleware function that validates the request
 */
export function validateRequest(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Track validation errors across all request parts
    const validationErrors: Array<{ field: string; message: string; code?: string }> = [];
    
    // Validate request body if schema provided
    if (schemas.body && req.body) {
      logger.debug('Validating request body', { path: req.path });
      const bodyValidation = schemas.body.validate(req.body, { abortEarly: false });
      
      if (bodyValidation.error) {
        const bodyErrors = joiErrorToFieldErrors(bodyValidation.error);
        validationErrors.push(...bodyErrors);
      }
    }
    
    // Validate query parameters if schema provided
    if (schemas.query && req.query) {
      logger.debug('Validating request query parameters', { path: req.path });
      const queryValidation = schemas.query.validate(req.query, { abortEarly: false });
      
      if (queryValidation.error) {
        const queryErrors = joiErrorToFieldErrors(queryValidation.error);
        validationErrors.push(...queryErrors);
      }
    }
    
    // Validate URL parameters if schema provided
    if (schemas.params && req.params) {
      logger.debug('Validating request URL parameters', { path: req.path });
      const paramsValidation = schemas.params.validate(req.params, { abortEarly: false });
      
      if (paramsValidation.error) {
        const paramsErrors = joiErrorToFieldErrors(paramsValidation.error);
        validationErrors.push(...paramsErrors);
      }
    }
    
    // If any validation errors were found, create and return a ValidationError
    if (validationErrors.length > 0) {
      logger.debug('Validation failed', { 
        path: req.path, 
        method: req.method,
        errorCount: validationErrors.length
      });
      
      const validationError = ValidationError.createFromFieldErrors(validationErrors);
      return next(validationError);
    }
    
    // Validation passed, continue to the next middleware
    logger.debug('Validation passed', { path: req.path });
    next();
  };
}

/**
 * Convenience function for validating only the request body
 * 
 * @param schema - Joi schema for validating the request body
 * @returns Express middleware function
 */
export function validateBody(schema: Schema) {
  return validateRequest({ body: schema });
}

/**
 * Convenience function for validating only the request query parameters
 * 
 * @param schema - Joi schema for validating the request query parameters
 * @returns Express middleware function
 */
export function validateQuery(schema: Schema) {
  return validateRequest({ query: schema });
}

/**
 * Convenience function for validating only the request URL parameters
 * 
 * @param schema - Joi schema for validating the request URL parameters
 * @returns Express middleware function
 */
export function validateParams(schema: Schema) {
  return validateRequest({ params: schema });
}

/**
 * Converts Joi validation errors to the application's standardized FieldError format
 * 
 * @param joiError - Joi ValidationError object
 * @returns Array of FieldError objects
 */
function joiErrorToFieldErrors(joiError: Joi.ValidationError) {
  return joiError.details.map(detail => {
    // Convert path array to string with proper formatting
    let field = '';
    
    if (detail.path && detail.path.length > 0) {
      field = detail.path.reduce((result, current, index) => {
        // For array indices, use bracket notation
        if (typeof current === 'number') {
          return `${result}[${current}]`;
        }
        // For the first segment, don't add a dot
        if (index === 0) {
          return current.toString();
        }
        // For other segments, use dot notation
        return `${result}.${current}`;
      }, '');
    } else if (detail.context?.key) {
      // Fallback to context key if path is not available
      field = detail.context.key;
    } else {
      // Last resort fallback
      field = 'unknown';
    }
    
    return {
      field,
      message: detail.message,
      code: detail.type
    };
  });
}