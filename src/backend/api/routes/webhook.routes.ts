import express from 'express';
import { logger } from '../../common/utils/logger';
import { WebhookRouter, webhookRawBodyParser } from '../../services/gateway-integration/webhook/webhook-router';
import RefundRepository from '../../database/repositories/refund.repo';

/**
 * Configures and exports Express router for handling webhook requests from various payment gateways
 * such as Stripe and Adyen. This router processes asynchronous notifications about refund status changes
 * and updates the corresponding refund records in the database.
 * 
 * The router handles signature verification, payload parsing, and directs webhook events
 * to the appropriate handlers based on the payment gateway that sent them.
 *
 * @returns Configured Express router with webhook routes
 */
function configureWebhookRoutes(): express.Router {
  logger.info('Configuring webhook routes for payment gateways');
  
  // Create refund repository for database operations
  const refundRepository = new RefundRepository();
  
  // Create webhook router with repository dependency
  const webhookRouter = new WebhookRouter(refundRepository);
  
  // Get the fully configured router with all gateway webhook endpoints
  const router = webhookRouter.getRouter();
  
  logger.info('Webhook routes configured successfully');
  
  return router;
}

export default configureWebhookRoutes;