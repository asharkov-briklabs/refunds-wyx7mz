import React, { useState, useEffect, useCallback } from 'react';
import classNames from 'classnames'; // classnames 2.3.2
import { CheckCircleIcon, TimesCircleIcon, WarningIcon, InfoCircleIcon } from '../../../assets/icons/status-icons';
import { CancelIcon } from '../../../assets/icons/action-icons';
import { NotificationType } from '../../../types/notification.types';

/**
 * Types of notification icons that can be displayed in the UI
 */
export enum NotificationIconType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * Props for the Toast component
 */
export interface ToastProps {
  /** Unique identifier for the toast */
  id: string;
  /** Main content of the toast */
  message: string;
  /** Optional title for the toast */
  title?: string;
  /** The type of toast which determines its styling */
  type?: NotificationIconType;
  /** Duration in milliseconds before auto-dismissing (0 for no auto-dismiss) */
  duration?: number;
  /** Whether the toast can be manually dismissed */
  dismissible?: boolean;
  /** Callback function when toast is closed */
  onClose?: (id: string) => void;
  /** Optional label for an action button */
  actionLabel?: string;
  /** Optional callback for when the action button is clicked */
  onAction?: () => void;
  /** Related notification type from the system */
  notificationType?: NotificationType;
}

/**
 * Toast component for displaying temporary notifications with different severity levels.
 * 
 * Provides visual feedback to users about system events and actions through
 * toast notifications that appear temporarily and can be dismissed manually
 * or automatically after a specified duration.
 * 
 * @example
 * // Basic success toast
 * <Toast
 *   id="success-1"
 *   type={NotificationIconType.SUCCESS}
 *   message="Refund successfully processed"
 *   onClose={(id) => console.log(`Toast ${id} closed`)}
 * />
 * 
 * @example
 * // Error toast with a title and action button
 * <Toast
 *   id="error-1"
 *   type={NotificationIconType.ERROR}
 *   title="Refund Failed"
 *   message="Unable to process refund. Please try again."
 *   actionLabel="Retry"
 *   onAction={() => handleRetry()}
 *   onClose={(id) => console.log(`Toast ${id} closed`)}
 * />
 * 
 * @example
 * // Toast with system notification type
 * <Toast
 *   id="notification-1"
 *   type={NotificationIconType.INFO}
 *   message="Refund request created"
 *   notificationType={NotificationType.REFUND_CREATED}
 *   onClose={(id) => console.log(`Toast ${id} closed`)}
 * />
 */
const Toast: React.FC<ToastProps> = ({
  id,
  message,
  title,
  type = NotificationIconType.INFO,
  duration = 5000,
  dismissible = true,
  onClose,
  actionLabel,
  onAction,
  notificationType,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  // Handle closing the toast
  const handleClose = useCallback(() => {
    setIsVisible(false);
    // Wait for animation to complete before calling onClose
    setTimeout(() => {
      if (onClose) {
        onClose(id);
      }
    }, 300); // Animation duration
  }, [id, onClose]);

  // Handle action button click
  const handleAction = useCallback(() => {
    if (onAction) {
      onAction();
    }
  }, [onAction]);

  // Set up auto-dismiss timer
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      // Clean up timer
      return () => clearTimeout(timer);
    }
  }, [duration, handleClose]);

  // Determine which icon to use based on type
  let Icon;
  switch (type) {
    case NotificationIconType.SUCCESS:
      Icon = CheckCircleIcon;
      break;
    case NotificationIconType.ERROR:
      Icon = TimesCircleIcon;
      break;
    case NotificationIconType.WARNING:
      Icon = WarningIcon;
      break;
    case NotificationIconType.INFO:
    default:
      Icon = InfoCircleIcon;
      break;
  }

  // Construct className based on type and visibility
  const toastClassName = classNames(
    'toast',
    `toast-${type}`,
    {
      'toast-visible': isVisible,
      'toast-hidden': !isVisible,
    },
    notificationType && `toast-notification-${notificationType.toLowerCase()}`
  );

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={toastClassName}
      data-testid={`toast-${id}`}
      data-notification-type={notificationType}
    >
      <div className="toast-icon">
        <Icon aria-hidden="true" />
      </div>
      <div className="toast-content">
        {title && <div className="toast-title">{title}</div>}
        <div className="toast-message">{message}</div>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={handleAction}
          className="toast-action-button"
        >
          {actionLabel}
        </button>
      )}
      {dismissible && (
        <button
          type="button"
          onClick={handleClose}
          className="toast-close-button"
          aria-label="Close notification"
        >
          <CancelIcon aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default Toast;