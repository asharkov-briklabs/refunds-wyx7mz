import React from 'react'; // ^18.2.0
import classNames from 'classnames'; // ^2.3.2
import Spinner from '../Spinner';

/**
 * Defines the available visual styles for the button
 */
export enum ButtonVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TERTIARY = 'tertiary',
  SUCCESS = 'success',
  DANGER = 'danger',
  GHOST = 'ghost',
  LINK = 'link'
}

/**
 * Defines the available button sizes
 */
export enum ButtonSize {
  SM = 'sm',
  MD = 'md',
  LG = 'lg'
}

/**
 * Defines the available button types
 */
export enum ButtonType {
  BUTTON = 'button',
  SUBMIT = 'submit',
  RESET = 'reset'
}

/**
 * Props for the Button component
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant of the button */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** HTML button type attribute */
  type?: ButtonType;
  /** Additional CSS classes to apply */
  className?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the button is in a loading state */
  isLoading?: boolean;
  /** Whether the button should take up full width of its container */
  fullWidth?: boolean;
  /** Icon to display at the start (left) of the button */
  startIcon?: React.ReactNode;
  /** Icon to display at the end (right) of the button */
  endIcon?: React.ReactNode;
  /** Accessibility label for screen readers */
  ariaLabel?: string;
}

/**
 * Renders a customizable button component with support for different variants,
 * sizes, loading states, and icons.
 */
const Button: React.FC<ButtonProps> = ({
  children,
  variant = ButtonVariant.PRIMARY,
  size = ButtonSize.MD,
  type = ButtonType.BUTTON,
  className = '',
  disabled = false,
  isLoading = false,
  fullWidth = false,
  onClick,
  startIcon,
  endIcon,
  ariaLabel,
  ...rest
}) => {
  // Define variant class mapping for each button style variant
  const variantClasses = {
    [ButtonVariant.PRIMARY]: 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent focus:ring-blue-500',
    [ButtonVariant.SECONDARY]: 'bg-gray-200 hover:bg-gray-300 text-gray-800 border border-transparent focus:ring-gray-500',
    [ButtonVariant.TERTIARY]: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500',
    [ButtonVariant.SUCCESS]: 'bg-green-600 hover:bg-green-700 text-white border border-transparent focus:ring-green-500',
    [ButtonVariant.DANGER]: 'bg-red-600 hover:bg-red-700 text-white border border-transparent focus:ring-red-500',
    [ButtonVariant.GHOST]: 'bg-transparent hover:bg-gray-100 text-gray-700 border border-transparent focus:ring-gray-400',
    [ButtonVariant.LINK]: 'bg-transparent text-blue-600 hover:text-blue-800 hover:underline border-none p-0 focus:underline',
  };

  // Define size class mapping for button padding, font size, and border radius
  const sizeClasses = {
    [ButtonSize.SM]: 'px-2.5 py-1.5 text-sm rounded',
    [ButtonSize.MD]: 'px-4 py-2 text-base rounded-md',
    [ButtonSize.LG]: 'px-6 py-3 text-lg rounded-lg',
  };

  // Define focus ring style based on button variant
  const focusRingClasses = 
    variant === ButtonVariant.LINK 
      ? 'focus:outline-none' 
      : 'focus:outline-none focus:ring-2 focus:ring-offset-2';

  // Construct final className string using classNames utility
  const buttonClasses = classNames(
    'inline-flex items-center justify-center font-medium transition-colors duration-200',
    variant !== ButtonVariant.LINK ? sizeClasses[size] : '',
    variantClasses[variant],
    focusRingClasses,
    {
      'opacity-75 cursor-not-allowed': disabled || isLoading,
      'w-full': fullWidth,
    },
    className
  );

  // Define icon spacing based on button size
  const spacingClasses = {
    [ButtonSize.SM]: { start: 'mr-1.5', end: 'ml-1.5' },
    [ButtonSize.MD]: { start: 'mr-2', end: 'ml-2' },
    [ButtonSize.LG]: { start: 'mr-3', end: 'ml-3' },
  };

  // Map button size to spinner size
  const spinnerSizeMap = {
    [ButtonSize.SM]: 'sm',
    [ButtonSize.MD]: 'md',
    [ButtonSize.LG]: 'lg',
  };

  // Determine spinner color based on button variant
  const getSpinnerColor = () => {
    if (
      variant === ButtonVariant.PRIMARY || 
      variant === ButtonVariant.SUCCESS || 
      variant === ButtonVariant.DANGER
    ) {
      return 'white';
    }
    return 'primary';
  };

  // Handle click when loading or disabled
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isLoading || disabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || isLoading}
      onClick={handleClick}
      aria-disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-label={ariaLabel}
      {...rest}
    >
      {isLoading && (
        <Spinner 
          size={spinnerSizeMap[size]} 
          color={getSpinnerColor()} 
          className={spacingClasses[size].start}
        />
      )}
      {!isLoading && startIcon && (
        <span className={spacingClasses[size].start}>{startIcon}</span>
      )}
      <span>{children}</span>
      {endIcon && (
        <span className={spacingClasses[size].end}>{endIcon}</span>
      )}
    </button>
  );
};

export default Button;