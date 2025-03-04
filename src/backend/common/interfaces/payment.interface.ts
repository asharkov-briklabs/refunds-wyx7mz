import { GatewayType } from '../enums/gateway-type.enum';
import { RefundMethod } from '../enums/refund-method.enum';

/**
 * Enum defining supported payment method types for transactions.
 * Used to identify and categorize different payment methods across the system.
 */
export enum PaymentMethodType {
  /**
   * Credit card payment method (Visa, Mastercard, etc.)
   */
  CREDIT_CARD = 'CREDIT_CARD',
  
  /**
   * Debit card payment method
   */
  DEBIT_CARD = 'DEBIT_CARD',
  
  /**
   * ACH (Automated Clearing House) bank transfer
   */
  ACH = 'ACH',
  
  /**
   * Digital wallets (Apple Pay, Google Pay, etc.)
   */
  WALLET = 'WALLET',
  
  /**
   * Merchant balance account
   */
  BALANCE = 'BALANCE',
  
  /**
   * Other payment methods not categorized above
   */
  OTHER = 'OTHER'
}

/**
 * Enum defining possible payment transaction statuses.
 * Used to track the current state of payment transactions.
 */
export enum PaymentStatus {
  /**
   * Transaction is being processed but not yet completed
   */
  PENDING = 'PENDING',
  
  /**
   * Transaction has been successfully completed
   */
  COMPLETED = 'COMPLETED',
  
  /**
   * Transaction processing has failed
   */
  FAILED = 'FAILED',
  
  /**
   * Transaction has been fully refunded
   */
  REFUNDED = 'REFUNDED',
  
  /**
   * Transaction has been partially refunded
   */
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED'
}

/**
 * Interface representing payment method details used in transactions.
 * Contains information about the payment method including type, gateway details,
 * and relevant metadata needed for refund operations.
 */
export interface PaymentMethod {
  /**
   * Type of payment method (e.g., CREDIT_CARD, WALLET)
   */
  type: PaymentMethodType;
  
  /**
   * The payment gateway associated with this payment method
   */
  gatewayType: GatewayType;
  
  /**
   * Unique identifier for this payment method in the payment gateway
   */
  gatewayPaymentMethodId: string;
  
  /**
   * Last four digits of the payment instrument (e.g., credit card)
   * Null for payment methods that don't have this concept
   */
  lastFour: string | null;
  
  /**
   * Expiration date for the payment method, if applicable
   * Format: YYYY-MM
   */
  expiryDate: string | null;
  
  /**
   * Card network for card payments (e.g., Visa, Mastercard)
   * Null for non-card payment methods
   */
  network: string | null;
  
  /**
   * Indicates if this payment method can be used for refunds
   * Some payment methods may be expired or have other restrictions
   */
  validForRefund: boolean;
  
  /**
   * Additional metadata specific to the payment method
   * May include gateway-specific details or custom attributes
   */
  metadata: Record<string, unknown>;
}

/**
 * Interface representing a payment transaction that can be refunded.
 * Contains all necessary details about a transaction needed for processing refunds.
 */
export interface Transaction {
  /**
   * Unique identifier for the transaction
   */
  transactionId: string;
  
  /**
   * Identifier of the merchant who processed the transaction
   */
  merchantId: string;
  
  /**
   * Identifier of the customer who made the purchase, if available
   */
  customerId: string | null;
  
  /**
   * Transaction amount in smallest currency unit (e.g., cents)
   */
  amount: number;
  
  /**
   * Currency code in ISO 4217 format (e.g., 'USD')
   */
  currency: string;
  
  /**
   * Current status of the transaction
   */
  status: PaymentStatus;
  
  /**
   * Payment method used for this transaction
   */
  paymentMethod: PaymentMethod;
  
  /**
   * Transaction identifier in the payment gateway
   */
  gatewayTransactionId: string;
  
  /**
   * Date when the transaction was processed
   */
  processedAt: Date;
  
  /**
   * Total amount refunded so far
   */
  refundedAmount: number;
  
  /**
   * Amount available for refund
   * Typically original amount minus refunded amount, but may have additional restrictions
   */
  refundableAmount: number;
  
