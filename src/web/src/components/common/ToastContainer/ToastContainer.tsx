import React from 'react'; // react ^18.2.0
import { CSSTransition, TransitionGroup } from 'react-transition-group'; // react-transition-group ^4.4.5
import classNames from 'classnames'; // classnames ^2.3.2
import Toast from '../Toast/Toast';
import useToast, { ToastItem } from '../../../hooks/useToast';

/**
 * Props for the ToastContainer component
 */
interface ToastContainerProps {
  /** Position of the toast container on the screen */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  /** Maximum number of toasts to display at once */
  maxToasts?: number;
  /** Additional CSS class for the container */
  containerClassName?: string;
}

/**
 * Container component that manages and displays multiple toast notifications.
 * Handles positioning, stacking, and animation of toast notifications.
 * 
 * This component provides visual feedback through toast notifications for various
 * system events and user actions, implementing consistent feedback patterns with
 * clear visual indicators for status updates. Ensures all notifications are accessible
 * with proper ARIA attributes and focus management.
 * 
 * @example
 * <ToastContainer
 *   position="top-right"
 *   maxToasts={5}
 * />
 */
const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'top-right',
  maxToasts = 5,
  containerClassName,
}) => {
  // Get the toasts from the custom hook
  const { toasts, removeToast } = useToast();

  // Limit the number of visible toasts
  const visibleToasts = toasts.slice(0, maxToasts);

  // Determine position classes
  const positionClasses = {
    'toast-container--top-right': position === 'top-right',
    'toast-container--top-left': position === 'top-left',
    'toast-container--bottom-right': position === 'bottom-right',
    'toast-container--bottom-left': position === 'bottom-left',
    'toast-container--top-center': position === 'top-center',
    'toast-container--bottom-center': position === 'bottom-center',
  };

  // Construct container className
  const containerClasses = classNames(
    'toast-container',
    positionClasses,
    containerClassName
  );

  return (
    <TransitionGroup
      className={containerClasses}
      aria-live="polite"
      aria-atomic="true"
      data-testid="toast-container"
    >
      {visibleToasts.map((toast: ToastItem) => (
        <CSSTransition
          key={toast.id}
          timeout={300}
          classNames="toast-animation"
        >
          <Toast
            id={toast.id}
            message={toast.message}
            title={toast.title}
            type={toast.type}
            duration={toast.duration || 0}
            dismissible={toast.dismissible}
            actionLabel={toast.actionLabel}
            onAction={toast.onAction}
            onClose={removeToast}
          />
        </CSSTransition>
      ))}
    </TransitionGroup>
  );
};

export default ToastContainer;