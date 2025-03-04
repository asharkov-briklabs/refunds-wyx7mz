/**
 * AWS S3 Integration Module
 * 
 * Provides a robust interface for interacting with AWS S3 storage service, handling file uploads,
 * downloads, signed URL generation, and other S3 operations required for storing supporting
 * documents, bank verification documents, and other files used throughout the Refunds Service.
 */

import { logger } from '../../common/utils/logger';
import config from '../../config';
import { ApiError } from '../../common/errors';
import { ErrorCode } from '../../common/constants/error-codes';
import { v4 as uuidv4 } from 'uuid'; // uuid@^9.0.0

// AWS S3 imports
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  ListObjectsV2Command, 
  HeadObjectCommand,
  CopyObjectCommand,
  S3ServiceException 
} from '@aws-sdk/client-s3'; // @aws-sdk/client-s3@^3.300.0
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'; // @aws-sdk/s3-request-presigner@^3.300.0
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'; // @aws-sdk/s3-presigned-post@^3.300.0

// Initialize S3 client with config
const s3Client = new S3Client({ 
  region: config.services.s3?.region || 'us-east-1',
  credentials: {
    accessKeyId: config.services.s3?.accessKeyId || '',
    secretAccessKey: config.services.s3?.secretAccessKey || ''
  },
  endpoint: config.services.s3?.endpoint // For local development with tools like localstack
});

// Default bucket name from config
const defaultBucket = config.services.s3?.bucketName || 'refund-documents';

/**
 * Converts a stream to a buffer
 * 
 * @param stream - ReadableStream from S3 or other source
 * @returns Promise resolving to a buffer
 */
async function streamToBuffer(stream: any): Promise<Buffer> {
  if (!stream) {
    return Buffer.alloc(0);
  }
  
  // If it's already a Buffer, return it
  if (Buffer.isBuffer(stream)) {
    return stream;
  }
  
  // Handle AWS SDK v3 streaming response body
  if (typeof stream.transformToByteArray === 'function') {
    const bytes = await stream.transformToByteArray();
    return Buffer.from(bytes);
  }
  
  // Handle node.js streams
  if (typeof stream.pipe === 'function') {
    const chunks: Uint8Array[] = [];
    return new Promise<Buffer>((resolve, reject) => {
      stream.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
  
  // Handle ArrayBuffer or typed array
  if (ArrayBuffer.isView(stream) || stream instanceof ArrayBuffer) {
    return Buffer.from(stream);
  }
  
  // If none of the above, try to convert to string then to Buffer
  return Buffer.from(String(stream));
}

/**
 * Uploads a file to S3 with the specified key and content type
 * 
 * @param fileContent - The content of the file to upload
 * @param key - The key (path) where the file will be stored in S3
 * @param options - Additional options like content type, bucket, and metadata
 * @returns Promise resolving to upload result with key and ETag
 */
export async function uploadFile(
  fileContent: Buffer | string | Uint8Array | ReadableStream,
  key: string,
  options: {
    contentType?: string,
    bucket?: string,
    metadata?: Record<string, string>
  } = {}
): Promise<{ key: string, etag: string, versionId?: string }> {
  try {
    const bucket = options.bucket || defaultBucket;
    const contentType = options.contentType || 'application/octet-stream';
    
    logger.debug('Uploading file to S3', { bucket, key, contentType });
    
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileContent,
      ContentType: contentType,
      Metadata: options.metadata
    });
    
    const response = await s3Client.send(command);
    
    logger.info('Successfully uploaded file to S3', { 
      bucket, 
      key, 
      etag: response.ETag, 
      versionId: response.VersionId 
    });
    
    return {
      key,
      etag: response.ETag || '',
      versionId: response.VersionId
    };
  } catch (error) {
    logger.error('Error uploading file to S3', { key, error });
    
    if (error instanceof S3ServiceException) {
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        `S3 upload error: ${error.name} - ${error.message}`,
        { key, s3ErrorCode: error.name, s3Message: error.message }
      );
    }
    
    throw new ApiError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      `Failed to upload file to S3: ${error.message}`,
      { key, originalError: error.message }
    );
  }
}

