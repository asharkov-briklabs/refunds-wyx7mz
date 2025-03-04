import { Decimal } from 'decimal.js'; // v10.4.0
import * as currencyUtils from '../../../common/utils/currency-utils';

describe('formatCurrency function', () => {
  it('should format USD currency correctly', () => {
    expect(currencyUtils.formatCurrency(99.99, 'USD', 'en-US')).toBe('$99.99');
  });

  it('should format EUR currency correctly', () => {
    expect(currencyUtils.formatCurrency(88.77, 'EUR', 'de-DE')).toBe('88,77 €');
  });

  it('should handle zero values', () => {
    expect(currencyUtils.formatCurrency(0, 'USD', 'en-US')).toBe('$0.00');
  });

  it('should handle negative values', () => {
    expect(currencyUtils.formatCurrency(-45.67, 'USD', 'en-US')).toBe('-$45.67');
  });

  it('should use defaults when not specified', () => {
    expect(currencyUtils.formatCurrency(123.45)).toBe('$123.45');
  });

  it('should throw error for invalid currency amount', () => {
    expect(() => currencyUtils.formatCurrency(NaN)).toThrow('Invalid currency amount');
  });
});

describe('toCents function', () => {
  it('should convert decimal to cents correctly', () => {
    expect(currencyUtils.toCents(10.99)).toBe(1099);
  });

  it('should handle fractional cents', () => {
    expect(currencyUtils.toCents(10.995)).toBe(1100); // Should round up
  });

  it('should handle zero', () => {
    expect(currencyUtils.toCents(0)).toBe(0);
  });

  it('should handle negative values', () => {
    expect(currencyUtils.toCents(-5.75)).toBe(-575);
  });

  it('should handle large values', () => {
    expect(currencyUtils.toCents(1234567.89)).toBe(123456789);
  });

  it('should throw error for invalid input', () => {
    expect(() => currencyUtils.toCents(NaN)).toThrow('Invalid currency amount');
  });
});

describe('fromCents function', () => {
  it('should convert cents to decimal correctly', () => {
    expect(currencyUtils.fromCents(1099)).toBe(10.99);
  });

  it('should handle zero', () => {
    expect(currencyUtils.fromCents(0)).toBe(0);
  });

  it('should handle negative values', () => {
    expect(currencyUtils.fromCents(-575)).toBe(-5.75);
  });

  it('should handle large values', () => {
    expect(currencyUtils.fromCents(123456789)).toBe(1234567.89);
  });

  it('should throw error for non-integer input', () => {
    expect(() => currencyUtils.fromCents(10.5)).toThrow('Cents must be an integer');
  });
});

describe('roundCurrency function', () => {
  it('should round to 2 decimal places by default', () => {
    expect(currencyUtils.roundCurrency(10.456)).toBe(10.46);
  });

  it('should round to specified decimal places', () => {
    expect(currencyUtils.roundCurrency(10.456, 1)).toBe(10.5);
  });

  it('should round HALF_UP correctly', () => {
    expect(currencyUtils.roundCurrency(10.445, 2)).toBe(10.45);
    expect(currencyUtils.roundCurrency(10.455, 2)).toBe(10.46);
  });

  it('should handle zero value', () => {
    expect(currencyUtils.roundCurrency(0)).toBe(0);
  });

  it('should handle negative values', () => {
    expect(currencyUtils.roundCurrency(-10.456)).toBe(-10.46);
  });

  it('should throw error for invalid input', () => {
    expect(() => currencyUtils.roundCurrency(NaN)).toThrow('Invalid currency amount');
  });
});

describe('addCurrency function', () => {
  it('should add two currency values correctly', () => {
    expect(currencyUtils.addCurrency([10.25, 5.75])).toBe(16.0);
  });

  it('should add multiple currency values', () => {
    expect(currencyUtils.addCurrency([10.25, 5.75, 3.5, 1.25])).toBe(20.75);
  });

  it('should handle precision correctly', () => {
    // Due to floating point precision issues, 0.1 + 0.2 typically doesn't equal 0.3 exactly
    // This tests that our function handles this correctly
    expect(currencyUtils.addCurrency([0.1, 0.2, 0.3])).toBe(0.6);
  });

  it('should handle empty array', () => {
    expect(currencyUtils.addCurrency([])).toBe(0);
  });

  it('should handle null/undefined', () => {
    // @ts-ignore: Null check test
    expect(currencyUtils.addCurrency(null)).toBe(0);
    // @ts-ignore: Undefined check test
    expect(currencyUtils.addCurrency(undefined)).toBe(0);
  });

  it('should handle zero values', () => {
    expect(currencyUtils.addCurrency([0, 0, 0])).toBe(0);
    expect(currencyUtils.addCurrency([10.5, 0, 5.25])).toBe(15.75);
  });

  it('should handle negative values', () => {
    expect(currencyUtils.addCurrency([10.5, -5.25])).toBe(5.25);
    expect(currencyUtils.addCurrency([-10.5, -5.25])).toBe(-15.75);
  });

  it('should support custom decimal places', () => {
    expect(currencyUtils.addCurrency([1.111, 2.222, 3.333], 3)).toBe(6.666);
  });

  it('should throw error for invalid input', () => {
    expect(() => currencyUtils.addCurrency([10.5, NaN])).toThrow('Invalid currency amount');
  });
});

describe('subtractCurrency function', () => {
  it('should subtract correctly', () => {
    expect(currencyUtils.subtractCurrency(20.5, 7.25)).toBe(13.25);
  });

  it('should handle negative result', () => {
    expect(currencyUtils.subtractCurrency(5.25, 10.5)).toBe(-5.25);
  });

  it('should handle precision correctly', () => {
    // Tests handling of floating point precision issues
    expect(currencyUtils.subtractCurrency(0.3, 0.1)).toBe(0.2);
  });

  it('should handle zero values', () => {
    expect(currencyUtils.subtractCurrency(10.5, 0)).toBe(10.5);
    expect(currencyUtils.subtractCurrency(0, 10.5)).toBe(-10.5);
  });

  it('should support custom decimal places', () => {
    expect(currencyUtils.subtractCurrency(10.5555, 5.5555, 3)).toBe(5.000);
  });

  it('should throw error for invalid inputs', () => {
    expect(() => currencyUtils.subtractCurrency(NaN, 5)).toThrow('Invalid currency amount');
    expect(() => currencyUtils.subtractCurrency(5, NaN)).toThrow('Invalid currency amount');
  });
});

describe('multiplyCurrency function', () => {
  it('should multiply by integer correctly', () => {
    expect(currencyUtils.multiplyCurrency(10.5, 3)).toBe(31.5);
  });

  it('should multiply by decimal correctly', () => {
    expect(currencyUtils.multiplyCurrency(10.0, 0.25)).toBe(2.5);
  });

  it('should handle precision correctly', () => {
    expect(currencyUtils.multiplyCurrency(33.33, 3)).toBe(99.99);
  });

  it('should handle zero values', () => {
    expect(currencyUtils.multiplyCurrency(0, 5)).toBe(0);
    expect(currencyUtils.multiplyCurrency(10.5, 0)).toBe(0);
  });

  it('should handle negative values', () => {
    expect(currencyUtils.multiplyCurrency(10.5, -2)).toBe(-21);
    expect(currencyUtils.multiplyCurrency(-10.5, 2)).toBe(-21);
    expect(currencyUtils.multiplyCurrency(-10.5, -2)).toBe(21);
  });

  it('should support custom decimal places', () => {
    expect(currencyUtils.multiplyCurrency(10.5, 3.333, 3)).toBe(34.997);
  });

  it('should throw error for invalid inputs', () => {
    expect(() => currencyUtils.multiplyCurrency(NaN, 5)).toThrow('Invalid input values');
    expect(() => currencyUtils.multiplyCurrency(5, NaN)).toThrow('Invalid input values');
    expect(() => currencyUtils.multiplyCurrency(5, Infinity)).toThrow('Invalid input values');
  });
});

