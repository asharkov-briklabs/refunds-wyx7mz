import React, { useRef, useEffect, useState, ReactNode, RefObject, useCallback } from 'react'; // ^18.2.0
import classNames from 'classnames'; // ^2.3.2
import { createPortal } from 'react-dom'; // ^18.2.0
import FocusTrap from 'focus-trap-react'; // ^10.1.1
import { XMarkIcon } from '@heroicons/react/24/outline'; // ^2.0.17
import Button from '../Button';

// Define modal size options
export enum ModalSize {
  SM = 'sm',
  MD = 'md',
  LG = 'lg',
  XL = 'xl',
  FULL = 'full'
}

// Props for the main Modal component
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEsc?: boolean;
  size?: ModalSize;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  children: ReactNode;
  initialFocusRef?: RefObject<HTMLElement>;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  testId?: string;
}

// Props for the ModalHeader component
interface ModalHeaderProps {
  className?: string;
  children: ReactNode;
  onClose?: () => void;
  showCloseButton?: boolean;
}

// Props for the ModalBody component
interface ModalBodyProps {
  className?: string;
  children: ReactNode;
}

// Props for the ModalFooter component
interface ModalFooterProps {
  className?: string;
  children: ReactNode;
}

/**
 * The main Modal component that provides a focused overlay for content
 * requiring user attention or interaction. Supports different sizes,
 * custom styling, and accessibility features.
 */
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEsc = true,
  size = ModalSize.MD,
  className = '',
  contentClassName = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  children,
  initialFocusRef,
  ariaLabelledBy,
  ariaDescribedBy,
  testId,
}) => {
  // Ref for modal container
  const modalRef = useRef<HTMLDivElement>(null);
  
  // State for animations
  const [isVisible, setIsVisible] = useState(false);
  
  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      // Set timeout to ensure the modal is visible after React renders it
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 10);
      
      document.body.style.overflow = 'hidden';
      
      return () => {
        clearTimeout(timer);
      };
    } else {
      setIsVisible(false);
      
      // Delay removing the modal to allow for exit animation
      const timer = setTimeout(() => {
        document.body.style.overflow = '';
      }, 300); // Should match transition duration
      
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);
  
  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (closeOnEsc && event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeOnEsc, isOpen, onClose]);
  
  // Handle click outside of modal
  const handleBackdropClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      onClose();
    }
  }, [closeOnBackdropClick, onClose]);
  
  // Return null if modal is not open
  if (!isOpen) {
    return null;
  }
  
  // Size classes mapping
  const sizeClasses = {
    [ModalSize.SM]: 'max-w-sm',
    [ModalSize.MD]: 'max-w-md',
    [ModalSize.LG]: 'max-w-lg',
    [ModalSize.XL]: 'max-w-xl',
    [ModalSize.FULL]: 'max-w-full mx-4'
  };
  
  // Create modal ID for aria-labelledby if not provided
  const modalId = ariaLabelledBy || 'modal-title';
  
  // Create modal content
  const modalContent = (
    <FocusTrap
      focusTrapOptions={{
        initialFocus: initialFocusRef?.current || undefined,
        escapeDeactivates: closeOnEsc,
        clickOutsideDeactivates: closeOnBackdropClick,
      }}
    >
      {/* Modal backdrop */}
      <div
        className={classNames(
          'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 transition-opacity duration-300',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleBackdropClick}
        data-testid={testId ? `${testId}-backdrop` : 'modal-backdrop'}
        aria-hidden="true"
      >
        {/* Modal container */}
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalId}
          aria-describedby={ariaDescribedBy}
          className={classNames(
            'relative w-full bg-white rounded-lg shadow-xl transform transition-all duration-300',
            sizeClasses[size],
            className,
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          )}
          data-testid={testId}
        >
          {/* Modal content */}
          <div className={classNames('flex flex-col max-h-[90vh]', contentClassName)}>
            {/* Render title in header if provided */}
            {title && (
              <ModalHeader
                className={headerClassName}
                onClose={onClose}
                showCloseButton={showCloseButton}
              >
                <h2 id={modalId} className="text-lg font-medium">
                  {title}
                </h2>
              </ModalHeader>
            )}
            
            {/* Render children as-is */}
            {children}
          </div>
        </div>
      </div>
    </FocusTrap>
  );
  
  // Use createPortal to render modal at the end of the document body
  return createPortal(modalContent, document.body);
};

/**
 * Header component for the modal with optional close button
 */
export const ModalHeader: React.FC<ModalHeaderProps> = ({
  className = '',
  children,
  onClose,
  showCloseButton = true
}) => {
  return (
    <div className={classNames(
      'flex items-center justify-between p-4 border-b border-gray-200',
      className
    )}>
      <div className="flex-1">{children}</div>
      
      {showCloseButton && onClose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          ariaLabel="Close modal"
          className="ml-auto -mr-2"
        >
          <XMarkIcon className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
};

/**
 * Body component for the modal content
 */
export const ModalBody: React.FC<ModalBodyProps> = ({
  className = '',
  children
}) => {
  return (
    <div className={classNames(
      'p-4 overflow-y-auto flex-1',
      className
    )}>
      {children}
    </div>
  );
};

/**
 * Footer component for modal actions like buttons
 */
export const ModalFooter: React.FC<ModalFooterProps> = ({
  className = '',
  children
}) => {
  return (
    <div className={classNames(
      'flex justify-end items-center p-4 border-t border-gray-200 gap-3',
      className
    )}>
      {children}
    </div>
  );
};

export default Modal;