/**
 * Downloads a file from S3 by key
 * 
 * @param key - The key (path) of the file to download
 * @param options - Additional options like bucket name
 * @returns Promise resolving to file content, content type, and metadata
 */
export async function downloadFile(
  key: string,
  options: {
    bucket?: string
  } = {}
): Promise<{ content: Buffer, contentType: string, metadata: Record<string, string> }> {
  try {
    const bucket = options.bucket || defaultBucket;
    
    logger.debug('Downloading file from S3', { bucket, key });
    
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });
    
    const response = await s3Client.send(command);
    
    // Convert body stream to buffer
    const bodyContents = await streamToBuffer(response.Body);
    
    logger.info('Successfully downloaded file from S3', { 
      bucket, 
      key, 
      contentLength: bodyContents.length 
    });
    
    return {
      content: bodyContents,
      contentType: response.ContentType || 'application/octet-stream',
      metadata: response.Metadata || {}
    };
  } catch (error) {
    logger.error('Error downloading file from S3', { key, error });
    
    // Handle specific AWS S3 errors
    if (error instanceof S3ServiceException) {
      if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
        throw new ApiError(
          ErrorCode.RESOURCE_NOT_FOUND,
          `File not found in S3: ${key}`,
          { key }
        );
      }
      
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        `S3 download error: ${error.name} - ${error.message}`,
        { key, s3ErrorCode: error.name, s3Message: error.message }
      );
    }
    
    throw new ApiError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      `Failed to download file from S3: ${error.message}`,
      { key, originalError: error.message }
    );
  }
}

/**
 * Deletes a file from S3 by key
 * 
 * @param key - The key (path) of the file to delete
 * @param options - Additional options like bucket name
 * @returns Promise resolving to true if deletion was successful
 */
export async function deleteFile(
  key: string,
  options: {
    bucket?: string
  } = {}
): Promise<boolean> {
  try {
    const bucket = options.bucket || defaultBucket;
    
    logger.debug('Deleting file from S3', { bucket, key });
    
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    });
    
    await s3Client.send(command);
    
    logger.info('Successfully deleted file from S3', { bucket, key });
    
    return true;
  } catch (error) {
    logger.error('Error deleting file from S3', { key, error });
    
    if (error instanceof S3ServiceException) {
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        `S3 delete error: ${error.name} - ${error.message}`,
        { key, s3ErrorCode: error.name, s3Message: error.message }
      );
    }
    
    throw new ApiError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      `Failed to delete file from S3: ${error.message}`,
      { key, originalError: error.message }
    );
  }
}

/**
 * Generates a pre-signed URL for temporary access to an S3 object
 * 
 * @param key - The key (path) of the S3 object
 * @param operation - The operation to allow ('getObject' or 'putObject')
 * @param options - Additional options like expiration, bucket, content type
 * @returns Promise resolving to the pre-signed URL
 */
export async function getSignedUrl(
  key: string,
  operation: 'getObject' | 'putObject',
  options: {
    expiresIn?: number,
    bucket?: string,
    contentType?: string
  } = {}
): Promise<string> {
  try {
    const bucket = options.bucket || defaultBucket;
    const expiresIn = options.expiresIn || 3600; // Default to 1 hour
    
    logger.debug('Generating signed URL', { bucket, key, operation, expiresIn });
    
    let command;
    if (operation === 'getObject') {
      command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
      });
    } else {
      command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: options.contentType
      });
    }
    
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    
    logger.info('Successfully generated signed URL', { 
      bucket, 
      key, 
      operation, 
      expirySeconds: expiresIn 
    });
    
    return url;
  } catch (error) {
    logger.error('Error generating signed URL', { key, operation, error });
    
    if (error instanceof S3ServiceException) {
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        `S3 signed URL error: ${error.name} - ${error.message}`,
        { key, operation, s3ErrorCode: error.name, s3Message: error.message }
      );
    }
    
    throw new ApiError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      `Failed to generate signed URL: ${error.message}`,
      { key, operation, originalError: error.message }
    );
  }
}

