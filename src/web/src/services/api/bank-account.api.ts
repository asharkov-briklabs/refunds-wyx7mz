/**
 * Bank Account API Service
 *
 * This service handles all API operations related to bank account management,
 * including creating, retrieving, updating, and deleting bank accounts, as well
 * as bank account verification processes for the Refunds Service.
 */

import apiClient from './api.client';
import { BANK_ACCOUNT_ENDPOINTS } from '../../constants/api.constants';
import { ApiResponse } from '../../types/api.types';
import {
  BankAccount,
  BankAccountCreationRequest,
  BankAccountUpdateRequest,
  BankAccountListParams,
  BankAccountsListResponse,
  BankAccountVerificationMethod,
  BankAccountVerificationRequest,
  VerificationResponse,
  MicroDepositVerificationData
} from '../../types/bank-account.types';

/**
 * Fetches a paginated list of bank accounts for a merchant
 * @param params Query parameters for filtering and pagination
 * @returns Promise resolving to bank account list response
 */
const getBankAccounts = async (
  params: BankAccountListParams
): Promise<ApiResponse<BankAccountsListResponse>> => {
  // Prepare query parameters from BankAccountListParams
  const queryParams = {
    merchantId: params.merchantId,
    status: params.status,
    verificationStatus: params.verificationStatus,
    page: params.page,
    pageSize: params.pageSize
  };

  // Make GET request to bank accounts endpoint with query parameters
  return apiClient.get<BankAccountsListResponse>(
    BANK_ACCOUNT_ENDPOINTS.BASE,
    queryParams
  );
};

/**
 * Fetches a specific bank account by its ID
 * @param accountId Bank account ID
 * @returns Promise resolving to bank account data
 */
const getBankAccountById = async (
  accountId: string
): Promise<ApiResponse<BankAccount>> => {
  // Validate accountId parameter
  if (!accountId) {
    throw new Error('Account ID is required');
  }

  // Construct endpoint URL with accountId
  const endpoint = BANK_ACCOUNT_ENDPOINTS.GET_BY_ID(accountId);

  // Make GET request to fetch the specific bank account
  return apiClient.get<BankAccount>(endpoint);
};

/**
 * Creates a new bank account for a merchant
 * @param accountData Bank account creation data
 * @returns Promise resolving to created bank account data
 */
const createBankAccount = async (
  accountData: BankAccountCreationRequest
): Promise<ApiResponse<BankAccount>> => {
  // Validate accountData fields for required values
  if (!accountData.merchantId || !accountData.accountHolderName || 
      !accountData.routingNumber || !accountData.accountNumber ||
      !accountData.accountType) {
    throw new Error('Required bank account fields are missing');
  }

  // Make POST request to create bank account endpoint with account data
  return apiClient.post<BankAccount>(
    BANK_ACCOUNT_ENDPOINTS.CREATE,
    accountData
  );
};

/**
 * Updates an existing bank account
 * @param accountId Bank account ID
 * @param accountData Bank account update data
 * @returns Promise resolving to updated bank account data
 */
const updateBankAccount = async (
  accountId: string,
  accountData: BankAccountUpdateRequest
): Promise<ApiResponse<BankAccount>> => {
  // Validate accountId parameter
  if (!accountId) {
    throw new Error('Account ID is required');
  }
  
  // Validate accountData for update properties
  if (!accountData || Object.keys(accountData).length === 0) {
    throw new Error('Update data is required');
  }

  // Construct endpoint URL with accountId
  const endpoint = BANK_ACCOUNT_ENDPOINTS.UPDATE(accountId);

  // Make PUT request to update the bank account with account data
  return apiClient.put<BankAccount>(endpoint, accountData);
};

/**
 * Deletes a bank account by its ID
 * @param accountId Bank account ID
 * @returns Promise resolving to success confirmation
 */
