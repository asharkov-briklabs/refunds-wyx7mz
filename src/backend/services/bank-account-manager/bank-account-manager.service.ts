import { v4 as uuid } from 'uuid'; // uuid ^8.3.2
import {
  BankAccountRepository,
} from '../../database/repositories/bank-account.repo';
import {
  IBankAccount,
  BankAccountCreationRequest,
  BankAccountUpdateRequest,
  BankAccountVerificationRequest,
  BankAccountResponse,
  BankAccountType,
  BankAccountStatus,
  BankAccountVerificationStatus,
  BankAccountVerificationMethod,
} from '../../common/interfaces/bank-account.interface';
import {
  BankAccountVerifier,
} from './verifier';
import {
  BankAccountEncryption,
} from './encryption';
import {
  validateRoutingNumber, validateAccountNumber
} from './validators';
import {
  createMerchantServiceClient
} from '../../integrations/merchant-service/client';
import {
  MerchantResponse
} from '../../integrations/merchant-service/types';
import logger from '../../common/utils/logger';
import { ApiError } from '../../common/errors/api-error';
import { ErrorCode } from '../../common/constants/error-codes';
import { checkUserPermission } from '../../common/middleware/authorization';
import config from '../../config';

/**
 * Service that manages all bank account operations for the Refunds Service
 */
export class BankAccountManager {
  /**
   * Initialize the Bank Account Manager with required dependencies
   * @param bankAccountRepository 
   * @param bankAccountVerifier 
   */
  constructor(
    private readonly bankAccountRepository: BankAccountRepository,
    private readonly bankAccountVerifier: BankAccountVerifier,
  ) {
    // Store the bank account repository instance
    this.bankAccountRepository = bankAccountRepository;
    // Store the bank account verifier instance
    this.bankAccountVerifier = bankAccountVerifier;
    // Create bank account encryption instance with security key ID from config
    this.bankAccountEncryption = new BankAccountEncryption(config.security.encryptionKey);
    // Create merchant service client instance
    this.merchantServiceClient = createMerchantServiceClient();
    // Log initialization of bank account manager
    logger.info('BankAccountManager initialized');
  }

  private readonly bankAccountEncryption: BankAccountEncryption;
  private readonly merchantServiceClient: ReturnType<typeof createMerchantServiceClient>;

  /**
   * Creates a new bank account with proper validation and encryption
   * @param accountData 
   * @param userId 
   * @returns Newly created bank account with sensitive data masked
   */
  async createBankAccount(
    accountData: BankAccountCreationRequest,
    userId: string
  ): Promise<BankAccountResponse> {
    // Validate merchant exists by calling merchant service
    let merchant: MerchantResponse;
    try {
      merchant = await this.merchantServiceClient.getMerchant(accountData.merchantId);
    } catch (error) {
      logger.error('Error validating merchant', { merchantId: accountData.merchantId, error });
      throw new ApiError(ErrorCode.MERCHANT_NOT_FOUND, 'Merchant not found');
    }

    // Validate user has permission to manage bank accounts for this merchant
    checkUserPermission({ id: userId, roles: [], permissions: [] }, { action: 'manage', resource: 'bank-account' }, accountData.merchantId);

    // Validate bank account details (routing number, account number format)
    const routingNumberValidation = validateRoutingNumber(accountData.routingNumber);
    if (!routingNumberValidation.success) {
      throw new ApiError(ErrorCode.INVALID_BANK_ACCOUNT, 'Invalid routing number', { errors: routingNumberValidation.errors });
    }

    const accountNumberValidation = validateAccountNumber(accountData.accountNumber);
    if (!accountNumberValidation.success) {
      throw new ApiError(ErrorCode.INVALID_BANK_ACCOUNT, 'Invalid account number', { errors: accountNumberValidation.errors });
    }

    // Check if duplicate account already exists for this merchant
    const accountExists = await this.bankAccountRepository.checkAccountExists(accountData.accountNumber, accountData.merchantId);
    if (accountExists) {
      throw new ApiError(ErrorCode.DUPLICATE_BANK_ACCOUNT, 'A bank account with this account number already exists for this merchant');
    }

    // Encrypt account number using KMS envelope encryption
    const { encryptedData, keyId } = await this.bankAccountEncryption.encryptAccountNumber(accountData.accountNumber);

    // Create bank account record with encrypted data
    const newAccount = {
      ...accountData,
      accountNumberEncrypted: encryptedData,
      encryptionKeyId: keyId,
    };

    const bankAccount = await this.bankAccountRepository.create(newAccount);

    // If account is set as default, update other accounts accordingly
    if (accountData.isDefault) {
      await this.bankAccountRepository.findDefaultForMerchant(accountData.merchantId);
    }

    // If verification is requested, initiate the appropriate verification method
    if (accountData.initiateVerification) {
      await this.bankAccountVerifier.initiateVerification(bankAccount.accountId, accountData.verificationMethod);
    }

    // Return masked bank account response without sensitive data
    const response = this.transformToResponse(bankAccount);

    // Log bank account creation with non-sensitive information
    logger.info('Bank account created', {
      accountId: response.accountId,
      merchantId: response.merchantId,
      isDefault: response.isDefault,
    });

    return response;
  }

