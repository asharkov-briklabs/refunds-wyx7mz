/**
 * AWS Secrets Manager Service
 * 
 * This service provides a wrapper around AWS Secrets Manager SDK to securely store,
 * retrieve, and manage sensitive information such as API keys, credentials, and
 * other sensitive data required by the Refunds Service.
 * 
 * @version 1.0.0
 */

import { 
  SecretsManagerClient, 
  GetSecretValueCommand,
  CreateSecretCommand,
  UpdateSecretCommand,
  DeleteSecretCommand,
  ListSecretsCommand 
} from '@aws-sdk/client-secrets-manager'; // @aws-sdk/client-secrets-manager ^3.0.0

import config from '../../config';
import { logger } from '../../common/utils/logger';

/**
 * Service for interacting with AWS Secrets Manager to securely store and retrieve secrets
 */
class SecretsManagerService {
  private client: SecretsManagerClient;
  private cacheMap: Map<string, { value: string, timestamp: number }>;
  private cacheTTL: number; // in milliseconds

  /**
   * Initializes the SecretsManagerClient with AWS configuration
   */
  constructor() {
    // Initialize the SecretsManagerClient with AWS region and credentials from config
    this.client = new SecretsManagerClient({
      region: config.aws.region,
      endpoint: config.aws.secretsManager?.endpoint,
      credentials: config.aws.local ? {
        accessKeyId: 'test',
        secretAccessKey: 'test'
      } : undefined
    });

    // Initialize the secret cache map
    this.cacheMap = new Map();
    
    // Set the cache TTL to 5 minutes (300000 milliseconds)
    this.cacheTTL = 300000;
    
    logger.info('SecretsManagerService initialized');
  }

  /**
   * Retrieves a secret value from AWS Secrets Manager with optional caching
   * 
   * @param secretName - The name or ARN of the secret to retrieve
   * @param useCache - Whether to use the cache for this request (default: true)
   * @returns The secret value as a string
   * @throws Error if the secret retrieval fails
   */
  async getSecret(secretName: string, useCache = true): Promise<string> {
    try {
      // Check if the secret is in cache and not expired if useCache is true
      if (useCache) {
        const cachedSecret = this.cacheMap.get(secretName);
        
        // If cached and valid, return the cached value
        if (cachedSecret && (Date.now() - cachedSecret.timestamp) < this.cacheTTL) {
          logger.info(`Using cached secret for ${secretName}`);
          return cachedSecret.value;
        }
      }

      // Otherwise, create a GetSecretValueCommand with the secretName
      const command = new GetSecretValueCommand({
        SecretId: secretName,
      });

      // Send the command to the client
      const response = await this.client.send(command);
      
      // Extract and return the SecretString from the response
      const secretValue = response.SecretString;
      
      if (!secretValue) {
        throw new Error(`Secret ${secretName} does not contain a SecretString`);
      }
      
      // If useCache is true, store the secret in cache with current timestamp
      if (useCache) {
        this.cacheMap.set(secretName, {
          value: secretValue,
          timestamp: Date.now()
        });
      }
      
      logger.info(`Retrieved secret ${secretName} from AWS Secrets Manager`);
      return secretValue;
    } catch (error) {
      // Log and rethrow any errors that occur
      logger.error(`Error retrieving secret ${secretName}`, { error });
      throw error;
    }
  }

  /**
   * Retrieves a secret as a parsed JSON object
   * 
   * @param secretName - The name or ARN of the secret to retrieve
   * @param useCache - Whether to use the cache for this request (default: true)
   * @returns The parsed JSON object containing the secret
   * @throws Error if the secret retrieval or parsing fails
   */
  async getSecretJson<T = any>(secretName: string, useCache = true): Promise<T> {
    try {
      // Call getSecret method to retrieve the secret string
      const secretString = await this.getSecret(secretName, useCache);
      
      // Parse the string as JSON and return the resulting object
      return JSON.parse(secretString) as T;
    } catch (error) {
      // Log and rethrow any errors that occur during parsing
      logger.error(`Error parsing secret ${secretName} as JSON`, { error });
      throw error;
    }
  }

