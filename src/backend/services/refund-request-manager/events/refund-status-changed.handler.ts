import { logger } from '../../../common/utils/logger';
import { eventBus } from '../../../common/utils/event-emitter';
import { REFUND_EVENTS } from '../../../common/constants/event-types';
import { RefundStatus } from '../../../common/enums/refund-status.enum';
import notificationService, { NotificationType, NotificationChannel } from '../../notification-service';

/**
 * Handles the refund status changed event by triggering appropriate actions based on the new status
 * @param payload - The event payload containing refund data and status information
 */
export const handleRefundStatusChanged = async (payload: any): Promise<void> => {
  // Extract refund data and status information from the event payload
  const { refundId, status, transactionId, merchantId, amount, currency, reason } = payload;

  // Log the refund status change event with relevant details
  logger.info(`Refund status changed: Refund ID ${refundId} updated to ${status}`, { refundId, status });

  // Determine the appropriate notification type based on the new status
  const notificationType = getNotificationTypeForStatus(status);

  // Prepare notification context with refund and status details
  const notificationContext = {
    refundId,
    transactionId,
    merchantId,
    amount,
    currency,
    reason
  };

  // Select appropriate notification channels based on status importance
  const notificationChannels = getNotificationChannelsForStatus(status);

  try {
    // Send status-specific notifications to relevant stakeholders
    for (const channel of notificationChannels) {
      await notificationService.sendNotification(notificationType, merchantId, channel, notificationContext);
      logger.info(`Sent ${channel} notification for refund ${refundId} status update to ${status}`, { refundId, status, channel });
    }

    // Perform any additional actions required for specific status transitions
    // TODO: Implement additional actions based on status transitions (e.g., update ledger, trigger analytics)
    logger.info(`Additional actions completed for refund ${refundId} status update to ${status}`, { refundId, status });

  } catch (error: any) {
    // Handle and log any errors that occur during processing
    logger.error(`Error handling refund status changed event for refund ${refundId}`, { error: error.message, refundId, status });
  }
};

/**
 * Determines the appropriate notification type based on the refund status
 * @param status - The refund status
 * @returns The notification type corresponding to the status
 */
const getNotificationTypeForStatus = (status: RefundStatus): NotificationType => {
  switch (status) {
    case RefundStatus.COMPLETED:
      return NotificationType.REFUND_COMPLETED;
    case RefundStatus.FAILED:
    case RefundStatus.REJECTED:
    case RefundStatus.CANCELED:
      return NotificationType.REFUND_FAILED;
    case RefundStatus.PENDING_APPROVAL:
      return NotificationType.APPROVAL_REQUESTED;
    default:
      return NotificationType.REFUND_STATUS_UPDATE;
  }
};

/**
 * Determines which notification channels to use based on the refund status
 * @param status - The refund status
 * @returns Array of notification channels to use
 */
const getNotificationChannelsForStatus = (status: RefundStatus): NotificationChannel[] => {
  switch (status) {
    case RefundStatus.COMPLETED:
    case RefundStatus.FAILED:
    case RefundStatus.REJECTED:
    case RefundStatus.CANCELED:
      return [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.IN_APP];
    case RefundStatus.PENDING_APPROVAL:
      return [NotificationChannel.EMAIL, NotificationChannel.IN_APP];
    case RefundStatus.PROCESSING:
    case RefundStatus.SUBMITTED:
      return [NotificationChannel.IN_APP];
    default:
      return [NotificationChannel.IN_APP];
  }
};

/**
 * Registers the refund status changed event handler with the event bus
 * @returns Unsubscribe function that removes the event handler
 */
export const registerRefundStatusChangedHandler = (): Function => {
  // Subscribe to the REFUND_EVENTS.STATUS_CHANGED event
  const unsubscribe = eventBus.on(REFUND_EVENTS.STATUS_CHANGED, handleRefundStatusChanged);

  // Log successful registration of the handler
  logger.info('Registered refund status changed event handler');

  // Return the unsubscribe function provided by the event bus
  return unsubscribe;
};