import React, { forwardRef, ForwardedRef, ChangeEvent } from 'react';
import { classNames } from '../../utils/formatting.utils';
import { SelectOption } from '../../types/common.types';

/**
 * Enum for different select sizing options
 */
export enum SelectSize {
  SM = 'sm',
  MD = 'md',
  LG = 'lg'
}

/**
 * Interface defining the props for the Select component
 */
export interface SelectProps {
  id?: string;
  name: string;
  options: SelectOption[];
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  size?: SelectSize;
  fullWidth?: boolean;
  className?: string;
}

/**
 * A reusable select dropdown component for form fields
 * Supports different sizes, error states, and accessibility features
 * Used across both Pike and Barracuda interfaces for consistent UI
 */
export const Select = forwardRef(
  (props: SelectProps, ref: ForwardedRef<HTMLSelectElement>) => {
    const {
      id,
      name,
      options,
      value,
      onChange,
      label,
      placeholder,
      error,
      helperText,
      required = false,
      disabled = false,
      size = SelectSize.MD,
      fullWidth = false,
      className,
      ...rest
    } = props;

    // Generate a unique ID for the select if not provided
    const selectId = id || `select-${name}-${Math.random().toString(36).substring(2, 9)}`;

    // Define size-specific classes
    const sizeClasses = {
      [SelectSize.SM]: 'py-1 text-sm',
      [SelectSize.MD]: 'py-2',
      [SelectSize.LG]: 'py-3 text-lg',
    };

    // Compose CSS classes conditionally based on component state
    const selectClasses = classNames(
      'appearance-none rounded border px-3 focus:outline-none focus:ring-2 transition-colors',
      sizeClasses[size],
      error 
        ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200',
      disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white',
      fullWidth ? 'w-full' : 'w-auto',
      className
    );

    return (
      <div className={classNames('flex flex-col', fullWidth ? 'w-full' : 'w-auto')}>
        {label && (
          <label 
            htmlFor={selectId} 
            className={classNames(
              'mb-1 text-sm font-medium',
              disabled ? 'text-gray-400' : 'text-gray-700',
              error ? 'text-red-500' : ''
            )}
          >
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        
        <div className="relative">
          <select
            id={selectId}
            name={name}
            className={selectClasses}
            value={value}
            onChange={onChange}
            disabled={disabled}
            aria-invalid={!!error}
            aria-required={required}
            aria-describedby={
              error 
                ? `${selectId}-error` 
                : helperText 
                  ? `${selectId}-helper` 
                  : undefined
            }
            ref={ref}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            
            {options.map((option) => (
              <option 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Custom dropdown arrow */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg 
              className="h-4 w-4 fill-current" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
        
        {error && (
          <p id={`${selectId}-error`} className="mt-1 text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
        
        {!error && helperText && (
          <p id={`${selectId}-helper`} className="mt-1 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

// Display name for debugging
Select.displayName = 'Select';