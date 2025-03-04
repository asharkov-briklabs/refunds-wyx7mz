/**
 * Merchant Service API Integration Types
 * 
 * This file defines the TypeScript interfaces for requests and responses when
 * communicating with the Merchant Service. It provides type safety for the
 * integration layer that interacts with merchant data.
 */

import { 
  Merchant, 
  Organization, 
  Program, 
  Bank, 
  MerchantRefundConfiguration 
} from '../../common/interfaces/merchant.interface';

/**
 * Parameters for retrieving a specific merchant
 */
export interface GetMerchantParams {
  /** Merchant's unique identifier */
  merchantId: string;
  /** Whether to include refund configuration in the response */
  includeConfiguration?: boolean;
}

/**
 * Response structure when retrieving a merchant
 */
export interface MerchantResponse {
  /** The merchant details */
  merchant: Merchant;
}

/**
 * Parameters for retrieving a filtered list of merchants
 */
export interface GetMerchantsParams {
  /** Filter criteria for merchant selection */
  filters?: MerchantFilterOptions;
  /** Pagination options for the request */
  pagination?: PaginationOptions;
  /** Whether to include refund configuration in the response */
  includeConfiguration?: boolean;
}

/**
 * Response structure when retrieving multiple merchants
 */
export interface MerchantsResponse {
  /** Array of merchant details */
  merchants: Merchant[];
  /** Total count of merchants matching the filters */
  total: number;
  /** Current page number */
  page: number;
  /** Page size */
  pageSize: number;
}

/**
 * Parameters for validating a merchant's existence and status
 */
export interface ValidateMerchantParams {
  /** Merchant's unique identifier */
  merchantId: string;
  /** Whether the merchant must be in active status */
  requireActive: boolean;
}

/**
 * Response structure for merchant validation operations
 */
export interface MerchantValidationResult {
  /** Whether the merchant is valid according to the criteria */
  valid: boolean;
  /** Reason for invalidity, if applicable */
  reason?: string;
  /** Merchant details if valid and requested */
  merchant?: Merchant;
}

/**
 * Parameters for retrieving a merchant's refund configuration
 */
export interface GetRefundConfigurationParams {
  /** Merchant's unique identifier */
  merchantId: string;
  /** Whether to include the complete inheritance chain in the response */
  includeInheritanceChain?: boolean;
}

/**
 * Structure representing the complete configuration inheritance chain
 */
export interface ConfigurationInheritanceChain {
  /** Merchant-specific configuration */
  merchant: MerchantRefundConfiguration;
  /** Organization-level configuration */
  organization: MerchantRefundConfiguration;
  /** Program-level configuration */
  program: MerchantRefundConfiguration;
  /** Bank-level configuration */
  bank: MerchantRefundConfiguration;
}

/**
 * Response structure for refund configuration requests
 */
export interface RefundConfigurationResponse {
  /** Resolved refund configuration */
  configuration: MerchantRefundConfiguration;
  /** Configuration inheritance chain if requested */
  inheritanceChain?: ConfigurationInheritanceChain;
}

/**
 * Parameters for retrieving an organization
 */
export interface GetOrganizationParams {
  /** Organization's unique identifier */
  organizationId: string;
}

/**
 * Response structure when retrieving an organization
 */
export interface OrganizationResponse {
  /** The organization details */
  organization: Organization;
}

/**
 * Parameters for retrieving a program
 */
export interface GetProgramParams {
  /** Program's unique identifier */
  programId: string;
}

/**
 * Response structure when retrieving a program
 */
export interface ProgramResponse {
  /** The program details */
  program: Program;
}

/**
 * Parameters for retrieving a bank
 */
export interface GetBankParams {
  /** Bank's unique identifier */
  bankId: string;
}

/**
 * Response structure when retrieving a bank
 */
export interface BankResponse {
  /** The bank details */
  bank: Bank;
}

/**
 * Filter options for querying merchants
 */
export interface MerchantFilterOptions {
  /** Filter by organization identifier */
  organizationId?: string;
  /** Filter by program identifier */
  programId?: string;
  /** Filter by bank identifier */
  bankId?: string;
  /** Filter by merchant status */
  status?: string;
  /** Filter by merchant name (partial match) */
  name?: string;
}

/**
 * Pagination options for paginated requests
 */
export interface PaginationOptions {
  /** Page number (0-based) */
  page: number;
  /** Number of items per page */
  pageSize: number;
}