describe('divideCurrency function', () => {
  it('should divide by integer correctly', () => {
    expect(currencyUtils.divideCurrency(10.5, 3)).toBe(3.5);
  });

  it('should divide by decimal correctly', () => {
    expect(currencyUtils.divideCurrency(10.0, 0.5)).toBe(20.0);
  });

  it('should handle precision correctly', () => {
    expect(currencyUtils.divideCurrency(33.33, 3)).toBe(11.11);
  });

  it('should handle zero dividend', () => {
    expect(currencyUtils.divideCurrency(0, 5)).toBe(0);
  });

  it('should throw error for division by zero', () => {
    expect(() => currencyUtils.divideCurrency(10.0, 0)).toThrow('Cannot divide by zero');
  });

  it('should handle negative values', () => {
    expect(currencyUtils.divideCurrency(10.5, -2)).toBe(-5.25);
    expect(currencyUtils.divideCurrency(-10.5, 2)).toBe(-5.25);
    expect(currencyUtils.divideCurrency(-10.5, -2)).toBe(5.25);
  });

  it('should support custom decimal places', () => {
    expect(currencyUtils.divideCurrency(10, 3, 3)).toBe(3.333);
  });

  it('should throw error for invalid inputs', () => {
    expect(() => currencyUtils.divideCurrency(NaN, 5)).toThrow('Invalid currency amount');
  });
});

describe('isValidCurrencyAmount function', () => {
  it('should validate decimal values', () => {
    expect(currencyUtils.isValidCurrencyAmount(10.99)).toBe(true);
  });

  it('should validate integer values', () => {
    expect(currencyUtils.isValidCurrencyAmount(100)).toBe(true);
  });

  it('should validate negative values', () => {
    expect(currencyUtils.isValidCurrencyAmount(-10.99)).toBe(true);
  });

  it('should validate zero', () => {
    expect(currencyUtils.isValidCurrencyAmount(0)).toBe(true);
  });

  it('should validate string numbers', () => {
    expect(currencyUtils.isValidCurrencyAmount("10.99")).toBe(true);
    expect(currencyUtils.isValidCurrencyAmount("10")).toBe(true);
  });

  it('should reject non-numeric values', () => {
    expect(currencyUtils.isValidCurrencyAmount("hello")).toBe(false);
    expect(currencyUtils.isValidCurrencyAmount({})).toBe(false);
    expect(currencyUtils.isValidCurrencyAmount([])).toBe(false);
  });

  it('should reject null and undefined', () => {
    expect(currencyUtils.isValidCurrencyAmount(null)).toBe(false);
    expect(currencyUtils.isValidCurrencyAmount(undefined)).toBe(false);
  });

  it('should reject NaN and Infinity', () => {
    expect(currencyUtils.isValidCurrencyAmount(NaN)).toBe(false);
    expect(currencyUtils.isValidCurrencyAmount(Infinity)).toBe(false);
    expect(currencyUtils.isValidCurrencyAmount(-Infinity)).toBe(false);
  });

  it('should reject values with too many decimal places', () => {
    expect(currencyUtils.isValidCurrencyAmount(10.999)).toBe(false);
  });
});

describe('compareCurrency function', () => {
  it('should return 0 for equal values', () => {
    expect(currencyUtils.compareCurrency(10.5, 10.5)).toBe(0);
  });

  it('should return 1 for greater first value', () => {
    expect(currencyUtils.compareCurrency(10.51, 10.5)).toBe(1);
  });

  it('should return -1 for lesser first value', () => {
    expect(currencyUtils.compareCurrency(10.49, 10.5)).toBe(-1);
  });

  it('should handle precision correctly', () => {
    // Test values that are very close but should compare correctly
    expect(currencyUtils.compareCurrency(0.3, 0.2 + 0.1)).toBe(0);
  });

  it('should handle zero values', () => {
    expect(currencyUtils.compareCurrency(0, 0)).toBe(0);
    expect(currencyUtils.compareCurrency(0.01, 0)).toBe(1);
    expect(currencyUtils.compareCurrency(0, 0.01)).toBe(-1);
  });

  it('should handle negative values', () => {
    expect(currencyUtils.compareCurrency(-10.5, -10.5)).toBe(0);
    expect(currencyUtils.compareCurrency(-10.49, -10.5)).toBe(1);
    expect(currencyUtils.compareCurrency(-10.51, -10.5)).toBe(-1);
  });

  it('should throw error for invalid inputs', () => {
    expect(() => currencyUtils.compareCurrency(NaN, 5)).toThrow('Invalid currency amount');
    expect(() => currencyUtils.compareCurrency(5, NaN)).toThrow('Invalid currency amount');
  });
});

