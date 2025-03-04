import { Request, Response, NextFunction } from 'express'; // express@4.18.2
import { BankAccountManager } from '../../bank-account-manager/bank-account-manager.service';
import {
  validateBankAccount,
  validateBankAccountUpdate,
  validateVerificationRequest,
  validateMicroDepositAmounts,
  createBankAccountValidationError,
} from '../validators/bank-account.validator';
import {
  BankAccountCreationRequest,
  BankAccountUpdateRequest,
  BankAccountVerificationRequest,
  BankAccountResponse,
  BankAccountVerificationMethod,
} from '../../../common/interfaces/bank-account.interface';
import logger from '../../../common/utils/logger';
import { ValidationError } from '../../../common/errors/validation-error';
import { ApiError } from '../../../common/errors/api-error';
import { ErrorCode } from '../../../common/constants/error-codes';
import { StatusCode } from '../../../common/constants/status-codes';

/**
 * Controller for handling bank account API requests
 */
export class BankAccountController {
  /**
   * Initialize the controller with required dependencies
   * @param bankAccountManager 
   */
  constructor(
    private readonly bankAccountManager: BankAccountManager
  ) {
    // Store the bank account manager instance
    this.bankAccountManager = bankAccountManager;
  }

  /**
   * Create a new bank account
   * @param req 
   * @param res 
   * @param next 
   * @returns Promise<void> Resolves when operation is complete
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract bank account creation data from request body
      const accountData: BankAccountCreationRequest = req.body;

      // Validate bank account data using validateBankAccount
      const validationResult = validateBankAccount(accountData);

      // If validation fails, throw ValidationError
      if (!validationResult.success) {
        throw createBankAccountValidationError(validationResult, 'Invalid bank account data');
      }

      // Get userId from request
      const userId = 'user123'; // TODO: Replace with actual user ID from authentication

      // Call bankAccountManager.createBankAccount with data and userId
      const newAccount = await this.bankAccountManager.createBankAccount(accountData, userId);

      // Return HTTP 201 with created bank account response
      res.status(StatusCode.CREATED).json(newAccount);
    } catch (error) {
      // Catch and forward any errors to next middleware
      next(error);
    }
  }

  /**
   * Get bank account by ID
   * @param req 
   * @param res 
   * @param next 
   * @returns Promise<void> Resolves when operation is complete
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract accountId from request parameters
      const accountId: string = req.params.accountId;

      // Get userId from request
      const userId = 'user123'; // TODO: Replace with actual user ID from authentication

      // Call bankAccountManager.getBankAccount with accountId and userId
      const bankAccount = await this.bankAccountManager.getBankAccount(accountId, userId);

      // Return HTTP 200 with bank account response
      res.status(StatusCode.OK).json(bankAccount);
    } catch (error) {
      // Catch and forward any errors to next middleware
      next(error);
    }
  }

  /**
   * List bank accounts for a merchant
   * @param req 
   * @param res 
   * @param next 
   * @returns Promise<void> Resolves when operation is complete
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract merchantId from query parameters
      const merchantId: string = req.query.merchantId as string;

      // If merchantId is missing, throw InvalidRequestError
      if (!merchantId) {
        throw new ApiError(ErrorCode.INVALID_REQUEST, 'Merchant ID is required');
      }

      // Extract page and limit parameters from query
      const page: number = parseInt(req.query.page as string) || 0;
      const limit: number = parseInt(req.query.limit as string) || 20;

      // Get userId from request
      const userId = 'user123'; // TODO: Replace with actual user ID from authentication

      // Call bankAccountManager.getMerchantBankAccounts with merchantId and userId
      const bankAccounts = await this.bankAccountManager.getMerchantBankAccounts(merchantId, userId);

      // Return HTTP 200 with list of bank account responses
      res.status(StatusCode.OK).json(bankAccounts);
    } catch (error) {
      // Catch and forward any errors to next middleware
      next(error);
    }
  }

  /**
   * Update a bank account
   * @param req 
   * @param res 
   * @param next 
   * @returns Promise<void> Resolves when operation is complete
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract accountId from request parameters
      const accountId: string = req.params.accountId;

      // Extract update data from request body
      const updateData: BankAccountUpdateRequest = req.body;

      // Validate update data using validateBankAccountUpdate
      const validationResult = validateBankAccountUpdate(updateData);

      // If validation fails, throw ValidationError
      if (!validationResult.success) {
        throw createBankAccountValidationError(validationResult, 'Invalid bank account update data');
      }

      // Get userId from request
      const userId = 'user123'; // TODO: Replace with actual user ID from authentication

      // Call bankAccountManager.updateBankAccount with accountId, data, and userId
      const updatedAccount = await this.bankAccountManager.updateBankAccount(accountId, updateData, userId);

      // Return HTTP 200 with updated bank account response
      res.status(StatusCode.OK).json(updatedAccount);
    } catch (error) {
      // Catch and forward any errors to next middleware
      next(error);
    }
  }

  /**
   * Delete a bank account
   * @param req 
   * @param res 
   * @param next 
   * @returns Promise<void> Resolves when operation is complete
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract accountId from request parameters
      const accountId: string = req.params.accountId;

      // Get userId from request
      const userId = 'user123'; // TODO: Replace with actual user ID from authentication

      // Call bankAccountManager.deleteBankAccount with accountId and userId
      await this.bankAccountManager.deleteBankAccount(accountId, userId);

      // Return HTTP 204 with no content
      res.status(StatusCode.NO_CONTENT).send();
    } catch (error) {
      // Catch and forward any errors to next middleware
      next(error);
    }
  }

  /**
   * Set a bank account as the default for a merchant
   * @param req 
   * @param res 
   * @param next 
   * @returns Promise<void> Resolves when operation is complete
   */
  async setDefault(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract accountId from request parameters
      const accountId: string = req.params.accountId;

      // Get userId from request
      const userId = 'user123'; // TODO: Replace with actual user ID from authentication

      // Create update data with isDefault set to true
      const updateData: BankAccountUpdateRequest = { isDefault: true };

      // Call bankAccountManager.updateBankAccount with accountId, data, and userId
      const updatedAccount = await this.bankAccountManager.updateBankAccount(accountId, updateData, userId);

      // Return HTTP 200 with updated bank account response
      res.status(StatusCode.OK).json(updatedAccount);
    } catch (error) {
      // Catch and forward any errors to next middleware
      next(error);
    }
  }

  /**
   * Initiate verification for a bank account
   * @param req 
   * @param res 
   * @param next 
   * @returns Promise<void> Resolves when operation is complete
   */
  async initiateVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract accountId from request parameters
      const accountId: string = req.params.accountId;

      // Extract verification method from request body
      const method: BankAccountVerificationMethod = req.body.verificationMethod;

      // Validate verification method is a valid enum value
      if (!Object.values(BankAccountVerificationMethod).includes(method)) {
        throw new ApiError(ErrorCode.INVALID_REQUEST, 'Invalid verification method');
      }

      // Get userId from request
      const userId = 'user123'; // TODO: Replace with actual user ID from authentication

      // Call bankAccountManager.initiateVerification with accountId, method, and userId
      const verificationResult = await this.bankAccountManager.initiateVerification(accountId, method, userId);

      // Return HTTP 200 with verification details and instructions
      res.status(StatusCode.OK).json(verificationResult);
    } catch (error) {
      // Catch and forward any errors to next middleware
      next(error);
    }
  }

  /**
   * Complete verification for a bank account
   * @param req 
   * @param res 
   * @param next 
   * @returns Promise<void> Resolves when operation is complete
   */
  async completeVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract accountId from request parameters
      const accountId: string = req.params.accountId;

      // Extract verification data from request body
      const verificationData = req.body;

       // Build verification request object with accountId and verification data
      const verificationRequest: BankAccountVerificationRequest = {
        accountId: accountId,
        verificationId: verificationData.verificationId,
        verificationData: verificationData.verificationData
      };

      // Validate verification request using validateVerificationRequest
      const validationResult = validateVerificationRequest(verificationRequest);

      // If validation fails, throw ValidationError
      if (!validationResult.success) {
        throw createBankAccountValidationError(validationResult, 'Invalid verification request data');
      }

      // If verification method is MICRO_DEPOSIT, validate deposit amounts
      if (req.body.verificationMethod === BankAccountVerificationMethod.MICRO_DEPOSIT) {
        const microDepositValidationResult = validateMicroDepositAmounts(req.body.verificationData?.amounts);
        if (!microDepositValidationResult.success) {
          throw createBankAccountValidationError(microDepositValidationResult, 'Invalid micro-deposit amounts');
        }
      }

      // Get userId from request
      const userId = 'user123'; // TODO: Replace with actual user ID from authentication

      // Call bankAccountManager.completeVerification with verification request and userId
      const verificationResult = await this.bankAccountManager.completeVerification(verificationRequest, userId);

      // Return HTTP 200 with verification result
      res.status(StatusCode.OK).json(verificationResult);

      // If verification failed, return appropriate error status
      if (!verificationResult.success) {
        if (verificationResult.status === 'FAILED') {
          res.status(StatusCode.BAD_REQUEST).json(verificationResult);
        } else {
          res.status(StatusCode.INTERNAL_SERVER_ERROR).json(verificationResult);
        }
      }
    } catch (error) {
      // Catch and forward any errors to next middleware
      next(error);
    }
  }

  /**
   * Check verification status of a bank account
   * @param req 
   * @param res 
   * @param next 
   * @returns Promise<void> Resolves when operation is complete
   */
  async checkVerificationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract accountId from request parameters
      const accountId: string = req.params.accountId;

      // Get userId from request
      const userId = 'user123'; // TODO: Replace with actual user ID from authentication

      // Call bankAccountManager.checkVerificationStatus with accountId and userId
      const verificationStatus = await this.bankAccountManager.checkVerificationStatus(accountId, userId);

      // Return HTTP 200 with verification status details
      res.status(StatusCode.OK).json(verificationStatus);
    } catch (error) {
      // Catch and forward any errors to next middleware
      next(error);
    }
  }

  /**
   * Cancel verification for a bank account
   * @param req 
   * @param res 
   * @param next 
   * @returns Promise<void> Resolves when operation is complete
   */
  async cancelVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract accountId from request parameters
      const accountId: string = req.params.accountId;

      // Get userId from request
      const userId = 'user123'; // TODO: Replace with actual user ID from authentication

      // Call bankAccountManager.cancelVerification with accountId and userId
      const cancellationResult = await this.bankAccountManager.cancelVerification(accountId, userId);

      // Return HTTP 200 with cancellation result
      res.status(StatusCode.OK).json({ success: cancellationResult });
    } catch (error) {
      // Catch and forward any errors to next middleware
      next(error);
    }
  }
}

/**
 * Factory function to create BankAccountController instance
 */
export function createBankAccountController(bankAccountManager: BankAccountManager): BankAccountController {
  return new BankAccountController(bankAccountManager);
}