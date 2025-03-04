import { v4 as uuidv4 } from 'uuid'; // uuid@^9.0.0
import { logger } from '../../common/utils/logger';
import { metrics } from '../../common/utils/metrics';
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  Notification,
  NotificationMessage,
  NotificationContext,
  NotificationTemplate
} from '../../common/interfaces/notification.interface';
import { BusinessError, InvalidArgumentError, UnsupportedChannelError, TemplateNotFoundError } from '../../common/errors';
import notificationRepository, { NotificationRepository } from '../../database/repositories/notification.repo';
import { renderNotification, getTemplateByTypeAndChannel } from './template-renderer';
import NotificationPreferenceManager, { PreferenceUpdateRequest } from './preference-manager';
import { EmailNotificationChannel } from './channels/email.channel';
import { SMSNotificationChannel } from './channels/sms.channel';
import { InAppNotificationChannel } from './channels/in-app.channel';
import config from '../../config';
import { getChannelForType } from './channels';

/**
 * Core notification service that manages sending notifications across multiple channels
 * (email, SMS, in-app) for various refund-related events. Provides a unified interface
 * for sending, scheduling, and tracking notifications with support for user preferences
 * and templated content.
 */
class NotificationService {
  private emailChannel: EmailNotificationChannel;
  private smsChannel: SMSNotificationChannel;
  private inAppChannel: InAppNotificationChannel;
  private preferenceManager: NotificationPreferenceManager;

  /**
   * Initializes the notification service with required dependencies
   */
  public initialize(): void {
    // Initialize notification channel instances with configuration
    this.emailChannel = new EmailNotificationChannel(config);
    this.smsChannel = new SMSNotificationChannel(config);
    this.inAppChannel = new InAppNotificationChannel(config);

    // Initialize preference manager with repository
    this.preferenceManager = new NotificationPreferenceManager(notificationRepository);

    logger.info('Notification service initialized');
  }

  /**
   * Sends a notification to a recipient through a specified channel
   * @param notificationType - Type of notification
   * @param recipient - Recipient identifier (email, phone number, or user ID)
   * @param channel - Notification channel
   * @param context - Context data for variable substitution
   * @returns Promise resolving to Notification ID if successful, null if disabled by user preferences
   */
  public async sendNotification(
    notificationType: NotificationType,
    recipient: string,
    channel: NotificationChannel,
    context: Record<string, any>
  ): Promise<string | null> {
    // Validate input parameters
    if (!notificationType || !recipient || !channel) {
      logger.error('Invalid input parameters for sendNotification', { notificationType, recipient, channel });
      throw new InvalidArgumentError('Notification type, recipient, and channel are required');
    }

    // Get user ID from recipient format
    const userId = this.getUserIdFromRecipient(recipient, channel);

    // Check if notification is enabled via preference manager
    const isEnabled = await this.preferenceManager.isNotificationEnabled(userId, notificationType, channel);
    if (!isEnabled) {
      logger.info('Notification is disabled by user preferences', { userId, notificationType, channel });
      return null;
    }

    try {
      // Get template for notification type and channel
      const template = getTemplateByTypeAndChannel(notificationType, channel);
      if (!template) {
        throw new TemplateNotFoundError(`No template found for notification type ${notificationType} and channel ${channel}`);
      }

      // Render notification content using template and context
      const { subject, body, html } = renderNotification(notificationType, channel, context);

      // Create notification record in pending status
      const notification: Notification = {
        notification_id: uuidv4(),
        user_id: userId,
        notification_type: notificationType,
        channel: channel,
        status: NotificationStatus.PENDING,
        subject: subject,
        body: body,
        scheduled_time: null,
        sent_time: null,
        delivery_status: null,
        delivery_details: null,
        context: context,
        read_at: null,
        reference_id: context.refundId || null,
        reference_type: 'refund', // TODO: Make this dynamic based on context
        created_at: new Date()
      };

      // Save notification to database
      await notificationRepository.create(notification);

      // Get channel handler for specified channel
      const channelHandler = getChannelForType(channel);

      // Prepare message for delivery
      const message: NotificationMessage = {
        recipient: recipient,
        subject: subject,
        body: body,
        html_body: html,
        notification_id: notification.notification_id,
        notification_type: notificationType
      };

      // Send notification through channel handler
      const result = await channelHandler.send_notification(message);

      // Update notification status based on delivery result
      await notificationRepository.updateStatus(notification.notification_id, result.delivery_status, {
        sent_time: new Date(),
        delivery_details: {
          provider_message_id: result.provider_message_id,
          error: result.error
        }
      });

      // Track metrics for notification delivery
      metrics.incrementCounter('notification.sent', 1, {
        channel: channel,
        notificationType: notificationType
      });

      // Return notification ID on success
      return notification.notification_id;
    } catch (error) {
      logger.error('Error sending notification', { error, notificationType, recipient, channel });
      throw error;
    }
  }

