import React, { useState, useRef, ReactNode } from 'react';
import clsx from 'clsx'; // ^1.2.1

interface TooltipProps {
  content: ReactNode | string;
  children: ReactNode;
  position?: string;
  className?: string;
  disabled?: boolean;
}

const Tooltip = ({
  content,
  children,
  position = 'top',
  className = '',
  disabled = false,
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  
  // Generate a unique ID for ARIA association
  const tooltipId = React.useMemo(() => `tooltip-${Math.random().toString(36).substring(2, 9)}`, []);
  
  const handleMouseEnter = () => {
    if (!disabled) {
      setIsVisible(true);
    }
  };
  
  const handleMouseLeave = () => {
    setIsVisible(false);
  };
  
  const handleFocus = () => {
    if (!disabled) {
      setIsVisible(true);
    }
  };
  
  const handleBlur = () => {
    setIsVisible(false);
  };
  
  const getPositionClasses = (position: string): string => {
    switch (position) {
      case 'top':
        return 'bottom-full mb-2 transform -translate-x-1/2 left-1/2';
      case 'bottom':
        return 'top-full mt-2 transform -translate-x-1/2 left-1/2';
      case 'left':
        return 'right-full mr-2 transform -translate-y-1/2 top-1/2';
      case 'right':
        return 'left-full ml-2 transform -translate-y-1/2 top-1/2';
      default:
        return 'bottom-full mb-2 transform -translate-x-1/2 left-1/2';
    }
  };
  
  return (
    <div className="relative inline-flex">
      <div
        ref={triggerRef}
        className={clsx('inline-block', className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-describedby={!disabled ? tooltipId : undefined}
        tabIndex={0}
      >
        {children}
      </div>
      
      {isVisible && !disabled && (
        <div
          id={tooltipId}
          role="tooltip"
          className={clsx(
            'absolute z-50 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-md shadow-sm',
            'max-w-xs pointer-events-none transition-opacity duration-200 opacity-100',
            getPositionClasses(position)
          )}
        >
          {content}
          <div
            className={clsx(
              'absolute w-2 h-2 bg-gray-900 transform rotate-45',
              position === 'top' && 'bottom-[-4px] left-1/2 -translate-x-1/2',
              position === 'bottom' && 'top-[-4px] left-1/2 -translate-x-1/2',
              position === 'left' && 'right-[-4px] top-1/2 -translate-y-1/2',
              position === 'right' && 'left-[-4px] top-1/2 -translate-y-1/2',
            )}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip;