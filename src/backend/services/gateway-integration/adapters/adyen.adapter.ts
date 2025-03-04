import { Client, CheckoutAPI, hmacValidator } from '@adyen/api-library'; // @adyen/api-library@^11.0.0
import { logger } from '../../../../common/utils/logger';
import { GatewayError } from '../../../../common/errors/gateway-error';
import { GatewayType } from '../../../../common/enums/gateway-type.enum';
import { 
  GatewayRefundRequest, 
  GatewayRefundResponse, 
  GatewayCredentials 
} from '../../../../common/interfaces/payment.interface';

/**
 * Adapter for integrating with the Adyen payment gateway.
 * Implements methods for processing refunds, checking refund status,
 * validating webhook signatures, and parsing webhook events.
 * 
 * This adapter translates between the unified Refunds Service interfaces
 * and Adyen-specific API requirements.
 */
export class AdyenAdapter {
  private client: Client | null = null;
  private checkout: CheckoutAPI | null = null;

  /**
   * Initializes the Adyen adapter with default configurations
   */
  constructor() {
    logger.info('Initializing Adyen adapter');
  }

  /**
   * Processes a refund request through the Adyen payment gateway
   * 
   * @param request - Standardized refund request
   * @param credentials - Adyen API credentials
   * @returns Promise resolving to standardized refund response
   */
  async processRefund(
    request: GatewayRefundRequest,
    credentials: GatewayCredentials
  ): Promise<GatewayRefundResponse> {
    logger.info('Processing refund request with Adyen', {
      refundId: request.refundId,
      transactionId: request.transactionId,
      amount: request.amount,
      currency: request.currency
    });

    try {
      // Initialize Adyen client with credentials
      this.initializeClient(credentials);

      if (!this.checkout) {
        throw new Error('Adyen Checkout API not initialized');
      }

      // Prepare the refund request for Adyen
      const refundRequest = {
        merchantAccount: credentials.merchantAccountId,
        amount: {
          currency: request.currency,
          value: request.amount
        },
        reference: request.refundId,
        originalReference: request.gatewayTransactionId,
        // Include any additional metadata
        ...request.metadata
      };

      // Call Adyen's refund endpoint
      logger.debug('Sending refund request to Adyen', { refundRequest });
      const response = await this.checkout.refunds(refundRequest);
      logger.debug('Received response from Adyen', { response });

      // Process the response
      const success = response.status === 'received' || response.status === '[refund-received]';
      
      return {
        success,
        gatewayRefundId: response.pspReference || null,
        status: this.mapAdyenStatusToStandardStatus(response.status),
        processedAmount: request.amount,
        processingDate: new Date(),
        estimatedSettlementDate: this.calculateEstimatedSettlementDate(),
        errorCode: success ? null : response.status,
        errorMessage: success ? null : response.message || 'Refund request was not successful',
        gatewayResponseCode: response.status,
        retryable: false, // Adyen refund requests are not typically retryable if they fail
        rawResponse: response
      };
    } catch (error) {
      logger.error('Error processing refund with Adyen', {
        error,
        refundId: request.refundId
      });
      
      throw this.mapAdyenErrorToGatewayError(error as Error);
    }
  }

  /**
   * Checks the status of a previously submitted refund with Adyen
   * 
   * @param refundId - ID of the refund to check
   * @param credentials - Adyen API credentials
   * @returns Promise resolving to standardized refund response
   */
  async checkRefundStatus(
    refundId: string,
    credentials: GatewayCredentials
  ): Promise<GatewayRefundResponse> {
    logger.info('Checking refund status with Adyen', { refundId });

    try {
      // Initialize Adyen client with credentials
      this.initializeClient(credentials);

      if (!this.checkout) {
        throw new Error('Adyen Checkout API not initialized');
      }

      // Note: Adyen doesn't provide a direct refund status check API.
      // We need to use the PaymentDetailsRequest or check the status from a notification.
      // This is a simplified implementation.
      const response = await this.checkout.payments.getPaymentDetails({
        merchantAccount: credentials.merchantAccountId,
        reference: refundId
      });

      logger.debug('Received status response from Adyen', { response });

      // Map the response to our standard format
      const status = this.determineRefundStatusFromResponse(response);

      return {
        success: status === 'COMPLETED',
        gatewayRefundId: refundId,
        status,
        processedAmount: null, // We don't get this from a status check
        processingDate: null,  // We don't get this from a status check
        estimatedSettlementDate: null,
        errorCode: status === 'FAILED' ? 'REFUND_FAILED' : null,
        errorMessage: status === 'FAILED' ? 'Refund was not successful' : null,
        gatewayResponseCode: response.resultCode,
        retryable: false,
        rawResponse: response
      };
    } catch (error) {
      logger.error('Error checking refund status with Adyen', {
        error,
        refundId
      });
      
      throw this.mapAdyenErrorToGatewayError(error as Error);
    }
  }

