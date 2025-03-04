# src/backend/tests/unit/services/payment-method-handler.test.ts
```typescript
import { PaymentMethodHandlerService, paymentMethodHandlerService } from '../../../services/payment-method-handler/payment-method-handler.service';
import { paymentMethodRegistry, PaymentMethodRegistry, PaymentMethodHandler } from '../../../services/payment-method-handler/registry';
import CreditCardHandler from '../../../services/payment-method-handler/handlers/credit-card-handler';
import { RefundMethod } from '../../../common/enums/refund-method.enum';
import { RefundRequest, RefundResult } from '../../../common/interfaces/refund.interface';
import { Transaction } from '../../../common/interfaces/payment.interface';
import { BusinessError } from '../../../common/errors/business-error';
import { ErrorCode } from '../../../common/constants/error-codes';
import paymentServiceClient from '../../../integrations/payment-service/client';
import { mockRefundRequests, createRefundRequest } from '../../fixtures/refunds.fixture';
import { createMockPaymentServiceClient, mockTransactions } from '../../mocks/services/payment-service.mock';
import { jest } from '@jest/globals'; // jest version ^29.5.0

/**
 * Creates a mock payment method handler for testing
 * @param validateResult Boolean indicating the result of validateRefund
 * @param processResult RefundResult to return from processRefund
 * @param errorResult RefundResult to return from handleError
 * @returns Mock handler with configurable behavior
 */
const createMockHandler = (
  validateResult: boolean,
  processResult: RefundResult,
  errorResult: RefundResult
): PaymentMethodHandler => {
  const mockHandler: PaymentMethodHandler = {
    validateRefund: jest.fn().mockResolvedValue(validateResult),
    processRefund: jest.fn().mockResolvedValue(processResult),
    handleError: jest.fn().mockResolvedValue(errorResult),
    getMethodCapabilities: jest.fn().mockReturnValue({ supportsPartialRefunds: true }),
  };
  return mockHandler;
};

describe('PaymentMethodHandlerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with registry', () => {
    // Arrange
    const service = new PaymentMethodHandlerService();

    // Assert
    expect(service).toBeDefined();
  });

  it('should validate refund using appropriate handler based on refund method', async () => {
    // Arrange
    const mockHandler = createMockHandler(true, { success: true, gatewayReference: 'ref123' }, { success: false, error: { code: 'ERROR', message: 'Test error' } });
    paymentMethodRegistry.registerRefundMethodHandler(RefundMethod.ORIGINAL_PAYMENT, mockHandler);
    const refundRequest: RefundRequest = createRefundRequest({ refundMethod: RefundMethod.ORIGINAL_PAYMENT });
    const transaction: Transaction = mockTransactions.validTransaction;

    // Act
    await paymentMethodHandlerService.validateRefund(refundRequest, transaction);

    // Assert
    expect(mockHandler.validateRefund).toHaveBeenCalledWith(refundRequest, transaction);
  });

  it('should validate refund using appropriate handler based on transaction payment method if refund method not specified', async () => {
    // Arrange
    const mockHandler = createMockHandler(true, { success: true, gatewayReference: 'ref123' }, { success: false, error: { code: 'ERROR', message: 'Test error' } });
    paymentMethodRegistry.registerHandler('CREDIT_CARD', mockHandler, ['CREDIT_CARD']);
    const refundRequest: RefundRequest = createRefundRequest({ refundMethod: undefined });
    const transaction: Transaction = mockTransactions.validTransaction;

    // Act
    await paymentMethodHandlerService.validateRefund(refundRequest, transaction);

    // Assert
    expect(mockHandler.validateRefund).toHaveBeenCalledWith(refundRequest, transaction);
  });

  it('should throw error when validating refund with unsupported payment method', async () => {
    // Arrange
    const refundRequest: RefundRequest = createRefundRequest({ refundMethod: undefined });
    const transaction: Transaction = mockTransactions.validTransaction;
    jest.spyOn(paymentMethodRegistry, 'getHandler').mockReturnValue(null);

    // Act & Assert
    await expect(paymentMethodHandlerService.validateRefund(refundRequest, transaction))
      .rejects.toThrow(BusinessError);
  });

  it('should process refund using appropriate handler based on refund method', async () => {
    // Arrange
    const mockHandler = createMockHandler(true, { success: true, gatewayReference: 'ref123' }, { success: false, error: { code: 'ERROR', message: 'Test error' } });
    paymentMethodRegistry.registerRefundMethodHandler(RefundMethod.ORIGINAL_PAYMENT, mockHandler);
    const refundRequest: RefundRequest = createRefundRequest({ refundMethod: RefundMethod.ORIGINAL_PAYMENT });
    const transaction: Transaction = mockTransactions.validTransaction;

    // Act
    await paymentMethodHandlerService.processRefund(refundRequest, transaction);

    // Assert
    expect(mockHandler.processRefund).toHaveBeenCalledWith(refundRequest, transaction);
    expect(mockHandler.processRefund).toHaveBeenCalledTimes(1);
  });

  it('should process refund using appropriate handler based on transaction payment method if refund method not specified', async () => {
    // Arrange
    const mockHandler = createMockHandler(true, { success: true, gatewayReference: 'ref123' }, { success: false, error: { code: 'ERROR', message: 'Test error' } });
    paymentMethodRegistry.registerHandler('CREDIT_CARD', mockHandler, ['CREDIT_CARD']);
    const refundRequest: RefundRequest = createRefundRequest({ refundMethod: undefined });
    const transaction: Transaction = mockTransactions.validTransaction;

    // Act
    await paymentMethodHandlerService.processRefund(refundRequest, transaction);

    // Assert
    expect(mockHandler.processRefund).toHaveBeenCalledWith(refundRequest, transaction);
    expect(mockHandler.processRefund).toHaveBeenCalledTimes(1);
  });

  it('should throw error when processing refund with unsupported payment method', async () => {
    // Arrange
    const refundRequest: RefundRequest = createRefundRequest({ refundMethod: undefined });
    const transaction: Transaction = mockTransactions.validTransaction;
    jest.spyOn(paymentMethodRegistry, 'getHandler').mockReturnValue(null);

    // Act & Assert
    await expect(paymentMethodHandlerService.processRefund(refundRequest, transaction))
      .rejects.toThrow(BusinessError);
  });

  it('should handle error using appropriate handler based on refund method', async () => {
    // Arrange
    const mockHandler = createMockHandler(true, { success: true, gatewayReference: 'ref123' }, { success: false, error: { code: 'ERROR', message: 'Test error' } });
    paymentMethodRegistry.registerRefundMethodHandler(RefundMethod.ORIGINAL_PAYMENT, mockHandler);
    const refundRequest: RefundRequest = createRefundRequest({ refundMethod: RefundMethod.ORIGINAL_PAYMENT });
    const error = new Error('Test error');

    // Act
    await paymentMethodHandlerService.handleError(refundRequest, error);

    // Assert
    expect(mockHandler.handleError).toHaveBeenCalledWith(refundRequest, error);
  });

  it('should throw error when handling error with unsupported payment method', async () => {
    // Arrange
    const refundRequest: RefundRequest = createRefundRequest({ refundMethod: RefundMethod.ORIGINAL_PAYMENT });
    const error = new Error('Test error');
    jest.spyOn(paymentMethodRegistry, 'getHandlerForRefundMethod').mockReturnValue(null);

    // Act & Assert
    await expect(paymentMethodHandlerService.handleError(refundRequest, error))
      .rejects.toThrow(BusinessError);
  });

  it('should get transaction for refund from payment service', async () => {
    // Arrange
    const mockPaymentServiceClient = createMockPaymentServiceClient();
    const transactionId = 'txn123';
    const mockTransaction = mockTransactions.validTransaction;
    mockPaymentServiceClient.getTransactionMock.mockResolvedValue(mockTransaction);
    jest.spyOn(paymentServiceClient, 'getTransaction').mockImplementation(mockPaymentServiceClient.getTransactionMock);

    // Act
    const transaction = await paymentMethodHandlerService.getTransactionForRefund(transactionId);

    // Assert
    expect(paymentServiceClient.getTransaction).toHaveBeenCalledWith({ transactionId, merchantId: 'merchant123' });
    expect(transaction).toEqual(mockTransaction);
  });

  it('should throw error when transaction not found', async () => {
    // Arrange
    const mockPaymentServiceClient = createMockPaymentServiceClient();
    const transactionId = 'txn123';
    mockPaymentServiceClient.getTransactionMock.mockResolvedValue(null);
    jest.spyOn(paymentServiceClient, 'getTransaction').mockImplementation(mockPaymentServiceClient.getTransactionMock);

    // Act & Assert
    await expect(paymentMethodHandlerService.getTransactionForRefund(transactionId))
      .rejects.toThrow(BusinessError);
  });

  it('should get supported refund methods for a transaction', async () => {
    // Arrange
    const transaction: Transaction = mockTransactions.validTransaction;
    jest.spyOn(paymentMethodRegistry, 'hasHandler').mockReturnValue(true);
    jest.spyOn(paymentMethodRegistry, 'hasRefundMethodHandler').mockReturnValue(true);

    // Act
    const supportedMethods = await paymentMethodHandlerService.getSupportedRefundMethods(transaction);

    // Assert
    expect(supportedMethods).toEqual([RefundMethod.ORIGINAL_PAYMENT]);
  });

  it('should get capabilities for a payment method', async () => {
    // Arrange
    const mockHandler = createMockHandler(true, { success: true, gatewayReference: 'ref123' }, { success: false, error: { code: 'ERROR', message: 'Test error' } });
    paymentMethodRegistry.registerHandler('CREDIT_CARD', mockHandler, ['CREDIT_CARD']);
    jest.spyOn(paymentMethodRegistry, 'getHandler').mockReturnValue(mockHandler);

    // Act
    const capabilities = await paymentMethodHandlerService.getMethodCapabilities('CREDIT_CARD');

    // Assert
    expect(mockHandler.getMethodCapabilities).toHaveBeenCalled();
    expect(capabilities).toEqual({ supportsPartialRefunds: true });
  });

  it('should get capabilities for a refund method', async () => {
    // Arrange
    const mockHandler = createMockHandler(true, { success: true, gatewayReference: 'ref123' }, { success: false, error: { code: 'ERROR', message: 'Test error' } });
    paymentMethodRegistry.registerRefundMethodHandler(RefundMethod.ORIGINAL_PAYMENT, mockHandler);
    jest.spyOn(paymentMethodRegistry, 'getRefundMethodHandler').mockReturnValue(mockHandler);

    // Act
    const capabilities = await paymentMethodHandlerService.getRefundMethodCapabilities(RefundMethod.ORIGINAL_PAYMENT);

    // Assert
    expect(mockHandler.getMethodCapabilities).toHaveBeenCalled();
    expect(capabilities).toEqual({ supportsPartialRefunds: true });
  });

  it('should throw error when getting capabilities for unsupported method', async () => {
    // Arrange
    jest.spyOn(paymentMethodRegistry, 'getHandler').mockReturnValue(null);

    // Act & Assert
    await expect(paymentMethodHandlerService.getMethodCapabilities('UNSUPPORTED'))
      .rejects.toThrow(BusinessError);
  });

  it('should log appropriate messages during operations', async () => {
    // Arrange
    const mockHandler = createMockHandler(true, { success: true, gatewayReference: 'ref123' }, { success: false, error: { code: 'ERROR', message: 'Test error' } });
    paymentMethodRegistry.registerRefundMethodHandler(RefundMethod.ORIGINAL_PAYMENT, mockHandler);
    const refundRequest: RefundRequest = createRefundRequest({ refundMethod: RefundMethod.ORIGINAL_PAYMENT });
    const transaction: Transaction = mockTransactions.validTransaction;
    const loggerInfoSpy = jest.spyOn(paymentMethodHandlerService['logger'], 'info');
    const loggerErrorSpy = jest.spyOn(paymentMethodHandlerService['logger'], 'error');
    const loggerDebugSpy = jest.spyOn(paymentMethodHandlerService['logger'], 'debug');

    // Act
    await paymentMethodHandlerService.validateRefund(refundRequest, transaction);
    await paymentMethodHandlerService.processRefund(refundRequest, transaction);
    await paymentMethodHandlerService.handleError(refundRequest, new Error('Test error'));

    // Assert
    expect(loggerInfoSpy).toHaveBeenCalled();
    expect(loggerErrorSpy).toHaveBeenCalled();
    expect(loggerDebugSpy).toHaveBeenCalled();
  });

  it('should record metrics during operations', async () => {
    // Arrange
    const mockHandler = createMockHandler(true, { success: true, gatewayReference: 'ref123' }, { success: false, error: { code: 'ERROR', message: 'Test error' } });
    paymentMethodRegistry.registerRefundMethodHandler(RefundMethod.ORIGINAL_PAYMENT, mockHandler);
    const refundRequest: RefundRequest = createRefundRequest({ refundMethod: RefundMethod.ORIGINAL_PAYMENT });
    const transaction: Transaction = mockTransactions.validTransaction;
    const metricsIncrementCounterSpy = jest.spyOn(paymentMethodHandlerService['metrics'], 'incrementCounter');
    const metricsRecordHistogramSpy = jest.spyOn(paymentMethodHandlerService['metrics'], 'recordHistogram');

    // Act
    await paymentMethodHandlerService.validateRefund(refundRequest, transaction);
    await paymentMethodHandlerService.processRefund(refundRequest, transaction);
    await paymentMethodHandlerService.handleError(refundRequest, new Error('Test error'));

    // Assert
    expect(metricsIncrementCounterSpy).toHaveBeenCalled();
    expect(metricsRecordHistogramSpy).not.toHaveBeenCalled();
  });
});