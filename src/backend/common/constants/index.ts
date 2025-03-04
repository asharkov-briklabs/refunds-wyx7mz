/**
 * Refunds Service Constants
 * 
 * This file serves as a central export point for all constants used throughout the
 * Refunds Service application. By consolidating exports in this manner, we provide
 * a single import location for error codes, status codes, and event types.
 * 
 * This supports:
 * - Consistent error handling across the application
 * - Uniform event naming across the event-driven architecture
 * - Better maintainability through centralized constant management
 * 
 * Usage example:
 * import { ErrorCode, REFUND_EVENTS, StatusCode } from '@/common/constants';
 */

// Re-export all error-related constants
export * from './error-codes';

// Re-export all HTTP status code constants
export * from './status-codes';

// Re-export all event type constants
export * from './event-types';