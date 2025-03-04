import crypto from 'crypto';
import { logger } from './logger';
import { ApiError } from '../errors/api-error';
import { ErrorCode } from '../constants/error-codes';
import config from '../../config';
import { generateDataKey, decrypt } from '../../integrations/aws/kms';

/**
 * Encrypts sensitive data using envelope encryption pattern with AWS KMS
 * 
 * This function implements the envelope encryption pattern:
 * 1. Generate a data key using AWS KMS
 * 2. Encrypt the plaintext with the data key using AES-256-GCM
 * 3. Store the encrypted data key with the ciphertext
 * 
 * @param plaintext - The data to encrypt, can be string or Buffer
 * @param keyId - The KMS key ID to use for generating the data key
 * @returns Object containing encrypted data string (base64) and the KMS key ID used
 */
export async function encryptData(plaintext: string | Buffer, keyId: string): Promise<{ encryptedData: string; keyId: string }> {
  try {
    // Validate inputs
    if (!plaintext) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Plaintext data is required');
    }
    if (!keyId) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'KMS key ID is required');
    }

    // Convert string to Buffer if needed
    const plaintextBuffer = typeof plaintext === 'string' ? Buffer.from(plaintext) : plaintext;

    // Generate a data key using AWS KMS
    const dataKey = await generateDataKey(keyId);

    // Create a cipher using AES-256-GCM with the plaintext data key
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', dataKey.Plaintext, iv);

    // Encrypt the plaintext
    const ciphertext = Buffer.concat([
      cipher.update(plaintextBuffer),
      cipher.final()
    ]);

    // Get the authentication tag
    const authTag = cipher.getAuthTag();

    // Prepare the encrypted data object
    const encryptedData = {
      encryptedKey: dataKey.CiphertextBlob.toString('base64'),
      iv: iv.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      tag: authTag.toString('base64')
    };

    // Return the encrypted data as a base64-encoded JSON string
    logger.debug('Data encrypted successfully');
    return {
      encryptedData: Buffer.from(JSON.stringify(encryptedData)).toString('base64'),
      keyId
    };
  } catch (error) {
    logger.error('Error encrypting data', { error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      ErrorCode.ENCRYPTION_ERROR, 
      'Failed to encrypt data', 
      { originalError: error.message }
    );
  }
}

/**
 * Decrypts data that was encrypted with the encryptData function
 * 
 * This function reverses the envelope encryption:
 * 1. Decode the encrypted data components
 * 2. Decrypt the data key using AWS KMS
 * 3. Use the plaintext data key to decrypt the ciphertext
 * 
 * @param encryptedData - The encrypted data string (base64)
 * @param keyId - The KMS key ID used for decryption
 * @returns Decrypted data as a Buffer
 */
export async function decryptData(encryptedData: string, keyId: string): Promise<Buffer> {
  try {
    // Validate inputs
    if (!encryptedData) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Encrypted data is required');
    }
    if (!keyId) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'KMS key ID is required');
    }

    // Decode the base64 string to get the JSON object
    const encryptedDataStr = Buffer.from(encryptedData, 'base64').toString('utf-8');
    const encryptedDataObj = JSON.parse(encryptedDataStr);

    // Decode the components
    const encryptedKey = Buffer.from(encryptedDataObj.encryptedKey, 'base64');
    const iv = Buffer.from(encryptedDataObj.iv, 'base64');
    const ciphertext = Buffer.from(encryptedDataObj.ciphertext, 'base64');
    const tag = Buffer.from(encryptedDataObj.tag, 'base64');

    // Decrypt the data key using AWS KMS
    const decryptedKey = await decrypt(encryptedKey, keyId);

    // Create a decipher using AES-256-GCM with the plaintext key and IV
    const decipher = crypto.createDecipheriv('aes-256-gcm', decryptedKey.Plaintext, iv);
    decipher.setAuthTag(tag);

    // Decrypt the data
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);

    logger.debug('Data decrypted successfully');
    return plaintext;
  } catch (error) {
    logger.error('Error decrypting data', { error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      ErrorCode.DECRYPTION_ERROR, 
      'Failed to decrypt data', 
      { originalError: error.message }
    );
  }
}

/**
 * Creates a secure hash of data for comparison or lookup purposes
 * 
 * @param data - The data to hash, can be string or Buffer
 * @param algorithm - Hash algorithm to use (default: 'sha256')
 * @param salt - Optional salt to use (random salt is generated if not provided)
 * @returns Base64-encoded hash of the data
 */
export function hashData(data: string | Buffer, algorithm = 'sha256', salt?: Buffer): string {
  try {
    // Validate input
    if (!data) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Data is required for hashing');
    }

    // Convert string to Buffer if needed
    const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data;
    
    // Generate random salt if not provided
    if (!salt) {
      salt = crypto.randomBytes(16);
    }

    // Create hash
    const hash = crypto.createHash(algorithm);
    hash.update(salt);
    hash.update(dataBuffer);
    const digest = hash.digest();

    // Combine salt and hash and encode as base64
    const result = Buffer.concat([salt, digest]).toString('base64');
    
    return result;
  } catch (error) {
    logger.error('Error hashing data', { error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      ErrorCode.INTERNAL_SERVER_ERROR, 
      'Failed to hash data', 
      { originalError: error.message }
    );
  }
}

/**
 * Validates if the provided data matches a previously generated hash
 * 
 * @param data - The data to validate, can be string or Buffer
 * @param hash - The hash to compare against (base64 string)
 * @param algorithm - Hash algorithm used (default: 'sha256')
 * @returns True if the data matches the hash, false otherwise
 */