  /**
   * Sends multiple notifications in bulk
   * @param notifications - Array of notification objects to send
   * @returns Promise resolving to array of results for each notification attempt
   */
  public async sendBulkNotifications(
    notifications: { notificationType: NotificationType; recipient: string; channel: NotificationChannel; context: Record<string, any> }[]
  ): Promise<{ success: boolean; notification_id: string | null; error?: string }[]> {
    // Validate input parameters
    if (!Array.isArray(notifications)) {
      throw new InvalidArgumentError('Notifications must be an array');
    }

    try {
      // Group notifications by channel for efficiency
      const notificationsByChannel: { [channel in NotificationChannel]?: typeof notifications } = {};
      notifications.forEach(notification => {
        if (!notificationsByChannel[notification.channel]) {
          notificationsByChannel[notification.channel] = [];
        }
        notificationsByChannel[notification.channel]?.push(notification);
      });

      // Process each channel's notifications in parallel
      const results = await Promise.all(
        Object.entries(notificationsByChannel).map(async ([channel, channelNotifications]) => {
          const channelType = channel as NotificationChannel;
          return await Promise.all(
            channelNotifications.map(async notification => {
              try {
                const notificationId = await this.sendNotification(
                  notification.notificationType,
                  notification.recipient,
                  channelType,
                  notification.context
                );
                return { success: true, notification_id: notificationId };
              } catch (error) {
                logger.error('Error sending bulk notification', { error, notification });
                return { success: false, notification_id: null, error: error.message };
              }
            })
          );
        })
      ).then(results => results.flat());

      // Track metrics for bulk notification operations
      metrics.incrementCounter('notification.bulk.sent', notifications.length);

      // Return array of results for each notification attempt
      return results;
    } catch (error) {
      logger.error('Error sending bulk notifications', { error, count: notifications.length });
      throw error;
    }
  }

