/**
 * Utility functions for working with browser storage mechanisms (localStorage, sessionStorage)
 * with enhanced type safety, encryption capabilities, and automatic expiration handling.
 * 
 * These utilities provide secure storage for authentication tokens, user session data,
 * and other sensitive information in the web application.
 *
 * @module storage.utils
 */

import CryptoJS from 'crypto-js'; // crypto-js: ^4.1.1

// Encryption key used for sensitive data
const ENCRYPTION_KEY = process.env.REACT_APP_STORAGE_ENCRYPTION_KEY || 'refund-service-default-key';

// Default expiration time (8 hours in milliseconds)
const DEFAULT_EXPIRATION_TIME = 8 * 60 * 60 * 1000;

/**
 * Options for storage operations
 */
export interface StorageOptions {
  /**
   * Whether the data is sensitive and should be encrypted
   * @default false
   */
  sensitive?: boolean;
  
  /**
   * Whether to persist the data in localStorage (true) or sessionStorage (false)
   * @default true
   */
  persistence?: boolean;
  
  /**
   * Time in milliseconds until the data expires, or 0 for no expiration
   * @default 0
   */
  expirationTime?: number;
}

/**
 * Structure for data stored with metadata
 */
export interface StorageData<T> {
  /**
   * The actual data being stored
   */
  value: T;
  
  /**
   * Timestamp when this data expires (milliseconds since epoch)
   * If not set, the data doesn't expire
   */
  expiration?: number;
  
  /**
   * Whether the data is encrypted
   */
  encrypted: boolean;
}

/**
 * User data interface for type safety
 */
export interface User {
  id: string;
  email: string;
  roles: string[];
  [key: string]: any;
}

/**
 * Stores a value in browser storage with optional encryption and expiration
 *
 * @param key - The key to store the value under
 * @param value - The value to store
 * @param options - Storage options including encryption and expiration
 */
export function setItem<T>(key: string, value: T, options: StorageOptions = {}): void {
  const { sensitive = false, persistence = true, expirationTime = 0 } = options;

  // Prepare data object with value and optional expiration
  const data: StorageData<T> = {
    value,
    encrypted: false
  };

  // Set expiration if applicable
  if (expirationTime > 0) {
    data.expiration = Date.now() + expirationTime;
  }

  // If sensitive, encrypt the data
  let storageValue: string;
  if (sensitive) {
    storageValue = encryptData(data);
  } else {
    storageValue = JSON.stringify(data);
  }

  // Store in appropriate storage
  if (persistence) {
    localStorage.setItem(key, storageValue);
  } else {
    sessionStorage.setItem(key, storageValue);
  }
}

/**
 * Retrieves a value from browser storage with automatic decryption and expiration handling
 *
 * @param key - The key to retrieve
 * @param options - Storage options including encryption
 * @returns The stored value or null if not found, expired, or invalid
 */
export function getItem<T>(key: string, options: StorageOptions = {}): T | null {
  const { sensitive = false, persistence = true } = options;

  // Get raw data from appropriate storage
  const storageValue = persistence
    ? localStorage.getItem(key)
    : sessionStorage.getItem(key);

  // Return null if no data found
  if (!storageValue) {
    return null;
  }

  try {
    // Parse and decrypt if necessary
    let data: StorageData<T>;
    if (sensitive) {
      data = decryptData(storageValue);
    } else {
      data = JSON.parse(storageValue);
    }

    // Check if data has expired
    if (isExpired(data)) {
      // Remove expired data
      removeItem(key, { persistence });
      return null;
    }

    return data.value;
  } catch (error) {
    console.error(`Error retrieving item from storage: ${key}`, error);
    // If there's an error parsing/decrypting, remove the corrupted data
    removeItem(key, { persistence });
    return null;
  }
}

/**
 * Removes an item from browser storage
 *
 * @param key - The key to remove
 * @param options - Storage options
 */
export function removeItem(key: string, options: StorageOptions = {}): void {
  const { persistence = true } = options;

  if (persistence) {
    localStorage.removeItem(key);
  } else {
    sessionStorage.removeItem(key);
  }
}

/**
 * Clears all items from browser storage or items with a specific prefix
 *
 * @param prefix - Optional prefix to limit which items are cleared
 * @param options - Storage options
 */
export function clear(prefix?: string, options: StorageOptions = {}): void {
  const { persistence = true } = options;
  const storage = persistence ? localStorage : sessionStorage;

  if (!prefix) {
    // Clear entire storage
    storage.clear();
    return;
  }

  // Clear only items with the specified prefix
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }

  // Remove the collected keys
  keysToRemove.forEach(key => storage.removeItem(key));
}

/**
 * Encrypts data using CryptoJS AES encryption
 *
 * @param data - The data to encrypt
 * @returns Encrypted data as string
 */
