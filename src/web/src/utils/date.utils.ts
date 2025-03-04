import dayjs from 'dayjs'; // version: ^1.11.7
import timezone from 'dayjs/plugin/timezone'; // version: ^1.11.7
import utc from 'dayjs/plugin/utc'; // version: ^1.11.7 
import relativeTime from 'dayjs/plugin/relativeTime'; // version: ^1.11.7
import advancedFormat from 'dayjs/plugin/advancedFormat'; // version: ^1.11.7

import { 
  DATE_FORMATS, 
  API_DATE_FORMATS,
  TIMEZONE_FORMATS
} from '../constants/date-formats.constants';

import { DateRange, TimeFrame } from '../types/common.types';

// Initialize plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(advancedFormat);

// Default constants
const DEFAULT_TIMEZONE = 'America/New_York';
const DEFAULT_LOCALE = 'en-US';

/**
 * Formats a date to short date format (MM/DD/YY)
 * @param dateInput - The date to format
 * @returns Formatted date string in short format or empty string if invalid
 */
export const formatDateToShort = (dateInput: any): string => {
  if (!dateInput) return '';
  const date = dayjs(dateInput);
  if (!date.isValid()) return '';
  return date.format(DATE_FORMATS.SHORT_DATE);
};

/**
 * Formats a date to medium date format (MMM D, YYYY)
 * @param dateInput - The date to format
 * @returns Formatted date string in medium format or empty string if invalid
 */
export const formatDateToMedium = (dateInput: any): string => {
  if (!dateInput) return '';
  const date = dayjs(dateInput);
  if (!date.isValid()) return '';
  return date.format(DATE_FORMATS.MEDIUM_DATE);
};

/**
 * Formats a date to long date format (MMMM D, YYYY)
 * @param dateInput - The date to format
 * @returns Formatted date string in long format or empty string if invalid
 */
export const formatDateToLong = (dateInput: any): string => {
  if (!dateInput) return '';
  const date = dayjs(dateInput);
  if (!date.isValid()) return '';
  return date.format(DATE_FORMATS.LONG_DATE);
};

/**
 * Formats a date with time (MMM D, YYYY h:mm A)
 * @param dateInput - The date to format
 * @param includeSeconds - Whether to include seconds in the formatted time
 * @returns Formatted date and time string or empty string if invalid
 */
export const formatDateTime = (dateInput: any, includeSeconds = false): string => {
  if (!dateInput) return '';
  const date = dayjs(dateInput);
  if (!date.isValid()) return '';
  const format = includeSeconds ? DATE_FORMATS.LONG_DATETIME : DATE_FORMATS.MEDIUM_DATETIME;
  return date.format(format);
};

/**
 * Formats a time only (h:mm A)
 * @param dateInput - The date to format
 * @returns Formatted time string or empty string if invalid
 */
export const formatTime = (dateInput: any): string => {
  if (!dateInput) return '';
  const date = dayjs(dateInput);
  if (!date.isValid()) return '';
  return date.format(DATE_FORMATS.TIME_ONLY);
};

/**
 * Formats a date with time and timezone information
 * @param dateInput - The date to format
 * @param timezone - Optional timezone (defaults to DEFAULT_TIMEZONE)
 * @returns Formatted date, time, and timezone string or empty string if invalid
 */
export const formatDateTimeWithTimezone = (dateInput: any, timezone?: string): string => {
  if (!dateInput) return '';
  const date = dayjs(dateInput);
  if (!date.isValid()) return '';
  const tz = timezone || DEFAULT_TIMEZONE;
  return date.tz(tz).format(TIMEZONE_FORMATS.WITH_TIMEZONE);
};

/**
 * Formats a date to ISO format YYYY-MM-DD
 * @param dateInput - The date to format
 * @returns ISO formatted date string or empty string if invalid
 */
export const formatToISODate = (dateInput: any): string => {
  if (!dateInput) return '';
  const date = dayjs(dateInput);
  if (!date.isValid()) return '';
  return date.format(API_DATE_FORMATS.ISO_DATE);
};

/**
 * Formats a date to ISO format YYYY-MM-DDTHH:mm:ssZ
 * @param dateInput - The date to format
 * @returns ISO formatted date-time string or empty string if invalid
 */
