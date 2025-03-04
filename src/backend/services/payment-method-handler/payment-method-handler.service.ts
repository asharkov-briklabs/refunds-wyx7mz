import { logger, metrics } from '../../../common/utils';
import { RefundMethod } from '../../../common/enums/refund-method.enum';
import { RefundRequest, RefundResult } from '../../../common/interfaces/refund.interface';
import { Transaction } from '../../../common/interfaces/payment.interface';
import { BusinessError } from '../../../common/errors/business-error';
import { ErrorCode } from '../../../common/constants/error-codes';
import { paymentMethodRegistry, PaymentMethodHandler } from './registry';
import paymentServiceClient from '../../integrations/payment-service/client';

/**
 * Service that orchestrates refund operations by delegating to the appropriate payment method handler
 * based on payment method type
 */
export class PaymentMethodHandlerService {
  /**
   * Validates if a refund request can be processed based on payment method rules
   * @param refundRequest 
   * @param transaction 
   * @returns True if refund is valid, false otherwise
   */
  async validateRefund(refundRequest: RefundRequest, transaction: Transaction): Promise<boolean> {
    logger.info('Validating refund request', { refundRequest, transaction });

    try {
      // Determine appropriate handler based on refund method or transaction payment method
      const handler = refundRequest.refundMethod
        ? paymentMethodRegistry.getRefundMethodHandler(refundRequest.refundMethod as RefundMethod)
        : paymentMethodRegistry.getHandler(transaction.paymentMethod.type);

      // Call the handler's validateRefund method
      const isValid = await handler.validateRefund(refundRequest, transaction);

      // Record validation metrics (success or failure)
      metrics.incrementCounter('refund_validation.success', 1, { paymentMethod: transaction.paymentMethod.type });
      return isValid;
    } catch (error) {
      // Record validation metrics (failure)
      metrics.incrementCounter('refund_validation.failure', 1, { paymentMethod: transaction.paymentMethod.type });
      logger.error('Error validating refund', { refundRequest, transaction, error });
      throw error; // Re-throw the error for centralized error handling
    }
  }

  /**
   * Processes a refund using the appropriate payment method handler
   * @param refundRequest 
   * @param transaction 
   * @returns Result of the refund operation
   */
  async processRefund(refundRequest: RefundRequest, transaction: Transaction): Promise<RefundResult> {
    logger.info('Processing refund request', { refundRequest, transaction });

    try {
      // Determine appropriate handler based on refund method or transaction payment method
      const handler = refundRequest.refundMethod
        ? paymentMethodRegistry.getRefundMethodHandler(refundRequest.refundMethod as RefundMethod)
        : paymentMethodRegistry.getHandler(transaction.paymentMethod.type);

      // Call the handler's processRefund method
      const refundResult = await handler.processRefund(refundRequest, transaction);

      // Record processing metrics (success or failure)
      metrics.incrementCounter('refund_processing.success', 1, { paymentMethod: transaction.paymentMethod.type });
      return refundResult;
    } catch (error) {
      // Record processing metrics (failure)
      metrics.incrementCounter('refund_processing.failure', 1, { paymentMethod: transaction.paymentMethod.type });
      logger.error('Error processing refund', { refundRequest, transaction, error });
      throw error; // Re-throw the error for centralized error handling
    }
  }

  /**
   * Delegates error handling to the appropriate payment method handler
   * @param refundRequest 
   * @param error 
   * @returns Refund result with error information
   */
  async handleError(refundRequest: RefundRequest, error: Error): Promise<RefundResult> {
    logger.info('Handling refund error', { refundRequest, error });

    try {
      // Determine appropriate handler based on refund method
      const handler = paymentMethodRegistry.getHandlerForRefundMethod(refundRequest.refundMethod as RefundMethod);

      // Call the handler's handleError method
      const refundResult = await handler.handleError(refundRequest, error);

      // Record error handling metrics
      metrics.incrementCounter('refund_error_handling.success', 1, { paymentMethod: refundRequest.refundMethod });
      return refundResult;
    } catch (err) {
      // Record error handling metrics (failure)
      metrics.incrementCounter('refund_error_handling.failure', 1, { paymentMethod: refundRequest.refundMethod });
      logger.error('Error handling refund error', { refundRequest, error, err });
      throw err; // Re-throw the error for centralized error handling
    }
  }

