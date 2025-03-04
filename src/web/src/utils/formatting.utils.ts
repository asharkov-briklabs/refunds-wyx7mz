import { Currency } from '../types/common.types';
import IntlMessageFormat from 'intl-messageformat'; // intl-messageformat v10.1.0

// Default locale for formatting operations
const DEFAULT_LOCALE = 'en-US';

/**
 * Formats an ID string for display, with optional truncation and formatting
 * @param id - The ID string to format
 * @param shortened - Whether to display a shortened version (first 8 chars)
 * @param prefix - Optional prefix to add to the ID (e.g., 'TXN-')
 * @returns Formatted ID string
 */
export const formatId = (id: string, shortened = false, prefix?: string): string => {
  if (!id) return '';
  
  let formattedId = id;
  
  // Truncate if shortened option is selected
  if (shortened && id.length > 8) {
    formattedId = id.substring(0, 8);
  }
  
  // Add prefix if provided
  if (prefix) {
    // If ID already contains the prefix, don't add it again
    if (!formattedId.startsWith(prefix)) {
      formattedId = `${prefix}${formattedId}`;
    }
  }
  
  return formattedId;
};

/**
 * Truncates text to a specified length and adds ellipsis if needed
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation (default: 50)
 * @param ellipsis - String to append when truncated (default: '...')
 * @returns Truncated text with ellipsis if truncated
 */
export const truncateText = (text: string, maxLength = 50, ellipsis = '...'): string => {
  if (!text) return '';
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return `${text.substring(0, maxLength)}${ellipsis}`;
};

/**
 * Capitalizes the first letter of a string
 * @param str - The string to capitalize
 * @returns String with first letter capitalized
 */