  /**
   * Schedules a notification for future delivery
   * @param notificationType - Type of notification
   * @param recipient - Recipient identifier (email, phone number, or user ID)
   * @param channel - Notification channel
   * @param scheduledTime - Time to send the notification
   * @param context - Context data for variable substitution
   * @returns Promise resolving to Notification ID if successful, null if disabled by user preferences
   */
  public async scheduleNotification(
    notificationType: NotificationType,
    recipient: string,
    channel: NotificationChannel,
    scheduledTime: Date,
    context: Record<string, any>
  ): Promise<string | null> {
    // Validate input parameters
    if (!notificationType || !recipient || !channel || !scheduledTime) {
      logger.error('Invalid input parameters for scheduleNotification', { notificationType, recipient, channel, scheduledTime });
      throw new InvalidArgumentError('Notification type, recipient, channel, and scheduled time are required');
    }

    // Ensure scheduled time is in the future
    if (scheduledTime <= new Date()) {
      throw new InvalidArgumentError('Scheduled time must be in the future');
    }

    // Get user ID from recipient format
    const userId = this.getUserIdFromRecipient(recipient, channel);

    // Check if notification is enabled via preference manager
    const isEnabled = await this.preferenceManager.isNotificationEnabled(userId, notificationType, channel);
    if (!isEnabled) {
      logger.info('Scheduled notification is disabled by user preferences', { userId, notificationType, channel });
      return null;
    }

    try {
      // Get template for notification type and channel
      const template = getTemplateByTypeAndChannel(notificationType, channel);
      if (!template) {
        throw new TemplateNotFoundError(`No template found for notification type ${notificationType} and channel ${channel}`);
      }

      // Render notification content using template and context
      const { subject, body, html } = renderNotification(notificationType, channel, context);

      // Create notification record with PENDING status and scheduled time
      const notification: Notification = {
        notification_id: uuidv4(),
        user_id: userId,
        notification_type: notificationType,
        channel: channel,
        status: NotificationStatus.PENDING,
        subject: subject,
        body: body,
        scheduled_time: scheduledTime,
        sent_time: null,
        delivery_status: null,
        delivery_details: null,
        context: context,
        read_at: null,
        reference_id: context.refundId || null,
        reference_type: 'refund', // TODO: Make this dynamic based on context
        created_at: new Date()
      };

      // Save notification to database
      await notificationRepository.create(notification);

      // Track metrics for scheduled notifications
      metrics.incrementCounter('notification.scheduled', 1, {
        channel: channel,
        notificationType: notificationType
      });

      // Return notification ID on success
      return notification.notification_id;
    } catch (error) {
      logger.error('Error scheduling notification', { error, notificationType, recipient, channel, scheduledTime });
      throw error;
    }
  }

  /**
   * Processes notifications that are scheduled for delivery
   * @returns Number of notifications processed
   */
  public async processScheduledNotifications(): Promise<number> {
    try {
      // Find pending notifications scheduled before current time
      const now = new Date();
      const notifications = await notificationRepository.findPendingScheduled(now);

      // Process each notification through appropriate channel
      for (const notification of notifications) {
        try {
          // Get channel handler for specified channel
          const channelHandler = getChannelForType(notification.channel);

          // Prepare message for delivery
          const message: NotificationMessage = {
            recipient: notification.user_id,
            subject: notification.subject,
            body: notification.body,
            html_body: null, // TODO: Add HTML support for scheduled notifications
            notification_id: notification.notification_id,
            notification_type: notification.notification_type
          };

          // Send notification through channel handler
          const result = await channelHandler.send_notification(message);

          // Update notification status based on delivery result
          await notificationRepository.updateStatus(notification.notification_id, result.delivery_status, {
            sent_time: new Date(),
            delivery_details: {
              provider_message_id: result.provider_message_id,
              error: result.error
            }
          });
        } catch (error) {
          logger.error('Error processing scheduled notification', { error, notification });
          // TODO: Implement retry logic for failed scheduled notifications
        }
      }

      // Log processing results
      logger.info('Processed scheduled notifications', { count: notifications.length });

      // Track metrics for scheduled notification processing
      metrics.incrementCounter('notification.scheduled.processed', notifications.length);

      // Return count of processed notifications
      return notifications.length;
    } catch (error) {
      logger.error('Error processing scheduled notifications', { error });
      throw error;
    }
  }