export const formatToISODateTime = (dateInput: any): string => {
  if (!dateInput) return '';
  const date = dayjs(dateInput);
  if (!date.isValid()) return '';
  return date.utc().format(API_DATE_FORMATS.ISO_DATETIME);
};

/**
 * Parses an ISO format date string to a Date object
 * @param isoString - ISO format date string
 * @returns JavaScript Date object or null if invalid
 */
export const parseISODate = (isoString: string): Date | null => {
  if (!isoString) return null;
  const date = dayjs(isoString);
  return date.isValid() ? date.toDate() : null;
};

/**
 * Formats a date as a relative time string (e.g., '2 hours ago')
 * @param dateInput - The date to format
 * @returns Relative time string or empty string if invalid
 */
export const formatRelativeTime = (dateInput: any): string => {
  if (!dateInput) return '';
  const date = dayjs(dateInput);
  if (!date.isValid()) return '';
  return date.fromNow();
};

/**
 * Checks if a value is a valid date
 * @param dateInput - The value to check
 * @returns True if date is valid, false otherwise
 */
export const isValidDate = (dateInput: any): boolean => {
  if (dateInput === null || dateInput === undefined) return false;
  return dayjs(dateInput).isValid();
};

/**
 * Checks if two dates represent the same day
 * @param dateA - First date
 * @param dateB - Second date
 * @returns True if dates are on the same day, false otherwise
 */
export const isSameDay = (dateA: any, dateB: any): boolean => {
  if (!dateA || !dateB) return false;
  const a = dayjs(dateA);
  const b = dayjs(dateB);
  if (!a.isValid() || !b.isValid()) return false;
  return a.isSame(b, 'day');
};

/**
 * Checks if a date is before another date
 * @param dateA - First date
 * @param dateB - Second date
 * @param granularity - Optional granularity for comparison ('day', 'month', etc.)
 * @returns True if dateA is before dateB, false otherwise
 */
export const isBefore = (dateA: any, dateB: any, granularity?: string): boolean => {
  if (!dateA || !dateB) return false;
  const a = dayjs(dateA);
  const b = dayjs(dateB);
  if (!a.isValid() || !b.isValid()) return false;
  return granularity ? a.isBefore(b, granularity as any) : a.isBefore(b);
};

/**
 * Checks if a date is after another date
 * @param dateA - First date
 * @param dateB - Second date
 * @param granularity - Optional granularity for comparison ('day', 'month', etc.)
 * @returns True if dateA is after dateB, false otherwise
 */
export const isAfter = (dateA: any, dateB: any, granularity?: string): boolean => {
  if (!dateA || !dateB) return false;
  const a = dayjs(dateA);
  const b = dayjs(dateB);
  if (!a.isValid() || !b.isValid()) return false;
  return granularity ? a.isAfter(b, granularity as any) : a.isAfter(b);
};

/**
 * Checks if a date is within a date range
 * @param dateToCheck - Date to check
 * @param startDate - Start of range
 * @param endDate - End of range
 * @param granularity - Optional granularity for comparison ('day', 'month', etc.)
 * @returns True if date is within range, false otherwise
 */
export const isWithinRange = (
  dateToCheck: any, 
  startDate: any, 
  endDate: any, 
  granularity?: string
): boolean => {
  if (!dateToCheck || !startDate || !endDate) return false;
  const check = dayjs(dateToCheck);
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  
  if (!check.isValid() || !start.isValid() || !end.isValid()) return false;
  
  if (granularity) {
    return (
      (check.isAfter(start, granularity as any) || check.isSame(start, granularity as any)) &&
      (check.isBefore(end, granularity as any) || check.isSame(end, granularity as any))
    );
  } else {
    return (check.isAfter(start) || check.isSame(start)) && 
           (check.isBefore(end) || check.isSame(end));
  }
};

/**
 * Adds a specified number of days to a date
 * @param dateInput - The date to modify
 * @param days - Number of days to add
 * @returns New Date with days added or null if input invalid
 */
export const addDays = (dateInput: any, days: number): Date | null => {
  if (!isValidDate(dateInput)) return null;
  return dayjs(dateInput).add(days, 'day').toDate();
};

