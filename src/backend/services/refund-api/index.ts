import express, { Request, Response, NextFunction } from 'express'; // Import express framework // express@^4.18.2
import { configureRefundRoutes, configureBankAccountRoutes, configureParameterRoutes, configureReportingRoutes } from './routes'; // Import route configuration functions
import { errorHandler, correlationIdMiddleware } from '../../common/middleware'; // Import common middleware
import { rateLimiter } from './middleware'; // Import rate limiting middleware
import { logger } from '../../common/utils/logger'; // Import logger utility

/**
 * Configures and returns an Express router with all API routes for the Refunds Service
 * @returns Express Router configured with all API routes and middleware
 */
function configureApiRoutes(): express.Router {
  // LD1: Create a new Express router instance
  const router = express.Router();

  // LD1: Apply correlation ID middleware to all routes
  router.use(correlationIdMiddleware);

  // LD1: Apply global rate limiting middleware
  router.use(rateLimiter);

  // LD1: Get refund routes from configureRefundRoutes()
  const refundRoutes = configureRefundRoutes();

  // LD1: Get bank account routes from configureBankAccountRoutes()
  const bankAccountRoutes = configureBankAccountRoutes();

  // LD1: Get parameter routes from configureParameterRoutes()
  const parameterRoutes = configureParameterRoutes();

  // LD1: Get reporting routes from configureReportingRoutes()
  const reportingRoutes = configureReportingRoutes();

  // LD1: Mount refund routes under /refunds path
  router.use('/refunds', refundRoutes);

  // LD1: Mount bank account routes under /bank-accounts path
  router.use('/bank-accounts', bankAccountRoutes);

  // LD1: Mount parameter routes under /parameters path
  router.use('/parameters', parameterRoutes);

  // LD1: Mount reporting routes under /reporting path
  router.use('/reporting', reportingRoutes);

  // LD1: Apply error handling middleware
  router.use(errorHandler);

  // LD1: Log successful API routes configuration
  logger.info('API routes configured successfully');

  // LD1: Return the configured router
  return router;
}

// Export the configureApiRoutes function as the default export
export default configureApiRoutes;