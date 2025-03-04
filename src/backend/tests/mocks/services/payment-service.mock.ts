import {
  PaymentServiceClientImpl,
  Transaction,
  PaymentMethod,
  PaymentStatus,
  PaymentMethodType,
  GetTransactionParams,
  ValidateTransactionParams,
  TransactionValidationResult,
  ValidationError,
  UpdateTransactionStatusParams,
  IsRefundableParams,
  RefundabilityResult,
  GetPaymentMethodParams,
  GatewayType,
  RefundMethod,
  GatewayError,
} from '../../../integrations/payment-service/client';
import { jest } from 'jest'; // jest@^29.5.0

/**
 * Factory function to create a configured instance of the mock Payment Service client
 * @returns {MockPaymentServiceClient} An initialized mock payment service client
 */
export function createMockPaymentServiceClient(): MockPaymentServiceClient {
  // Create a new instance of MockPaymentServiceClient
  const mockClient = new MockPaymentServiceClient();
  // Return the instance for use in tests
  return mockClient;
}

/**
 * Mock implementation of the Payment Service client for testing purposes
 */
export class MockPaymentServiceClient extends PaymentServiceClientImpl {
  transactions: Map<string, Transaction>;
  paymentMethods: Map<string, PaymentMethod>;

  getTransactionMock: jest.Mock;
  validateTransactionMock: jest.Mock;
  updateTransactionStatusMock: jest.Mock;
  isRefundableMock: jest.Mock;
  getPaymentMethodMock: jest.Mock;

