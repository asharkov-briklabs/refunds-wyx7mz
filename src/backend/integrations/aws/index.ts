/**
 * AWS Service Integrations
 *
 * This file exports all AWS service integrations used in the Refunds Service,
 * including S3 for document storage, SQS for message queuing, KMS for encryption,
 * and Secrets Manager for secure credential management.
 *
 * @version 1.0.0
 */

// Internal module imports
import * as S3 from './s3'; // Import S3 storage service functionality
import * as SQS from './sqs'; // Import SQS message queue functionality
import * as KMS from './kms'; // Import KMS encryption functionality
import secretsManagerService from './secrets-manager'; // Import Secrets Manager service for credential management

// Re-export S3-related functions and classes
export const S3StorageService = S3.S3StorageService; // Service for managing document storage in S3
export const uploadFile = S3.uploadFile; // Low-level function to upload files to S3
export const downloadFile = S3.downloadFile; // Low-level function to download files from S3
export const getSignedUrl = S3.getSignedUrl; // Function to generate pre-signed URLs for S3 objects

// Re-export SQS-related functions and classes
export const SQSService = SQS.SQSService; // Service for interacting with AWS SQS queues
export type SQSMessageOptions = SQS.SQSMessageOptions; // Options for SQS message operations

// Re-export KMS-related functions and classes
export const KMSKeyManager = KMS.KMSKeyManager; // Service for managing encryption keys
export const encrypt = KMS.encrypt; // Function to encrypt data with KMS
export const decrypt = KMS.decrypt; // Function to decrypt data with KMS
export const generateDataKey = KMS.generateDataKey; // Function to generate data encryption keys

// Re-export Secrets Manager service
export { secretsManagerService }; // Service for managing secrets and credentials