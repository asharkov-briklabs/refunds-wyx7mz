// Implements a specialized handler for processing digital wallet payment refunds, supporting Apple Pay, Google Pay, and other digital wallet payment methods.
// This handler implements the PaymentMethodHandler interface providing wallet-specific validation, processing, and error handling.

import { logger } from '../../../../common/utils/logger';
import { metrics } from '../../../../common/utils/metrics';
import { RefundMethod } from '../../../../common/enums/refund-method.enum';
import { PaymentMethodHandler } from '../registry';
import { RefundRequest, RefundResult } from '../../../../common/interfaces/refund.interface';
import { Transaction, PaymentMethodType, GatewayType } from '../../../../common/interfaces/payment.interface';
import { GatewayError } from '../../../../common/errors/gateway-error';
import { BusinessError } from '../../../../common/errors/business-error';
import { ErrorCode } from '../../../../common/constants/error-codes';
import gatewayIntegrationService from '../../gateway-integration/gateway-integration.service';

/**
 * Handler implementation for processing refunds for digital wallet payments (Apple Pay, Google Pay, etc.)
 */
export class WalletHandler implements PaymentMethodHandler {
  /**
   * Initializes a new WalletHandler instance
   */
  constructor() {
    // Initialize the handler with necessary dependencies
  }

  /**
   * Validates a refund request for a digital wallet transaction
   * @param refundRequest 
   * @param transaction 
   * @returns True if refund is valid, throws error otherwise
   */
  async validateRefund(refundRequest: RefundRequest, transaction: Transaction): Promise<boolean> {
    logger.info('Validating wallet refund request', {
      transactionId: refundRequest.transactionId,
      refundId: refundRequest.refundMethod,
      amount: refundRequest.amount
    });

    // Verify that transaction payment method type is WALLET
    if (transaction.paymentMethod.type !== PaymentMethodType.WALLET) {
      logger.error('Invalid payment method type for wallet refund', {
        transactionId: refundRequest.transactionId,
        paymentMethodType: transaction.paymentMethod.type
      });
      throw new BusinessError(
        ErrorCode.INVALID_PAYMENT_METHOD,
        'Invalid payment method type for wallet refund'
      );
    }

    // Check that refund method is ORIGINAL_PAYMENT
    if (refundRequest.refundMethod !== RefundMethod.ORIGINAL_PAYMENT) {
      logger.error('Invalid refund method for wallet refund', {
        transactionId: refundRequest.transactionId,
        refundMethod: refundRequest.refundMethod
      });
      throw new BusinessError(
        ErrorCode.INVALID_PAYMENT_METHOD,
        'Invalid refund method for wallet refund'
      );
    }

    // Verify the wallet-specific data is present in the transaction
    if (!transaction.paymentMethod.metadata || !transaction.paymentMethod.metadata.walletToken) {
      logger.error('Missing wallet token in transaction metadata', {
        transactionId: refundRequest.transactionId
      });
      throw new BusinessError(
        ErrorCode.INVALID_INPUT,
        'Missing wallet token in transaction metadata'
      );
    }

    // Check if the wallet token has expired
    if (transaction.paymentMethod.metadata.walletTokenExpiry &&
      new Date(transaction.paymentMethod.metadata.walletTokenExpiry as string) < new Date()) {
      logger.error('Wallet token has expired', {
        transactionId: refundRequest.transactionId,
        expiryDate: transaction.paymentMethod.metadata.walletTokenExpiry
      });
      throw new BusinessError(
        ErrorCode.WALLET_TOKEN_EXPIRED,
        'Wallet token has expired'
      );
    }

    // Ensure the transaction is eligible for refund
    if (!transaction.paymentMethod.validForRefund) {
      logger.error('Transaction is not eligible for refund', {
        transactionId: refundRequest.transactionId
      });
      throw new BusinessError(
        ErrorCode.INVALID_STATE,
        'Transaction is not eligible for refund'
      );
    }

    metrics.incrementCounter('wallet_refund.validation.success', 1, {
      gateway: GatewayType[transaction.gateway]
    });

    return true;
  }

