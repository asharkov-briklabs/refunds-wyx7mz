import { ApprovalWorkflowService } from '../../services/approval-workflow-engine'; // Import the ApprovalWorkflowService class
import { IApprovalRequest } from '../../common/interfaces/approval.interface'; // Import the IApprovalRequest interface
import { IApprover } from '../../common/interfaces/approval.interface'; // Import the IApprover interface
import { ApprovalStatus } from '../../common/enums/approval-status.enum'; // Import the ApprovalStatus enum
import { NotificationType, NotificationChannel } from '../../common/interfaces/notification.interface'; // Import the NotificationType and NotificationChannel enums
import { logger } from '../../common/utils/logger'; // Import the logger object
import { metrics } from '../../common/utils/metrics'; // Import the metrics object
import { sendNotification, sendBulkNotifications } from '../../services/notification-service'; // Import the sendNotification function
import { config } from '../../config'; // Import the config object

/**
 * Processes a batch of pending approval requests
 * @param batchSize The number of approval requests to process in a single batch
 * @returns The number of approval requests successfully processed
 */
export const processApprovals = async (batchSize: number): Promise<number> => {
  // Log the start of approval processing with batch size
  logger.info('Starting approval processing', { batchSize });

  // Set default batch size if not provided
  const size = batchSize || config.approvals.defaultBatchSize || 100;

  // Get pending approvals from ApprovalWorkflowService
  const pendingApprovals: IApprovalRequest[] = await ApprovalWorkflowService.getPendingApprovals(size);

  // Log the number of pending approvals found
  logger.info(`Found ${pendingApprovals.length} pending approvals`);

  // Skip processing if no pending approvals
  if (!pendingApprovals || pendingApprovals.length === 0) {
    logger.info('No pending approvals found, skipping processing');
    return 0;
  }

  let processedCount = 0;

  // Process each approval request: validate status and send notifications to approvers
  for (const approval of pendingApprovals) {
    try {
      // Validate approval status is PENDING
      if (approval.status !== ApprovalStatus.PENDING) {
        logger.warn(`Approval ${approval.approvalId} is not in PENDING state, skipping`);
        continue;
      }

      // Send notifications to approvers
      await sendApprovalNotifications(approval);

      processedCount++;
    } catch (error: any) {
      // Log any errors that occur during processing
      logger.error(`Error processing approval ${approval.approvalId}: ${error.message}`);
    }
  }

  // Track metrics for the processed approval requests
  metrics.increment('approvals.processed', processedCount);

  // Log completion with number of successfully processed approvals
  logger.info(`Successfully processed ${processedCount} approvals`);

  // Return the count of processed approvals
  return processedCount;
};

/**
 * Processes approval requests that have reached their escalation deadline
 * @param batchSize The number of approval requests to escalate
 * @returns The number of approval requests escalated
 */
export const processEscalations = async (batchSize: number): Promise<number> => {
  // Log the start of approval escalation processing
  logger.info('Starting approval escalation processing', { batchSize });

  // Set default batch size if not provided
  const size = batchSize || config.approvals.defaultBatchSize || 100;

  // Run escalation check via ApprovalWorkflowService to get/process due escalations
  const escalatedCount = await ApprovalWorkflowService.runEscalationCheck(size);

  // Track metrics for escalation operations
  metrics.increment('approvals.escalated', escalatedCount);

  // Log completion with number of escalated approvals
  logger.info(`Successfully escalated ${escalatedCount} approvals`);

  // Return the count of escalated approvals
  return escalatedCount;
};

/**
 * Sends reminder notifications to approvers with pending approval requests
 * @param batchSize The number of reminders to send in a single batch
 * @returns The number of reminder notifications sent
 */
export const processReminders = async (batchSize: number): Promise<number> => {
  // Log the start of approval reminder processing
  logger.info('Starting approval reminder processing', { batchSize });

  // Set default batch size if not provided
  const size = batchSize || config.approvals.defaultBatchSize || 100;

  // Get approvers needing reminders from ApprovalWorkflowService
  const approversNeedingReminders: IApprover[] = await ApprovalWorkflowService.getApproversNeedingReminders(size);

  // Skip if no approvers need reminders
  if (!approversNeedingReminders || approversNeedingReminders.length === 0) {
    logger.info('No approvers need reminders, skipping processing');
    return 0;
  }

  // Prepare reminder notifications for each approver
  const notifications = approversNeedingReminders.map(approver => ({
    notificationType: NotificationType.APPROVAL_REMINDER,
    recipient: approver.approverId,
    channel: NotificationChannel.EMAIL,
    context: {
      approverId: approver.approverId,
      approvalId: approver.approvalId,
    }
  }));

  // Send reminders in bulk using sendBulkNotifications
  await sendBulkNotifications(notifications);

  // Track metrics for reminder operations
  metrics.increment('approvals.remindersSent', notifications.length);

  // Log completion with number of reminders sent
  logger.info(`Successfully sent ${notifications.length} reminders`);

  // Return the count of reminders sent
  return notifications.length;
};