  /**
   * Creates a new secret in AWS Secrets Manager
   * 
   * @param secretName - The name for the new secret
   * @param secretValue - The value to store in the secret (string or object)
   * @param description - Optional description of the secret
   * @returns The ARN of the created secret
   * @throws Error if the secret creation fails
   */
  async createSecret(secretName: string, secretValue: string | object, description?: string): Promise<string> {
    try {
      // Convert secretValue to string if it's an object using JSON.stringify
      const secretString = typeof secretValue === 'object' 
        ? JSON.stringify(secretValue) 
        : secretValue;
      
      // Create a CreateSecretCommand with the secretName, secretValue, and description
      const command = new CreateSecretCommand({
        Name: secretName,
        SecretString: secretString,
        Description: description
      });

      // Send the command to the client
      const response = await this.client.send(command);
      
      // Return the ARN from the response
      logger.info(`Created secret ${secretName} in AWS Secrets Manager`);
      return response.ARN!;
    } catch (error) {
      // Log and rethrow any errors that occur
      logger.error(`Error creating secret ${secretName}`, { error });
      throw error;
    }
  }

  /**
   * Updates an existing secret in AWS Secrets Manager
   * 
   * @param secretName - The name or ARN of the secret to update
   * @param secretValue - The new value to store in the secret (string or object)
   * @returns The ARN of the updated secret
   * @throws Error if the secret update fails
   */
  async updateSecret(secretName: string, secretValue: string | object): Promise<string> {
    try {
      // Convert secretValue to string if it's an object using JSON.stringify
      const secretString = typeof secretValue === 'object' 
        ? JSON.stringify(secretValue) 
        : secretValue;
      
      // Create an UpdateSecretCommand with the secretName and secretValue
      const command = new UpdateSecretCommand({
        SecretId: secretName,
        SecretString: secretString
      });

      // Send the command to the client
      const response = await this.client.send(command);
      
      // Remove the secret from cache if it exists
      this.cacheMap.delete(secretName);
      
      // Return the ARN from the response
      logger.info(`Updated secret ${secretName} in AWS Secrets Manager`);
      return response.ARN!;
    } catch (error) {
      // Log and rethrow any errors that occur
      logger.error(`Error updating secret ${secretName}`, { error });
      throw error;
    }
  }

  /**
   * Deletes a secret from AWS Secrets Manager
   * 
   * @param secretName - The name or ARN of the secret to delete
   * @param forceDelete - Whether to force deletion without recovery (default: false)
   * @throws Error if the secret deletion fails
   */
  async deleteSecret(secretName: string, forceDelete = false): Promise<void> {
    try {
      // Create a DeleteSecretCommand with the secretName and forceDelete flag
      const command = new DeleteSecretCommand({
        SecretId: secretName,
        ForceDeleteWithoutRecovery: forceDelete
      });

      // Send the command to the client
      await this.client.send(command);
      
      // Remove the secret from cache if it exists
      this.cacheMap.delete(secretName);
      
      logger.info(`Deleted secret ${secretName} from AWS Secrets Manager${forceDelete ? ' (forced)' : ''}`);
    } catch (error) {
      // Log and rethrow any errors that occur
      logger.error(`Error deleting secret ${secretName}`, { error });
      throw error;
    }
  }

  /**
   * Lists available secrets in AWS Secrets Manager
   * 
   * @returns Array of secret metadata objects
   * @throws Error if listing secrets fails
   */
  async listSecrets(): Promise<Array<{name: string, arn: string}>> {
    try {
      // Create a ListSecretsCommand
      const command = new ListSecretsCommand({});

      // Send the command to the client
      const response = await this.client.send(command);
      
      // Map the response to an array of objects containing name and ARN of each secret
      const secrets = response.SecretList?.map(secret => ({
        name: secret.Name!,
        arn: secret.ARN!
      })) || [];
      
      // Return the mapped array
      logger.info(`Listed ${secrets.length} secrets from AWS Secrets Manager`);
      return secrets;
    } catch (error) {
      // Log and rethrow any errors that occur
      logger.error('Error listing secrets from AWS Secrets Manager', { error });
      throw error;
    }
  }

  /**
   * Clears the secret cache
   * 
   * @param secretName - Optional specific secret to clear from cache
   */
  clearCache(secretName?: string): void {
    // If secretName is provided, remove only that secret from the cache
    if (secretName) {
      this.cacheMap.delete(secretName);
      logger.info(`Cleared cache for secret ${secretName}`);
    } else {
      // Otherwise, clear the entire cache
      this.cacheMap.clear();
      logger.info('Cleared entire secrets cache');
    }
  }
}

// Create singleton instance
const secretsManagerService = new SecretsManagerService();

// Export the singleton instance with all methods
export default secretsManagerService;