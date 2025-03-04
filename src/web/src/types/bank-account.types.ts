import { PaginationParams } from './common.types';

/**
 * Enumeration for bank account types
 */
export enum BankAccountType {
  CHECKING = 'CHECKING',
  SAVINGS = 'SAVINGS'
}

/**
 * Enumeration for bank account status
 */
export enum BankAccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED'
}

/**
 * Enumeration for bank account verification status
 */
export enum BankAccountVerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED'
}

/**
 * Enumeration for bank account verification methods
 */
export enum BankAccountVerificationMethod {
  MICRO_DEPOSIT = 'MICRO_DEPOSIT',
  INSTANT_VERIFICATION = 'INSTANT_VERIFICATION'
}

/**
 * Interface representing a bank account entity as returned from the API
 */
export interface BankAccount {
  accountId: string;
  merchantId: string;
  accountHolderName: string;
  accountType: BankAccountType;
  routingNumber: string;
  accountNumberLast4: string;
  status: BankAccountStatus;
  verificationStatus: BankAccountVerificationStatus;
  verificationMethod: BankAccountVerificationMethod | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for bank account form data used in UI components
 */
export interface BankAccountFormData {
  accountHolderName: string;
  accountType: BankAccountType;
  routingNumber: string;
  accountNumber: string;
  confirmAccountNumber: string;
  isDefault: boolean;
  initiateVerification: boolean;
  verificationMethod: BankAccountVerificationMethod;
}

/**
 * Interface for bank account creation API request
 */
export interface BankAccountCreationRequest {
  merchantId: string;
  accountHolderName: string;
  accountType: BankAccountType;
  routingNumber: string;
  accountNumber: string;
  isDefault: boolean;
  initiateVerification: boolean;
  verificationMethod: BankAccountVerificationMethod;
}

/**
 * Interface for bank account update API request
 */
export interface BankAccountUpdateRequest {
  accountHolderName: string;
  isDefault: boolean;
  status: BankAccountStatus;
}

/**
 * Interface for bank account listing query parameters
 */
export interface BankAccountListParams {
  merchantId: string;
  status?: BankAccountStatus;
  verificationStatus?: BankAccountVerificationStatus;
  page: number;
  pageSize: number;
}

/**
 * Interface for paginated bank account list response
 */
export interface BankAccountsListResponse {
  items: BankAccount[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Interface for bank account verification request
 */
export interface BankAccountVerificationRequest {
  accountId: string;
  verificationMethod: BankAccountVerificationMethod;
  verificationData: any;
}

/**
 * Interface for micro-deposit verification data
 */
export interface MicroDepositVerificationData {
  amount1: number;
  amount2: number;
}

/**
 * Interface for verification response data
 */
export interface VerificationResponse {
  verificationId: string;
  accountId: string;
  status: BankAccountVerificationStatus;
  method: BankAccountVerificationMethod;
  initiatedAt: string;
  completedAt: string | null;
  expiresAt: string;
  instructions: string;
}