import { processRefundsJob, processRefundBatch } from './process-refunds.job';
import { checkGatewayStatus, processBatchedGatewayChecks } from './check-gateway-status.job';
import handleApprovals from './handle-approvals.job';
import { sendNotificationsJob, processScheduledNotificationsJob, retryFailedNotificationsJob } from './send-notifications.job';

/**
 * Centralized export file for all worker job functions used in the Refunds Service.
 * This file aggregates job handlers from individual job modules and exports them for use by the worker processor and scheduler.
 * It serves as the entry point for all asynchronous job processing in the system.
 */

// LD1, IE3: Export the processRefundsJob function for processing refund requests from the queue
export { processRefundsJob };

// LD1, IE3: Export the processRefundBatch function for batch processing of multiple refund requests
export { processRefundBatch };

// LD1, IE3: Export the checkGatewayStatus function for checking refund status with payment gateways
export { checkGatewayStatus };

// LD1, IE3: Export the processBatchedGatewayChecks function for batch checking of refund statuses with payment gateways
export { processBatchedGatewayChecks };

// LD1, IE3: Export the handleApprovals function for handling approval workflows and escalations
export { handleApprovals };

// LD1, IE3: Export the sendNotificationsJob function for sending notifications via different channels
export { sendNotificationsJob };

// LD1, IE3: Export the processScheduledNotificationsJob function for processing scheduled notifications
export { processScheduledNotificationsJob };

// LD1, IE3: Export the retryFailedNotificationsJob function for retrying failed notification deliveries
export { retryFailedNotificationsJob };