/**
 * Generates pre-signed POST data for direct browser uploads to S3
 * 
 * @param key - The key (path) where the uploaded file will be stored
 * @param options - Additional options like expiration, content type, max size
 * @returns Promise resolving to pre-signed POST URL and form fields
 */
export async function getPresignedPost(
  key: string,
  options: {
    expiresIn?: number,
    bucket?: string,
    contentType?: string,
    maxSize?: number,
    metadata?: Record<string, string>
  } = {}
): Promise<{ url: string, fields: Record<string, string> }> {
  try {
    const bucket = options.bucket || defaultBucket;
    const expiresIn = options.expiresIn || 3600; // Default to 1 hour
    const contentType = options.contentType;
    const maxSize = options.maxSize || 10485760; // Default to 10MB
    
    logger.debug('Generating pre-signed POST', { 
      bucket, 
      key, 
      expiresIn,
      contentType,
      maxSize
    });
    
    // Set up conditions for presigned post
    const conditions = [
      ['content-length-range', 0, maxSize]
    ];
    
    if (contentType) {
      conditions.push(['eq', '$Content-Type', contentType]);
    }
    
    const presignedPost = await createPresignedPost(s3Client, {
      Bucket: bucket,
      Key: key,
      Conditions: conditions,
      Fields: {
        ...(contentType && { 'Content-Type': contentType }),
        ...(options.metadata || {})
      },
      Expires: expiresIn
    });
    
    logger.info('Successfully generated pre-signed POST', { bucket, key });
    
    return {
      url: presignedPost.url,
      fields: presignedPost.fields
    };
  } catch (error) {
    logger.error('Error generating pre-signed POST', { key, error });
    
    if (error instanceof S3ServiceException) {
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        `S3 pre-signed POST error: ${error.name} - ${error.message}`,
        { key, s3ErrorCode: error.name, s3Message: error.message }
      );
    }
    
    throw new ApiError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      `Failed to generate pre-signed POST: ${error.message}`,
      { key, originalError: error.message }
    );
  }
}

/**
 * Lists files in an S3 bucket with optional prefix filtering
 * 
 * @param options - Options like bucket name, prefix, and continuation token
 * @returns Promise resolving to list of file keys and optional continuation token
 */
export async function listFiles(
  options: {
    bucket?: string,
    prefix?: string,
    continuationToken?: string,
    maxKeys?: number
  } = {}
): Promise<{ keys: string[], continuationToken?: string }> {
  try {
    const bucket = options.bucket || defaultBucket;
    const prefix = options.prefix || '';
    const maxKeys = options.maxKeys || 1000;
    
    logger.debug('Listing files in S3', { 
      bucket, 
      prefix, 
      continuationToken: options.continuationToken 
    });
    
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: options.continuationToken,
      MaxKeys: maxKeys
    });
    
    const response = await s3Client.send(command);
    
    // Extract keys from response
    const keys = (response.Contents || []).map(item => item.Key).filter(Boolean) as string[];
    
    logger.info('Successfully listed files from S3', { 
      bucket, 
      prefix, 
      count: keys.length,
      isTruncated: response.IsTruncated
    });
    
    return {
      keys,
      continuationToken: response.NextContinuationToken
    };
  } catch (error) {
    logger.error('Error listing files from S3', { 
      prefix: options.prefix, 
      error 
    });
    
    if (error instanceof S3ServiceException) {
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        `S3 listing error: ${error.name} - ${error.message}`,
        { prefix: options.prefix, s3ErrorCode: error.name, s3Message: error.message }
      );
    }
    
    throw new ApiError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      `Failed to list files from S3: ${error.message}`,
      { prefix: options.prefix, originalError: error.message }
    );
  }
}