  /**
   * Retries sending failed notifications based on retry policy
   * @param maxRetries - Maximum retry attempts (notifications with fewer retries will be returned)
   * @param maxAgeHours - Maximum age in hours for retryable notifications
   * @returns Number of notifications retried
   */
  public async retryFailedNotifications(maxRetries: number, maxAgeHours: number): Promise<number> {
    try {
      // Find failed notifications eligible for retry
      const notifications = await notificationRepository.findFailedForRetry(maxRetries, maxAgeHours);

      // Process each notification through appropriate channel
      for (const notification of notifications) {
        try {
          // Get channel handler for specified channel
          const channelHandler = getChannelForType(notification.channel);

          // Prepare message for delivery
          const message: NotificationMessage = {
            recipient: notification.user_id,
            subject: notification.subject,
            body: notification.body,
            html_body: null, // TODO: Add HTML support for retried notifications
            notification_id: notification.notification_id,
            notification_type: notification.notification_type
          };

          // Send notification through channel handler
          const result = await channelHandler.send_notification(message);

          // Update notification status based on delivery result
          await notificationRepository.updateStatus(notification.notification_id, result.delivery_status, {
            sent_time: new Date(),
            delivery_details: {
              provider_message_id: result.provider_message_id,
              error: result.error
            }
          });

          // Increment retry count
          await notificationRepository.incrementRetryCount(notification.notification_id);
        } catch (error) {
          logger.error('Error retrying failed notification', { error, notification });
        }
      }

      // Log retry results
      logger.info('Retried failed notifications', { count: notifications.length });

      // Track metrics for notification retries
      metrics.incrementCounter('notification.retry.attempted', notifications.length);

      // Return count of retried notifications
      return notifications.length;
    } catch (error) {
      logger.error('Error retrying failed notifications', { error, maxRetries, maxAgeHours });
      throw error;
    }
  }

  /**
   * Retrieves notification history for a user with filtering and pagination
   * @param userId - User ID to retrieve history for
   * @param filters - Optional filters for notification type, channel, status, date range, limit, and offset
   * @returns Promise resolving to paginated notification history
   */
  public async getNotificationHistory(
    userId: string,
    filters: {
      notificationType?: NotificationType;
      channel?: NotificationChannel;
      status?: NotificationStatus;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ total: number; notifications: Notification[]; limit: number; offset: number }> {
    // Validate input parameters
    if (!userId) {
      logger.error('Invalid input parameters for getNotificationHistory', { userId, filters });
      throw new InvalidArgumentError('User ID is required');
    }

    try {
      // Apply default pagination values if not specified
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;

      // Query repository for notifications matching filters
      const result = await notificationRepository.findByUser(userId, filters);

      // Track metrics for history retrieval operations
      metrics.incrementCounter('notification.history.retrieved', 1, {
        userId: userId,
        notificationType: filters.notificationType || 'all',
        channel: filters.channel || 'all'
      });

      // Return paginated results with total count
      return result;
    } catch (error) {
      logger.error('Error getting notification history', { error, userId, filters });
      throw error;
    }
  }

  /**
   * Gets the current status of a specific notification
   * @param notificationId - ID of the notification to retrieve status for
   * @returns Promise resolving to NotificationStatus or null if not found
   */
  public async getNotificationStatus(notificationId: string): Promise<NotificationStatus | null> {
    // Validate notification ID
    if (!notificationId) {
      logger.error('Invalid input parameters for getNotificationStatus', { notificationId });
      throw new InvalidArgumentError('Notification ID is required');
    }

    try {
      // Query repository for notification
      const notification = await notificationRepository.findById(notificationId);

      // Return notification status or null if not found
      return notification ? notification.status : null;
    } catch (error) {
      logger.error('Error getting notification status', { error, notificationId });
      throw error;
    }
  }

  /**
   * Marks a notification as read by the user
   * @param notificationId - ID of the notification to mark as read
   * @param userId - User ID of the notification owner
   * @returns Promise resolving to boolean indicating success
   */
  public async markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    // Validate input parameters
    if (!notificationId || !userId) {
      logger.error('Invalid input parameters for markNotificationAsRead', { notificationId, userId });
      throw new InvalidArgumentError('Notification ID and User ID are required');
    }

    try {
      // Update notification status to READ
      const success = await notificationRepository.markAsRead(notificationId, userId);

      // Return success status
      return success;
    } catch (error) {
      logger.error('Error marking notification as read', { error, notificationId, userId });
      throw error;
    }
  }

