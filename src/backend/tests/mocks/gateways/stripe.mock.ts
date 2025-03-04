import { GatewayError } from '../../../common/errors/gateway-error';
import { GatewayType } from '../../../common/enums/gateway-type.enum';
import { logger } from '../../../common/utils/logger';
import { 
  GatewayRefundRequest, 
  GatewayRefundResponse, 
  GatewayCredentials 
} from '../../../common/interfaces/payment.interface';
import { generateIdempotencyKey } from '../../../common/utils/idempotency';
import jest from 'jest'; // ^29.5.0

// Mock storage for testing
const mockRefunds = new Map<string, any>();
const mockWebhookEvents = new Map<string, any>();
const mockErrorTriggers = new Map<string, string>();

/**
 * Resets all mock data between tests
 */
export function resetMocks(): void {
  mockRefunds.clear();
  mockWebhookEvents.clear();
  mockErrorTriggers.clear();
  logger.debug('All Stripe mocks have been reset');
}

/**
 * Sets a predefined mock refund response in the mock data store
 * 
 * @param refundId - ID for the mock refund
 * @param refundData - Refund data to store
 */
export function setMockRefund(refundId: string, refundData: any): void {
  mockRefunds.set(refundId, refundData);
  logger.debug('Mock refund set', { refundId });
}

/**
 * Sets an error trigger for a specific transaction or refund ID
 * 
 * @param id - Transaction or refund ID to trigger an error
 * @param errorType - Type of error to trigger
 */
export function setMockErrorTrigger(id: string, errorType: string): void {
  mockErrorTriggers.set(id, errorType);
  logger.debug('Mock error trigger set', { id, errorType });
}

/**
 * Sets a mock webhook event for testing webhook processing
 * 
 * @param eventId - ID for the mock webhook event
 * @param eventData - Event data to store
 */
export function setMockWebhookEvent(eventId: string, eventData: any): void {
  mockWebhookEvents.set(eventId, eventData);
  logger.debug('Mock webhook event set', { eventId });
}

/**
 * Generates a mock Stripe refund ID for testing
 * 
 * @returns A mock Stripe refund ID
 */
