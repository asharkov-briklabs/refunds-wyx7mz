/**
 * Centralized exports for all error handling utilities in the Refunds Service.
 *
 * This file provides a single entry point for importing error classes, interfaces, and enums
 * throughout the application, ensuring consistent error handling patterns. The exports
 * include base error classes, specialized error types for validation, business rules,
 * and gateway interactions, along with their supporting interfaces.
 *
 * By centralizing these exports, we maintain a clean import structure and make it easier
 * to manage error types across the codebase.
 */

// Base API error class for standardized error handling
export { ApiError } from './api-error';

// Validation error handling for input validation failures
export { ValidationError } from './validation-error';
export { ValidationErrorDetail, FieldError } from './validation-error';

// Business error handling for business rule violations
export { BusinessError } from './business-error';
export { BusinessErrorDetail } from './business-error';

// Gateway error handling for payment gateway integration issues
export { GatewayError } from './gateway-error';
export { GatewayErrorDetail } from './gateway-error';
export { RetryableGatewayErrorCodes } from './gateway-error';