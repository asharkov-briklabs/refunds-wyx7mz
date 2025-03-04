import { logger } from '../../../common/utils/logger';
import { metrics } from '../../../common/utils/metrics';
import { GatewayType } from '../../../common/enums/gateway-type.enum';
import { GatewayError } from '../../../common/errors/gateway-error';
import { GatewayRefundRequest, GatewayRefundResponse } from '../../../common/interfaces/payment.interface';
import { GatewayAdapter, getGatewayAdapter } from './adapters';
import { CircuitBreaker, CircuitBreakerOptions } from './circuit-breaker';
import { RetryStrategy } from './retry-strategy';
import { GatewayCredentialManager } from './credential-manager';
import config from '../../../config';

/**
 * Service that provides a unified interface for processing refunds through various payment gateways,
 * handling retry logic, circuit breaking, and credential management.
 */
export class GatewayIntegrationService {
  private circuitBreakers: Map<GatewayType, CircuitBreaker>;
  private retryStrategies: Map<GatewayType, RetryStrategy>;
  private credentialManager: GatewayCredentialManager;

  /**
   * Initializes the gateway integration service with circuit breakers and retry strategies for each supported gateway
   * @param options 
   */
  constructor(options: { credentialManager?: GatewayCredentialManager } = {}) {
    // Initialize credential manager with options or create new instance
    this.credentialManager = options.credentialManager || new GatewayCredentialManager();

    // Initialize circuit breakers map for each gateway type
    this.circuitBreakers = new Map<GatewayType, CircuitBreaker>();

    // Initialize retry strategies map for each gateway type
    this.retryStrategies = new Map<GatewayType, RetryStrategy>();

    // Create circuit breaker for Stripe with appropriate thresholds
    const stripeCircuitBreakerOptions: CircuitBreakerOptions = {
      name: 'stripe',
      failureThreshold: 5,
      failureTimeout: 10000,
      resetTimeout: 30000
    };
    this.circuitBreakers.set(GatewayType.STRIPE, new CircuitBreaker(stripeCircuitBreakerOptions));

    // Create circuit breaker for Adyen with appropriate thresholds
    const adyenCircuitBreakerOptions: CircuitBreakerOptions = {
      name: 'adyen',
      failureThreshold: 5,
      failureTimeout: 10000,
      resetTimeout: 30000
    };
    this.circuitBreakers.set(GatewayType.ADYEN, new CircuitBreaker(adyenCircuitBreakerOptions));

    // Create circuit breaker for Fiserv with appropriate thresholds
    const fiservCircuitBreakerOptions: CircuitBreakerOptions = {
      name: 'fiserv',
      failureThreshold: 3,
      failureTimeout: 15000,
      resetTimeout: 60000
    };
    this.circuitBreakers.set(GatewayType.FISERV, new CircuitBreaker(fiservCircuitBreakerOptions));

    // Create retry strategy for Stripe with exponential backoff
    const stripeRetryStrategyOptions = {
      max_attempts: 3,
      initial_delay: 1000,
      backoff_factor: 2,
      jitter: 0.25
    };
    this.retryStrategies.set(GatewayType.STRIPE, new RetryStrategy(stripeRetryStrategyOptions));

    // Create retry strategy for Adyen with exponential backoff
    const adyenRetryStrategyOptions = {
      max_attempts: 3,
      initial_delay: 1000,
      backoff_factor: 2,
      jitter: 0.25
    };
    this.retryStrategies.set(GatewayType.ADYEN, new RetryStrategy(adyenRetryStrategyOptions));

    // Create retry strategy for Fiserv with exponential backoff
    const fiservRetryStrategyOptions = {
      max_attempts: 3,
      initial_delay: 2000,
      backoff_factor: 3,
      jitter: 0.5
    };
    this.retryStrategies.set(GatewayType.FISERV, new RetryStrategy(fiservRetryStrategyOptions));

    logger.info('GatewayIntegrationService initialized');
  }