  /**
   * Retrieves transaction details required for refund processing
   * @param transactionId 
   * @returns Transaction details
   */
  async getTransactionForRefund(transactionId: string): Promise<Transaction> {
    logger.info('Retrieving transaction for refund', { transactionId });

    try {
      // Call payment service client to retrieve transaction details
      const transaction = await paymentServiceClient.getTransaction({ transactionId, merchantId: 'merchant123' }); // Replace 'merchant123' with actual merchant ID

      // Validate that transaction exists and is eligible for refund
      if (!transaction) {
        throw new BusinessError(ErrorCode.TRANSACTION_NOT_FOUND, 'Transaction not found');
      }

      // Return transaction data
      return transaction;
    } catch (error) {
      logger.error('Error retrieving transaction for refund', { transactionId, error });
      throw error; // Re-throw the error for centralized error handling
    }
  }

  /**
   * Gets a list of refund methods supported for a specific transaction
   * @param transaction 
   * @returns Array of supported refund methods
   */
  async getSupportedRefundMethods(transaction: Transaction): Promise<RefundMethod[]> {
    logger.info('Getting supported refund methods', { transaction });

    const supportedMethods: RefundMethod[] = [];

    // Check if ORIGINAL_PAYMENT is available for this transaction
    if (transaction.paymentMethod.validForRefund) {
      supportedMethods.push(RefundMethod.ORIGINAL_PAYMENT);
    }

    // Check if BALANCE is available
    // Add logic to check if BALANCE is available based on merchant configuration
    // and balance service response

    // Check if OTHER is available (bank account configured)
    // Add logic to check if OTHER is available based on merchant configuration
    // and bank account service response

    return supportedMethods;
  }

  /**
   * Gets the capabilities of a specific payment method
   * @param paymentMethod 
   * @returns Object describing payment method capabilities
   */
  async getMethodCapabilities(paymentMethod: string): Promise<object> {
    logger.info('Getting method capabilities', { paymentMethod });

    try {
      // Determine appropriate handler for the payment method
      const handler = paymentMethodRegistry.getHandler(paymentMethod);

      // Call the handler's getMethodCapabilities method
      const capabilities = await handler.getMethodCapabilities();

      return capabilities;
    } catch (error) {
      logger.error('Error getting method capabilities', { paymentMethod, error });
      throw error; // Re-throw the error for centralized error handling
    }
  }

  /**
   * Gets the capabilities of a specific refund method
   * @param refundMethod 
   * @returns Object describing refund method capabilities
   */
  async getRefundMethodCapabilities(refundMethod: RefundMethod): Promise<object> {
    logger.info('Getting refund method capabilities', { refundMethod });

    try {
      // Determine appropriate handler for the refund method
      const handler = paymentMethodRegistry.getRefundMethodHandler(refundMethod);

      // Call the handler's getMethodCapabilities method
      const capabilities = await handler.getMethodCapabilities();

      return capabilities;
    } catch (error) {
      logger.error('Error getting refund method capabilities', { refundMethod, error });
      throw error; // Re-throw the error for centralized error handling
    }
  }

  /**
   * Resolves the appropriate handler for a refund method
   * @param refundMethod 
   * @returns Handler for the specified refund method
   */
  getHandlerForRefundMethod(refundMethod: RefundMethod): PaymentMethodHandler {
    try {
      // Check if a dedicated handler exists for this refund method
      if (paymentMethodRegistry.hasRefundMethodHandler(refundMethod)) {
        // If found, return the refund method handler
        return paymentMethodRegistry.getRefundMethodHandler(refundMethod);
      } else {
        // If not found, log error and throw BusinessError
        logger.error(`No handler registered for refund method: ${refundMethod}`);
        throw new BusinessError(
          ErrorCode.UNSUPPORTED_PAYMENT_METHOD,
          `No handler registered for refund method: ${refundMethod}`
        );
      }
    } catch (error) {
      logger.error('Error getting handler for refund method', { refundMethod, error });
      throw error; // Re-throw the error for centralized error handling
    }
  }

  /**
   * Resolves the appropriate handler for a payment method
   * @param paymentMethod 
   * @returns Handler for the specified payment method
   */
  getHandlerForPaymentMethod(paymentMethod: string): PaymentMethodHandler {
    try {
      // Check if a handler exists for this payment method
      if (paymentMethodRegistry.hasHandler(paymentMethod)) {
        // If found, return the payment method handler
        return paymentMethodRegistry.getHandler(paymentMethod);
      } else {
        // If not found, log error and throw BusinessError
        logger.error(`No handler registered for payment method: ${paymentMethod}`);
        throw new BusinessError(
          ErrorCode.UNSUPPORTED_PAYMENT_METHOD,
          `No handler registered for payment method: ${paymentMethod}`
        );
      }
    } catch (error) {
      logger.error('Error getting handler for payment method', { paymentMethod, error });
      throw error; // Re-throw the error for centralized error handling
    }
  }
}

/**
 * Singleton instance of PaymentMethodHandlerService for use throughout the application
 */
export const paymentMethodHandlerService = new PaymentMethodHandlerService();