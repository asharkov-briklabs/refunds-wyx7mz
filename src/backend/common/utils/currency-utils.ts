/**
 * Currency Utilities
 * 
 * This module provides utility functions for handling currency operations
 * including formatting, conversion between decimal and minor units,
 * arithmetic with proper precision, and validation for financial calculations.
 */

import { Decimal } from 'decimal.js'; // ^10.4.0

/**
 * Formats a number as a currency string with proper symbol and decimal places
 * 
 * @param amount - The amount to format
 * @param currencyCode - The ISO currency code (e.g., 'USD', 'EUR')
 * @param locale - The locale to use for formatting
 * @returns The formatted currency string
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD',
  locale: string = 'en-US'
): string {
  if (!isValidCurrencyAmount(amount)) {
    throw new Error('Invalid currency amount');
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
}

/**
 * Converts a decimal currency amount to its equivalent in cents (or smallest currency unit)
 * 
 * @param amount - The decimal amount to convert
 * @returns The amount in cents as an integer
 */
export function toCents(amount: number): number {
  if (!isValidCurrencyAmount(amount)) {
    throw new Error('Invalid currency amount');
  }

  const decimalAmount = new Decimal(amount);
  return decimalAmount.times(100).round().toNumber();
}

/**
 * Converts an amount in cents (or smallest currency unit) to its decimal currency representation
 * 
 * @param cents - The amount in cents
 * @returns The decimal currency amount
 */
export function fromCents(cents: number): number {
  if (!Number.isInteger(cents)) {
    throw new Error('Cents must be an integer');
  }

  const decimalAmount = new Decimal(cents).dividedBy(100);
  return decimalAmount.toNumber();
}

/**
 * Rounds a currency amount to the specified number of decimal places
 * 
 * @param amount - The amount to round
 * @param decimalPlaces - The number of decimal places to round to (default: 2)
 * @returns The rounded currency amount
 */
