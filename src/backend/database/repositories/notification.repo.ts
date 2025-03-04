import mongoose from 'mongoose';
import { NotificationModel, INotificationDocument } from '../models/notification.model';
import { 
  Notification, 
  NotificationType, 
  NotificationChannel, 
  NotificationStatus 
} from '../../common/interfaces/notification.interface';
import { logger } from '../../common/utils/logger';

/**
 * Repository class for notification data access operations
 */
export class NotificationRepository {
  private model: mongoose.Model<INotificationDocument>;

  /**
   * Initializes the repository with the NotificationModel
   */
  constructor() {
    this.model = NotificationModel;
  }

  /**
   * Creates a new notification record in the database
   * @param notification - Notification object to create
   * @returns Promise resolving to the created notification document
   */
  async create(notification: Notification): Promise<INotificationDocument> {
    try {
      logger.debug('Creating notification', { type: notification.notification_type });
      const created = await this.model.create(notification);
      return created;
    } catch (error) {
      logger.error('Error creating notification', { error, notification });
      throw error;
    }
  }

  /**
   * Finds a notification by its ID
   * @param notificationId - ID of the notification to find
   * @returns Promise resolving to the found notification or null if not found
   */
  async findById(notificationId: string): Promise<INotificationDocument | null> {
    try {
      logger.debug('Finding notification by ID', { notificationId });
      return await this.model.findOne({ notification_id: notificationId });
    } catch (error) {
      logger.error('Error finding notification by ID', { error, notificationId });
      throw error;
    }
  }

  /**
   * Finds notifications for a specific user with optional filtering
   * @param userId - User ID to filter notifications by
   * @param filters - Optional filters for notification type, channel, status, date range, etc.
   * @returns Promise resolving to paginated notification results with metadata
   */
  async findByUser(
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
  ): Promise<{
    total: number;
    notifications: INotificationDocument[];
    limit: number;
    offset: number;
  }> {
    try {
      // Build filter query
      const query: any = { user_id: userId };
      
      // Add optional filters if provided
      if (filters.notificationType) {
        query.notification_type = filters.notificationType;
      }
      
      if (filters.channel) {
        query.channel = filters.channel;
      }
      
      if (filters.status) {
        query.status = filters.status;
      }
      
      // Add date range filter if provided
      if (filters.startDate || filters.endDate) {
        query.created_at = {};
        
        if (filters.startDate) {
          query.created_at.$gte = filters.startDate;
        }
        
        if (filters.endDate) {
          query.created_at.$lte = filters.endDate;
        }
      }
      
      // Apply pagination
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      
      // Get total count
      const total = await this.model.countDocuments(query);
      
      // Get paginated results
      const notifications = await this.model.find(query)
        .sort({ created_at: -1 }) // Newest first
        .skip(offset)
        .limit(limit);
      
      return {
        total,
        notifications,
        limit,
        offset
      };
    } catch (error) {
      logger.error('Error finding notifications by user', { error, userId, filters });
      throw error;
    }
  }

  /**
   * Finds a notification by both user ID and notification ID
   * @param userId - User ID of the notification owner
   * @param notificationId - ID of the notification to find
   * @returns Promise resolving to the found notification or null if not found
   */
  async findByUserAndId(userId: string, notificationId: string): Promise<INotificationDocument | null> {
    try {
      return await this.model.findOne({ 
        user_id: userId, 
        notification_id: notificationId 
      });
    } catch (error) {
      logger.error('Error finding notification by user and ID', { error, userId, notificationId });
      throw error;
    }
  }

  /**
   * Updates the status of a notification
   * @param notificationId - ID of the notification to update
   * @param status - New status to set
   * @param details - Optional details to update (e.g., delivery details)
   * @returns Promise resolving to boolean indicating success
   */
  async updateStatus(
    notificationId: string, 
    status: NotificationStatus,
    details: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      // Build update object
      const update: any = {
        status,
        updated_at: new Date()
      };
      
      // Add details if provided
      if (Object.keys(details).length > 0) {
        Object.keys(details).forEach(key => {
          update[key] = details[key];
        });
      }
      
      // Set sent_time if status is SENT
      if (status === NotificationStatus.SENT) {
        update.sent_time = new Date();
      }
      
      // Update the notification
      const result = await this.model.updateOne(
        { notification_id: notificationId },
        { $set: update }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error updating notification status', { error, notificationId, status });
      throw error;
    }
  }

  /**
   * Marks a notification as read by the user
   * @param notificationId - ID of the notification to mark as read
   * @param userId - User ID of the notification owner
   * @returns Promise resolving to boolean indicating success
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.model.updateOne(
        { notification_id: notificationId, user_id: userId },
        { 
          $set: {
            status: NotificationStatus.READ,
            read_at: new Date()
          }
        }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error marking notification as read', { error, notificationId, userId });
      throw error;
    }
  }

  /**
   * Finds pending notifications scheduled for delivery
   * @param beforeTime - Time threshold for scheduled notifications
   * @returns Promise resolving to array of pending scheduled notifications
   */
  async findPendingScheduled(beforeTime: Date): Promise<INotificationDocument[]> {
    try {
      return await this.model.find({
        status: NotificationStatus.PENDING,
        scheduled_time: { $lte: beforeTime }
      });
    } catch (error) {
      logger.error('Error finding pending scheduled notifications', { error, beforeTime });
      throw error;
    }
  }

  /**
   * Finds failed notifications eligible for retry
   * @param maxRetries - Maximum retry attempts (notifications with fewer retries will be returned)
   * @param maxAgeHours - Maximum age in hours for retryable notifications
   * @returns Promise resolving to array of failed notifications eligible for retry
   */
  async findFailedForRetry(maxRetries: number, maxAgeHours: number): Promise<INotificationDocument[]> {
    try {
      // Calculate the cutoff time
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);
      
      // Build query
      const query: any = {
        status: NotificationStatus.FAILED,
        created_at: { $gte: cutoffTime }
      };
      
      // Add retry count filter if maxRetries is provided
      if (maxRetries !== undefined) {
        query.retry_count = { $lt: maxRetries };
      }
      
      return await this.model.find(query);
    } catch (error) {
      logger.error('Error finding failed notifications for retry', { error, maxRetries, maxAgeHours });
      throw error;
    }
  }

  /**
   * Increments the retry count for a notification
   * @param notificationId - ID of the notification to update
   * @returns Promise resolving to boolean indicating success
   */
  async incrementRetryCount(notificationId: string): Promise<boolean> {
    try {
      const result = await this.model.updateOne(
        { notification_id: notificationId },
        { $inc: { retry_count: 1 } }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error incrementing notification retry count', { error, notificationId });
      throw error;
    }
  }

  /**
   * Deletes notifications older than a specified date
   * @param olderThan - Date threshold for deletion
   * @returns Promise resolving to number of deleted notifications
   */
  async deleteExpired(olderThan: Date): Promise<number> {
    try {
      const result = await this.model.deleteMany({
        created_at: { $lt: olderThan }
      });
      
      logger.info('Deleted expired notifications', { 
        count: result.deletedCount, 
        threshold: olderThan.toISOString() 
      });
      
      return result.deletedCount || 0;
    } catch (error) {
      logger.error('Error deleting expired notifications', { error, olderThan });
      throw error;
    }
  }
}

// Create singleton instance
export const notificationRepository = new NotificationRepository();

// Default export
export default notificationRepository;