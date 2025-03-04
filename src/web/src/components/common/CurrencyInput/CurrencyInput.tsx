import React, { useState, useEffect, forwardRef } from 'react'; // version ^18.2.0
import classNames from 'classnames'; // version ^2.3.2

import {
  formatCurrencyInput,
  parseCurrencyInput,
  getCurrencySymbol,
  isValidCurrencyAmount,
} from '../../../utils/currency.utils';
import { semantic, common } from '../../../themes/colors';

/**
 * Props for the CurrencyInput component
 */
export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /** Current value of the input */
  value: number | undefined;
  /** Callback fired when the value changes */
  onChange: (value: number) => void;
  /** Currency code (ISO 4217) */
  currencyCode?: string;
  /** Locale for formatting */
  locale?: string;
  /** Label for the input */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Helper text to display below the input */
  helperText?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Content to display before the input */
  startAdornment?: React.ReactNode;
  /** Content to display after the input */
  endAdornment?: React.ReactNode;
  /** Custom class for the container */
  className?: string;
  /** Custom class for the input element */
  inputClassName?: string;
  /** Custom class for the label */
  labelClassName?: string;
  /** Custom class for the error message */
  errorClassName?: string;
  /** Custom class for the helper text */
  helperTextClassName?: string;
  /** Size of the input */
  size?: 'small' | 'medium' | 'large';
  /** Whether to allow negative values */
  allowNegative?: boolean;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
}

/**
 * Generates a unique ID for input elements when not provided
 * @returns A unique ID string
 */
const generateId = (): string => {
  return `currency-input-${Math.random().toString(36).substring(2, 11)}`;
};

/**
 * A specialized input component for currency values with formatting and validation
 */
const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>((props, ref) => {
  const {
    value,
    onChange,
    currencyCode = 'USD',
    locale = 'en-US',
    label,
    error,
    helperText,
    required = false,
    startAdornment,
    endAdornment,
    className,
    inputClassName,
    labelClassName,
    errorClassName,
    helperTextClassName,
    size = 'medium',
    allowNegative = false,
    min,
    max,
    id: propsId,
    placeholder,
    disabled,
    onBlur,
    onFocus,
    ...otherProps
  } = props;

  // Generate a unique ID if not provided
  const id = propsId || generateId();

  // State for the formatted display value
  const [displayValue, setDisplayValue] = useState<string>('');

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Update the display value with formatting
    setDisplayValue(formatCurrencyInput(inputValue, currencyCode, locale));
    
    // Parse the input to get the numeric value
    const numericValue = parseCurrencyInput(inputValue);
    
    // Apply min/max constraints
    let constrainedValue = numericValue;
    if (min !== undefined && numericValue < min) {
      constrainedValue = min;
    }
    if (max !== undefined && numericValue > max) {
      constrainedValue = max;
    }
    
    // Don't allow negative values unless specified
    if (!allowNegative && constrainedValue < 0) {
      constrainedValue = 0;
    }
    
    // Call the onChange callback with the numeric value
    onChange(constrainedValue);
  };

  // Handle blur to ensure proper formatting
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // If the field is empty, set display value to empty
    if (!value) {
      setDisplayValue('');
    } else {
      // Otherwise format the currency properly when user leaves the field
      setDisplayValue(formatCurrencyInput(value.toString(), currencyCode, locale));
    }
    
    // Call the original onBlur if provided
    if (onBlur) {
      onBlur(e);
    }
  };

  // Handle focus to aid in editing
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Select the entire value for easy editing
    e.target.select();
    
    // Call the original onFocus if provided
    if (onFocus) {
      onFocus(e);
    }
  };

  // Update display value when the value prop changes
  useEffect(() => {
    if (value !== undefined) {
      setDisplayValue(formatCurrencyInput(value.toString(), currencyCode, locale));
    } else {
      setDisplayValue('');
    }
  }, [value, currencyCode, locale]);

  // Determine container classes
  const containerClasses = classNames(
    'currency-input-container',
    {
      'currency-input-error': !!error,
      'currency-input-disabled': disabled,
      [`currency-input-${size}`]: size,
    },
    className
  );

  // Determine input classes
  const inputClasses = classNames(
    'currency-input',
    {
      'currency-input-error': !!error,
      'currency-input-disabled': disabled,
      [`currency-input-${size}`]: size,
    },
    inputClassName
  );

  // Get currency symbol if no startAdornment is provided
  const defaultStartAdornment = startAdornment === undefined ? (
    <span className="currency-input-symbol">{getCurrencySymbol(currencyCode, locale)}</span>
  ) : (
    startAdornment
  );

  // Default styles
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '16px',
    width: '100%',
  };

  const labelStyle: React.CSSProperties = {
    marginBottom: '6px',
    fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px',
    fontWeight: 500,
    color: error ? semantic.error.text : common.text.primary,
  };

  const inputContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    border: `1px solid ${error ? semantic.error.main : common.border}`,
    borderRadius: '4px',
    backgroundColor: disabled ? common.background.light : common.white,
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    border: 'none',
    padding: size === 'small' ? '6px 8px' : size === 'large' ? '12px 16px' : '8px 12px',
    fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px',
    backgroundColor: 'transparent',
    color: disabled ? common.text.disabled : common.text.primary,
    outline: 'none',
  };

  const adornmentStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 8px',
    color: disabled ? common.text.disabled : common.text.secondary,
  };

  const errorStyle: React.CSSProperties = {
    fontSize: '12px',
    color: semantic.error.text,
    marginTop: '4px',
  };

  const helperTextStyle: React.CSSProperties = {
    fontSize: '12px',
    color: common.text.secondary,
    marginTop: '4px',
  };

  return (
    <div style={containerStyle} className={containerClasses}>
      {label && (
        <label
          htmlFor={id}
          className={classNames('currency-input-label', labelClassName)}
          style={labelStyle}
        >
          {label}
          {required && <span className="currency-input-required"> *</span>}
        </label>
      )}
      
      <div style={inputContainerStyle} className="currency-input-field-container">
        {defaultStartAdornment && (
          <div style={adornmentStyle} className="currency-input-adornment currency-input-start-adornment">
            {defaultStartAdornment}
          </div>
        )}
        
        <input
          id={id}
          ref={ref}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          className={inputClasses}
          style={inputStyle}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={
            (error || helperText) ? `${id}-helper-text` : undefined
          }
          aria-required={required}
          {...otherProps}
        />
        
        {endAdornment && (
          <div style={adornmentStyle} className="currency-input-adornment currency-input-end-adornment">
            {endAdornment}
          </div>
        )}
      </div>
      
      {error && (
        <div
          id={`${id}-helper-text`}
          className={classNames('currency-input-error-text', errorClassName)}
          style={errorStyle}
          aria-live="polite"
        >
          {error}
        </div>
      )}
      
      {!error && helperText && (
        <div
          id={`${id}-helper-text`}
          className={classNames('currency-input-helper-text', helperTextClassName)}
          style={helperTextStyle}
        >
          {helperText}
        </div>
      )}
    </div>
  );
});

// Display name for debugging purposes
CurrencyInput.displayName = 'CurrencyInput';

export default CurrencyInput;