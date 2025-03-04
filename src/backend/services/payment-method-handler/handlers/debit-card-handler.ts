import { logger } from '../../../../common/utils/logger';
import { metrics } from '../../../../common/utils/metrics';
import { RefundMethod } from '../../../../common/enums/refund-method.enum';
import { PaymentMethodHandler } from '../registry';
import { RefundRequest, RefundResult } from '../../../../common/interfaces/refund.interface';
import { Transaction, CardPaymentDetails, GatewayType } from '../../../../common/interfaces/payment.interface';
import { GatewayError } from '../../../../common/errors/gateway-error';
import { validateDebitCardRefund, isCardExpired, checkDebitCardLimits } from '../validators/debit-card.validator';
import gatewayIntegrationService from '../../gateway-integration/gateway-integration.service';

/**
 * Handler implementation for processing refunds for debit card payments
 */
export class DebitCardHandler implements PaymentMethodHandler {
  /**
   * Initializes a new DebitCardHandler instance
   */
  constructor() {
    logger.info('DebitCardHandler initialized');
  }

  /**
   * Validates a refund request for a debit card transaction
   * @param refundRequest Refund request
   * @param transaction Transaction
   * @returns True if refund is valid, throws error otherwise
   */
  async validateRefund(refundRequest: RefundRequest, transaction: Transaction): Promise<boolean> {
    const timer = metrics.startTimer('debit_card_handler.validate_refund');
    try {
      logger.info(`Validating debit card refund for transaction ${refundRequest.transactionId}`);

      // Verify that the transaction contains debit card details
      if (!transaction.cardDetails) {
        logger.error(`Transaction does not contain card details for transaction ${refundRequest.transactionId}`);
        throw new GatewayError('INVALID_TRANSACTION', 'Transaction does not contain card details');
      }

      // Check that the card is flagged as a debit card
      if (!transaction.cardDetails.debitCard) {
        logger.error(`Transaction is not a debit card transaction for transaction ${refundRequest.transactionId}`);
        throw new GatewayError('INVALID_TRANSACTION', 'Transaction is not a debit card transaction');
      }

      // Check that the refund method is ORIGINAL_PAYMENT
      if (refundRequest.refundMethod !== RefundMethod.ORIGINAL_PAYMENT) {
        logger.error(`Refund method is not ORIGINAL_PAYMENT for transaction ${refundRequest.transactionId}`);
        throw new GatewayError('INVALID_REFUND_METHOD', 'Refund method must be ORIGINAL_PAYMENT for debit cards');
      }

      // Call validateDebitCardRefund to perform card-specific validation
      const validationResult = await validateDebitCardRefund(refundRequest, transaction);
      if (!validationResult.success) {
        logger.error(`Debit card refund validation failed for transaction ${refundRequest.transactionId}`, { errors: validationResult.errors });
        throw validationResult.errors[0]; // Throw the first validation error
      }

      // Check for daily and weekly refund limits with checkDebitCardLimits
      const limitCheckResult = await checkDebitCardLimits(refundRequest, transaction.cardDetails.cardNetwork, refundRequest.merchantId);
      if (!limitCheckResult.success) {
        logger.error(`Debit card refund limit check failed for transaction ${refundRequest.transactionId}`, { errors: limitCheckResult.errors });
        throw limitCheckResult.errors[0]; // Throw the first limit check error
      }

      // If card is expired, warn but still allow for refund
      if (isCardExpired(transaction.cardDetails)) {
        logger.info(`Debit card is expired, but still processing refund for transaction ${refundRequest.transactionId}`);
      }

      logger.info(`Debit card refund validation succeeded for transaction ${refundRequest.transactionId}`);
      metrics.incrementCounter('debit_card_handler.validate_refund.success');
      timer({ status: 'success' });
      return true;
    } catch (error) {
      logger.error(`Debit card refund validation failed for transaction ${refundRequest.transactionId}`, { error });
      metrics.incrementCounter('debit_card_handler.validate_refund.failure');
      timer({ status: 'failure', error: error.message });
      throw error;
    }
  }