function generateMockRefundId(): string {
  return `re_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Creates a standardized mock refund response object
 * 
 * @param request - Original refund request
 * @param success - Whether the refund was successful
 * @param errorCode - Error code (if not successful)
 * @param errorMessage - Error message (if not successful)
 * @returns A formatted refund response
 */
function createMockRefundResponse(
  request: GatewayRefundRequest,
  success: boolean,
  errorCode?: string,
  errorMessage?: string
): GatewayRefundResponse {
  if (success) {
    const refundId = generateMockRefundId();
    return {
      success: true,
      gatewayRefundId: refundId,
      status: 'succeeded',
      processedAmount: request.amount,
      processingDate: new Date(),
      estimatedSettlementDate: new Date(Date.now() + 86400000 * 3), // 3 days from now
      errorCode: null,
      errorMessage: null,
      gatewayResponseCode: '200',
      retryable: false,
      rawResponse: {
        id: refundId,
        object: 'refund',
        amount: request.amount,
        balance_transaction: `txn_${Math.random().toString(36).substring(2, 15)}`,
        charge: request.gatewayTransactionId,
        created: Math.floor(Date.now() / 1000),
        currency: request.currency,
        metadata: request.metadata,
        reason: request.reason,
        status: 'succeeded'
      }
    };
  } else {
    return {
      success: false,
      gatewayRefundId: null,
      status: 'failed',
      processedAmount: null,
      processingDate: new Date(),
      estimatedSettlementDate: null,
      errorCode: errorCode || 'generic_error',
      errorMessage: errorMessage || 'An error occurred during refund processing',
      gatewayResponseCode: '400',
      retryable: errorCode === 'rate_limit_error' || errorCode === 'api_connection_error',
      rawResponse: {
        error: {
          type: errorCode,
          message: errorMessage,
          code: errorCode,
          charge: request.gatewayTransactionId
        }
      }
    };
  }
}

/**
 * Mock implementation of the Stripe processRefund function
 * 
 * @param refundRequest - The refund request to process
 * @param credentials - Gateway credentials
 * @returns Simulated refund processing result
 */
async function mockProcessRefund(
  refundRequest: GatewayRefundRequest,
  credentials: GatewayCredentials
): Promise<GatewayRefundResponse> {
  logger.info('Processing mock Stripe refund', { 
    refundId: refundRequest.refundId,
    transactionId: refundRequest.transactionId,
    amount: refundRequest.amount
  });
  
  // Validate credentials
  if (!credentials.apiKey) {
    return createMockRefundResponse(
      refundRequest,
      false,
      'authentication_error',
      'No API key provided'
    );
  }
  
  // Check for error triggers
  if (mockErrorTriggers.has(refundRequest.transactionId)) {
    const errorType = mockErrorTriggers.get(refundRequest.transactionId);
    return mockHandleStripeError(errorType!, refundRequest);
  }
  
  // Generate successful refund
  const refundId = generateMockRefundId();
  const response = createMockRefundResponse(refundRequest, true);
  
  // Store mock refund for later status checks
  mockRefunds.set(refundId, response);
  
  return response;
}

/**
 * Mock implementation of the Stripe checkRefundStatus function
 * 
 * @param refundId - ID of the refund to check
 * @param credentials - Gateway credentials
 * @returns Simulated refund status response
 */
async function mockCheckRefundStatus(
  refundId: string,
  credentials: GatewayCredentials
): Promise<GatewayRefundResponse> {
  logger.info('Checking mock Stripe refund status', { refundId });
  
  // Check if we have this refund in our mocks
  if (mockRefunds.has(refundId)) {
    return mockRefunds.get(refundId);
  }
  
  // Check if there's an error trigger for this refund
  if (mockErrorTriggers.has(refundId)) {
    const errorType = mockErrorTriggers.get(refundId);
    // We need a GatewayRefundRequest for the error handler, so create a minimal one
    const dummyRequest: GatewayRefundRequest = {
      refundId,
      merchantId: 'dummy_merchant',
      transactionId: 'dummy_transaction',
      gatewayType: GatewayType.STRIPE,
      gatewayTransactionId: 'dummy_gateway_transaction',
      amount: 0,
      currency: 'USD',
      reason: 'status_check',
      metadata: {}
    };
    return mockHandleStripeError(errorType!, dummyRequest);
  }
  
  // If not found, return a not found error
  return {
    success: false,
    gatewayRefundId: refundId,
    status: 'not_found',
    processedAmount: null,
    processingDate: null,
    estimatedSettlementDate: null,
    errorCode: 'resource_not_found',
    errorMessage: `No refund found with ID: ${refundId}`,
    gatewayResponseCode: '404',
    retryable: false,
    rawResponse: {
      error: {
        type: 'invalid_request_error',
        message: `No refund found with ID: ${refundId}`,
        code: 'resource_not_found'
      }
    }
  };
}

/**
 * Mock implementation of the Stripe webhook signature validation
 * 
 * @param payload - Webhook payload
 * @param signature - Webhook signature header
 * @param webhookSecret - Webhook signing secret
 * @returns Simulated validation result
 */
async function mockValidateWebhookSignature(
  payload: string,
  signature: string,
  webhookSecret: string
): Promise<boolean> {
  logger.info('Validating mock Stripe webhook signature');
  
  // Basic validation - just make sure a webhook secret was provided
  if (!webhookSecret) {
    logger.warn('Webhook secret not provided for signature validation');
    return false;
  }
  
  // Always return true for testing
  // This could be enhanced to return false in specific test scenarios
  return true;
}

/**
 * Mock implementation of the Stripe webhook event parsing
 * 
 * @param payload - Webhook payload to parse
 * @returns Parsed webhook event
 */
async function mockParseWebhookEvent(payload: string): Promise<any> {
  logger.info('Parsing mock Stripe webhook event');
  
  let event;
  
  // Parse the payload if it's a string
  if (typeof payload === 'string') {
    try {
      event = JSON.parse(payload);
    } catch (error) {
      logger.error('Error parsing webhook payload', { error });
      throw new Error('Invalid webhook payload');
    }
  } else {
    // If it's already an object, use it directly
    event = payload;
  }
  
  // Check if we have a predefined event in our mocks
  if (event.id && mockWebhookEvents.has(event.id)) {
    return mockWebhookEvents.get(event.id);
  }
  
  // Create a basic mock event if none was found
  const mockEvent = {
    id: event.id || `evt_${Math.random().toString(36).substring(2, 10)}`,
    object: 'event',
    api_version: '2023-08-16',
    created: Math.floor(Date.now() / 1000),
    type: event.type || 'charge.refunded',
    data: {
      object: event.data?.object || {
        id: generateMockRefundId(),
        object: 'refund',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
        created: Math.floor(Date.now() / 1000)
      }
    }
  };
  
  return mockEvent;
}

/**
 * Helper function to generate appropriate error responses based on error type
 * 
 * @param errorType - The type of error to generate
 * @param request - The refund request
 * @returns Error response based on the error type
 */
async function mockHandleStripeError(
  errorType: string,
  request: GatewayRefundRequest
): Promise<GatewayRefundResponse> {
  switch (errorType) {
    case 'card_error':
      return createMockRefundResponse(
        request,
        false,
        'card_error',
        'The card has been declined'
      );
    
    case 'authentication_error':
      return createMockRefundResponse(
        request,
        false,
        'authentication_error',
        'Invalid API key provided'
      );
    
    case 'api_connection_error':
      return createMockRefundResponse(
        request,
        false,
        'api_connection_error',
        'Failed to connect to Stripe API'
      );
    
    case 'api_error':
      return createMockRefundResponse(
        request,
        false,
        'api_error',
        'An error occurred on Stripe servers'
      );
    
    case 'rate_limit_error':
      return createMockRefundResponse(
        request,
        false,
        'rate_limit_error',
        'Too many requests hit the API too quickly'
      );
    
    case 'invalid_request_error':
      return createMockRefundResponse(
        request,
        false,
        'invalid_request_error',
        'Invalid parameters were supplied to Stripe API'
      );
    
    case 'idempotency_error':
      return createMockRefundResponse(
        request,
        false,
        'idempotency_error',
        'Keys for idempotent requests can only be used with the same parameters they were first used with'
      );
    
    default:
      return createMockRefundResponse(
        request,
        false,
        'api_error',
        'An unknown error occurred'
      );
  }
}

/**
 * Mock implementation of the Stripe adapter for testing purposes
 */
export class MockStripeAdapter {
  /**
   * Initializes a new instance of the MockStripeAdapter
   */
  constructor() {
    logger.info('Initializing MockStripeAdapter');
  }
  
  /**
   * Processes a refund request through the mock Stripe gateway
   * 
   * @param refundRequest - The refund request to process
   * @param credentials - Gateway credentials
   * @returns Simulated refund processing result
   */
  async processRefund(
    refundRequest: GatewayRefundRequest,
    credentials: GatewayCredentials
  ): Promise<GatewayRefundResponse> {
    // Ensure we're using the correct gateway type
    if (refundRequest.gatewayType !== GatewayType.STRIPE) {
      logger.error('Invalid gateway type for Stripe adapter', { 
        expected: GatewayType.STRIPE,
        received: refundRequest.gatewayType
      });
      
      return createMockRefundResponse(
        refundRequest,
        false,
        'invalid_request_error',
        'Invalid gateway type for Stripe adapter'
      );
    }
    
    return mockProcessRefund(refundRequest, credentials);
  }
  
  /**
   * Checks the status of a previously submitted refund
   * 
   * @param refundId - ID of the refund to check
   * @param credentials - Gateway credentials
   * @returns Simulated refund status response
   */
  async checkRefundStatus(
    refundId: string,
    credentials: GatewayCredentials
  ): Promise<GatewayRefundResponse> {
    return mockCheckRefundStatus(refundId, credentials);
  }
  
  /**
   * Validates the signature of a Stripe webhook payload
   * 
   * @param payload - Webhook payload
   * @param signature - Webhook signature header
   * @param webhookSecret - Webhook signing secret
   * @returns Simulated validation result
   */
  async validateWebhookSignature(
    payload: string,
    signature: string,
    webhookSecret: string
  ): Promise<boolean> {
    return mockValidateWebhookSignature(payload, signature, webhookSecret);
  }
  
  /**
   * Parses a Stripe webhook event into a standardized format
   * 
   * @param payload - Webhook payload
   * @returns Parsed webhook event
   */
  async parseWebhookEvent(payload: string): Promise<any> {
    return mockParseWebhookEvent(payload);
  }
}