/**
 * Bank Account Test Fixtures
 * 
 * This module provides pre-configured bank account fixtures and factory functions 
 * for testing bank account functionality in the Refunds Service.
 * 
 * The fixtures cover various scenarios including different:
 * - Account statuses (active, inactive, deleted)
 * - Verification statuses (verified, unverified, pending, failed)
 * - Verification methods (micro-deposit, instant verification)
 * - Account types (checking, savings)
 * 
 * Usage examples:
 * 
 * // Use a pre-configured fixture
 * const bankAccount = mockBankAccounts.verified;
 * 
 * // Create a custom bank account for testing
 * const customAccount = createBankAccount({ 
 *   merchantId: 'my_merchant',
 *   isDefault: true 
 * });
 * 
 * // Use a pre-configured bank account creation request
 * const createRequest = mockBankAccountRequests.valid;
 */

import { v4 as uuid } from 'uuid'; // v9.0.0
import {
  IBankAccount,
  BankAccountType,
  BankAccountStatus,
  BankAccountVerificationStatus,
  BankAccountVerificationMethod,
  BankAccountCreationRequest
} from '../../common/interfaces/bank-account.interface';

/**
 * Creates a bank account fixture with custom properties
 * 
 * @param overrides - Partial bank account properties to override defaults
 * @returns A bank account object for testing
 */
export function createBankAccount(overrides: Partial<IBankAccount> = {}): IBankAccount {
  const now = new Date();
  
  const defaults: IBankAccount = {
    accountId: uuid(),
    merchantId: 'mer_a1b2c3d4e5f6',
    accountHolderName: 'Test Account Holder',
    accountType: BankAccountType.CHECKING,
    routingNumber: '121000358',
    accountNumberLast4: '1234',
    status: BankAccountStatus.ACTIVE,
    verificationStatus: BankAccountVerificationStatus.VERIFIED,
    verificationMethod: BankAccountVerificationMethod.MICRO_DEPOSIT,
    isDefault: false,
    createdAt: now,
    updatedAt: now
  };

  return {
    ...defaults,
    ...overrides
  };
}

/**
 * Creates a bank account creation request fixture with custom properties
 * 
 * @param overrides - Partial creation request properties to override defaults
 * @returns A bank account creation request object for testing
 */
export function createBankAccountRequest(
  overrides: Partial<BankAccountCreationRequest> = {}
): BankAccountCreationRequest {
  const defaults: BankAccountCreationRequest = {
    merchantId: 'mer_a1b2c3d4e5f6',
    accountHolderName: 'Test Account Holder',
    accountType: BankAccountType.CHECKING,
    routingNumber: '121000358',
    accountNumber: '123456789012',
    isDefault: false,
    initiateVerification: true,
    verificationMethod: BankAccountVerificationMethod.MICRO_DEPOSIT
  };

  return {
    ...defaults,
    ...overrides
  };
}

/**
 * List of valid routing numbers for testing
 */
export const validRoutingNumbers = [
  '121000358', // Bank of America
  '021000021', // JPMorgan Chase
  '026009593', // Bank of America
  '011401533', // Bank of America
  '091000022', // US Bank
  '036001808', // Santander
  '071000013', // PNC Bank
  '031100209', // BB&T (now Truist)
  '103113145', // TD Bank
  '325070760'  // Fifth Third Bank
];

/**
 * List of invalid routing numbers for testing
 */
export const invalidRoutingNumbers = [
  '123456789', // Invalid checksum
  '999999999', // Not a real routing number
  '000000000', // All zeros
  '12345678',  // Too short
  '1234567890', // Too long
  '12345678a',  // Contains non-numeric characters
  '121000359'   // Invalid checksum
];

/**
 * Collection of mock bank accounts for different test scenarios
 */
export const mockBankAccounts = {
  // Account status variations
  active: createBankAccount({
    accountId: 'ba_active_01234567890',
    status: BankAccountStatus.ACTIVE
  }),
  
  inactive: createBankAccount({
    accountId: 'ba_inactive_01234567890',
    status: BankAccountStatus.INACTIVE
  }),
  
  deleted: createBankAccount({
    accountId: 'ba_deleted_01234567890',
    status: BankAccountStatus.DELETED
  }),
  
  // Verification status variations
  verified: createBankAccount({
    accountId: 'ba_verified_01234567890',
    verificationStatus: BankAccountVerificationStatus.VERIFIED
  }),
  
  unverified: createBankAccount({
    accountId: 'ba_unverified_01234567890',
    verificationStatus: BankAccountVerificationStatus.UNVERIFIED
  }),
  
  pendingVerification: createBankAccount({
    accountId: 'ba_pending_01234567890',
    verificationStatus: BankAccountVerificationStatus.PENDING
  }),
  
  failedVerification: createBankAccount({
    accountId: 'ba_failed_01234567890',
    verificationStatus: BankAccountVerificationStatus.FAILED
  }),
  
  // Verification method variations
  microDeposit: createBankAccount({
    accountId: 'ba_microdeposit_01234567890',
    verificationMethod: BankAccountVerificationMethod.MICRO_DEPOSIT
  }),
  
  instantVerification: createBankAccount({
    accountId: 'ba_instant_01234567890',
    verificationMethod: BankAccountVerificationMethod.INSTANT_VERIFICATION
  }),
  
  // Account type variations
  checking: createBankAccount({
    accountId: 'ba_checking_01234567890',
    accountType: BankAccountType.CHECKING
  }),
  
  savings: createBankAccount({
    accountId: 'ba_savings_01234567890',
    accountType: BankAccountType.SAVINGS
  }),
  
  // Default status variations
  default: createBankAccount({
    accountId: 'ba_default_01234567890',
    isDefault: true
  }),
  
  nonDefault: createBankAccount({
    accountId: 'ba_nondefault_01234567890',
    isDefault: false
  }),
  
  // Merchant variations
  merchantA: createBankAccount({
    accountId: 'ba_merchantA_01234567890',
    merchantId: 'mer_a1b2c3d4e5f6'
  }),
  
  merchantB: createBankAccount({
    accountId: 'ba_merchantB_01234567890',
    merchantId: 'mer_f6e5d4c3b2a1'
  })
};

/**
 * Collection of mock bank account creation requests for testing
 */
export const mockBankAccountRequests = {
  valid: createBankAccountRequest(),
  
  invalidRouting: createBankAccountRequest({
    routingNumber: invalidRoutingNumbers[0]
  }),
  
  invalidAccount: createBankAccountRequest({
    accountNumber: '123' // Too short
  }),
  
  withMicroDeposit: createBankAccountRequest({
    initiateVerification: true,
    verificationMethod: BankAccountVerificationMethod.MICRO_DEPOSIT
  }),
  
  withInstantVerification: createBankAccountRequest({
    initiateVerification: true,
    verificationMethod: BankAccountVerificationMethod.INSTANT_VERIFICATION
  }),
  
  setAsDefault: createBankAccountRequest({
    isDefault: true
  })
};