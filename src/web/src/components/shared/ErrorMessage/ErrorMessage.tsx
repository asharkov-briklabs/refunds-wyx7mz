import React from 'react';
import { classNames } from '../../../utils/formatting.utils';
import { TimesCircleIcon, WarningIcon, InfoCircleIcon } from '../../../assets/icons/status-icons';

/**
 * Props for the ErrorMessage component
 */
export interface ErrorMessageProps {
  /** The message to display */
  message?: string;
  /** Additional CSS class names */
  className?: string;
  /** Data test ID for testing */
  testId?: string;
  /** The severity of the message */
  severity?: 'error' | 'warning' | 'info';
  /** Whether to show an icon */
  showIcon?: boolean;
  /** Children content as an alternative to message */
  children?: React.ReactNode;
}

/**
 * A component for displaying error, warning, or information messages
 * with appropriate styling and icons. Used throughout the application
 * for form validation errors, API error responses, and user notifications.
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  children,
  severity = 'error',
  className,
  testId = 'error-message',
  showIcon = true,
}) => {
  // If neither message nor children are provided, don't render anything
  if (!message && !children) {
    return null;
  }

  // Determine the appropriate icon based on severity
  const Icon = (() => {
    switch (severity) {
      case 'error':
        return TimesCircleIcon;
      case 'warning':
        return WarningIcon;
      case 'info':
        return InfoCircleIcon;
      default:
        return TimesCircleIcon;
    }
  })();

  // Generate CSS classes based on severity
  const containerClasses = classNames(
    'flex items-start p-3 rounded-md text-sm',
    {
      'bg-red-50 text-red-700 border border-red-200': severity === 'error',
      'bg-amber-50 text-amber-700 border border-amber-200': severity === 'warning',
      'bg-blue-50 text-blue-700 border border-blue-200': severity === 'info',
    },
    className
  );

  // Determine the appropriate ARIA role based on severity
  const ariaRole = severity === 'error' ? 'alert' : 'status';

  return (
    <div
      className={containerClasses}
      role={ariaRole}
      aria-live={severity === 'error' ? 'assertive' : 'polite'}
      data-testid={testId}
    >
      {showIcon && (
        <Icon
          className={classNames('w-5 h-5 mr-2 flex-shrink-0 mt-0.5', {
            'text-red-500': severity === 'error',
            'text-amber-500': severity === 'warning',
            'text-blue-500': severity === 'info',
          })}
          aria-hidden="true"
        />
      )}
      <div className="flex-1">{message || children}</div>
    </div>
  );
};

export default ErrorMessage;