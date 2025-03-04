import { GatewayError } from '../../../common/errors/gateway-error';
import { GatewayType } from '../../../common/enums/gateway-type.enum';
import { logger } from '../../../common/utils/logger';
import { 
  GatewayRefundRequest, 
  GatewayRefundResponse, 
  GatewayCredentials 
} from '../../../common/interfaces/payment.interface';
import { generateIdempotencyKey } from '../../../common/utils/idempotency';

// Mock storage for refunds, events, and error triggers
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
  logger.debug('All Adyen mock data has been reset');
}

/**
 * Sets a predefined mock refund response in the mock data store
 * 
 * @param refundId - The refund ID to associate with the mock data
 * @param refundData - The mock refund data to store
 */
export function setMockRefund(refundId: string, refundData: any): void {
  mockRefunds.set(refundId, refundData);
  logger.debug('Set mock Adyen refund', { refundId });
}

/**
 * Sets an error trigger for a specific transaction or refund ID
 * 
 * @param id - The transaction or refund ID that should trigger an error
 * @param errorType - The type of error to trigger
 */
export function setMockErrorTrigger(id: string, errorType: string): void {
  mockErrorTriggers.set(id, errorType);
  logger.debug('Set Adyen error trigger', { id, errorType });
}

/**
 * Sets a mock webhook event for testing webhook processing
 * 
 * @param eventId - The event ID to associate with the mock event
 * @param eventData - The mock event data to store
 */
export function setMockWebhookEvent(eventId: string, eventData: any): void {
  mockWebhookEvents.set(eventId, eventData);
  logger.debug('Set mock Adyen webhook event', { eventId });
}

/**
 * Generates a mock Adyen refund ID for testing
 * 
 * @returns A mock Adyen refund ID
 */
function generateMockRefundId(): string {
  // Adyen typically uses random strings for reference IDs
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `mock_adyen_refund_${timestamp}_${random}`;
}

/**
 * Creates a standardized mock refund response object
 * 
 * @param request - The original refund request
 * @param success - Whether the refund was successful
 * @param errorCode - Optional error code for failed refunds
 * @param errorMessage - Optional error message for failed refunds
 * @returns A formatted refund response
 */