export const capitalizeFirstLetter = (str: string): string => {
  if (!str) return '';
  
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Formats a phone number string according to the specified locale
 * @param phoneNumber - The phone number to format
 * @param locale - The locale to use for formatting (default: DEFAULT_LOCALE)
 * @returns Formatted phone number string
 */
export const formatPhoneNumber = (phoneNumber: string, locale = DEFAULT_LOCALE): string => {
  if (!phoneNumber) return '';
  
  // Strip non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format based on locale
  if (locale === 'en-US' || locale === 'en-CA') {
    // Format as (XXX) XXX-XXXX for US/Canada
    if (cleaned.length === 10) {
      return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 10)}`;
    } else if (cleaned.length === 11 && cleaned.charAt(0) === '1') {
      // Handle numbers with country code
      return `+1 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 11)}`;
    }
  } else if (locale.startsWith('en-GB')) {
    // UK format: +44 XXXX XXXXXX
    if (cleaned.length === 10) {
      return `+44 ${cleaned.substring(0, 4)} ${cleaned.substring(4)}`;
    }
  }
  
  // Default: if we don't have specific formatting for the locale,
  // return with general international formatting
  if (cleaned.length > 10) {
    return `+${cleaned}`;
  }
  
  // Return the cleaned number if we can't apply specific formatting
  return cleaned;
};

/**
 * Formats an address object into a displayable string
 * @param address - The address object with street, city, state, zip, etc.
 * @param includeCountry - Whether to include country in the output (default: true)
 * @param singleLine - Whether to format as a single line (default: false)
 * @returns Formatted address string
 */
export const formatAddress = (
  address: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  },
  includeCountry = true,
  singleLine = false
): string => {
  if (!address) return '';
  
  const {
    street1 = '',
    street2 = '',
    city = '',
    state = '',
    zip = '',
    country = ''
  } = address;
  
  // Build address components
  const components = [];
  
  if (street1) {
    components.push(street1);
  }
  
  if (street2) {
    components.push(street2);
  }
  
  // City, State ZIP
  const cityStateZip = [city, state, zip]
    .filter(Boolean)
    .join(state && zip ? ' ' : ', ');
  
  if (cityStateZip) {
    components.push(cityStateZip);
  }
  
  // Include country if requested and available
  if (includeCountry && country) {
    components.push(country);
  }
  
  // Format based on single line preference
  if (singleLine) {
    return components.join(', ');
  } else {
    return components.join('\n');
  }
};

/**
 * Formats an enum value into a human-readable string
 * @param enumValue - The enum value to format
 * @returns Human-readable string representation
 */
export const formatEnum = (enumValue: string): string => {
  if (!enumValue) return '';
  
  // Handle underscore-separated values (SOME_ENUM_VALUE)
  if (enumValue.includes('_')) {
    return enumValue
      .split('_')
      .map(word => capitalizeFirstLetter(word.toLowerCase()))
      .join(' ');
  }
  
  // Handle camelCase values (someEnumValue)
  return enumValue
    // Insert space before uppercase letters
    .replace(/([A-Z])/g, ' $1')
    // Trim leading space and capitalize first letter
    .replace(/^./, str => str.toUpperCase())
    // Clean up any extra spaces
    .trim();
};

/**
 * Formats a byte value into a human-readable file size
 * @param bytes - The value in bytes
 * @param decimals - Number of decimal places to include (default: 2)
 * @returns Formatted file size with appropriate unit
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0 || bytes === null || bytes === undefined) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Formats a count with singular/plural forms of a word
 * @param count - The count value
 * @param singular - The singular form of the word
 * @param plural - The plural form of the word (default: singular + 's')
 * @returns Formatted string with count and appropriate word form
 */
export const formatPlural = (count: number, singular: string, plural?: string): string => {
  if (count === undefined || singular === undefined) return '';
  
  const pluralForm = plural || `${singular}s`;
  
  return `${count} ${count === 1 ? singular : pluralForm}`;
};

/**
 * Formats an array of items into a comma-separated list with conjunction
 * @param items - Array of items to format
 * @param conjunction - Conjunction to use (default: 'and')
 * @param locale - The locale to use for formatting (default: DEFAULT_LOCALE)
 * @returns Formatted list as string
 */
export const formatList = (
  items: string[],
  conjunction = 'and',
  locale = DEFAULT_LOCALE
): string => {
  if (!items || items.length === 0) return '';
  
  if (items.length === 1) return items[0];
  
  // Use Intl.ListFormat if available (modern browsers)
  if (typeof Intl !== 'undefined' && Intl.ListFormat) {
    try {
      const formatter = new Intl.ListFormat(locale, {
        style: 'long',
        type: 'conjunction'
      });
      return formatter.format(items);
    } catch (e) {
      // Fallback to manual formatting if Intl.ListFormat fails
    }
  }
  
  // Manual formatting fallback
  if (items.length === 2) {
    return `${items[0]} ${conjunction} ${items[1]}`;
  }
  
  const lastItem = items[items.length - 1];
  const otherItems = items.slice(0, -1);
  
  return `${otherItems.join(', ')}, ${conjunction} ${lastItem}`;
};

/**
 * Formats a status value into a standardized display label
 * @param status - The status value to format
 * @returns Formatted status label
 */
export const formatStatusLabel = (status: string): string => {
  if (!status) return '';
  
  // Handle special cases first
  const specialCases: Record<string, string> = {
    'PENDING_APPROVAL': 'Pending Approval',
    'GATEWAY_ERROR': 'Gateway Error',
    'ORIGINAL_PAYMENT': 'Original Payment',
    'IN_PROGRESS': 'In Progress'
  };
  
  if (specialCases[status]) {
    return specialCases[status];
  }
  
  // Standard formatting: replace underscores with spaces and capitalize each word
  return status
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => capitalizeFirstLetter(word.toLowerCase()))
    .join(' ');
};

/**
 * Formats a credit card number with proper masking
 * @param cardNumber - The credit card number to format
 * @param showLastFour - Whether to show the last four digits (default: true)
 * @returns Masked credit card number
 */
export const formatCreditCardNumber = (cardNumber: string, showLastFour = true): string => {
  if (!cardNumber) return '';
  
  // If the number is very short, just return it as is
  if (cardNumber.length < 4) return cardNumber;
  
  let masked: string;
  
  if (showLastFour) {
    // Mask all but last 4 digits
    const lastFour = cardNumber.slice(-4);
    const maskedPart = cardNumber.slice(0, -4).replace(/./g, '•');
    masked = maskedPart + lastFour;
  } else {
    // Mask everything
    masked = cardNumber.replace(/./g, '•');
  }
  
  // Add spacing for readability (groups of 4)
  // First remove any existing spaces or non-digits
  const strippedMasked = masked.replace(/[^\d•]/g, '');
  const formattedMasked = [];
  
  for (let i = 0; i < strippedMasked.length; i += 4) {
    formattedMasked.push(strippedMasked.substr(i, 4));
  }
  
  return formattedMasked.join(' ');
};

/**
 * Formats a bank account number with proper masking
 * @param accountNumber - The bank account number to format
 * @param showLastFour - Whether to show the last four digits (default: true)
 * @returns Masked bank account number
 */
export const formatBankAccountNumber = (accountNumber: string, showLastFour = true): string => {
  if (!accountNumber) return '';
  
  // If the number is very short, just return it as is
  if (accountNumber.length < 4) return accountNumber;
  
  if (showLastFour) {
    // Mask all but last 4 digits
    const lastFour = accountNumber.slice(-4);
    const maskedPart = accountNumber.slice(0, -4).replace(/./g, '•');
    return maskedPart + lastFour;
  } else {
    // Mask everything
    return accountNumber.replace(/./g, '•');
  }
};

/**
 * Formats an email address, with optional obfuscation for privacy
 * @param email - The email address to format
 * @param obfuscate - Whether to obfuscate the username portion (default: false)
 * @returns Formatted or obfuscated email
 */
export const formatEmail = (email: string, obfuscate = false): string => {
  if (!email) return '';
  
  if (!obfuscate) return email;
  
  // Obfuscate the username portion of the email
  const [username, domain] = email.split('@');
  
  if (!domain) return email; // Not a valid email format
  
  // If username is very short, preserve first character only
  if (username.length <= 3) {
    return `${username.charAt(0)}${'•'.repeat(2)}@${domain}`;
  }
  
  // Otherwise, preserve first and last character with obfuscation in between
  const firstChar = username.charAt(0);
  const lastChar = username.charAt(username.length - 1);
  const obfuscatedMiddle = '•'.repeat(Math.min(username.length - 2, 5));
  
  return `${firstChar}${obfuscatedMiddle}${lastChar}@${domain}`;
};

/**
 * Formats a bank routing number for display
 * @param routingNumber - The routing number to format
 * @returns Formatted routing number
 */
export const formatRoutingNumber = (routingNumber: string): string => {
  if (!routingNumber) return '';
  
  // Clean non-digits
  const cleaned = routingNumber.replace(/\D/g, '');
  
  // Standard US routing numbers are 9 digits
  if (cleaned.length === 9) {
    // Format as XXX-XXX-XXX
    return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 6)}-${cleaned.substring(6, 9)}`;
  }
  
  // If not standard length, return as is
  return cleaned;
};

