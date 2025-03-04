/**
 * API client for notification-related operations in the Refunds Service web application.
 * Provides methods to fetch, manage, and interact with notifications and notification
 * preferences through the backend API.
 */

import apiClient from './api.client';
import { NOTIFICATION_ENDPOINTS } from '../../constants/api.constants';
import { 
  ApiResponse, 
  PaginatedResponse, 
  NotificationFilters 
} from '../../types/api.types';
import { 
  Notification, 
  NotificationPreference 
} from '../../types/notification.types';

/**
 * Retrieves a paginated list of notifications with optional filtering
 * @param filters Filters to apply to the notification list
 * @returns Promise resolving to paginated notification list
 */
const getNotifications = (
  filters: NotificationFilters
): Promise<ApiResponse<PaginatedResponse<Notification>>> => {
  // Prepare query parameters from notification filters
  const queryParams = {
    ...filters,
    page: filters.pagination?.page || 1,
    pageSize: filters.pagination?.pageSize || 20,
  };

  // Make a GET request to the base notifications endpoint with query params
  return apiClient.get(NOTIFICATION_ENDPOINTS.BASE, queryParams);
};

/**
 * Retrieves a specific notification by ID
 * @param notificationId The ID of the notification to retrieve
 * @returns Promise resolving to the notification details
 */
const getNotificationById = (
  notificationId: string
): Promise<ApiResponse<Notification>> => {
  // Construct the endpoint URL with the notification ID
  const endpoint = NOTIFICATION_ENDPOINTS.BY_ID(notificationId);
  
  // Make a GET request to the endpoint
  return apiClient.get(endpoint);
};

/**
 * Marks specified notifications as read
 * @param notificationIds Array of notification IDs to mark as read
 * @returns Promise resolving to success response
 */
const markAsRead = (
  notificationIds: string[]
): Promise<ApiResponse<void>> => {
  // Make a PUT request to the mark read endpoint
  // Include notification IDs in the request body
  return apiClient.put(NOTIFICATION_ENDPOINTS.MARK_READ, { notificationIds });
};

/**
 * Gets the count of unread notifications for the current user
 * @returns Promise resolving to the unread count
 */
const getUnreadCount = (): Promise<ApiResponse<{ count: number }>> => {
  // Make a GET request to the unread count endpoint
  return apiClient.get(NOTIFICATION_ENDPOINTS.UNREAD_COUNT);
};

/**
 * Retrieves the user's notification preferences
 * @returns Promise resolving to notification preferences
 */
const getNotificationPreferences = (): Promise<ApiResponse<NotificationPreference[]>> => {
  // Make a GET request to the notification preferences endpoint
  return apiClient.get(NOTIFICATION_ENDPOINTS.PREFERENCES);
};

/**
 * Updates the user's notification preferences
 * @param preferences Updated notification preferences
 * @returns Promise resolving to updated preferences
 */
const updateNotificationPreferences = (
  preferences: NotificationPreference[]
): Promise<ApiResponse<NotificationPreference[]>> => {
  // Make a PUT request to the notification preferences endpoint
  // Include updated preferences in the request body
  return apiClient.put(NOTIFICATION_ENDPOINTS.PREFERENCES, { preferences });
};

/**
 * Dismisses all notifications for the current user
 * @returns Promise resolving to success response
 */
const dismissAll = (): Promise<ApiResponse<void>> => {
  // Make a PUT request to the dismiss all notifications endpoint
  return apiClient.put(NOTIFICATION_ENDPOINTS.DISMISS_ALL, {});
};

// Export the API client methods
export default {
  getNotifications,
  getNotificationById,
  markAsRead,
  getUnreadCount,
  getNotificationPreferences,
  updateNotificationPreferences,
  dismissAll
};