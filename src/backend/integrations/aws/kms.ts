import { KMS } from '@aws-sdk/client-kms'; // ^3.400.0
import { logger } from '../../common/utils/logger';
import config from '../../config';
import { ApiError } from '../../common/errors/api-error';
import { ErrorCode } from '../../common/constants/error-codes';

// Initialize the KMS client with configuration from the config module
const kmsClient = new KMS({
  region: config.aws.region,
  endpoint: config.aws.kms.endpoint,
  ...(config.aws.local ? { credentials: { accessKeyId: 'test', secretAccessKey: 'test' } } : {})
});

/**
 * Creates a new AWS KMS customer master key (CMK)
 * 
 * @param params - Parameters for key creation
 * @returns Promise resolving to object containing key ID and ARN
 */
export async function createKey(params = {}): Promise<{ KeyId: string; Arn: string }> {
  try {
    logger.info('Creating new KMS key', { description: params.Description });

    const command = {
      ...params
    };
    const response = await kmsClient.createKey(command);
    
    logger.info('Successfully created KMS key', { keyId: response.KeyMetadata?.KeyId });
    
    return {
      KeyId: response.KeyMetadata?.KeyId || '',
      Arn: response.KeyMetadata?.Arn || ''
    };
  } catch (error) {
    logger.error('Error creating KMS key', { error });
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create KMS key', { originalError: error.message });
  }
}

/**
 * Generates a data encryption key (DEK) for client-side encryption using envelope encryption pattern
 * 
 * @param keyId - KMS key ID or ARN
 * @param keySpec - Key specification (defaults to AES_256)
 * @returns Promise resolving to object containing plaintext key for encryption and encrypted key for storage
 */
export async function generateDataKey(keyId: string, keySpec = 'AES_256'): Promise<{ Plaintext: Buffer; CiphertextBlob: Buffer }> {
  if (!keyId) {
    throw new ApiError(ErrorCode.INVALID_INPUT, 'Key ID is required');
  }

  try {
    logger.debug('Generating data key', { keyId, keySpec });

    const response = await kmsClient.generateDataKey({
      KeyId: keyId,
      KeySpec: keySpec
    });

    logger.info('Successfully generated data key for key ID', { keyId });

    return {
      Plaintext: Buffer.from(response.Plaintext || ''),
      CiphertextBlob: Buffer.from(response.CiphertextBlob || '')
    };
  } catch (error) {
    logger.error('Error generating data key', { keyId, error });
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to generate data key', { originalError: error.message });
  }
}

/**
 * Encrypts data directly with a KMS customer master key
 * 
 * @param plaintext - Data to encrypt
 * @param keyId - KMS key ID or ARN
 * @returns Promise resolving to object containing encrypted data and the key ID used
 */
export async function encrypt(plaintext: Buffer | string, keyId: string): Promise<{ CiphertextBlob: Buffer; KeyId: string }> {
  if (!plaintext || !keyId) {
    throw new ApiError(ErrorCode.INVALID_INPUT, 'Plaintext and Key ID are required');
  }

  try {
    // Convert string to Buffer if needed
    const plaintextBuffer = typeof plaintext === 'string' ? Buffer.from(plaintext) : plaintext;

    logger.debug('Encrypting data with KMS', { keyId });

    const response = await kmsClient.encrypt({
      KeyId: keyId,
      Plaintext: plaintextBuffer
    });

    logger.info('Successfully encrypted data with KMS', { keyId });

    return {
      CiphertextBlob: Buffer.from(response.CiphertextBlob || ''),
      KeyId: response.KeyId || keyId
    };
  } catch (error) {
    logger.error('Error encrypting data with KMS', { keyId, error });
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to encrypt data', { originalError: error.message });
  }
}

/**
 * Decrypts data that was encrypted with a KMS customer master key
 * 
 * @param ciphertextBlob - Encrypted data
 * @param keyId - KMS key ID or ARN
 * @returns Promise resolving to object containing decrypted data and the key ID used
 */
export async function decrypt(ciphertextBlob: Buffer, keyId: string): Promise<{ Plaintext: Buffer; KeyId: string }> {
  if (!ciphertextBlob) {
    throw new ApiError(ErrorCode.INVALID_INPUT, 'CiphertextBlob is required');
  }

  try {
    logger.debug('Decrypting data with KMS', { keyId });

    const response = await kmsClient.decrypt({
      CiphertextBlob: ciphertextBlob,
      KeyId: keyId
    });

    logger.info('Successfully decrypted data with KMS', { keyId: response.KeyId });

    return {
      Plaintext: Buffer.from(response.Plaintext || ''),
      KeyId: response.KeyId || ''
    };
  } catch (error) {
    logger.error('Error decrypting data with KMS', { keyId, error });
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to decrypt data', { originalError: error.message });
  }
}

/**
 * Re-encrypts data with a new KMS customer master key
 * 
 * @param ciphertextBlob - Encrypted data
 * @param sourceKeyId - Source KMS key ID or ARN
 * @param destinationKeyId - Destination KMS key ID or ARN
 * @returns Promise resolving to object containing newly encrypted data and both key IDs
 */
export async function reEncrypt(
  ciphertextBlob: Buffer,
  sourceKeyId: string,
  destinationKeyId: string
): Promise<{ CiphertextBlob: Buffer; SourceKeyId: string; DestinationKeyId: string }> {
  if (!ciphertextBlob || !sourceKeyId || !destinationKeyId) {
    throw new ApiError(
      ErrorCode.INVALID_INPUT,
      'CiphertextBlob, source key ID, and destination key ID are required'
    );
  }

  try {
    logger.debug('Re-encrypting data with KMS', { sourceKeyId, destinationKeyId });

    const response = await kmsClient.reEncrypt({
      CiphertextBlob: ciphertextBlob,
      SourceKeyId: sourceKeyId,
      DestinationKeyId: destinationKeyId
    });

    logger.info('Successfully re-encrypted data with KMS', {
      sourceKeyId,
      destinationKeyId: response.KeyId
    });

    return {
      CiphertextBlob: Buffer.from(response.CiphertextBlob || ''),
      SourceKeyId: sourceKeyId,
      DestinationKeyId: response.KeyId || destinationKeyId
    };
  } catch (error) {
    logger.error('Error re-encrypting data with KMS', { sourceKeyId, destinationKeyId, error });
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to re-encrypt data', { originalError: error.message });
  }
}

/**
 * Schedules the deletion of a KMS customer master key
 * 
 * @param keyId - KMS key ID or ARN
 * @param pendingWindowInDays - Waiting period before deletion (7-30 days)
 * @returns Promise resolving to object containing the scheduled deletion date
 */
export async function scheduleKeyDeletion(keyId: string, pendingWindowInDays = 30): Promise<{ DeletionDate: Date }> {
  if (!keyId) {
    throw new ApiError(ErrorCode.INVALID_INPUT, 'Key ID is required');
  }

  try {
    logger.info('Scheduling KMS key deletion', { keyId, pendingWindowInDays });

    const response = await kmsClient.scheduleKeyDeletion({
      KeyId: keyId,
      PendingWindowInDays: pendingWindowInDays
    });

    logger.info('Successfully scheduled KMS key deletion', {
      keyId,
      deletionDate: response.DeletionDate
    });

    return {
      DeletionDate: response.DeletionDate || new Date()
    };
  } catch (error) {
    logger.error('Error scheduling KMS key deletion', { keyId, error });
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to schedule key deletion', { originalError: error.message });
  }
}

/**
 * Cancels the scheduled deletion of a KMS customer master key
 * 
 * @param keyId - KMS key ID or ARN
 * @returns Promise resolving to object containing the key ID of the recovered key
 */
