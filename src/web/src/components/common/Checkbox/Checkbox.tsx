import React, { useEffect, useRef } from 'react';
import classNames from 'classnames';
import { semantic, common } from '../../themes/colors';

/**
 * Props interface for the Checkbox component
 */
export interface CheckboxProps {
  /** Unique identifier for the checkbox */
  id: string;
  /** Name attribute for the checkbox input */
  name: string;
  /** Whether the checkbox is checked */
  checked: boolean;
  /** Handler for when the checkbox state changes */
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Text label to display next to the checkbox */
  label?: string;
  /** Whether the checkbox is disabled */
  disabled?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Error message to display */
  error?: string;
  /** Helper text to display below the checkbox */
  helperText?: string;
  /** Whether the checkbox is required */
  required?: boolean;
  /** Whether the checkbox is in an indeterminate state */
  indeterminate?: boolean;
}

/**
 * A reusable checkbox component that provides a customizable input element
 * with support for labels, error states, helper text, and accessibility features.
 * Used across both Pike (merchant) and Barracuda (admin) interfaces for boolean selection inputs.
 */
const Checkbox: React.FC<CheckboxProps> = ({
  id,
  name,
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  error,
  helperText,
  required = false,
  indeterminate = false,
}) => {
  // Create a ref for the input element to handle indeterminate state
  const inputRef = useRef<HTMLInputElement>(null);

  // Set indeterminate property which can't be set via HTML attributes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  // Set up CSS class names
  const containerClasses = classNames(
    'checkbox-container',
    {
      'checkbox-container--disabled': disabled,
      'checkbox-container--error': !!error,
    },
    className
  );

  return (
    <div className={containerClasses}>
      <div className="checkbox-wrapper">
        <input
          ref={inputRef}
          type="checkbox"
          id={id}
          name={name}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className="checkbox-input"
          aria-invalid={!!error}
          aria-describedby={
            (helperText || error) ? `${id}-description` : undefined
          }
        />
        <div 
          className={classNames('checkbox', {
            'checkbox--checked': checked,
            'checkbox--disabled': disabled,
            'checkbox--error': !!error,
            'checkbox--indeterminate': indeterminate,
          })}
        >
          {checked && !indeterminate && (
            <svg className="checkbox-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          )}
          {indeterminate && (
            <svg className="checkbox-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 13H5v-2h14v2z" />
            </svg>
          )}
        </div>
        {label && (
          <label 
            htmlFor={id} 
            className={classNames('checkbox-label', {
              'checkbox-label--disabled': disabled,
            })}
          >
            {label}
            {required && <span className="checkbox-required">*</span>}
          </label>
        )}
      </div>
      
      {(helperText || error) && (
        <div 
          id={`${id}-description`}
          className={classNames('checkbox-helper-text', {
            'checkbox-error-text': !!error,
          })}
        >
          {error || helperText}
        </div>
      )}
    </div>
  );
};

export default Checkbox;