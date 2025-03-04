import React, { useState, useEffect, useCallback } from 'react';
import classNames from 'classnames'; // classnames ^2.3.2
import { DateRange, TimeFrame } from '../../../types/common.types';
import { DATE_PICKER_FORMATS } from '../../../constants/date-formats.constants';
import Select from '../../common/Select';
import DatePicker from '../../common/DatePicker';
import { getDateRangeFromTimeFrame, formatDateToMedium } from '../../../utils/date.utils';

/**
 * Props interface for the DateRangeSelector component
 */
export interface DateRangeSelectorProps {
  /** Initial timeframe selection (default: LAST_30_DAYS) */
  defaultTimeFrame?: TimeFrame;
  /** Initial custom date range (used when defaultTimeFrame is CUSTOM) */
  defaultDateRange?: DateRange;
  /** Callback fired when date range changes */
  onChange: (dateRange: DateRange, timeFrame: TimeFrame) => void;
  /** Additional CSS class name for styling */
  className?: string;
  /** Disables the component when true */
  disabled?: boolean;
  /** Whether to show the timeframe dropdown (default: true) */
  showTimeFrameSelector?: boolean;
  /** Subset of TimeFrame values to show in dropdown */
  allowedTimeFrames?: TimeFrame[];
  /** Maximum days allowed for custom date range */
  maxDateRange?: number;
}

/**
 * A component that allows users to select a date range using predefined timeframes or custom date selection
 */
const DateRangeSelector: React.FC<DateRangeSelectorProps> = (props) => {
  const {
    defaultTimeFrame = TimeFrame.LAST_30_DAYS,
    defaultDateRange,
    onChange,
    className,
    disabled = false,
    showTimeFrameSelector = true,
    allowedTimeFrames,
    maxDateRange,
  } = props;

  // State for selected timeframe and custom date range
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>(defaultTimeFrame);
  const [customDateRange, setCustomDateRange] = useState<DateRange>(
    defaultDateRange || getDateRangeFromTimeFrame(TimeFrame.CUSTOM)
  );

  // Handle initial values and defaults
  useEffect(() => {
    if (defaultTimeFrame) {
      setSelectedTimeFrame(defaultTimeFrame);
      
      if (defaultTimeFrame === TimeFrame.CUSTOM && defaultDateRange) {
        setCustomDateRange(defaultDateRange);
        onChange(defaultDateRange, TimeFrame.CUSTOM);
      } else {
        const dateRange = getDateRangeFromTimeFrame(defaultTimeFrame);
        onChange(dateRange, defaultTimeFrame);
      }
    }
  }, [defaultTimeFrame, defaultDateRange, onChange]);

  // Handle timeframe selection change
  const handleTimeFrameChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTimeFrame = e.target.value as TimeFrame;
    setSelectedTimeFrame(newTimeFrame);
    
    if (newTimeFrame === TimeFrame.CUSTOM) {
      onChange(customDateRange, newTimeFrame);
    } else {
      const dateRange = getDateRangeFromTimeFrame(newTimeFrame);
      onChange(dateRange, newTimeFrame);
    }
  }, [customDateRange, onChange]);

  // Handle custom date range changes
  const handleCustomDateChange = useCallback((field: 'startDate' | 'endDate', date: Date | null) => {
    if (!date) return;
    
    // Format date to YYYY-MM-DD (ISO date string without time)
    const formattedDate = date.toISOString().split('T')[0];
    
    const newDateRange = {
      ...customDateRange,
      [field]: formattedDate,
    };
    
    setCustomDateRange(newDateRange);
    
    if (selectedTimeFrame === TimeFrame.CUSTOM) {
      onChange(newDateRange, TimeFrame.CUSTOM);
    }
  }, [customDateRange, selectedTimeFrame, onChange]);

  // Get timeframe options for the dropdown
  const timeFrameOptions = getTimeFrameOptions()
    .filter(option => 
      !allowedTimeFrames || allowedTimeFrames.includes(option.value as TimeFrame)
    );

  return (
    <div className={classNames('date-range-selector', className)}>
      {/* Timeframe selector dropdown */}
      {showTimeFrameSelector && (
        <Select
          name="timeframe"
          value={selectedTimeFrame}
          onChange={handleTimeFrameChange}
          options={timeFrameOptions}
          disabled={disabled}
          label="Time Period"
          className="mb-4"
        />
      )}
      
      {/* Custom date range pickers */}
      {selectedTimeFrame === TimeFrame.CUSTOM && (
        <div className="flex flex-col sm:flex-row sm:space-x-4">
          <div className="w-full sm:w-1/2 mb-4 sm:mb-0">
            <DatePicker
              label="Start Date"
              value={customDateRange.startDate ? new Date(customDateRange.startDate) : null}
              onChange={(date) => handleCustomDateChange('startDate', date)}
              disabled={disabled}
              maxDate={customDateRange.endDate ? new Date(customDateRange.endDate) : undefined}
              dateFormat={DATE_PICKER_FORMATS.INPUT_FORMAT}
            />
          </div>
          <div className="w-full sm:w-1/2">
            <DatePicker
              label="End Date"
              value={customDateRange.endDate ? new Date(customDateRange.endDate) : null}
              onChange={(date) => handleCustomDateChange('endDate', date)}
              disabled={disabled}
              minDate={customDateRange.startDate ? new Date(customDateRange.startDate) : undefined}
              dateFormat={DATE_PICKER_FORMATS.INPUT_FORMAT}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Generates an array of options for the timeframe dropdown
 */
function getTimeFrameOptions() {
  return Object.values(TimeFrame).map(value => ({
    value,
    label: formatTimeFrameLabel(value),
  }));
}

/**
 * Formats a TimeFrame enum value into a readable label
 */
function formatTimeFrameLabel(timeFrame: string): string {
  return timeFrame
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
    .replace(/This/g, 'Current');
}

export default DateRangeSelector;