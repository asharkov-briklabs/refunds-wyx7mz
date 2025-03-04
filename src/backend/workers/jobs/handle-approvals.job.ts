import { setTimeout } from 'timers'; // built-in
import { ApprovalHandler } from '../handlers/approval.handler'; // Import the ApprovalHandler class
import { ApprovalWorkflowService } from '../../services/approval-workflow-engine/approval-workflow.service'; // Import the ApprovalWorkflowService class
import { logger } from '../../common/utils/logger'; // Import the logger object
import { config } from '../../config'; // Import the config object
import { metrics } from '../../common/utils/metrics'; // Import the metrics object

/**
 * Processes all pending approval requests that require action
 * @returns {Promise<void>} Asynchronous operation that completes when all pending approvals are processed
 */
async function processPendingApprovals(): Promise<void> {
  // LD1: Log the start of the approval processing job
  logger.info('Starting processPendingApprovals job');

  // LD2: Retrieve pending approval requests from ApprovalWorkflowService
  const pendingApprovals = await ApprovalWorkflowService.getPendingApprovals(config.approvals.defaultBatchSize);

  // LD2: Log the number of pending approvals retrieved
  logger.info(`Retrieved ${pendingApprovals.length} pending approvals`);

  // LD2: Process each pending approval using the ApprovalHandler
  const approvalHandler = new ApprovalHandler();
  for (const approval of pendingApprovals) {
    try {
      await approvalHandler.processApprovals(approval);
      metrics.increment('approvals.processed', 1);
    } catch (error: any) {
      logger.error(`Error processing approval ${approval.approvalId}: ${error.message}`);
    }
  }

  // LD2: Log the completion of the job with summary statistics
  logger.info('Completed processPendingApprovals job', { processed: pendingApprovals.length });
}

/**
 * Processes approval requests that have reached their escalation deadline
 * @returns {Promise<void>} Asynchronous operation that completes when all escalations are processed
 */
async function handleApprovalEscalations(): Promise<void> {
  // LD1: Log the start of the escalation handling job
  logger.info('Starting handleApprovalEscalations job');

  // LD2: Retrieve approval requests due for escalation from ApprovalWorkflowService
  const approvalWorkflowService = new ApprovalWorkflowService();
  const dueEscalations = await approvalWorkflowService.getDueEscalations(config.approvals.defaultBatchSize);

  // LD2: Log the number of approval requests due for escalation
  logger.info(`Retrieved ${dueEscalations.length} approval requests due for escalation`);

  // LD2: Process each escalation using the ApprovalHandler
  const approvalHandler = new ApprovalHandler();
  for (const escalation of dueEscalations) {
    try {
      await approvalHandler.handleEscalations(escalation);
      metrics.increment('approvals.escalated', 1);
    } catch (error: any) {
      logger.error(`Error handling escalation for approval ${escalation.approvalId}: ${error.message}`);
    }
  }

  // LD2: Log the completion of the job with summary statistics
  logger.info('Completed handleApprovalEscalations job', { escalated: dueEscalations.length });
}

/**
 * Main job function that is scheduled to run periodically to handle approvals
 * @returns {Promise<void>} Asynchronous operation that completes when the job is done
 */
async function scheduledJob(): Promise<void> {
  // LD1: Log the start of the scheduled approval job
  logger.info('Starting scheduled approval job');

  // LD2: Create a start time to measure job duration
  const startTime = Date.now();

  try {
    // LD3: Call processPendingApprovals to handle pending approval requests
    await processPendingApprovals();

    // LD3: Call handleApprovalEscalations to process any required escalations
    await handleApprovalEscalations();
  } catch (error: any) {
    // LD3: Handle any errors that occur during job execution
    logger.error(`Error during scheduled approval job: ${error.message}`);
  } finally {
    // LD4: Calculate and log the total job execution time
    const duration = Date.now() - startTime;
    logger.info('Scheduled approval job completed', { duration });
    metrics.timing('approvals.scheduled_job.duration', duration);

    // LD5: Schedule the next job run based on configuration settings
    const interval = config.approvals.interval || 60000; // Default to 60 seconds
    setTimeout(scheduledJob, interval);
    logger.info(`Next scheduled approval job will run in ${interval}ms`);
  }
}

// IE3: Export the main job function for scheduling
export default scheduledJob;