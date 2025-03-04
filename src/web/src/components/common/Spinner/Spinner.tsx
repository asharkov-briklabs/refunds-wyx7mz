import React from 'react'; // ^18.2.0
import classNames from 'classnames'; // ^2.3.2

/**
 * Props for the Spinner component
 */
interface SpinnerProps {
  /** Size of the spinner: small, medium (default), or large */
  size?: 'sm' | 'md' | 'lg';
  /** Color theme of the spinner: primary (default), secondary, or white */
  color?: 'primary' | 'secondary' | 'white';
  /** Additional CSS classes to apply */
  className?: string;
  /** Accessibility label for screen readers (default: "Loading...") */
  ariaLabel?: string;
}

/**
 * A customizable loading spinner component that provides visual feedback
 * during loading or processing states.
 */
const Spinner = ({
  size = 'md',
  color = 'primary',
  className = '',
  ariaLabel = 'Loading...',
}: SpinnerProps): JSX.Element => {
  // Size variants mapping
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  // Color variants mapping
  const colorClasses = {
    primary: 'text-blue-600',
    secondary: 'text-purple-600',
    white: 'text-white',
  };

  // Combine size and color classes with any additional className
  const spinnerClasses = classNames(
    'animate-spin',
    sizeClasses[size],
    colorClasses[color],
    className
  );

  return (
    <div role="status" className="inline-flex">
      <svg
        className={spinnerClasses}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
};

export default Spinner;