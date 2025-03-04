import { logger } from '../../../../common/utils/logger';
import { metrics } from '../../../../common/utils/metrics';
import { RefundMethod } from '../../../../common/enums/refund-method.enum';
import { PaymentMethodHandler } from '../registry';
import { RefundRequest, RefundResult } from '../../../../common/interfaces/refund.interface';
import { Transaction } from '../../../../common/interfaces/payment.interface';
import { BusinessError } from '../../../../common/errors/business-error';
import { ErrorCode } from '../../../../common/constants/error-codes';
import balanceServiceClient from '../../../integrations/balance-service/client';
import { BalanceOperation } from '../../../integrations/balance-service/types';

/**
 * Handler implementation for processing refunds using the merchant's platform balance
 */
export class BalanceHandler implements PaymentMethodHandler {
  /**
   * Initializes a new BalanceHandler instance
   */
  constructor() {
    // Initialize the handler with necessary dependencies
  }

  /**
   * Validates a refund request that uses the balance method
   * @param refundRequest 
   * @param transaction 
   * @returns True if refund is valid, throws error otherwise
   */
  async validateRefund(refundRequest: RefundRequest, transaction: Transaction): Promise<boolean> {
    logger.info('Validating balance refund', { refundId: refundRequest.transactionId });

    // Verify that the refund method is BALANCE
    if (refundRequest.refundMethod !== RefundMethod.BALANCE) {
      throw new Error('Invalid refund method. BalanceHandler can only process BALANCE refunds.');
    }

    // Check if the refund amount exceeds the original transaction amount
    if (refundRequest.amount > transaction.amount) {
      throw new BusinessError(
        ErrorCode.VALIDATION_ERROR,
        'Refund amount cannot exceed original transaction amount'
      );
    }

    // Verify that the merchant has sufficient balance for the refund amount
    const hasSufficientBalance = await balanceServiceClient.hasSufficientBalance(
      refundRequest.merchantId,
      refundRequest.amount,
      transaction.currency
    );

    if (!hasSufficientBalance) {
      logger.error('Insufficient balance for refund', {
        merchantId: refundRequest.merchantId,
        amount: refundRequest.amount,
        currency: transaction.currency
      });
      
      metrics.incrementCounter('refund.balance.validation.insufficient_balance', 1, {
        merchantId: refundRequest.merchantId,
        currency: transaction.currency
      });

      throw new BusinessError(
        ErrorCode.INSUFFICIENT_BALANCE,
        'Insufficient balance for refund'
      );
    }

    logger.info('Balance refund validation successful', { refundId: refundRequest.transactionId });
    
    metrics.recordSuccess('refund.balance.validation', {
      merchantId: refundRequest.merchantId,
      currency: transaction.currency
    });

    return true;
  }

  /**
   * Processes a refund using the merchant's balance
   * @param refundRequest 
   * @param transaction 
   * @returns Result of the refund operation
   */
  async processRefund(refundRequest: RefundRequest, transaction: Transaction): Promise<RefundResult> {
    logger.info('Processing balance refund', { refundId: refundRequest.transactionId });

    // Validate that the refund method is BALANCE
    if (refundRequest.refundMethod !== RefundMethod.BALANCE) {
      throw new Error('Invalid refund method. BalanceHandler can only process BALANCE refunds.');
    }

    // Create a balance update request with refund details
    const balanceUpdateRequest = {
      merchantId: refundRequest.merchantId,
      amount: refundRequest.amount,
      currency: transaction.currency,
      operation: BalanceOperation.DEBIT,
      reason: refundRequest.reason,
      referenceId: refundRequest.transactionId,
      metadata: {
        refundId: refundRequest.transactionId,
        transactionId: refundRequest.transactionId
      }
    };

    try {
      // Call balanceServiceClient.updateBalance to process the balance deduction
      const balanceUpdateResult = await balanceServiceClient.updateBalance(balanceUpdateRequest);

      logger.info('Balance update successful', {
        merchantId: refundRequest.merchantId,
        amount: refundRequest.amount,
        currency: transaction.currency,
        transactionId: balanceUpdateResult.transactionId
      });
      
      metrics.recordSuccess('refund.balance.processing', {
        merchantId: refundRequest.merchantId,
        currency: transaction.currency
      });

      // Handle successful balance update by creating a successful RefundResult
      return {
        success: true,
        status: 'COMPLETED',
        error: null
      };
    } catch (error) {
      logger.error('Error processing balance update', {
        merchantId: refundRequest.merchantId,
        amount: refundRequest.amount,
        currency: transaction.currency,
        error: error instanceof Error ? error.message : String(error)
      });
      
      metrics.recordError('refund.balance.processing', 'balance_update_failed', {
        merchantId: refundRequest.merchantId,
        currency: transaction.currency,
        error: error instanceof Error ? error.name : 'UnknownError'
      });

      // Re-throw the error to be handled by the caller
      throw error;
    }
  }

  /**
   * Handles errors that occur during refund processing
   * @param refundRequest 
   * @param error 
   * @returns Refund result with error information
   */
  async handleError(refundRequest: RefundRequest, error: Error): Promise<RefundResult> {
    logger.error('Handling balance refund error', {
      refundId: refundRequest.transactionId,
      error: error instanceof Error ? error.message : String(error)
    });

    let refundResult: RefundResult;

    // Check if error is a BusinessError related to insufficient balance
    if (error instanceof BusinessError && error.code === ErrorCode.INSUFFICIENT_BALANCE) {
      refundResult = {
        success: false,
        status: 'FAILED',
        error: {
          code: ErrorCode.INSUFFICIENT_BALANCE,
          message: error.message
        }
      };
    } else {
      // Create a generic RefundResult for other errors
      refundResult = {
        success: false,
        status: 'FAILED',
        error: {
          code: ErrorCode.GATEWAY_ERROR,
          message: error.message
        }
      };
    }
    
    metrics.recordError('refund.balance.handle_error', refundResult.error.code, {
      merchantId: refundRequest.merchantId,
      currency: refundRequest.currency
    });

    return refundResult;
  }

  /**
   * Returns the capabilities of the balance handler
   * @returns Object describing balance refund capabilities
   */
  getMethodCapabilities(): object {
    return {
      supportsPartialRefunds: true,
      supportsDelayedRefunds: false,
      refundTimeLimit: null,
      requiresApproval: false,
      requiresDocumentation: false,
      restrictions: []
    };
  }
}