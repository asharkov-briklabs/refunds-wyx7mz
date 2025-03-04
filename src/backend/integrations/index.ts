/**
 * Central export file for all integration services used by the Refunds Service.
 * This file aggregates and re-exports AWS services, Payment Service, Balance Service,
 * Merchant Service, Program Service, and Auth Service integrations to provide a unified access point.
 */

// Import AWS service integrations
import * as aws from './aws';

// Import Payment Service integrations
import * as paymentService from './payment-service';
import paymentServiceClient, { PaymentServiceClientImpl } from './payment-service';

// Import Balance Service integrations
import balanceServiceClient, { BalanceServiceClient } from './balance-service';
import * as balanceService from './balance-service';

// Import Merchant Service integrations
import * as merchantService from './merchant-service';
import { createMerchantServiceClient } from './merchant-service';

// Import Program Service integrations
import * as programService from './program-service';
import programServiceClient from './program-service';

// Import Auth Service integrations
import authServiceClient, { AuthServiceClient } from './auth-service';
import * as authService from './auth-service';

/**
 * Re-export AWS integration services under namespace
 */
export { aws };

/**
 * Re-export Payment Service types and classes under namespace
 */
export namespace paymentService {
  export type PaymentServiceClientImpl = paymentService.PaymentServiceClientImpl;
}

/**
 * Re-export Payment Service client singleton instance
 */
export { paymentServiceClient };

/**
 * Re-export Balance Service types and classes under namespace
 */
export namespace balanceService {
  export type BalanceServiceClient = balanceService.BalanceServiceClient;
  export type BalanceOperation = balanceService.BalanceOperation;
}

/**
 * Re-export Balance Service client singleton instance
 */
export { balanceServiceClient };

/**
 * Re-export Merchant Service functionality under namespace
 */
export namespace merchantService {
  export type MerchantServiceClientImpl = merchantService.MerchantServiceClientImpl;
  export const createMerchantServiceClient = merchantService.createMerchantServiceClient;
}

/**
 * Re-export initialized Merchant Service client instance
 */
export const merchantServiceClient = createMerchantServiceClient();

/**
 * Re-export Program Service functionality under namespace
 */
export namespace programService {
  export type ProgramServiceClientImpl = programService.ProgramServiceClientImpl;
  export const createProgramServiceClient = programService.createProgramServiceClient;
}

/**
 * Re-export Program Service client singleton instance
 */
export { programServiceClient };

/**
 * Re-export Auth Service functionality under namespace
 */
export namespace authService {
  export type AuthServiceClient = authService.AuthServiceClient;
  export type types = authService.types;
}

/**
 * Re-export Auth Service client singleton instance
 */
export { authServiceClient };