export function roundCurrency(amount: number, decimalPlaces: number = 2): number {
  if (!isValidCurrencyAmount(amount)) {
    throw new Error('Invalid currency amount');
  }

  const decimalAmount = new Decimal(amount);
  return decimalAmount.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Adds two or more currency amounts with proper decimal precision
 * 
 * @param amounts - The amounts to add
 * @param decimalPlaces - The number of decimal places for the result (default: 2)
 * @returns The sum of all amounts with proper precision
 */
export function addCurrency(amounts: number[], decimalPlaces: number = 2): number {
  if (!amounts || amounts.length === 0) {
    return 0;
  }

  for (const amount of amounts) {
    if (!isValidCurrencyAmount(amount)) {
      throw new Error('Invalid currency amount');
    }
  }

  let sum = new Decimal(0);
  for (const amount of amounts) {
    sum = sum.plus(new Decimal(amount));
  }

  return sum.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Subtracts one currency amount from another with proper decimal precision
 * 
 * @param minuend - The amount to subtract from
 * @param subtrahend - The amount to subtract
 * @param decimalPlaces - The number of decimal places for the result (default: 2)
 * @returns The difference with proper precision
 */
export function subtractCurrency(
  minuend: number,
  subtrahend: number,
  decimalPlaces: number = 2
): number {
  if (!isValidCurrencyAmount(minuend) || !isValidCurrencyAmount(subtrahend)) {
    throw new Error('Invalid currency amount');
  }

  const result = new Decimal(minuend).minus(new Decimal(subtrahend));
  return result.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Multiplies a currency amount by a factor with proper decimal precision
 * 
 * @param amount - The amount to multiply
 * @param factor - The multiplication factor
 * @param decimalPlaces - The number of decimal places for the result (default: 2)
 * @returns The product with proper precision
 */
export function multiplyCurrency(
  amount: number,
  factor: number,
  decimalPlaces: number = 2
): number {
  if (!isValidCurrencyAmount(amount) || !isFinite(factor)) {
    throw new Error('Invalid input values');
  }

  const result = new Decimal(amount).times(new Decimal(factor));
  return result.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Divides a currency amount by a divisor with proper decimal precision
 * 
 * @param amount - The amount to divide
 * @param divisor - The divisor
 * @param decimalPlaces - The number of decimal places for the result (default: 2)
 * @returns The quotient with proper precision
 */
export function divideCurrency(
  amount: number,
  divisor: number,
  decimalPlaces: number = 2
): number {
  if (!isValidCurrencyAmount(amount)) {
    throw new Error('Invalid currency amount');
  }

  if (divisor === 0) {
    throw new Error('Cannot divide by zero');
  }

  const result = new Decimal(amount).dividedBy(new Decimal(divisor));
  return result.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Validates if a value is a valid currency amount
 * 
 * @param value - The value to validate
 * @returns True if the value is a valid currency amount, false otherwise
 */
export function isValidCurrencyAmount(value: any): boolean {
  // Handle null or undefined
  if (value === null || value === undefined) {
    return false;
  }

  // Convert string to number if possible
  if (typeof value === 'string') {
    // Remove currency symbols, commas, and spaces
    const cleanedValue = value.replace(/[$,\s]/g, '');
    if (!/^-?\d*\.?\d*$/.test(cleanedValue)) {
      return false;
    }
    value = parseFloat(cleanedValue);
  }

  // Must be a number
  if (typeof value !== 'number') {
    return false;
  }

  // Must be finite
  if (!isFinite(value)) {
    return false;
  }

  // Check decimal places (default max is 2 for currency)
  const decimalStr = value.toString();
  if (decimalStr.includes('.')) {
    const decimalPlaces = decimalStr.split('.')[1].length;
    if (decimalPlaces > 2) {
      return false;
    }
  }

  return true;
}

/**
 * Compares two currency amounts with proper handling of floating point precision
 * 
 * @param amount1 - First amount to compare
 * @param amount2 - Second amount to compare
 * @returns 1 if amount1 > amount2, -1 if amount1 < amount2, 0 if equal
 */
export function compareCurrency(amount1: number, amount2: number): number {
  if (!isValidCurrencyAmount(amount1) || !isValidCurrencyAmount(amount2)) {
    throw new Error('Invalid currency amount');
  }

  const decimal1 = new Decimal(amount1);
  const decimal2 = new Decimal(amount2);

  if (decimal1.greaterThan(decimal2)) {
    return 1;
  } else if (decimal1.lessThan(decimal2)) {
    return -1;
  } else {
    return 0;
  }
}

/**
 * Parses and validates a string or number as a currency amount
 * 
 * @param value - The value to parse and validate
 * @returns The parsed currency amount
 * @throws Error if the value is not a valid currency amount
 */
export function parseValidCurrencyAmount(value: any): number {
  // Handle null or undefined
  if (value === null || value === undefined) {
    throw new Error('Cannot parse null or undefined as currency');
  }

  // Handle string values (remove currency symbols, commas, etc.)
  if (typeof value === 'string') {
    // Remove currency symbols, commas, spaces
    const cleanedValue = value.replace(/[$,\s]/g, '');
    
    // Check if it's a valid number format
    if (!/^-?\d*\.?\d*$/.test(cleanedValue)) {
      throw new Error('Invalid currency format');
    }
    
    value = parseFloat(cleanedValue);
  }

  // Must be a number after conversion
  if (typeof value !== 'number' || !isFinite(value)) {
    throw new Error('Value must be a finite number');
  }

  // Round to 2 decimal places for standard currency
  return roundCurrency(value);
}

/**
 * Gets the currency symbol for a specified currency code
 * 
 * @param currencyCode - The ISO currency code (e.g., 'USD', 'EUR')
 * @param locale - The locale to use
 * @returns The currency symbol
 */
export function getCurrencySymbol(
  currencyCode: string = 'USD',
  locale: string = 'en-US'
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: 'symbol',
  });
  
  // Format a zero value and extract just the symbol
  const formattedZero = formatter.format(0);
  
  // Extract the symbol by removing digits, decimal points, commas, and whitespace
  const symbol = formattedZero.replace(/[\d,.]/g, '').trim();
  
  return symbol;
}