/**
 * Formats a full name with middle initial if available
 * @param firstName - First name
 * @param middleName - Middle name (optional)
 * @param lastName - Last name
 * @returns Formatted full name with middle initial
 */
export const formatNameWithInitials = (
  firstName: string,
  middleName?: string,
  lastName?: string
): string => {
  if (!firstName) return '';
  
  // Handle cases where only first name is provided
  if (!lastName) return firstName;
  
  // Format with middle initial if available
  if (middleName) {
    const middleInitial = middleName.charAt(0).toUpperCase();
    return `${firstName} ${middleInitial}. ${lastName}`;
  }
  
  // Otherwise just first and last name
  return `${firstName} ${lastName}`;
};

/**
 * Converts a string to title case (capitalize first letter of each word)
 * @param str - The string to convert
 * @returns String in title case
 */
export const titleCase = (str: string): string => {
  if (!str) return '';
  
  // Split by spaces and capitalize first letter of each word
  return str
    .toLowerCase()
    .split(' ')
    .map(word => capitalizeFirstLetter(word))
    .join(' ');
};

/**
 * Formats an error message or error object into a user-friendly string
 * @param error - The error to format (string, Error object, or API error response)
 * @returns User-friendly error message
 */
export const formatErrorMessage = (error: any): string => {
  if (!error) return 'An unknown error occurred';
  
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message;
  }
  
  // Handle API error responses
  if (error.message) {
    return error.message;
  }
  
  if (error.error && typeof error.error === 'string') {
    return error.error;
  }
  
  if (error.error && error.error.message) {
    return error.error.message;
  }
  
  // Fallback for unknown error structures
  return 'An unexpected error occurred';
};

/**
 * Removes HTML tags from a string
 * @param html - The HTML string to strip
 * @returns String with HTML tags removed
 */
export const stripHtml = (html: string): string => {
  if (!html) return '';
  
  // Use a regex to remove HTML tags
  return html.replace(/<\/?[^>]+(>|$)/g, '');
};