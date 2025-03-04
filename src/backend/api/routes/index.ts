import express, { Router } from 'express'; // express@^4.18.2
import refundRoutes from './refund.routes';
import bankAccountRoutes from './bank-account.routes';
import parameterRoutes from './parameter.routes';
import webhookRoutes from './webhook.routes';
import reportingRoutes from './reporting.routes';

/**
 * Configures and combines all route modules into a single router
 * @returns Router Express router instance with all routes configured
 */
function configureRoutes(): Router {
  // Create a new Express router instance
  const router = express.Router();

  // Register refund routes under /refunds
  router.use('/refunds', refundRoutes);

  // Register bank account routes under /bank-accounts
  router.use('/bank-accounts', bankAccountRoutes);

  // Register parameter routes under /parameters
  router.use('/parameters', parameterRoutes);

  // Register webhook routes under /webhooks
  router.use('/webhooks', webhookRoutes);

  // Register reporting routes under /reports
  router.use('/reports', reportingRoutes);

  // Return the configured router
  return router;
}

// Export the configured router with all routes for the application to use
export default configureRoutes;