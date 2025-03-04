import React, { useState, useEffect, useRef, forwardRef } from 'react'; // react ^18.2.0
import ReactDatePicker from 'react-datepicker'; // react-datepicker ^4.11.0
import classNames from 'classnames'; // classnames ^2.3.2
import dayjs from 'dayjs'; // dayjs ^1.11.7

import TextField from '../TextField';
import { DATE_PICKER_FORMATS } from '../../../constants/date-formats.constants';
import { formatDateToMedium, isValidDate } from '../../../utils/date.utils';

import 'react-datepicker/dist/react-datepicker.css';

/**
 * Formats a Date object to string according to the specified format
 * @param date - Date to format
 * @param format - Format string
 * @returns Formatted date string or empty string if date is invalid
 */
const formatDate = (date: Date, format: string): string => {
  if (!isValidDate(date)) return '';
  return dayjs(date).format(format);
};

/**
 * Parses a date string into a Date object according to the specified format
 * @param dateString - Date string to parse
 * @param format - Format string
 * @returns Date object if successful, null if parsing fails
 */
const parseDate = (dateString: string, format: string): Date | null => {
  if (!dateString) return null;
  const parsed = dayjs(dateString, format);
  return parsed.isValid() ? parsed.toDate() : null;
};

/**
 * Props interface for the DatePicker component
 */
export interface DatePickerProps {
  /** Current selected date value */
  value: Date | null;
  /** Callback fired when date changes */
  onChange: (date: Date | null) => void;
  /** Unique ID for the input field */
  id?: string;
  /** Name attribute for the input field */
  name?: string;
  /** Label text displayed above the input */
  label?: string;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Error message to display */
  error?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether the input is required */
  required?: boolean;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Locale for internationalization */
  locale?: string;
  /** Format string for the date display */
  dateFormat?: string;
  /** Whether to show year dropdown */
  showYearDropdown?: boolean;
  /** Whether to show month dropdown */
  showMonthDropdown?: boolean;
  /** Number of years to show in dropdown */
  yearDropdownItemNumber?: number;
  /** Whether to enable time selection */
  showTimeSelect?: boolean;
  /** Format string for time display */
  timeFormat?: string;
  /** Time interval in minutes for time selection */
  timeIntervals?: number;
  /** Additional class for container */
  className?: string;
  /** Additional class for input */
  inputClassName?: string;
  /** Callback fired when input is blurred */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Callback fired when input is focused */
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
}

/**
 * A reusable date picker component that provides a standardized way to select dates
 * across the Refunds Service application. It supports various formatting options,
 * validation, min/max date restrictions, and internationalization.
 */
const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>((props, ref) => {
  const {
    value,
    onChange,
    id,
    name,
    label,
    placeholder,
    error,
    disabled = false,
    required = false,
    minDate,
    maxDate,
    locale,
    dateFormat = DATE_PICKER_FORMATS.INPUT_FORMAT,
    showYearDropdown = false,
    showMonthDropdown = false,
    yearDropdownItemNumber,
    showTimeSelect = false,
    timeFormat = 'hh:mm aa',
    timeIntervals = 30,
    className,
    inputClassName,
    onBlur,
    onFocus,
  } = props;

  // Track if the input is currently focused
  const [isFocused, setIsFocused] = useState(false);
  
  // Create a ref for the ReactDatePicker component
  const datePickerRef = useRef<any>(null);
  
  // Generate a unique ID if none provided
  const uniqueId = id || `date-picker-${Math.random().toString(36).substring(2, 9)}`;

  /**
   * Handle date selection change from the calendar
   */
  const handleChange = (date: Date | null): void => {
    onChange(date);
  };

  /**
   * Handle manual input changes and attempt to parse the date
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const inputValue = e.target.value;
    if (!inputValue) {
      onChange(null);
      return;
    }

    const parsedDate = parseDate(inputValue, dateFormat);
    if (parsedDate) {
      onChange(parsedDate);
    }
  };

  /**
   * Handle input focus event
   */
  const handleFocus = (event: React.FocusEvent<HTMLInputElement>): void => {
    setIsFocused(true);
    if (onFocus) {
      onFocus(event);
    }
  };

  /**
   * Handle input blur event
   */
  const handleBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
    setIsFocused(false);
    if (onBlur) {
      onBlur(event);
    }
  };

  // Generate container classes
  const containerClasses = classNames('date-picker-container', className);

  // Custom input component that uses TextField
  const CustomInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ value: inputValue, onClick, onChange: onInputChange, ...rest }, inputRef) => (
      <TextField
        {...rest}
        ref={inputRef}
        value={inputValue as string}
        onClick={onClick}
        onChange={onInputChange as any}
        onFocus={handleFocus}
        onBlur={handleBlur}
        label={label}
        placeholder={placeholder || `Select date (${dateFormat})`}
        error={error}
        disabled={disabled}
        required={required}
        className={inputClassName}
        endAdornment={
          <button
            type="button"
            className="date-picker-calendar-icon"
            onClick={onClick}
            disabled={disabled}
            aria-label="Open calendar"
            tabIndex={-1} // Skip in tab order since the input already provides focus
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              width="18"
              height="18"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </button>
        }
      />
    )
  );

  CustomInput.displayName = 'DatePickerCustomInput';

  return (
    <div className={containerClasses}>
      <ReactDatePicker
        ref={datePickerRef}
        selected={value}
        onChange={handleChange}
        onChangeRaw={(e) => handleInputChange(e as React.ChangeEvent<HTMLInputElement>)}
        dateFormat={dateFormat}
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        locale={locale}
        showYearDropdown={showYearDropdown}
        showMonthDropdown={showMonthDropdown}
        yearDropdownItemNumber={yearDropdownItemNumber}
        showTimeSelect={showTimeSelect}
        timeFormat={timeFormat}
        timeIntervals={timeIntervals}
        customInput={<CustomInput id={uniqueId} name={name} />}
        popperClassName="date-picker-popper"
        calendarClassName="date-picker-calendar"
        aria-labelledby={label ? uniqueId + '-label' : undefined}
        aria-required={required}
        fixedHeight
        isClearable={false}
        shouldCloseOnSelect
        disabledKeyboardNavigation={false}
        calendarStartDay={1} // Week starts on Monday
      />
    </div>
  );
});

// Set displayName for debugging purposes
DatePicker.displayName = 'DatePicker';

export default DatePicker;