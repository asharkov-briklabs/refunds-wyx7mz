import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../../../../common/utils/logger';
import { GatewayError } from '../../../../common/errors/gateway-error';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { 
  GatewayRefundRequest, 
  GatewayRefundResponse, 
  GatewayCredentials 
} from '../../../../common/interfaces/payment.interface';

/**
 * Maps Fiserv-specific error codes to standardized internal error codes
 * 
 * @param fiservErrorCode - The error code from Fiserv
 * @returns Standardized internal error code
 */
function mapErrorCode(fiservErrorCode: string): string {
  // Define mapping of Fiserv error codes to internal error codes
  const errorMap: Record<string, string> = {
    'UNAUTHORIZED': ErrorCode.GATEWAY_AUTHENTICATION_ERROR,
    'INVALID_REQUEST': ErrorCode.GATEWAY_VALIDATION_ERROR,
    'RESOURCE_NOT_FOUND': ErrorCode.GATEWAY_ERROR,
    'TRANSACTION_NOT_FOUND': ErrorCode.TRANSACTION_NOT_FOUND,
    'INVALID_TRANSACTION_STATE': ErrorCode.INVALID_STATE,
    'TRANSACTION_EXPIRED': ErrorCode.REFUND_TIME_LIMIT_EXCEEDED,
    'REFUND_FAILED': ErrorCode.GATEWAY_REJECTION,
    'REFUND_LIMIT_EXCEEDED': ErrorCode.MAX_REFUND_AMOUNT_EXCEEDED,
    'INSUFFICIENT_FUNDS': ErrorCode.INSUFFICIENT_BALANCE,
    'GATEWAY_TIMEOUT': ErrorCode.GATEWAY_TIMEOUT,
    'INTERNAL_SERVER_ERROR': ErrorCode.GATEWAY_ERROR,
    'SERVICE_UNAVAILABLE': ErrorCode.SERVICE_UNAVAILABLE
  };

  return errorMap[fiservErrorCode] || ErrorCode.GATEWAY_ERROR;
}

/**
 * Determines if a Fiserv error should be retried based on its error code
 * 
 * @param fiservErrorCode - The error code from Fiserv
 * @returns True if the error should be retried, false otherwise
 */
function isRetryableError(fiservErrorCode: string): boolean {
  // Define list of retryable Fiserv error codes
  const retryableErrors = [
    'GATEWAY_TIMEOUT',
    'SERVICE_UNAVAILABLE',
    'INTERNAL_SERVER_ERROR',
    'NETWORK_ERROR',
    'CONNECTION_ERROR'
  ];

  return retryableErrors.includes(fiservErrorCode);
}

/**
 * Builds the required HTTP headers for Fiserv API requests
 * 
 * @param credentials - The Fiserv API credentials
 * @param idempotencyKey - Unique key for idempotent requests
 * @returns HTTP headers object for Fiserv requests
 */
function buildFiservHeaders(credentials: GatewayCredentials, idempotencyKey?: string): Record<string, string> {
  // Create headers object with required Fiserv headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Api-Key': credentials.apiKey || '',
    'Client-Request-Id': crypto.randomUUID()
  };

  // Add merchant account ID if available
  if (credentials.merchantAccountId) {
    headers['Merchant-Id'] = credentials.merchantAccountId;
  }

  // Add idempotency key if provided
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  return headers;
}

/**
 * Adapter implementation for processing refunds through the Fiserv payment gateway
 */
export class FiservAdapter {
  private readonly baseUrl: string;
  private readonly timeout: number;

  /**
   * Creates a new instance of the Fiserv adapter
   * 
   * @param options - Configuration options for the adapter
   */
  constructor(options: { baseUrl?: string; timeout?: number } = {}) {
    // Initialize baseUrl based on options or default to production URL
    this.baseUrl = options.baseUrl || 'https://api.fiserv.com/payments/v1';
    
    // Initialize timeout based on options or default to 30 seconds
    this.timeout = options.timeout || 30000;
    
    // Log initialization of the adapter
    logger.info('Initialized Fiserv adapter', { baseUrl: this.baseUrl });
  }

