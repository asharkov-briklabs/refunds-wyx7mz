import * as Joi from 'joi'; // ^17.9.2
import { RefundMethod } from '../../../common/enums/refund-method.enum';
import { ValidationError } from '../../../common/errors/validation-error';
import { ErrorCode } from '../../../common/constants/error-codes';
import { 
  validateRequiredFields, 
  validateDataType, 
  validateEnum, 
  validateRefundAmount, 
  isValidId,
  combineValidationResults,
  ValidationResult
} from '../../../common/utils/validation-utils';
import { logger } from '../../../common/utils/logger';

/**
 * Joi schema for validating refund creation requests
 */
export const createRefundSchema = Joi.object({
  transactionId: Joi.string().required(),
  amount: Joi.number().positive().precision(2).required(),
  reason: Joi.string().required(),
  reasonCode: Joi.string().required(),
  refundMethod: Joi.string().valid(
    RefundMethod.ORIGINAL_PAYMENT, 
    RefundMethod.BALANCE, 
    RefundMethod.OTHER
  ).required(),
  bankAccountId: Joi.string().when('refundMethod', {
    is: RefundMethod.OTHER,
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  metadata: Joi.object().optional(),
  supportingDocuments: Joi.array().items(Joi.object({
    documentId: Joi.string().required(),
    documentType: Joi.string().required(),
    url: Joi.string().uri().required()
  })).optional()
});

/**
 * Joi schema for validating refund update requests
 */
export const updateRefundSchema = Joi.object({
  reason: Joi.string().optional(),
  reasonCode: Joi.string().optional(),
  refundMethod: Joi.string().valid(
    RefundMethod.ORIGINAL_PAYMENT, 
    RefundMethod.BALANCE, 
    RefundMethod.OTHER
  ).optional(),
  bankAccountId: Joi.string().when('refundMethod', {
    is: RefundMethod.OTHER,
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  metadata: Joi.object().optional(),
  supportingDocuments: Joi.array().items(Joi.object({
    documentId: Joi.string().required(),
    documentType: Joi.string().required(),
    url: Joi.string().uri().required()
  })).optional()
});

/**
 * Joi schema for validating refund cancellation requests
 */
export const cancelRefundSchema = Joi.object({
  reason: Joi.string().optional()
});

/**
 * Validates a request to create a new refund against the schema and business rules
 * 
 * @param request - The refund request to validate
 * @returns Validation result containing any errors or null if valid
 */
export function validateCreateRefundRequest(request: any): ValidationResult {
  logger.debug('Validating create refund request', { request });
  
  // Validate with Joi schema first
  const joiResult = createRefundSchema.validate(request, { abortEarly: false });
  
  if (joiResult.error) {
    // Convert Joi errors to our validation error format
    const errors = joiResult.error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      code: ErrorCode.VALIDATION_ERROR
    }));
    
    return {
      success: false,
      errors
    };
  }
  
  // Perform additional business rule validations
  const validationResults: ValidationResult[] = [];
  
  // Validate required fields
  validationResults.push(validateRequiredFields(request, [
    'transactionId', 'amount', 'reason', 'refundMethod'
  ]));
  
  // Validate that transactionId is a valid ID format
  if (request.transactionId && !isValidId(request.transactionId)) {
    validationResults.push({
      success: false,
      errors: [{
        field: 'transactionId',
        message: 'Transaction ID must be a valid format',
        code: ErrorCode.INVALID_FORMAT
      }]
    });
  }
  
  // Validate that refund amount is positive and properly formatted
  if (request.amount !== undefined) {
    // We don't have transaction amount here, so we validate that it's a valid currency amount
    // The actual comparison with transaction amount will happen in the service
    const amountValidation = validateRefundAmount(request.amount, Number.MAX_VALUE);
    validationResults.push(amountValidation);
  }
  
  // Validate that reasonCode is a string and not empty if provided
  if (request.reasonCode !== undefined) {
    if (typeof request.reasonCode !== 'string' || request.reasonCode.trim() === '') {
      validationResults.push({
        success: false,
        errors: [{
          field: 'reasonCode',
          message: 'Reason code must be a non-empty string',
          code: ErrorCode.INVALID_FORMAT
        }]
      });
    }
  }
  
  // If refund method is OTHER, validate that bankAccountId is provided and is a valid ID
  if (request.refundMethod === RefundMethod.OTHER) {
    if (!request.bankAccountId) {
      validationResults.push({
        success: false,
        errors: [{
          field: 'bankAccountId',
          message: 'Bank account ID is required when refund method is OTHER',
          code: ErrorCode.REQUIRED_FIELD_MISSING
        }]
      });
    } else if (!isValidId(request.bankAccountId)) {
      validationResults.push({
        success: false,
        errors: [{
          field: 'bankAccountId',
          message: 'Bank account ID must be a valid format',
          code: ErrorCode.INVALID_FORMAT
        }]
      });
    }
  }
  
  // Combine all validation results
  const result = combineValidationResults(validationResults);
  
  logger.debug('Create refund validation result', { 
    success: result.success, 
    errorCount: result.errors.length 
  });
  
  return result;
}

/**
 * Validates a request to update an existing refund
 * 
 * @param request - The update request to validate
 * @param existingRefund - The existing refund that will be updated
 * @returns Validation result containing any errors or null if valid
 */
export function validateUpdateRefundRequest(request: any, existingRefund: any): ValidationResult {
  logger.debug('Validating update refund request', { 
    request, 
    refundId: existingRefund.refundId || existingRefund.id 
  });
  
  // Validate with Joi schema first
  const joiResult = updateRefundSchema.validate(request, { abortEarly: false });
  
  if (joiResult.error) {
    // Convert Joi errors to our validation error format
    const errors = joiResult.error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      code: ErrorCode.VALIDATION_ERROR
    }));
    
    return {
      success: false,
      errors
    };
  }
  
  const validationResults: ValidationResult[] = [];
  
  // Check that the refund status allows updates
  if (!['DRAFT', 'SUBMITTED'].includes(existingRefund.status)) {
    validationResults.push({
      success: false,
      errors: [{
        field: 'status',
        message: `Refund cannot be updated in ${existingRefund.status} status`,
        code: ErrorCode.INVALID_STATE
      }]
    });
  }
  
  // Validate refund method if it's being updated
  if (request.refundMethod) {
    validationResults.push(validateEnum(
      request.refundMethod, 
      'refundMethod', 
      Object.values(RefundMethod)
    ));
    
    // If method is being updated to OTHER, ensure bankAccountId is provided
    if (request.refundMethod === RefundMethod.OTHER) {
      const bankAccountId = request.bankAccountId || existingRefund.bankAccountId;
      
      if (!bankAccountId) {
        validationResults.push({
          success: false,
          errors: [{
            field: 'bankAccountId',
            message: 'Bank account ID is required when refund method is OTHER',
            code: ErrorCode.REQUIRED_FIELD_MISSING
          }]
        });
      } else if (request.bankAccountId && !isValidId(request.bankAccountId)) {
        validationResults.push({
          success: false,
          errors: [{
            field: 'bankAccountId',
            message: 'Bank account ID must be a valid format',
            code: ErrorCode.INVALID_FORMAT
          }]
        });
      }
    }
  }
  
  // Combine all validation results
  const result = combineValidationResults(validationResults);
  
  logger.debug('Update refund validation result', { 
    success: result.success, 
    errorCount: result.errors.length 
  });
  
  return result;
}