  /**
   * Retrieves a bank account by ID with appropriate access control
   * @param accountId 
   * @param userId 
   * @returns Bank account with sensitive data masked
   */
  async getBankAccount(
    accountId: string,
    userId: string
  ): Promise<BankAccountResponse> {
    // Validate accountId parameter
    if (!accountId) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Account ID is required');
    }

    // Retrieve bank account from repository
    const bankAccount = await this.bankAccountRepository.findById(accountId);

    // If account not found, throw BANK_ACCOUNT_NOT_FOUND error
    if (!bankAccount) {
      throw new ApiError(ErrorCode.BANK_ACCOUNT_NOT_FOUND, 'Bank account not found');
    }

    // Verify user has permission to access this account
    checkUserPermission({ id: userId, roles: [], permissions: [] }, { action: 'read', resource: 'bank-account' }, bankAccount.accountId);

    // Transform to response object with masked sensitive data
    const response = this.transformToResponse(bankAccount);

    // Return the bank account response
    logger.info('Bank account retrieved', {
      accountId: response.accountId,
      merchantId: response.merchantId,
    });
    return response;
  }

  /**
   * Retrieves all bank accounts for a merchant with appropriate access control
   * @param merchantId 
   * @param userId 
   * @returns List of bank accounts with sensitive data masked
   */
  async getMerchantBankAccounts(
    merchantId: string,
    userId: string
  ): Promise<BankAccountResponse[]> {
    // Validate merchantId parameter
    if (!merchantId) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Merchant ID is required');
    }

    // Verify user has permission to access accounts for this merchant
    checkUserPermission({ id: userId, roles: [], permissions: [] }, { action: 'read', resource: 'bank-account' }, merchantId);

    // Retrieve all bank accounts for the merchant from repository
    const bankAccounts = await this.bankAccountRepository.findByMerchantId(merchantId);

    // Transform each account to response object with masked sensitive data
    const response = bankAccounts.map(account => this.transformToResponse(account));

    // Return the list of bank account responses
    logger.info('Bank accounts retrieved for merchant', {
      merchantId: merchantId,
      count: response.length,
    });
    return response;
  }

  /**
   * Retrieves the default bank account for a merchant with appropriate access control
   * @param merchantId 
   * @param userId 
   * @returns Default bank account with sensitive data masked or null if none exists
   */
  async getDefaultBankAccount(
    merchantId: string,
    userId: string
  ): Promise<BankAccountResponse | null> {
    // Validate merchantId parameter
    if (!merchantId) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Merchant ID is required');
    }

    // Verify user has permission to access accounts for this merchant
    checkUserPermission({ id: userId, roles: [], permissions: [] }, { action: 'read', resource: 'bank-account' }, merchantId);

    // Retrieve default bank account for the merchant from repository
    const bankAccount = await this.bankAccountRepository.findDefaultForMerchant(merchantId);

    // If no default account exists, return null
    if (!bankAccount) {
      logger.info('No default bank account found for merchant', { merchantId });
      return null;
    }

    // Transform account to response object with masked sensitive data
    const response = this.transformToResponse(bankAccount);

    // Return the default bank account response
    logger.info('Default bank account retrieved for merchant', {
      merchantId: merchantId,
      accountId: response.accountId,
    });
    return response;
  }

  /**
   * Updates a bank account with appropriate validation and access control
   * @param accountId 
   * @param updateData 
   * @param userId 
   * @returns Updated bank account with sensitive data masked
   */
  async updateBankAccount(
    accountId: string,
    updateData: BankAccountUpdateRequest,
    userId: string
  ): Promise<BankAccountResponse> {
    // Validate accountId parameter and update data
    if (!accountId) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Account ID is required');
    }

    // Retrieve bank account from repository
    const bankAccount = await this.bankAccountRepository.findById(accountId);

    // If account not found, throw BANK_ACCOUNT_NOT_FOUND error
    if (!bankAccount) {
      throw new ApiError(ErrorCode.BANK_ACCOUNT_NOT_FOUND, 'Bank account not found');
    }

    // Verify user has permission to update this account
    checkUserPermission({ id: userId, roles: [], permissions: [] }, { action: 'update', resource: 'bank-account' }, bankAccount.accountId);

    // Apply updates to account (account holder name, status, default flag)
    const updatedAccount = await this.bankAccountRepository.update(accountId, updateData);

    // If account is being set as default, update other accounts accordingly
    if (updateData.isDefault) {
      await this.bankAccountRepository.findDefaultForMerchant(bankAccount.merchantId);
    }

    // Transform to response object with masked sensitive data
    const response = this.transformToResponse(updatedAccount);

    // Return the updated bank account response
    logger.info('Bank account updated', {
      accountId: response.accountId,
      merchantId: response.merchantId,
      isDefault: response.isDefault,
      status: response.status,
    });
    return response;
  }

  /**
   * Deletes (soft-deletes) a bank account with appropriate access control
   * @param accountId 
   * @param userId 
   * @returns True if deletion was successful
   */
  async deleteBankAccount(
    accountId: string,
    userId: string
  ): Promise<boolean> {
    // Validate accountId parameter
    if (!accountId) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Account ID is required');
    }

    // Retrieve bank account from repository
    const bankAccount = await this.bankAccountRepository.findById(accountId);

    // If account not found, throw BANK_ACCOUNT_NOT_FOUND error
    if (!bankAccount) {
      throw new ApiError(ErrorCode.BANK_ACCOUNT_NOT_FOUND, 'Bank account not found');
    }

    // Verify user has permission to delete this account
    checkUserPermission({ id: userId, roles: [], permissions: [] }, { action: 'delete', resource: 'bank-account' }, bankAccount.accountId);

    // Call repository delete method (soft-delete implementation)
    await this.bankAccountRepository.delete(accountId);

    // If account was default, ensure another account is marked as default if possible
    if (bankAccount.isDefault) {
      await this.bankAccountRepository.findDefaultForMerchant(bankAccount.merchantId);
    }

    // Return true indicating successful deletion
    logger.info('Bank account deleted', {
      accountId: bankAccount.accountId,
      merchantId: bankAccount.merchantId,
    });
    return true;
  }

  /**
   * Initiates the verification process for a bank account
   * @param accountId 
   * @param method 
   * @param userId 
   * @returns Verification details and instructions
   */
  async initiateVerification(
    accountId: string,
    method: BankAccountVerificationMethod,
    userId: string
  ): Promise<{ verificationId: string; status: BankAccountVerificationStatus; instructions: string }> {
    // Validate accountId parameter and verification method
    if (!accountId) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Account ID is required');
    }
    if (!method) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Verification method is required');
    }

    // Retrieve bank account from repository
    const bankAccount = await this.bankAccountRepository.findById(accountId);

    // If account not found, throw BANK_ACCOUNT_NOT_FOUND error
    if (!bankAccount) {
      throw new ApiError(ErrorCode.BANK_ACCOUNT_NOT_FOUND, 'Bank account not found');
    }

    // Verify user has permission to manage this account
    checkUserPermission({ id: userId, roles: [], permissions: [] }, { action: 'update', resource: 'bank-account' }, bankAccount.accountId);

    // Determine appropriate verification method (MICRO_DEPOSIT or INSTANT_VERIFICATION)
    let verificationResult;
    if (method === BankAccountVerificationMethod.MICRO_DEPOSIT) {
      verificationResult = await this.bankAccountVerifier.initiateMicroDepositVerification(bankAccount);
    } else if (method === BankAccountVerificationMethod.INSTANT_VERIFICATION) {
      verificationResult = await this.bankAccountVerifier.initiateInstantVerification(bankAccount);
    } else {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Invalid verification method');
    }

    // Get user instructions for completing the verification
    const instructions = this.bankAccountVerifier.getVerificationInstructions(method, verificationResult.verificationData);

    // Return verification ID, status, and instructions
    logger.info('Verification initiated', {
      accountId: bankAccount.accountId,
      verificationId: verificationResult.verificationId,
      method: method,
    });
    return {
      verificationId: verificationResult.verificationId,
      status: verificationResult.status,
      instructions: instructions,
    };
  }

  /**
   * Completes the verification process for a bank account
   * @param verificationRequest 
   * @param userId 
   * @returns Result of verification attempt
   */
  async completeVerification(
    verificationRequest: BankAccountVerificationRequest,
    userId: string
  ): Promise<{ success: boolean; status: BankAccountVerificationStatus; message: string }> {
    // Validate verificationRequest parameters
    if (!verificationRequest) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Verification request is required');
    }
    if (!verificationRequest.accountId) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Account ID is required');
    }

    // Retrieve bank account from repository
    const bankAccount = await this.bankAccountRepository.findById(verificationRequest.accountId);

    // If account not found, throw BANK_ACCOUNT_NOT_FOUND error
    if (!bankAccount) {
      throw new ApiError(ErrorCode.BANK_ACCOUNT_NOT_FOUND, 'Bank account not found');
    }

    // Verify user has permission to manage this account
    checkUserPermission({ id: userId, roles: [], permissions: [] }, { action: 'update', resource: 'bank-account' }, bankAccount.accountId);

    // Check current verification status to ensure verification is pending
    if (bankAccount.verificationStatus !== BankAccountVerificationStatus.PENDING) {
      throw new ApiError(ErrorCode.INVALID_STATE, 'Verification is not pending');
    }

    // Determine verification method from account record
    let verificationResult;
    if (bankAccount.verificationMethod === BankAccountVerificationMethod.MICRO_DEPOSIT) {
      // Call appropriate completion method based on verification method
      verificationResult = await this.bankAccountVerifier.completeMicroDepositVerification(verificationRequest);
    } else if (bankAccount.verificationMethod === BankAccountVerificationMethod.INSTANT_VERIFICATION) {
      verificationResult = await this.bankAccountVerifier.completeInstantVerification(verificationRequest);
    } else {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Invalid verification method');
    }

    // Return verification result with success status and message
    logger.info('Verification completed', {
      accountId: bankAccount.accountId,
      status: verificationResult.status,
    });
    return verificationResult;
  }

  /**
   * Checks the current verification status of a bank account
   * @param accountId 
   * @param userId 
   * @returns Current verification status details
   */
  async checkVerificationStatus(
    accountId: string,
    userId: string
  ): Promise<{ status: BankAccountVerificationStatus; method?: BankAccountVerificationMethod; instructions?: string }> {
    // Validate accountId parameter
    if (!accountId) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Account ID is required');
    }

    // Retrieve bank account from repository
    const bankAccount = await this.bankAccountRepository.findById(accountId);

    // If account not found, throw BANK_ACCOUNT_NOT_FOUND error
    if (!bankAccount) {
      throw new ApiError(ErrorCode.BANK_ACCOUNT_NOT_FOUND, 'Bank account not found');
    }

    // Verify user has permission to view this account
    checkUserPermission({ id: userId, roles: [], permissions: [] }, { action: 'read', resource: 'bank-account' }, bankAccount.accountId);

    // Call verifier to check current verification status
    const verificationStatus = await this.bankAccountVerifier.checkVerificationStatus(accountId);

    // If verification is in progress, include appropriate instructions
    let instructions;
    if (verificationStatus.status === BankAccountVerificationStatus.PENDING) {
      instructions = this.bankAccountVerifier.getVerificationInstructions(verificationStatus.method, {});
    }

    // Return status information with relevant details
    logger.info('Verification status checked', {
      accountId: bankAccount.accountId,
      status: verificationStatus.status,
    });
    return {
      status: verificationStatus.status,
      method: verificationStatus.method,
      instructions: instructions,
    };
  }

  /**
   * Cancels an in-progress verification for a bank account
   * @param accountId 
   * @param userId 
   * @returns True if cancellation was successful
   */
  async cancelVerification(
    accountId: string,
    userId: string
  ): Promise<boolean> {
    // Validate accountId parameter
    if (!accountId) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Account ID is required');
    }

    // Retrieve bank account from repository
    const bankAccount = await this.bankAccountRepository.findById(accountId);

    // If account not found, throw BANK_ACCOUNT_NOT_FOUND error
    if (!bankAccount) {
      throw new ApiError(ErrorCode.BANK_ACCOUNT_NOT_FOUND, 'Bank account not found');
    }

    // Verify user has permission to manage this account
    checkUserPermission({ id: userId, roles: [], permissions: [] }, { action: 'update', resource: 'bank-account' }, bankAccount.accountId);

    // Check if verification is in progress
    if (bankAccount.verificationStatus !== BankAccountVerificationStatus.PENDING) {
      throw new ApiError(ErrorCode.INVALID_STATE, 'No verification in progress to cancel');
    }

    // Call verifier to cancel the verification process
    const result = await this.bankAccountVerifier.cancelVerification(accountId);

    // Return true if cancellation successful
    logger.info('Verification cancelled', {
      accountId: bankAccount.accountId,
    });
    return result;
  }

  /**
   * Gets an appropriate bank account for a refund operation
   * @param merchantId 
   * @param bankAccountId 
   * @returns Valid bank account for refund operation
   */
  async getBankAccountForRefund(
    merchantId: string,
    bankAccountId?: string
  ): Promise<IBankAccount> {
    // Validate merchantId parameter
    if (!merchantId) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Merchant ID is required');
    }

    let account: IBankAccountDocument;

    // If specific bankAccountId provided, retrieve that account
    if (bankAccountId) {
      account = await this.bankAccountRepository.findById(bankAccountId);

      // Verify account belongs to merchant
      if (!account || account.merchantId !== merchantId) {
        throw new ApiError(ErrorCode.INVALID_BANK_ACCOUNT, 'Invalid bank account specified');
      }
    } else {
      // Otherwise, retrieve the merchant's default bank account
      account = await this.bankAccountRepository.findDefaultForMerchant(merchantId);

      // If no default account