  /**
   * Date after which the transaction can no longer be refunded through original payment method
   * Null if there is no expiration
   */
  refundExpiryDate: Date | null;
  
  /**
   * Additional metadata associated with the transaction
   */
  metadata: Record<string, unknown>;
}

/**
 * Interface representing a standardized refund request to payment gateways.
 * Provides a common structure for refund requests across different gateways.
 */
export interface GatewayRefundRequest {
  /**
   * Identifier of the merchant who is issuing the refund
   */
  merchantId: string;
  
  /**
   * Original transaction identifier in our system
   */
  transactionId: string;
  
  /**
   * Unique identifier for the refund request
   */
  refundId: string;
  
  /**
   * Type of payment gateway to process the refund
   */
  gatewayType: GatewayType;
  
  /**
   * Original transaction identifier in the payment gateway
   */
  gatewayTransactionId: string;
  
  /**
   * Amount to refund in smallest currency unit (e.g., cents)
   */
  amount: number;
  
  /**
   * Currency code in ISO 4217 format (e.g., 'USD')
   */
  currency: string;
  
  /**
   * Reason for the refund
   */
  reason: string;
  
  /**
   * Additional metadata for the refund request
   */
  metadata: Record<string, unknown>;
}

/**
 * Interface representing a standardized response from payment gateways after refund processing.
 * Normalizes responses from different gateways into a common format.
 */
export interface GatewayRefundResponse {
  /**
   * Indicates if the refund was successfully processed
   */
  success: boolean;
  
  /**
   * Refund identifier assigned by the payment gateway
   * Null if the refund failed or wasn't assigned an ID
   */
  gatewayRefundId: string | null;
  
  /**
   * Current status of the refund in the gateway
   */
  status: string;
  
  /**
   * Actual amount processed for the refund
   * May differ from requested amount in some cases
   */
  processedAmount: number | null;
  
  /**
   * Date when the refund was processed by the gateway
   */
  processingDate: Date | null;
  
  /**
   * Estimated date when the refund will settle to the customer
   */
  estimatedSettlementDate: Date | null;
  
  /**
   * Error code if the refund failed
   */
  errorCode: string | null;
  
  /**
   * Error message if the refund failed
   */
  errorMessage: string | null;
  
  /**
   * Original response code from the gateway
   */
  gatewayResponseCode: string | null;
  
  /**
   * Indicates if a failed refund can be retried
   */
  retryable: boolean;
  
  /**
   * Original raw response from the gateway
   */
  rawResponse: Record<string, unknown>;
}

/**
 * Interface representing credentials needed to interact with payment gateways.
 * Contains sensitive authentication information for gateway API calls.
 */
export interface GatewayCredentials {
  /**
   * API key for the payment gateway
   */
  apiKey: string | null;
  
  /**
   * API secret for the payment gateway
   */
  apiSecret: string | null;
  
  /**
   * Merchant account identifier in the payment gateway
   */
  merchantAccountId: string | null;
  
  /**
   * Secret used to validate webhook notifications from the gateway
   */
  webhookSecret: string | null;
  
  /**
   * Environment to use (e.g., 'sandbox', 'production')
   */
  environment: string;
  
  /**
   * Additional configuration options specific to the gateway
   */
  additionalConfig: Record<string, unknown>;
}

/**
 * Interface defining capabilities of a payment method for refund operations.
 * Used to determine what refund operations are supported for each payment method.
 */
export interface PaymentMethodCapabilities {
  /**
   * Indicates if the payment method supports partial refunds
   */
  supportsPartialRefunds: boolean;
  
  /**
   * Indicates if the payment method supports refunds after a delay
   */
  supportsDelayedRefunds: boolean;
  
  /**
   * Maximum time limit in days for refunds, null if no limit
   */
  refundTimeLimit: number | null;
  
  /**
   * Indicates if refunds require approval
   */
  requiresApproval: boolean;
  
  /**
   * Indicates if refunds require supporting documentation
   */
  requiresDocumentation: boolean;
  
  /**
   * List of restrictions or limitations for refunds
   */
  restrictions: string[];
}