  constructor() {
    super({} as any); // Mock config, not used in the mock implementation

    // Initialize transactions map with predefined test data
    this.transactions = new Map<string, Transaction>();

    // Initialize paymentMethods map with predefined test data
    this.paymentMethods = new Map<string, PaymentMethod>();

    // Set up jest mock functions for each service method
    this.getTransactionMock = jest.fn();
    this.validateTransactionMock = jest.fn();
    this.updateTransactionStatusMock = jest.fn();
    this.isRefundableMock = jest.fn();
    this.getPaymentMethodMock = jest.fn();

    // Configure default implementations for each mock method
    this.getTransactionMock.mockImplementation(async (params: GetTransactionParams) => {
      // Call the mock implementation which returns preconfigured transaction data
      return this.transactions.get(params.transactionId) || null;
    });

    this.validateTransactionMock.mockImplementation(async (params: ValidateTransactionParams) => {
      // Call the mock implementation to get validation result
      const transaction = this.transactions.get(params.transactionId); // Get transaction for provided transactionId

      if (!transaction) {
        return { valid: false, transaction: null, errors: [{ code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found', field: null }] };
      }

      let errors: ValidationError[] = [];

      if (params.amount > transaction.amount) {
        // Check if amount is valid for the transaction
        errors.push({ code: 'INVALID_AMOUNT', message: 'Amount exceeds transaction amount', field: 'amount' });
      }

      if (transaction.paymentMethod.type === PaymentMethodType.ACH && params.refundMethod === RefundMethod.ORIGINAL_PAYMENT) {
        // Check if refund method is supported
        errors.push({ code: 'METHOD_NOT_ALLOWED', message: 'Original payment method not allowed for ACH transactions', field: 'refundMethod' });
      }

      // Return validation result with any errors found
      return { valid: errors.length === 0, transaction, errors };
    });

    this.updateTransactionStatusMock.mockImplementation(async (params: UpdateTransactionStatusParams) => {
      // Call the mock implementation
      const transaction = this.transactions.get(params.transactionId); // Get transaction for provided transactionId

      if (transaction) {
        transaction.status = params.status as PaymentStatus; // Update transaction status based on parameters
        transaction.refundedAmount = params.refundAmount; // Update refunded amount if applicable
        this.transactions.set(params.transactionId, transaction); // Store updated transaction in transactions map
      }
    });

    this.isRefundableMock.mockImplementation(async (params: IsRefundableParams) => {
      // Call the mock implementation
      const transaction = this.transactions.get(params.transactionId); // Get transaction for provided transactionId

      if (!transaction) {
        return { refundable: false, allowedMethods: [], maxRefundableAmount: 0, restrictions: [], expirationDate: null, errors: [{ code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found', field: null }] };
      }

      if (transaction.status !== PaymentStatus.COMPLETED) {
        // Check if transaction exists and is in valid state
        return { refundable: false, allowedMethods: [], maxRefundableAmount: 0, restrictions: [], expirationDate: null, errors: [{ code: 'INVALID_STATE', message: 'Transaction is not in a completed state', field: 'status' }] };
      }

      if (params.amount > transaction.refundableAmount) {
        // Check if amount is within refundable amount
        return { refundable: false, allowedMethods: [], maxRefundableAmount: 0, restrictions: [], expirationDate: null, errors: [{ code: 'INVALID_AMOUNT', message: 'Amount exceeds refundable amount', field: 'amount' }] };
      }

      const allowedMethods: RefundMethod[] = [RefundMethod.ORIGINAL_PAYMENT, RefundMethod.BALANCE, RefundMethod.OTHER]; // Determine allowed refund methods based on transaction details

      // Return result with refundability status, allowed methods, and restrictions
      return { refundable: true, allowedMethods, maxRefundableAmount: transaction.refundableAmount, restrictions: [], expirationDate: null, errors: [] };
    });

    this.getPaymentMethodMock.mockImplementation(async (params: GetPaymentMethodParams) => {
      // Call the mock implementation
      const transaction = this.transactions.get(params.transactionId); // Get transaction for provided transactionId

      if (!transaction) {
        return null; // Return the payment method from the transaction or null if not found
      }

      return transaction.paymentMethod;
    });
  }

  _createMockTransaction(
    transactionId: string,
    merchantId: string,
    status: PaymentStatus,
    amount: number,
    paymentMethodType: PaymentMethodType,
    gatewayType: GatewayType,
    refundedAmount: number = 0
  ): Transaction {
    // Create a payment method with the provided type and gateway
    const paymentMethod: PaymentMethod = {
      type: paymentMethodType,
      gatewayType: gatewayType,
      gatewayPaymentMethodId: `payment-method-${transactionId}`,
      lastFour: '4242',
      expiryDate: '2024-12',
      network: 'Visa',
      validForRefund: true,
      metadata: {},
    };

    this.paymentMethods.set(paymentMethod.gatewayPaymentMethodId, paymentMethod);

    // Create a transaction with the provided parameters
    const transaction: Transaction = {
      transactionId: transactionId,
      merchantId: merchantId,
      customerId: 'customer123',
      amount: amount,
      currency: 'USD',
      status: status,
      paymentMethod: paymentMethod,
      gatewayTransactionId: `gateway-transaction-${transactionId}`,
      processedAt: new Date(),
      refundedAmount: refundedAmount,
      refundableAmount: amount - refundedAmount,
      refundExpiryDate: null,
      metadata: {},
    };

    // Set refundable amount based on original amount minus refunded amount
    transaction.refundableAmount = amount - refundedAmount;

    // Return the configured mock transaction
    return transaction;
  }

  addMockTransaction(transaction: Transaction): void {
    // Add the provided transaction to the transactions map
    this.transactions.set(transaction.transactionId, transaction);
    // Store the transaction's payment method in the paymentMethods map
    this.paymentMethods.set(transaction.paymentMethod.gatewayPaymentMethodId, transaction.paymentMethod);
  }

  resetMocks(): void {
    // Clear all recorded calls on each mock function
    this.getTransactionMock.mockClear();
    this.validateTransactionMock.mockClear();
    this.updateTransactionStatusMock.mockClear();
    this.isRefundableMock.mockClear();
    this.getPaymentMethodMock.mockClear();

    // Restore default mock implementations
    this.getTransactionMock.mockImplementation(async (params: GetTransactionParams) => {
      return this.transactions.get(params.transactionId) || null;
    });

    this.validateTransactionMock.mockImplementation(async (params: ValidateTransactionParams) => {
      const transaction = this.transactions.get(params.transactionId);
      if (!transaction) {
        return { valid: false, transaction: null, errors: [{ code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found', field: null }] };
      }

      let errors: ValidationError[] = [];

      if (params.amount > transaction.amount) {
        errors.push({ code: 'INVALID_AMOUNT', message: 'Amount exceeds transaction amount', field: 'amount' });
      }

      if (transaction.paymentMethod.type === PaymentMethodType.ACH && params.refundMethod === RefundMethod.ORIGINAL_PAYMENT) {
        errors.push({ code: 'METHOD_NOT_ALLOWED', message: 'Original payment method not allowed for ACH transactions', field: 'refundMethod' });
      }

      return { valid: errors.length === 0, transaction, errors };
    });

    this.updateTransactionStatusMock.mockImplementation(async (params: UpdateTransactionStatusParams) => {
      const transaction = this.transactions.get(params.transactionId);
      if (transaction) {
        transaction.status = params.status as PaymentStatus;
        transaction.refundedAmount = params.refundAmount;
        this.transactions.set(params.transactionId, transaction);
      }
    });

    this.isRefundableMock.mockImplementation(async (params: IsRefundableParams) => {
      const transaction = this.transactions.get(params.transactionId);

      if (!transaction) {
        return { refundable: false, allowedMethods: [], maxRefundableAmount: 0, restrictions: [], expirationDate: null, errors: [{ code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found', field: null }] };
      }

      if (transaction.status !== PaymentStatus.COMPLETED) {
        return { refundable: false, allowedMethods: [], maxRefundableAmount: 0, restrictions: [], expirationDate: null, errors: [{ code: 'INVALID_STATE', message: 'Transaction is not in a completed state', field: 'status' }] };
      }

      if (params.amount > transaction.refundableAmount) {
        return { refundable: false, allowedMethods: [], maxRefundableAmount: 0, restrictions: [], expirationDate: null, errors: [{ code: 'INVALID_AMOUNT', message: 'Amount exceeds refundable amount', field: 'amount' }] };
      }

      const allowedMethods: RefundMethod[] = [RefundMethod.ORIGINAL_PAYMENT, RefundMethod.BALANCE, RefundMethod.OTHER];

      return { refundable: true, allowedMethods, maxRefundableAmount: transaction.refundableAmount, restrictions: [], expirationDate: null, errors: [] };
    });

    this.getPaymentMethodMock.mockImplementation(async (params: GetPaymentMethodParams) => {
      const transaction = this.transactions.get(params.transactionId);

      if (!transaction) {
        return null;
      }

      return transaction.paymentMethod;
    });

    // Reset transactions and paymentMethods maps to initial test data
    this.transactions = new Map<string, Transaction>();
    this.paymentMethods = new Map<string, PaymentMethod>();
  }
}

export const mockTransactions = {
  validTransaction: {
    transactionId: 'txn_valid',
    merchantId: 'mer_valid',
    customerId: 'cus_valid',
    amount: 100,
    currency: 'USD',
    status: PaymentStatus.COMPLETED,
    paymentMethod: {
      type: PaymentMethodType.CREDIT_CARD,
      gatewayType: GatewayType.STRIPE,
      gatewayPaymentMethodId: 'pm_valid',
      lastFour: '4242',
      expiryDate: '12/24',
      network: 'Visa',
      validForRefund: true,
      metadata: {},
    },
    gatewayTransactionId: 'gt_valid',
    processedAt: new Date(),
    refundedAmount: 0,
    refundableAmount: 100,
    refundExpiryDate: null,
    metadata: {},
  },
  refundedTransaction: {
    transactionId: 'txn_refunded',
    merchantId: 'mer_refunded',
    customerId: 'cus_refunded',
    amount: 100,
    currency: 'USD',
    status: PaymentStatus.REFUNDED,
    paymentMethod: {
      type: PaymentMethodType.CREDIT_CARD,
      gatewayType: GatewayType.STRIPE,
      gatewayPaymentMethodId: 'pm_refunded',
      lastFour: '4242',
      expiryDate: '12/24',
      network: 'Visa',
      validForRefund: true,
      metadata: {},
    },
    gatewayTransactionId: 'gt_refunded',
    processedAt: new Date(),
    refundedAmount: 100,
    refundableAmount: 0,
    refundExpiryDate: null,
    metadata: {},
  },
  partiallyRefundedTransaction: {
    transactionId: 'txn_partially_refunded',
    merchantId: 'mer_partially_refunded',
    customerId: 'cus_partially_refunded',
    amount: 100,
    currency: 'USD',
    status: PaymentStatus.PARTIALLY_REFUNDED,
    paymentMethod: {
      type: PaymentMethodType.CREDIT_CARD,
      gatewayType: GatewayType.STRIPE,
      gatewayPaymentMethodId: 'pm_partially_refunded',
      lastFour: '4242',
      expiryDate: '12/24',
      network: 'Visa',
      validForRefund: true,
      metadata: {},
    },
    gatewayTransactionId: 'gt_partially_refunded',
    processedAt: new Date(),
    refundedAmount: 50,
    refundableAmount: 50,
    refundExpiryDate: null,
    metadata: {},
  },
  highValueTransaction: {
    transactionId: 'txn_high_value',
    merchantId: 'mer_high_value',
    customerId: 'cus_high_value',
    amount: 10000,
    currency: 'USD',
    status: PaymentStatus.COMPLETED,
    paymentMethod: {
      type: PaymentMethodType.CREDIT_CARD,
      gatewayType: GatewayType.STRIPE,
      gatewayPaymentMethodId: 'pm_high_value',
      lastFour: '4242',
      expiryDate: '12/24',
      network: 'Visa',
      validForRefund: true,
      metadata: {},
    },
    gatewayTransactionId: 'gt_high_value',
    processedAt: new Date(),
    refundedAmount: 0,
    refundableAmount: 10000,
    refundExpiryDate: null,
    metadata: {},
  },
  achTransaction: {
    transactionId: 'txn_ach',
    merchantId: 'mer_ach',
    customerId: 'cus_ach',
    amount: 100,
    currency: 'USD',
    status: PaymentStatus.COMPLETED,
    paymentMethod: {
      type: PaymentMethodType.ACH,
      gatewayType: GatewayType.FISERV,
      gatewayPaymentMethodId: 'pm_ach',
      lastFour: null,
      expiryDate: null,
      network: null,
      validForRefund: true,
      metadata: {},
    },
    gatewayTransactionId: 'gt_ach',
    processedAt: new Date(),
    refundedAmount: 0,
    refundableAmount: 100,
    refundExpiryDate: null,
    metadata: {},
  },
  expiredForRefundTransaction: {
    transactionId: 'txn_expired',
    merchantId: 'mer_expired',
    customerId: 'cus_expired',
    amount: 100,
    currency: 'USD',
    status: PaymentStatus.COMPLETED,
    paymentMethod: {
      type: PaymentMethodType.CREDIT_CARD,
      gatewayType: GatewayType.STRIPE,
      gatewayPaymentMethodId: 'pm_expired',
      lastFour: '4242',
      expiryDate: '12/24',
      network: 'Visa',
      validForRefund: false,
      metadata: {},
    },
    gatewayTransactionId: 'gt_expired',
    processedAt: new Date(),
    refundedAmount: 0,
    refundableAmount: 100,
    refundExpiryDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
    metadata: {},
  },
};