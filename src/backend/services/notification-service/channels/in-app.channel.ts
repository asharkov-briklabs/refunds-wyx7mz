import axios from 'axios';
import { 
  NotificationMessage, 
  NotificationResult, 
  NotificationStatus,
  NotificationType 
} from '../../../common/interfaces/notification.interface';
import { logger } from '../../../common/utils/logger';
import config from '../../../config';
import { InvalidRecipientError } from '../../../common/errors';
import notificationRepository from '../../../database/repositories/notification.repo';

/**
 * In-app implementation of notification channel for delivering notifications
 * via the application interface
 */
class InAppNotificationChannel {
  private config: any;
  private websocket_url: string;

  /**
   * Initializes the in-app notification channel with configuration
   * @param config - Configuration object
   */
  constructor(config: any) {
    this.config = config.notification?.inApp || {};
    this.websocket_url = this.config.websocketUrl || 'http://localhost:3007/api/websocket';
    
    logger.info('Initialized InAppNotificationChannel', {
      websocketUrl: this.websocket_url,
      timeout: this.config.timeout || 5000
    });
  }

  /**
   * Sends an in-app notification to a user
   * @param message - The notification message to send
   * @returns Promise resolving to the result of the notification delivery attempt
   */
  async send_notification(message: NotificationMessage): Promise<NotificationResult> {
    try {
      // Validate the recipient (user ID)
      if (!this.validate_recipient(message.recipient)) {
        throw new InvalidRecipientError(`Invalid user ID format: ${message.recipient}`);
      }

      logger.info(`Sending in-app notification to user ${message.recipient}`, {
        notificationId: message.notification_id,
        notificationType: message.notification_type
      });

      // Create in-app notification payload
      const notification_payload = {
        id: message.notification_id,
        type: "notification",
        notificationType: message.notification_type,
        title: message.subject,
        body: message.body,
        timestamp: new Date().toISOString(),
        icon: this.get_notification_icon(message.notification_type),
        data: message.context || {}
      };

      // Store notification in database for retrieval via API
      await notificationRepository.create({
        notification_id: message.notification_id,
        user_id: message.recipient,
        notification_type: message.notification_type,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
        subject: message.subject,
        body: message.body,
        context: message.context || {},
        created_at: new Date()
      });

      // Attempt to send via websocket if user is connected
      const connected = await this.send_to_user(
        message.recipient,
        'notification',
        notification_payload
      );

      let status = connected ? NotificationStatus.DELIVERED : NotificationStatus.STORED;
      
      // Update notification status
      await notificationRepository.updateStatus(
        message.notification_id,
        status
      );

      // Return success result
      return {
        success: true,
        delivery_status: status,
        provider_message_id: message.notification_id,
        error: null
      };
    } catch (error) {
      logger.error(`Error sending in-app notification to ${message.recipient}`, { 
        error, 
        notificationId: message.notification_id 
      });
      
      // Return failure result
      return {
        success: false,
        delivery_status: NotificationStatus.FAILED,
        provider_message_id: null,
        error: error.message || 'Failed to send in-app notification'
      };
    }
  }

  /**
   * Validates if a string is a properly formatted user ID
   * @param recipient - The recipient user ID to validate
   * @returns True if recipient is a valid user ID, false otherwise
   */
  validate_recipient(recipient: string): boolean {
    // Validate user ID format (alphanumeric + dash + underscore, 1-36 chars)
    const userIdRegex = /^[a-zA-Z0-9_-]{1,36}$/;
    return userIdRegex.test(recipient);
  }

  /**
   * Gets the delivery status for a specific notification
   * @param message_id - The ID of the notification to check
   * @returns Promise resolving to the current notification status
   */
  async get_delivery_status(message_id: string): Promise<string> {
    try {
      // Get notification from repository
      const notification = await notificationRepository.findById(message_id);
      
      if (!notification) {
        logger.info(`Notification not found for status check: ${message_id}`);
        return 'UNKNOWN';
      }

      // If notification has been read, return READ status
      if (notification.read_at) {
        return NotificationStatus.READ;
      }

      // Return current status
      return notification.status;
    } catch (error) {
      logger.error(`Error getting notification status for ${message_id}`, { error });
      return 'UNKNOWN';
    }
  }

  /**
   * Determines appropriate icon based on notification type
   * @param notificationType - The type of notification
   * @returns Icon name/path to use for the notification
   */
  private get_notification_icon(notificationType: NotificationType): string {
    switch (notificationType) {
      case NotificationType.REFUND_CREATED:
        return 'receipt';
      case NotificationType.REFUND_COMPLETED:
        return 'check_circle';
      case NotificationType.REFUND_FAILED:
        return 'error';
      case NotificationType.APPROVAL_REQUESTED:
        return 'assignment';
      case NotificationType.APPROVAL_REMINDER:
        return 'notification_important';
      case NotificationType.APPROVAL_ESCALATED:
        return 'priority_high';
      case NotificationType.VERIFICATION_REQUESTED:
        return 'verified_user';
      case NotificationType.COMPLIANCE_VIOLATION:
        return 'gpp_bad';
      default:
        return 'notifications';
    }
  }

  /**
   * Attempts to send notification to a user via websocket
   * @param user_id - The ID of the recipient user
   * @param event_type - The type of event being sent
   * @param payload - The notification payload
   * @returns Promise resolving to true if successfully delivered, false otherwise
   */
  private async send_to_user(user_id: string, event_type: string, payload: any): Promise<boolean> {
    try {
      // Call websocket service to push notification
      const response = await axios.post(`${this.websocket_url}/push`, {
        user_id,
        event_type,
        payload
      }, {
        timeout: this.config.timeout || 5000,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey || ''
        }
      });

      // If successful delivery (200 OK response)
      if (response.status === 200 && response.data?.delivered) {
        logger.info(`Successfully delivered in-app notification to user ${user_id}`);
        return true;
      }

      // User not connected or delivery failed
      logger.info(`User ${user_id} not connected, notification stored for later retrieval`);
      return false;
    } catch (error) {
      // Log error but don't fail - notification is still stored in DB
      logger.error(`Error delivering websocket notification to user ${user_id}`, { 
        error: error.message, 
        code: error.response?.status || error.code
      });
      return false;
    }
  }
}

export default InAppNotificationChannel;