export function encryptData(data: any): string {
  // Convert data to string if it's not already
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  
  // Mark data as encrypted
  if (typeof data === 'object' && data !== null) {
    data.encrypted = true;
  }
  
  // Encrypt with AES
  return CryptoJS.AES.encrypt(dataString, ENCRYPTION_KEY).toString();
}

/**
 * Decrypts data that was encrypted with encryptData
 *
 * @param encryptedData - The encrypted data string
 * @returns Decrypted data
 */
export function decryptData(encryptedData: string): any {
  // Decrypt the data
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
  
  // Parse the JSON data
  return JSON.parse(decryptedString);
}

/**
 * Checks if stored data has expired based on its expiration timestamp
 *
 * @param data - The storage data to check
 * @returns True if data has expired, false otherwise
 */
export function isExpired(data: StorageData<any>): boolean {
  // If no expiration is set, data never expires
  if (!data.expiration) {
    return false;
  }
  
  // Compare current time with expiration time
  return Date.now() > data.expiration;
}

// Auth-specific storage keys
const AUTH_TOKEN_KEY = 'auth:token';
const USER_DATA_KEY = 'auth:userData';
const AUTH_PREFIX = 'auth:';

/**
 * Stores authentication token with appropriate security measures
 *
 * @param token - The authentication token to store
 * @param rememberMe - Whether to persist the token in localStorage
 */
export function setAuthToken(token: string, rememberMe: boolean = false): void {
  const persistence = rememberMe;
  
  // Parse JWT to get expiration if possible
  let expirationTime = DEFAULT_EXPIRATION_TIME;
  try {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length === 3) {
      // The middle part contains the payload
      const payload = JSON.parse(atob(parts[1]));
      // Check if the token has an expiration claim
      if (payload.exp) {
        // Convert from seconds to milliseconds and calculate time until expiration
        expirationTime = (payload.exp * 1000) - Date.now();
        // Set a minimum expiration time to prevent immediate expiration
        expirationTime = Math.max(expirationTime, 60 * 1000); // Minimum 1 minute
      }
    }
  } catch (error) {
    console.warn('Could not parse JWT token for expiration', error);
  }

  // Store token with encryption
  setItem(AUTH_TOKEN_KEY, token, {
    sensitive: true,
    persistence,
    expirationTime
  });
}

/**
 * Retrieves the stored authentication token
 *
 * @returns The authentication token or null if not present or expired
 */
export function getAuthToken(): string | null {
  // Try localStorage first
  let token = getItem<string>(AUTH_TOKEN_KEY, { 
    sensitive: true, 
    persistence: true 
  });
  
  // If not found, try sessionStorage
  if (!token) {
    token = getItem<string>(AUTH_TOKEN_KEY, { 
      sensitive: true, 
      persistence: false 
    });
  }
  
  return token;
}

/**
 * Removes the stored authentication token from all storages
 */
export function removeAuthToken(): void {
  // Remove from both storage types to ensure it's completely gone
  removeItem(AUTH_TOKEN_KEY, { persistence: true });
  removeItem(AUTH_TOKEN_KEY, { persistence: false });
}

/**
 * Stores user data with appropriate security measures
 *
 * @param userData - The user data to store
 * @param rememberMe - Whether to persist the user data in localStorage
 */
export function setUserData(userData: User, rememberMe: boolean = false): void {
  const persistence = rememberMe;
  
  // Use the same expiration time as tokens for consistency
  const expirationTime = DEFAULT_EXPIRATION_TIME;

  // Store user data with encryption
  setItem(USER_DATA_KEY, userData, {
    sensitive: true,
    persistence,
    expirationTime
  });
}

/**
 * Retrieves the stored user data
 *
 * @returns The user data or null if not present or expired
 */
export function getUserData(): User | null {
  // Try localStorage first
  let userData = getItem<User>(USER_DATA_KEY, { 
    sensitive: true, 
    persistence: true 
  });
  
  // If not found, try sessionStorage
  if (!userData) {
    userData = getItem<User>(USER_DATA_KEY, { 
      sensitive: true, 
      persistence: false 
    });
  }
  
  return userData;
}

/**
 * Removes the stored user data from all storages
 */
export function removeUserData(): void {
  // Remove from both storage types to ensure it's completely gone
  removeItem(USER_DATA_KEY, { persistence: true });
  removeItem(USER_DATA_KEY, { persistence: false });
}

/**
 * Clears all authentication-related data from storage
 */
export function clearAuthData(): void {
  // Remove specific auth items
  removeAuthToken();
  removeUserData();
  
  // Clear any other auth-related data by prefix
  clear(AUTH_PREFIX, { persistence: true });
  clear(AUTH_PREFIX, { persistence: false });
}