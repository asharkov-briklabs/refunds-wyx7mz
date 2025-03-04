import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { ValidationError } from '../../common/errors/validation-error';
import { ErrorCode } from '../../common/constants/error-codes';
import {
  validateRequiredFields,
  validateDataType,
  validateEnum,
  validateId,
  validateDate,
  combineValidationResults,
} from '../../common/utils/validation-utils';
import { logger } from '../../common/utils/logger';

/**
 * Interface for field validation schema
 */
interface ValidationSchema {
  required?: string[];
  types?: Record<string, string>;
  enums?: Record<string, any[]>;
  custom?: Array<(data: any) => { success: boolean; errors: any[] }>;
  transform?: (data: any) => any;
}

/**
 * Creates middleware for validating request data against a schema
 *
 * @param schema - The schema to validate against
 * @param source - Source of data to validate ('body', 'query', or 'params')
 * @returns Express middleware function that validates request data
 */
export const validateSchema = (schema: ValidationSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Extract data from the request based on source
    const data = req[source];
    
    if (!data) {
      logger.debug(`No data found in request ${source}`);
      return next();
    }
    
    try {
      logger.debug(`Validating ${source} against schema`, { data });
      
      // Collect validation errors
      const fieldErrors: Array<{ field: string; message: string; code?: string }> = [];
      
      // Create a copy of the data for validation and transformation
      let validatedData = { ...data };
      
      // Apply custom transformation if provided
      if (schema.transform) {
        validatedData = schema.transform(validatedData);
      }
      
      // Validate required fields
      if (schema.required && schema.required.length > 0) {
        const requiredResult = validateRequiredFields(validatedData, schema.required);
        if (!requiredResult.success) {
          fieldErrors.push(...requiredResult.errors);
        }
      }
      
      // Validate data types
      if (schema.types && Object.keys(schema.types).length > 0) {
        const typeResult = validateDataType(validatedData, schema.types);
        if (!typeResult.success) {
          fieldErrors.push(...typeResult.errors);
        }
      }
      
      // Validate enum values
      if (schema.enums) {
        for (const [field, allowedValues] of Object.entries(schema.enums)) {
          if (validatedData[field] !== undefined) {
            const enumResult = validateEnum(validatedData[field], field, allowedValues);
            if (!enumResult.success) {
              fieldErrors.push(...enumResult.errors);
            }
          }
        }
      }
      
      // Custom validation functions
      if (schema.custom && schema.custom.length > 0) {
        for (const validator of schema.custom) {
          const customResult = validator(validatedData);
          if (!customResult.success) {
            fieldErrors.push(...customResult.errors);
          }
        }
      }
      
      // If there are validation errors, create and return a ValidationError
      if (fieldErrors.length > 0) {
        const error = ValidationError.createFromFieldErrors(
          fieldErrors,
          `Validation failed for ${source}`
        );
        return next(error);
      }
      
      // Update the request data with validated/transformed data
      req[source] = validatedData;
      
      // If validation passes, proceed to next middleware
      next();
    } catch (error) {
      logger.error(`Error validating ${source}:`, error);
      next(error);
    }
  };
};

/**
 * Middleware for validating refund request payloads
 * 
 * @returns Express middleware function for refund request validation
 */
export const validateRefundRequest = () => {
  const refundSchema: ValidationSchema = {
    required: ['transactionId', 'amount', 'refundMethod', 'reason'],
    types: {
      transactionId: 'string',
      amount: 'number',
      refundMethod: 'string',
      reason: 'string',
      reasonCode: 'string',
      description: 'string',
      metadata: 'object'
    },
    enums: {
      refundMethod: ['ORIGINAL_PAYMENT', 'BALANCE', 'OTHER']
    },
    custom: [
      // Custom validator for refund amount
      (data: any) => {
        const errors = [];
        
        // Check that amount is positive
        if (data.amount !== undefined && data.amount <= 0) {
          errors.push({
            field: 'amount',
            message: 'Refund amount must be greater than zero',
            code: ErrorCode.INVALID_FORMAT
          });
        }
        
        // Check that bankAccountId is provided when method is OTHER
        if (data.refundMethod === 'OTHER' && !data.bankAccountId) {
          errors.push({
            field: 'bankAccountId',
            message: 'Bank account ID is required when refund method is OTHER',
            code: ErrorCode.REQUIRED_FIELD_MISSING
          });
        }
        
        return {
          success: errors.length === 0,
          errors
        };
      }
    ],
    transform: (data) => {
      // Convert amount to number if it's a string
      if (typeof data.amount === 'string') {
        data.amount = Number(data.amount);
      }
      return data;
    }
  };
  
  return validateSchema(refundSchema, 'body');
};