/**
 * Checks if a file exists in S3
 * 
 * @param key - The key (path) to check
 * @param options - Additional options like bucket name
 * @returns Promise resolving to true if file exists, false otherwise
 */
export async function fileExists(
  key: string,
  options: {
    bucket?: string
  } = {}
): Promise<boolean> {
  try {
    const bucket = options.bucket || defaultBucket;
    
    logger.debug('Checking if file exists in S3', { bucket, key });
    
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key
    });
    
    await s3Client.send(command);
    
    // If the command succeeds, the file exists
    return true;
  } catch (error) {
    // If the error is NoSuchKey, the file doesn't exist
    if (error instanceof S3ServiceException && 
        (error.name === 'NotFound' || error.name === 'NoSuchKey')) {
      return false;
    }
    
    // For other errors, log and rethrow
    logger.error('Error checking if file exists in S3', { key, error });
    
    throw new ApiError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      `Failed to check if file exists in S3: ${error.message}`,
      { key, originalError: error.message }
    );
  }
}

/**
 * Copies a file within S3
 * 
 * @param sourceKey - Source key (path) of the file to copy
 * @param destinationKey - Destination key (path) for the copied file
 * @param options - Additional options like source/destination buckets and metadata
 * @returns Promise resolving to copy result with key and ETag
 */
export async function copyFile(
  sourceKey: string,
  destinationKey: string,
  options: {
    sourceBucket?: string,
    destinationBucket?: string,
    metadata?: Record<string, string>,
    metadataDirective?: 'COPY' | 'REPLACE'
  } = {}
): Promise<{ key: string, etag: string, versionId?: string }> {
  try {
    const sourceBucket = options.sourceBucket || defaultBucket;
    const destinationBucket = options.destinationBucket || sourceBucket;
    
    logger.debug('Copying file in S3', { 
      sourceBucket, 
      sourceKey, 
      destinationBucket,
      destinationKey 
    });
    
    const command = new CopyObjectCommand({
      CopySource: `${sourceBucket}/${sourceKey}`,
      Bucket: destinationBucket,
      Key: destinationKey,
      Metadata: options.metadata,
      MetadataDirective: options.metadata ? 'REPLACE' : 'COPY'
    });
    
    const response = await s3Client.send(command);
    
    logger.info('Successfully copied file in S3', { 
      sourceBucket, 
      sourceKey, 
      destinationBucket,
      destinationKey,
      etag: response.CopyObjectResult?.ETag,
      versionId: response.VersionId
    });
    
    return {
      key: destinationKey,
      etag: response.CopyObjectResult?.ETag || '',
      versionId: response.VersionId
    };
  } catch (error) {
    logger.error('Error copying file in S3', { 
      sourceKey, 
      destinationKey, 
      error 
    });
    
    if (error instanceof S3ServiceException) {
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        `S3 copy error: ${error.name} - ${error.message}`,
        { 
          sourceKey, 
          destinationKey, 
          s3ErrorCode: error.name, 
          s3Message: error.message 
        }
      );
    }
    
    throw new ApiError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      `Failed to copy file in S3: ${error.message}`,
      { 
        sourceKey, 
        destinationKey, 
        originalError: error.message 
      }
    );
  }
}

/**
 * Gets metadata for an S3 object
 * 
 * @param key - The key (path) of the S3 object
 * @param options - Additional options like bucket name
 * @returns Promise resolving to file metadata
 */
