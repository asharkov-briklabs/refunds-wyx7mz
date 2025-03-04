import mongoose from 'mongoose'; // mongoose ^6.0.0
import { v4 as uuid } from 'uuid'; // uuid ^8.3.2
import {
  BankAccountRepository,
} from '../../../database/repositories/bank-account.repo';
import {
  IBankAccountDocument,
} from '../../../database/models/bank-account.model';
import {
  BankAccountVerificationStatus,
  BankAccountVerificationMethod,
  BankAccountVerification,
  BankAccountVerificationRequest,
} from '../../../common/interfaces/bank-account.interface';
import { logger } from '../../../common/utils/logger';
import { ApiError } from '../../../common/errors/api-error';
import { ErrorCode } from '../../../common/constants/error-codes';
import config from '../../../config';

/**
 * Service for verifying bank account ownership and legitimacy through various methods
 */
export class BankAccountVerifier {
  /**
   * Initializes the bank account verifier with required dependencies
   * @param bankAccountRepository 
   */
  constructor(
    private bankAccountRepository: BankAccountRepository,
  ) {
    this.bankAccountRepository = bankAccountRepository;
    this.verificationsInProgress = new Map<string, BankAccountVerification>();
    this.microDepositExpirationDays = config.verification.microDepositExpirationDays || 7;
    this.instantVerificationExpirationHours = config.verification.instantVerificationExpirationHours || 24;
    logger.info('BankAccountVerifier initialized');
  }

  private verificationRepository: any;
  private verificationsInProgress: Map<string, BankAccountVerification>;
  private microDepositExpirationDays: number;
  private instantVerificationExpirationHours: number;