  /**
   * Processes a refund for a digital wallet transaction
   * @param refundRequest 
   * @param transaction 
   * @returns Result of the refund operation
   */
  async processRefund(refundRequest: RefundRequest, transaction: Transaction): Promise<RefundResult> {
    logger.info('Processing wallet refund', {
      transactionId: refundRequest.transactionId,
      refundId: refundRequest.refundMethod,
      amount: refundRequest.amount
    });

    // Extract wallet payment details from the transaction
    const walletToken = transaction.paymentMethod.metadata.walletToken;
    const gatewayType = transaction.paymentMethod.gatewayType;

    // Identify the specific wallet type (Apple Pay, Google Pay, etc.)
    const walletType = transaction.paymentMethod.metadata.walletType || 'Unknown';

    // Prepare gateway-specific refund data with necessary wallet token
    const gatewayRefundRequest = {
      ...refundRequest,
      gatewayType: transaction.paymentMethod.gatewayType,
      gatewayTransactionId: transaction.gatewayTransactionId,
      walletToken: walletToken
    };

    try {
      // Call gatewayIntegrationService to process the refund
      const gatewayResponse = await gatewayIntegrationService.processRefund(gatewayRefundRequest);

      // Handle successful refund by creating appropriate RefundResult
      const refundResult: RefundResult = {
        success: true,
        gatewayReference: gatewayResponse.gatewayRefundId,
        status: gatewayResponse.status,
        error: null
      };

      metrics.incrementCounter('wallet_refund.processing.success', 1, {
        gateway: GatewayType[gatewayType],
        walletType: walletType
      });

      return refundResult;
    } catch (error) {
      // Record metrics for error handling
      metrics.incrementCounter('wallet_refund.processing.failure', 1, {
        gateway: GatewayType[gatewayType],
        walletType: walletType
      });

      // Re-throw the error for centralized error handling
      throw error;
    }
  }

  /**
   * Handles errors that occur during digital wallet refund processing
   * @param refundRequest 
   * @param error 
   * @returns Refund result with error information
   */
  async handleError(refundRequest: RefundRequest, error: Error): Promise<RefundResult> {
    logger.error('Handling wallet refund error', {
      transactionId: refundRequest.transactionId,
      refundId: refundRequest.refundMethod,
      error: error.message
    });

    let errorCode = 'WALLET_REFUND_ERROR';
    let errorMessage = 'Failed to process wallet refund';
    let retryable = false;

    // Check if error is a GatewayError
    if (error instanceof GatewayError) {
      errorCode = error.code;
      errorMessage = error.message;
      retryable = error.isRetryable();
    }

    // Identify wallet-specific error scenarios (token expiry, device verification)
    if (error instanceof BusinessError && error.code === ErrorCode.WALLET_TOKEN_EXPIRED) {
      errorCode = ErrorCode.WALLET_TOKEN_EXPIRED;
      errorMessage = 'Wallet token has expired';
    }

    // Determine if error is retryable
    if (errorCode === 'GATEWAY_TIMEOUT' || errorCode === 'SERVICE_UNAVAILABLE') {
      retryable = true;
    }

    // Create appropriate RefundResult with error details
    const refundResult: RefundResult = {
      success: false,
      gatewayReference: null,
      status: 'FAILED',
      error: {
        code: errorCode,
        message: errorMessage,
        retryable: retryable
      }
    };

    metrics.incrementCounter('wallet_refund.error_handling', 1, {
      errorCode: errorCode
    });

    return refundResult;
  }

  /**
   * Returns the capabilities of the wallet payment handler
   * @returns Object describing wallet payment refund capabilities
   */
  getMethodCapabilities(): object {
    return {
      refundType: 'full/partial',
      walletTypes: ['Apple Pay', 'Google Pay', 'Samsung Pay'],
      tokenHandling: 'required',
      verificationRequirements: 'none'
    };
  }
}