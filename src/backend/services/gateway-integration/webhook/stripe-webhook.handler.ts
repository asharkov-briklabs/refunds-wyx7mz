import { Request, Response } from 'express'; // express@^4.18.2
import Stripe from 'stripe'; // stripe@^12.0.0
import { logger } from '../../../common/utils/logger';
import { metrics } from '../../../common/utils/metrics';
import { GatewayError } from '../../../common/errors/gateway-error';
import config from '../../../config';
import { eventEmitter } from '../../../common/utils/event-emitter';
import { GatewayType } from '../../../common/enums/gateway-type.enum';
import { stripeAdapter } from '../adapters/stripe.adapter';
import GatewayCredentialManager from '../credential-manager';

// Initialize the GatewayCredentialManager
const credentialManager = new GatewayCredentialManager();

/**
 * Maps Stripe event types to internal event types used by the refund service
 * @param stripeEventType 
 * @returns Internal event type or null if no mapping exists
 */
function mapStripeEventToInternalEvent(stripeEventType: string): string | null {
  // Define mapping of Stripe event types to internal event types
  const eventMap: { [key: string]: string } = {
    'charge.refunded': 'refund.succeeded',
    'refund.updated': 'refund.updated',
    'charge.dispute.created': 'dispute.created',
    'charge.dispute.updated': 'dispute.updated',
    'charge.dispute.closed': 'dispute.closed'
  };

  // Return the mapped internal event type if it exists
  return eventMap[stripeEventType] || null; // Return null if no mapping exists for the Stripe event type
}

/**
 * Extracts relevant refund data from a Stripe event payload
 * @param event 
 * @returns Extracted refund data or null if not a refund event
 */
function extractRefundDataFromEvent(event: Stripe.Event): { [key: string]: any } | null {
  // Check if event is refund-related using event.type
  if (event.type === 'charge.refunded' || event.type === 'refund.updated') {
    // Extract the refund object from event.data.object
    const refund = event.data.object as Stripe.Refund;

    // Extract the payment intent ID to link to original transaction
    const payment_intent = (refund.payment_intent as string) || null;

    // Extract refund status, amount, and other relevant data
    const refundData = {
      id: refund.id,
      payment_intent: payment_intent,
      status: refund.status,
      amount: refund.amount,
      currency: refund.currency,
      created: refund.created,
      reason: refund.reason,
      metadata: refund.metadata
    };

    // Return structured refund data object or null if not extractable
    return refundData;
  }

  return null; // Return null if not a refund event
}

/**
 * Process a Stripe refund event and emit corresponding internal events
 * @param parsedEvent 
 * @param eventType 
 * @returns Success status of the event handling
 */
async function handleRefundEvent(parsedEvent: any, eventType: string): Promise<boolean> {
  // Extract gateway refund ID from the parsed event
  const gatewayRefundId = parsedEvent.id;

  // Log the refund event details (sanitized)
  logger.info('Processing Stripe refund event', {
    gatewayRefundId: gatewayRefundId,
    eventType: eventType,
  });

  // Determine appropriate internal event type based on Stripe event
  const internalEventType = mapStripeEventToInternalEvent(eventType);

  // Prepare event payload with necessary refund details
  const eventPayload = {
    gateway: GatewayType.STRIPE,
    gatewayRefundId: gatewayRefundId,
    eventType: internalEventType,
    parsedEvent: parsedEvent,
  };

  // Emit internal event using eventEmitter
  eventEmitter.emit(internalEventType, eventPayload);

  // Increment metrics counter for successful processing
  metrics.incrementCounter('stripe_webhook.refund_event.processed', 1, { eventType: eventType });

  // Return true for successful processing
  return true;
}

/**
 * Handler class for processing Stripe webhook notifications and converting them to internal events
 */
export class StripeWebhookHandler {
  credentialManager: GatewayCredentialManager;

  /**
   * Initializes the Stripe webhook handler with dependencies
   */
  constructor() {
    // Initialize credential manager for retrieving webhook secrets
    this.credentialManager = new GatewayCredentialManager();

    // Log initialization of the handler
    logger.info('StripeWebhookHandler initialized');
  }

  /**
   * Process an incoming Stripe webhook request
   * @param req 
   * @param res 
   */
  async handleWebhook(req: express.Request, res: express.Response): Promise<void> {
    try {
      // Log receipt of Stripe webhook
      logger.info('Received Stripe webhook', {
        headers: req.headers,
        body: req.body
      });

      // Extract Stripe signature from request headers
      const stripeSignature = req.headers['stripe-signature'] as string;

      // Get webhook secret from credential manager
      const webhookSecret = await this.credentialManager.getWebhookSecret(GatewayType.STRIPE);

      // Validate webhook signature using stripeAdapter
      const isValid = stripeAdapter.validateWebhookSignature(req.rawBody, stripeSignature, webhookSecret);

      // If signature is invalid, return 401 Unauthorized
      if (!isValid) {
        logger.warn('Invalid Stripe webhook signature');
        res.status(401).send('Unauthorized');
        return;
      }

      // Parse webhook event using stripeAdapter
      const parsedEvent = stripeAdapter.parseWebhookEvent(req.body);

      // Determine event type from the parsed event
      const eventType = parsedEvent.type;

      // Process event based on its type (refund events handled by handleRefundEvent)
      const success = await this.processEvent(parsedEvent);

      // Return 200 OK response with success message
      res.status(200).json({ received: true, success: success });
    } catch (error) {
      // Log errors and return appropriate error responses
      logger.error('Error processing Stripe webhook', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      if (error instanceof GatewayError) {
        res.status(502).json({ error: error.toJSON() });
      } else {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  }

  /**
   * Validates the signature of an incoming Stripe webhook
   * @param payload 
   * @param signature 
   * @returns Whether the signature is valid
   */
  async validateSignature(payload: string, signature: string): Promise<boolean> {
    try {
      // Get Stripe webhook secret from credential manager
      const webhookSecret = await this.credentialManager.getWebhookSecret(GatewayType.STRIPE);

      // Use stripeAdapter to validate signature with payload
      const isValid = stripeAdapter.validateWebhookSignature(payload, signature, webhookSecret);

      // Return boolean indicating if signature is valid
      return isValid;
    } catch (error) {
      // Log any errors during validation
      logger.error('Error validating Stripe webhook signature', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      // Return false if validation throws an error
      return false;
    }
  }

  /**
   * Process a validated Stripe event based on its type
   * @param parsedEvent 
   * @returns Success status of the event processing
   */
  async processEvent(parsedEvent: any): Promise<boolean> {
    try {
      // Extract event type from parsed event
      const eventType = parsedEvent.type;

      // Log the event type being processed
      logger.info('Processing Stripe event', { eventType: eventType });

      // Check if event is refund-related
      if (eventType === 'charge.refunded' || eventType === 'refund.updated') {
        // Delegate to handleRefundEvent
        return handleRefundEvent(parsedEvent, eventType);
      } else {
        // For other event types, log and acknowledge receipt
        logger.info('Received non-refund Stripe event', { eventType: eventType });
      }

      // Increment metrics counter for event processing
      metrics.incrementCounter('stripe_webhook.event.received', 1, { eventType: eventType });

      // Return true for successful processing
      return true;
    } catch (error) {
      logger.error('Error processing Stripe event', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }
}

// Export the handler class
export { StripeWebhookHandler };

// Export utility function to map Stripe events to internal event types
export { mapStripeEventToInternalEvent };