function createMockRefundResponse(
  request: GatewayRefundRequest,
  success: boolean,
  errorCode?: string,
  errorMessage?: string
): GatewayRefundResponse {
  if (success) {
    const gatewayRefundId = generateMockRefundId();
    return {
      success: true,
      gatewayRefundId,
      status: 'received',
      processedAmount: request.amount,
      processingDate: new Date(),
      estimatedSettlementDate: new Date(Date.now() + 86400000 * 2), // 2 days later
      errorCode: null,
      errorMessage: null,
      gatewayResponseCode: '00',
      retryable: false,
      rawResponse: {
        pspReference: gatewayRefundId,
        merchantReference: request.refundId,
        amount: {
          value: request.amount,
          currency: request.currency
        },
        status: 'received'
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
      errorCode: errorCode || 'unknown_error',
      errorMessage: errorMessage || 'An unknown error occurred',
      gatewayResponseCode: errorCode || 'ERROR',
      retryable: errorCode === 'timeout' || errorCode === 'rate_limit' || errorCode === 'connection',
      rawResponse: {
        status: 'failed',
        errorCode: errorCode,
        message: errorMessage,
        refusalReason: errorMessage
      }
    };
  }
}

/**
 * Mock implementation of the Adyen processRefund function
 * 
 * @param refundRequest - The refund request to process
 * @param credentials - Adyen API credentials
 * @returns Simulated refund processing result
 */
async function mockProcessRefund(
  refundRequest: GatewayRefundRequest,
  credentials: GatewayCredentials
): Promise<GatewayRefundResponse> {
  logger.info('Processing mock Adyen refund request', { 
    transactionId: refundRequest.transactionId,
    refundId: refundRequest.refundId,
    amount: refundRequest.amount
  });
  
  // Verify credentials
  if (!credentials.apiKey) {
    return createMockRefundResponse(
      refundRequest,
      false,
      'authentication',
      'Missing API key in credentials'
    );
  }
  
  if (!credentials.merchantAccountId) {
    return createMockRefundResponse(
      refundRequest,
      false,
      'validation',
      'Missing merchant account ID in credentials'
    );
  }
  
  // Check for error triggers
  if (mockErrorTriggers.has(refundRequest.transactionId)) {
    logger.debug('Triggering error for transaction', { 
      transactionId: refundRequest.transactionId, 
      errorType: mockErrorTriggers.get(refundRequest.transactionId) 
    });
    
    return await mockHandleAdyenError(
      mockErrorTriggers.get(refundRequest.transactionId)!,
      refundRequest
    );
  }
  
  if (mockErrorTriggers.has(refundRequest.refundId)) {
    logger.debug('Triggering error for refund', { 
      refundId: refundRequest.refundId, 
      errorType: mockErrorTriggers.get(refundRequest.refundId) 
    });
    
    return await mockHandleAdyenError(
      mockErrorTriggers.get(refundRequest.refundId)!,
      refundRequest
    );
  }
  
  // Generate successful response
  const gatewayRefundId = generateMockRefundId();
  const response = createMockRefundResponse(refundRequest, true);
  
  // Store the mock refund for future status checks
  mockRefunds.set(gatewayRefundId, {
    ...response,
    originalRequest: refundRequest
  });
  
  logger.debug('Created mock Adyen refund', { gatewayRefundId });
  
  return response;
}

/**
 * Mock implementation of the Adyen checkRefundStatus function
 * 
 * @param refundId - The refund ID to check
 * @param credentials - Adyen API credentials
 * @returns Simulated refund status response
 */
async function mockCheckRefundStatus(
  refundId: string,
  credentials: GatewayCredentials
): Promise<GatewayRefundResponse> {
  logger.info('Checking mock Adyen refund status', { refundId });
  
  // Check if the refund exists in our mock store
  if (mockRefunds.has(refundId)) {
    const refund = mockRefunds.get(refundId);
    logger.debug('Found mock refund', { refundId });
    return refund;
  }
  
  // Check for error triggers
  if (mockErrorTriggers.has(refundId)) {
    logger.debug('Triggering error for refund status check', { 
      refundId, 
      errorType: mockErrorTriggers.get(refundId) 
    });
    
    const dummyRequest: GatewayRefundRequest = {
      merchantId: 'mock_merchant',
      transactionId: 'mock_transaction',
      refundId: refundId,
      gatewayType: GatewayType.ADYEN,
      gatewayTransactionId: 'mock_transaction',
      amount: 0,
      currency: 'USD',
      reason: 'Status check',
      metadata: {}
    };
    
    return await mockHandleAdyenError(
      mockErrorTriggers.get(refundId)!,
      dummyRequest
    );
  }
  
  // If refund doesn't exist, return not found error
  logger.debug('Refund not found in mock store', { refundId });
  
  const dummyRequest: GatewayRefundRequest = {
    merchantId: 'mock_merchant',
    transactionId: 'mock_transaction',
    refundId: 'mock_refund',
    gatewayType: GatewayType.ADYEN,
    gatewayTransactionId: 'mock_transaction',
    amount: 0,
    currency: 'USD',
    reason: 'Status check',
    metadata: {}
  };
  
  return createMockRefundResponse(
    dummyRequest,
    false,
    'reference',
    `Refund reference ${refundId} not found`
  );
}

/**
 * Mock implementation of the Adyen webhook signature validation
 * 
 * @param payload - The webhook payload to validate
 * @param signature - The signature to validate
 * @param hmacKey - The HMAC key for validation
 * @returns Simulated validation result
 */
async function mockValidateWebhookSignature(
  payload: string,
  signature: string,
  hmacKey: string
): Promise<boolean> {
  logger.info('Validating mock Adyen webhook signature');
  
  // Basic validation - just check if HMAC key is provided
  if (!hmacKey) {
    logger.warn('Missing HMAC key for webhook validation');
    return false;
  }
  
  // In mock mode, always return true for valid signature
  // Could be enhanced to return false in specific test scenarios
  return true;
}

/**
 * Mock implementation of the Adyen webhook event parsing
 * 
 * @param payload - The webhook payload to parse
 * @returns Parsed webhook event
 */
async function mockParseWebhookEvent(payload: string): Promise<any> {
  logger.info('Parsing mock Adyen webhook event');
  
  try {
    const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const eventId = parsedPayload.id || parsedPayload.notificationRequestItem?.pspReference;
    
    // Check if we have a predefined mock event
    if (eventId && mockWebhookEvents.has(eventId)) {
      logger.debug('Found predefined mock webhook event', { eventId });
      return mockWebhookEvents.get(eventId);
    }
    
    // Create a basic mock webhook event
    const isSuccessful = !parsedPayload.errorCode && !parsedPayload.error;
    const mockEvent = {
      eventType: isSuccessful ? 'REFUND' : 'REFUND_FAILED',
      eventDate: new Date().toISOString(),
      amount: parsedPayload.amount || { value: 1000, currency: 'USD' },
      merchantReference: parsedPayload.merchantReference || 'mock_reference',
      pspReference: parsedPayload.pspReference || generateMockRefundId(),
      success: isSuccessful,
      reason: parsedPayload.reason || (isSuccessful ? null : 'Mock refund failure'),
      originalRequest: parsedPayload
    };
    
    logger.debug('Created standard mock webhook event', { eventType: mockEvent.eventType });
    return mockEvent;
  } catch (error) {
    logger.error('Error parsing webhook payload', { error });
    throw new Error('Invalid webhook payload format');
  }
}

/**
 * Helper function to generate appropriate error responses based on Adyen error type
 * 
 * @param errorType - Type of error to generate
 * @param request - Original refund request
 * @returns Error response based on the error type
 */
async function mockHandleAdyenError(
  errorType: string,
  request: GatewayRefundRequest
): Promise<GatewayRefundResponse> {
  logger.debug('Handling mock Adyen error', { errorType });
  
  switch (errorType) {
    case 'validation':
      return createMockRefundResponse(
        request,
        false,
        'validation',
        'The refund request contains invalid data'
      );
      
    case 'authentication':
      return createMockRefundResponse(
        request,
        false,
        'authentication',
        'Authentication with Adyen failed'
      );
      
    case 'connection':
      return createMockRefundResponse(
        request,
        false,
        'connection',
        'Failed to connect to Adyen API'
      );
      
    case 'timeout':
      return createMockRefundResponse(
        request,
        false,
        'timeout',
        'Request to Adyen API timed out'
      );
      
    case 'rate_limit':
      return createMockRefundResponse(
        request,
        false,
        'rate_limit',
        'Adyen API rate limit exceeded'
      );
      
    case 'reference':
      return createMockRefundResponse(
        request,
        false,
        'reference',
        'Original transaction reference not found'
      );
      
    case 'processing':
      return createMockRefundResponse(
        request,
        false,
        'processing',
        'Adyen encountered an error processing the refund'
      );
      
    default:
      return createMockRefundResponse(
        request,
        false,
        'unknown',
        'An unknown error occurred'
      );
  }
}

/**
 * Mock implementation of the Adyen adapter for testing purposes
 */
export class MockAdyenAdapter {
  /**
   * Initializes a new instance of the MockAdyenAdapter
   */
  constructor() {
    logger.info('Initializing MockAdyenAdapter');
  }
  
  /**
   * Processes a refund request through the mock Adyen gateway
   * 
   * @param refundRequest - The refund request to process
   * @param credentials - Adyen API credentials
   * @returns Simulated refund processing result
   */
  async processRefund(
    refundRequest: GatewayRefundRequest,
    credentials: GatewayCredentials
  ): Promise<GatewayRefundResponse> {
    // Validate the gateway type
    if (refundRequest.gatewayType !== GatewayType.ADYEN) {
      throw new Error(`Invalid gateway type: ${refundRequest.gatewayType}, expected: ${GatewayType.ADYEN}`);
    }
    
    return mockProcessRefund(refundRequest, credentials);
  }
  
  /**
   * Checks the status of a previously submitted refund
   * 
   * @param refundId - The refund ID to check
   * @param credentials - Adyen API credentials
   * @returns Simulated refund status response
   */
  async checkRefundStatus(
    refundId: string,
    credentials: GatewayCredentials
  ): Promise<GatewayRefundResponse> {
    return mockCheckRefundStatus(refundId, credentials);
  }
  
  /**
   * Validates the signature of an Adyen webhook payload
   * 
   * @param payload - The webhook payload to validate
   * @param signature - The signature to validate
   * @param hmacKey - The HMAC key for validation
   * @returns Simulated validation result
   */
  async validateWebhookSignature(
    payload: string,
    signature: string,
    hmacKey: string
  ): Promise<boolean> {
    return mockValidateWebhookSignature(payload, signature, hmacKey);
  }
  
  /**
   * Parses an Adyen webhook event into a standardized format
   * 
   * @param payload - The webhook payload to parse
   * @returns Parsed webhook event
   */
  async parseWebhookEvent(payload: string): Promise<any> {
    return mockParseWebhookEvent(payload);
  }
}