/**
 * Sends approval request notifications to designated approvers
 * @param approval The approval request
 * @returns True if notifications were sent successfully
 */
const sendApprovalNotifications = async (approval: IApprovalRequest): Promise<boolean> => {
  // Extract approvers from the approval request
  const approvers = approval.approvers;

  // Filter approvers based on current escalation level
  const currentLevelApprovers = approvers.filter(approver => approver.escalationLevel === approval.escalationLevel);

  // Skip if no approvers at current level
  if (!currentLevelApprovers || currentLevelApprovers.length === 0) {
    logger.info(`No approvers at current level ${approval.escalationLevel}, skipping notifications`);
    return true;
  }

  // Prepare notification context with approval and refund details
  const context = prepareApprovalContext(approval);

  // Send notifications to each approver via email and in-app channels
  for (const approver of currentLevelApprovers) {
    try {
      await sendNotification(NotificationType.APPROVAL_REQUESTED, approver.approverId, NotificationChannel.EMAIL, context);
      await sendNotification(NotificationType.APPROVAL_REQUESTED, approver.approverId, NotificationChannel.IN_APP, context);
      logger.info(`Sent approval request notification to approver ${approver.approverId}`);
    } catch (error: any) {
      logger.error(`Error sending approval request notification to approver ${approver.approverId}: ${error.message}`);
    }
  }

  // Track metrics for notification operations
  metrics.increment('approvals.notificationsSent', currentLevelApprovers.length);

  // Return true if notifications were sent successfully, false otherwise
  return true;
};

/**
 * Sends escalation notifications when an approval is escalated
 * @param approval The approval request
 * @returns True if notifications were sent successfully
 */
const sendEscalationNotifications = async (approval: IApprovalRequest): Promise<boolean> => {
  // Extract approvers from the approval request for the current escalation level
  const approvers = approval.approvers.filter(approver => approver.escalationLevel === approval.escalationLevel);

  // Skip if no approvers at current level
  if (!approvers || approvers.length === 0) {
    logger.info(`No approvers at current level ${approval.escalationLevel}, skipping escalation notifications`);
    return true;
  }

  // Prepare notification context with approval, refund details and escalation info
  const context = prepareApprovalContext(approval);

  // Send escalation notifications to each approver via email and in-app channels
  for (const approver of approvers) {
    try {
      await sendNotification(NotificationType.APPROVAL_ESCALATED, approver.approverId, NotificationChannel.EMAIL, context);
      await sendNotification(NotificationType.APPROVAL_ESCALATED, approver.approverId, NotificationChannel.IN_APP, context);
      logger.info(`Sent escalation notification to approver ${approver.approverId}`);
    } catch (error: any) {
      logger.error(`Error sending escalation notification to approver ${approver.approverId}: ${error.message}`);
    }
  }

  // Track metrics for escalation notification operations
  metrics.increment('approvals.escalationNotificationsSent', approvers.length);

  // Return true if notifications were sent successfully, false otherwise
  return true;
};

/**
 * Prepares the context data for approval notifications
 * @param approval The approval request
 * @param approver The approver
 * @returns Context object with approval and refund details for notification templates
 */
const prepareApprovalContext = (approval: IApprovalRequest): object => {
  // Extract relevant data from approval request
  const approvalId = approval.approvalId;
  const refundRequestId = approval.refundRequestId;
  const status = approval.status;
  const escalationLevel = approval.escalationLevel;

  // Get refund details for the approval
  const refundDetails = ApprovalWorkflowService.getApprovalRequestDetails(approvalId);

  // Format approval deadline and other time-sensitive information
  const deadline = new Date(); // TODO: Replace with actual deadline calculation

  // Construct approval URL for the approver
  const approvalUrl = `https://example.com/approvals/${approvalId}`; // TODO: Replace with actual approval URL

  // Return formatted context object for notification templates
  return {
    approvalId,
    refundRequestId,
    status,
    escalationLevel,
    deadline,
    approvalUrl,
    refundDetails,
  };
};

/**
 * Determines if an error during approval processing is retryable
 * @param error The error
 * @returns True if the error is retryable, false otherwise
 */
const isRetryableError = (error: Error): boolean => {
  // Check if error is a network, timeout, or temporary service error
  const message = error.message.toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('network error') ||
    message.includes('service unavailable')
  );
};