import { v4 as uuidv4 } from 'uuid'; // uuid@^9.0.0
import { logger, setCorrelationId } from '../../common/utils/logger';
import { metrics } from '../../common/utils/metrics';
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
} from '../../common/interfaces/notification.interface';
import { handleNotification, handleBulkNotifications } from '../handlers/notification.handler';
import { processScheduledNotifications, retryFailedNotifications } from '../../services/notification-service/notification.service';
import sqsConfig from '../../config/sqs';

// Define global constants for retry logic
const MAX_RETRY_ATTEMPTS = 3;
const MAX_RETRY_AGE_HOURS = 24;

/**
 * Processes a notification message from an SQS queue. This is the main entry point called by the worker processor when a notification message is received.
 * @param message - The SQS message object containing notification data
 * @returns Promise<boolean> - Returns true if notification was delivered successfully, false otherwise
 */
export const sendNotificationsJob = async (message: any): Promise<boolean> => {
  // Step 1: Validate that message contains required notification data
  if (!validateNotificationMessage(message)) {
    logger.error('Invalid notification message format', { message });
    return false;
  }

  // Step 2: Extract notification type, recipient, channel, and context from message
  let notificationType: NotificationType;
  let recipient: string;
  let channel: NotificationChannel;
  let context: Record<string, any>;

  try {
    const messageBody = typeof message.Body === 'string' ? JSON.parse(message.Body) : message.Body;
    notificationType = messageBody.notificationType;
    recipient = messageBody.recipient;
    channel = messageBody.channel;
    context = messageBody.context;
  } catch (error) {
    logger.error('Error parsing notification message', { message, error });
    return false;
  }

  // Step 3: Start a timer for metrics tracking
  const stopTimer = metrics.startTimer('notification.process', { notificationType, channel });

  // Step 4: Log the start of notification processing
  logger.info('Starting notification processing', { notificationType, recipient, channel });

  try {
    // Step 5: Call handleNotification with the extracted notification data
    const success = await handleNotification(notificationType, recipient, channel, context);

    // Step 6: Track result metrics (success or failure)
    if (success) {
      metrics.recordSuccess('notification.process', { notificationType, channel });
    } else {
      metrics.recordError('notification.process', 'NotificationFailed', { notificationType, channel });
    }

    // Step 7: Log completion status of the notification delivery
    logger.info(`Notification processing completed with status: ${success}`, { notificationType, recipient, channel });

    // Step 8: Return true if successful, false if failed
    stopTimer({ status: success ? 'success' : 'error' });
    return success;
  } catch (error: any) {
    // Log error details
    logger.error('Error processing notification', { notificationType, recipient, channel, error });

    // Record error metrics
    metrics.recordError('notification.process', error.name, { notificationType, channel });

    // Record processing duration with error status
    stopTimer({ status: 'error', error_type: error.name, error_message: error.message });

    // Return false to indicate failure
    return false;
  }
};

/**
 * Processes notifications that are scheduled for delivery and have reached their delivery time. Called on a schedule to check for pending scheduled notifications.
 * @returns Promise<number> - Number of notifications processed
 */
export const processScheduledNotificationsJob = async (): Promise<number> => {
  // Step 1: Log the start of scheduled notifications processing
  logger.info('Starting scheduled notifications processing');

  // Step 2: Start a timer for metrics tracking
  const stopTimer = metrics.startTimer('notification.scheduled.process');

  try {
    // Step 3: Call processScheduledNotifications from the notification service
    const processedCount = await processScheduledNotifications();

    // Step 4: Log the number of notifications processed
    logger.info(`Processed ${processedCount} scheduled notifications`);

    // Step 5: Record metrics for processing time and count
    metrics.recordHistogram('notification.scheduled.process.count', processedCount);
    metrics.recordSuccess('notification.scheduled.process');

    // Step 6: Return the count of processed notifications
    stopTimer({ status: 'success' });
    return processedCount;
  } catch (error: any) {
    // Step 7: Handle any errors during processing
    logger.error('Error processing scheduled notifications', { error });
    metrics.recordError('notification.scheduled.process', error.name, { error_message: error.message });
    stopTimer({ status: 'error', error_type: error.name, error_message: error.message });
    return 0;
  }
};

/**
 * Retries failed notifications that meet the retry criteria based on failure time and attempt count.
 * @returns Promise<number> - Number of notifications retried
 */
export const retryFailedNotificationsJob = async (): Promise<number> => {
  // Step 1: Log the start of retry processing for failed notifications
  logger.info('Starting retry processing for failed notifications');

  // Step 2: Start a timer for metrics tracking
  const stopTimer = metrics.startTimer('notification.retry.process');

  try {
    // Step 3: Call retryFailedNotifications with MAX_RETRY_ATTEMPTS and MAX_RETRY_AGE_HOURS
    const retriedCount = await retryFailedNotifications(MAX_RETRY_ATTEMPTS, MAX_RETRY_AGE_HOURS);

    // Step 4: Log the number of notifications retried
    logger.info(`Retried ${retriedCount} failed notifications`);

    // Step 5: Record metrics for retry processing time and count
    metrics.recordHistogram('notification.retry.process.count', retriedCount);
    metrics.recordSuccess('notification.retry.process');

    // Step 6: Return the count of retried notifications
    stopTimer({ status: 'success' });
    return retriedCount;
  } catch (error: any) {
    // Step 7: Handle any errors during retry processing
    logger.error('Error retrying failed notifications', { error });
    metrics.recordError('notification.retry.process', error.name, { error_message: error.message });
    stopTimer({ status: 'error', error_type: error.name, error_message: error.message });
    return 0;
  }
};

/**
 * Validates that an incoming SQS message contains the required notification information.
 * @param message - The SQS message object
 * @returns boolean - True if message is valid, false otherwise
 */
const validateNotificationMessage = (message: any): boolean => {
  // Step 1: Check if message has a body property
  if (!message || !message.Body) {
    logger.error('SQS message missing body');
    return false;
  }

  let messageBody;
  try {
    // Step 2: Parse message body if it's a string
    messageBody = typeof message.Body === 'string' ? JSON.parse(message.Body) : message.Body;
  } catch (error) {
    logger.error('Error parsing SQS message body', { error });
    return false;
  }

  // Step 3: Verify that body contains a payload property
  if (!messageBody || !messageBody.notificationType || !messageBody.recipient || !messageBody.channel) {
    logger.error('SQS message body missing required fields', { messageBody });
    return false;
  }

  // Step 4: Confirm payload contains notificationType, recipient, and channel
  if (!messageBody.notificationType || !messageBody.recipient || !messageBody.channel) {
    logger.error('SQS message payload missing required fields', { messageBody });
    return false;
  }

  // Step 5: Return true if all validations pass, false otherwise
  return true;
};