export function validateHash(data: string | Buffer, hash: string, algorithm = 'sha256'): boolean {
  try {
    // Validate inputs
    if (!data) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Data is required for validation');
    }
    if (!hash) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Hash is required for validation');
    }

    // Decode the base64 hash
    const hashBuffer = Buffer.from(hash, 'base64');
    
    // Extract salt (first 16 bytes by convention)
    const salt = hashBuffer.slice(0, 16);
    const storedHash = hashBuffer.slice(16);
    
    // Convert string to Buffer if needed
    const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data;
    
    // Create hash with the same salt
    const verifyHash = crypto.createHash(algorithm);
    verifyHash.update(salt);
    verifyHash.update(dataBuffer);
    const verifyDigest = verifyHash.digest();
    
    // Compare hashes using a constant-time comparison function to prevent timing attacks
    return crypto.timingSafeEqual(storedHash, verifyDigest);
  } catch (error) {
    logger.error('Error validating hash', { error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      ErrorCode.INTERNAL_SERVER_ERROR, 
      'Failed to validate hash', 
      { originalError: error.message }
    );
  }
}

/**
 * Generates cryptographically secure random bytes
 * 
 * @param length - The number of bytes to generate
 * @returns Buffer containing random bytes
 */
export function generateRandomBytes(length: number): Buffer {
  try {
    if (length <= 0) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Length must be a positive number');
    }
    
    return crypto.randomBytes(length);
  } catch (error) {
    logger.error('Error generating random bytes', { error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      ErrorCode.INTERNAL_SERVER_ERROR, 
      'Failed to generate random bytes', 
      { originalError: error.message }
    );
  }
}

/**
 * Masks sensitive data like PII or payment card numbers for logging or display
 * 
 * @param data - The sensitive data string to mask
 * @param type - Type of data to apply specific masking rules
 * @returns String with sensitive parts masked
 */
export function maskSensitiveData(data: string, type?: string): string {
  try {
    if (typeof data !== 'string') {
      return data;
    }
    
    let maskedData = data;
    
    switch (type) {
      case 'creditCard':
        // Keep first 6 and last 4 digits, mask the rest
        maskedData = data.replace(/^(\d{6})(\d+)(\d{4})$/, '$1******$3');
        break;
        
      case 'bankAccount':
        // Keep only last 4 digits, mask the rest
        maskedData = data.replace(/^(\d+)(\d{4})$/, '*****$2');
        break;
        
      case 'ssn':
      case 'tin':
        // Keep only last 4 digits, mask the rest
        maskedData = data.replace(/^(\d+)(\d{4})$/, '***-**-$2');
        break;
        
      case 'email':
        // Mask characters before @ in email addresses
        maskedData = data.replace(/^(.)(.*)(@.*)$/, '$1****$3');
        break;
        
      default:
        // Default masking if type is not specified
        if (data.length <= 4) {
          maskedData = '*'.repeat(data.length);
        } else {
          maskedData = data.charAt(0) + '*'.repeat(data.length - 2) + data.charAt(data.length - 1);
        }
    }
    
    return maskedData;
  } catch (error) {
    logger.error('Error masking sensitive data', { error });
    // Don't throw here, return original with warning
    logger.warn('Returning unmasked data due to error in masking function');
    return '[MASKING_ERROR]';
  }
}

/**
 * Service class that provides an interface for encryption operations with added business logic
 */
export class EncryptionService {
  private defaultKeyId: string;
  
  /**
   * Initializes the encryption service with optional configuration
   * 
   * @param options - Configuration options
   */
  constructor(options: { keyId?: string } = {}) {
    this.defaultKeyId = options.keyId || config.security.encryptionKey;
  }
  
  /**
   * Encrypts data using the default or specified key ID
   * 
   * @param data - Data to encrypt
   * @param keyId - Optional key ID (falls back to default)
   * @returns Encrypted data and key ID
   */
  async encrypt(data: string | Buffer, keyId?: string): Promise<{ encryptedData: string; keyId: string }> {
    const effectiveKeyId = keyId || this.defaultKeyId;
    return encryptData(data, effectiveKeyId);
  }
  
  /**
   * Decrypts data using the specified or stored key ID
   * 
   * @param encryptedData - Encrypted data
   * @param keyId - Optional key ID (falls back to default)
   * @returns Decrypted data
   */
  async decrypt(encryptedData: string, keyId?: string): Promise<Buffer> {
    const effectiveKeyId = keyId || this.defaultKeyId;
    return decryptData(encryptedData, effectiveKeyId);
  }
  
  /**
   * Generates a hash of the provided data
   * 
   * @param data - Data to hash
   * @param algorithm - Optional hash algorithm
   * @returns Base64-encoded hash
   */
  hash(data: string | Buffer, algorithm = 'sha256'): string {
    return hashData(data, algorithm);
  }
  
  /**
   * Validates if data matches a previously generated hash
   * 
   * @param data - Data to validate
   * @param hash - Hash to compare against
   * @param algorithm - Optional hash algorithm
   * @returns True if hash matches, false otherwise
   */
  validate(data: string | Buffer, hash: string, algorithm = 'sha256'): boolean {
    return validateHash(data, hash, algorithm);
  }
  
  /**
   * Masks sensitive data for logging or display
   * 
   * @param data - Sensitive data to mask
   * @param type - Type of data for specific masking rules
   * @returns Masked data string
   */
  mask(data: string, type?: string): string {
    return maskSensitiveData(data, type);
  }
}

export {
  encryptData,
  decryptData,
  hashData,
  validateHash,
  generateRandomBytes,
  maskSensitiveData,
  EncryptionService
};