import { logger } from '../../../common/utils/logger';
import { metrics } from '../../../common/utils/metrics';
import { RefundStatus } from '../../../common/enums/refund-status.enum';
import { GatewayError } from '../../../common/errors/gateway-error';
import { BusinessError } from '../../../common/errors/business-error';
import { errorCodes } from '../../../common/constants/error-codes';
import refundRequestManager from '../../../services/refund-request-manager/refund-request-manager.service';
import paymentMethodHandlerService from '../../../services/payment-method-handler/payment-method-handler.service';
import notificationService from '../../../services/notification-service/notification.service';

/**
 * Main handler function that processes a refund request asynchronously
 * @param refundRequestId 
 * @param userId 
 * @returns Returns true if processing was successful, false otherwise
 */
export const processRefundRequest = async (refundRequestId: string, userId: string): Promise<boolean> => {
  // LD1: Start a metrics timer for tracking processing duration
  const stopTimer = metrics.startTimer('refund_processing.duration', { refundRequestId });

  // LD1: Log the start of refund processing with refundRequestId
  logger.info(`Starting refund processing for request ${refundRequestId}`, { refundRequestId });

  try {
    // LD1: Retrieve the refund request from refundRequestManager
    const refundRequest = await refundRequestManager.getRefundRequest(refundRequestId);

    // LD1: Check that refund request exists and is in PROCESSING status
    if (!refundRequest || refundRequest.status !== RefundStatus.PROCESSING) {
      logger.error(`Refund request not found or not in PROCESSING status: ${refundRequestId}`);
      return false;
    }

    // LD1: Retrieve the original transaction using paymentMethodHandlerService
    const transaction = await paymentMethodHandlerService.getTransactionForRefund(refundRequest.transactionId);

    // LD1: Try to process the refund using the appropriate payment method handler
    const processingResult = await paymentMethodHandlerService.processRefund(refundRequest, transaction);

    if (processingResult.success) {
      // LD1: On success, update refund status to COMPLETED
      await refundRequestManager.updateRefundStatus(refundRequestId, RefundStatus.COMPLETED, userId, 'Refund processed successfully');

      // LD1: Record success metrics and send notification
      metrics.incrementCounter('refund_processing.success', 1, { refundRequestId });
      notificationService.sendNotification('REFUND_COMPLETED', userId, 'EMAIL', { refundId: refundRequestId });

      // LD1: Return true to indicate successful processing
      logger.info(`Refund processed successfully: ${refundRequestId}`);
      stopTimer({ status: 'success' });
      return true;
    } else if (processingResult.status === 'GATEWAY_PENDING') {
      // LD1: On gateway pending status, update refund status to GATEWAY_PENDING
      await refundRequestManager.updateRefundStatus(refundRequestId, RefundStatus.GATEWAY_PENDING, userId, 'Refund pending at gateway');

      // LD1: Record success metrics and send notification
      metrics.incrementCounter('refund_processing.gateway_pending', 1, { refundRequestId });
      notificationService.sendNotification('REFUND_GATEWAY_PENDING', userId, 'EMAIL', { refundId: refundRequestId });

      // LD1: Return true to indicate successful processing
      logger.info(`Refund pending at gateway: ${refundRequestId}`);
      stopTimer({ status: 'gateway_pending' });
      return true;
    } else {
      // LD1: Catch and handle errors appropriately based on error type
      return await handleNonRetryableError(refundRequestId, processingResult.error, userId);
    }
  } catch (error: any) {
    // LD1: Catch and handle errors appropriately based on error type
    if (error instanceof GatewayError && error.retryable) {
      return await handleRetryableError(refundRequestId, error, userId);
    } else {
      return await handleNonRetryableError(refundRequestId, error, userId);
    }
  }
};

/**
 * Handles retryable errors encountered during refund processing
 * @param refundRequestId 
 * @param error 
 * @param userId 
 * @returns Returns false to indicate processing failure with retry possibility
 */
export const handleRetryableError = async (refundRequestId: string, error: Error, userId: string): Promise<boolean> => {
  // LD1: Log the retryable error details
  logger.error(`Retryable error encountered during refund processing: ${refundRequestId}`, { error: error.message, stack: error.stack });

  // LD1: Update refund status to GATEWAY_ERROR to indicate retryable failure
  await refundRequestManager.updateRefundStatus(refundRequestId, RefundStatus.GATEWAY_ERROR, userId, `Retryable error: ${error.message}`);

  // LD1: Record error metrics for monitoring
  metrics.incrementCounter('refund_processing.retryable_error', 1, { refundRequestId });

  // LD1: Send notification about temporary processing issue
  notificationService.sendNotification('REFUND_PROCESSING_DELAYED', userId, 'EMAIL', { refundId: refundRequestId, error: error.message });

  // LD1: Return false to indicate processing failure that can be retried
  return false;
};

/**
 * Handles non-retryable errors encountered during refund processing
 * @param refundRequestId 
 * @param error 
 * @param userId 
 * @returns Returns false to indicate processing failure without retry possibility
 */
export const handleNonRetryableError = async (refundRequestId: string, error: Error, userId: string): Promise<boolean> => {
  // LD1: Log the non-retryable error details
  logger.error(`Non-retryable error encountered during refund processing: ${refundRequestId}`, { error: error.message, stack: error.stack });

  // LD1: Update refund status to FAILED to indicate permanent failure
  await refundRequestManager.updateRefundStatus(refundRequestId, RefundStatus.FAILED, userId, `Non-retryable error: ${error.message}`);

  // LD1: Record error metrics for monitoring
  metrics.incrementCounter('refund_processing.non_retryable_error', 1, { refundRequestId });

  // LD1: Send notification about refund failure
  notificationService.sendNotification('REFUND_FAILED', userId, 'EMAIL', { refundId: refundRequestId, error: error.message });

  // LD1: Return false to indicate processing failure that should not be retried
  return false;
};

/**
 * Determines if an error encountered during refund processing can be retried
 * @param error 
 * @returns Returns true if the error is retryable, false otherwise
 */
export const isRetryableError = (error: Error): boolean => {
  // LD1: Check if error is an instance of GatewayError with retryable flag
  if (error instanceof GatewayError && error.retryable) {
    return true;
  }

  // LD1: Check for specific error codes that indicate transient issues
  const retryableErrorCodes = [
    errorCodes.GATEWAY_TIMEOUT,
    errorCodes.SERVICE_UNAVAILABLE,
  ];
  if (retryableErrorCodes.includes((error as any).code)) {
    return true;
  }

  // LD1: Check for network or timeout related errors
  const errorMessage = error.message.toLowerCase();
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('network error') ||
    errorMessage.includes('service unavailable')
  ) {
    return true;
  }

  // LD1: Return false for permanent errors like validation failures or business rule violations
  return false;
};