  /**
   * Processes a refund for a debit card transaction
   * @param refundRequest Refund request
   * @param transaction Transaction
   * @returns Result of the refund operation
   */
  async processRefund(refundRequest: RefundRequest, transaction: Transaction): Promise<RefundResult> {
    const timer = metrics.startTimer('debit_card_handler.process_refund');
    try {
      logger.info(`Processing debit card refund for transaction ${refundRequest.transactionId}`);

      // Extract card details from the transaction
      const cardDetails = transaction.cardDetails as CardPaymentDetails;

      // Prepare gateway refund request with necessary debit card details
      const gatewayRequest = {
        merchantId: refundRequest.merchantId,
        transactionId: refundRequest.transactionId,
        refundId: refundRequest.refundId,
        gatewayType: transaction.paymentMethod.gatewayType,
        gatewayTransactionId: transaction.paymentMethod.gatewayPaymentMethodId,
        amount: refundRequest.amount,
        currency: transaction.currency,
        reason: refundRequest.reason,
        metadata: {
          ...refundRequest.metadata,
          cardLastFour: cardDetails.lastFour,
          cardExpiryMonth: cardDetails.expiryMonth,
          cardExpiryYear: cardDetails.expiryYear,
          cardNetwork: cardDetails.cardNetwork,
          debitCard: true // Include debit-specific processing flags
        }
      };

      // Call gatewayIntegrationService to process the refund
      const gatewayResult = await gatewayIntegrationService.processRefund(gatewayRequest);

      // Handle successful refund by creating RefundResult
      const refundResult: RefundResult = {
        success: gatewayResult.success,
        gatewayReference: gatewayResult.gatewayRefundId,
        status: gatewayResult.status,
        error: gatewayResult.errorMessage ? new Error(gatewayResult.errorMessage) : null,
        recommendedAction: null // No specific action recommended for debit card refunds
      };

      logger.info(`Debit card refund processed successfully for transaction ${refundRequest.transactionId}`, { refundResult });
      metrics.incrementCounter('debit_card_handler.process_refund.success');
      timer({ status: 'success' });
      return refundResult;
    } catch (error) {
      logger.error(`Debit card refund processing failed for transaction ${refundRequest.transactionId}`, { error });
      metrics.incrementCounter('debit_card_handler.process_refund.failure');
      timer({ status: 'failure', error: error.message });
      return this.handleError(refundRequest, error);
    }
  }

  /**
   * Handles errors that occur during refund processing
   * @param refundRequest Refund request
   * @param error Error
   * @returns Refund result with error information
   */
  async handleError(refundRequest: RefundRequest, error: Error): Promise<RefundResult> {
    logger.error(`Handling debit card refund error for transaction ${refundRequest.transactionId}`, { error });

    let recommendedAction = null;
    let status = 'FAILED';

    // Check if error is a GatewayError
    if (error instanceof GatewayError) {
      // For debit-specific errors like insufficient funds, provide appropriate action
      if (error.code === 'INSUFFICIENT_FUNDS') {
        recommendedAction = 'CONTACT_CUSTOMER_FOR_ALTERNATE_PAYMENT';
      }

      // Handle daily/weekly limit exceeded errors
      if (error.code === 'REFUND_LIMIT_EXCEEDED') {
        recommendedAction = 'RETRY_LATER';
      }

      // Determine if error is retryable
      if (error.isRetryable()) {
        status = 'GATEWAY_ERROR';
        recommendedAction = 'RETRY';
      }
    }

    // Create appropriate RefundResult with error details and recommended actions
    const refundResult: RefundResult = {
      success: false,
      gatewayReference: null,
      status: status,
      error: error,
      recommendedAction: recommendedAction
    };

    logger.warn(`Debit card refund error handled for transaction ${refundRequest.transactionId}`, { refundResult });
    metrics.incrementCounter('debit_card_handler.handle_error');
    return refundResult;
  }

  /**
   * Returns the capabilities of the debit card handler
   * @returns Object describing debit card refund capabilities
   */
  getMethodCapabilities(): object {
    return {
      supportedRefundTypes: ['full', 'partial'],
      supportedCardNetworks: ['Visa', 'Mastercard', 'Amex', 'Discover'],
      dailyTransactionLimit: 10,
      weeklyTransactionLimit: 50,
      verificationRequirements: ['AVS', 'CVV']
    };
  }
}