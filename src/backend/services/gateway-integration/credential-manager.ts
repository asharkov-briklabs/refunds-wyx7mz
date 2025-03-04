import { logger } from '../../../common/utils/logger';
import { GatewayType } from '../../../common/enums/gateway-type.enum';
import { ApiError } from '../../../common/errors/api-error';
import { ErrorCode } from '../../../common/constants/error-codes';
import config from '../../../config';
import secretsManagerService from '../../../integrations/aws/secrets-manager';
import { encrypt, decrypt } from '../../../integrations/aws/kms';
import merchantService from '../../integrations/merchant-service';
import taskScheduler from '../../workers/queue-manager';

/**
 * Manages secure access to gateway credentials with rotation and validation capabilities
 */
export class GatewayCredentialManager {
  private readonly credentialKeyPrefix: string;
  private readonly kmsKeyId: string;
  private readonly credentialCache: Map<string, { value: any; timestamp: number }>;
  private readonly cacheTtl: number;

  /**
   * Initializes the gateway credential manager with configuration
   * @param options 
   */
  constructor(options: { credentialKeyPrefix?: string; kmsKeyId?: string; cacheTtl?: number } = {}) {
    this.credentialKeyPrefix = options.credentialKeyPrefix || 'gateway-credentials/';
    this.kmsKeyId = options.kmsKeyId || config.aws.kms.keyId;
    this.credentialCache = new Map<string, { value: any; timestamp: number }>();
    this.cacheTtl = options.cacheTtl || 5 * 60 * 1000; // Default to 5 minutes

    logger.info('GatewayCredentialManager initialized', {
      credentialKeyPrefix: this.credentialKeyPrefix,
      kmsKeyId: this.kmsKeyId,
      cacheTtl: this.cacheTtl,
    });
  }