export async function getFileMetadata(
  key: string,
  options: {
    bucket?: string
  } = {}
): Promise<{
  contentType: string,
  contentLength: number,
  lastModified: Date,
  metadata: Record<string, string>,
  etag: string,
  versionId?: string
}> {
  try {
    const bucket = options.bucket || defaultBucket;
    
    logger.debug('Getting file metadata from S3', { bucket, key });
    
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key
    });
    
    const response = await s3Client.send(command);
    
    logger.info('Successfully retrieved file metadata from S3', { bucket, key });
    
    return {
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength || 0,
      lastModified: response.LastModified || new Date(),
      metadata: response.Metadata || {},
      etag: response.ETag || '',
      versionId: response.VersionId
    };
  } catch (error) {
    logger.error('Error getting file metadata from S3', { key, error });
    
    // Handle specific AWS S3 errors
    if (error instanceof S3ServiceException) {
      if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
        throw new ApiError(
          ErrorCode.RESOURCE_NOT_FOUND,
          `File not found in S3: ${key}`,
          { key }
        );
      }
      
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        `S3 metadata error: ${error.name} - ${error.message}`,
        { key, s3ErrorCode: error.name, s3Message: error.message }
      );
    }
    
    throw new ApiError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      `Failed to get file metadata from S3: ${error.message}`,
      { key, originalError: error.message }
    );
  }
}

/**
 * Determines the content type based on file extension
 * 
 * @param filename - The filename to examine
 * @returns Content type string
 */
function getContentTypeFromFilename(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  // Map common extensions to content types
  const contentTypeMap: Record<string, string> = {
    'pdf': 'application/pdf',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'txt': 'text/plain',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'csv': 'text/csv',
    'json': 'application/json',
    'xml': 'application/xml',
    'zip': 'application/zip'
  };
  
  return extension && contentTypeMap[extension] ? contentTypeMap[extension] : 'application/octet-stream';
}

/**
 * Service class that provides a higher-level interface for S3 operations specific to the Refunds Service.
 * This class handles document storage, supporting documentation, and bank account verification files.
 */
export class S3StorageService {
  private s3Client: S3Client;
  private bucket: string;
  
  /**
   * Creates a new instance of the S3StorageService
   * 
   * @param options - Configuration options for the service
   */
  constructor(options: {
    region?: string,
    credentials?: {
      accessKeyId: string,
      secretAccessKey: string
    },
    endpoint?: string,
    bucket?: string
  } = {}) {
    // Use provided options or defaults
    this.s3Client = options.region || options.credentials || options.endpoint
      ? new S3Client({
          region: options.region || config.services.s3?.region || 'us-east-1',
          credentials: options.credentials || {
            accessKeyId: config.services.s3?.accessKeyId || '',
            secretAccessKey: config.services.s3?.secretAccessKey || ''
          },
          endpoint: options.endpoint || config.services.s3?.endpoint
        })
      : s3Client;
    
    this.bucket = options.bucket || defaultBucket;
    
    logger.debug('Initialized S3StorageService', { 
      bucket: this.bucket, 
      customClient: Boolean(options.region || options.credentials || options.endpoint) 
    });
  }
  
