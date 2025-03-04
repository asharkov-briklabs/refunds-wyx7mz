import dayjs from 'dayjs'; // version: ^1.11.7
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';
import businessDays from 'dayjs/plugin/businessDays';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.extend(businessDays);

// Type definitions
type DateInput = Date | string | number;
type UnitType = 'day' | 'week' | 'month' | 'year' | 'hour' | 'minute' | 'second';

/**
 * Formats a date object or string into a specified format
 * @param date - Date to format (Date object, ISO string, or timestamp)
 * @param format - Format string (e.g., 'YYYY-MM-DD', 'MMM D, YYYY')
 * @returns Formatted date string
 */
export function formatDate(date: DateInput, format: string): string {
  try {
    // Handle invalid date inputs
    const dayjsDate = dayjs(date);
    if (!dayjsDate.isValid()) {
      throw new Error('Invalid date input');
    }
    return dayjsDate.format(format);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Parses a date string into a Date object
 * @param dateString - String representation of date
 * @param format - Format of the input string (optional)
 * @returns Parsed Date object
 */
export function parseDate(dateString: string, format?: string): Date {
  try {
    const parsed = format 
      ? dayjs(dateString, format) 
      : dayjs(dateString);
    
    if (!parsed.isValid()) {
      throw new Error('Invalid date string or format');
    }
    
    return parsed.toDate();
  } catch (error) {
    console.error('Error parsing date:', error);
    return new Date(NaN); // Invalid date
  }
}

/**
 * Calculates the difference between two dates in specified units
 * @param date1 - First date for comparison
 * @param date2 - Second date for comparison
 * @param unit - Unit for difference calculation (day, month, year, etc.)
 * @returns Difference between dates in the specified unit
 */
export function calculateDateDifference(
  date1: DateInput,
  date2: DateInput,
  unit: UnitType = 'day'
): number {
  try {
    const d1 = dayjs(date1);
    const d2 = dayjs(date2);
    
    if (!d1.isValid() || !d2.isValid()) {
      throw new Error('Invalid date input');
    }
    
    return Math.abs(d1.diff(d2, unit));
  } catch (error) {
    console.error('Error calculating date difference:', error);
    return NaN;
  }
}

/**
 * Checks if a date is in the past
 * @param date - Date to check
 * @returns True if date is in the past, false otherwise
 */
export function isDateInPast(date: DateInput): boolean {
  try {
    const dayjsDate = dayjs(date);
    
    if (!dayjsDate.isValid()) {
      throw new Error('Invalid date input');
    }
    
    return dayjsDate.isBefore(dayjs());
  } catch (error) {
    console.error('Error checking if date is in past:', error);
    return false;
  }
}

/**
 * Checks if a date is in the future
 * @param date - Date to check
 * @returns True if date is in the future, false otherwise
 */
export function isDateInFuture(date: DateInput): boolean {
  try {
    const dayjsDate = dayjs(date);
    
    if (!dayjsDate.isValid()) {
      throw new Error('Invalid date input');
    }
    
    return dayjsDate.isAfter(dayjs());
  } catch (error) {
    console.error('Error checking if date is in future:', error);
    return false;
  }
}

/**
 * Adds a specified amount of time to a date
 * @param date - Base date
 * @param amount - Amount to add
 * @param unit - Unit of time to add (day, month, year, etc.)
 * @returns New date with added time
 */
export function addToDate(
  date: DateInput,
  amount: number,
  unit: UnitType = 'day'
): Date {
  try {
    const dayjsDate = dayjs(date);
    
    if (!dayjsDate.isValid()) {
      throw new Error('Invalid date input');
    }
    
    return dayjsDate.add(amount, unit).toDate();
  } catch (error) {
    console.error('Error adding to date:', error);
    return new Date(NaN); // Invalid date
  }
}

/**
 * Subtracts a specified amount of time from a date
 * @param date - Base date
 * @param amount - Amount to subtract
 * @param unit - Unit of time to subtract (day, month, year, etc.)
 * @returns New date with subtracted time
 */
export function subtractFromDate(
  date: DateInput,
  amount: number,
  unit: UnitType = 'day'
): Date {
  try {
    const dayjsDate = dayjs(date);
    
    if (!dayjsDate.isValid()) {
      throw new Error('Invalid date input');
    }
    
    return dayjsDate.subtract(amount, unit).toDate();
  } catch (error) {
    console.error('Error subtracting from date:', error);
    return new Date(NaN); // Invalid date
  }
}

/**
 * Checks if a date is within a specified time limit from a reference date
 * @param date - Date to check
 * @param referenceDate - Reference date for comparison (defaults to now)
 * @param timeLimit - Time limit value
 * @param unit - Unit for time limit (day, month, year, etc.)
 * @returns True if within time limit, false otherwise
 */
export function isWithinTimeLimit(
  date: DateInput,
  referenceDate: DateInput = new Date(),
  timeLimit: number,
  unit: UnitType = 'day'
): boolean {
  try {
    const dateToCheck = dayjs(date);
    const reference = dayjs(referenceDate);
    
    if (!dateToCheck.isValid() || !reference.isValid()) {
      throw new Error('Invalid date input');
    }
    
    const difference = Math.abs(dateToCheck.diff(reference, unit));
    return difference <= timeLimit;
  } catch (error) {
    console.error('Error checking time limit:', error);
    return false;
  }
}

/**
 * Calculates the number of business days between two dates
 * @param startDate - Start date for calculation
 * @param endDate - End date for calculation
 * @returns Number of business days between dates
 */
export function getBusinessDays(
  startDate: DateInput,
  endDate: DateInput
): number {
  try {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    
    if (!start.isValid() || !end.isValid()) {
      throw new Error('Invalid date input');
    }
    
    // Ensure start is before end
    const [earlierDate, laterDate] = start.isBefore(end) 
      ? [start, end] 
      : [end, start];
    
    // Count business days between dates using the businessDays plugin
    let current = earlierDate.clone();
    let count = 0;
    
    while (current.isBefore(laterDate)) {
      if (current.isBusinessDay()) {
        count++;
      }
      current = current.add(1, 'day');
    }
    
    return count;
  } catch (error) {
    console.error('Error calculating business days:', error);
    return NaN;
  }
}

/**
 * Calculates a deadline date based on a start date and timeframe
 * @param startDate - Starting date for deadline calculation
 * @param timeframe - Amount of time for the deadline
 * @param unit - Unit for timeframe (day, month, year, etc.)
 * @param businessDaysOnly - Whether to count only business days
 * @returns Calculated deadline date
 */
export function calculateDeadline(
  startDate: DateInput,
  timeframe: number,
  unit: UnitType = 'day',
  businessDaysOnly: boolean = false
): Date {
  try {
    const start = dayjs(startDate);
    
    if (!start.isValid()) {
      throw new Error('Invalid date input');
    }
    
    if (businessDaysOnly) {
      // Use the businessDays plugin for business days calculation
      return start.businessDaysAdd(timeframe).toDate();
    } else {
      return start.add(timeframe, unit).toDate();
    }
  } catch (error) {
    console.error('Error calculating deadline:', error);
    return new Date(NaN); // Invalid date
  }
}

/**
 * Checks if a date is expired relative to current time
 * @param date - Date to check for expiration
 * @returns True if date is expired (in the past), false otherwise
 */
export function isDateExpired(date: DateInput): boolean {
  try {
    const dateToCheck = dayjs(date);
    
    if (!dateToCheck.isValid()) {
      throw new Error('Invalid date input');
    }
    
    return dateToCheck.isBefore(dayjs());
  } catch (error) {
    console.error('Error checking date expiration:', error);
    return false;
  }
}

/**
 * Creates a date range object with start and end dates
 * @param startDate - Starting date of the range
 * @param endDate - Ending date of the range
 * @returns Date range object with start and end properties
 */
export function createDateRange(
  startDate: DateInput,
  endDate: DateInput
): { start: Date; end: Date } {
  try {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    
    if (!start.isValid() || !end.isValid()) {
      throw new Error('Invalid date input');
    }
    
    // Ensure start is before end
    if (start.isAfter(end)) {
      throw new Error('Start date must be before end date');
    }
    
    return {
      start: start.toDate(),
      end: end.toDate()
    };
  } catch (error) {
    console.error('Error creating date range:', error);
    return {
      start: new Date(NaN),
      end: new Date(NaN)
    };
  }
}

/**
 * Checks if a date is between two other dates
 * @param date - Date to check
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @param inclusivity - Inclusivity of range boundaries ('()' exclusive, '[]' inclusive, '[)' or '(]' mixed)
 * @returns True if date is between start and end dates
 */
export function isBetweenDates(
  date: DateInput,
  startDate: DateInput,
  endDate: DateInput,
  inclusivity: '()' | '[]' | '[)' | '(]' = '[]'
): boolean {
  try {
    const dateToCheck = dayjs(date);
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    
    if (!dateToCheck.isValid() || !start.isValid() || !end.isValid()) {
      throw new Error('Invalid date input');
    }
    
    return dateToCheck.isBetween(start, end, null, inclusivity);
  } catch (error) {
    console.error('Error checking if date is between:', error);
    return false;
  }
}

/**
 * Gets the current timestamp in specified format
 * @param format - Format for timestamp (defaults to ISO format)
 * @returns Current timestamp in specified format
 */
export function getCurrentTimestamp(format: string = 'YYYY-MM-DDTHH:mm:ss.SSSZ'): string {
  try {
    return dayjs().format(format);
  } catch (error) {
    console.error('Error getting current timestamp:', error);
    return '';
  }
}

/**
 * Converts a date to ISO string format
 * @param date - Date to convert
 * @returns Date in ISO string format
 */
export function toISOString(date: DateInput): string {
  try {
    const dayjsDate = dayjs(date);
    
    if (!dayjsDate.isValid()) {
      throw new Error('Invalid date input');
    }
    
    return dayjsDate.toISOString();
  } catch (error) {
    console.error('Error converting to ISO string:', error);
    return '';
  }
}

/**
 * Gets the offset from UTC for a specific timezone
 * @param timezone - Timezone identifier (e.g., 'America/New_York')
 * @returns Offset in minutes
 */
export function getLocalTimezoneOffset(timezone: string): number {
  try {
    const now = dayjs().tz(timezone);
    
    if (!now.isValid()) {
      throw new Error('Invalid timezone');
    }
    
    // Get the UTC offset in minutes
    return now.utcOffset();
  } catch (error) {
    console.error('Error getting timezone offset:', error);
    return NaN;
  }
}