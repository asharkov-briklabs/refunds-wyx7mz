/**
 * Date and time format constants used throughout the Refunds Service.
 * These standardized formats ensure consistent date presentation across
 * Pike and Barracuda interfaces.
 */

/**
 * Standard date formats for display in the UI
 */
export const DATE_FORMATS = {
  /**
   * Short date format (e.g., 05/17/23) for compact displays
   */
  SHORT_DATE: 'MM/DD/YY',
  
  /**
   * Medium date format (e.g., May 17, 2023) for standard displays
   */
  MEDIUM_DATE: 'MMM D, YYYY',
  
  /**
   * Long date format (e.g., May 17, 2023) for detailed displays
   */
  LONG_DATE: 'MMMM D, YYYY',
  
  /**
   * Short date with time (e.g., 05/17/23 3:30 PM) for timelines
   */
  SHORT_DATETIME: 'MM/DD/YY h:mm A',
  
  /**
   * Medium date with time (e.g., May 17, 2023 3:30 PM) for detailed views
   */
  MEDIUM_DATETIME: 'MMM D, YYYY h:mm A',
  
  /**
   * Long date with seconds (e.g., May 17, 2023 3:30:45 PM) for audit logs
   */
  LONG_DATETIME: 'MMMM D, YYYY h:mm:ss A',
  
  /**
   * Time only format (e.g., 3:30 PM) when date context is already provided
   */
  TIME_ONLY: 'h:mm A'
};

/**
 * ISO 8601 date formats for API communication
 */
export const API_DATE_FORMATS = {
  /**
   * ISO 8601 date format (e.g., 2023-05-17) for date-only API fields
   */
  ISO_DATE: 'YYYY-MM-DD',
  
  /**
   * ISO 8601 datetime with timezone (e.g., 2023-05-17T15:30:45Z) for API timestamps
   */
  ISO_DATETIME: 'YYYY-MM-DDTHH:mm:ssZ',
  
  /**
   * ISO 8601 time format (e.g., 15:30:45) for time-only API fields
   */
  ISO_TIME: 'HH:mm:ss'
};

/**
 * Format strings for date picker components
 */
export const DATE_PICKER_FORMATS = {
  /**
   * Format for date input fields (e.g., 05/17/2023)
   */
  INPUT_FORMAT: 'MM/DD/YYYY',
  
  /**
   * Format for displaying selected dates in pickers (e.g., May 17, 2023)
   */
  DISPLAY_FORMAT: 'MMM D, YYYY',
  
  /**
   * Separator used between dates in a date range display
   */
  RANGE_SEPARATOR: ' - '
};

/**
 * Formats for displaying dates with timezone information
 */
export const TIMEZONE_FORMATS = {
  /**
   * Date with time and timezone abbreviation (e.g., May 17, 2023 3:30 PM EDT)
   */
  WITH_TIMEZONE: 'MMM D, YYYY h:mm A z',
  
  /**
   * Date with time and timezone in parentheses (e.g., May 17, 2023 3:30 PM (EDT))
   */
  WITH_TIMEZONE_NAME: 'MMM D, YYYY h:mm A (z)'
};