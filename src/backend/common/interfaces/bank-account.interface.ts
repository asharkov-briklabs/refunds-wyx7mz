/**
 * Bank Account Interfaces and Enums
 * 
 * This file defines the TypeScript interfaces and enums for bank account data structures
 * used throughout the Refunds Service. These interfaces support the 'OTHER' refund method
 * when original payment methods are unavailable.
 */

/**
 * Bank account types
 */
export enum BankAccountType {
  CHECKING = 'CHECKING',
  SAVINGS = 'SAVINGS'
}

/**
 * Status values for bank accounts
 */
export enum BankAccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED'
}

/**
 * Verification status values for bank accounts
 */
export enum BankAccountVerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED'
}

/**
 * Verification methods for bank accounts
 */
export enum BankAccountVerificationMethod {
  MICRO_DEPOSIT = 'MICRO_DEPOSIT',
  INSTANT_VERIFICATION = 'INSTANT_VERIFICATION'
}

/**
 * Represents a bank account entity with all its attributes
 */
export interface IBankAccount {
  /** Unique identifier for the bank account */
  accountId: string;
  
  /** ID of the merchant who owns this bank account */
  merchantId: string;
  
  /** Name of the account holder */
  accountHolderName: string;
  
  /** Type of bank account (checking or savings) */
  accountType: BankAccountType;
  
  /** Bank routing number */
  routingNumber: string;
  
  /** Last 4 digits of the account number (for display/reference purposes) */
  accountNumberLast4: string;
  
  /** Current status of the bank account */
  status: BankAccountStatus;
  
  /** Current verification status of the bank account */
  verificationStatus: BankAccountVerificationStatus;
  
  /** Method used or to be used for verification */
  verificationMethod: BankAccountVerificationMethod;
  
  /** Whether this is the default account for refunds */
  isDefault: boolean;
  
  /** When the account was created */
  createdAt: Date;
  
  /** When the account was last updated */
  updatedAt: Date;
}

/**
 * Data structure for creating a new bank account
 */
export interface BankAccountCreationRequest {
  /** ID of the merchant who owns this bank account */
  merchantId: string;
  
  /** Name of the account holder */
  accountHolderName: string;
  
  /** Type of bank account (checking or savings) */
  accountType: BankAccountType;
  
  /** Bank routing number */
  routingNumber: string;
  
  /** Full account number (will be encrypted and stored securely) */
  accountNumber: string;
  
  /** Whether this should be the default account for refunds */
  isDefault: boolean;
  
  /** Whether to start verification process immediately */
  initiateVerification: boolean;
  
  /** Preferred verification method if initiating verification */
  verificationMethod: BankAccountVerificationMethod;
}

/**
 * Data structure for updating an existing bank account
 */
export interface BankAccountUpdateRequest {
  /** Updated name of the account holder (optional) */
  accountHolderName?: string;
  
  /** Whether this should be the default account for refunds (optional) */
  isDefault?: boolean;
  
  /** Updated status of the bank account (optional) */
  status?: BankAccountStatus;
}

/**
 * Data structure for completing a bank account verification
 */
export interface BankAccountVerificationRequest {
  /** ID of the verification process */
  verificationId: string;
  
  /** ID of the bank account being verified */
  accountId: string;
  
  /** Verification data specific to the verification method (e.g. micro-deposit amounts) */
  verificationData: any;
}

/**
 * Represents the verification details for a bank account
 */
export interface BankAccountVerification {
  /** Unique identifier for the verification process */
  verificationId: string;
  
  /** ID of the bank account being verified */
  accountId: string;
  
  /** Method used for verification */
  verificationMethod: BankAccountVerificationMethod;
  
  /** Current status of the verification */
  status: BankAccountVerificationStatus;
  
  /** Verification data specific to the verification method */
  verificationData: any;
  
  /** When verification was initiated */
  initiatedAt: Date;
  
  /** When verification was completed (if applicable) */
  completedAt?: Date;
  
  /** When the verification will expire if not completed */
  expirationTime: Date;
}

/**
 * API response structure for bank accounts with sensitive data masked
 */
export interface BankAccountResponse {
  /** Unique identifier for the bank account */
  accountId: string;
  
  /** ID of the merchant who owns this bank account */
  merchantId: string;
  
  /** Name of the account holder */
  accountHolderName: string;
  
  /** Type of bank account (checking or savings) */
  accountType: BankAccountType;
  
  /** Bank routing number (may be partially masked depending on context) */
  routingNumber: string;
  
  /** Last 4 digits of the account number */
  accountNumberLast4: string;
  
  /** Current status of the bank account */
  status: BankAccountStatus;
  
  /** Current verification status of the bank account */
  verificationStatus: BankAccountVerificationStatus;
  
  /** Whether this is the default account for refunds */
  isDefault: boolean;
  
  /** When the account was created (ISO string format) */
  createdAt: string;
  
  /** When the account was last updated (ISO string format) */
  updatedAt: string;
}