  /**
   * Uploads a document to S3 with appropriate prefix and metadata
   * 
   * @param content - The content of the document to upload
   * @param fileName - The original filename
   * @param documentType - Type of document (e.g., 'refund-supporting', 'bank-verification')
   * @param referenceId - Related entity ID (e.g., refundId, merchantId)
   * @param metadata - Additional metadata to store with the document
   * @returns Promise resolving to uploaded document information
   */
  async uploadDocument(
    content: Buffer | string | Uint8Array | ReadableStream,
    fileName: string,
    documentType: string,
    referenceId: string,
    metadata: Record<string, string> = {}
  ): Promise<{ documentId: string, key: string, url: string }> {
    try {
      // Generate a unique document ID
      const documentId = uuidv4();
      
      // Create key with appropriate prefix structure
      const key = `${documentType}/${referenceId}/${documentId}/${fileName}`;
      
      // Prepare metadata
      const docMetadata = {
        'document-type': documentType,
        'reference-id': referenceId,
        'original-filename': fileName,
        ...metadata
      };
      
      // Determine content type from file extension or metadata
      const contentType = metadata.contentType || getContentTypeFromFilename(fileName);
      
      // Upload the file
      await uploadFile(content, key, {
        bucket: this.bucket,
        contentType,
        metadata: docMetadata
      });
      
      // Generate a URL for accessing the document
      const url = await getSignedUrl(key, 'getObject', {
        bucket: this.bucket,
        expiresIn: 3600 // 1 hour
      });
      
      return {
        documentId,
        key,
        url
      };
    } catch (error) {
      logger.error('Error uploading document', { 
        documentType, 
        referenceId, 
        fileName, 
        error 
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        `Failed to upload document: ${error.message}`,
        { 
          documentType, 
          referenceId, 
          fileName, 
          originalError: error.message 
        }
      );
    }
  }
  
  /**
   * Downloads a document from S3 by document ID or key
   * 
   * @param documentIdOrKey - Document ID or full S3 key
   * @returns Promise resolving to document content and metadata
   */
  async getDocument(
    documentIdOrKey: string
  ): Promise<{ content: Buffer, contentType: string, metadata: Record<string, string> }> {
    try {
      // Determine if input is a document ID or key
      const key = documentIdOrKey.includes('/') 
        ? documentIdOrKey 
        : `documents/${documentIdOrKey}`; // Default documents prefix if only ID provided
      
      return await downloadFile(key, { bucket: this.bucket });
    } catch (error) {
      logger.error('Error downloading document', { documentIdOrKey, error });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        `Failed to download document: ${error.message}`,
        { documentIdOrKey, originalError: error.message }
      );
    }
  }
  
