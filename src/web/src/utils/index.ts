/**
 * Centralizes and re-exports utility functions from across the Refunds Service frontend application,
 * providing a single import point for various helper functions related to error handling, date formatting,
 * currency operations, storage management, formatting, validation, responsive design, and testing.
 */

// Import error handling utilities
import * as errorUtils from './error.utils';

// Import storage management utilities
import * as storageUtils from './storage.utils';

// Import date formatting and manipulation utilities
import * as dateUtils from './date.utils';

// Import currency formatting and calculation utilities
import * as currencyUtils from './currency.utils';

// Import text and data formatting utilities
import * as formattingUtils from './formatting.utils';

// Import form and data validation utilities
import * as validationUtils from './validation.utils';

// Import responsive design utilities
import * as responsiveUtils from './responsive.utils';

// Import testing utilities
import * as testUtils from './test.utils';

/**
 * Re-export function to standardize error objects from various sources
 */
export const parseApiError = errorUtils.parseApiError;

/**
 * Re-export function to retrieve appropriate error messages by error code
 */
export const getErrorMessage = errorUtils.getErrorMessage;

/**
 * Re-export function to format error messages with parameter substitution
 */
export const formatErrorWithParams = errorUtils.formatErrorWithParams;

/**
 * Re-export function to log errors with context for debugging
 */
export const logError = errorUtils.logError;

/**
 * Re-export function to extract validation errors from API responses
 */
export const getValidationErrors = errorUtils.getValidationErrors;

/**
 * Re-export function to create structured error messages for UI display
 */
export const createErrorMessage = errorUtils.createErrorMessage;

/**
 * Re-export function to format date to short format (MM/DD/YY)
 */
export const formatDateToShort = dateUtils.formatDateToShort;

/**
 * Re-export function to format date to medium format (MMM D, YYYY)
 */
export const formatDateToMedium = dateUtils.formatDateToMedium;

/**
 * Re-export function to format date to long format (MMMM D, YYYY)
 */
export const formatDateToLong = dateUtils.formatDateToLong;

/**
 * Re-export function to format date with time
 */
export const formatDateTime = dateUtils.formatDateTime;

/**
 * Re-export function to format time only
 */
export const formatTime = dateUtils.formatTime;

/**
 * Re-export function to format date with time and timezone
 */
export const formatDateTimeWithTimezone = dateUtils.formatDateTimeWithTimezone;

/**
 * Re-export function to format date to ISO date format for API
 */
export const formatToISODate = dateUtils.formatToISODate;

/**
 * Re-export function to format date to ISO datetime format for API
 */
export const formatToISODateTime = dateUtils.formatToISODateTime;

/**
 * Re-export function to parse ISO format date string to Date object
 */
export const parseISODate = dateUtils.parseISODate;

/**
 * Re-export function to format date as relative time
 */
export const formatRelativeTime = dateUtils.formatRelativeTime;

/**
 * Re-export function to check if value is a valid date
 */
export const isValidDate = dateUtils.isValidDate;

/**
 * Re-export function to get DateRange object from TimeFrame enum value
 */
export const getDateRangeFromTimeFrame = dateUtils.getDateRangeFromTimeFrame;

/**
 * Re-export function to format currency values for display
 */
export const formatCurrency = currencyUtils.formatCurrency;

/**
 * Re-export function to format values as percentages for display
 */
export const formatPercentage = currencyUtils.formatPercentage;

/**
 * Re-export function to parse currency string input to numeric value
 */
export const parseCurrencyInput = currencyUtils.parseCurrencyInput;

/**
 * Re-export function to round currency values to specific precision
 */
export const roundCurrency = currencyUtils.roundCurrency;

/**
 * Re-export function to validate currency amount values
 */
export const isValidCurrencyAmount = currencyUtils.isValidCurrencyAmount;