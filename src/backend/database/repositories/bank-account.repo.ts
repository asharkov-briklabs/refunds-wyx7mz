import mongoose from 'mongoose'; // mongoose ^6.0.0
import { BankAccountModel, IBankAccountDocument } from '../models/bank-account.model';
import { 
  BankAccountType, 
  BankAccountStatus, 
  BankAccountVerificationStatus,
  BankAccountCreationRequest,
  BankAccountUpdateRequest
} from '../../common/interfaces/bank-account.interface';
import { hashData, encryptData } from '../../common/utils/encryption-utils';
import { logger } from '../../common/utils/logger';
import config from '../../config';
import { ApiError } from '../../common/errors/api-error';
import { ErrorCode } from '../../common/constants/error-codes';

/**
 * Repository class for managing bank account data in MongoDB
 * 
 * Provides methods for creating, reading, updating, and deleting bank account information,
 * with appropriate handling of sensitive data encryption and verification status management.
 */
export class BankAccountRepository {
  private BankAccountModel: mongoose.Model<IBankAccountDocument>;
  private keyId: string;

  /**
   * Initializes the repository with the bank account model
   */
  constructor() {
    this.BankAccountModel = BankAccountModel;
    this.keyId = config.security.encryptionKey;
  }

  /**
   * Creates a new bank account record with encrypted account information
   * 
   * @param accountData - Bank account creation request data
   * @returns The created bank account document
   * @throws ApiError if account creation fails or duplicate account exists
   */
  async create(accountData: BankAccountCreationRequest): Promise<IBankAccountDocument> {
    try {
      // Check if account with same details already exists
      const accountExists = await this.checkAccountExists(accountData.accountNumber, accountData.merchantId);
      if (accountExists) {
        throw new ApiError(
          ErrorCode.DUPLICATE_BANK_ACCOUNT,
          'A bank account with this account number already exists for this merchant'
        );
      }

      // Create hash of account number for secure lookups
      const accountNumberHash = hashData(accountData.accountNumber);
      
      // Encrypt the full account number with KMS
      const { encryptedData, keyId } = await encryptData(accountData.accountNumber, this.keyId);
      
      // Extract last 4 digits of account number for display purposes
      const accountNumberLast4 = accountData.accountNumber.slice(-4);
      
      // If this is the default account, unset any existing default accounts
      if (accountData.isDefault) {
        await this.unsetDefaultForMerchant(accountData.merchantId);
      }
      
      // Create new bank account document
      const bankAccount = new this.BankAccountModel({
        merchantId: accountData.merchantId,
        accountHolderName: accountData.accountHolderName,
        accountType: accountData.accountType,
        routingNumber: accountData.routingNumber,
        accountNumberHash: accountNumberHash,
        accountNumberEncrypted: encryptedData,
        accountNumberLast4: accountNumberLast4,
        encryptionKeyId: keyId,
        status: BankAccountStatus.ACTIVE,
        verificationStatus: BankAccountVerificationStatus.UNVERIFIED,
        isDefault: accountData.isDefault,
        verificationMethod: accountData.verificationMethod
      });
      
      // Save to database
      const savedAccount = await bankAccount.save();
      
      logger.info('Bank account created', {
        accountId: savedAccount.accountId,
        merchantId: savedAccount.merchantId,
        isDefault: savedAccount.isDefault
      });
      
      return savedAccount;
    } catch (error) {
      logger.error('Error creating bank account', { 
        merchantId: accountData.merchantId,
        error: error.message 
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.BANK_ACCOUNT_OPERATION_FAILED,
        'Failed to create bank account',
        { originalError: error.message }
      );
    }
  }

  /**
   * Retrieves a bank account by its ID
   * 
   * @param accountId - ID of the bank account to retrieve
   * @returns The bank account document or null if not found
   * @throws ApiError if operation fails
   */
  async findById(accountId: string): Promise<IBankAccountDocument | null> {
    try {
      if (!accountId) {
        throw new ApiError(ErrorCode.INVALID_INPUT, 'Account ID is required');
      }

      const account = await this.BankAccountModel.findByAccountId(accountId);
      return account;
    } catch (error) {
      logger.error('Error finding bank account by ID', { 
        accountId,
        error: error.message 
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.BANK_ACCOUNT_OPERATION_FAILED,
        'Failed to find bank account',
        { originalError: error.message }
      );
    }
  }

  /**
   * Retrieves all bank accounts for a merchant
   * 
   * @param merchantId - ID of the merchant
   * @returns Array of bank account documents
   * @throws ApiError if operation fails
   */
  async findByMerchantId(merchantId: string): Promise<IBankAccountDocument[]> {
    try {
      if (!merchantId) {
        throw new ApiError(ErrorCode.INVALID_INPUT, 'Merchant ID is required');
      }

      const accounts = await this.BankAccountModel.findByMerchantId(merchantId);
      return accounts;
    } catch (error) {
      logger.error('Error finding bank accounts by merchant ID', { 
        merchantId,
        error: error.message 
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.BANK_ACCOUNT_OPERATION_FAILED,
        'Failed to find merchant bank accounts',
        { originalError: error.message }
      );
    }
  }

  /**
   * Retrieves the default bank account for a merchant
   * 
   * @param merchantId - ID of the merchant
   * @returns The default bank account document or null if not found
   * @throws ApiError if operation fails
   */
  async findDefaultForMerchant(merchantId: string): Promise<IBankAccountDocument | null> {
    try {
      if (!merchantId) {
        throw new ApiError(ErrorCode.INVALID_INPUT, 'Merchant ID is required');
      }

      const account = await this.BankAccountModel.findDefaultForMerchant(merchantId);
      return account;
    } catch (error) {
      logger.error('Error finding default bank account for merchant', { 
        merchantId,
        error: error.message 
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.BANK_ACCOUNT_OPERATION_FAILED,
        'Failed to find default bank account',
        { originalError: error.message }
      );
    }
  }

  /**
   * Updates a bank account with new information
   * 
   * @param accountId - ID of the bank account to update
   * @param updateData - Data to update
   * @returns The updated bank account document or null if not found
   * @throws ApiError if operation fails
   */
  async update(accountId: string, updateData: BankAccountUpdateRequest): Promise<IBankAccountDocument | null> {
    try {
      if (!accountId) {
        throw new ApiError(ErrorCode.INVALID_INPUT, 'Account ID is required');
      }

      // Find the account to update
      const account = await this.BankAccountModel.findByAccountId(accountId);
      if (!account) {
        throw new ApiError(ErrorCode.BANK_ACCOUNT_NOT_FOUND, 'Bank account not found');
      }

      // If setting as default, unset any other default accounts
      if (updateData.isDefault === true) {
        await this.unsetDefaultForMerchant(account.merchantId);
      }

      // Update the account fields
      if (updateData.accountHolderName !== undefined) {
        account.accountHolderName = updateData.accountHolderName;
      }
      
      if (updateData.isDefault !== undefined) {
        account.isDefault = updateData.isDefault;
      }
      
      if (updateData.status !== undefined) {
        account.status = updateData.status;
      }

      // Save the updated account
      const updatedAccount = await account.save();
      
      logger.info('Bank account updated', {
        accountId,
        merchantId: updatedAccount.merchantId,
        isDefault: updatedAccount.isDefault,
        status: updatedAccount.status
      });
      
      return updatedAccount;
    } catch (error) {
      logger.error('Error updating bank account', { 
        accountId,
        error: error.message 
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.BANK_ACCOUNT_OPERATION_FAILED,
        'Failed to update bank account',
        { originalError: error.message }
      );
    }
  }

  /**
   * Updates the verification status of a bank account
   * 
   * @param accountId - ID of the bank account
   * @param status - New verification status
   * @param verificationMethod - Method used for verification
   * @returns The updated bank account document or null if not found
   * @throws ApiError if operation fails
   */
  async setVerificationStatus(
    accountId: string, 
    status: BankAccountVerificationStatus,
    verificationMethod?: string
  ): Promise<IBankAccountDocument | null> {
    try {
      if (!accountId) {
        throw new ApiError(ErrorCode.INVALID_INPUT, 'Account ID is required');
      }

      // Find the account
      const account = await this.BankAccountModel.findByAccountId(accountId);
      if (!account) {
        throw new ApiError(ErrorCode.BANK_ACCOUNT_NOT_FOUND, 'Bank account not found');
      }

      // Update verification status and method
      account.verificationStatus = status;
      
      if (verificationMethod) {
        account.verificationMethod = verificationMethod;
      }

      // Save the updated account
      const updatedAccount = await account.save();
      
      logger.info('Bank account verification status updated', {
        accountId,
        merchantId: updatedAccount.merchantId,
        verificationStatus: status
      });
      
      return updatedAccount;
    } catch (error) {
      logger.error('Error updating bank account verification status', { 
        accountId,
        status,
        error: error.message 
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.BANK_ACCOUNT_OPERATION_FAILED,
        'Failed to update bank account verification status',
        { originalError: error.message }
      );
    }
  }

  /**
   * Soft-deletes a bank account by setting its status to DELETED
   * 
   * @param accountId - ID of the bank account to delete
   * @returns The deleted bank account document or null if not found
   * @throws ApiError if operation fails
   */
  async delete(accountId: string): Promise<IBankAccountDocument | null> {
    try {
      if (!accountId) {
        throw new ApiError(ErrorCode.INVALID_INPUT, 'Account ID is required');
      }

      // Find the account
      const account = await this.BankAccountModel.findByAccountId(accountId);
      if (!account) {
        throw new ApiError(ErrorCode.BANK_ACCOUNT_NOT_FOUND, 'Bank account not found');
      }

      // Set status to DELETED
      account.status = BankAccountStatus.DELETED;
      
      // If this was the default account, find another account to set as default
      if (account.isDefault) {
        account.isDefault = false;
        
        // Find another active account to set as default
        const activeAccount = await this.BankAccountModel.findOne({
          merchantId: account.merchantId,
          status: BankAccountStatus.ACTIVE,
          accountId: { $ne: accountId }
        });
        
        if (activeAccount) {
          activeAccount.isDefault = true;
          await activeAccount.save();
        }
      }

      // Save the updated account
      const deletedAccount = await account.save();
      
      logger.info('Bank account deleted', {
        accountId,
        merchantId: deletedAccount.merchantId
      });
      
      return deletedAccount;
    } catch (error) {
      logger.error('Error deleting bank account', { 
        accountId,
        error: error.message 
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.BANK_ACCOUNT_OPERATION_FAILED,
        'Failed to delete bank account',
        { originalError: error.message }
      );
    }
  }

  /**
   * Checks if an account with the same account number already exists
   * 
   * @param accountNumber - The account number to check
   * @param merchantId - The merchant ID to check
   * @returns True if a duplicate account exists, false otherwise
   * @throws ApiError if operation fails
   */
  async checkAccountExists(accountNumber: string, merchantId: string): Promise<boolean> {
    try {
      // Create hash of account number
      const accountNumberHash = hashData(accountNumber);
      
      // Look up by hash
      const existingAccount = await this.BankAccountModel.findByAccountNumberHash(accountNumberHash);
      
      // If found and belongs to same merchant, it's a duplicate
      if (existingAccount && existingAccount.merchantId === merchantId && existingAccount.status !== BankAccountStatus.DELETED) {
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Error checking if bank account exists', { 
        merchantId,
        error: error.message 
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.BANK_ACCOUNT_OPERATION_FAILED,
        'Failed to check if bank account exists',
        { originalError: error.message }
      );
    }
  }

  /**
   * Unsets the default flag for all of a merchant's bank accounts
   * 
   * @param merchantId - ID of the merchant
   * @throws ApiError if operation fails
   */
  async unsetDefaultForMerchant(merchantId: string): Promise<void> {
    try {
      if (!merchantId) {
        throw new ApiError(ErrorCode.INVALID_INPUT, 'Merchant ID is required');
      }

      // Update all accounts for this merchant to not be default
      await this.BankAccountModel.updateMany(
        { merchantId, isDefault: true },
        { $set: { isDefault: false } }
      );
      
      logger.info('Unset default bank accounts for merchant', { merchantId });
    } catch (error) {
      logger.error('Error unsetting default bank accounts for merchant', { 
        merchantId,
        error: error.message 
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.BANK_ACCOUNT_OPERATION_FAILED,
        'Failed to unset default bank accounts',
        { originalError: error.message }
      );
    }
  }
}

// Export the repository class and a singleton instance
export default new BankAccountRepository();