  /**
   * Gets notification preferences for a user
   * @param userId - User ID to retrieve preferences for
   * @returns Promise resolving to map of notification types to channel preferences
   */
  public async getUserNotificationPreferences(userId: string): Promise<Record<string, Record<string, boolean>>> {
    // Validate user ID
    if (!userId) {
      logger.error('Invalid input parameters for getUserNotificationPreferences', { userId });
      throw new InvalidArgumentError('User ID is required');
    }

    try {
      // Retrieve preferences via preference manager
      const preferences = await this.preferenceManager.getPreferences(userId);

      // Format preferences as notification type to channel map
      const formattedPreferences: Record<string, Record<string, boolean>> = {};
      preferences.forEach(pref => {
        if (!formattedPreferences[pref.notification_type]) {
          formattedPreferences[pref.notification_type] = {};
        }
        formattedPreferences[pref.notification_type][pref.channel] = pref.enabled;
      });

      // Return formatted preferences
      return formattedPreferences;
    } catch (error) {
      logger.error('Error getting user notification preferences', { error, userId });
      throw error;
    }
  }

  /**
   * Updates notification preferences for a user
   * @param userId - User ID to update preferences for
   * @param preferences - Array of preference updates
   * @returns Promise resolving to boolean indicating success
   */
  public async updateUserNotificationPreferences(
    userId: string,
    preferences: PreferenceUpdateRequest[]
  ): Promise<boolean> {
    // Validate input parameters
    if (!userId || !Array.isArray(preferences)) {
      logger.error('Invalid input parameters for updateUserNotificationPreferences', { userId, preferences });
      throw new InvalidArgumentError('User ID and preferences array are required');
    }

    try {
      // Update preferences via preference manager
      await this.preferenceManager.updatePreferences(userId, preferences);

      // Log preference updates
      logger.info('Updated user notification preferences', { userId, count: preferences.length });

      // Return success status
      return true;
    } catch (error) {
      logger.error('Error updating user notification preferences', { error, userId, preferences });
      throw error;
    }
  }

  /**
   * Extracts user ID from recipient string based on channel format
   * @param recipient - Recipient string
   * @param channel - Notification channel
   * @returns User ID
   */
  public getUserIdFromRecipient(recipient: string, channel: NotificationChannel): string {
    // For EMAIL: Extract user ID from email format or domain
    if (channel === NotificationChannel.EMAIL) {
      // TODO: Implement email-based user ID extraction
      return recipient;
    }

    // For SMS: Extract user ID from phone number format
    if (channel === NotificationChannel.SMS) {
      // TODO: Implement phone number-based user ID extraction
      return recipient;
    }

    // For IN_APP: Use recipient directly as user ID
    if (channel === NotificationChannel.IN_APP) {
      return recipient;
    }

    // Fallback to recipient string if no specific format
    return recipient;
  }
}

// Export singleton instance
const notificationService = new NotificationService();
notificationService.initialize();

export default notificationService;

// Export individual functions for testing and modularity
export const initialize = notificationService.initialize.bind(notificationService);
export const sendNotification = notificationService.sendNotification.bind(notificationService);
export const sendBulkNotifications = notificationService.sendBulkNotifications.bind(notificationService);
export const scheduleNotification = notificationService.scheduleNotification.bind(notificationService);
export const processScheduledNotifications = notificationService.processScheduledNotifications.bind(notificationService);
export const retryFailedNotifications = notificationService.retryFailedNotifications.bind(notificationService);
export const getNotificationHistory = notificationService.getNotificationHistory.bind(notificationService);
export const getNotificationStatus = notificationService.getNotificationStatus.bind(notificationService);
export const markNotificationAsRead = notificationService.markNotificationAsRead.bind(notificationService);
export const getUserNotificationPreferences = notificationService.getUserNotificationPreferences.bind(notificationService);
export const updateUserNotificationPreferences = notificationService.updateUserNotificationPreferences.bind(notificationService);
export const templates = notificationService.templates;
export const channelHandlers = notificationService.channelHandlers;