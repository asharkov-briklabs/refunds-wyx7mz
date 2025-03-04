import AWS from 'aws-sdk';
import { v4 } from 'uuid';
import { logger } from '../../../common/utils/logger';
import { config } from '../../../config';
import { ApiError } from '../../../common/errors/api-error';
import { ErrorCode } from '../../../common/constants/error-codes';
import { retryWithExponentialBackoff } from '../../../common/utils/idempotency';

/**
 * Options for sending SQS messages
 */
export interface SQSMessageOptions {
  DelaySeconds?: number;
  MessageAttributes?: AWS.SQS.MessageBodyAttributeMap;
  MessageDeduplicationId?: string;
  MessageGroupId?: string;
}

/**
 * Options for receiving SQS messages
 */
export interface SQSReceiveOptions {
  MaxNumberOfMessages?: number;
  VisibilityTimeout?: number;
  WaitTimeSeconds?: number;
  AttributeNames?: string[];
  MessageAttributeNames?: string[];
}

/**
 * Options for creating SQS queues
 */
export interface SQSQueueOptions {
  FifoQueue?: boolean;
  ContentBasedDeduplication?: boolean;
  VisibilityTimeout?: number;
  DelaySeconds?: number;
  RedrivePolicy?: object;
  KmsMasterKeyId?: string;
}

/**
 * Service for sending and receiving messages to/from AWS SQS queues, supporting
 * both standard and FIFO queues
 */
export class SQSService {
  private sqs: AWS.SQS;
  private queueUrlCache: Map<string, string>;
  private maxRetries: number;

