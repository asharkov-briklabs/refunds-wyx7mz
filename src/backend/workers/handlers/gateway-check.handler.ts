import { logger } from '../../../common/utils/logger';
import { metrics } from '../../../common/utils/metrics';
import { RefundStatus } from '../../../common/enums/refund-status.enum';
import { GatewayError } from '../../../common/errors/gateway-error';
import { errorCodes } from '../../../common/constants/error-codes';
import refundRequestRepository from '../../../database/repositories/refund-request.repo';
import gatewayIntegrationService from '../../../services/gateway-integration/gateway-integration.service';
import notificationService from '../../../services/notification-service/notification.service';
import config from '../../../config';

/**
 * Main handler function that checks the status of refunds with payment gateways and updates their status
 * @param batchSize 
 * @param userId 
 * @returns Statistics about the processed refunds
 */
export const checkGatewayStatus = async (batchSize: number, userId: string): Promise<{
  processed: number;
  completed: number;
  failed: number;
  pending: number;
  errors: number;
}> => {
  logger.info('Starting gateway status check operation', { userId });

  let processed = 0;
  let completed = 0;
  let failed = 0;
  let pending = 0;
  let errors = 0;

  const stopTimer = metrics.startTimer('gateway_check.duration');

  const defaultBatchSize = config.jobs.gatewayCheckBatchSize || 50;
  const finalBatchSize = batchSize || defaultBatchSize;

  try {
    // Query for refunds in GATEWAY_PENDING status with limit
    const pendingRefunds = await refundRequestRepository.findByStatus(RefundStatus.GATEWAY_PENDING, { limit: finalBatchSize });

    // Query for refunds in GATEWAY_ERROR status with limit that are eligible for retry
    const retryableRefunds = await refundRequestRepository.findByStatus(RefundStatus.GATEWAY_ERROR, { limit: finalBatchSize });

    // Combine results from both queries
    const refunds = [...pendingRefunds.results, ...retryableRefunds.results];

    // Process each refund sequentially
    for (const refundRequest of refunds) {
      processed++;

      try {
        // Extract gateway type and refund ID
        const gatewayType = refundRequest.refundMethod;
        const refundId = refundRequest.refundRequestId;

        // Call gatewayIntegrationService to check status with payment gateway
        const gatewayResponse = await gatewayIntegrationService.checkRefundStatus(refundId, refundRequest.merchantId, gatewayType);

        // Based on gateway response, update refund status appropriately
        const newStatus = await processRefundStatusUpdate(refundRequest, gatewayResponse, userId);

        if (newStatus === RefundStatus.COMPLETED) {
          completed++;
        } else if (newStatus === RefundStatus.FAILED) {
          failed++;
        } else {
          pending++;
        }
      } catch (error) {
        errors++;
        // Handle gateway error
        const resultingStatus = await handleStatusCheckError(refundRequest, error, userId);
        if (resultingStatus === RefundStatus.FAILED) {
          failed++;
        } else {
          pending++;
        }
      }
    }
  } catch (error) {
    logger.error('Error during gateway status check operation', { error });
  } finally {
    stopTimer({ processed, completed, failed, pending, errors });
    logger.info('Gateway status check operation completed', { processed, completed, failed, pending, errors });
    return { processed, completed, failed, pending, errors };
  }
};

/**
 * Processes a single refund status update based on the gateway status check result
 * @param refundRequest 
 * @param gatewayResponse 
 * @param userId 
 * @returns The updated status of the refund
 */
