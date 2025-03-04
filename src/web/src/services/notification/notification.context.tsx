import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ReactNode } from 'react';
import { Notification, NotificationPreference, NotificationFilter } from '../../types/notification.types';
import notificationService from './notification.service';
import { useAuth } from '../../hooks/useAuth';

/**
 * Type definition for notification context value
 */
interface NotificationContextValue {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  totalCount: number;
  preferences: NotificationPreference[];
  fetchNotifications: (filter?: NotificationFilter, page?: number, limit?: number) => Promise<void>;
  markAsRead: (notificationIds: string[]) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  updatePreferences: (preferences: NotificationPreference[]) => Promise<boolean>;
  startPolling: (intervalMs?: number) => void;
  stopPolling: () => void;
}

/**
 * Props for the NotificationProvider component
 */
interface NotificationProviderProps {
  children: ReactNode;
  enablePolling?: boolean;
  pollingInterval?: number;
}

// Create the notification context
const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

/**
 * Notification Provider Component
 * 
 * Provides notification state and functionality to all child components
 * through React Context. Manages notification fetching, polling, and updates.
 */
const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  enablePolling = true,
  pollingInterval = 30000,
}) => {
  // State for notification data
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [pollingId, setPollingId] = useState<number | null>(null);

  // Get authentication state from useAuth hook
  const { isAuthenticated, user } = useAuth();

  /**
   * Fetch notifications with optional filtering and pagination
   */
  const fetchNotifications = useCallback(async (
    filter?: NotificationFilter,
    page?: number,
    limit?: number
  ): Promise<void> => {
    if (!isAuthenticated) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch notifications from service
      const result = await notificationService.getNotifications(filter, page, limit);
      
      setNotifications(result.notifications);
      setTotalCount(result.total);
      
      // Fetch unread count
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * Fetch notification preferences
   */
  const fetchPreferences = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      return;
    }

    try {
      const prefs = await notificationService.getPreferences();
      setPreferences(prefs);
    } catch (err) {
      console.error('Error fetching notification preferences:', err);
    }
  }, [isAuthenticated]);

  /**
   * Mark one or more notifications as read
   */
  const markAsRead = useCallback(async (notificationIds: string[]): Promise<boolean> => {
    if (!isAuthenticated || notificationIds.length === 0) {
      return false;
    }

    try {
      const success = await notificationService.markAsRead(notificationIds);
      
      if (success) {
        // Update notifications list to reflect read status
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => 
            notificationIds.includes(notification.id)
              ? { ...notification, status: 'READ', readAt: new Date().toISOString() }
              : notification
          )
        );
        
        // Update unread count
        const count = await notificationService.getUnreadCount();
        setUnreadCount(count);
      }
      
      return success;
    } catch (err) {
      console.error('Error marking notifications as read:', err);
      return false;
    }
  }, [isAuthenticated]);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) {
      return false;
    }

    try {
      const success = await notificationService.markAllAsRead();
      
      if (success) {
        // Update all notifications to read status
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => ({
            ...notification,
            status: 'READ',
            readAt: new Date().toISOString()
          }))
        );
        
        // Reset unread count
        setUnreadCount(0);
      }
      
      return success;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      return false;
    }
  }, [isAuthenticated]);

  /**
   * Update notification preferences
   */
  const updatePreferences = useCallback(async (newPreferences: NotificationPreference[]): Promise<boolean> => {
    if (!isAuthenticated) {
      return false;
    }

    try {
      const success = await notificationService.updatePreferences(newPreferences);
      
      if (success) {
        setPreferences(newPreferences);
      }
      
      return success;
    } catch (err) {
      console.error('Error updating notification preferences:', err);
      return false;
    }
  }, [isAuthenticated]);

  /**
   * Start polling for new notifications
   */
  const startPolling = useCallback((intervalMs: number = 30000): void => {
    // Clear any existing polling
    stopPolling();
    
    // Start new polling
    const id = notificationService.setupNotificationPolling(intervalMs);
    setPollingId(id);
  }, []);

  /**
   * Stop polling for new notifications
   */
  const stopPolling = useCallback((): void => {
    if (pollingId !== null) {
      notificationService.clearNotificationPolling();
      setPollingId(null);
    }
  }, [pollingId]);

  // Load initial notification data when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchPreferences();
    } else {
      // Reset state when not authenticated
      setNotifications([]);
      setUnreadCount(0);
      setTotalCount(0);
      setPreferences([]);
    }
  }, [isAuthenticated, fetchNotifications, fetchPreferences]);

  // Setup notification polling when enabled and user is authenticated
  useEffect(() => {
    if (isAuthenticated && enablePolling) {
      startPolling(pollingInterval);
    } else {
      stopPolling();
    }
    
    return () => {
      stopPolling();
    };
  }, [isAuthenticated, enablePolling, pollingInterval, startPolling, stopPolling]);

  // Subscribe to notification events
  useEffect(() => {
    if (isAuthenticated) {
      // Handle notification updates
      const handleNotificationUpdate = () => {
        fetchNotifications();
      };
      
      // Handle new notifications
      const handleNewNotifications = (data: { count: number, newCount: number }) => {
        setUnreadCount(data.count);
        // Fetch latest notifications if there are new ones
        if (data.newCount > 0) {
          fetchNotifications();
        }
      };
      
      // Handle preference updates
      const handlePreferenceUpdate = () => {
        fetchPreferences();
      };
      
      // Subscribe to notification events
      notificationService.subscribeToNotifications('notifications-updated', handleNotificationUpdate);
      notificationService.subscribeToNotifications('new-notifications', handleNewNotifications);
      notificationService.subscribeToNotifications('preferences-updated', handlePreferenceUpdate);
      
      // Cleanup function
      return () => {
        notificationService.unsubscribeFromNotifications('notifications-updated', handleNotificationUpdate);
        notificationService.unsubscribeFromNotifications('new-notifications', handleNewNotifications);
        notificationService.unsubscribeFromNotifications('preferences-updated', handlePreferenceUpdate);
      };
    }
  }, [isAuthenticated, fetchNotifications, fetchPreferences]);

  // Create context value with all notification state and functions
  const contextValue: NotificationContextValue = {
    notifications,
    loading,
    error,
    unreadCount,
    totalCount,
    preferences,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    startPolling,
    stopPolling
  };

  // Provide the notification context to children components
  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Custom hook to use the notification context
 * 
 * @returns The current notification context value
 * @throws Error if used outside of NotificationProvider
 */
const useNotificationContext = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  
  return context;
};

export { NotificationProvider, NotificationContext, useNotificationContext };