  /**
   * Validates the signature of an Adyen webhook notification
   * 
   * @param payload - Raw webhook payload
   * @param signature - HMAC signature provided in the request headers
   * @param hmacKey - HMAC key configured in Adyen
   * @returns Boolean indicating if the signature is valid
   */
  validateWebhookSignature(
    payload: string,
    signature: string,
    hmacKey: string
  ): boolean {
    try {
      logger.debug('Validating Adyen webhook signature');
      
      // Use Adyen's hmacValidator to verify the signature
      const isValid = hmacValidator.validateHMAC(
        payload,
        signature,
        hmacKey
      );
      
      if (!isValid) {
        logger.warn('Invalid Adyen webhook signature detected', {
          signatureProvided: signature
        });
      }
      
      return isValid;
    } catch (error) {
      logger.error('Error validating Adyen webhook signature', { error });
      return false;
    }
  }

  /**
   * Parses an Adyen webhook notification into a standardized format
   * 
   * @param payload - Raw webhook payload
   * @returns Parsed webhook event with standardized fields
   */
  parseWebhookEvent(payload: string): Record<string, any> {
    try {
      logger.debug('Parsing Adyen webhook event');
      
      // Parse the JSON payload
      const webhookData = JSON.parse(payload);
      
      // Extract the notification items
      // Adyen webhook can contain multiple notification items
      const notificationItems = webhookData.notificationItems || [];
      
      if (notificationItems.length === 0) {
        logger.warn('Empty notification items in Adyen webhook');
        return { events: [] };
      }
      
      // Process each notification item
      const events = notificationItems.map((item: any) => {
        const notificationItem = item.NotificationRequestItem;
        
        if (!notificationItem) {
          logger.warn('Invalid notification item format in Adyen webhook');
          return null;
        }
        
        // Extract common fields
        const eventType = notificationItem.eventCode;
        const pspReference = notificationItem.pspReference;
        const merchantReference = notificationItem.merchantReference;
        const amount = notificationItem.amount;
        const currency = amount ? amount.currency : null;
        const value = amount ? amount.value : null;
        
        // Standardize the event based on its type
        switch (eventType) {
          case 'REFUND':
            return {
              type: 'REFUND_COMPLETED',
              refundId: merchantReference,
              gatewayRefundId: pspReference,
              amount: value,
              currency,
              status: 'COMPLETED',
              processingDate: new Date(),
              rawData: notificationItem
            };
            
          case 'REFUND_FAILED':
            return {
              type: 'REFUND_FAILED',
              refundId: merchantReference,
              gatewayRefundId: pspReference,
              amount: value,
              currency,
              status: 'FAILED',
              reason: notificationItem.reason || 'Unknown reason',
              processingDate: new Date(),
              rawData: notificationItem
            };
            
          case 'CAPTURE':
            return {
              type: 'PAYMENT_CAPTURED',
              transactionId: merchantReference,
              gatewayTransactionId: pspReference,
              amount: value,
              currency,
              status: 'COMPLETED',
              processingDate: new Date(),
              rawData: notificationItem
            };
            
          case 'CAPTURE_FAILED':
            return {
              type: 'PAYMENT_CAPTURE_FAILED',
              transactionId: merchantReference,
              gatewayTransactionId: pspReference,
              amount: value,
              currency,
              status: 'FAILED',
              reason: notificationItem.reason || 'Unknown reason',
              processingDate: new Date(),
              rawData: notificationItem
            };
            
          default:
            logger.debug('Unhandled Adyen event type', { eventType });
            return {
              type: 'UNKNOWN',
              eventType,
              gatewayReference: pspReference,
              merchantReference,
              amount: value,
              currency,
              rawData: notificationItem
            };
        }
      }).filter(event => event !== null);
      
      return { events };
    } catch (error) {
      logger.error('Error parsing Adyen webhook event', { error, payload });
      throw new Error('Failed to parse Adyen webhook event');
    }
  }

