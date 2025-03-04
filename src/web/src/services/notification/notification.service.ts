import { EventEmitter } from 'events'; // events 3.3.0
import notificationApi from '../api/notification.api';
import { Notification, NotificationPreference, NotificationFilter } from '../../types/notification.types';
import authService from '../auth/auth.service';

/**
 * Service responsible for managing notifications in the frontend application
 * Provides methods for fetching, updating, and streaming notifications,
 * as well as managing notification preferences
 */
class NotificationService {
  private eventEmitter: EventEmitter;
  private pollingInterval: number | null;
  private lastUnreadCount: number;

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.pollingInterval = null;
    this.lastUnreadCount = 0;
  }

  /**
   * Fetches notifications for the current user with optional filtering and pagination
   * @param filter Optional filters to apply to the notifications
   * @param page Page number for pagination
   * @param limit Number of notifications per page
   * @returns Promise resolving to notifications and total count
   */
  async getNotifications(
    filter: NotificationFilter = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ notifications: Notification[], total: number }> {
    // Ensure user is authenticated
    if (!authService.getUserInfo()) {
      throw new Error('User must be authenticated to fetch notifications');
    }

    try {
      // Format pagination and filter parameters for API
      const apiFilters = {
        ...filter,
        pagination: {
          page,
          pageSize: limit
        }
      };

      // Call API to fetch notifications
      const response = await notificationApi.getNotifications(apiFilters);

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch notifications');
      }

      // Return notifications and total count
      return {
        notifications: response.data.items,
        total: response.data.totalItems
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Marks one or more notifications as read
   * @param notificationIds Array of notification IDs to mark as read
   * @returns Promise resolving to success status
   */
  async markAsRead(notificationIds: string[]): Promise<boolean> {
    // Ensure user is authenticated
    if (!authService.getUserInfo()) {
      throw new Error('User must be authenticated to mark notifications as read');
    }

    try {
      // Call API to mark notifications as read
      const response = await notificationApi.markAsRead(notificationIds);

      if (response.success) {
        // Emit event to notify subscribers that notifications have been updated
        this.eventEmitter.emit('notifications-updated');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      return false;
    }
  }

  /**
   * Marks all notifications as read for the current user
   * @returns Promise resolving to success status
   */
  async markAllAsRead(): Promise<boolean> {
    // Ensure user is authenticated
    if (!authService.getUserInfo()) {
      throw new Error('User must be authenticated to mark all notifications as read');
    }

    try {
      // Call API to mark all notifications as read
      const response = await notificationApi.dismissAll();

      if (response.success) {
        // Emit event to notify subscribers that notifications have been updated
        this.eventEmitter.emit('notifications-updated');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  /**
   * Gets the count of unread notifications for the current user
   * @returns Promise resolving to the count of unread notifications
   */
  async getUnreadCount(): Promise<number> {
    // Ensure user is authenticated
    if (!authService.getUserInfo()) {
      throw new Error('User must be authenticated to get unread count');
    }

    try {
      // Get unread notifications count
      const response = await notificationApi.getUnreadCount();

      if (response.success && response.data) {
        return response.data.count;
      }

      return 0;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  /**
   * Updates notification preferences for the current user
   * @param preferences Array of notification preferences to update
   * @returns Promise resolving to success status
   */
  async updatePreferences(
    preferences: NotificationPreference[]
  ): Promise<boolean> {
    // Ensure user is authenticated
    if (!authService.getUserInfo()) {
      throw new Error('User must be authenticated to update preferences');
    }

    try {
      // Call API to update preferences
      const response = await notificationApi.updateNotificationPreferences(preferences);

      if (response.success) {
        // Emit event to notify subscribers that preferences have been updated
        this.eventEmitter.emit('preferences-updated');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }

  /**
   * Gets notification preferences for the current user
   * @returns Promise resolving to notification preferences
   */
  async getPreferences(): Promise<NotificationPreference[]> {
    // Ensure user is authenticated
    if (!authService.getUserInfo()) {
      throw new Error('User must be authenticated to get preferences');
    }

    try {
      // Call API to get preferences
      const response = await notificationApi.getNotificationPreferences();

      if (response.success && response.data) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return [];
    }
  }

  /**
   * Subscribes to notification events
   * @param event Event name to subscribe to
   * @param callback Function to call when event is emitted
   */
  subscribeToNotifications(event: string, callback: Function): void {
    this.eventEmitter.on(event, callback);
  }

  /**
   * Unsubscribes from notification events
   * @param event Event name to unsubscribe from
   * @param callback Function to remove from event listeners
   */
  unsubscribeFromNotifications(event: string, callback: Function): void {
    this.eventEmitter.off(event, callback);
  }

  /**
   * Sets up polling for new notifications at a specified interval
   * @param intervalMs Polling interval in milliseconds
   * @returns Interval ID for the polling
   */
  setupNotificationPolling(intervalMs: number = 30000): number {
    // Clear any existing polling interval
    this.clearNotificationPolling();

    // Set up new polling interval
    const interval = setInterval(async () => {
      try {
        // Skip if user is not authenticated
        if (!authService.getUserInfo()) {
          return;
        }

        // Get current unread count
        const unreadCount = await this.getUnreadCount();

        // If unread count has changed, emit an event
        if (unreadCount > this.lastUnreadCount) {
          this.eventEmitter.emit('new-notifications', {
            count: unreadCount,
            newCount: unreadCount - this.lastUnreadCount
          });
        }

        // Update last unread count
        this.lastUnreadCount = unreadCount;
      } catch (error) {
        console.error('Error polling for notifications:', error);
      }
    }, intervalMs) as unknown as number;

    // Store interval ID
    this.pollingInterval = interval;

    return interval;
  }

  /**
   * Clears the notification polling interval
   */
  clearNotificationPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

// Export the service as a singleton
export default notificationService;