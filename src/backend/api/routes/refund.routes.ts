import express, { Router } from 'express'; // express@^4.18.2
import { RefundController, createRefundController } from '../../services/refund-api/controllers/refund.controller';
import { authenticateRequest, requireMerchantAdmin, checkRefundPermission, validateRefundRequest, validatePaginationParams, validateDateRangeParams, validateIdParam } from '../middleware';
import { logger } from '../../common/utils/logger';

/**
 * Configures the refund routes and maps them to controller methods.
 *
 * @returns Configured Express Router instance with refund routes
 */
const configureRefundRoutes = (): Router => {
  // Create a new Express Router instance
  const router = express.Router();

  // Initialize RefundController instance
  const refundController: RefundController = createRefundController();

  // Apply authentication middleware to all routes
  router.use(authenticateRequest);

  // Register POST /refunds route for creating refunds
  router.post(
    '/refunds',
    requireMerchantAdmin,
    validateRefundRequest(),
    refundController.create
  );

  // Register GET /refunds route for listing refunds
  router.get(
    '/refunds',
    requireMerchantAdmin,
    validatePaginationParams(),
    validateDateRangeParams(),
    refundController.list
  );

  // Register GET /refunds/:refundId route for retrieving a specific refund
  router.get(
    '/refunds/:refundId',
    requireMerchantAdmin,
    validateIdParam('refundId'),
    checkRefundPermission('read'),
    refundController.getById
  );

  // Register PUT /refunds/:refundId route for updating refund
  router.put(
    '/refunds/:refundId',
    requireMerchantAdmin,
    validateIdParam('refundId'),
    checkRefundPermission('update'),
    validateRefundRequest(),
    refundController.update
  );

  // Register PUT /refunds/:refundId/cancel route for canceling refund
  router.put(
    '/refunds/:refundId/cancel',
    requireMerchantAdmin,
    validateIdParam('refundId'),
    checkRefundPermission('cancel'),
    refundController.cancel
  );

  // Register GET /refunds/methods route for retrieving supported refund methods
  router.get(
    '/refunds/methods',
    requireMerchantAdmin,
    refundController.methods
  );

  // Register GET /refunds/statistics route for retrieving refund statistics
  router.get(
    '/refunds/statistics',
    requireMerchantAdmin,
    validateDateRangeParams(),
    refundController.getStatistics
  );

  // Log successful route configuration
  logger.info('Refund routes configured successfully');

  // Return the configured router
  return router;
};

// Export the configureRefundRoutes function as the default export
export default configureRefundRoutes;