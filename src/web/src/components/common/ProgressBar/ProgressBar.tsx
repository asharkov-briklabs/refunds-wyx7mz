import React from 'react'; // ^18.2.0
import classNames from 'classnames'; // ^2.3.2

/**
 * Props interface for the ProgressBar component
 */
export interface ProgressBarProps {
  /** The progress value as a percentage (0-100) */
  progress: number;
  /** The visual style variant: 'success', 'warning', 'error', or 'info' */
  variant?: string;
  /** The height of the progress bar in pixels or CSS value */
  height?: number | string;
  /** Optional label to display next to the progress bar */
  label?: string;
  /** Whether to show the percentage value */
  showPercentage?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Whether to show animation for the progress bar */
  animated?: boolean;
}

/**
 * Determines the appropriate CSS class based on the variant
 * @param variant - The variant name
 * @returns CSS class names for the given variant
 */
const getVariantClass = (variant: string): string => {
  switch (variant) {
    case 'success':
      return 'bg-green-500';
    case 'warning':
      return 'bg-yellow-500';
    case 'error':
      return 'bg-red-500';
    case 'info':
      return 'bg-blue-500';
    default:
      return 'bg-blue-500'; // Default to info/blue
  }
};

/**
 * A progress bar component that visually represents progress as a percentage
 */
const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  variant = 'info',
  height = '8px',
  label,
  showPercentage = false,
  className,
  animated = false,
}) => {
  // Ensure progress is within 0-100 range
  const boundedProgress = Math.min(100, Math.max(0, progress));
  
  // Determine height value for styling
  const heightValue = typeof height === 'number' ? `${height}px` : height;
  
  // Set styles for container and progress bar
  const containerStyle = { height: heightValue };
  const progressStyle = { width: `${boundedProgress}%` };
  
  // Get appropriate CSS classes for the variant
  const variantClass = getVariantClass(variant);
  
  // Combine container classes with any provided className
  const containerClasses = classNames(
    'w-full bg-gray-200 rounded-full overflow-hidden',
    className
  );
  
  // Classes for the progress bar itself
  const progressBarClasses = classNames(
    variantClass,
    'h-full rounded-full transition-all duration-300 ease-in-out',
    {
      'animate-pulse': animated,
    }
  );

  return (
    <div className="flex items-center">
      {label && <div className="mr-2 text-sm font-medium">{label}</div>}
      
      <div className={containerClasses} style={containerStyle}>
        <div 
          className={progressBarClasses} 
          style={progressStyle}
          role="progressbar"
          aria-valuenow={boundedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      
      {showPercentage && (
        <div className="ml-2 text-sm font-medium">{Math.round(boundedProgress)}%</div>
      )}
    </div>
  );
};

export default ProgressBar;