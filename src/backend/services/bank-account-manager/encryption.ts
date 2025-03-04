import { generateDataKey, decrypt } from '../../../integrations/aws/kms'; // ^3.400.0
import { logger } from '../../../common/utils/logger';
import config from '../../../config';
import { ApiError } from '../../../common/errors/api-error';
import { ErrorCode } from '../../../common/constants/error-codes';
import * as crypto from 'crypto'; // latest

/**
 * Handles secure encryption, decryption, and hashing of bank account information
 * using envelope encryption with AWS KMS and AES-256-GCM.
 */
export class BankAccountEncryption {
  private readonly kmsKeyId: string;

  /**
   * Initializes the encryption service with the KMS key ID
   * 
   * @param kmsKeyId - KMS key ID to use for envelope encryption, defaults to configuration if not provided
   */
  constructor(kmsKeyId?: string) {
    // Use provided key ID or fall back to configuration
    this.kmsKeyId = kmsKeyId || config.security.kmsKeyId;
    logger.debug('Initialized bank account encryption service', { keyId: this.kmsKeyId });
  }

  /**
   * Encrypts an account number using envelope encryption with AWS KMS and AES-256-GCM
   * 
   * @param accountNumber - Bank account number to encrypt
   * @returns Promise resolving to object containing encrypted data and key ID
   */
  async encryptAccountNumber(accountNumber: string): Promise<{ encryptedData: string; keyId: string; }> {
    try {
      if (!accountNumber) {
        throw new ApiError(ErrorCode.INVALID_INPUT, 'Account number is required');
      }

      // Generate a data key using AWS KMS
      const { Plaintext: dataKey, CiphertextBlob: encryptedKey } = await generateDataKey(
        this.kmsKeyId,
        'AES_256'
      );

      // Create random IV for AES-GCM mode
      const iv = crypto.randomBytes(12);

      // Create cipher using the data key and IV
      const cipher = crypto.createCipheriv('aes-256-gcm', dataKey, iv);

      // Encrypt the account number
      const ciphertext = Buffer.concat([
        cipher.update(accountNumber, 'utf8'),
        cipher.final()
      ]);

      // Get authentication tag (for GCM mode)
      const authTag = cipher.getAuthTag();

      // Create encrypted data object
      const encryptedData = {
        keyId: this.kmsKeyId,
        encryptedKey: encryptedKey.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        ciphertext: ciphertext.toString('base64')
      };

      logger.debug('Account number encrypted successfully');

      // Return encrypted data as JSON string and key ID
      return {
        encryptedData: JSON.stringify(encryptedData),
        keyId: this.kmsKeyId
      };
    } catch (error) {
      logger.error('Error encrypting account number', { error });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        ErrorCode.ENCRYPTION_ERROR,
        'Failed to encrypt account number',
        { originalError: error.message }
      );
    }
  }

  /**
   * Decrypts an encrypted account number using envelope encryption with AWS KMS and AES-256-GCM
   * 
   * @param encryptedDataStr - JSON string containing encrypted data components
   * @param keyId - KMS key ID used for encryption
   * @returns Promise resolving to decrypted account number
   */
  async decryptAccountNumber(encryptedDataStr: string, keyId: string): Promise<string> {
    try {
      // Parse encrypted data JSON
      const encryptedData = JSON.parse(encryptedDataStr);

      if (!this.validateEncryptedData(encryptedData)) {
        throw new ApiError(
          ErrorCode.INVALID_INPUT,
          'Invalid encrypted data format'
        );
      }

      // Convert base64 strings back to Buffers
      const encryptedKey = Buffer.from(encryptedData.encryptedKey, 'base64');
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const authTag = Buffer.from(encryptedData.authTag, 'base64');
      const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');

      // Decrypt the data key using KMS
      const { Plaintext: dataKey } = await decrypt(encryptedKey, keyId);

      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-gcm', dataKey, iv);
      
      // Set auth tag for GCM mode
      decipher.setAuthTag(authTag);

      // Decrypt the account number
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]);

      logger.debug('Account number decrypted successfully');

      // Return decrypted account number
      return decrypted.toString('utf8');
    } catch (error) {
      logger.error('Error decrypting account number', { error });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        ErrorCode.DECRYPTION_ERROR,
        'Failed to decrypt account number',
        { originalError: error.message }
      );
    }
  }

  /**
   * Creates a secure hash of the account number for lookups and comparison
   * without revealing the actual number
   * 
   * @param accountNumber - Bank account number to hash
   * @returns Base64-encoded salted hash of the account number
   */
  hashAccountNumber(accountNumber: string): string {
    try {
      if (!accountNumber) {
        throw new ApiError(ErrorCode.INVALID_INPUT, 'Account number is required');
      }

      // Generate a random salt
      const salt = crypto.randomBytes(16);
      
      // Create hash with salt
      const hash = crypto.createHash('sha256');
      hash.update(salt);
      hash.update(accountNumber);
      const digest = hash.digest();
      
      // Combine salt and hash digest
      const result = Buffer.concat([salt, digest]);
      
      // Return base64 encoded result
      return result.toString('base64');
    } catch (error) {
      logger.error('Error hashing account number', { error });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to hash account number',
        { originalError: error.message }
      );
    }
  }

  /**
   * Returns the last 4 digits of the account number for display purposes
   * 
   * @param accountNumber - Bank account number
   * @returns Last 4 digits of the account number or full number if less than 4 digits
   */
  getLastFour(accountNumber: string): string {
    try {
      if (!accountNumber) {
        throw new ApiError(ErrorCode.INVALID_INPUT, 'Account number is required');
      }
      
      // Return last 4 digits if available, otherwise return full number
      return accountNumber.length >= 4 
        ? accountNumber.slice(-4) 
        : accountNumber;
    } catch (error) {
      logger.error('Error getting last four digits', { error });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to get last four digits',
        { originalError: error.message }
      );
    }
  }

  /**
   * Validates that encrypted data contains all required fields
   * 
   * @param encryptedData - Encrypted data object to validate
   * @returns True if encrypted data is valid, false otherwise
   */
  private validateEncryptedData(encryptedData: object): boolean {
    return !!(
      encryptedData &&
      encryptedData['keyId'] &&
      encryptedData['encryptedKey'] &&
      encryptedData['iv'] &&
      encryptedData['authTag'] &&
      encryptedData['ciphertext']
    );
  }
}