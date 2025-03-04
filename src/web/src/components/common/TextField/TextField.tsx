import React, { forwardRef, useRef, useState, useImperativeHandle } from 'react';
import { classNames } from '../../../utils/formatting.utils';

/**
 * Props interface for the TextField component
 */
export interface TextFieldProps {
  /** Unique identifier for the input */
  id?: string;
  /** Name attribute for the input */
  name?: string;
  /** Label text displayed above the input */
  label?: string;
  /** Current input value */
  value?: string;
  /** Placeholder text displayed when input is empty */
  placeholder?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Error message displayed when input is invalid */
  error?: string;
  /** Input type (text, email, password, etc.) */
  type?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether the input is read-only */
  readOnly?: boolean;
  /** Whether the input is required */
  required?: boolean;
  /** Whether the input should be focused on mount */
  autoFocus?: boolean;
  /** Autocomplete attribute for the input */
  autoComplete?: string;
  /** Maximum length of the input value */
  maxLength?: number;
  /** Minimum length of the input value */
  minLength?: number;
  /** Size variant of the input */
  size?: 'small' | 'medium' | 'large';
  /** Visual style variant of the input */
  variant?: 'outlined' | 'filled' | 'standard';
  /** Additional class name for the root element */
  className?: string;
  /** Additional class name for the input element */
  inputClassName?: string;
  /** Additional class name for the label element */
  labelClassName?: string;
  /** Content to display at the start of the input */
  startAdornment?: React.ReactNode;
  /** Content to display at the end of the input */
  endAdornment?: React.ReactNode;
  /** Function called when input value changes */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Function called when input receives focus */
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Function called when input loses focus */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Function called when a key is pressed down */
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Function called when a key press is released */
  onKeyUp?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * A customizable text input component with validation states and accessibility support.
 * This component follows WCAG 2.1 AA accessibility standards and provides consistent styling
 * across the Refunds Service application.
 */
const TextField = forwardRef<HTMLInputElement, TextFieldProps>((props, ref) => {
  const {
    id,
    name,
    label,
    value,
    placeholder,
    helperText,
    error,
    type = 'text',
    disabled = false,
    readOnly = false,
    required = false,
    autoFocus = false,
    autoComplete,
    maxLength,
    minLength,
    size = 'medium',
    variant = 'outlined',
    className,
    inputClassName,
    labelClassName,
    startAdornment,
    endAdornment,
    onChange,
    onFocus,
    onBlur,
    onKeyDown,
    onKeyUp,
  } = props;

  // Track focus state for styling
  const [isFocused, setIsFocused] = useState(false);
  
  // Create internal ref for the input element
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Generate unique IDs for helper text and error for ARIA attributes
  const uniqueId = id || `text-field-${Math.random().toString(36).substring(2, 9)}`;
  const helperId = helperText ? `${uniqueId}-helper` : undefined;
  const errorId = error ? `${uniqueId}-error` : undefined;
  
  // Forward the internal ref to the parent component
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);
  
  // Handle focus event
  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (onFocus) {
      onFocus(event);
    }
  };
  
  // Handle blur event
  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (onBlur) {
      onBlur(event);
    }
  };
  
  // Generate container class names
  const containerClasses = classNames(
    'relative mb-4',
    className
  );
  
  // Generate label class names
  const labelClasses = classNames(
    'block mb-1 font-medium text-gray-700',
    {
      'text-gray-500': disabled,
      'text-red-600': error,
      'text-sm': size === 'small',
      'text-base': size === 'medium',
      'text-lg': size === 'large',
    },
    labelClassName
  );
  
  // Generate input wrapper class names based on variant, state, and size
  const inputWrapperClasses = classNames(
    'relative flex items-center w-full transition-colors duration-200',
    {
      // Variant-specific styles
      'border border-gray-300 rounded-md': variant === 'outlined',
      'bg-gray-100 border-b-2 border-gray-300': variant === 'filled',
      'border-b-2 border-gray-300': variant === 'standard',
      
      // State-specific styles
      'border-blue-500 ring-1 ring-blue-500': isFocused && !error && variant !== 'standard',
      'border-blue-500': isFocused && !error && variant === 'standard',
      'border-red-500 ring-1 ring-red-500': error && variant !== 'standard',
      'border-red-500': error && variant === 'standard',
      'bg-gray-50 cursor-not-allowed': disabled,
      
      // Size-specific styles
      'py-1 px-2': size === 'small',
      'py-2 px-3': size === 'medium',
      'py-3 px-4': size === 'large',
    }
  );
  
  // Generate input class names
  const inputClasses = classNames(
    'block w-full bg-transparent focus:outline-none',
    {
      'text-gray-900': !disabled,
      'text-gray-500': disabled,
      'cursor-not-allowed': disabled,
      'placeholder-gray-400': !disabled,
      'placeholder-gray-500': disabled,
      'text-sm': size === 'small',
      'text-base': size === 'medium',
      'text-lg': size === 'large',
    },
    inputClassName
  );
  
  // Generate helper/error text class names
  const helperTextClasses = classNames(
    'mt-1 text-sm',
    {
      'text-gray-500': !error,
      'text-red-600': error,
    }
  );

  return (
    <div className={containerClasses}>
      {/* Accessible label */}
      {label && (
        <label 
          htmlFor={uniqueId}
          className={labelClasses}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      
      {/* Input wrapper with optional adornments */}
      <div 
        className={inputWrapperClasses}
        aria-disabled={disabled}
      >
        {/* Start adornment (icon, prefix, etc.) */}
        {startAdornment && (
          <div className="flex items-center mr-2 text-gray-500">
            {startAdornment}
          </div>
        )}
        
        {/* Input element */}
        <input
          ref={inputRef}
          id={uniqueId}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          maxLength={maxLength}
          minLength={minLength}
          aria-invalid={!!error}
          aria-required={required}
          aria-describedby={
            error 
              ? errorId 
              : helperText 
                ? helperId 
                : undefined
          }
          className={inputClasses}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
        />
        
        {/* End adornment (icon, suffix, etc.) */}
        {endAdornment && (
          <div className="flex items-center ml-2 text-gray-500">
            {endAdornment}
          </div>
        )}
      </div>
      
      {/* Helper text or error message */}
      {(helperText || error) && (
        <div 
          className={helperTextClasses}
          id={error ? errorId : helperId}
          role={error ? 'alert' : undefined}
        >
          {error || helperText}
        </div>
      )}
    </div>
  );
});

// Display name for debugging
TextField.displayName = 'TextField';

export default TextField;