  /**
   * Deletes a document from S3 by document ID or key
   * 
   * @param documentIdOrKey - Document ID or full S3 key
   * @returns Promise resolving to true if deletion was successful
   */
  async deleteDocument(documentIdOrKey: string): Promise<boolean> {
    try {
      // Determine if input is a document ID or key
      const key = documentIdOrKey.includes('/') 
        ? documentIdOrKey 
        : `documents/${documentIdOrKey}`; // Default documents prefix if only ID provided
      
      return await deleteFile(key, { bucket: this.bucket });
    } catch (error) {
      logger.error('Error deleting document', { documentIdOrKey, error });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        `Failed to delete document: ${error.message}`,
        { documentIdOrKey, originalError: error.message }
      );
    }
  }
  
  /**
   * Generates a pre-signed URL for accessing a document
   * 
   * @param documentIdOrKey - Document ID or full S3 key
   * @param expirySeconds - Number of seconds until the URL expires
   * @returns Promise resolving to pre-signed URL
   */
  async getDocumentUrl(documentIdOrKey: string, expirySeconds: number = 3600): Promise<string> {
    try {
      // Determine if input is a document ID or key
      const key = documentIdOrKey.includes('/') 
        ? documentIdOrKey 
        : `documents/${documentIdOrKey}`; // Default documents prefix if only ID provided
      
      // Check if document exists
      const exists = await fileExists(key, { bucket: this.bucket });
      if (!exists) {
        throw new ApiError(
          ErrorCode.RESOURCE_NOT_FOUND,
          `Document not found: ${documentIdOrKey}`,
          { documentIdOrKey }
        );
      }
      
      return await getSignedUrl(key, 'getObject', { 
        bucket: this.bucket,
        expiresIn: expirySeconds
      });
    } catch (error) {
      logger.error('Error generating document URL', { documentIdOrKey, error });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        `Failed to generate document URL: ${error.message}`,
        { documentIdOrKey, originalError: error.message }
      );
    }
  }
  
  /**
   * Lists documents in S3 with filtering options
   * 
   * @param options - Filter options like document type and reference ID
   * @returns Promise resolving to list of documents and continuation token
   */
  async listDocuments(
    options: {
      documentType?: string,
      referenceId?: string,
      continuationToken?: string,
      maxKeys?: number
    } = {}
  ): Promise<{
    documents: Array<{
      documentId: string,
      key: string,
      documentType: string,
      referenceId: string,
      lastModified: Date
    }>,
    continuationToken?: string
  }> {
    try {
      // Build prefix based on filters
      let prefix = '';
      if (options.documentType) {
        prefix = `${options.documentType}/`;
        if (options.referenceId) {
          prefix += `${options.referenceId}/`;
        }
      }
      
      // List files with the constructed prefix
      const result = await listFiles({
        bucket: this.bucket,
        prefix,
        continuationToken: options.continuationToken,
        maxKeys: options.maxKeys
      });
      
      // Process the results to extract document information
      const documents = await Promise.all(
        result.keys.map(async (key) => {
          try {
            // Get metadata for each file
            const metadata = await getFileMetadata(key, { bucket: this.bucket });
            
            // Extract document ID from key (format: type/refId/docId/filename)
            const keyParts = key.split('/');
            const documentId = keyParts.length >= 3 ? keyParts[2] : '';
            const documentType = keyParts.length >= 1 ? keyParts[0] : '';
            const referenceId = keyParts.length >= 2 ? keyParts[1] : '';
            
            return {
              documentId,
              key,
              documentType: metadata.metadata['document-type'] || documentType,
              referenceId: metadata.metadata['reference-id'] || referenceId,
              lastModified: metadata.lastModified
            };
          } catch (error) {
            // Skip files with errors
            logger.warn('Error getting metadata for document', { key, error });
            return null;
          }
        })
      );
      
      // Filter out null entries from failed metadata fetches
      const validDocuments = documents.filter(Boolean) as Array<{
        documentId: string,
        key: string,
        documentType: string,
        referenceId: string,
        lastModified: Date
      }>;
      
      return {
        documents: validDocuments,
        continuationToken: result.continuationToken
      };
    } catch (error) {
      logger.error('Error listing documents', { options, error });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        `Failed to list documents: ${error.message}`,
        { options, originalError: error.message }
      );
    }
  }
  
  /**
   * Generates pre-signed POST data for direct browser uploads
   * 
   * @param fileName - The original filename
   * @param documentType - Type of document (e.g., 'refund-supporting', 'bank-verification')
   * @param referenceId - Related entity ID (e.g., refundId, merchantId)
   * @param options - Additional options for the upload
   * @returns Promise resolving to pre-signed POST information
   */
  async getUploadUrl(
    fileName: string,
    documentType: string,
    referenceId: string,
    options: {
      expiresIn?: number,
      maxSize?: number,
      contentType?: string,
      metadata?: Record<string, string>
    } = {}
  ): Promise<{
    documentId: string,
    uploadUrl: string,
    fields: Record<string, string>
  }> {
    try {
      // Generate a unique document ID
      const documentId = uuidv4();
      
      // Create key with appropriate prefix structure
      const key = `${documentType}/${referenceId}/${documentId}/${fileName}`;
      
      // Determine content type from file extension or options
      const contentType = options.contentType || getContentTypeFromFilename(fileName);
      
      // Prepare metadata
      const metadata = {
        'document-type': documentType,
        'reference-id': referenceId,
        'original-filename': fileName,
        ...(options.metadata || {})
      };
      
      // Generate pre-signed POST
      const presignedPost = await getPresignedPost(key, {
        bucket: this.bucket,
        expiresIn: options.expiresIn,
        contentType,
        maxSize: options.maxSize,
        metadata
      });
      
      return {
        documentId,
        uploadUrl: presignedPost.url,
        fields: presignedPost.fields
      };
    } catch (error) {
      logger.error('Error generating upload URL', { 
        documentType, 
        referenceId, 
        fileName, 
        error 
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        `Failed to generate upload URL: ${error.message}`,
        { 
          documentType, 
          referenceId, 
          fileName, 
          originalError: error.message 
        }
      );
    }
  }
}