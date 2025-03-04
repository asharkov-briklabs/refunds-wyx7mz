// LD1: Import necessary modules and dependencies
import { logger } from '../../../common/utils/logger'; // Logging utility
import { metrics } from '../../../common/utils/metrics'; // Metrics tracking utility
import { RefundStatus } from '../../../common/enums/refund-status.enum'; // Enum for refund statuses
import getQueueManager from '../queue-manager'; // Queue manager for SQS operations
import { processRefundRequest } from '../handlers/refund-processor.handler'; // Core function to process refund requests
import refundRequestRepository from '../../../database/repositories/refund-request.repo'; // Repository for refund request data
import sqsConfig from '../../../config/sqs'; // Configuration for SQS

/**
 * Validates that an incoming SQS message contains the required refund request information.
 * @param message The SQS message object
 * @returns True if message is valid, false otherwise
 */
const validateMessage = (message: any): boolean => {
  // LD1: Check if message has a body property
  if (!message.Body) {
    logger.error('Invalid SQS message: Missing body');
    return false;
  }

  let body: any;
  try {
    // LD1: Parse message body if it's a string
    body = typeof message.Body === 'string' ? JSON.parse(message.Body) : message.Body;
  } catch (error) {
    logger.error('Invalid SQS message: Failed to parse body', { error });
    return false;
  }

  // LD1: Verify that body contains a payload property
  if (!body.payload) {
    logger.error('Invalid SQS message: Missing payload');
    return false;
  }

  // LD1: Confirm payload contains refundRequestId
  if (!body.payload.refundRequestId) {
    logger.error('Invalid SQS message: Missing refundRequestId in payload');
    return false;
  }

  // LD1: Return true if all validations pass, false otherwise
  return true;
};

/**
 * Processes a refund request from an SQS message. This is the main entry point called by the worker processor when a refund message is received from the queue.
 * @param message The SQS message object
 * @returns Promise<boolean> Returns true if processing was successful, false if it failed
 */
export const processRefundsJob = async (message: any): Promise<boolean> => {
  // LD1: Extract refundRequestId and metadata from message payload
  if (!validateMessage(message)) {
    return false;
  }

  const refundRequestId = message.Body.payload.refundRequestId;
  const metadata = message.Body.payload.metadata;

  // LD1: Start a timer for metrics tracking
  const stopTimer = metrics.startTimer('process_refunds_job.duration', { refundRequestId });

  // LD1: Log the start of refund processing for the extracted refundRequestId
  logger.info(`Starting to process refund from SQS queue for refundRequestId: ${refundRequestId}`, { refundRequestId, metadata });

  // LD1: Get the userId from message or use 'system' as default
  const userId = message.Body.payload.userId || 'system';

  try {
    // LD1: Call processRefundRequest with the refundRequestId and userId
    const success = await processRefundRequest(refundRequestId, userId);

    // LD1: Track result metrics (success or failure)
    metrics.incrementCounter(`process_refunds_job.success`, 1, { refundRequestId });

    // LD1: Log completion status of the refund
    logger.info(`Successfully processed refund from SQS queue for refundRequestId: ${refundRequestId}`, { refundRequestId, userId });
    stopTimer({ status: 'success' });

    // LD1: Return true if successful, false otherwise
    return success;
  } catch (error: any) {
    // LD1: Track result metrics (success or failure)
    metrics.incrementCounter(`process_refunds_job.failure`, 1, { refundRequestId });

    // LD1: Log the error
    logger.error(`Error processing refund from SQS queue for refundRequestId: ${refundRequestId}`, { refundRequestId, userId, error: error.message });
    stopTimer({ status: 'error', error: error.message });

    // LD1: Return true if successful, false otherwise
    return false;
  }
};

/**
 * Processes a batch of pending refund requests directly from the database. This function is typically called on a schedule to handle any refunds that may not have been processed through the queue.
 * @param batchSize The number of refund requests to process in each batch
 * @returns Processing statistics including counts of total processed, succeeded, and failed refunds
 */
export const processRefundBatch = async (batchSize?: number): Promise<{ processed: number; succeeded: number; failed: number }> => {
  // LD1: Get batch size from parameter or default from configuration
  const actualBatchSize = batchSize || sqsConfig.batchSize || 10;

  // LD1: Start a timer for batch metrics tracking
  const stopTimer = metrics.startTimer('process_refund_batch.duration', { batchSize: actualBatchSize });

  // LD1: Log start of batch processing
  logger.info(`Starting batch processing of pending refunds from database with batch size: ${actualBatchSize}`);

  try {
    // LD1: Retrieve pending refund requests from repository using findPendingProcessing
    const pendingRefunds = await refundRequestRepository.findPendingProcessing(actualBatchSize);

    // LD1: Log the number of refunds found for processing
    logger.info(`Found ${pendingRefunds.length} pending refunds for batch processing`);

    // LD1: Initialize counters for statistics (processed, succeeded, failed)
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    // LD1: Process each refund sequentially using processRefundRequest
    for (const refund of pendingRefunds) {
      processed++;
      try {
        // LD1: Call processRefundRequest with the refundRequestId
        const success = await processRefundRequest(refund.refundRequestId, 'system');

        // LD1: Track individual results and update counters
        if (success) {
          succeeded++;
        } else {
          failed++;
        }
      } catch (error: any) {
        // LD1: Track individual results and update counters
        failed++;

        // LD1: Log the error
        logger.error(`Error processing refund ${refund.refundRequestId} in batch: ${error.message}`, { refundId: refund.refundRequestId, error: error.message });
      }
    }

    // LD1: Log completion of batch processing with statistics
    logger.info(`Completed batch processing of pending refunds. Processed: ${processed}, Succeeded: ${succeeded}, Failed: ${failed}`);

    // LD1: Record batch processing metrics
    metrics.recordHistogram('process_refund_batch.processed', processed, { result: 'processed' });
    metrics.recordHistogram('process_refund_batch.succeeded', succeeded, { result: 'succeeded' });
    metrics.recordHistogram('process_refund_batch.failed', failed, { result: 'failed' });
    stopTimer({ status: 'completed' });

    // LD1: Return statistics object with counts
    return { processed, succeeded, failed };
  } catch (error: any) {
    // LD1: Log the error
    logger.error(`Error in batch processing of pending refunds: ${error.message}`, { error: error.message });
    stopTimer({ status: 'error', error: error.message });

    // LD1: Return statistics object with counts
    return { processed: 0, succeeded: 0, failed: 0 };
  }
};