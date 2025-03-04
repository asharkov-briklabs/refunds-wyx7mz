/**
 * Index file that exports all API middleware components for easy access
 * and consistent imports throughout the Refunds Service API.
 *
 * This module provides a centralized access point for middleware,
 * promoting code reuse and simplifying dependency management.
 */

// Import authentication middleware functions
import {
  authenticateRequest,
  requireBarracudaAdmin,
  requireBankAdmin,
  requireOrganizationAdmin,
  requireMerchantAdmin,
  checkRefundPermission,
  checkBankAccountPermission,
  checkParameterPermission,
} from './auth.middleware';

// Import validation middleware functions
import {
  validateSchema,
  validateRefundRequest,
  validatePaginationParams,
  validateDateRangeParams,
  validateIdParam,
} from './validation.middleware';

// Import error handling middleware
import { apiErrorHandler } from './error.middleware';

/**
 * Authentication middleware for API endpoints.
 * Validates JWT tokens and attaches user information to the request object.
 */
export { authenticateRequest };

/**
 * Role-based middleware for Barracuda Admin access.
 * Ensures that the authenticated user has the Barracuda Admin role.
 */
export { requireBarracudaAdmin };

/**
 * Role-based middleware for Bank Admin access.
 * Ensures that the authenticated user has the Bank Admin role.
 */
export { requireBankAdmin };

/**
 * Role-based middleware for Organization Admin access.
 * Ensures that the authenticated user has the Organization Admin role.
 */
export { requireOrganizationAdmin };

/**
 * Role-based middleware for Merchant Admin access.
 * Ensures that the authenticated user has the Merchant Admin role.
 */
export { requireMerchantAdmin };

/**
 * Permission-based middleware for refund operations.
 * Checks if the user has the required permission for a specific refund action.
 */
export { checkRefundPermission };

/**
 * Permission-based middleware for bank account operations.
 * Checks if the user has the required permission for a specific bank account action.
 */
export { checkBankAccountPermission };

/**
 * Permission-based middleware for parameter operations.
 * Checks if the user has the required permission for a specific parameter action.
 */
export { checkParameterPermission };

/**
 * Generic validation middleware for schema-based validation.
 * Validates request data against a provided schema.
 */
export { validateSchema };

/**
 * Specialized middleware for validating refund requests.
 * Validates the refund request payload against a predefined schema.
 */
export { validateRefundRequest };

/**
 * Specialized middleware for validating pagination parameters.
 * Validates the pagination parameters (page, pageSize) in the request query.
 */
export { validatePaginationParams };

/**
 * Specialized middleware for validating date range parameters.
 * Validates the date range parameters (startDate, endDate) in the request query.
 */
export { validateDateRangeParams };

/**
 * Specialized middleware for validating ID parameters in request URLs.
 * Validates that a specific parameter in the request URL is a valid ID.
 */
export { validateIdParam };

/**
 * API-specific error handling middleware.
 * Handles errors that occur during API processing and formats standardized error responses.
 */
export { apiErrorHandler };