export async function cancelKeyDeletion(keyId: string): Promise<{ KeyId: string }> {
  if (!keyId) {
    throw new ApiError(ErrorCode.INVALID_INPUT, 'Key ID is required');
  }

  try {
    logger.info('Canceling scheduled KMS key deletion', { keyId });

    const response = await kmsClient.cancelKeyDeletion({
      KeyId: keyId
    });

    logger.info('Successfully canceled scheduled KMS key deletion', { keyId: response.KeyId });

    return {
      KeyId: response.KeyId || keyId
    };
  } catch (error) {
    logger.error('Error canceling scheduled KMS key deletion', { keyId, error });
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to cancel key deletion', { originalError: error.message });
  }
}

/**
 * Enables a disabled KMS customer master key
 * 
 * @param keyId - KMS key ID or ARN
 * @returns Promise resolving to void on success
 */
export async function enableKey(keyId: string): Promise<void> {
  if (!keyId) {
    throw new ApiError(ErrorCode.INVALID_INPUT, 'Key ID is required');
  }

  try {
    logger.info('Enabling KMS key', { keyId });

    await kmsClient.enableKey({
      KeyId: keyId
    });

    logger.info('Successfully enabled KMS key', { keyId });
  } catch (error) {
    logger.error('Error enabling KMS key', { keyId, error });
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to enable key', { originalError: error.message });
  }
}

/**
 * Disables a KMS customer master key
 * 
 * @param keyId - KMS key ID or ARN
 * @returns Promise resolving to void on success
 */
export async function disableKey(keyId: string): Promise<void> {
  if (!keyId) {
    throw new ApiError(ErrorCode.INVALID_INPUT, 'Key ID is required');
  }

  try {
    logger.info('Disabling KMS key', { keyId });

    await kmsClient.disableKey({
      KeyId: keyId
    });

    logger.info('Successfully disabled KMS key', { keyId });
  } catch (error) {
    logger.error('Error disabling KMS key', { keyId, error });
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to disable key', { originalError: error.message });
  }
}

/**
 * Lists all KMS customer master keys
 * 
 * @param params - Optional parameters for listing keys (limit, marker)
 * @returns Promise resolving to object containing keys and pagination info
 */
export async function listKeys(params = {}): Promise<{
  Keys: Array<{ KeyId: string; KeyArn: string }>;
  Truncated: boolean;
  NextMarker?: string;
}> {
  try {
    logger.info('Listing KMS keys');

    const response = await kmsClient.listKeys(params);

    logger.info('Successfully listed KMS keys', {
      count: response.Keys?.length
    });

    return {
      Keys: (response.Keys || []).map(key => ({
        KeyId: key.KeyId || '',
        KeyArn: key.KeyArn || ''
      })),
      Truncated: response.Truncated || false,
      NextMarker: response.NextMarker
    };
  } catch (error) {
    logger.error('Error listing KMS keys', { error });
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to list keys', { originalError: error.message });
  }
}

/**
 * Gets detailed information about a KMS customer master key
 * 
 * @param keyId - KMS key ID or ARN
 * @returns Promise resolving to object containing key metadata
 */
export async function describeKey(keyId: string): Promise<{ KeyMetadata: object }> {
  if (!keyId) {
    throw new ApiError(ErrorCode.INVALID_INPUT, 'Key ID is required');
  }

  try {
    logger.info('Describing KMS key', { keyId });

    const response = await kmsClient.describeKey({
      KeyId: keyId
    });

    logger.info('Successfully described KMS key', { keyId });

    return {
      KeyMetadata: response.KeyMetadata || {}
    };
  } catch (error) {
    logger.error('Error describing KMS key', { keyId, error });
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to describe key', { originalError: error.message });
  }
}

/**
 * Creates an alias for a KMS customer master key
 * 
 * @param aliasName - Alias name (must start with "alias/")
 * @param targetKeyId - Target KMS key ID or ARN
 * @returns Promise resolving to void on success
 */
