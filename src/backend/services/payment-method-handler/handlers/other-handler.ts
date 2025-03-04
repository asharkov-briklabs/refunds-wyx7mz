import { logger } from '../../../../common/utils/logger';
import { metrics } from '../../../../common/utils/metrics';
import { RefundMethod } from '../../../../common/enums/refund-method.enum';
import { PaymentMethodHandler } from '../registry';
import { RefundRequest, RefundResult } from '../../../../common/interfaces/refund.interface';
import { Transaction } from '../../../../common/interfaces/payment.interface';
import { BusinessError } from '../../../../common/errors/business-error';
import { ErrorCode } from '../../../../common/constants/error-codes';
import bankAccountManager from '../../../bank-account-manager/bank-account-manager.service';
import gatewayIntegrationService from '../../../gateway-integration/gateway-integration.service';

/**
 * Handler implementation for processing refunds using the OTHER method, which utilizes bank accounts
 */
export default class OtherHandler implements PaymentMethodHandler {
  /**
   * Initializes a new OtherHandler instance
   */
  constructor() {
    // Initialize the handler with necessary dependencies
  }

  /**
   * Validates a refund request that uses the OTHER method
   * @param refundRequest 
   * @param transaction 
   * @returns True if refund is valid, throws error otherwise
   */
  async validateRefund(refundRequest: RefundRequest, transaction: Transaction): Promise<boolean> {
    logger.info('Validating OTHER refund request', { refundId: refundRequest.refundId });

    // Verify that the refund method is OTHER
    if (refundRequest.refundMethod !== RefundMethod.OTHER) {
      throw new BusinessError(
        ErrorCode.INVALID_REFUND_METHOD,
        `Invalid refund method: ${refundRequest.refundMethod}. Expected: ${RefundMethod.OTHER}`
      );
    }

    // Check if the refund amount exceeds the original transaction amount
    if (refundRequest.amount > transaction.amount) {
      throw new BusinessError(
        ErrorCode.VALIDATION_ERROR,
        'Refund amount cannot exceed original transaction amount'
      );
    }

    // Verify that a bank account ID is provided or a default bank account exists
    if (!refundRequest.bankAccountId) {
      throw new BusinessError(
        ErrorCode.BANK_ACCOUNT_REQUIRED,
        'Bank account ID is required for OTHER refund method'
      );
    }

    try {
      // Retrieve and validate the bank account using bankAccountManager
      await bankAccountManager.getBankAccountForRefund(refundRequest.merchantId, refundRequest);
    } catch (error) {
      logger.error('Error validating bank account', { refundId: refundRequest.refundId, error });
      throw error; // Re-throw the error to be handled upstream
    }

    logger.info('OTHER refund request validated successfully', { refundId: refundRequest.refundId });
    metrics.incrementCounter('refund.validation.success', 1, { method: RefundMethod.OTHER });
    return true;
  }

  /**
   * Processes a refund using a bank account
   * @param refundRequest 
   * @param transaction 
   * @returns Result of the refund operation
   */
  async processRefund(refundRequest: RefundRequest, transaction: Transaction): Promise<RefundResult> {
    logger.info('Processing OTHER refund request', { refundId: refundRequest.refundId });

    // Validate that the refund method is OTHER
    if (refundRequest.refundMethod !== RefundMethod.OTHER) {
      throw new BusinessError(
        ErrorCode.INVALID_REFUND_METHOD,
        `Invalid refund method: ${refundRequest.refundMethod}. Expected: ${RefundMethod.OTHER}`
      );
    }

    let bankAccount;
    try {
      // Retrieve the bank account to use for the refund
       bankAccount = await bankAccountManager.getBankAccountForRefund(refundRequest.merchantId, refundRequest);
    } catch (error) {
      logger.error('Error retrieving bank account for refund', { refundId: refundRequest.refundId, error });
      throw error; // Re-throw the error to be handled upstream
    }

    try {
      // Create a refund request with bank account details
      const achRefundRequest = {
        ...refundRequest,
        bankAccount: bankAccount,
      };

      // Call gatewayIntegrationService.processACHRefund to initiate the bank transfer
      const gatewayResponse = await gatewayIntegrationService.processACHRefund(achRefundRequest);

      // Create a RefundResult with the gateway response
      const refundResult: RefundResult = {
        success: gatewayResponse.success,
        status: gatewayResponse.status,
        error: gatewayResponse.error,
        gateway_reference: gatewayResponse.gateway_reference,
      };

      logger.info('OTHER refund processed successfully', { refundId: refundRequest.refundId, gatewayReference: refundResult.gateway_reference });
      metrics.incrementCounter('refund.processing.success', 1, { method: RefundMethod.OTHER });
      return refundResult;
    } catch (error) {
      logger.error('Error processing OTHER refund', { refundId: refundRequest.refundId, error });
      metrics.incrementCounter('refund.processing.failure', 1, { method: RefundMethod.OTHER });
      throw error; // Re-throw the error to be handled upstream
    }
  }

  /**
   * Handles errors that occur during refund processing
   * @param refundRequest 
   * @param error 
   * @returns Refund result with error information
   */
  async handleError(refundRequest: RefundRequest, error: Error): Promise<RefundResult> {
    logger.error('Handling error for OTHER refund', { refundId: refundRequest.refundId, error });

    let errorCode = ErrorCode.GATEWAY_ERROR;
    let errorMessage = 'An unexpected error occurred during refund processing';
    let retryable = false;

    // Determine the type of error (bank account not found, unverified, etc.)
    if (error instanceof BusinessError) {
      errorCode = error.code;
      errorMessage = error.message;
    } else {
      // Handle specific error types
      if (error.message.includes('Bank account not found')) {
        errorCode = ErrorCode.BANK_ACCOUNT_NOT_FOUND;
        errorMessage = 'Bank account not found';
      } else if (error.message.includes('Unverified bank account')) {
        errorCode = ErrorCode.UNVERIFIED_BANK_ACCOUNT;
        errorMessage = 'Bank account is not verified';
      }
    }

    // Create appropriate RefundResult with error details
    const refundResult: RefundResult = {
      success: false,
      status: 'FAILED',
      error: {
        code: errorCode,
        message: errorMessage,
      },
      gateway_reference: null,
    };

    // Determine if the error is retryable
    retryable = errorCode === ErrorCode.GATEWAY_TIMEOUT;

    logger.warn('Error handled for OTHER refund', { refundId: refundRequest.refundId, errorCode, errorMessage, retryable });
    metrics.incrementCounter('refund.error.handled', 1, { method: RefundMethod.OTHER, errorCode });
    return refundResult;
  }

  /**
   * Returns the capabilities of the OTHER refund method handler
   * @returns Object describing OTHER refund capabilities
   */
  getMethodCapabilities(): object {
    return {
      refundMethod: RefundMethod.OTHER,
      supportedRefundTypes: ['full', 'partial'],
      bankAccountRequired: true,
      processingCharacteristics: 'ACH transfer, typically 1-3 business days',
      typicalUseCases: 'When original payment method is unavailable or expired',
    };
  }
}