/**
 * Middleware for validating pagination parameters in requests
 * 
 * @returns Express middleware function for pagination parameter validation
 */
export const validatePaginationParams = () => {
  const paginationSchema: ValidationSchema = {
    types: {
      page: 'number',
      pageSize: 'number'
    },
    custom: [
      // Custom validator for pagination params
      (data: any) => {
        const errors = [];
        
        // Check that page is at least 1
        if (data.page !== undefined && data.page < 1) {
          errors.push({
            field: 'page',
            message: 'Page number must be at least 1',
            code: ErrorCode.INVALID_FORMAT
          });
        }
        
        // Check that pageSize is between 1 and 100
        if (data.pageSize !== undefined && (data.pageSize < 1 || data.pageSize > 100)) {
          errors.push({
            field: 'pageSize',
            message: 'Page size must be between 1 and 100',
            code: ErrorCode.INVALID_FORMAT
          });
        }
        
        return {
          success: errors.length === 0,
          errors
        };
      }
    ],
    transform: (data) => {
      // Convert string values to numbers
      if (data.page !== undefined) {
        data.page = Number(data.page);
      }
      
      if (data.pageSize !== undefined) {
        data.pageSize = Number(data.pageSize);
      }
      
      // Set default values if not provided
      if (data.page === undefined || isNaN(data.page)) {
        data.page = 1;
      }
      
      if (data.pageSize === undefined || isNaN(data.pageSize)) {
        data.pageSize = 20; // Default page size
      }
      
      return data;
    }
  };
  
  return validateSchema(paginationSchema, 'query');
};

/**
 * Middleware for validating date range parameters in requests
 * 
 * @returns Express middleware function for date range parameter validation
 */
export const validateDateRangeParams = () => {
  const dateRangeSchema: ValidationSchema = {
    custom: [
      // Custom validator for date range params
      (data: any) => {
        const errors = [];
        
        // Validate startDate if provided
        if (data.startDate) {
          const startDateResult = validateDate(data.startDate, 'startDate');
          if (!startDateResult.success) {
            errors.push(...startDateResult.errors);
          }
        }
        
        // Validate endDate if provided
        if (data.endDate) {
          const endDateResult = validateDate(data.endDate, 'endDate');
          if (!endDateResult.success) {
            errors.push(...endDateResult.errors);
          }
        }
        
        // Validate that startDate is before endDate if both are provided
        if (data.startDate && data.endDate) {
          const startDate = new Date(data.startDate);
          const endDate = new Date(data.endDate);
          
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate > endDate) {
            errors.push({
              field: 'dateRange',
              message: 'Start date must be before end date',
              code: ErrorCode.INVALID_FORMAT
            });
          }
        }
        
        return {
          success: errors.length === 0,
          errors
        };
      }
    ],
    transform: (data) => {
      // Convert string dates to Date objects
      if (data.startDate && typeof data.startDate === 'string') {
        const startDate = new Date(data.startDate);
        
        // Check if valid date
        if (!isNaN(startDate.getTime())) {
          data.startDate = startDate;
        }
      }
      
      if (data.endDate && typeof data.endDate === 'string') {
        const endDate = new Date(data.endDate);
        
        // Check if valid date
        if (!isNaN(endDate.getTime())) {
          data.endDate = endDate;
        }
      }
      
      return data;
    }
  };
  
  return validateSchema(dateRangeSchema, 'query');
};

/**
 * Middleware for validating ID parameters in request URLs
 * 
 * @param paramName - The name of the ID parameter
 * @returns Express middleware function for ID parameter validation
 */
export const validateIdParam = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params[paramName];
      
      if (!id) {
        const error = ValidationError.createRequiredFieldError(paramName);
        return next(error);
      }
      
      const validationResult = validateId(id, paramName);
      
      if (!validationResult.success) {
        const error = ValidationError.createFromFieldErrors(
          validationResult.errors,
          `Invalid ${paramName} format`
        );
        return next(error);
      }
      
      next();
    } catch (error) {
      logger.error(`Error validating ${paramName} parameter:`, error);
      next(error);
    }
  };
};