  /**
   * Processes a refund request through the appropriate payment gateway with resilience patterns
   * @param refundRequest 
   * @returns The result of the refund operation
   */
  async processRefund(refundRequest: GatewayRefundRequest): Promise<GatewayRefundResponse> {
    logger.info('Processing refund', { refundId: refundRequest.refundId });

    // Validate refund request parameters
    if (!refundRequest) {
      throw new GatewayError('INVALID_REQUEST', 'Refund request cannot be null or undefined');
    }

    // Extract gateway type from request
    const gatewayType = refundRequest.gatewayType;

    // Get appropriate adapter for the gateway type
    const adapter: GatewayAdapter = getGatewayAdapter(gatewayType);

    // Get circuit breaker for the gateway type
    const circuitBreaker = this.circuitBreakers.get(gatewayType);
    if (!circuitBreaker) {
      throw new GatewayError('CONFIGURATION_ERROR', `No circuit breaker configured for gateway type: ${gatewayType}`);
    }

    // Get retry strategy for the gateway type
    const retryStrategy = this.retryStrategies.get(gatewayType);
    if (!retryStrategy) {
      throw new GatewayError('CONFIGURATION_ERROR', `No retry strategy configured for gateway type: ${gatewayType}`);
    }

    // Get credentials for the gateway and merchant
    const credentials = await this.credentialManager.getCredentials(refundRequest.merchantId, gatewayType);

    // Validate credentials with credential manager
    if (!this.credentialManager.validateCredentials(credentials, gatewayType)) {
      throw new GatewayError('INVALID_CREDENTIALS', `Invalid credentials for gateway type: ${gatewayType}`);
    }

    // Record metrics for refund attempt
    metrics.incrementCounter('refund.attempt', 1, { gatewayType: GatewayType[gatewayType] });

    // Create operation function that processes refund through adapter
    const operation = async (): Promise<GatewayRefundResponse> => {
      logger.debug('Executing gateway refund operation', { gatewayType: GatewayType[gatewayType], refundId: refundRequest.refundId });
      return adapter.processRefund(refundRequest, credentials);
    };

    // Create fallback function for circuit breaker open state
    const fallback = async (): Promise<GatewayRefundResponse> => {
      logger.warn('Circuit breaker is open, using fallback for refund', { gatewayType: GatewayType[gatewayType], refundId: refundRequest.refundId });
      throw new GatewayError('CIRCUIT_OPEN', `Circuit breaker is open for gateway type: ${gatewayType}`);
    };

    try {
      // Use retry strategy to execute the operation with circuit breaker protection
      const result = await retryStrategy.execute(
        () => circuitBreaker.execute(operation, fallback),
        (error, attempt, delay) => {
          logger.warn(`Retrying refund operation after ${delay}ms (attempt ${attempt})`, {
            gatewayType: GatewayType[gatewayType],
            refundId: refundRequest.refundId,
            errorMessage: error.message
          });
        }
      );

      // Handle successful refund by recording metrics and returning response
      logger.info('Refund processed successfully', { gatewayType: GatewayType[gatewayType], refundId: refundRequest.refundId, gatewayRefundId: result.gatewayRefundId });
      metrics.incrementCounter('refund.success', 1, { gatewayType: GatewayType[gatewayType] });
      return result;
    } catch (error) {
      // Handle failed refund by recording metrics and returning standardized error response
      logger.error('Refund processing failed', { gatewayType: GatewayType[gatewayType], refundId: refundRequest.refundId, errorMessage: error.message });
      metrics.incrementCounter('refund.failure', 1, { gatewayType: GatewayType[gatewayType] });
      throw error;
    }
  }

