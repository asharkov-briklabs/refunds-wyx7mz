import React, { useState, useRef, useEffect, useCallback } from 'react'; // react ^18.2.0
import clsx from 'clsx'; // ^1.2.1
import NotificationAlert from '../../shared/NotificationAlert';
import Badge from '../../common/Badge';
import Button, { ButtonVariant, ButtonSize } from '../../common/Button';
import useNotification from '../../../hooks/useNotification';
import { 
  Notification, 
  NotificationType, 
  NotificationPriority,
  NotificationChannel 
} from '../../../types/notification.types';
import { formatRelativeTime } from '../../../utils/date.utils';
import { 
  InfoCircleIcon, 
  BellIcon, 
  CheckCircleIcon, 
  TimesCircleIcon, 
  WarningIcon 
} from '../../../assets/icons/status-icons';

/**
 * Interface defining the props for the NotificationCenter component
 */
interface NotificationCenterProps {
  /**
   * Optional CSS class to apply to the notification center container
   */
  className?: string;
  /**
   * Optional max height for the notification dropdown panel
   */
  maxHeight?: string;
}

/**
 * Maps notification types to their corresponding icon components
 * @param {NotificationType} notificationType
 * @returns {React.ReactNode} The appropriate icon for the notification type
 */
const getNotificationIcon = (notificationType: NotificationType): React.ReactNode => {
  switch (notificationType) {
    case NotificationType.REFUND_COMPLETED:
      return <CheckCircleIcon className="w-5 h-5 text-green-500" aria-hidden={true} />;
    case NotificationType.REFUND_FAILED:
      return <TimesCircleIcon className="w-5 h-5 text-red-500" aria-hidden={true} />;
    case NotificationType.APPROVAL_REQUESTED:
    case NotificationType.APPROVAL_REMINDER:
    case NotificationType.APPROVAL_ESCALATED:
      return <WarningIcon className="w-5 h-5 text-yellow-500" aria-hidden={true} />;
    default:
      return <InfoCircleIcon className="w-5 h-5 text-blue-500" aria-hidden={true} />;
  }
};

/**
 * Groups notification items by date categories (Today, Yesterday, This Week, Earlier)
 * @param {Notification[]} notifications
 * @returns {Map<string, Notification[]>} Map with date group keys and arrays of notifications
 */
const groupNotificationsByDate = (notifications: Notification[]): Map<string, Notification[]> => {
  // LD1: Initialize a Map to hold grouped notifications
  const groupedNotifications = new Map<string, Notification[]>();

  // LD1: Get today's and yesterday's dates for comparison
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // LD1: Loop through each notification
  notifications.forEach(notification => {
    // LD1: Convert notification createdAt string to Date object
    const createdAt = new Date(notification.createdAt);

    // LD1: Determine appropriate date group (Today, Yesterday, This Week, Earlier)
    let dateGroup: string;
    if (createdAt.toDateString() === today.toDateString()) {
      dateGroup = 'Today';
    } else if (createdAt.toDateString() === yesterday.toDateString()) {
      dateGroup = 'Yesterday';
    } else if (createdAt.getTime() > new Date(today.setDate(today.getDate() - 7)).getTime()) {
      dateGroup = 'This Week';
    } else {
      dateGroup = 'Earlier';
    }

    // LD1: Add notification to the appropriate group in the Map
    if (!groupedNotifications.has(dateGroup)) {
      groupedNotifications.set(dateGroup, []);
    }
    groupedNotifications.get(dateGroup)?.push(notification);
  });

  // LD1: Return the populated Map object
  return groupedNotifications;
};

/**
 * Component that displays a dropdown panel of user notifications with management options
 * @param {NotificationCenterProps} props
 * @returns {JSX.Element} Rendered notification center component
 */