const deleteBankAccount = async (
  accountId: string
): Promise<ApiResponse<{ success: boolean }>> => {
  // Validate accountId parameter
  if (!accountId) {
    throw new Error('Account ID is required');
  }

  // Construct endpoint URL with accountId
  const endpoint = BANK_ACCOUNT_ENDPOINTS.DELETE(accountId);

  // Make DELETE request to delete the bank account
  return apiClient.delete<{ success: boolean }>(endpoint);
};

/**
 * Initiates the verification process for a bank account
 * @param accountId Bank account ID
 * @param method Verification method
 * @returns Promise resolving to verification response
 */
const initiateVerification = async (
  accountId: string,
  method: BankAccountVerificationMethod
): Promise<ApiResponse<VerificationResponse>> => {
  // Validate accountId parameter
  if (!accountId) {
    throw new Error('Account ID is required');
  }
  
  // Validate verification method parameter
  if (!Object.values(BankAccountVerificationMethod).includes(method)) {
    throw new Error('Invalid verification method');
  }

  // Construct endpoint URL with accountId
  const endpoint = BANK_ACCOUNT_ENDPOINTS.VERIFY(accountId);

  // Make POST request to initiate verification with method data
  return apiClient.post<VerificationResponse>(endpoint, { method });
};

/**
 * Checks the current verification status for a bank account
 * @param accountId Bank account ID
 * @returns Promise resolving to verification status
 */
const getVerificationStatus = async (
  accountId: string
): Promise<ApiResponse<VerificationResponse>> => {
  // Validate accountId parameter
  if (!accountId) {
    throw new Error('Account ID is required');
  }

  // Construct endpoint URL with accountId
  const endpoint = BANK_ACCOUNT_ENDPOINTS.VERIFY_STATUS(accountId);

  // Make GET request to verification status endpoint
  return apiClient.get<VerificationResponse>(endpoint);
};

/**
 * Completes the verification process for a bank account
 * @param verificationData Verification completion data
 * @returns Promise resolving to verification result
 */
const completeVerification = async (
  verificationData: BankAccountVerificationRequest
): Promise<ApiResponse<VerificationResponse>> => {
  // Validate verification data for required fields
  if (!verificationData.accountId || !verificationData.verificationMethod) {
    throw new Error('Required verification fields are missing');
  }

  // Make POST request to complete verification endpoint with verification data
  return apiClient.post<VerificationResponse>(
    BANK_ACCOUNT_ENDPOINTS.COMPLETE_VERIFICATION,
    verificationData
  );
};

/**
 * Helper method to complete micro-deposit verification
 * @param accountId Bank account ID
 * @param depositData Micro-deposit verification data
 * @returns Promise resolving to verification result
 */
const completeMicroDepositVerification = async (
  accountId: string,
  depositData: MicroDepositVerificationData
): Promise<ApiResponse<VerificationResponse>> => {
  // Validate accountId parameter
  if (!accountId) {
    throw new Error('Account ID is required');
  }
  
  // Validate deposit data for required amounts
  if (depositData.amount1 === undefined || depositData.amount2 === undefined) {
    throw new Error('Both deposit amounts are required');
  }

  // Prepare verification request with micro-deposit data
  const verificationRequest: BankAccountVerificationRequest = {
    accountId,
    verificationMethod: BankAccountVerificationMethod.MICRO_DEPOSIT,
    verificationData: depositData
  };

  // Call completeVerification with prepared request
  return completeVerification(verificationRequest);
};

/**
 * Sets a bank account as the default for a merchant
 * @param accountId Bank account ID
 * @returns Promise resolving to updated bank account
 */
const setDefaultBankAccount = async (
  accountId: string
): Promise<ApiResponse<BankAccount>> => {
  // Validate accountId parameter
  if (!accountId) {
    throw new Error('Account ID is required');
  }

  // Prepare update request with isDefault set to true
  const updateData: BankAccountUpdateRequest = {
    isDefault: true
  };

  // Call updateBankAccount with the prepared request
  return updateBankAccount(accountId, updateData);
};

// Export all bank account API functions
export default {
  getBankAccounts,
  getBankAccountById,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  initiateVerification,
  getVerificationStatus,
  completeVerification,
  completeMicroDepositVerification,
  setDefaultBankAccount
};