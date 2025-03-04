import React from 'react';
import classnames from 'classnames';
import { SelectOption } from '../../types/common.types';
import colors from '../../themes/colors';

/**
 * Enum for radio group size variants
 */
export enum RadioGroupSize {
  SM = 'sm',
  MD = 'md',
  LG = 'lg'
}

/**
 * Props interface for the RadioGroup component
 */
export interface RadioGroupProps {
  /** Unique identifier for the radio group */
  id: string;
  /** Name attribute for the radio inputs */
  name: string;
  /** Array of options to display in the radio group */
  options: SelectOption[];
  /** Currently selected value */
  value: string | number | undefined;
  /** Handler for when selection changes */
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Handler for when the radio group loses focus */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Label text for the radio group */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Helper text to display below the radio group */
  helperText?: string;
  /** Additional CSS class name */
  className?: string;
  /** Whether the radio group is disabled */
  disabled?: boolean;
  /** Whether the radio group is required */
  required?: boolean;
  /** Size variant for the radio group */
  size?: RadioGroupSize;
  /** Orientation of the radio buttons */
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Generates a unique ID for radio elements
 * @param baseName - Base string for the ID
 * @returns A unique ID string
 */
const generateUniqueId = (baseName: string): string => {
  return `${baseName}-${Math.random().toString(36).substring(2, 10)}`;
};

/**
 * RadioGroup component for selecting a single option from multiple choices
 */
const RadioGroup: React.FC<RadioGroupProps> = ({
  id,
  name,
  options,
  value,
  onChange,
  onBlur,
  label,
  error,
  helperText,
  className,
  disabled = false,
  required = false,
  size = RadioGroupSize.MD,
  orientation = 'vertical'
}) => {
  const groupId = id || `radio-group-${name}`;
  const labelId = `${groupId}-label`;
  const isHorizontal = orientation === 'horizontal';

  // Apply size-specific styles
  const sizeClasses = {
    'text-sm': size === RadioGroupSize.SM,
    'text-base': size === RadioGroupSize.MD,
    'text-lg': size === RadioGroupSize.LG,
  };

  // Get spacing based on size
  const getSpacing = () => {
    switch (size) {
      case RadioGroupSize.SM:
        return 'gap-2';
      case RadioGroupSize.LG:
        return 'gap-4';
      case RadioGroupSize.MD:
      default:
        return 'gap-3';
    }
  };

  // Calculate radio size based on component size
  const getRadioSize = () => {
    switch (size) {
      case RadioGroupSize.SM:
        return 'w-4 h-4';
      case RadioGroupSize.LG:
        return 'w-6 h-6';
      case RadioGroupSize.MD:
      default:
        return 'w-5 h-5';
    }
  };

  return (
    <div 
      className={classnames(
        'radio-group',
        { 'opacity-60': disabled },
        sizeClasses,
        className
      )}
    >
      {label && (
        <div 
          id={labelId} 
          className={classnames(
            'mb-2 font-medium',
            { 'text-red-600': error },
            sizeClasses
          )}
        >
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </div>
      )}

      <div 
        className={classnames(
          'flex',
          { 
            'flex-col': !isHorizontal,
            'flex-row flex-wrap': isHorizontal 
          },
          getSpacing()
        )}
        role="radiogroup"
        aria-labelledby={label ? labelId : undefined}
        aria-required={required}
        aria-invalid={!!error}
      >
        {options.map((option) => {
          const optionId = generateUniqueId(`${groupId}-option-${option.value}`);
          const isChecked = value !== undefined && String(value) === String(option.value);
          const isOptionDisabled = disabled || option.disabled;

          return (
            <label
              key={optionId}
              htmlFor={optionId}
              className={classnames(
                'flex items-center cursor-pointer',
                isHorizontal ? 'mr-4' : '',
                { 
                  'cursor-not-allowed': isOptionDisabled,
                  'text-gray-400': isOptionDisabled,
                  'hover:text-primary-600': !isOptionDisabled && !isChecked,
                }
              )}
            >
              <div className="relative flex items-center">
                <input
                  type="radio"
                  id={optionId}
                  name={name}
                  value={option.value}
                  checked={isChecked}
                  onChange={onChange}
                  onBlur={onBlur}
                  disabled={isOptionDisabled}
                  className={classnames(
                    'appearance-none border rounded-full',
                    getRadioSize(),
                    {
                      'border-gray-300': !isChecked && !error,
                      'border-primary-500 bg-primary-500': isChecked && !error,
                      'border-red-500': error,
                      'border-gray-200': isOptionDisabled
                    }
                  )}
                  aria-checked={isChecked}
                  required={required}
                />
                {isChecked && (
                  <div 
                    className={classnames(
                      'absolute inset-0 flex items-center justify-center pointer-events-none',
                      { 'text-white': !error }
                    )}
                  >
                    <div 
                      className={classnames(
                        'rounded-full bg-white',
                        size === RadioGroupSize.SM ? 'w-1.5 h-1.5' : 
                        size === RadioGroupSize.LG ? 'w-2.5 h-2.5' : 'w-2 h-2'
                      )}
                    />
                  </div>
                )}
              </div>
              <span className={classnames('ml-2', { 'text-gray-500': isOptionDisabled })}>
                {option.label}
              </span>
            </label>
          );
        })}
      </div>

      {(error || helperText) && (
        <div 
          className={classnames(
            'mt-1 text-sm',
            { 
              'text-red-600': error,
              'text-gray-500': !error && helperText
            }
          )}
        >
          {error || helperText}
        </div>
      )}
    </div>
  );
};

export default RadioGroup;