describe('parseValidCurrencyAmount function', () => {
  it('should parse number correctly', () => {
    expect(currencyUtils.parseValidCurrencyAmount(10.99)).toBe(10.99);
  });

  it('should parse string with currency symbol', () => {
    expect(currencyUtils.parseValidCurrencyAmount('$10.99')).toBe(10.99);
  });

  it('should parse string with thousand separators', () => {
    expect(currencyUtils.parseValidCurrencyAmount('1,234.56')).toBe(1234.56);
  });

  it('should parse string with spaces', () => {
    expect(currencyUtils.parseValidCurrencyAmount('  10.99  ')).toBe(10.99);
  });

  it('should handle negative values', () => {
    expect(currencyUtils.parseValidCurrencyAmount('-10.99')).toBe(-10.99);
    expect(currencyUtils.parseValidCurrencyAmount('-$10.99')).toBe(-10.99);
  });

  it('should handle decimal values', () => {
    expect(currencyUtils.parseValidCurrencyAmount('10.99')).toBe(10.99);
    expect(currencyUtils.parseValidCurrencyAmount('.99')).toBe(0.99);
  });

  it('should throw error for invalid formats', () => {
    expect(() => currencyUtils.parseValidCurrencyAmount('abc')).toThrow('Invalid currency format');
    expect(() => currencyUtils.parseValidCurrencyAmount('10.99.99')).toThrow('Invalid currency format');
  });

  it('should throw error for null or undefined', () => {
    expect(() => currencyUtils.parseValidCurrencyAmount(null)).toThrow('Cannot parse null or undefined as currency');
    expect(() => currencyUtils.parseValidCurrencyAmount(undefined)).toThrow('Cannot parse null or undefined as currency');
  });

  it('should throw error for non-numeric values', () => {
    expect(() => currencyUtils.parseValidCurrencyAmount({})).toThrow('Value must be a finite number');
    expect(() => currencyUtils.parseValidCurrencyAmount([])).toThrow('Value must be a finite number');
  });

  it('should throw error for NaN and Infinity', () => {
    expect(() => currencyUtils.parseValidCurrencyAmount(NaN)).toThrow('Value must be a finite number');
    expect(() => currencyUtils.parseValidCurrencyAmount(Infinity)).toThrow('Value must be a finite number');
  });
});

describe('getCurrencySymbol function', () => {
  it('should return USD symbol correctly', () => {
    expect(currencyUtils.getCurrencySymbol('USD', 'en-US')).toBe('$');
  });

  it('should return EUR symbol correctly', () => {
    expect(currencyUtils.getCurrencySymbol('EUR', 'de-DE')).toBe('€');
  });

  it('should handle different currency codes', () => {
    expect(currencyUtils.getCurrencySymbol('GBP', 'en-GB')).toBe('£');
    expect(currencyUtils.getCurrencySymbol('JPY', 'ja-JP')).toEqual(expect.stringContaining('¥'));
  });

  it('should use defaults when not specified', () => {
    expect(currencyUtils.getCurrencySymbol()).toBe('$');
  });

  it('should handle locale-specific formatting', () => {
    // Same currency can have different representations in different locales
    expect(currencyUtils.getCurrencySymbol('USD', 'en-US')).toBe('$');
    
    // In some locales, the € might be after the number (we just want to ensure it returns something)
    const eurSymbol = currencyUtils.getCurrencySymbol('EUR', 'fr-FR');
    expect(eurSymbol.includes('€') || eurSymbol.includes('EUR')).toBeTruthy();
  });
});