  /**
   * Checks the status of a previously initiated refund
   * @param refundId 
   * @param merchantId 
   * @param gatewayType 
   * @returns The current status of the refund
   */
  async checkRefundStatus(refundId: string, merchantId: string, gatewayType: GatewayType): Promise<GatewayRefundResponse> {
    logger.info('Checking refund status', { refundId, gatewayType: GatewayType[gatewayType] });

    // Validate parameters (refundId, merchantId, gatewayType)
    if (!refundId) {
      throw new GatewayError('INVALID_INPUT', 'Refund ID is required');
    }
    if (!merchantId) {
      throw new GatewayError('INVALID_INPUT', 'Merchant ID is required');
    }
    if (!gatewayType) {
      throw new GatewayError('INVALID_INPUT', 'Gateway Type is required');
    }

    // Get appropriate adapter for the gateway type
    const adapter: GatewayAdapter = getGatewayAdapter(gatewayType);

    // Get circuit breaker for the gateway type
    const circuitBreaker = this.circuitBreakers.get(gatewayType);
    if (!circuitBreaker) {
      throw new GatewayError('CONFIGURATION_ERROR', `No circuit breaker configured for gateway type: ${gatewayType}`);
    }

    // Get retry strategy for the gateway type
    const retryStrategy = this.retryStrategies.get(gatewayType);
    if (!retryStrategy) {
      throw new GatewayError('CONFIGURATION_ERROR', `No retry strategy configured for gateway type: ${gatewayType}`);
    }

    // Get credentials for the gateway and merchant
    const credentials = await this.credentialManager.getCredentials(merchantId, gatewayType);

    // Create operation function that checks refund status through adapter
    const operation = async (): Promise<GatewayRefundResponse> => {
      logger.debug('Executing gateway check refund status operation', { gatewayType: GatewayType[gatewayType], refundId });
      return adapter.checkRefundStatus(refundId, credentials);
    };

    // Create fallback function for circuit breaker open state
    const fallback = async (): Promise<GatewayRefundResponse> => {
      logger.warn('Circuit breaker is open, using fallback for check refund status', { gatewayType: GatewayType[gatewayType], refundId });
      throw new GatewayError('CIRCUIT_OPEN', `Circuit breaker is open for gateway type: ${gatewayType}`);
    };

    try {
      // Use retry strategy to execute the operation with circuit breaker protection
      const result = await retryStrategy.execute(
        () => circuitBreaker.execute(operation, fallback),
        (error, attempt, delay) => {
          logger.warn(`Retrying check refund status operation after ${delay}ms (attempt ${attempt})`, {
            gatewayType: GatewayType[gatewayType],
            refundId,
            errorMessage: error.message
          });
        }
      );

      // Handle successful status check by returning normalized response
      logger.info('Refund status checked successfully', { gatewayType: GatewayType[gatewayType], refundId, status: result.status });
      return result;
    } catch (error) {
      // Handle failed status check by returning standardized error response
      logger.error('Refund status check failed', { gatewayType: GatewayType[gatewayType], refundId, errorMessage: error.message });
      throw error;
    }
  }

  /**
   * Validates the signature of a webhook notification from a payment gateway
   * @param gatewayType 
   * @param payload 
   * @param signature 
   * @returns True if the signature is valid, false otherwise
   */
  async validateWebhookSignature(gatewayType: GatewayType, payload: string, signature: string): Promise<boolean> {
    logger.info('Validating webhook signature', { gatewayType: GatewayType[gatewayType] });

    // Get appropriate adapter
    const adapter: GatewayAdapter = getGatewayAdapter(gatewayType);

    // Get webhook secret for the gateway from credential manager
    const webhookSecret = await this.credentialManager.getWebhookSecret(gatewayType);

    // Invoke the adapter's validateWebhookSignature method
    const isValid = adapter.validateWebhookSignature(payload, signature, webhookSecret);

    // Log detailed information about the validation attempt and result
    logger.debug('Webhook signature validation result', { gatewayType: GatewayType[gatewayType], isValid });

    return isValid;
  }

  /**
   * Parses a webhook notification from a payment gateway into a standardized format
   * @param gatewayType 
   * @param payload 
   * @returns Parsed webhook event in standardized format
   */
  async parseWebhookEvent(gatewayType: GatewayType, payload: string): Promise<object> {
    logger.info('Parsing webhook event', { gatewayType: GatewayType[gatewayType] });

    // Get appropriate adapter
    const adapter: GatewayAdapter = getGatewayAdapter(gatewayType);

    // Invoke the adapter's parseWebhookEvent method
    const parsedEvent = adapter.parseWebhookEvent(payload);

    // Log webhook event parsing for audit purposes
    logger.debug('Webhook event parsed', { gatewayType: GatewayType[gatewayType], eventType: parsedEvent.type });

    return parsedEvent;
  }

  /**
   * Gets the current status of the circuit breaker for a specific gateway
   * @param gatewayType 
   * @returns Current status of the circuit breaker
   */
  getCircuitStatus(gatewayType: GatewayType): object {
    const circuitBreaker = this.circuitBreakers.get(gatewayType);
    if (circuitBreaker) {
      return circuitBreaker.getStatus();
    } else {
      return {
        name: gatewayType,
        state: 'NOT_FOUND'
      };
    }
  }

  /**
   * Manually resets the circuit breaker for a specific gateway
   * @param gatewayType 
   * @returns True if reset was successful, false otherwise
   */
  resetCircuitBreaker(gatewayType: GatewayType): boolean {
    const circuitBreaker = this.circuitBreakers.get(gatewayType);
    if (circuitBreaker) {
      circuitBreaker.reset();
      return true;
    } else {
      logger.error(`Circuit breaker not found for gateway type: ${gatewayType}`);
      return false;
    }
  }
}