  /**
   * Initialize the SQS service with AWS configuration
   * 
   * @param options - Configuration options for the SQS service
   */
  constructor(options: { maxRetries?: number } = {}) {
    // Initialize SQS client with AWS configuration from config
    this.sqs = new AWS.SQS({
      region: config.aws.region,
      endpoint: config.aws.local ? config.sqs.endpoint : undefined,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });

    // Initialize queue URL cache
    this.queueUrlCache = new Map<string, string>();

    // Set max retries from options or default value (3)
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Send a message to an SQS queue
   * 
   * @param queueName - The name of the queue to send the message to
   * @param message - The message to send
   * @param options - Additional message options
   * @returns Promise resolving to the message ID
   */
  async sendMessage(queueName: string, message: any, options: SQSMessageOptions = {}): Promise<{ MessageId: string }> {
    try {
      // Get queue URL using internal getQueueUrl method
      const queueUrl = await this.getQueueUrl(queueName);

      // Stringify message if it's not a string
      const messageBody = typeof message === 'string' ? message : JSON.stringify(message);

      // Check if queue is FIFO and ensure required parameters (MessageGroupId) are set
      if (this.isFifoQueue(queueName) && !options.MessageGroupId) {
        throw new ApiError(
          ErrorCode.INVALID_INPUT,
          'MessageGroupId is required for FIFO queues',
          { queueName }
        );
      }

      // Create send parameters with message body and options
      const params: AWS.SQS.SendMessageRequest = {
        QueueUrl: queueUrl,
        MessageBody: messageBody,
        ...options
      };

      // Send message to SQS queue with retry mechanism
      const result = await this.withRetry(() => this.sqs.sendMessage(params).promise());

      // Log successful message send
      logger.info('Message sent to SQS queue', {
        queueName,
        messageId: result.MessageId
      });

      // Return the message ID
      return { MessageId: result.MessageId! };
    } catch (error) {
      this.handleError(error, 'sendMessage');
    }
  }

  /**
   * Send multiple messages to an SQS queue in a single batch
   * 
   * @param queueName - The name of the queue to send the messages to
   * @param messages - Array of messages to send
   * @param options - Additional message options
   * @returns Promise resolving to batch send result
   */
  async sendMessageBatch(queueName: string, messages: any[], options: SQSMessageOptions = {}): Promise<AWS.SQS.SendMessageBatchResult> {
    try {
      // Get queue URL using internal getQueueUrl method
      const queueUrl = await this.getQueueUrl(queueName);

      // Check if messages array is valid and not empty
      if (!Array.isArray(messages) || messages.length === 0) {
        throw new ApiError(
          ErrorCode.INVALID_INPUT,
          'Messages must be a non-empty array',
          { queueName }
        );
      }

      // Check if queue is FIFO and ensure required parameters (MessageGroupId) are set
      const isFifo = this.isFifoQueue(queueName);
      if (isFifo && !options.MessageGroupId) {
        throw new ApiError(
          ErrorCode.INVALID_INPUT,
          'MessageGroupId is required for FIFO queues',
          { queueName }
        );
      }

      // Prepare batch entries with ID and message body for each message
      const entries: AWS.SQS.SendMessageBatchRequestEntry[] = messages.map((message, index) => {
        const messageBody = typeof message === 'string' ? message : JSON.stringify(message);
        
        const entry: AWS.SQS.SendMessageBatchRequestEntry = {
          Id: `msg-${index}-${Date.now()}`,
          MessageBody: messageBody,
          ...options
        };

        // For FIFO queues, add deduplication ID if not provided
        if (isFifo && !entry.MessageDeduplicationId) {
          entry.MessageDeduplicationId = v4();
        }

        return entry;
      });

      // Send message batch to SQS queue with retry mechanism
      const params: AWS.SQS.SendMessageBatchRequest = {
        QueueUrl: queueUrl,
        Entries: entries
      };

      const result = await this.withRetry(() => this.sqs.sendMessageBatch(params).promise());

      // Log successful batch send and any failed entries
      logger.info('Batch messages sent to SQS queue', {
        queueName,
        successful: result.Successful?.length || 0,
        failed: result.Failed?.length || 0
      });

      // If there are failed entries, log detailed errors
      if (result.Failed && result.Failed.length > 0) {
        logger.warn('Some messages in batch failed to send', {
          queueName,
          failures: result.Failed
        });
      }

      // Return the batch send result
      return result;
    } catch (error) {
      this.handleError(error, 'sendMessageBatch');
    }
  }

  /**
   * Receive messages from an SQS queue
   * 
   * @param queueName - The name of the queue to receive messages from
   * @param options - Options for receiving messages
   * @returns Promise resolving to array of messages
   */
  async receiveMessages(queueName: string, options: SQSReceiveOptions = {}): Promise<AWS.SQS.Message[]> {
    try {
      // Get queue URL using internal getQueueUrl method
      const queueUrl = await this.getQueueUrl(queueName);

      // Create receive parameters with optional settings (MaxNumberOfMessages, VisibilityTimeout, WaitTimeSeconds)
      const params: AWS.SQS.ReceiveMessageRequest = {
        QueueUrl: queueUrl,
        MaxNumberOfMessages: options.MaxNumberOfMessages || 10,
        VisibilityTimeout: options.VisibilityTimeout || 30,
        WaitTimeSeconds: options.WaitTimeSeconds || 0,
        AttributeNames: options.AttributeNames || ['All'],
        MessageAttributeNames: options.MessageAttributeNames || ['All']
      };

      // Receive messages from SQS queue with retry mechanism
      const result = await this.withRetry(() => this.sqs.receiveMessage(params).promise());

      // Log number of messages received
      logger.info('Messages received from SQS queue', {
        queueName,
        count: result.Messages?.length || 0
      });

      // Return the received messages
      return result.Messages || [];
    } catch (error) {
      this.handleError(error, 'receiveMessages');
    }
  }

  /**
   * Delete a message from an SQS queue
   * 
   * @param queueName - The name of the queue
   * @param receiptHandle - The receipt handle of the message to delete
   * @returns Promise resolving when message is deleted
   */
  async deleteMessage(queueName: string, receiptHandle: string): Promise<void> {
    try {
      // Get queue URL using internal getQueueUrl method
      const queueUrl = await this.getQueueUrl(queueName);

      // Create delete parameters with receipt handle
      const params: AWS.SQS.DeleteMessageRequest = {
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle
      };

      // Delete message from SQS queue with retry mechanism
      await this.withRetry(() => this.sqs.deleteMessage(params).promise());

      // Log successful message deletion
      logger.info('Message deleted from SQS queue', {
        queueName,
        receiptHandle: receiptHandle.substring(0, 20) + '...' // Truncate for logging
      });
    } catch (error) {
      this.handleError(error, 'deleteMessage');
    }
  }

  /**
   * Delete multiple messages from an SQS queue in a single batch
   * 
   * @param queueName - The name of the queue
   * @param receiptHandles - Array of receipt handles to delete
   * @returns Promise resolving to batch deletion result
   */
  async deleteMessageBatch(queueName: string, receiptHandles: string[]): Promise<AWS.SQS.DeleteMessageBatchResult> {
    try {
      // Get queue URL using internal getQueueUrl method
      const queueUrl = await this.getQueueUrl(queueName);

      // Check if receipt handles array is valid and not empty
      if (!Array.isArray(receiptHandles) || receiptHandles.length === 0) {
        throw new ApiError(
          ErrorCode.INVALID_INPUT,
          'Receipt handles must be a non-empty array',
          { queueName }
        );
      }

      // Prepare batch entries with ID and receipt handle for each message
      const entries: AWS.SQS.DeleteMessageBatchRequestEntry[] = receiptHandles.map((handle, index) => ({
        Id: `msg-${index}-${Date.now()}`,
        ReceiptHandle: handle
      }));

      // Delete message batch from SQS queue with retry mechanism
      const params: AWS.SQS.DeleteMessageBatchRequest = {
        QueueUrl: queueUrl,
        Entries: entries
      };

      const result = await this.withRetry(() => this.sqs.deleteMessageBatch(params).promise());

      // Log successful batch deletion and any failed entries
      logger.info('Batch messages deleted from SQS queue', {
        queueName,
        successful: result.Successful?.length || 0,
        failed: result.Failed?.length || 0
      });

      // If there are failed entries, log detailed errors
      if (result.Failed && result.Failed.length > 0) {
        logger.warn('Some messages in batch failed to delete', {
          queueName,
          failures: result.Failed
        });
      }

      // Return the batch deletion result
      return result;
    } catch (error) {
      this.handleError(error, 'deleteMessageBatch');
    }
  }

  /**
   * Remove all messages from an SQS queue
   * 
   * @param queueName - The name of the queue to purge
   * @returns Promise resolving when queue is purged
   */
  async purgeQueue(queueName: string): Promise<void> {
    try {
      // Get queue URL using internal getQueueUrl method
      const queueUrl = await this.getQueueUrl(queueName);

      // Create purge parameters with queue URL
      const params: AWS.SQS.PurgeQueueRequest = {
        QueueUrl: queueUrl
      };

      // Purge SQS queue with retry mechanism
      await this.withRetry(() => this.sqs.purgeQueue(params).promise());

      // Log successful queue purge
      logger.info('SQS queue purged', { queueName });
    } catch (error) {
      this.handleError(error, 'purgeQueue');
    }
  }

  /**
   * Get the URL for an SQS queue by name
   * 
   * @param queueName - The name of the queue
   * @returns Promise resolving to queue URL
   */
  async getQueueUrl(queueName: string): Promise<string> {
    try {
      // Check if queue URL is in cache and return if found
      if (this.queueUrlCache.has(queueName)) {
        return this.queueUrlCache.get(queueName)!;
      }

      // Create get queue URL parameters with queue name
      const params: AWS.SQS.GetQueueUrlRequest = {
        QueueName: queueName
      };

      // Get queue URL from SQS with retry mechanism
      const result = await this.withRetry(() => this.sqs.getQueueUrl(params).promise());

      // Cache the queue URL for future use
      if (result.QueueUrl) {
        this.queueUrlCache.set(queueName, result.QueueUrl);
      }

      // Return the queue URL
      return result.QueueUrl!;
    } catch (error) {
      // Special handling for queue doesn't exist error
      if (error && typeof error === 'object' && 'code' in error && error.code === 'AWS.SimpleQueueService.NonExistentQueue') {
        throw new ApiError(
          ErrorCode.RESOURCE_NOT_FOUND,
          `Queue not found: ${queueName}`,
          { queueName }
        );
      }
      this.handleError(error, 'getQueueUrl');
    }
  }

  /**
   * Create a new SQS queue with the specified name and attributes
   * 
   * @param queueName - The name of the queue to create
   * @param options - Queue configuration options
   * @returns Promise resolving to the URL of the created queue
   */
  async createQueue(queueName: string, options: SQSQueueOptions = {}): Promise<string> {
    try {
      // Check if queueName is valid and follows naming conventions
      if (!queueName || typeof queueName !== 'string') {
        throw new ApiError(
          ErrorCode.INVALID_INPUT,
          'Queue name must be a non-empty string'
        );
      }

      // If FIFO queue is requested, ensure queueName ends with .fifo
      if (options.FifoQueue && !queueName.endsWith('.fifo')) {
        queueName = `${queueName}.fifo`;
        logger.warn('Appended .fifo suffix to queue name', { queueName });
      }

      // Prepare queue attributes map from options
      const attributes: AWS.SQS.QueueAttributeMap = {};

      if (options.FifoQueue) {
        attributes['FifoQueue'] = 'true';
      }

      if (options.ContentBasedDeduplication) {
        attributes['ContentBasedDeduplication'] = 'true';
      }

      if (options.VisibilityTimeout !== undefined) {
        attributes['VisibilityTimeout'] = options.VisibilityTimeout.toString();
      }

      if (options.DelaySeconds !== undefined) {
        attributes['DelaySeconds'] = options.DelaySeconds.toString();
      }

      if (options.RedrivePolicy) {
        attributes['RedrivePolicy'] = JSON.stringify(options.RedrivePolicy);
      }

      if (options.KmsMasterKeyId) {
        attributes['KmsMasterKeyId'] = options.KmsMasterKeyId;
      }

      // Create queue in SQS with retry mechanism
      const params: AWS.SQS.CreateQueueRequest = {
        QueueName: queueName,
        Attributes: attributes
      };

      const result = await this.withRetry(() => this.sqs.createQueue(params).promise());

      // Log successful queue creation
      logger.info('SQS queue created', {
        queueName,
        queueUrl: result.QueueUrl
      });

      // Cache the queue URL
      if (result.QueueUrl) {
        this.queueUrlCache.set(queueName, result.QueueUrl);
      }

      // Return the queue URL
      return result.QueueUrl!;
    } catch (error) {
      this.handleError(error, 'createQueue');
    }
  }

  /**
   * Configure a Dead Letter Queue for an existing queue
   * 
   * @param queueName - The name of the source queue
   * @param deadLetterQueueName - The name of the dead letter queue
   * @param maxReceiveCount - Maximum number of times a message can be received before moving to DLQ
   * @returns Promise resolving when DLQ is configured
   */
  async configureDeadLetterQueue(
    queueName: string,
    deadLetterQueueName: string,
    maxReceiveCount: number
  ): Promise<void> {
    try {
      // Get queue URL for source queue
      const queueUrl = await this.getQueueUrl(queueName);

      // Get queue URL for dead letter queue
      const dlqUrl = await this.getQueueUrl(deadLetterQueueName);

      // Get queue ARN for dead letter queue
      const dlqAttributes = await this.withRetry(() => 
        this.sqs.getQueueAttributes({
          QueueUrl: dlqUrl,
          AttributeNames: ['QueueArn']
        }).promise()
      );

      if (!dlqAttributes.Attributes?.QueueArn) {
        throw new ApiError(
          ErrorCode.CONFIGURATION_ERROR,
          'Failed to get ARN for dead letter queue',
          { deadLetterQueueName }
        );
      }

      // Create redrive policy JSON with deadLetterTargetArn and maxReceiveCount
      const redrivePolicy = {
        deadLetterTargetArn: dlqAttributes.Attributes.QueueArn,
        maxReceiveCount
      };

      // Set queue attributes with redrive policy
      await this.withRetry(() => 
        this.sqs.setQueueAttributes({
          QueueUrl: queueUrl,
          Attributes: {
            RedrivePolicy: JSON.stringify(redrivePolicy)
          }
        }).promise()
      );

      // Log successful DLQ configuration
      logger.info('Dead letter queue configured', {
        queueName,
        deadLetterQueueName,
        maxReceiveCount
      });
    } catch (error) {
      this.handleError(error, 'configureDeadLetterQueue');
    }
  }

  /**
   * Check if an SQS queue exists
   * 
   * @param queueName - The name of the queue to check
   * @returns Promise resolving to true if queue exists, false otherwise
   */
  async checkQueueExists(queueName: string): Promise<boolean> {
    try {
      // Try to get queue URL
      await this.getQueueUrl(queueName);
      // Return true if successful
      return true;
    } catch (error) {
      // If AWS.SQS.QueueDoesNotExist error occurs, return false
      if (error instanceof ApiError && error.code === ErrorCode.RESOURCE_NOT_FOUND) {
        return false;
      }
      // For other errors, throw them
      this.handleError(error, 'checkQueueExists');
    }
  }

  /**
   * Check if a queue is a FIFO queue based on name
   * 
   * @param queueName - The name of the queue to check
   * @returns True if queue is FIFO (ends with .fifo), false otherwise
   */
  isFifoQueue(queueName: string): boolean {
    // Check if queueName ends with .fifo
    return queueName.endsWith('.fifo');
  }

  /**
   * Utility method for retrying AWS operations with exponential backoff
   * 
   * @param operation - The operation to retry
   * @returns Promise resolving to the operation result
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let retryCount = 0;
    let lastError: any;
    
    while (retryCount <= this.maxRetries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Determine if error is retryable
        const isRetryable = this.isRetryableError(error);
        
        if (!isRetryable || retryCount >= this.maxRetries) {
          break;
        }
        
        retryCount++;
        const delay = Math.pow(2, retryCount) * 100 + Math.random() * 100;
        
        logger.warn(`Retrying SQS operation (${retryCount}/${this.maxRetries}) after ${delay}ms`, {
          error: error instanceof Error ? error.message : String(error)
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  /**
   * Determine if an error is retryable
   * 
   * @param error - The error to check
   * @returns True if the error is retryable, false otherwise
   */
  private isRetryableError(error: any): boolean {
    // AWS service errors
    if (error && typeof error === 'object' && 'code' in error) {
      const retryableCodes = [
        'RequestTimeout',
        'InternalError',
        'ServiceUnavailable',
        'ThrottlingException',
        'ProvisionedThroughputExceededException',
        'RequestThrottled',
        'TooManyRequestsException',
        'Throttling'
      ];
      
      return retryableCodes.includes(error.code);
    }
    
    // Network errors
    if (error instanceof Error) {
      const networkErrors = [
        'ECONNRESET',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'EPIPE',
        'EHOSTUNREACH'
      ];
      
      return networkErrors.some(code => error.message.includes(code));
    }
    
    return false;
  }

  /**
   * Handle AWS SQS errors and provide useful error messages
   * 
   * @param error - The error to handle
   * @param operation - The operation that caused the error
   * @throws ApiError with appropriate error code and message
   */
  private handleError(error: Error, operation: string): never {
    // Log error details
    logger.error(`SQS ${operation} operation failed`, {
      error: error.message,
      stack: error.stack
    });

    // Transform AWS error into appropriate ApiError type
    if (error instanceof ApiError) {
      throw error;
    }

    // AWS specific error handling
    if (error && typeof error === 'object' && 'code' in error) {
      const awsError = error as AWS.AWSError;
      
      switch (awsError.code) {
        case 'AWS.SimpleQueueService.NonExistentQueue':
          throw new ApiError(
            ErrorCode.RESOURCE_NOT_FOUND,
            `Queue not found`,
            { operation }
          );
        case 'InvalidParameterValue':
        case 'AWS.SimpleQueueService.InvalidParameterValue':
          throw new ApiError(
            ErrorCode.INVALID_INPUT,
            `Invalid parameter for SQS operation: ${awsError.message}`,
            { operation }
          );
        case 'OverLimit':
        case 'AWS.SimpleQueueService.QueueDeletedRecently':
          throw new ApiError(
            ErrorCode.RATE_LIMIT_EXCEEDED,
            `SQS rate limit exceeded: ${awsError.message}`,
            { operation }
          );
        case 'AccessDenied':
        case 'AWS.SimpleQueueService.AccessDenied':
          throw new ApiError(
            ErrorCode.UNAUTHORIZED_ACCESS,
            `Access denied for SQS operation: ${awsError.message}`,
            { operation }
          );
        case 'NetworkingError':
        case 'TimeoutError':
        case 'RequestTimeout':
          throw new ApiError(
            ErrorCode.GATEWAY_CONNECTION_ERROR,
            `Network error during SQS operation: ${awsError.message}`,
            { operation, retryable: true }
          );
      }
    }

    // Throw the transformed error
    throw new ApiError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      `Unexpected error during SQS ${operation}: ${error.message}`,
      { operation }
    );
  }
}

export { SQSMessageOptions, SQSReceiveOptions, SQSQueueOptions };