  /**
   * Maps Adyen-specific error codes to standardized GatewayError types
   * 
   * @param error - Error from Adyen API
   * @returns Standardized GatewayError
   */
  private mapAdyenErrorToGatewayError(error: Error): GatewayError {
    logger.debug('Mapping Adyen error to gateway error', { error });
    
    // Check if this is an Adyen API error with a response
    const adyenError = error as any;
    
    if (adyenError.statusCode) {
      // This is likely an HTTP error from the Adyen API
      const statusCode = adyenError.statusCode;
      const errorDetail = {
        gatewayErrorCode: adyenError.errorCode || String(statusCode),
        gatewayMessage: adyenError.message,
        additionalData: adyenError.response || {}
      };
      
      // Map based on status code
      if (statusCode === 401 || statusCode === 403) {
        return GatewayError.createGatewayAuthenticationError(
          'Authentication with Adyen failed',
          errorDetail,
          error
        );
      } else if (statusCode === 400 || statusCode === 422) {
        return GatewayError.createGatewayValidationError(
          'Adyen validation error',
          errorDetail,
          error
        );
      } else if (statusCode === 429) {
        return GatewayError.createGatewayRejectionError(
          'Adyen rate limit exceeded',
          errorDetail,
          error
        );
      } else if (statusCode >= 500) {
        return GatewayError.createGatewayError(
          'Adyen server error',
          errorDetail,
          error
        );
      }
    }
    
    // Check for timeout errors
    if (error.message && error.message.includes('timeout')) {
      return GatewayError.createGatewayTimeoutError(
        'Request to Adyen timed out',
        { gatewayMessage: error.message },
        error
      );
    }
    
    // Check for connection errors
    if (error.message && (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT')
    )) {
      return GatewayError.createGatewayConnectionError(
        'Failed to connect to Adyen',
        { gatewayMessage: error.message },
        error
      );
    }
    
    // Default to a generic gateway error
    return GatewayError.createGatewayError(
      'Error processing request with Adyen',
      { gatewayMessage: error.message },
      error
    );
  }

  /**
   * Initializes and configures the Adyen API client with credentials
   * 
   * @param credentials - Gateway credentials for Adyen
   */
  private initializeClient(credentials: GatewayCredentials): void {
    if (!credentials.apiKey) {
      throw new Error('Adyen API key is required');
    }

    if (!credentials.merchantAccountId) {
      throw new Error('Adyen merchant account ID is required');
    }

    // Create new client instance
    this.client = new Client({
      apiKey: credentials.apiKey,
      environment: credentials.environment === 'production' ? 'LIVE' : 'TEST'
    });

    // Initialize Checkout API - used for refunds
    this.checkout = new CheckoutAPI(this.client);
  }

  /**
   * Maps Adyen status to standardized status values
   * 
   * @param adyenStatus - Status from Adyen response
   * @returns Standardized status string
   */
  private mapAdyenStatusToStandardStatus(adyenStatus: string): string {
    // Map Adyen-specific status to our standardized statuses
    switch (adyenStatus) {
      case 'received':
      case '[refund-received]':
        return 'PROCESSING'; // Adyen has received the refund request
      case 'completed':
      case '[refund-completed]':
        return 'COMPLETED';
      case 'failed':
      case '[refund-failed]':
        return 'FAILED';
      case 'error':
        return 'FAILED';
      case 'pending':
        return 'PENDING';
      default:
        logger.debug('Unknown Adyen status', { adyenStatus });
        return 'UNKNOWN';
    }
  }

  /**
   * Determines refund status from Adyen response object
   * 
   * @param response - Response from Adyen API
   * @returns Standardized status string
   */
  private determineRefundStatusFromResponse(response: any): string {
    // The way to determine status will depend on the specific Adyen response structure
    const resultCode = response.resultCode;
    
    switch (resultCode) {
      case 'Authorised':
      case 'Received':
      case 'Refunded':
        return 'COMPLETED';
      case 'Pending':
      case 'ReceivedPending':
        return 'PROCESSING';
      case 'Refused':
      case 'Error':
        return 'FAILED';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Calculates the estimated settlement date for a refund
   * 
   * @returns Estimated date when the refund will settle
   */
  private calculateEstimatedSettlementDate(): Date {
    // Adyen typically settles refunds within 2-5 business days
    // For simplicity, we'll estimate 3 business days in the future
    const settlementDate = new Date();
    settlementDate.setDate(settlementDate.getDate() + 3);
    return settlementDate;
  }
}