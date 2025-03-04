/**
 * Notification Channels Index
 *
 * This file exports all notification channel implementations and provides a unified 
 * interface for the notification service to send messages through different channels
 * (email, SMS, in-app).
 *
 * The default export provides a mapping between channel types and their implementations
 * for easy channel selection based on NotificationChannel enum values.
 */

// Import notification channel implementations
import EmailNotificationChannel from './email.channel';
import SMSNotificationChannel from './sms.channel';
import InAppNotificationChannel from './in-app.channel';

// Import notification channel enum
import { NotificationChannel } from '../../../common/interfaces/notification.interface';

// Export individual notification channel implementations
export { EmailNotificationChannel, SMSNotificationChannel, InAppNotificationChannel };

/**
 * Maps notification channel types to their implementations
 * This allows the notification service to dynamically select the appropriate 
 * channel implementation based on the NotificationChannel enum value
 */
export default {
  [NotificationChannel.EMAIL]: EmailNotificationChannel,
  [NotificationChannel.SMS]: SMSNotificationChannel,
  [NotificationChannel.IN_APP]: InAppNotificationChannel
};