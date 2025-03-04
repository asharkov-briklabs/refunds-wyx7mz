import {
  SQSClient,
  SQSMessageAttributes // @aws-sdk/client-sqs ^3.352.0
} from '../integrations/aws/sqs';
import { sqsConfig } from '../config/sqs';
import { logger } from '../common/utils/logger';
import { createIdempotencyKey } from '../common/utils/idempotency';
import { eventEmitter } from '../common/utils/event-emitter';

/**
 * Manages SQS queue operations for the Refunds Service, providing methods for sending,
 * receiving, and deleting messages with support for idempotency, retries, and error handling.
 */
export class QueueManager {
  private sqsClient: SQSClient;
  private queues: Record<string, string>;
  private retryConfig: { maxRetries: number, backoffFactor: number, initialDelay: number };

  /**
   * Initializes the QueueManager with SQS client and configuration
   */
  constructor() {
    // Initialize the SQS client
    this.sqsClient = new SQSClient();

    // Load queue configuration from sqsConfig
    this.queues = sqsConfig.queues;

    // Set up retry configuration
    this.retryConfig = sqsConfig.retryConfig;
  }

  /**
   * Sends a message to the specified queue with optional attributes and idempotency key
   *
   * @param queueName - Name of the queue to send the message to
   * @param payload - Message payload (must be JSON serializable)
   * @param attributes - Optional message attributes
   * @param idempotencyKey - Optional idempotency key to prevent duplicate processing
   * @param delaySeconds - Optional delay in seconds before the message is available
   * @returns Message ID from SQS
   */
  async sendMessage(
    queueName: string,
    payload: any,
    attributes?: SQSMessageAttributes,
    idempotencyKey?: string,
    delaySeconds?: number
  ): Promise<{ messageId: string }> {
    // Get queue URL from configuration
    const queueUrl = this.getQueueUrl(queueName);

    // Create idempotency key if not provided
    const finalIdempotencyKey = idempotencyKey || createIdempotencyKey({ queueName, payload });

    // Stringify the payload
    const messageBody = JSON.stringify(payload);

    // Add message attributes including idempotency key
    const messageAttributes: SQSMessageAttributes = {
      ...attributes,
      IdempotencyKey: {
        DataType: 'String',
        StringValue: finalIdempotencyKey,
      },
    };

    // Call SQS client to send message with retry logic
    const params = {
      QueueUrl: queueUrl,
      MessageBody: messageBody,
      MessageAttributes: messageAttributes,
      DelaySeconds: delaySeconds,
    };

    try {
      const result = await this.retryWithBackoff(
        () => this.sqsClient.sendMessage(params)
      );

      // Log message sent event
      logger.info('Message sent to SQS queue', {
        queueName,
        messageId: result.MessageId,
        idempotencyKey: finalIdempotencyKey,
      });

      eventEmitter.emit('sqs.message.sent', {
        queueName,
        messageId: result.MessageId,
        idempotencyKey: finalIdempotencyKey,
      });

      // Return message ID
      return { messageId: result.MessageId };
    } catch (error) {
      logger.error('Error sending message to SQS queue', {
        queueName,
        idempotencyKey: finalIdempotencyKey,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Sends multiple messages to the specified queue in a batch
   *
   * @param queueName - Name of the queue to send the messages to
   * @param messages - Array of messages to send, each with payload and optional attributes
   * @returns Results of batch send operation
   */
  async sendBatchMessages(
    queueName: string,
    messages: Array<{ payload: any, attributes?: SQSMessageAttributes, idempotencyKey?: string, delaySeconds?: number }>
  ): Promise<{ successful: Array<{ id: string, messageId: string }>, failed: Array<{ id: string, error: Error }> }> {
    // Get queue URL from configuration
    const queueUrl = this.getQueueUrl(queueName);

    // Prepare batch entries with payloads and attributes
    const batchEntries = messages.map((message, index) => {
      const { payload, attributes, idempotencyKey, delaySeconds } = message;
      const messageBody = JSON.stringify(payload);
      const finalIdempotencyKey = idempotencyKey || createIdempotencyKey({ queueName, payload });
      const messageId = `msg-${index}-${Date.now()}`;

      const entry = {
        Id: messageId,
        MessageBody: messageBody,
        MessageAttributes: {
          ...attributes,
          IdempotencyKey: {
            DataType: 'String',
            StringValue: finalIdempotencyKey,
          },
        },
        DelaySeconds: delaySeconds,
      };
      return entry;
    });

    const successful: Array<{ id: string, messageId: string }> = [];
    const failed: Array<{ id: string, error: Error }> = [];

    // Call SQS client to send messages in batches (max 10 per batch)
    try {
      // Process messages in chunks of 10
      for (let i = 0; i < batchEntries.length; i += 10) {
        const chunk = batchEntries.slice(i, i + 10);
        const params = {
          QueueUrl: queueUrl,
          Entries: chunk,
        };

        const result = await this.retryWithBackoff(
          () => this.sqsClient.sendBatchMessages(params)
        );

        // Handle partial failures and retry logic
        if (result.Successful) {
          result.Successful.forEach(success => {
            successful.push({
              id: success.Id,
              messageId: success.MessageId,
            });
          });
        }

        if (result.Failed) {
          result.Failed.forEach(failure => {
            failed.push({
              id: failure.Id,
              error: new Error(failure.Message),
            });
          });
        }
      }

      // Log batch send results
      logger.info('Batch messages sent to SQS queue', {
        queueName,
        successful: successful.length,
        failed: failed.length,
      });

      // Return successful and failed messages
      return { successful, failed };
    } catch (error) {
      logger.error('Error sending batch messages to SQS queue', {
        queueName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Receives messages from the specified queue
   *
   * @param queueName - Name of the queue to receive messages from
   * @param maxMessages - Maximum number of messages to receive (default: 10)
   * @param visibilityTimeout - Visibility timeout in seconds (default: 30)
   * @param waitTimeSeconds - Wait time in seconds for long polling (default: 0)
   * @returns Messages received from the queue
   */
  async receiveMessages(
    queueName: string,
    maxMessages: number = 10,
    visibilityTimeout: number = 30,
    waitTimeSeconds: number = 0
  ): Promise<Array<{ messageId: string, body: any, receiptHandle: string, attributes: Record<string, any> }>> {
    // Get queue URL from configuration
    const queueUrl = this.getQueueUrl(queueName);

    // Call SQS client to receive messages with provided parameters
    const params = {
      QueueUrl: queueUrl,
      MaxNumberOfMessages: maxMessages,
      VisibilityTimeout: visibilityTimeout,
      WaitTimeSeconds: waitTimeSeconds,
      MessageAttributeNames: ['All'],
    };

    try {
      const result = await this.retryWithBackoff(
        () => this.sqsClient.receiveMessages(params)
      );

      // Parse message bodies from JSON to objects
      const messages = (result.Messages || []).map(message => ({
        messageId: message.MessageId,
        body: JSON.parse(message.Body),
        receiptHandle: message.ReceiptHandle,
        attributes: message.MessageAttributes,
      }));

      // Log received messages count
      logger.info('Messages received from SQS queue', {
        queueName,
        count: messages.length,
      });

      eventEmitter.emit('sqs.message.received', {
        queueName,
        count: messages.length,
      });

      // Return formatted messages
      return messages;
    } catch (error) {
      logger.error('Error receiving messages from SQS queue', {
        queueName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Deletes a message from the queue after successful processing
   *
   * @param queueName - Name of the queue
   * @param receiptHandle - Receipt handle of the message to delete
   */
  async deleteMessage(queueName: string, receiptHandle: string): Promise<void> {
    // Get queue URL from configuration
    const queueUrl = this.getQueueUrl(queueName);

    // Call SQS client to delete message
    const params = {
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    };

    try {
      await this.retryWithBackoff(
        () => this.sqsClient.deleteMessage(params)
      );

      // Log message deletion
      logger.info('Message deleted from SQS queue', {
        queueName,
        receiptHandle: receiptHandle.substring(0, 20) + '...', // Truncate for logging
      });

      eventEmitter.emit('sqs.message.deleted', {
        queueName,
        receiptHandle: receiptHandle.substring(0, 20) + '...',
      });
    } catch (error) {
      logger.error('Error deleting message from SQS queue', {
        queueName,
        receiptHandle: receiptHandle.substring(0, 20) + '...',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Changes the visibility timeout of a message to extend or reduce processing time
   *
   * @param queueName - Name of the queue
   * @param receiptHandle - Receipt handle of the message to change visibility
   * @param visibilityTimeout - New visibility timeout in seconds
   */
  async changeMessageVisibility(queueName: string, receiptHandle: string, visibilityTimeout: number): Promise<void> {
    // Get queue URL from configuration
    const queueUrl = this.getQueueUrl(queueName);

    // Call SQS client to change message visibility timeout
    const params = {
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
      VisibilityTimeout: visibilityTimeout,
    };

    try {
      await this.retryWithBackoff(
        () => this.sqsClient.changeMessageVisibility(params)
      );

      // Log visibility change
      logger.info('Message visibility timeout changed', {
        queueName,
        receiptHandle: receiptHandle.substring(0, 20) + '...',
        visibilityTimeout,
      });

      eventEmitter.emit('sqs.message.visibilityChanged', {
        queueName,
        receiptHandle: receiptHandle.substring(0, 20) + '...',
        visibilityTimeout,
      });
    } catch (error) {
      logger.error('Error changing message visibility timeout', {
        queueName,
        receiptHandle: receiptHandle.substring(0, 20) + '...',
        visibilityTimeout,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Gets the URL for a queue by name from configuration
   *
   * @param queueName - Name of the queue
   * @returns Queue URL from configuration
   */
  getQueueUrl(queueName: string): string {
    // Look up queue URL from configuration
    const queueUrl = this.queues[queueName];

    // Throw error if queue not found
    if (!queueUrl) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    // Return queue URL
    return queueUrl;
  }

  /**
   * Purges all messages from a queue (mainly for testing)
   *
   * @param queueName - Name of the queue to purge
   */
  async purgeQueue(queueName: string): Promise<void> {
    // Get queue URL from configuration
    const queueUrl = this.getQueueUrl(queueName);

    // Call SQS client to purge queue
    const params = {
      QueueUrl: queueUrl,
    };

    try {
      await this.retryWithBackoff(
        () => this.sqsClient.purgeQueue(params)
      );

      // Log purge operation
      logger.info('SQS queue purged', { queueName });

      eventEmitter.emit('sqs.queue.purged', { queueName });
    } catch (error) {
      logger.error('Error purging SQS queue', {
        queueName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Implements exponential backoff retry logic for queue operations
   *
   * @param operation - Function to execute
   * @param maxRetries - Maximum number of retries (optional, defaults to retryConfig)
   * @param backoffFactor - Exponential backoff factor (optional, defaults to retryConfig)
   * @param initialDelay - Initial delay in milliseconds (optional, defaults to retryConfig)
   * @returns Result of the operation after successful execution
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.retryConfig.maxRetries,
    backoffFactor: number = this.retryConfig.backoffFactor,
    initialDelay: number = this.retryConfig.initialDelay
  ): Promise<T> {
    let retryCount = 0;
    let lastError: any;

    // Execute the operation function
    while (retryCount <= maxRetries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        retryCount++;

        // If successful, return the result
        if (retryCount > maxRetries) {
          break;
        }

        // If failed, wait with exponential backoff
        const delay = initialDelay * Math.pow(backoffFactor, retryCount - 1);
        logger.warn(`Retrying SQS operation (${retryCount}/${maxRetries}) after ${delay}ms`, {
          error: error instanceof Error ? error.message : String(error),
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Retry operation up to maxRetries times
    logger.error('SQS operation failed after multiple retries', {
      maxRetries,
      error: lastError instanceof Error ? lastError.message : String(lastError),
    });
    throw lastError;
  }
}

// Create a singleton instance of QueueManager for application-wide use
const queueManager = new QueueManager();

// Export the QueueManager class and the default instance
export { QueueManager };
export default queueManager;