/**
 * Adds a specified number of months to a date
 * @param dateInput - The date to modify
 * @param months - Number of months to add
 * @returns New Date with months added or null if input invalid
 */
export const addMonths = (dateInput: any, months: number): Date | null => {
  if (!isValidDate(dateInput)) return null;
  return dayjs(dateInput).add(months, 'month').toDate();
};

/**
 * Returns a date set to the start of the day (00:00:00)
 * @param dateInput - The date to modify
 * @returns Date set to start of day or null if input invalid
 */
export const startOfDay = (dateInput: any): Date | null => {
  if (!isValidDate(dateInput)) return null;
  return dayjs(dateInput).startOf('day').toDate();
};

/**
 * Returns a date set to the end of the day (23:59:59.999)
 * @param dateInput - The date to modify
 * @returns Date set to end of day or null if input invalid
 */
export const endOfDay = (dateInput: any): Date | null => {
  if (!isValidDate(dateInput)) return null;
  return dayjs(dateInput).endOf('day').toDate();
};

/**
 * Returns a date set to the start of the month
 * @param dateInput - The date to modify
 * @returns Date set to start of month or null if input invalid
 */
export const startOfMonth = (dateInput: any): Date | null => {
  if (!isValidDate(dateInput)) return null;
  return dayjs(dateInput).startOf('month').toDate();
};

/**
 * Returns a date set to the end of the month
 * @param dateInput - The date to modify
 * @returns Date set to end of month or null if input invalid
 */
export const endOfMonth = (dateInput: any): Date | null => {
  if (!isValidDate(dateInput)) return null;
  return dayjs(dateInput).endOf('month').toDate();
};

/**
 * Returns a DateRange based on a specified TimeFrame
 * @param timeFrame - The time frame to convert to a date range
 * @param customRange - Optional custom range for CUSTOM time frame
 * @returns Date range with start and end dates
 */
export const getDateRangeFromTimeFrame = (
  timeFrame: TimeFrame, 
  customRange?: DateRange
): DateRange => {
  const now = dayjs();
  let startDate: dayjs.Dayjs;
  let endDate: dayjs.Dayjs = now;
  
  switch (timeFrame) {
    case TimeFrame.TODAY:
      startDate = now.startOf('day');
      endDate = now.endOf('day');
      break;
      
    case TimeFrame.YESTERDAY:
      startDate = now.subtract(1, 'day').startOf('day');
      endDate = now.subtract(1, 'day').endOf('day');
      break;
      
    case TimeFrame.THIS_WEEK:
      startDate = now.startOf('week');
      break;
      
    case TimeFrame.LAST_WEEK:
      startDate = now.subtract(1, 'week').startOf('week');
      endDate = now.subtract(1, 'week').endOf('week');
      break;
      
    case TimeFrame.THIS_MONTH:
      startDate = now.startOf('month');
      break;
      
    case TimeFrame.LAST_MONTH:
      startDate = now.subtract(1, 'month').startOf('month');
      endDate = now.subtract(1, 'month').endOf('month');
      break;
      
    case TimeFrame.LAST_30_DAYS:
      startDate = now.subtract(30, 'days');
      break;
      
    case TimeFrame.LAST_90_DAYS:
      startDate = now.subtract(90, 'days');
      break;
      
    case TimeFrame.CUSTOM:
      if (customRange) {
        return customRange;
      }
      // Default to last 7 days if no custom range provided
      startDate = now.subtract(7, 'days');
      break;
      
    default:
      // Default to last 30 days
      startDate = now.subtract(30, 'days');
  }
  
  return {
    startDate: formatToISODate(startDate.toDate()),
    endDate: formatToISODate(endDate.toDate())
  };
};

/**
 * Calculates the number of days between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of days between dates or 0 if input invalid
 */
export const getDaysBetweenDates = (startDate: any, endDate: any): number => {
  if (!startDate || !endDate) return 0;
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  
  if (!start.isValid() || !end.isValid()) return 0;
  
  // Get absolute difference in days
  return Math.abs(end.diff(start, 'day'));
};

/**
 * Gets the local timezone identifier
 * @returns Local timezone identifier string
 */
export const getLocalTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch (error) {
    return DEFAULT_TIMEZONE;
  }
};