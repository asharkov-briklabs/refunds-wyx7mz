import Decimal from 'decimal.js-light'; // version ^2.5.1

/**
 * Default locale for currency formatting
 */
export const DEFAULT_LOCALE = 'en-US';

/**
 * Default currency code for formatting
 */
export const DEFAULT_CURRENCY = 'USD';

/**
 * Formats a number as a currency string with proper symbol and decimal places
 * 
 * @param amount - The amount to format
 * @param currencyCode - The ISO 4217 currency code (defaults to USD)
 * @param locale - The locale to use for formatting (defaults to en-US)
 * @returns The formatted currency string
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE
): string {
  // Return empty string for invalid values
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '';
  }

  try {
    // Format using Intl.NumberFormat
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback in case of errors (invalid currency code or locale)
    console.error('Currency formatting error:', error);
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

/**
 * Formats a number as a percentage with proper symbol and decimal places
 * 
 * @param value - The value to format (0.1 = 10%)
 * @param decimalPlaces - Number of decimal places to show (defaults to 2)
 * @param locale - The locale to use for formatting (defaults to en-US)
 * @returns The formatted percentage string
 */
export function formatPercentage(
  value: number,
  decimalPlaces: number = 2,
  locale: string = DEFAULT_LOCALE
): string {
  // Return empty string for invalid values
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }

  try {
    // Format using Intl.NumberFormat
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(value);
  } catch (error) {
    // Fallback in case of errors
    console.error('Percentage formatting error:', error);
    return `${(value * 100).toFixed(decimalPlaces)}%`;
  }
}

/**
 * Parses a currency string input to a numeric value
 * 
 * @param input - The currency string to parse
 * @returns The parsed numeric value or 0 if invalid
 */
export function parseCurrencyInput(input: string): number {
  // Return 0 for invalid inputs
  if (!input) {
    return 0;
  }

  try {
    // Remove currency symbols, spaces, and commas
    const cleanedInput = input.replace(/[^\d.-]/g, '');
    
    // Convert to number
    const value = Number(cleanedInput);
    
    // Return the value or 0 if parsing failed
    return isNaN(value) ? 0 : value;
  } catch (error) {
    console.error('Currency parsing error:', error);
    return 0;
  }
}

/**
 * Converts a decimal currency amount to its equivalent in cents (or smallest currency unit)
 * 
 * @param amount - The decimal amount to convert
 * @returns The amount in cents as an integer
 */
export function toCents(amount: number): number {
  // Return 0 for invalid values
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 0;
  }

  try {
    // Use Decimal for precise arithmetic
    return new Decimal(amount).times(100).round().toNumber();
  } catch (error) {
    console.error('Currency conversion error:', error);
    // Fallback with less precision
    return Math.round(amount * 100);
  }
}

/**
 * Converts an amount in cents (or smallest currency unit) to its decimal currency representation
 * 
 * @param cents - The cents value to convert
 * @returns The decimal currency amount
 */
export function fromCents(cents: number): number {
  // Return 0 for invalid values
  if (cents === null || cents === undefined || isNaN(cents)) {
    return 0;
  }

  try {
    // Use Decimal for precise division
    return new Decimal(cents).dividedBy(100).toNumber();
  } catch (error) {
    console.error('Currency conversion error:', error);
    // Fallback with less precision
    return cents / 100;
  }
}

/**
 * Rounds a currency amount to the specified number of decimal places
 * 
 * @param amount - The amount to round
 * @param decimalPlaces - The number of decimal places (defaults to 2)
 * @returns The rounded currency amount
 */
export function roundCurrency(amount: number, decimalPlaces: number = 2): number {
  // Return 0 for invalid values
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 0;
  }

  try {
    // Use Decimal for precise rounding (ROUND_HALF_UP is the default)
    return new Decimal(amount).toDecimalPlaces(decimalPlaces).toNumber();
  } catch (error) {
    console.error('Currency rounding error:', error);
    // Fallback with less precision
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(amount * factor) / factor;
  }
}

/**
 * Validates if a value is a valid currency amount
 * 
 * @param value - The value to validate
 * @param allowNegative - Whether to allow negative values (defaults to false)
 * @param maxDecimalPlaces - Maximum decimal places allowed (defaults to 2)
 * @returns True if the value is a valid currency amount, false otherwise
 */
export function isValidCurrencyAmount(
  value: any,
  allowNegative: boolean = false,
  maxDecimalPlaces: number = 2
): boolean {
  // Must be a number or convertible to a number
  if (value === null || value === undefined || value === '') {
    return false;
  }

  // Convert to number if it's a string
  const numValue = typeof value === 'string' ? Number(parseCurrencyInput(value)) : value;

  // Check if it's a valid number
  if (isNaN(numValue) || !isFinite(numValue)) {
    return false;
  }

  // Check sign
  if (!allowNegative && numValue < 0) {
    return false;
  }

  // Check decimal places
  const decimalStr = numValue.toString().split('.');
  if (decimalStr.length > 1 && decimalStr[1].length > maxDecimalPlaces) {
    return false;
  }

  return true;
}

