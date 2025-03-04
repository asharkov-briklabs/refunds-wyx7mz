/**
 * Barrel file that exports all middleware components used across the Refunds Service backend.
 * Centralizes middleware imports to simplify usage in the application.
 */

import { errorHandler } from './error-handler'; // express@^4.18.2 Middleware for standardized error handling
import { requestLogger } from './request-logger'; // express@^4.18.2 Middleware for logging HTTP request details
import { authenticate } from './authentication'; // express-jwt@7.x Middleware for JWT authentication
import { 
  requirePermission, 
  requireRole, 
  requireBarracudaAdmin, 
  requireBankAdmin, 
  requireOrganizationAdmin, 
  requireMerchantAdmin 
} from './authorization'; // Middleware for role-based access control
import { 
  validateRequest, 
  validateBody, 
  validateQuery, 
  validateParams,
  ValidationSchemas
} from './validation'; // Middleware for request validation
import { 
    correlationIdMiddleware, 
    attachCorrelationIdToClient,
    CORRELATION_ID_HEADER
} from './correlation-id'; // uuid@9.x Middleware for request tracing with correlation IDs

/**
 * Exports all middleware components for easy and organized access.
 */
export {
  errorHandler,
  requestLogger,
  authenticate,
  requirePermission,
  requireRole,
  requireBarracudaAdmin,
  requireBankAdmin,
  requireOrganizationAdmin,
  requireMerchantAdmin,
  validateRequest,
  validateBody,
  validateQuery,
  validateParams,
  ValidationSchemas,
  correlationIdMiddleware,
  attachCorrelationIdToClient,
  CORRELATION_ID_HEADER
};