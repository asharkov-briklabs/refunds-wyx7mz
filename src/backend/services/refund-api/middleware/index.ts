/**
 * Barrel file that exports all middleware components specific to the Refund API.
 * Includes rate limiting and caching middleware along with re-exports of common middleware for use in Refund API routes.
 * 
 * @module middleware/index
 */

// Rate Limiter Middleware
import { 
  rateLimiter, 
  createRateLimiter 
} from './rate-limiter'; // Version specified near import

// Cache Middleware
import { 
  cacheMiddleware, 
  createCacheMiddleware, 
  CACHEABLE_STATUS_CODES 
} from './cache'; // Version specified near import

// Common Middleware (Re-exports)
import {
  errorHandler, // Version specified near import
  requestLogger, // Version specified near import
  authenticate, // Version specified near import
  requirePermission, // Version specified near import
  requireRole, // Version specified near import
  requireBarracudaAdmin, // Version specified near import
  requireBankAdmin, // Version specified near import
  requireOrganizationAdmin, // Version specified near import
  requireMerchantAdmin, // Version specified near import
  validateRequest, // Version specified near import
  validateBody, // Version specified near import
  validateQuery, // Version specified near import
  validateParams, // Version specified near import
  ValidationSchemas, // Version specified near import
  correlationIdMiddleware, // Version specified near import
  CORRELATION_ID_HEADER // Version specified near import
} from '../../../common/middleware'; // Version specified near import

// Export all middleware components
export {
  rateLimiter,
  createRateLimiter,
  cacheMiddleware,
  createCacheMiddleware,
  CACHEABLE_STATUS_CODES,
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
  CORRELATION_ID_HEADER
};