export async function createAlias(aliasName: string, targetKeyId: string): Promise<void> {
  if (!aliasName || !targetKeyId) {
    throw new ApiError(ErrorCode.INVALID_INPUT, 'Alias name and target key ID are required');
  }

  // Ensure alias name has proper prefix
  if (!aliasName.startsWith('alias/')) {
    aliasName = `alias/${aliasName}`;
  }

  try {
    logger.info('Creating KMS key alias', { aliasName, targetKeyId });

    await kmsClient.createAlias({
      AliasName: aliasName,
      TargetKeyId: targetKeyId
    });

    logger.info('Successfully created KMS key alias', { aliasName, targetKeyId });
  } catch (error) {
    logger.error('Error creating KMS key alias', { aliasName, targetKeyId, error });
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create key alias', { originalError: error.message });
  }
}

/**
 * Lists all aliases for KMS customer master keys
 * 
 * @param keyId - Optional KMS key ID or ARN to filter aliases
 * @returns Promise resolving to object containing aliases and pagination info
 */
export async function listAliases(keyId?: string): Promise<{
  Aliases: Array<{ AliasName: string; TargetKeyId: string }>;
  Truncated: boolean;
  NextMarker?: string;
}> {
  try {
    const params: any = {};
    
    // Add KeyId if provided
    if (keyId) {
      params.KeyId = keyId;
    }

    logger.info('Listing KMS key aliases', { keyId });

    const response = await kmsClient.listAliases(params);

    logger.info('Successfully listed KMS key aliases', {
      count: response.Aliases?.length
    });

    return {
      Aliases: (response.Aliases || []).map(alias => ({
        AliasName: alias.AliasName || '',
        TargetKeyId: alias.TargetKeyId || ''
      })),
      Truncated: response.Truncated || false,
      NextMarker: response.NextMarker
    };
  } catch (error) {
    logger.error('Error listing KMS key aliases', { keyId, error });
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to list key aliases', { originalError: error.message });
  }
}

/**
 * Service class for KMS key management with business logic for key lifecycle operations
 */
export class KMSKeyManager {
  private region: string;
  private kmsClient: KMS;

  /**
   * Initializes the KMS Key Manager with optional configuration
   * 
   * @param options - Configuration options
   */
  constructor(options = {}) {
    this.region = options.region || config.aws.region;
    this.kmsClient = new KMS({
      region: this.region,
      endpoint: options.endpoint || config.aws.kms.endpoint,
      ...(config.aws.local ? { credentials: { accessKeyId: 'test', secretAccessKey: 'test' } } : {})
    });

    logger.info('Initialized KMS Key Manager', { region: this.region });
  }

  /**
   * Gets an existing key or creates a new one if it doesn't exist
   * 
   * @param aliasName - Alias name to look up or create
   * @param keyParams - Parameters for key creation if needed
   * @returns Promise resolving to object containing key ID and ARN
   */
  async getOrCreateKey(aliasName: string, keyParams = {}): Promise<{ KeyId: string; Arn: string }> {
    if (!aliasName) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Alias name is required');
    }

    // Ensure alias name has proper prefix
    if (!aliasName.startsWith('alias/')) {
      aliasName = `alias/${aliasName}`;
    }

