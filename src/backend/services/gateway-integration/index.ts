// src/backend/services/gateway-integration/index.ts
import { GatewayIntegrationService } from './gateway-integration.service';
import { GatewayAdapter, StripeAdapter, AdyenAdapter, FiservAdapter, getGatewayAdapter, UnsupportedGatewayError } from './adapters';
import { CircuitBreaker, CircuitBreakerOptions, CircuitState, CircuitOpenError } from './circuit-breaker';
import { RetryStrategy, isRetryableError, sleep } from './retry-strategy';
import { GatewayCredentialManager } from './credential-manager';
import { WebhookRouter, webhookRawBodyParser, StripeWebhookHandler, AdyenWebhookHandler, mapStripeEventToInternalEvent, mapAdyenEventToInternalEvent } from './webhook';

/**
 * Exports the core service for gateway integration with resilience patterns.
 * This service provides a unified interface for processing refunds through various payment gateways.
 */
export { GatewayIntegrationService };

/**
 * Exports the interface for gateway adapter implementations.
 * This interface defines the contract for all gateway-specific adapters.
 */
export type { GatewayAdapter };

/**
 * Exports the Stripe payment gateway adapter implementation.
 * This adapter handles communication with the Stripe API.
 */
export { StripeAdapter };

/**
 * Exports the Adyen payment gateway adapter implementation.
 * This adapter handles communication with the Adyen API.
 */
export { AdyenAdapter };

/**
 * Exports the Fiserv payment gateway adapter implementation.
 * This adapter handles communication with the Fiserv API.
 */
export { FiservAdapter };

/**
 * Exports the factory function for retrieving the appropriate gateway adapter based on the gateway type.
 * This function simplifies the process of selecting the correct adapter for a given payment gateway.
 */
export { getGatewayAdapter };

/**
 * Exports the error class for unsupported gateway types.
 * This error is thrown when an attempt is made to use a gateway type that is not supported.
 */
export { UnsupportedGatewayError };

/**
 * Exports the circuit breaker implementation for resilient communication.
 * This component prevents cascading failures by monitoring and controlling access to external services.
 */
export { CircuitBreaker };

/**
 * Exports the interface for circuit breaker configuration options.
 * This interface defines the settings that can be used to customize the behavior of the circuit breaker.
 */
export type { CircuitBreakerOptions };

/**
 * Exports the enum representing the possible states of a circuit breaker.
 * This enum provides a standardized way to track the current state of the circuit breaker.
 */
export { CircuitState };

/**
 * Exports the error class thrown when a call is attempted while the circuit is open.
 * This error indicates that the circuit breaker is preventing access to the external service.
 */
export { CircuitOpenError };

/**
 * Exports the retry mechanism for transient errors.
 * This component implements exponential backoff with jitter for resilient processing of failed operations.
 */
export { RetryStrategy };

/**
 * Exports the utility function to check if an error is retryable.
 * This function helps determine whether a failed operation should be retried.
 */
export { isRetryableError };

/**
 * Exports the utility function to implement delays between retries.
 * This function provides a simple way to pause execution for a specified duration.
 */
export { sleep };

/**
 * Exports the manager for secure gateway credential handling.
 * This component is responsible for retrieving and validating gateway credentials.
 */
export { GatewayCredentialManager };

/**
 * Exports the router for handling gateway webhook events.
 * This component provides a structured way to process incoming webhook notifications from payment gateways.
 */
export { WebhookRouter };

/**
 * Exports the middleware for parsing raw webhook payloads.
 * This middleware ensures that the raw request body is available for signature validation.
 */
export { webhookRawBodyParser };

/**
 * Exports the handler for Stripe webhook events.
 * This handler processes incoming webhook notifications from Stripe.
 */
export { StripeWebhookHandler };

/**
 * Exports the handler for Adyen webhook events.
 * This handler processes incoming webhook notifications from Adyen.
 */
export { AdyenWebhookHandler };

/**
 * Exports the utility function to map Stripe events to internal format.
 * This function translates Stripe-specific event types to a standardized internal representation.
 */
export { mapStripeEventToInternalEvent };

/**
 * Exports the utility function to map Adyen events to internal format.
 * This function translates Adyen-specific event types to a standardized internal representation.
 */
export { mapAdyenEventToInternalEvent };