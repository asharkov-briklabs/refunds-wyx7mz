import React, { useState, useEffect } from 'react'; // react ^18.2.0
import { Alert, AlertProps } from '../../common/Alert';
import useNotification from '../../../hooks/useNotification';
import { NotificationType, NotificationIconType, NotificationItem } from '../../../types/notification.types';

/**
 * Maps notification types to corresponding alert display types
 * @param {NotificationType} notificationType
 * @returns {NotificationIconType} The alert type to display (success, error, warning, info)
 */
const mapNotificationTypeToAlertType = (notificationType: NotificationType): NotificationIconType => {
  switch (notificationType) {
    case NotificationType.REFUND_COMPLETED:
      return 'success';
    case NotificationType.REFUND_FAILED:
      return 'error';
    case NotificationType.APPROVAL_REQUESTED:
    case NotificationType.APPROVAL_REMINDER:
    case NotificationType.APPROVAL_ESCALATED:
      return 'warning';
    default:
      return 'info';
  }
};

/**
 * Interface defining the props for the NotificationAlert component
 */
interface NotificationAlertProps {
  /**
   * The notification object to display
   */
  notification: NotificationItem;
  
  /**
   * Whether the alert is dismissible (default: true)
   */
  dismissible?: boolean;
  
  /**
   * Function to call when the alert is dismissed
   */
  onDismiss?: () => void;
  
  /**
   * Function to call when the view details button is clicked
   */
  onView?: (notification: NotificationItem) => void;
  
  /**
   * Additional CSS classes to apply to the alert container
   */
  className?: string;

  /**
   * Whether the alert should automatically close after a certain duration
   */
  autoClose?: boolean;

  /**
   * Duration in milliseconds after which the alert should automatically close
   */
  duration?: number;
}

/**
 * Component that displays notifications with appropriate styling and behavior
 */
const NotificationAlert: React.FC<NotificationAlertProps> = ({
  notification,
  dismissible = true,
  onDismiss,
  onView,
  className,
  autoClose,
  duration = 5000, // Default duration of 5 seconds
}) => {
  // LD1: Get the markAsRead function from useNotification hook
  const { markAsRead } = useNotification();

  // LD1: Set up visible state with useState hook, defaulting to true
  const [visible, setVisible] = useState<boolean>(true);

  // LD1: Determine alert type by mapping notification.type to the appropriate alert variant
  const alertType = mapNotificationTypeToAlertType(notification.type);

  // LD1: Set up auto-dismiss functionality with useEffect if autoClose is true
  useEffect(() => {
    if (autoClose && visible) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, visible]);

  // LD1: Create handleDismiss function that updates visible state, calls onDismiss if provided, and marks notification as read
  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) {
      onDismiss();
    }
    markAsRead(notification.id);
  };

  // LD1: Create handleView function that calls onView with the notification if provided
  const handleView = () => {
    if (onView) {
      onView(notification);
    }
  };

  // LD1: If visible is false, return null
  if (!visible) {
    return null;
  }

  // LD1: Render Alert component with appropriate type, title (from notification.title), and message (from notification.body)
  return (
    <Alert
      type={alertType}
      title={notification.title}
      message={notification.body}
      dismissible={dismissible}
      onDismiss={handleDismiss}
      actionLabel={onView ? 'View Details' : undefined}
      onAction={onView ? handleView : undefined}
      className={className}
    />
  );
};

export default NotificationAlert;