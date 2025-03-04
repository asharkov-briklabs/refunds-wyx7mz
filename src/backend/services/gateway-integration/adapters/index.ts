import { GatewayType } from '../../../../common/enums/gateway-type.enum';
import {
  GatewayRefundRequest,
  GatewayRefundResponse,
  GatewayCredentials
} from '../../../../common/interfaces/payment.interface';
import { logger } from '../../../../common/utils/logger';
import { StripeAdapter } from './stripe.adapter';
import { AdyenAdapter } from './adyen.adapter';
import { FiservAdapter } from './fiserv.adapter';

/**
 * Interface defining the contract that all gateway adapters must implement.
 * This ensures consistent behavior across different payment gateways.
 */
export interface GatewayAdapter {
  /**
   * Processes a refund request through the payment gateway
   * 
   * @param request - Standardized refund request
   * @param credentials - Gateway API credentials
   * @returns Promise resolving to standardized refund response
   */
  processRefund(
    request: GatewayRefundRequest,
    credentials: GatewayCredentials
  ): Promise<GatewayRefundResponse>;

  /**
   * Checks the status of a previously initiated refund
   * 
   * @param refundId - ID of the refund to check
   * @param credentials - Gateway API credentials
   * @returns Promise resolving to current status of the refund
   */
  checkRefundStatus(
    refundId: string,
    credentials: GatewayCredentials
  ): Promise<GatewayRefundResponse>;

  /**
   * Validates the signature of a webhook notification from the payment gateway
   * 
   * @param payload - Raw webhook payload
   * @param signature - Signature provided in the webhook headers
   * @param webhookSecret - Secret used to validate the signature
   * @returns True if signature is valid, false otherwise
   */
  validateWebhookSignature(
    payload: string,
    signature: string,
    webhookSecret: string
  ): boolean;

  /**
   * Parses a webhook notification from the payment gateway into a standardized format
   * 
   * @param payload - Raw webhook payload
   * @returns Parsed webhook event in standardized format
   */
  parseWebhookEvent(
    payload: string
  ): any;
}

/**
 * Error thrown when an unsupported gateway type is requested
 */
export class UnsupportedGatewayError extends Error {
  /**
   * Creates a new UnsupportedGatewayError
   * 
   * @param message - Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedGatewayError';
  }
}

/**
 * Factory function that returns the appropriate gateway adapter
 * based on the provided gateway type.
 * 
 * @param gatewayType - Type of payment gateway to use
 * @returns Instance of the appropriate gateway adapter
 * @throws UnsupportedGatewayError if the gateway type is not supported
 */
export function getGatewayAdapter(gatewayType: GatewayType): GatewayAdapter {
  switch (gatewayType) {
    case GatewayType.STRIPE:
      return new StripeAdapter();
    case GatewayType.ADYEN:
      return new AdyenAdapter();
    case GatewayType.FISERV:
      return new FiservAdapter();
    default:
      logger.error(`Unsupported gateway type: ${gatewayType}`);
      throw new UnsupportedGatewayError(`Gateway type '${gatewayType}' is not supported`);
  }
}

// Export the adapter classes
export { StripeAdapter, AdyenAdapter, FiservAdapter };