/**
 * Central TypeScript type definitions for the Refunds Service web application.
 * 
 * This file consolidates and re-exports all type definitions from modular type files,
 * providing a single import source for type definitions used throughout the application.
 * Types are organized into logical categories to represent different aspects of the
 * refund processing system, such as refunds, bank accounts, parameters, users, etc.
 * 
 * @example
 * // Import specific types
 * import { RefundStatus, BankAccount, UserRole } from '../types';
 * 
 * // Or import all types from a specific category 
 * import * as RefundTypes from '../types';
 */

// Re-export all API-related type definitions
export * from './api.types';

// Re-export all bank account type definitions
export * from './bank-account.types';

// Re-export all common type definitions shared across the application
export * from './common.types';

// Re-export all notification type definitions
export * from './notification.types';

// Re-export all parameter type definitions
export * from './parameter.types';

// Re-export all refund type definitions
export * from './refund.types';

// Re-export all reporting type definitions
export * from './report.types';

// Re-export all user and authentication type definitions
export * from './user.types';