  /**
   * Retrieve credentials for a specific gateway and merchant
   * @param merchantId 
   * @param gatewayType 
   * @returns Decrypted credentials for the gateway
   */
  async getCredentials(merchantId: string, gatewayType: GatewayType): Promise<any> {
    if (!merchantId) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Merchant ID is required');
    }
    if (!gatewayType) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Gateway Type is required');
    }

    const credentialKey = `${this.credentialKeyPrefix}${merchantId}/${gatewayType}`;

    // Check if credentials are in cache and not expired
    const cachedCredentials = this.credentialCache.get(credentialKey);
    if (cachedCredentials && (Date.now() - cachedCredentials.timestamp < this.cacheTtl)) {
      logger.info(`Using cached credentials for ${gatewayType} for merchant ${merchantId}`);
      return cachedCredentials.value;
    }

    try {
      // Retrieve encrypted credentials from Secrets Manager
      const encryptedCredentials = await secretsManagerService.getSecretJson(credentialKey);

      if (!encryptedCredentials) {
        logger.error(`Credentials not found for ${gatewayType} for merchant ${merchantId}`);
        throw new ApiError(ErrorCode.CREDENTIALS_NOT_FOUND, `Credentials not found for ${gatewayType}`);
      }

      // Check if credentials need rotation based on last rotation date
      if (this._needsRotation(encryptedCredentials)) {
        logger.info(`Credentials for ${gatewayType} need rotation, scheduling rotation task`);
        this._scheduleRotation(merchantId, gatewayType);
      }

      // Decrypt credentials
      const decryptedCredentials = await decrypt(Buffer.from(encryptedCredentials.encryptedData, 'base64'), this.kmsKeyId);
      const credentials = JSON.parse(decryptedCredentials.Plaintext.toString());

      // Store credentials in cache with current timestamp
      this.credentialCache.set(credentialKey, { value: credentials, timestamp: Date.now() });

      logger.info(`Retrieved and decrypted credentials for ${gatewayType} for merchant ${merchantId}`);
      return credentials;
    } catch (error) {
      logger.error(`Error retrieving credentials for ${gatewayType} for merchant ${merchantId}`, { error });
      throw error;
    }
  }

  /**
   * Validate that credentials are properly formatted and contain required fields
   * @param credentials 
   * @param gatewayType 
   * @returns True if credentials are valid, false otherwise
   */
  validateCredentials(credentials: any, gatewayType: GatewayType): boolean {
    if (!credentials || typeof credentials !== 'object') {
      logger.error('Invalid credentials format: Credentials must be an object');
      return false;
    }

    let isValid = true;
    switch (gatewayType) {
      case GatewayType.STRIPE:
        if (!credentials.apiKey) {
          logger.error('Invalid Stripe credentials: apiKey is required');
          isValid = false;
        }
        break;
      case GatewayType.ADYEN:
        if (!credentials.apiKey || !credentials.merchantAccount) {
          logger.error('Invalid Adyen credentials: apiKey and merchantAccount are required');
          isValid = false;
        }
        break;
      case GatewayType.FISERV:
        if (!credentials.apiKey || !credentials.merchantId || !credentials.terminalId) {
          logger.error('Invalid Fiserv credentials: apiKey, merchantId, and terminalId are required');
          isValid = false;
        }
        break;
      default:
        logger.error(`Unsupported gateway type: ${gatewayType}`);
        return false;
    }

    if (!isValid) {
      logger.warn(`Validation failed for ${gatewayType} credentials`);
    } else {
      logger.info(`Credentials validated successfully for ${gatewayType}`);
    }

    return isValid;
  }

  /**
   * Rotate credentials for a gateway, updating with new values
   * @param merchantId 
   * @param gatewayType 
   * @param newCredentials 
   * @returns True if rotation was successful
   */
  async rotateCredentials(merchantId: string, gatewayType: GatewayType, newCredentials: any): Promise<boolean> {
    if (!merchantId) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Merchant ID is required');
    }
    if (!gatewayType) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Gateway Type is required');
    }
    if (!newCredentials || typeof newCredentials !== 'object') {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'New credentials must be a valid object');
    }

    const credentialKey = `${this.credentialKeyPrefix}${merchantId}/${gatewayType}`;

    if (!this.validateCredentials(newCredentials, gatewayType)) {
      throw new ApiError(ErrorCode.INVALID_CREDENTIALS, `Invalid credentials provided for ${gatewayType}`);
    }

    try {
      // Retrieve old credentials to maintain any fields not included in new credentials
      const oldCredentials = await secretsManagerService.getSecretJson(credentialKey);
      const mergedCredentials = { ...oldCredentials, ...newCredentials };

      // Add last rotation timestamp to credentials metadata
      mergedCredentials.lastRotated = Date.now();

      // Encrypt the new credentials
      const encryptedData = await encrypt(Buffer.from(JSON.stringify(mergedCredentials)), this.kmsKeyId);

      // Update secret in Secrets Manager with new credentials
      await secretsManagerService.updateSecret(credentialKey, {
        encryptedData: encryptedData.CiphertextBlob.toString('base64'),
        kmsKeyId: encryptedData.KeyId,
        lastRotated: mergedCredentials.lastRotated
      });

      // Remove credentials from cache to force refresh on next retrieval
      this.credentialCache.delete(credentialKey);

      logger.info(`Successfully rotated credentials for ${gatewayType} for merchant ${merchantId}`);
      return true;
    } catch (error) {
      logger.error(`Error rotating credentials for ${gatewayType} for merchant ${merchantId}`, { error });
      throw new ApiError(ErrorCode.CREDENTIAL_ROTATION_FAILED, `Failed to rotate credentials for ${gatewayType}`, { originalError: error });
    }
  }

  /**
   * Retrieve webhook secret for signature validation
   * @param gatewayType 
   * @returns The webhook secret for the specified gateway
   */
  async getWebhookSecret(gatewayType: GatewayType): Promise<string> {
    if (!gatewayType) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Gateway Type is required');
    }

    const webhookSecretKey = `webhook-secret/${gatewayType}`;

    try {
      // Retrieve webhook secret from Secrets Manager
      const webhookSecret = await secretsManagerService.getSecret(webhookSecretKey);

      if (!webhookSecret) {
        logger.error(`Webhook secret not found for ${gatewayType}`);
        throw new ApiError(ErrorCode.CREDENTIALS_NOT_FOUND, `Webhook secret not found for ${gatewayType}`);
      }

      logger.info(`Retrieved webhook secret for ${gatewayType}`);
      return webhookSecret;
    } catch (error) {
      logger.error(`Error retrieving webhook secret for ${gatewayType}`, { error });
      throw error;
    }
  }

  /**
   * Determines if credentials need rotation based on last rotation date
   * @param credentials 
   * @returns True if credentials should be rotated
   */
  private _needsRotation(credentials: any): boolean {
    if (!credentials.lastRotated) {
      logger.warn('Credentials do not have lastRotated timestamp, rotation needed');
      return true;
    }

    const lastRotated = new Date(credentials.lastRotated);
    const rotationInterval = config.security.credentialRotationIntervalDays || 90;
    const rotationDate = new Date(Date.now() - (rotationInterval * 24 * 60 * 60 * 1000));

    const needsRotation = lastRotated < rotationDate;
    if (needsRotation) {
      logger.info('Credentials need rotation', { lastRotated });
    }

    return needsRotation;
  }

  /**
   * Schedule asynchronous credential rotation task
   * @param merchantId 
   * @param gatewayType 
   */
  private async _scheduleRotation(merchantId: string, gatewayType: GatewayType): Promise<void> {
    try {
      await taskScheduler.scheduleTask('CREDENTIAL_ROTATION', {
        merchantId,
        gatewayType
      }, 'LOW', Date.now() + (60 * 60 * 1000)); // Schedule 1 hour from now

      logger.info(`Scheduled credential rotation task for ${gatewayType} for merchant ${merchantId}`);
    } catch (error) {
      logger.error(`Error scheduling credential rotation task for ${gatewayType} for merchant ${merchantId}`, { error });
    }
  }

  /**
   * Clear credential cache for a specific merchant and gateway or all credentials
   * @param merchantId 
   * @param gatewayType 
   */
  clearCache(merchantId?: string, gatewayType?: GatewayType): void {
    if (merchantId && gatewayType) {
      this.credentialCache.delete(`${this.credentialKeyPrefix}${merchantId}/${gatewayType}`);
      logger.info(`Cleared cache for ${gatewayType} for merchant ${merchantId}`);
    } else if (merchantId) {
      this.credentialCache.forEach((value, key) => {
        if (key.startsWith(`${this.credentialKeyPrefix}${merchantId}/`)) {
          this.credentialCache.delete(key);
        }
      });
      logger.info(`Cleared cache for all gateways for merchant ${merchantId}`);
    } else if (gatewayType) {
      this.credentialCache.forEach((value, key) => {
        if (key.endsWith(`/${gatewayType}`)) {
          this.credentialCache.delete(key);
        }
      });
      logger.info(`Cleared cache for gateway ${gatewayType} for all merchants`);
    } else {
      this.credentialCache.clear();
      logger.info('Cleared entire credential cache');
    }
  }
}

// Export the class instance
export const gatewayCredentialManager = new GatewayCredentialManager();

// Export the class
export default GatewayCredentialManager;