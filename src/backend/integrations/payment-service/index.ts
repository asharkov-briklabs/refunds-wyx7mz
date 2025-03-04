import { Transaction, PaymentMethod } from '../../common/interfaces/payment.interface';
import { RefundMethod } from '../../common/enums/refund-method.enum';
import * as types from './types';
import { PaymentServiceClientImpl, createPaymentServiceClient, default as paymentServiceClientDefault } from './client';

/**
 * Re-export parameters interface for transaction retrieval
 */
export interface GetTransactionParams extends types.GetTransactionParams {}

/**
 * Re-export parameters interface for transaction validation
 */
export interface ValidateTransactionParams extends types.ValidateTransactionParams {}

/**
 * Re-export interface for transaction validation results
 */
export interface TransactionValidationResult extends types.TransactionValidationResult {}

/**
 * Re-export interface for validation errors
 */
export interface ValidationError extends types.ValidationError {}

/**
 * Re-export parameters interface for updating transaction status
 */
export interface UpdateTransactionStatusParams extends types.UpdateTransactionStatusParams {}

/**
 * Re-export parameters interface for refund eligibility check
 */
export interface IsRefundableParams extends types.IsRefundableParams {}

/**
 * Re-export interface for refund eligibility results
 */
export interface RefundabilityResult extends types.RefundabilityResult {}

/**
 * Re-export parameters interface for payment method retrieval
 */
export interface GetPaymentMethodParams extends types.GetPaymentMethodParams {}

/**
 * Re-export the Payment Service client implementation class
 */
export { PaymentServiceClientImpl };

/**
 * Re-export factory function for creating client instances
 */
export { createPaymentServiceClient };

/**
 * Re-export default singleton client instance for simplified import
 */
export default {
  getTransaction: paymentServiceClientDefault.getTransaction,
  validateTransaction: paymentServiceClientDefault.validateTransaction,
  updateTransactionStatus: paymentServiceClientDefault.updateTransactionStatus,
  isRefundable: paymentServiceClientDefault.isRefundable,
  getPaymentMethod: paymentServiceClientDefault.getPaymentMethod
};