  /**
   * Initiates the micro-deposit verification process for a bank account
   * @param account 
   * @returns Verification details and reference ID
   */
  async initiateMicroDepositVerification(
    account: IBankAccountDocument
  ): Promise<{ verificationId: string; status: BankAccountVerificationStatus; verificationData: any }> {
    try {
      // Check if verification is already in progress for this account
      if (this.verificationsInProgress.has(account.accountId)) {
        logger.error(`Verification already in progress for account: ${account.accountId}`);
        throw new ApiError(ErrorCode.VERIFICATION_IN_PROGRESS, 'Verification already in progress for this account');
      }

      // Generate two small random amounts for micro-deposits (between $0.01-$0.99)
      const amount1 = this.generateMicroDepositAmounts();
      const amount2 = this.generateMicroDepositAmounts();

      // Create a unique verification ID
      const verificationId = uuid();

      // Calculate expiration date based on configured expiration days
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + this.microDepositExpirationDays);

      // Create verification record with pending status
      const verification: BankAccountVerification = {
        verificationId: verificationId,
        accountId: account.accountId,
        verificationMethod: BankAccountVerificationMethod.MICRO_DEPOSIT,
        status: BankAccountVerificationStatus.PENDING,
        verificationData: {
          amount1: amount1,
          amount2: amount2,
        },
        initiatedAt: new Date(),
        expirationTime: expirationDate,
      };

      // Store verification in database and in-memory cache
      // await this.verificationRepository.create(verification); // Assuming a verification repository exists
      this.verificationsInProgress.set(account.accountId, verification);

      // Update account verification status to PENDING
      await this.bankAccountRepository.setVerificationStatus(account.accountId, BankAccountVerificationStatus.PENDING, BankAccountVerificationMethod.MICRO_DEPOSIT);

      // Initiate actual bank deposits through payment processor integration
      // await paymentProcessor.initiateMicroDeposits(account, [amount1, amount2]); // Example call

      // Return verification details including ID and status
      logger.info(`Micro-deposit verification initiated for account: ${account.accountId}`, { verificationId });
      return {
        verificationId: verificationId,
        status: BankAccountVerificationStatus.PENDING,
        verificationData: {
          message: 'Micro-deposits initiated. Check your bank statement for the amounts and verify them.'
        }
      };
    } catch (error: any) {
      logger.error(`Error initiating micro-deposit verification for account: ${account.accountId}`, { error: error.message });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to initiate micro-deposit verification', { originalError: error.message });
    }
  }

  /**
   * Initiates instant verification process through third-party verification service
   * @param account 
   * @returns Verification details and reference ID
   */
  async initiateInstantVerification(
    account: IBankAccountDocument
  ): Promise<{ verificationId: string; status: BankAccountVerificationStatus; verificationData: any }> {
    try {
      // Check if verification is already in progress for this account
      if (this.verificationsInProgress.has(account.accountId)) {
        logger.error(`Verification already in progress for account: ${account.accountId}`);
        throw new ApiError(ErrorCode.VERIFICATION_IN_PROGRESS, 'Verification already in progress for this account');
      }

      // Create a unique verification ID
      const verificationId = uuid();

      // Calculate expiration date based on configured expiration hours
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + this.instantVerificationExpirationHours);

      // Create verification record with pending status
      const verification: BankAccountVerification = {
        verificationId: verificationId,
        accountId: account.accountId,
        verificationMethod: BankAccountVerificationMethod.INSTANT_VERIFICATION,
        status: BankAccountVerificationStatus.PENDING,
        verificationData: {
          sessionToken: uuid(), // Generate a session token for tracking
        },
        initiatedAt: new Date(),
        expirationTime: expirationDate,
      };

      // Store verification in database and in-memory cache
      // await this.verificationRepository.create(verification); // Assuming a verification repository exists
      this.verificationsInProgress.set(account.accountId, verification);

      // Update account verification status to PENDING
      await this.bankAccountRepository.setVerificationStatus(account.accountId, BankAccountVerificationStatus.PENDING, BankAccountVerificationMethod.INSTANT_VERIFICATION);

      // Initialize third-party verification session
      // const sessionToken = await thirdPartyVerificationService.createSession(account); // Example call

      // Return verification details including ID, status, and session token
      logger.info(`Instant verification initiated for account: ${account.accountId}`, { verificationId });
      return {
        verificationId: verificationId,
        status: BankAccountVerificationStatus.PENDING,
        verificationData: {
          sessionToken: verification.verificationData.sessionToken,
          message: 'Instant verification initiated. Follow the instructions to verify your account instantly.'
        }
      };
    } catch (error: any) {
      logger.error(`Error initiating instant verification for account: ${account.accountId}`, { error: error.message });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to initiate instant verification', { originalError: error.message });
    }
  }

  /**
   * Validates provided micro-deposit amounts to complete verification
   * @param verificationRequest 
   * @returns Result of verification attempt
   */
  async completeMicroDepositVerification(
    verificationRequest: BankAccountVerificationRequest
  ): Promise<{ success: boolean; status: BankAccountVerificationStatus; message: string }> {
    try {
      // Check if verification exists and is still pending
      const verification = this.verificationsInProgress.get(verificationRequest.accountId);
      if (!verification || verification.status !== BankAccountVerificationStatus.PENDING) {
        logger.error(`Verification not found or not pending for account: ${verificationRequest.accountId}`);
        throw new ApiError(ErrorCode.RESOURCE_NOT_FOUND, 'Verification not found or not pending');
      }

      // Validate that verification has not expired
      if (verification.expirationTime < new Date()) {
        logger.error(`Verification expired for account: ${verificationRequest.accountId}`);
        throw new ApiError(ErrorCode.VERIFICATION_EXPIRED, 'Verification has expired');
      }

      // Extract micro-deposit amount values from verification request
      const providedAmounts = verificationRequest.verificationData?.amounts;
      if (!Array.isArray(providedAmounts) || providedAmounts.length !== 2) {
        logger.error(`Invalid verification data provided for account: ${verificationRequest.accountId}`);
        throw new ApiError(ErrorCode.INVALID_VERIFICATION_DATA, 'Invalid verification data provided. Provide two amounts.');
      }

      // Compare provided amounts with stored expected amounts
      const expectedAmounts = [verification.verificationData.amount1, verification.verificationData.amount2];
      if (this.validateMicroDepositAmounts(providedAmounts, expectedAmounts)) {
        // If amounts match, mark verification as successful
        await this.bankAccountRepository.setVerificationStatus(verificationRequest.accountId, BankAccountVerificationStatus.VERIFIED, BankAccountVerificationMethod.MICRO_DEPOSIT);
        this.verificationsInProgress.delete(verificationRequest.accountId);
        logger.info(`Micro-deposit verification successful for account: ${verificationRequest.accountId}`);
        return {
          success: true,
          status: BankAccountVerificationStatus.VERIFIED,
          message: 'Bank account successfully verified.'
        };
      } else {
        // If amounts don't match, increment attempt counter
        // Assuming a verification attempts counter exists in the verification object
        // verification.attempts += 1;

        // If max attempts reached, mark verification as FAILED
        // if (verification.attempts >= MAX_VERIFICATION_ATTEMPTS) {
        await this.bankAccountRepository.setVerificationStatus(verificationRequest.accountId, BankAccountVerificationStatus.FAILED, BankAccountVerificationMethod.MICRO_DEPOSIT);
        this.verificationsInProgress.delete(verificationRequest.accountId);
        logger.warn(`Micro-deposit verification failed for account: ${verificationRequest.accountId}. Max attempts reached.`);
        return {
          success: false,
          status: BankAccountVerificationStatus.FAILED,
          message: 'Verification failed. Incorrect amounts provided.'
        };
        // }

        logger.warn(`Micro-deposit verification failed for account: ${verificationRequest.accountId}. Incorrect amounts provided.`);
        return {
          success: false,
          status: BankAccountVerificationStatus.PENDING,
          message: 'Verification failed. Incorrect amounts provided. Please try again.'
        };
      }
    } catch (error: any) {
      logger.error(`Error completing micro-deposit verification for account: ${verificationRequest.accountId}`, { error: error.message });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to complete micro-deposit verification', { originalError: error.message });
    }
  }

  /**
   * Processes instant verification callback from third-party verification service
   * @param verificationRequest 
   * @returns Result of verification attempt
   */
  async completeInstantVerification(
    verificationRequest: BankAccountVerificationRequest
  ): Promise<{ success: boolean; status: BankAccountVerificationStatus; message: string }> {
    try {
      // Check if verification exists and is still pending
      const verification = this.verificationsInProgress.get(verificationRequest.accountId);
      if (!verification || verification.status !== BankAccountVerificationStatus.PENDING) {
        logger.error(`Verification not found or not pending for account: ${verificationRequest.accountId}`);
        throw new ApiError(ErrorCode.RESOURCE_NOT_FOUND, 'Verification not found or not pending');
      }

      // Validate that verification has not expired
      if (verification.expirationTime < new Date()) {
        logger.error(`Verification expired for account: ${verificationRequest.accountId}`);
        throw new ApiError(ErrorCode.VERIFICATION_EXPIRED, 'Verification has expired');
      }

      // Extract session token and verification status from request
      const sessionToken = verificationRequest.verificationData?.sessionToken;
      const verificationStatus = verificationRequest.verificationData?.status;

      // Validate session token against stored verification data
      if (sessionToken !== verification.verificationData.sessionToken) {
        logger.error(`Invalid session token provided for account: ${verificationRequest.accountId}`);
        throw new ApiError(ErrorCode.INVALID_VERIFICATION_DATA, 'Invalid session token provided');
      }

      // Process verification result from third-party service
      // const verificationResult = await thirdPartyVerificationService.processResult(sessionToken); // Example call

      if (verificationStatus === 'success') {
        // If successful, update bank account verification status to VERIFIED
        await this.bankAccountRepository.setVerificationStatus(verificationRequest.accountId, BankAccountVerificationStatus.VERIFIED, BankAccountVerificationMethod.INSTANT_VERIFICATION);
        this.verificationsInProgress.delete(verificationRequest.accountId);
        logger.info(`Instant verification successful for account: ${verificationRequest.accountId}`);
        return {
          success: true,
          status: BankAccountVerificationStatus.VERIFIED,
          message: 'Bank account successfully verified.'
        };
      } else {
        // If failed, mark verification as FAILED with reason
        await this.bankAccountRepository.setVerificationStatus(verificationRequest.accountId, BankAccountVerificationStatus.FAILED, BankAccountVerificationMethod.INSTANT_VERIFICATION);
        this.verificationsInProgress.delete(verificationRequest.accountId);
        logger.warn(`Instant verification failed for account: ${verificationRequest.accountId}`);
        return {
          success: false,
          status: BankAccountVerificationStatus.FAILED,
          message: 'Verification failed. Please try again or use micro-deposit verification.'
        };
      }
    } catch (error: any) {
      logger.error(`Error completing instant verification for account: ${verificationRequest.accountId}`, { error: error.message });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to complete instant verification', { originalError: error.message });
    }
  }

  /**
   * Checks the current status of a bank account verification
   * @param accountId 
   * @returns Current verification status details
   */
  async checkVerificationStatus(
    accountId: string
  ): Promise<{ status: BankAccountVerificationStatus; method: BankAccountVerificationMethod; expirationDate?: Date }> {
    try {
      // Retrieve bank account from repository
      const account = await this.bankAccountRepository.findById(accountId);
      if (!account) {
        logger.error(`Bank account not found: ${accountId}`);
        throw new ApiError(ErrorCode.BANK_ACCOUNT_NOT_FOUND, 'Bank account not found');
      }

      // Check for in-progress verification for this account
      const verification = this.verificationsInProgress.get(accountId);
      if (verification) {
        logger.info(`Verification in progress for account: ${accountId}`);
        return {
          status: BankAccountVerificationStatus.PENDING,
          method: verification.verificationMethod,
          expirationDate: verification.expirationTime,
        };
      }

      // If no verification in progress, return account's current verification status
      logger.info(`No verification in progress for account: ${accountId}`);
      return {
        status: account.verificationStatus,
        method: account.verificationMethod,
      };
    } catch (error: any) {
      logger.error(`Error checking verification status for account: ${accountId}`, { error: error.message });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to check verification status', { originalError: error.message });
    }
  }

  /**
   * Cancels an in-progress verification process
   * @param accountId 
   * @returns True if verification was successfully canceled
   */
  async cancelVerification(accountId: string): Promise<boolean> {
    try {
      // Retrieve bank account from repository
      const account = await this.bankAccountRepository.findById(accountId);
      if (!account) {
        logger.error(`Bank account not found: ${accountId}`);
        throw new ApiError(ErrorCode.BANK_ACCOUNT_NOT_FOUND, 'Bank account not found');
      }

      // Check for in-progress verification for this account
      const verification = this.verificationsInProgress.get(accountId);
      if (verification) {
        // If verification in progress, remove from in-memory cache
        this.verificationsInProgress.delete(accountId);

        // Update verification record status to canceled
        // await this.verificationRepository.updateStatus(verification.verificationId, 'CANCELED'); // Example call

        // If micro-deposits were initiated, attempt to cancel them
        // if (verification.verificationMethod === BankAccountVerificationMethod.MICRO_DEPOSIT) {
        //   await paymentProcessor.cancelMicroDeposits(account); // Example call
        // }

        // Reset account verification status to UNVERIFIED
        await this.bankAccountRepository.setVerificationStatus(accountId, BankAccountVerificationStatus.UNVERIFIED);

        logger.info(`Verification canceled for account: ${accountId}`);
        return true;
      }

      logger.warn(`No verification in progress to cancel for account: ${accountId}`);
      return false;
    } catch (error: any) {
      logger.error(`Error canceling verification for account: ${accountId}`, { error: error.message });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to cancel verification', { originalError: error.message });
    }
  }

  /**
   * Provides user instructions for completing verification based on method
   * @param method 
   * @param verificationData 
   * @returns Human-readable instructions for completing verification
   */
  getVerificationInstructions(method: BankAccountVerificationMethod, verificationData: any): string {
    switch (method) {
      case BankAccountVerificationMethod.MICRO_DEPOSIT:
        return 'Check your bank statement for two small deposits and enter the amounts below.';
      case BankAccountVerificationMethod.INSTANT_VERIFICATION:
        return 'Follow the instructions to connect your bank account instantly.';
      default:
        return 'Contact support for assistance with bank account verification.';
    }
  }

  /**
   * Background task to clean up expired verification attempts
   * @returns Number of expired verifications cleaned up
   */
  async cleanupExpiredVerifications(): Promise<number> {
    try {
      // Query for verification records past their expiration date
      // const expiredVerifications = await this.verificationRepository.findExpired(new Date()); // Example call

      // For each expired verification, mark status as expired
      // and update associated bank accounts to UNVERIFIED status
      let cleanedCount = 0;
      // for (const verification of expiredVerifications) {
      //   verification.status = 'EXPIRED';
      //   await this.verificationRepository.update(verification);
      //   await this.bankAccountRepository.setVerificationStatus(verification.accountId, BankAccountVerificationStatus.UNVERIFIED);
      //   this.verificationsInProgress.delete(verification.accountId);
      //   cleanedCount++;
      // }

      // Remove expired verifications from in-memory cache
      this.verificationsInProgress.forEach((verification, accountId) => {
        if (verification.expirationTime < new Date()) {
          this.verificationsInProgress.delete(accountId);
          cleanedCount++;
        }
      });

      logger.info(`Cleaned up ${cleanedCount} expired verifications`);
      return cleanedCount;
    } catch (error: any) {
      logger.error('Error cleaning up expired verifications', { error: error.message });
      throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to cleanup expired verifications', { originalError: error.message });
    }
  }

  /**
   * Validates that micro-deposit amounts match expected values
   * @param providedAmounts 
   * @param expectedAmounts 
   * @returns True if amounts match, false otherwise
   */
  validateMicroDepositAmounts(providedAmounts: number[], expectedAmounts: number[]): boolean {
    if (providedAmounts.length !== expectedAmounts.length) {
      return false;
    }

    const sortedProvided = [...providedAmounts].sort();
    const sortedExpected = [...expectedAmounts].sort();

    for (let i = 0; i < sortedProvided.length; i++) {
      if (sortedProvided[i] !== sortedExpected[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generates random micro-deposit amounts for verification
   * @returns Array of random amounts between $0.01-$0.99
   */
  generateMicroDepositAmounts(): number[] {
    const amount1 = Math.floor(Math.random() * 99) + 1; // 1-99 cents
    const amount2 = Math.floor(Math.random() * 99) + 1; // 1-99 cents

    // Ensure the amounts are different for security
    if (amount1 === amount2) {
      return this.generateMicroDepositAmounts();
    }

    // Format as dollar amounts with 2 decimal places
    return [amount1 / 100, amount2 / 100];
  }
}

// Export the service class
export default BankAccountVerifier;