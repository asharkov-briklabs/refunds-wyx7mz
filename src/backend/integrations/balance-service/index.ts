/**
 * Balance Service Integration
 * 
 * This module provides an integration with the Balance Service for checking merchant balances
 * and processing refund operations using the merchant's balance. It serves as the entry point
 * for all Balance Service operations used by the Refunds Service.
 *
 * @version 1.0.0
 */

import BalanceServiceClient from './client';
import config from '../../config';
import { logger } from '../../common/utils/logger';
import {
  BalanceServiceConfig,
  MerchantBalance,
  BalanceCheckRequest,
  BalanceUpdateRequest,
  BalanceUpdateResponse,
  BalanceOperation,
  BalanceServiceError
} from './types';

/**
 * Creates and initializes a new Balance Service client instance using configuration
 * 
 * @returns Configured Balance Service client instance
 */
function createBalanceServiceClient(): BalanceServiceClient {
  // Get Balance Service configuration from config
  const balanceServiceConfig = config.services.balanceService;
  
  // Create client instance
  const client = new BalanceServiceClient(balanceServiceConfig);
  
  // Log successful initialization
  logger.info('Balance Service client initialized', {
    baseUrl: balanceServiceConfig.baseUrl,
    timeout: balanceServiceConfig.timeout
  });
  
  return client;
}

// Create singleton instance of Balance Service client
const balanceServiceClient = createBalanceServiceClient();

// Export singleton instance as default export for easy access across the application
export default balanceServiceClient;

// Export the client class and all necessary types for integration
export {
  BalanceServiceClient,
  BalanceServiceConfig,
  MerchantBalance,
  BalanceCheckRequest,
  BalanceUpdateRequest,
  BalanceUpdateResponse,
  BalanceOperation,
  BalanceServiceError
};