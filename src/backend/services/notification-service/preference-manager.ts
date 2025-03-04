import { v4 as uuidv4 } from 'uuid'; // uuid@9.0.0
import { logger } from '../../../common/utils/logger';
import { ValidationError, InvalidPreferencesError } from '../../../common/errors';
import { NotificationPreference, NotificationType, NotificationChannel } from '../../common/interfaces/notification.interface';
import { NotificationPreferenceRepository } from '../../../database/repositories/notification.repo';

/**
 * Interface for preference update requests
 */
export interface PreferenceUpdateRequest {
  notificationType: string;
  channel: string;
  enabled: boolean;
}

/**
 * Service class that manages notification preferences for users
 */
export class NotificationPreferenceManager {
  private readonly notificationPreferenceRepository: NotificationPreferenceRepository;
  private readonly CACHE_TTL_SECONDS = 300; // 5 minutes

  /**
   * Initializes the NotificationPreferenceManager with required dependencies
   * @param notificationPreferenceRepository - Repository for notification preference operations
   */
  constructor(notificationPreferenceRepository: NotificationPreferenceRepository) {
    this.notificationPreferenceRepository = notificationPreferenceRepository;
  }

  /**
   * Retrieves notification preferences for a specific user
   * @param userId - User ID to retrieve preferences for
   * @returns Promise resolving to array of notification preferences
   */
  public async getPreferences(userId: string): Promise<NotificationPreference[]> {
    try {
      logger.info('Retrieving notification preferences', { userId });
      
      const preferences = await this.notificationPreferenceRepository.findByUserId(userId);
      
      return preferences || [];
    } catch (error) {
      logger.error('Error retrieving notification preferences', { error, userId });
      throw error;
    }
  }

  /**
   * Updates a specific notification preference for a user
   * @param userId - User ID to update preference for
   * @param notificationType - Type of notification
   * @param channel - Notification channel
   * @param enabled - Whether the notification is enabled
   * @returns Promise resolving to the updated preference
   */
  public async updatePreference(
    userId: string,
    notificationType: string,
    channel: string,
    enabled: boolean
  ): Promise<NotificationPreference> {
    try {
      // Validate notification type and channel
      if (!this.validateNotificationType(notificationType)) {
        throw ValidationError.createInvalidFormatError(
          'notificationType',
          'Must be a valid notification type'
        );
      }

      if (!this.validateChannel(channel)) {
        throw ValidationError.createInvalidFormatError(
          'channel',
          'Must be a valid notification channel'
        );
      }

      logger.info('Updating notification preference', { 
        userId, 
        notificationType, 
        channel, 
        enabled 
      });

      // Find existing preference
      let preference = await this.notificationPreferenceRepository.findPreference(
        userId,
        notificationType as NotificationType,
        channel as NotificationChannel
      );

      // If preference exists, update it
      if (preference) {
        preference.enabled = enabled;
        preference.updated_at = new Date();
        
        return await this.notificationPreferenceRepository.update(preference);
      }
      
      // If preference doesn't exist, create a new one
      const newPreference: NotificationPreference = {
        preference_id: uuidv4(),
        user_id: userId,
        notification_type: notificationType as NotificationType,
        channel: channel as NotificationChannel,
        enabled,
        updated_at: new Date()
      };
      
      return await this.notificationPreferenceRepository.save(newPreference);
    } catch (error) {
      logger.error('Error updating notification preference', { 
        error, 
        userId, 
        notificationType, 
        channel 
      });
      throw error;
    }
  }

  /**
   * Updates multiple notification preferences for a user
   * @param userId - User ID to update preferences for
   * @param preferences - Array of preference updates
   * @returns Promise resolving to array of updated preferences
   */
  public async updatePreferences(
    userId: string,
    preferences: PreferenceUpdateRequest[]
  ): Promise<NotificationPreference[]> {
    try {
      // Validate preferences is an array
      if (!Array.isArray(preferences)) {
        throw new InvalidPreferencesError("Preferences must be an array");
      }

      // Validate each preference has required fields
      for (const pref of preferences) {
        if (!pref.notificationType || !pref.channel || typeof pref.enabled !== 'boolean') {
          throw new InvalidPreferencesError("Each preference must include notificationType, channel, and enabled fields");
        }

        if (!this.validateNotificationType(pref.notificationType)) {
          throw new InvalidPreferencesError(`Invalid notification type: ${pref.notificationType}`);
        }

        if (!this.validateChannel(pref.channel)) {
          throw new InvalidPreferencesError(`Invalid notification channel: ${pref.channel}`);
        }
      }

      logger.info('Updating multiple notification preferences', { userId, count: preferences.length });

      // Process each preference update
      const results = [];
      for (const pref of preferences) {
        const updated = await this.updatePreference(
          userId,
          pref.notificationType,
          pref.channel,
          pref.enabled
        );
        results.push(updated);
      }

      return results;
    } catch (error) {
      logger.error('Error updating multiple notification preferences', { error, userId });
      throw error;
    }
  }