/**
 * Gets the currency symbol for a specified currency code
 * 
 * @param currencyCode - The ISO 4217 currency code
 * @param locale - The locale to use
 * @returns The currency symbol
 */
export function getCurrencySymbol(
  currencyCode: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE
): string {
  try {
    // Format 0 with the currency and extract just the symbol
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(0);

    // Extract the symbol using regex (anything that's not a digit, period, comma, or space)
    const symbolMatch = formatted.match(/[^\d.,\s]/g);
    if (symbolMatch) {
      return symbolMatch.join('').trim();
    }
    
    // Fallback to currency code if symbol extraction fails
    return currencyCode;
  } catch (error) {
    console.error('Currency symbol error:', error);
    return currencyCode;
  }
}

/**
 * Formats a range of currency values (min-max)
 * 
 * @param minAmount - The minimum amount
 * @param maxAmount - The maximum amount
 * @param currencyCode - The ISO 4217 currency code
 * @param locale - The locale to use
 * @returns The formatted currency range string
 */
export function formatCurrencyRange(
  minAmount: number,
  maxAmount: number,
  currencyCode: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE
): string {
  // Validate inputs
  if (
    minAmount === null || minAmount === undefined || isNaN(minAmount) ||
    maxAmount === null || maxAmount === undefined || isNaN(maxAmount)
  ) {
    return '';
  }

  // Format both values
  const minFormatted = formatCurrency(minAmount, currencyCode, locale);
  const maxFormatted = formatCurrency(maxAmount, currencyCode, locale);

  // Return range
  return `${minFormatted} - ${maxFormatted}`;
}

/**
 * Compares two currency amounts with proper handling of floating point precision
 * 
 * @param amount1 - First amount to compare
 * @param amount2 - Second amount to compare
 * @returns 1 if amount1 > amount2, -1 if amount1 < amount2, 0 if equal
 */
export function compareCurrencyAmounts(amount1: number, amount2: number): number {
  // Validate inputs
  if (
    amount1 === null || amount1 === undefined || isNaN(amount1) ||
    amount2 === null || amount2 === undefined || isNaN(amount2)
  ) {
    return 0;
  }

  try {
    // Use Decimal for precise comparison
    const dec1 = new Decimal(amount1);
    const dec2 = new Decimal(amount2);
    
    if (dec1.greaterThan(dec2)) {
      return 1;
    } else if (dec1.lessThan(dec2)) {
      return -1;
    } else {
      return 0;
    }
  } catch (error) {
    console.error('Currency comparison error:', error);
    
    // Fallback with less precision
    if (amount1 > amount2) {
      return 1;
    } else if (amount1 < amount2) {
      return -1;
    } else {
      return 0;
    }
  }
}

/**
 * Formats user input in real-time for currency fields
 * 
 * @param input - The raw user input
 * @param currencyCode - The ISO 4217 currency code
 * @param locale - The locale to use
 * @returns Partially formatted currency string suitable for editing
 */
export function formatCurrencyInput(
  input: string,
  currencyCode: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE
): string {
  if (!input) {
    return '';
  }

  try {
    // Get the decimal separator for the locale
    const format = new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const parts = format.formatToParts(1.1);
    const decimalSeparator = parts.find(part => part.type === 'decimal')?.value || '.';
    
    // Remove any non-digit characters except the decimal separator
    let cleanedInput = '';
    let hasDecimal = false;
    
    for (const char of input) {
      if (/\d/.test(char)) {
        cleanedInput += char;
      } else if (char === decimalSeparator && !hasDecimal) {
        cleanedInput += decimalSeparator;
        hasDecimal = true;
      }
    }
    
    // Split into integer and decimal parts
    const parts2 = cleanedInput.split(decimalSeparator);
    let integerPart = parts2[0] || '';
    let decimalPart = parts2.length > 1 ? parts2[1] : '';
    
    // Limit decimal places to 2
    if (decimalPart.length > 2) {
      decimalPart = decimalPart.slice(0, 2);
    }
    
    // Format integer part with thousands separators
    let formattedIntegerPart = '';
    if (integerPart) {
      const numValue = parseInt(integerPart, 10);
      if (!isNaN(numValue)) {
        formattedIntegerPart = new Intl.NumberFormat(locale, {
          useGrouping: true,
          maximumFractionDigits: 0,
        }).format(numValue);
      } else {
        formattedIntegerPart = integerPart;
      }
    }
    
    // Combine parts
    if (decimalPart) {
      return `${formattedIntegerPart}${decimalSeparator}${decimalPart}`;
    } else if (hasDecimal) {
      return `${formattedIntegerPart}${decimalSeparator}`;
    } else {
      return formattedIntegerPart;
    }
  } catch (error) {
    console.error('Currency input formatting error:', error);
    return input;
  }
}