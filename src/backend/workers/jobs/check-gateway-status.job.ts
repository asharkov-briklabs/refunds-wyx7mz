import { logger } from '../../../common/utils/logger';
import { metrics } from '../../../common/utils/metrics';
import config from '../../../config';
import { gatewayCheckHandler } from '../handlers/gateway-check.handler';
import { RefundStatus } from '../../../common/enums/refund-status.enum';

const JOB_NAME = "CHECK_GATEWAY_STATUS";

/**
 * Main job function that checks status of refunds with payment gateways.
 * This function is triggered on a schedule or can be called directly with message data.
 * @param message 
 * @returns Promise that resolves to true if processing was successful, false otherwise
 */
export const checkGatewayStatus = async (message: any): Promise<boolean> => {
  logger.info('Starting gateway status check job', { message });

  const stopTimer = metrics.startTimer('job.check_gateway_status.duration');

  let batchSize = config.jobs.gatewayCheckBatchSize || 50;
  if (message && message.batchSize) {
    batchSize = message.batchSize;
  }

  try {
    const result = await gatewayCheckHandler(batchSize, 'system');

    stopTimer({
      processed: result.processed,
      completed: result.completed,
      failed: result.failed,
      pending: result.pending,
      errors: result.errors
    });

    logger.info('Gateway status check job completed', {
      processed: result.processed,
      completed: result.completed,
      failed: result.failed,
      pending: result.pending,
      errors: result.errors
    });

    return true;
  } catch (error) {
    logger.error('Error during gateway status check job', { error });
    stopTimer({ error: error.message });
    return false;
  }
};

/**
 * Executes a manual batch check of gateway statuses, useful for triggering from admin interfaces or scheduled tasks.
 * @param batchSize 
 * @returns Processing statistics including counts of refunds in different states
 */
export const processBatchedGatewayChecks = async (batchSize: number): Promise<{
  processed: number;
  completed: number;
  failed: number;
  pending: number;
  errors: number;
}> => {
  logger.info('Starting batch gateway status check', { batchSize });

  const stopTimer = metrics.startTimer('batch_gateway_check.duration');

  const finalBatchSize = batchSize || config.jobs.gatewayCheckBatchSize || 50;

  try {
    const result = await gatewayCheckHandler(finalBatchSize, 'system');

    stopTimer({
      processed: result.processed,
      completed: result.completed,
      failed: result.failed,
      pending: result.pending,
      errors: result.errors
    });

    logger.info('Batch gateway status check completed', {
      processed: result.processed,
      completed: result.completed,
      failed: result.failed,
      pending: result.pending,
      errors: result.errors
    });

    return result;
  } catch (error) {
    logger.error('Error during batch gateway status check', { error });
    stopTimer({ error: error.message });
    return { processed: 0, completed: 0, failed: 0, pending: 0, errors: 1 };
  }
};

export default checkGatewayStatus;