export const processRefundStatusUpdate = async (refundRequest: any, gatewayResponse: any, userId: string): Promise<string> => {
  // Extract the gateway status from the response
  const gatewayStatus = gatewayResponse.status;
  logger.info(`Received gateway status: ${gatewayStatus} for refund ${refundRequest.refundRequestId}`);

  // Map the gateway status to corresponding RefundStatus
  let newStatus: RefundStatus;
  if (gatewayStatus === 'COMPLETED') {
    newStatus = RefundStatus.COMPLETED;
  } else if (gatewayStatus === 'FAILED') {
    newStatus = RefundStatus.FAILED;
  } else {
    newStatus = RefundStatus.GATEWAY_PENDING;
  }

  // Update the refund status in the database
  await refundRequestRepository.updateStatus(refundRequest.refundRequestId, newStatus, userId);

  // Send appropriate notification based on the status change
  await notificationService.sendNotification(
    newStatus === RefundStatus.COMPLETED ? 'REFUND_COMPLETED' : 'REFUND_FAILED',
    refundRequest.merchantId,
    'EMAIL',
    {
      refundId: refundRequest.refundRequestId,
      transactionId: refundRequest.transactionId,
      amount: refundRequest.amount,
      currency: refundRequest.currency
    }
  );

  return newStatus;
};

/**
 * Handles errors encountered during refund status checks with payment gateways
 * @param refundRequest 
 * @param error 
 * @param userId 
 * @returns The resulting status after error handling
 */
export const handleStatusCheckError = async (refundRequest: any, error: Error, userId: string): Promise<string> => {
  // Log the error encountered during gateway status check
  logger.error(`Error during gateway status check for refund ${refundRequest.refundRequestId}`, { error });

  // Check if the error is retryable (temporary gateway issue)
  if (isRetryableError(error, refundRequest)) {
    // If retryable, keep status as GATEWAY_ERROR for future retry
    logger.warn(`Retryable error encountered, keeping status as GATEWAY_ERROR for refund ${refundRequest.refundRequestId}`);
    return RefundStatus.GATEWAY_ERROR;
  } else {
    // If non-retryable or max retries exceeded, update to FAILED
    logger.error(`Non-retryable error encountered, updating status to FAILED for refund ${refundRequest.refundRequestId}`);
    await refundRequestRepository.updateStatus(refundRequest.refundRequestId, RefundStatus.FAILED, userId);

    // Send notification if status changed to FAILED
    await notificationService.sendNotification(
      'REFUND_FAILED',
      refundRequest.merchantId,
      'EMAIL',
      {
        refundId: refundRequest.refundRequestId,
        transactionId: refundRequest.transactionId,
        amount: refundRequest.amount,
        currency: refundRequest.currency,
        errorReason: error.message
      }
    );
    // Record error metrics
    metrics.incrementCounter('gateway_check.error', 1, { error_type: error.name });
    return RefundStatus.FAILED;
  }
};

/**
 * Determines if an error encountered during gateway status check can be retried
 * @param error 
 * @param refundRequest 
 * @returns True if the error is retryable, false otherwise
 */
export const isRetryableError = (error: Error, refundRequest: any): boolean => {
  // Check if the error is a GatewayError with retryable flag
  if (error instanceof GatewayError && error.retryable) {
    return true;
  }

  // Check if specific retryable error codes are present
  if (error.message.includes('timeout') || error.message.includes('connection refused')) {
    return true;
  }

  // Check the current retry count from refund metadata
  const retryCount = refundRequest.metadata?.retryCount || 0;

  // Compare retry count against configuration maximum
  const maxRetries = config.jobs.gatewayCheckMaxRetries || 3;
  if (retryCount >= maxRetries) {
    return false; // Max retries exceeded
  }

  return true; // Retryable and under max retry count
};

/**
 * Increments the retry count for a refund request in GATEWAY_ERROR status
 * @param refundRequest 
 * @returns Resolves when the retry count has been updated
 */
export const incrementRetryCount = async (refundRequest: any): Promise<void> => {
  // Extract current retry count from refund metadata or default to 0
  const retryCount = refundRequest.metadata?.retryCount || 0;

  // Increment the retry count
  const newRetryCount = retryCount + 1;

  // Update the refund metadata with new retry count
  refundRequest.metadata = {
    ...refundRequest.metadata,
    retryCount: newRetryCount,
  };

  // Save the updated refund request to the database
  await refundRequestRepository.update(refundRequest);

  logger.info(`Incremented retry count for refund ${refundRequest.refundRequestId}`, { retryCount: newRetryCount });
};

export default checkGatewayStatus;