  /**
   * Checks if a specific notification type is enabled for a user on a specific channel
   * @param userId - User ID to check preferences for
   * @param notificationType - Type of notification
   * @param channel - Notification channel
   * @returns Promise resolving to boolean indicating if the notification is enabled
   */
  public async isNotificationEnabled(
    userId: string,
    notificationType: string,
    channel: string
  ): Promise<boolean> {
    try {
      // Validate notification type and channel
      if (!this.validateNotificationType(notificationType)) {
        throw ValidationError.createInvalidFormatError(
          'notificationType',
          'Must be a valid notification type'
        );
      }

      if (!this.validateChannel(channel)) {
        throw ValidationError.createInvalidFormatError(
          'channel',
          'Must be a valid notification channel'
        );
      }

      // Find preference
      const preference = await this.notificationPreferenceRepository.findPreference(
        userId,
        notificationType as NotificationType,
        channel as NotificationChannel
      );

      // If preference not found, return default (true)
      if (!preference) {
        const defaults = this.getDefaultPreferences();
        const typeDefaults = defaults[notificationType] || {};
        return typeDefaults[channel] !== undefined ? typeDefaults[channel] : true;
      }

      // Return the enabled value from the preference
      return preference.enabled;
    } catch (error) {
      logger.error('Error checking if notification is enabled', { 
        error, 
        userId, 
        notificationType, 
        channel 
      });
      throw error;
    }
  }

  /**
   * Gets default preferences for a new user or for notification types/channels without specific preferences
   * @returns Default preferences by notification type and channel
   */
  public getDefaultPreferences(): Record<string, Record<string, boolean>> {
    // Default values are based on notification criticality
    // Critical notifications default to all channels enabled
    // Informational notifications default to email and in-app only
    return {
      [NotificationType.REFUND_CREATED]: {
        [NotificationChannel.EMAIL]: true,
        [NotificationChannel.IN_APP]: true,
        [NotificationChannel.SMS]: false
      },
      [NotificationType.REFUND_COMPLETED]: {
        [NotificationChannel.EMAIL]: true,
        [NotificationChannel.IN_APP]: true,
        [NotificationChannel.SMS]: true
      },
      [NotificationType.REFUND_FAILED]: {
        [NotificationChannel.EMAIL]: true,
        [NotificationChannel.IN_APP]: true,
        [NotificationChannel.SMS]: true
      },
      [NotificationType.APPROVAL_REQUESTED]: {
        [NotificationChannel.EMAIL]: true,
        [NotificationChannel.IN_APP]: true,
        [NotificationChannel.SMS]: true
      },
      [NotificationType.APPROVAL_REMINDER]: {
        [NotificationChannel.EMAIL]: true,
        [NotificationChannel.IN_APP]: true,
        [NotificationChannel.SMS]: false
      },
      [NotificationType.APPROVAL_ESCALATED]: {
        [NotificationChannel.EMAIL]: true,
        [NotificationChannel.IN_APP]: true,
        [NotificationChannel.SMS]: true
      },
      [NotificationType.VERIFICATION_REQUESTED]: {
        [NotificationChannel.EMAIL]: true,
        [NotificationChannel.IN_APP]: true,
        [NotificationChannel.SMS]: true
      },
      [NotificationType.COMPLIANCE_VIOLATION]: {
        [NotificationChannel.EMAIL]: true,
        [NotificationChannel.IN_APP]: true,
        [NotificationChannel.SMS]: false
      }
    };
  }

  /**
   * Deletes a specific notification preference
   * @param userId - User ID to delete preference for
   * @param notificationType - Type of notification
   * @param channel - Notification channel
   * @returns Promise resolving to void
   */
  public async deletePreference(
    userId: string,
    notificationType: string,
    channel: string
  ): Promise<void> {
    try {
      // Validate notification type and channel
      if (!this.validateNotificationType(notificationType)) {
        throw ValidationError.createInvalidFormatError(
          'notificationType',
          'Must be a valid notification type'
        );
      }

      if (!this.validateChannel(channel)) {
        throw ValidationError.createInvalidFormatError(
          'channel',
          'Must be a valid notification channel'
        );
      }

      logger.info('Deleting notification preference', { userId, notificationType, channel });

      // Find preference
      const preference = await this.notificationPreferenceRepository.findPreference(
        userId,
        notificationType as NotificationType,
        channel as NotificationChannel
      );

      // If preference exists, delete it
      if (preference) {
        await this.notificationPreferenceRepository.delete(preference.preference_id);
      }
    } catch (error) {
      logger.error('Error deleting notification preference', { 
        error, 
        userId, 
        notificationType, 
        channel 
      });
      throw error;
    }
  }

  /**
   * Validates if a notification type is supported
   * @param notificationType - Notification type to validate
   * @returns Whether the notification type is valid
   */
  private validateNotificationType(notificationType: string): boolean {
    return Object.values(NotificationType).includes(notificationType as NotificationType);
  }

  /**
   * Validates if a notification channel is supported
   * @param channel - Notification channel to validate
   * @returns Whether the channel is valid
   */
  private validateChannel(channel: string): boolean {
    return Object.values(NotificationChannel).includes(channel as NotificationChannel);
  }
}

export default NotificationPreferenceManager;
export { PreferenceUpdateRequest };