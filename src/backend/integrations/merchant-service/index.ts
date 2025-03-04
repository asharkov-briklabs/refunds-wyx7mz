/**
 * Merchant Service Integration
 * 
 * This module provides access to the Merchant Service API, exposing functionality
 * for retrieving merchant data, validating merchants, and accessing hierarchical
 * configuration needed for refund processing.
 * 
 * The integration supports the multi-level parameter inheritance system required
 * by the Refunds Service (Merchant > Organization > Program > Bank).
 * 
 * @module merchant-service
 */

// Import the client implementation and factory function
import { MerchantServiceClientImpl, createMerchantServiceClient } from './client';

// Import all type definitions from the types file
import * as types from './types';

// Re-export the client implementation class
export { MerchantServiceClientImpl };

// Re-export the factory function for creating client instances
export { createMerchantServiceClient };

// Re-export parameter interfaces
export {
  GetMerchantParams,
  MerchantResponse,
  GetMerchantsParams,
  MerchantsResponse,
  ValidateMerchantParams,
  MerchantValidationResult,
  GetRefundConfigurationParams,
  RefundConfigurationResponse,
  ConfigurationInheritanceChain
} from './types';

/**
 * Default export - factory function for creating a new Merchant Service client.
 * This is the recommended way to get a client instance.
 * 
 * @example
 * ```typescript
 * import merchantServiceClient from './integrations/merchant-service';
 * 
 * // Use the client
 * const merchant = await merchantServiceClient.getMerchant('merchant_123');
 * ```
 */
export default createMerchantServiceClient();