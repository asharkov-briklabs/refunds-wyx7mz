import { useState, useEffect, useCallback } from 'react'; // react ^18.2.0
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchNotifications,
  markNotificationsAsRead,
  fetchUnreadCount,
  updateNotificationPreferences,
  dismissAllNotifications,
  fetchNotificationPreferences,
  selectNotifications,
  selectUnreadCount,
  selectIsLoadingNotifications,
  selectNotificationPreferences
} from '../store/slices/notification.slice';
import {
  Notification,
  NotificationPreference,
  NotificationFilter
} from '../types/notification.types';

/**
 * Custom hook for managing user notifications in components
 * @returns Object containing notification data and management functions: { notifications, unreadCount, isLoading, error, fetchNotifications, markAsRead, markAllAsRead, dismissAll, updatePreferences, preferences }
 */
const useNotification = () => {
  // LD1: Initialize dispatch and local error state
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);

  // LD1: Select notifications, unread count, loading state, and preferences from Redux state
  const notifications = useAppSelector(selectNotifications);
  const unreadCount = useAppSelector(selectUnreadCount);
  const isLoading = useAppSelector(selectIsLoadingNotifications);
  const preferences = useAppSelector(selectNotificationPreferences);

  // LD1: Define fetchUserNotifications callback that dispatches fetchNotifications with optional filters
  const fetchUserNotifications = useCallback(
    (filters?: NotificationFilter) => {
      dispatch(fetchNotifications(filters))
        .unwrap()
        .catch((err: any) => {
          setError(err);
        });
    },
    [dispatch]
  );

  // LD1: Define markAsRead callback that dispatches markNotificationsAsRead for a single notification
  const markAsRead = useCallback(
    (notificationId: string) => {
      dispatch(markNotificationsAsRead([notificationId]))
        .unwrap()
        .catch((err: any) => {
          setError(err);
        });
    },
    [dispatch]
  );

  // LD1: Define markAllAsRead callback that dispatches markNotificationsAsRead for all notifications
  const markAllAsRead = useCallback(() => {
    const notificationIds = notifications.map((notification) => notification.id);
    dispatch(markNotificationsAsRead(notificationIds))
      .unwrap()
      .catch((err: any) => {
        setError(err);
      });
  }, [dispatch, notifications]);

  // LD1: Define dismissAll callback that dispatches dismissAllNotifications
  const dismissAll = useCallback(() => {
    dispatch(dismissAllNotifications())
      .unwrap()
      .catch((err: any) => {
        setError(err);
      });
  }, [dispatch]);

  // LD1: Define updatePreferences callback that dispatches updateNotificationPreferences with new preferences
  const updatePreferences = useCallback(
    (newPreferences: NotificationPreference[]) => {
      dispatch(updateNotificationPreferences(newPreferences))
        .unwrap()
        .catch((err: any) => {
          setError(err);
        });
    },
    [dispatch]
  );

  // LD1: Define fetchPreferences callback that dispatches fetchNotificationPreferences
  const fetchPreferences = useCallback(() => {
    dispatch(fetchNotificationPreferences())
      .unwrap()
      .catch((err: any) => {
        setError(err);
      });
  }, [dispatch]);

  // LD1: Use useEffect to fetch notifications and unread count when component mounts
  useEffect(() => {
    fetchUserNotifications();
    dispatch(fetchUnreadCount());
    fetchPreferences();
  }, [dispatch, fetchUserNotifications, fetchPreferences]);

  // LD1: Return object with notifications data and all management functions
  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications: fetchUserNotifications,
    markAsRead,
    markAllAsRead,
    dismissAll,
    updatePreferences,
    preferences,
    fetchPreferences
  };
};

export default useNotification;