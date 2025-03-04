import React from 'react';
import classnames from 'classnames'; // ^2.3.2
import Button, { ButtonVariant, ButtonSize } from '../Button';
import { 
  CheckCircleIcon, 
  TimesCircleIcon, 
  WarningIcon, 
  InfoCircleIcon 
} from '../../../assets/icons/status-icons';

/**
 * Defines the available notification types for the Alert component
 */
export type NotificationIconType = 'success' | 'error' | 'warning' | 'info';

/**
 * Props interface for the Alert component
 */
export interface AlertProps {
  /**
   * The type of notification to display which determines the styling and icon
   */
  type: NotificationIconType;
  
  /**
   * The title or heading of the alert
   */
  title?: string;
  
  /**
   * The main message content of the alert
   */
  message: string;
  
  /**
   * Whether the alert can be dismissed (default: false)
   */
  dismissible?: boolean;
  
  /**
   * Function to call when the alert is dismissed
   * Required when dismissible is true
   */
  onDismiss?: () => void;
  
  /**
   * Text for an optional action button
   */
  actionLabel?: string;
  
  /**
   * Function to call when the action button is clicked
   * Required when actionLabel is provided
   */
  onAction?: () => void;
  
  /**
   * Additional CSS classes to apply to the alert container
   */
  className?: string;
}

/**
 * Helper function to get the appropriate icon based on notification type
 * 
 * @param type - The type of notification icon to display
 * @returns The React node containing the appropriate icon component
 */
const getStatusIcon = (type: NotificationIconType): React.ReactNode => {
  switch (type) {
    case 'success':
      return <CheckCircleIcon className="w-5 h-5 text-green-500" aria-hidden="true" />;
    case 'error':
      return <TimesCircleIcon className="w-5 h-5 text-red-500" aria-hidden="true" />;
    case 'warning':
      return <WarningIcon className="w-5 h-5 text-yellow-500" aria-hidden="true" />;
    case 'info':
      return <InfoCircleIcon className="w-5 h-5 text-blue-500" aria-hidden="true" />;
    default:
      return <InfoCircleIcon className="w-5 h-5 text-blue-500" aria-hidden="true" />;
  }
};

/**
 * Alert component for displaying notifications with different visual styles
 * based on their type (success, error, warning, info). Supports optional
 * title, dismissible functionality, and action buttons.
 */
const Alert: React.FC<AlertProps> = ({
  type,
  title,
  message,
  dismissible = false,
  onDismiss,
  actionLabel,
  onAction,
  className,
}) => {
  // Get the appropriate icon
  const icon = getStatusIcon(type);
  
  // Determine alert styles based on type
  const alertClasses = classnames(
    'flex items-start p-4 rounded-md',
    {
      'bg-green-50 border border-green-200': type === 'success',
      'bg-red-50 border border-red-200': type === 'error',
      'bg-yellow-50 border border-yellow-200': type === 'warning',
      'bg-blue-50 border border-blue-200': type === 'info',
    },
    className
  );

  // Determine text color based on type
  const textColorClasses = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
  };
  
  return (
    <div 
      className={alertClasses} 
      role="alert" 
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex-shrink-0 mr-3 mt-0.5">{icon}</div>
      
      <div className="flex-grow">
        {title && (
          <h4 className={`text-sm font-bold ${textColorClasses[type]}`}>
            {title}
          </h4>
        )}
        
        <div className={`text-sm ${textColorClasses[type]} ${title ? 'mt-1' : ''}`}>
          {message}
        </div>
        
        {actionLabel && onAction && (
          <div className="mt-3">
            <Button 
              variant={
                type === 'success' ? ButtonVariant.SUCCESS :
                type === 'error' ? ButtonVariant.DANGER :
                type === 'warning' ? ButtonVariant.SECONDARY :
                ButtonVariant.PRIMARY
              }
              size={ButtonSize.SM}
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          </div>
        )}
      </div>
      
      {dismissible && onDismiss && (
        <div className="flex-shrink-0 ml-3">
          <Button
            variant={ButtonVariant.GHOST}
            size={ButtonSize.SM}
            onClick={onDismiss}
            aria-label="Dismiss alert"
          >
            <span className="sr-only">Dismiss</span>
            <svg 
              className={`h-4 w-4 ${textColorClasses[type]}`}
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </Button>
        </div>
      )}
    </div>
  );
};

export default Alert;