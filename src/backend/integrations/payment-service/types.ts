import { Transaction, PaymentMethod } from '../../common/interfaces/payment.interface';
import { RefundMethod } from '../../common/enums/refund-method.enum';

/**
 * Parameters for fetching transaction details from the Payment Service.
 */
export interface GetTransactionParams {
  /**
   * Unique identifier of the transaction to retrieve
   */
  transactionId: string;
  
  /**
   * Identifier of the merchant who processed the transaction
   */
  merchantId: string;
}

/**
 * Parameters for validating a transaction's eligibility for refund.
 */
export interface ValidateTransactionParams {
  /**
   * Unique identifier of the transaction to validate
   */
  transactionId: string;
  
  /**
   * Identifier of the merchant who processed the transaction
   */
  merchantId: string;
  
  /**
   * Refund amount in smallest currency unit (e.g., cents)
   */
  amount: number;
  
  /**
   * Currency code in ISO 4217 format (e.g., 'USD')
   */
  currency: string;
  
  /**
   * Method to use for the refund
   */
  refundMethod: RefundMethod;
}

/**
 * Result of transaction validation containing validity status and any error details.
 */
export interface TransactionValidationResult {
  /**
   * Indicates if the transaction is valid for refund
   */
  valid: boolean;
  
  /**
   * Transaction details if valid, null otherwise
   */
  transaction: Transaction | null;
  
  /**
   * List of validation errors if invalid
   */
  errors: ValidationError[];
}

/**
 * Structure for validation errors returned by the Payment Service.
 */
export interface ValidationError {
  /**
   * Error code identifying the type of validation error
   */
  code: string;
  
  /**
   * Human-readable error message
   */
  message: string;
  
  /**
   * Field that caused the validation error, if applicable
   */
  field: string | null;
}

/**
 * Parameters for updating transaction status after refund processing.
 */
export interface UpdateTransactionStatusParams {
  /**
   * Unique identifier of the transaction to update
   */
  transactionId: string;
  
  /**
   * Identifier of the merchant who processed the transaction
   */
  merchantId: string;
  
  /**
   * New status to set for the transaction
   */
  status: string;
  
  /**
   * Identifier of the refund operation
   */
  refundId: string;
  
  /**
   * Amount that was refunded
   */
  refundAmount: number;
  
  /**
   * Additional metadata to store with the transaction
   */
  metadata: Record<string, unknown>;
}

/**
 * Parameters for checking if a transaction can be refunded with a specific method and amount.
 */
export interface IsRefundableParams {
  /**
   * Unique identifier of the transaction to check
   */
  transactionId: string;
  
  /**
   * Identifier of the merchant who processed the transaction
   */
  merchantId: string;
  
  /**
   * Refund amount to check
   */
  amount: number;
  
  /**
   * Refund method to check
   */
  refundMethod: RefundMethod;
}

/**
 * Result of refundability check with allowed methods, amounts, and any restrictions.
 */
export interface RefundabilityResult {
  /**
   * Indicates if the transaction can be refunded with the specified parameters
   */
  refundable: boolean;
  
  /**
   * List of refund methods allowed for this transaction
   */
  allowedMethods: RefundMethod[];
  
  /**
   * Maximum amount that can be refunded
   */
  maxRefundableAmount: number;
  
  /**
   * List of any restrictions that apply to the refund
   */
  restrictions: string[];
  
  /**
   * Date after which the transaction can no longer be refunded, if applicable
   */
  expirationDate: Date | null;
  
  /**
   * List of validation errors if not refundable
   */
  errors: ValidationError[];
}

/**
 * Parameters for retrieving payment method details for a transaction.
 */
export interface GetPaymentMethodParams {
  /**
   * Unique identifier of the transaction
   */
  transactionId: string;
  
  /**
   * Identifier of the merchant who processed the transaction
   */
  merchantId: string;
}