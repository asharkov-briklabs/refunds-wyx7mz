/**
 * Merchant Interface Definitions
 * 
 * This file defines the core interfaces for merchant data structures used 
 * throughout the Refunds Service. It provides entity definitions for the
 * hierarchical organization structure (Bank > Program > Organization > Merchant)
 * that enables parameter inheritance for refund configurations.
 */

/**
 * Enum representing the possible statuses of a merchant in the system
 */
export enum MerchantStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING'
}

/**
 * Merchant-specific refund configuration parameters
 * These parameters can be defined at different levels in the hierarchy
 * and are resolved through inheritance (Merchant > Organization > Program > Bank)
 */
export interface MerchantRefundConfiguration {
  // Maximum amount that can be refunded in a single transaction
  maxRefundAmount: number;
  
  // Number of days after a transaction that a refund can be processed
  refundTimeLimit: number;
  
  // Amount threshold that triggers approval workflow
  approvalThreshold: number;
  
  // Allowed refund methods (e.g., ORIGINAL_PAYMENT, BALANCE, OTHER)
  allowedMethods: string[];
  
  // Whether documentation is required for refunds
  requireDocumentation: boolean;
  
  // Amount threshold that requires documentation
  documentationThreshold: number;
}

/**
 * Core interface representing a merchant entity in the system
 */
export interface Merchant {
  // Unique identifier for the merchant
  id: string;
  
  // Merchant business name
  name: string;
  
  // References to the hierarchical structure
  organization_id: string;
  program_id: string;
  bank_id: string;
  
  // Current status of the merchant
  status: MerchantStatus;
  
  // Merchant-specific refund configuration
  refundConfiguration: MerchantRefundConfiguration;
  
  // Audit timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing an organization in the hierarchical structure
 * Organizations contain multiple merchants
 */
export interface Organization {
  // Unique identifier for the organization
  id: string;
  
  // Organization name
  name: string;
  
  // References to higher levels in the hierarchy
  program_id: string;
  bank_id: string;
  
  // Current status of the organization
  status: string;
  
  // Organization-level refund configuration
  refundConfiguration: MerchantRefundConfiguration;
  
  // Audit timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing a program in the hierarchical structure
 * Programs contain multiple organizations
 */
export interface Program {
  // Unique identifier for the program
  id: string;
  
  // Program name
  name: string;
  
  // Reference to the bank
  bank_id: string;
  
  // Current status of the program
  status: string;
  
  // Program-level refund configuration
  refundConfiguration: MerchantRefundConfiguration;
  
  // Audit timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing a bank in the hierarchical structure
 * Banks are at the top level of the hierarchy
 */
export interface Bank {
  // Unique identifier for the bank
  id: string;
  
  // Bank name
  name: string;
  
  // Current status of the bank
  status: string;
  
  // Bank-level refund configuration
  refundConfiguration: MerchantRefundConfiguration;
  
  // Audit timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface defining methods for interacting with the Merchant Service
 * This client interface is used by other services to retrieve merchant information
 */
export interface MerchantServiceClient {
  /**
   * Get a single merchant by ID
   * @param merchantId The unique identifier of the merchant
   * @returns Promise resolving to the merchant details
   */
  getMerchant(merchantId: string): Promise<Merchant>;
  
  /**
   * Get multiple merchants with optional filtering
   * @param filter Optional filter criteria
   * @returns Promise resolving to an array of merchants
   */
  getMerchants(filter?: any): Promise<Merchant[]>;
  
  /**
   * Get merchants belonging to a specific organization
   * @param organizationId The organization identifier
   * @returns Promise resolving to an array of merchants
   */
  getMerchantsByOrganization(organizationId: string): Promise<Merchant[]>;
  
  /**
   * Get merchants belonging to a specific program
   * @param programId The program identifier
   * @returns Promise resolving to an array of merchants
   */
  getMerchantsByProgram(programId: string): Promise<Merchant[]>;
  
  /**
   * Get merchants belonging to a specific bank
   * @param bankId The bank identifier
   * @returns Promise resolving to an array of merchants
   */
  getMerchantsByBank(bankId: string): Promise<Merchant[]>;
  
  /**
   * Validate if a merchant exists and is active
   * @param merchantId The merchant identifier to validate
   * @returns Promise resolving to a boolean indicating validity
   */
  validateMerchant(merchantId: string): Promise<boolean>;
  
  /**
   * Get the resolved refund configuration for a merchant
   * This applies the parameter resolution logic to get effective parameters
   * @param merchantId The merchant identifier
   * @returns Promise resolving to the effective refund configuration
   */
  getRefundConfiguration(merchantId: string): Promise<MerchantRefundConfiguration>;
  
  /**
   * Get organization details
   * @param organizationId The organization identifier
   * @returns Promise resolving to the organization details
   */
  getOrganization(organizationId: string): Promise<Organization>;
  
  /**
   * Get program details
   * @param programId The program identifier
   * @returns Promise resolving to the program details
   */
  getProgram(programId: string): Promise<Program>;
  
  /**
   * Get bank details
   * @param bankId The bank identifier
   * @returns Promise resolving to the bank details
   */
  getBank(bankId: string): Promise<Bank>;
}