/**
 * Configuration options for connecting to the Balance Service API
 */
export interface BalanceServiceConfig {
  /**
   * Base URL of the Balance Service API
   */
  baseUrl: string;

  /**
   * API key for authentication with the Balance Service
   */
  apiKey: string;

  /**
   * Request timeout in milliseconds
   * @default 5000
   */
  timeout?: number;
}

/**
 * Enum defining balance operations (increase or decrease)
 */
export enum BalanceOperation {
  /**
   * Credit operation (increases merchant balance)
   */
  CREDIT = 'CREDIT',

  /**
   * Debit operation (decreases merchant balance)
   */
  DEBIT = 'DEBIT'
}

/**
 * Represents a merchant's balance information
 */
export interface MerchantBalance {
  /**
   * Unique identifier of the merchant
   */
  merchantId: string;

  /**
   * Available balance that can be used for transactions
   */
  availableBalance: number;

  /**
   * Currency code in ISO 4217 format
   */
  currency: string;

  /**
   * Pending balance (funds not yet settled)
   */
  pendingBalance: number;

  /**
   * Total balance (availableBalance + pendingBalance)
   */
  totalBalance: number;

  /**
   * Timestamp of when the balance was last updated
   */
  lastUpdated: string;
}

/**
 * Parameters for checking a merchant's balance
 */
export interface BalanceCheckRequest {
  /**
   * Unique identifier of the merchant
   */
  merchantId: string;

  /**
   * Currency code in ISO 4217 format
   * @optional If not provided, the merchant's default currency will be used
   */
  currency?: string;
}

/**
 * Parameters for updating a merchant's balance
 */
export interface BalanceUpdateRequest {
  /**
   * Unique identifier of the merchant
   */
  merchantId: string;

  /**
   * Amount to credit or debit from the balance
   */
  amount: number;

  /**
   * Currency code in ISO 4217 format
   */
  currency: string;

  /**
   * Type of operation to perform (CREDIT or DEBIT)
   */
  operation: BalanceOperation;

  /**
   * Reason for the balance update
   */
  reason: string;

  /**
   * External reference ID (e.g., refund ID)
   */
  referenceId: string;

  /**
   * Additional metadata for the balance update
   */
  metadata?: Record<string, any>;
}

/**
 * Response data from a balance update operation
 */
export interface BalanceUpdateResponse {
  /**
   * Unique identifier for the balance transaction
   */
  transactionId: string;

  /**
   * Unique identifier of the merchant
   */
  merchantId: string;

  /**
   * Amount credited or debited
   */
  amount: number;

  /**
   * Currency code in ISO 4217 format
   */
  currency: string;

  /**
   * Type of operation performed
   */
  operation: BalanceOperation;

  /**
   * Balance before the operation
   */
  previousBalance: number;

  /**
   * Balance after the operation
   */
  newBalance: number;

  /**
   * Status of the balance update
   */
  status: 'SUCCESS' | 'FAILED' | 'PENDING';

  /**
   * Timestamp when the operation was performed
   */
  timestamp: string;
}

/**
 * Structure for balance service error responses
 */
export interface BalanceServiceError {
  /**
   * Error code
   */
  code: string;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Additional error details
   */
  details?: Record<string, any>;
}