/**
 * Validates a request to cancel a refund
 * 
 * @param request - The cancellation request to validate
 * @param existingRefund - The existing refund that will be canceled
 * @returns Validation result containing any errors or null if valid
 */
export function validateCancelRefundRequest(request: any, existingRefund: any): ValidationResult {
  logger.debug('Validating cancel refund request', { 
    request, 
    refundId: existingRefund.refundId || existingRefund.id 
  });
  
  // Validate with Joi schema first
  const joiResult = cancelRefundSchema.validate(request, { abortEarly: false });
  
  if (joiResult.error) {
    // Convert Joi errors to our validation error format
    const errors = joiResult.error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      code: ErrorCode.VALIDATION_ERROR
    }));
    
    return {
      success: false,
      errors
    };
  }
  
  // Check that the refund status allows cancellation
  const nonCancellableStatuses = ['COMPLETED', 'FAILED', 'CANCELED'];
  if (nonCancellableStatuses.includes(existingRefund.status)) {
    return {
      success: false,
      errors: [{
        field: 'status',
        message: `Refund cannot be canceled in ${existingRefund.status} status`,
        code: ErrorCode.INVALID_STATE
      }]
    };
  }
  
  return { success: true, errors: [] };
}

/**
 * Validates if the selected refund method is applicable for the given transaction
 * 
 * @param refundMethod - The refund method to validate
 * @param transaction - The transaction the refund is for
 * @param merchantSettings - Merchant configuration settings
 * @returns Validation result containing method-specific validation errors or success
 */