    try {
      logger.info('Getting or creating KMS key', { aliasName });

      // Try to find existing key by alias
      const { Aliases } = await listAliases();
      const existingAlias = Aliases.find(alias => alias.AliasName === aliasName);

      if (existingAlias) {
        // Get key details
        const { KeyMetadata } = await describeKey(existingAlias.TargetKeyId);
        
        logger.info('Found existing KMS key', {
          aliasName,
          keyId: existingAlias.TargetKeyId
        });

        return {
          KeyId: KeyMetadata.KeyId || existingAlias.TargetKeyId,
          Arn: KeyMetadata.Arn || ''
        };
      }

      // Create new key
      const { KeyId, Arn } = await createKey(keyParams);
      
      // Create alias
      await createAlias(aliasName, KeyId);

      logger.info('Created new KMS key with alias', {
        aliasName,
        keyId: KeyId
      });

      return { KeyId, Arn };
    } catch (error) {
      logger.error('Error in getOrCreateKey', { aliasName, error });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to get or create key', { originalError: error.message });
    }
  }

  /**
   * Rotates a KMS key by creating a new one and updating the alias
   * 
   * @param aliasName - Alias name of the key to rotate
   * @param keyParams - Parameters for new key creation
   * @returns Promise resolving to object containing old and new key IDs
   */
  async rotateKey(aliasName: string, keyParams = {}): Promise<{ OldKeyId: string; NewKeyId: string }> {
    if (!aliasName) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Alias name is required');
    }

    // Ensure alias name has proper prefix
    if (!aliasName.startsWith('alias/')) {
      aliasName = `alias/${aliasName}`;
    }

    try {
      logger.info('Rotating KMS key', { aliasName });

      // Find existing key by alias
      const { Aliases } = await listAliases();
      const existingAlias = Aliases.find(alias => alias.AliasName === aliasName);

      if (!existingAlias) {
        throw new ApiError(ErrorCode.RESOURCE_NOT_FOUND, `No key found with alias: ${aliasName}`);
      }

      const oldKeyId = existingAlias.TargetKeyId;

      // Create new key
      const { KeyId: newKeyId } = await createKey(keyParams);

      // Update alias to point to new key
      // First delete old alias, then create new one with same name
      await this.kmsClient.deleteAlias({ AliasName: aliasName });
      await createAlias(aliasName, newKeyId);

      // Optionally schedule old key for deletion (after appropriate waiting period)
      if (keyParams.scheduleDeletion) {
        const pendingWindowInDays = keyParams.pendingWindowInDays || 30;
        await scheduleKeyDeletion(oldKeyId, pendingWindowInDays);
      }

      logger.info('Successfully rotated KMS key', {
        aliasName,
        oldKeyId,
        newKeyId
      });

      return { OldKeyId: oldKeyId, NewKeyId: newKeyId };
    } catch (error) {
      logger.error('Error rotating KMS key', { aliasName, error });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to rotate key', { originalError: error.message });
    }
  }

  /**
   * Re-encrypts all data encrypted with old key using a new key
   * 
   * @param sourceKeyId - Source KMS key ID or ARN
   * @param destinationKeyId - Destination KMS key ID or ARN
   * @param dataProvider - Function that returns data items to re-encrypt
   * @param dataUpdater - Function that updates each successfully re-encrypted item
   * @returns Statistics about the re-encryption operation
   */
  async reEncryptAll(
    sourceKeyId: string,
    destinationKeyId: string,
    dataProvider: () => Promise<Array<{ id: string; encryptedData: Buffer }>>,
    dataUpdater: (id: string, newEncryptedData: Buffer) => Promise<void>
  ): Promise<{ processed: number; successful: number; failed: number }> {
    if (!sourceKeyId || !destinationKeyId) {
      throw new ApiError(
        ErrorCode.INVALID_INPUT,
        'Source and destination key IDs are required'
      );
    }

    try {
      logger.info('Starting batch re-encryption', { sourceKeyId, destinationKeyId });

      const stats = {
        processed: 0,
        successful: 0,
        failed: 0
      };

      // Get all data items to re-encrypt
      const dataItems = await dataProvider();
      
      // Process each item
      for (const item of dataItems) {
        stats.processed++;
        
        try {
          // Re-encrypt the data
          const result = await reEncrypt(
            item.encryptedData,
            sourceKeyId,
            destinationKeyId
          );
          
          // Update the data with newly encrypted version
          await dataUpdater(item.id, result.CiphertextBlob);
          
          stats.successful++;
        } catch (error) {
          logger.error('Error re-encrypting item', {
            itemId: item.id,
            sourceKeyId,
            destinationKeyId,
            error
          });
          
          stats.failed++;
        }
      }

      logger.info('Completed batch re-encryption', {
        sourceKeyId,
        destinationKeyId,
        ...stats
      });

      return stats;
    } catch (error) {
      logger.error('Error in batch re-encryption', { sourceKeyId, destinationKeyId, error });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to batch re-encrypt data', { originalError: error.message });
    }
  }
}