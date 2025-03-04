import { logger } from '../../../../common/utils/logger';
import { metrics } from '../../../../common/utils/metrics';
import { RefundMethod } from '../../../../common/enums/refund-method.enum';
import { PaymentMethodHandler } from '../registry';
import { RefundRequest, RefundResult } from '../../../../common/interfaces/refund.interface';
import { Transaction, CardPaymentDetails } from '../../../../common/interfaces/payment.interface';
import { GatewayType } from '../../../../common/enums/gateway-type.enum';
import { GatewayError } from '../../../../common/errors/gateway-error';
import { validateCreditCardRefund } from '../validators/credit-card.validator';
import gatewayIntegrationService from '../../gateway-integration/gateway-integration.service';

/**
 * Handler implementation for processing refunds for credit card payments
 */
export class CreditCardHandler implements PaymentMethodHandler {

  /**
   * Initializes a new CreditCardHandler instance
   */
  constructor() {
    // LD1: Log the initialization of the CreditCardHandler
    logger.info('CreditCardHandler initialized');
  }

  /**
   * Validates a refund request for a credit card transaction
   * @param refundRequest 
   * @param transaction 
   * @returns True if refund is valid, throws error otherwise
   */
  async validateRefund(refundRequest: RefundRequest, transaction: Transaction): Promise<boolean> {
    // S1: Log the validation attempt
    logger.info(`Validating credit card refund request ${refundRequest.transactionId}`);

    // LD1: Verify that the transaction contains credit card details
    if (!transaction.paymentMethod || transaction.paymentMethod.type !== 'CREDIT_CARD') {
      // LD2: Throw validation error if not a credit card
      logger.error(`Transaction ${transaction.transactionId} is not a credit card payment`);
      throw new Error('Transaction is not a credit card payment');
    }

    // LD1: Check that the refund method is ORIGINAL_PAYMENT
    if (refundRequest.refundMethod !== RefundMethod.ORIGINAL_PAYMENT) {
      // LD2: Throw validation error if refund method is not ORIGINAL_PAYMENT
      logger.error(`Refund method ${refundRequest.refundMethod} is not supported for credit card payments`);
      throw new Error('Refund method not supported for credit card payments');
    }

    try {
      // LD1: Call validateCreditCardRefund to perform card-specific validation
      const validationResult = await validateCreditCardRefund(refundRequest, transaction);

      // LD2: Handle validation errors if any
      if (!validationResult.success) {
        logger.error(`Credit card refund validation failed: ${validationResult.errors.join(', ')}`);
        throw new Error(`Credit card refund validation failed: ${validationResult.errors.join(', ')}`);
      }

      // LD2: Return true if validation succeeds
      logger.info(`Credit card refund validation succeeded for transaction ${refundRequest.transactionId}`);
      return true;
    } catch (error) {
      // LD2: Handle validation errors if any
      logger.error(`Credit card refund validation failed: ${error.message}`);
      throw error;
    } finally {
      // LD1: Record metrics for validation result
      metrics.incrementCounter('refund.validation.credit_card', 1, { result: 'success' });
    }
  }

  /**
   * Processes a refund for a credit card transaction
   * @param refundRequest 
   * @param transaction 
   * @returns Result of the refund operation
   */
  async processRefund(refundRequest: RefundRequest, transaction: Transaction): Promise<RefundResult> {
    // S1: Log the processing attempt
    logger.info(`Processing credit card refund for transaction ${refundRequest.transactionId}`);

    try {
      // LD1: Extract card details from the transaction
      const cardDetails = transaction.paymentMethod as CardPaymentDetails;

      // LD1: Prepare gateway refund request with necessary card details
      const gatewayRefundRequest = {
        merchantId: refundRequest.merchantId,
        transactionId: refundRequest.transactionId,
        refundId: refundRequest.refundId,
        gatewayType: transaction.paymentMethod.gatewayType,
        gatewayTransactionId: transaction.gatewayTransactionId,
        amount: refundRequest.amount,
        currency: transaction.currency,
        reason: refundRequest.reason,
        metadata: {
          ...refundRequest.metadata,
          cardLastFour: cardDetails.lastFour,
          cardNetwork: cardDetails.cardNetwork
        }
      };

      // LD1: Call gatewayIntegrationService to process the refund
      const gatewayResult = await gatewayIntegrationService.processRefund(gatewayRefundRequest);

      // LD1: Handle successful refund by creating RefundResult
      const refundResult: RefundResult = {
        success: true,
        gatewayReference: gatewayResult.gatewayRefundId,
        status: gatewayResult.status,
        error: null
      };

      // LD1: Record metrics for successful processing
      metrics.incrementCounter('refund.processing.credit_card', 1, { result: 'success' });

      // LD1: Return the refund result
      logger.info(`Credit card refund processed successfully for transaction ${refundRequest.transactionId}`);
      return refundResult;
    } catch (error) {
      // LD1: Record metrics for error handling
      metrics.incrementCounter('refund.processing.credit_card', 1, { result: 'error' });

      // LD1: Handle errors that occur during refund processing
      return this.handleError(refundRequest, error);
    }
  }

  /**
   * Handles errors that occur during refund processing
   * @param refundRequest 
   * @param error 
   * @returns Refund result with error information
   */
  async handleError(refundRequest: RefundRequest, error: Error): Promise<RefundResult> {
    // S1: Log the error details
    logger.error(`Error processing credit card refund for transaction ${refundRequest.transactionId}: ${error.message}`);

    // LD1: Check if error is a GatewayError
    if (error instanceof GatewayError) {
      // LD2: Determine if error is retryable
      const retryable = error.isRetryable();

      // LD2: Create appropriate RefundResult with error details
      const refundResult: RefundResult = {
        success: false,
        gatewayReference: null,
        status: 'FAILED',
        error: {
          code: error.code,
          message: error.message
        }
      };

      // LD1: Return the refund result with error information
      return refundResult;
    } else {
      // LD2: Create appropriate RefundResult with error details
      const refundResult: RefundResult = {
        success: false,
        gatewayReference: null,
        status: 'FAILED',
        error: {
          code: 'UNKNOWN_ERROR',
          message: error.message
        }
      };

      // LD1: Return the refund result with error information
      return refundResult;
    }
  }

  /**
   * Returns the capabilities of the credit card handler
   * @returns Object describing credit card refund capabilities
   */
  getMethodCapabilities(): object {
    // LD1: Return an object with credit card specific capabilities
    return {
      supportedRefundTypes: ['full', 'partial'],
      supportedCardNetworks: ['Visa', 'Mastercard', 'Amex'],
      verificationRequirements: ['CVV', 'Address']
    };
  }
}