export function validateRefundMethodForTransaction(
  refundMethod: string, 
  transaction: any,
  merchantSettings: any
): ValidationResult {
  logger.debug('Validating refund method for transaction', { 
    refundMethod, 
    transactionId: transaction.transactionId || transaction.id 
  });
  
  // Validate refund method is a valid enum value
  const methodResult = validateEnum(
    refundMethod, 
    'refundMethod', 
    Object.values(RefundMethod)
  );
  
  if (!methodResult.success) {
    return methodResult;
  }
  
  const errors = [];
  
  // Validate based on the refund method
  switch (refundMethod) {
    case RefundMethod.ORIGINAL_PAYMENT:
      // Check if transaction status allows original payment refund
      if (transaction.status !== 'COMPLETED') {
        errors.push({
          field: 'refundMethod',
          message: 'Original payment refund is only available for completed transactions',
          code: ErrorCode.METHOD_NOT_ALLOWED
        });
      }
      
      // Check if transaction is still within refund time limit
      const transactionDate = new Date(transaction.processedAt);
      const currentDate = new Date();
      const daysDifference = Math.floor((currentDate.getTime() - transactionDate.getTime()) / (1000 * 3600 * 24));
      
      const refundTimeLimit = merchantSettings?.refundTimeLimit || 90; // Default to 90 days if not specified
      
      if (daysDifference > refundTimeLimit) {
        errors.push({
          field: 'refundMethod',
          message: `Original payment refund is only available within ${refundTimeLimit} days of transaction`,
          code: ErrorCode.REFUND_TIME_LIMIT_EXCEEDED
        });
      }
      
      // Check if payment method supports refunds
      if (transaction.paymentMethodDetails?.supportsRefunds === false) {
        errors.push({
          field: 'refundMethod',
          message: 'The original payment method does not support refunds',
          code: ErrorCode.METHOD_NOT_ALLOWED
        });
      }
      break;
      
    case RefundMethod.BALANCE:
      // Check if merchant has sufficient balance
      if (merchantSettings.balanceAmount < transaction.amount) {
        errors.push({
          field: 'refundMethod',
          message: 'Insufficient balance for refund',
          code: ErrorCode.INSUFFICIENT_BALANCE
        });
      }
      break;
      
    case RefundMethod.OTHER:
      // Check if merchant has at least one verified bank account
      if (!merchantSettings.hasVerifiedBankAccount) {
        errors.push({
          field: 'refundMethod',
          message: 'Merchant has no verified bank account for OTHER refund method',
          code: ErrorCode.METHOD_NOT_ALLOWED
        });
      }
      break;
  }
  
  const result = {
    success: errors.length === 0,
    errors
  };
  
  logger.debug('Refund method validation result', { 
    success: result.success, 
    errorCount: result.errors.length 
  });
  
  return result;
}