const NotificationCenter: React.FC<NotificationCenterProps> = (props) => {
  // LD1: Destructure props: className, maxHeight
  const { className, maxHeight } = props;

  // LD1: Get notifications, unread count, and notification functions from useNotification hook
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead, 
    dismissAll, 
    updatePreferences,
    preferences,
    fetchPreferences
  } = useNotification();

  // LD1: Initialize state for dropdown visibility: isOpen
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // LD1: Initialize state for current view: currentView (notifications or preferences)
  const [currentView, setCurrentView] = useState<'notifications' | 'preferences'>('notifications');

  // LD1: Initialize state for selected notification filter: filter (all, unread)
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // LD1: Set up ref for the dropdown container to handle click outside
  const dropdownRef = useRef<HTMLDivElement>(null);

  // LD1: Create toggleDropdown function to show/hide notifications panel
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // LD1: Create handleClickOutside function to close dropdown when clicking outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  // LD1: Create handleMarkAllAsRead function to mark all notifications as read
  const handleMarkAllAsRead = () => {
    markAllAsRead();
    setIsOpen(false);
  };

  // LD1: Create handleNotificationClick function to handle individual notification click
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    // Add navigation logic here if needed
  };

  // LD1: Create getFilteredNotifications function to apply current filter
  const getFilteredNotifications = () => {
    if (filter === 'unread') {
      return notifications.filter(notification => notification.readAt === null);
    }
    return notifications;
  };

  // LD1: Create handleFilterChange function to update the current filter
  const handleFilterChange = (newFilter: 'all' | 'unread') => {
    setFilter(newFilter);
  };

  // LD1: Create handleSavePreferences function to update notification preferences
  const handleSavePreferences = (newPreferences: NotificationPreference[]) => {
    updatePreferences(newPreferences);
    setCurrentView('notifications');
  };

  // LD1: Set up useEffect to add and remove document click event listener
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  // LD1: Group filtered notifications by date using groupNotificationsByDate
  const filteredNotifications = getFilteredNotifications();
  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  // LD1: Render the notification bell icon with unread badge
  // LD1: Render the dropdown panel when isOpen is true
  // LD1: Include notification header with filters and mark all read button
  // LD1: Render grouped notifications by date sections
  // LD1: Render preferences view when currentView is 'preferences'
  // LD1: Include empty state when no notifications match filter
  // LD1: Include loading state during data fetching
  return (
    <div className={clsx("relative", className)} ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="View notifications"
      >
        <BellIcon className="h-6 w-6 text-gray-500" aria-hidden="true" />
        {unreadCount > 0 && (
          <Badge className="absolute top-1 right-1" variant="error" size="sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-md shadow-lg overflow-hidden z-10 bg-white border border-gray-200"
          style={{ maxHeight: maxHeight || '600px' }}
        >
          <div className="py-2">
            <div className="px-4 py-2 flex items-center justify-between border-b border-gray-200">
              <h5 className="text-sm font-medium text-gray-900">Notifications</h5>
              <div>
                <Button 
                  variant={ButtonVariant.GHOST} 
                  size={ButtonSize.SM} 
                  onClick={handleMarkAllAsRead}
                  disabled={isLoading || notifications.length === 0}
                >
                  Mark all as read
                </Button>
              </div>
            </div>
            <div className="px-4 py-2 flex items-center justify-start border-b border-gray-200">
              <Button 
                variant={currentView === 'notifications' ? ButtonVariant.PRIMARY : ButtonVariant.GHOST} 
                size={ButtonSize.SM} 
                onClick={() => setCurrentView('notifications')}
                disabled={isLoading}
              >
                Notifications
              </Button>
              <Button 
                variant={currentView === 'preferences' ? ButtonVariant.PRIMARY : ButtonVariant.GHOST} 
                size={ButtonSize.SM} 
                onClick={() => setCurrentView('preferences')}
                disabled={isLoading}
              >
                Preferences
              </Button>
            </div>

            {currentView === 'notifications' && (
              <>
                <div className="px-4 py-2 flex items-center justify-between">
                  <label htmlFor="notification-filter" className="block text-sm font-medium text-gray-700">
                    Filter:
                  </label>
                  <select
                    id="notification-filter"
                    className="mt-1 block w-auto py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={filter}
                    onChange={(e) => handleFilterChange(e.target.value as 'all' | 'unread')}
                    disabled={isLoading}
                  >
                    <option value="all">All</option>
                    <option value="unread">Unread</option>
                  </select>
                </div>

                <div className="overflow-y-auto" style={{ maxHeight: maxHeight ? `calc(${maxHeight} - 150px)` : '450px' }}>
                  {isLoading ? (
                    <div className="p-4 text-center text-gray-500">Loading notifications...</div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No notifications found.</div>
                  ) : (
                    Array.from(groupedNotifications.entries()).map(([dateGroup, notifications]) => (
                      <div key={dateGroup}>
                        <h6 className="px-4 py-2 font-semibold text-gray-700">{dateGroup}</h6>
                        <ul>
                          {notifications.map(notification => (
                            <li key={notification.id} className="border-b border-gray-200 last:border-none">
                              <button
                                onClick={() => handleNotificationClick(notification)}
                                className="w-full text-left p-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 block"
                              >
                                <div className="flex items-start">
                                  <div className="flex-shrink-0 mr-3">
                                    {getNotificationIcon(notification.type)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                                    <p className="text-sm text-gray-500">{notification.body}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {formatRelativeTime(notification.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {currentView === 'preferences' && preferences && (
              <div className="p-4">
                <h6 className="font-semibold text-gray-700 mb-2">Notification Preferences</h6>
                {preferences.map(pref => (
                  <div key={`${pref.notificationType}-${pref.channel}`} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-none">
                    <div className="text-sm text-gray-700">
                      {pref.notificationType} ({pref.channel})
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                        checked={pref.enabled}
                        onChange={(e) => handleSavePreferences(
                          preferences.map(p => 
                            p.notificationType === pref.notificationType && p.channel === pref.channel
                              ? { ...p, enabled: e.target.checked }
                              : p
                          )
                        )}
                      />
                      <span className="ml-2 text-gray-700">Enabled</span>
                    </label>
                  </div>
                ))}
                <div className="mt-4">
                  <Button variant={ButtonVariant.PRIMARY} size={ButtonSize.MD} onClick={() => setCurrentView('notifications')}>
                    Back to Notifications
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;