  /**
   * Processes a refund request through the Fiserv payment gateway
   * 
   * @param refundRequest - Standardized refund request details
   * @param credentials - Fiserv API credentials
   * @returns Promise resolving to standardized refund response
   */
  async processRefund(
    refundRequest: GatewayRefundRequest,
    credentials: GatewayCredentials
  ): Promise<GatewayRefundResponse> {
    try {
      // Log refund request (sanitizing sensitive data)
      logger.info('Processing refund through Fiserv gateway', {
        refundId: refundRequest.refundId,
        transactionId: refundRequest.transactionId,
        merchantId: refundRequest.merchantId,
        amount: refundRequest.amount,
        currency: refundRequest.currency
      });
      
      // Validate request parameters
      if (!refundRequest.gatewayTransactionId) {
        throw new GatewayError(
          ErrorCode.GATEWAY_VALIDATION_ERROR,
          'Missing gateway transaction ID'
        );
      }
      
      // Build Fiserv API endpoint URL
      const endpoint = `${this.baseUrl}/transactions/${refundRequest.gatewayTransactionId}/refunds`;
      
      // Transform refund request to Fiserv-specific format
      const fiservRefundRequest = {
        transactionAmount: {
          total: (refundRequest.amount / 100).toFixed(2), // Convert from cents to dollars with 2 decimal places
          currency: refundRequest.currency
        },
        transactionId: refundRequest.refundId,
        merchantTransactionId: refundRequest.refundId,
        merchantOrderId: refundRequest.metadata.orderId || refundRequest.refundId,
        merchantRefundReason: refundRequest.reason,
        // Include additional metadata that Fiserv might require
        additionalData: {
          ...refundRequest.metadata,
          originalTransactionId: refundRequest.transactionId
        }
      };
      
      // Generate headers using buildFiservHeaders with refundId as idempotency key
      const headers = buildFiservHeaders(credentials, refundRequest.refundId);
      
      // Make API request to Fiserv refund endpoint
      const response = await axios.post(endpoint, fiservRefundRequest, { 
        headers,
        timeout: this.timeout
      });
      
      // Handle successful response by mapping to standardized GatewayRefundResponse
      return this.mapFiservResponse(response.data);
      
    } catch (error) {
      // Handle error responses by mapping to appropriate error codes
      logger.error('Fiserv refund processing error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        refundId: refundRequest.refundId,
        transactionId: refundRequest.transactionId
      });
      
      return this.mapErrorResponse(error);
    }
  }

  /**
   * Checks the status of a previously submitted refund
   * 
   * @param refundId - Identifier of the refund to check
   * @param credentials - Fiserv API credentials
   * @returns Promise resolving to current status of the refund
   */
  async checkRefundStatus(
    refundId: string,
    credentials: GatewayCredentials
  ): Promise<GatewayRefundResponse> {
    try {
      // Log status check request
      logger.info('Checking refund status with Fiserv', { refundId });
      
      // Validate refundId
      if (!refundId) {
        throw new GatewayError(
          ErrorCode.GATEWAY_VALIDATION_ERROR,
          'Missing refund ID'
        );
      }
      
      // Build Fiserv API endpoint URL for status check
      const endpoint = `${this.baseUrl}/refunds/${refundId}`;
      
      // Generate headers using buildFiservHeaders
      const headers = buildFiservHeaders(credentials);
      
      // Make API request to Fiserv status endpoint
      const response = await axios.get(endpoint, { 
        headers,
        timeout: this.timeout
      });
      
      // Map Fiserv status response to standardized GatewayRefundResponse
      return this.mapFiservResponse(response.data);
      
    } catch (error) {
      // Handle error responses with appropriate error mapping
      logger.error('Fiserv refund status check error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        refundId
      });
      
      return this.mapErrorResponse(error);
    }
  }

  /**
   * Validates the signature of a webhook notification from Fiserv
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
  ): boolean {
    try {
      // Extract necessary components from the signature header
      if (!signature || !webhookSecret) {
        logger.error('Missing signature or webhook secret for validation');
        return false;
      }

      // Generate HMAC hash of the payload using webhook secret
      const computedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');
      
      // Compare generated hash with provided signature
      const isValid = computedSignature === signature;
      
      // Log validation result (success/failure)
      logger.debug('Webhook signature validation result', { isValid });
      
      return isValid;
    } catch (error) {
      logger.error('Error validating webhook signature', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  /**
   * Parses a webhook notification from Fiserv into a standardized format
   * 
   * @param payload - Raw webhook payload as string
   * @returns Parsed webhook event in standardized format
   */
  parseWebhookEvent(payload: string): any {
    try {
      // Parse JSON payload
      const event = JSON.parse(payload);
      
      // Validate payload structure
      if (!event.eventType || !event.eventId) {
        logger.error('Invalid webhook payload structure', { event });
        throw new Error('Invalid webhook payload structure');
      }
      
      // Determine event type from payload
      const eventType = this.mapEventType(event.eventType);
      
      // Extract relevant refund information based on event type
      const mappedEvent = {
        eventType,
        eventId: event.eventId,
        createdAt: new Date(event.eventTime || new Date().toISOString()),
        refundId: event.payload?.refundId || event.payload?.transactionId,
        gatewayRefundId: event.payload?.gatewayRefundId,
        status: this.mapFiservRefundStatus(event.payload?.status),
        amount: event.payload?.amount ? parseFloat(event.payload.amount) * 100 : null, // Convert from dollars to cents
        currency: event.payload?.currency,
        errorCode: event.payload?.errorCode,
        errorMessage: event.payload?.errorMessage,
        metadata: event.payload?.metadata || {},
        rawEvent: event
      };
      
      logger.debug('Parsed webhook event', { eventType: mappedEvent.eventType, refundId: mappedEvent.refundId });
      
      return mappedEvent;
    } catch (error) {
      logger.error('Error parsing webhook event', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        payload: payload.substring(0, 200) + (payload.length > 200 ? '...' : '') // Log truncated payload
      });
      throw error;
    }
  }

  /**
   * Maps Fiserv-specific refund status to standardized internal status
   * 
   * @param fiservStatus - Status code from Fiserv
   * @returns Standardized internal refund status
   */
  private mapFiservRefundStatus(fiservStatus?: string): string {
    if (!fiservStatus) return 'UNKNOWN';
    
    // Define mapping of Fiserv statuses to internal statuses
    const statusMap: Record<string, string> = {
      'INITIATED': 'PENDING',
      'PENDING': 'PENDING',
      'PROCESSING': 'PROCESSING',
      'COMPLETED': 'COMPLETED',
      'SETTLED': 'COMPLETED',
      'FAILED': 'FAILED',
      'DECLINED': 'FAILED',
      'CANCELLED': 'CANCELLED'
    };
    
    return statusMap[fiservStatus.toUpperCase()] || 'UNKNOWN';
  }

  /**
   * Maps Fiserv webhook event types to standardized internal event types
   * 
   * @param eventType - Event type from Fiserv
   * @returns Standardized internal event type
   */
  private mapEventType(eventType: string): string {
    // Define mapping of Fiserv event types to internal event types
    const eventMap: Record<string, string> = {
      'refund.created': 'REFUND_CREATED',
      'refund.updated': 'REFUND_UPDATED',
      'refund.completed': 'REFUND_COMPLETED',
      'refund.failed': 'REFUND_FAILED'
    };
    
    return eventMap[eventType.toLowerCase()] || 'UNKNOWN';
  }

  /**
   * Maps Fiserv API response to standardized GatewayRefundResponse
   * 
   * @param data - Response data from Fiserv API
   * @returns Standardized refund response
   */
  private mapFiservResponse(data: any): GatewayRefundResponse {
    // Extract refund amount - Fiserv returns dollar amounts, convert to cents
    const amountInCents = data.transactionAmount 
      ? Math.round(parseFloat(data.transactionAmount.total) * 100) 
      : null;
    
    // Map status
    const status = this.mapFiservRefundStatus(data.status);
    
    // Determine if refund was successful based on status
    const success = ['COMPLETED', 'SETTLED'].includes(status);
    
    // Create standardized response
    return {
      success,
      gatewayRefundId: data.id || data.refundId || null,
      status,
      processedAmount: amountInCents,
      processingDate: data.transactionTime ? new Date(data.transactionTime) : new Date(),
      estimatedSettlementDate: data.settlementDate ? new Date(data.settlementDate) : null,
      errorCode: data.errorCode || null,
      errorMessage: data.errorMessage || null,
      gatewayResponseCode: data.responseCode || null,
      retryable: false,
      rawResponse: data
    };
  }

  /**
   * Maps Fiserv error responses to standardized error format
   * 
   * @param error - Error from Fiserv request
   * @returns Standardized error response
   */
  private mapErrorResponse(error: unknown): GatewayRefundResponse {
    // Extract error details from Fiserv error response
    let errorCode = 'GATEWAY_ERROR';
    let errorMessage = 'An error occurred while processing the refund through Fiserv';
    let statusCode = 500;
    let retryable = false;
    let responseData = {};
    
    // Extract error details based on error type
    if (axios.isAxiosError(error)) {
      // Handle Axios errors (network, timeout, etc.)
      statusCode = error.response?.status || 500;
      
      if (error.response?.data) {
        responseData = error.response.data;
        
        // Extract Fiserv-specific error details
        const fiservError = error.response.data as any;
        errorCode = fiservError.errorCode || fiservError.error?.code || 'GATEWAY_ERROR';
        errorMessage = fiservError.errorMessage || fiservError.error?.message || errorMessage;
      } else if (error.code === 'ECONNABORTED') {
        errorCode = 'GATEWAY_TIMEOUT';
        errorMessage = 'Request to Fiserv timed out';
        retryable = true;
      } else if (error.code === 'ECONNREFUSED') {
        errorCode = 'GATEWAY_CONNECTION_ERROR';
        errorMessage = 'Failed to connect to Fiserv';
        retryable = true;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Map Fiserv error code to internal error code
    const mappedErrorCode = mapErrorCode(errorCode);
    
    // Determine if error is retryable
    retryable = isRetryableError(errorCode);
    
    // Log detailed error information
    logger.error('Fiserv error response mapped', {
      originalErrorCode: errorCode,
      mappedErrorCode,
      statusCode,
      errorMessage,
      retryable
    });
    
    // Return standardized error response
    return {
      success: false,
      gatewayRefundId: null,
      status: 'FAILED',
      processedAmount: null,
      processingDate: null,
      estimatedSettlementDate: null,
      errorCode: mappedErrorCode,
      errorMessage,
      gatewayResponseCode: String(statusCode),
      retryable,
      rawResponse: responseData
    };
  }
}