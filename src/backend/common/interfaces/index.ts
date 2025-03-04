/**
 * Common Interfaces Barrel File
 * 
 * This file re-exports all interfaces and types from the common interfaces directory,
 * allowing consumers to import from a single location rather than multiple files.
 * 
 * @version 1.0.0
 */

// Payment-related interfaces and types
export * from './payment.interface';

// Approval workflow interfaces and types
export * from './approval.interface';

// Merchant-related interfaces and types
export * from './merchant.interface';

// Bank account interfaces and types
export * from './bank-account.interface';

// Notification-related interfaces and types
export * from './notification.interface';