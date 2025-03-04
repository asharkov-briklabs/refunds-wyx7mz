import { Message } from '@aws-sdk/client-sqs'; // @aws-sdk/client-sqs@^3.400.0
import { SQSService } from '../integrations/aws/sqs';
import { QueueManager } from './queue-manager';
import { logger, setCorrelationId } from '../common/utils/logger';
import config from '../config';
import { metrics } from '../common/utils/metrics';
import { JobType } from './jobs';
import { handlers } from './handlers';

/**
 * Main processor class responsible for polling SQS queues, routing messages to appropriate handlers,
 * and managing the message lifecycle with error handling and retries.
 */
export class WorkerProcessor {
  private sqsService: SQSService;
  private queueManager: QueueManager;
  private running: boolean;
  private pollInterval: number;
  private maxConcurrentMessages: number;
  private activeProcessingCount: number;
  private jobHandlers: Map<JobType, Function>;
  private shutdownPromise: Promise<void> | null;
  private shutdownResolve: Function | null;

  /**
   * Initializes the worker processor with configuration settings
   */
  constructor() {
    // Initialize the SQS service
    this.sqsService = new SQSService();

    // Get queue manager instance
    this.queueManager = QueueManager.getInstance();

    // Set default values for processing parameters from configuration
    this.pollInterval = config.workers.pollInterval || 5000;
    this.maxConcurrentMessages = config.workers.maxConcurrentMessages || 10;

    // Set running state to false
    this.running = false;

    // Initialize active processing count to 0
    this.activeProcessingCount = 0;

    // Initialize job handlers map
    this.jobHandlers = new Map<JobType, Function>();

    // Register handlers for each job type
    this.jobHandlers.set(JobType.REFUND_PROCESSING, handlers.refundProcessor.processRefundRequest);
    this.jobHandlers.set(JobType.GATEWAY_CHECK, handlers.gatewayCheck.checkGatewayStatus);
    this.jobHandlers.set(JobType.APPROVAL_HANDLER, handlers.approvalHandler.processApprovals);
    this.jobHandlers.set(JobType.NOTIFICATION_HANDLER, handlers.notificationHandler.handleNotification);

    // Initialize shutdown promise management properties
    this.shutdownPromise = null;
    this.shutdownResolve = null;
  }

  /**
   * Starts the worker processor, polling for messages from configured queues
   */
  async start(): Promise<void> {
    // Set running state to true
    this.running = true;

    // Log processor start event
    logger.info('Worker processor started');

    // Start polling for messages by calling pollMessages
    this.pollMessages();

    // Return a promise that resolves immediately (non-blocking)
    return Promise.resolve();
  }

  /**
   * Stops the worker processor gracefully, waiting for in-progress jobs to complete
   */
  async stop(): Promise<void> {
    // Set running state to false
    this.running = false;

    // Log processor stop event
    logger.info('Worker processor stopping');

    // Create shutdown promise if not already created
    if (!this.shutdownPromise) {
      this.shutdownPromise = new Promise<void>((resolve) => {
        this.shutdownResolve = () => {
          resolve();
        };
      });
    }

    // If no active processing, resolve immediately
    if (this.activeProcessingCount === 0) {
      logger.info('No active processing, resolving shutdown promise');
      this.shutdownResolve();
    } else {
      // Otherwise return promise that will resolve when all processing completes
      logger.info(`Waiting for ${this.activeProcessingCount} active processes to complete`);
    }

    // Return the shutdown promise
    return this.shutdownPromise;
  }

  /**
   * Polls SQS queues for messages and processes them
   */
  private async pollMessages(): Promise<void> {
    // Check if processor is still running
    if (!this.running) {
      logger.info('Worker processor is stopped, not polling for messages');
      return;
    }

    // Calculate how many additional messages can be processed based on maxConcurrentMessages
    const availableCapacity = this.maxConcurrentMessages - this.activeProcessingCount;

    // If capacity available, continue; otherwise delay and retry
    if (availableCapacity <= 0) {
      logger.debug('No available capacity, delaying message polling');
      setTimeout(() => this.pollMessages(), this.pollInterval);
      return;
    }

    // Get queue URLs from configuration
    const queueUrls = Object.values(config.sqs.queues);

    // For each queue, receive messages with batch size based on available capacity
    for (const queueUrl of queueUrls) {
      try {
        // Receive messages from SQS queue with retry mechanism
        const messages = await this.sqsService.receiveMessages(queueUrl, {
          MaxNumberOfMessages: availableCapacity,
        });

        // For each received message, process it asynchronously with processMessage
        for (const message of messages) {
          this.processMessage(message, queueUrl);
          this.activeProcessingCount++;
        }
      } catch (error) {
        // Handle any errors during polling and log them
        logger.error('Error polling messages from SQS queue', { queueUrl, error });
      }
    }

    // Schedule next polling iteration with setTimeout based on pollInterval
    setTimeout(() => this.pollMessages(), this.pollInterval);
  }

  /**
   * Processes a single message by determining its type and routing to the appropriate handler
   * @param message 
   * @param queueUrl 
   */
  private async processMessage(message: Message, queueUrl: string): Promise<void> {
    try {
      // Generate a correlation ID for the message
      const correlationId = message.MessageId;

      // Set correlation ID using setCorrelationId
      setCorrelationId(correlationId);

      // Record processing start time for metrics
      const startTime = Date.now();

      // Parse message body to get job type and data using parseMessage
      const { jobType, data } = this.parseMessage(message);

      // Look up appropriate handler for the job type
      const handler = this.jobHandlers.get(jobType);

      // If handler not found, log error and delete message (invalid job type)
      if (!handler) {
        logger.error(`No handler found for job type: ${jobType}`, { jobType, messageId: message.MessageId });
        await this.sqsService.deleteMessage(queueUrl, message.ReceiptHandle);
        return;
      }

      // Try to process the message with the handler
      try {
        await handler(data);

        // If processing successful, delete message from the queue
        await this.sqsService.deleteMessage(queueUrl, message.ReceiptHandle);

        // Record processing metrics (success/failure, processing time)
        metrics.increment('worker.message.success', 1, { jobType });
        metrics.timing('worker.message.duration', Date.now() - startTime, { jobType });
      } catch (error) {
        // If processing fails, handle error with handleProcessingError
        await this.handleProcessingError(error, message, queueUrl, jobType);
      }
    } finally {
      // Decrement active processing count
      this.activeProcessingCount--;

      // Check if shutdown is in progress and no active processing remains
      if (!this.running && this.activeProcessingCount === 0 && this.shutdownResolve) {
        logger.info('Shutdown complete, resolving shutdown promise');
        this.shutdownResolve();
      }
    }
  }

  /**
   * Handles errors that occur during message processing with retry logic
   * @param error 
   * @param message 
   * @param queueUrl 
   * @param jobType 
   */
  private async handleProcessingError(error: any, message: Message, queueUrl: string, jobType: JobType): Promise<void> {
    // Log error details with message ID and job type
    logger.error(`Error processing message: ${message.MessageId} for job type: ${jobType}`, { error, messageId: message.MessageId, jobType });

    // Determine if error is retryable by calling isRetryableError for the job type
    const isRetryable = this.isRetryableError(error, jobType);

    // Get retry count from message attributes if available
    const retryCount = this.getRetryCount(message);

    // If retryable and under max retry limit:
    if (isRetryable && retryCount < config.workers.maxRetries) {
      // Increment retry count
      const newRetryCount = retryCount + 1;

      // Calculate visibility timeout based on exponential backoff
      const visibilityTimeout = this.calculateBackoff(newRetryCount);

      // Update message visibility timeout to delay retry
      await this.sqsService.changeMessageVisibility(queueUrl, message.ReceiptHandle, visibilityTimeout);

      // Log retry scheduled information
      logger.info(`Scheduled retry for message: ${message.MessageId} in ${visibilityTimeout} seconds (attempt ${newRetryCount})`, { messageId: message.MessageId, retryCount: newRetryCount, visibilityTimeout });
    } else {
      // If not retryable or exceeded retry limit:
      // Move message to dead-letter queue by deleting it
      await this.sqsService.deleteMessage(queueUrl, message.ReceiptHandle);

      // Log message moved to DLQ
      logger.warn(`Message moved to DLQ: ${message.MessageId} (max retries exceeded or non-retryable error)`, { messageId: message.MessageId, retryCount, isRetryable });
    }

    // Increment appropriate error metric for monitoring
    metrics.increment('worker.message.error', 1, { jobType, isRetryable });
  }

  /**
   * Parses the SQS message body to extract job type and data
   * @param message 
   */
  private parseMessage(message: Message): { jobType: JobType; data: any } {
    try {
      // Get message body from SQS message
      const messageBody = message.Body;

      // Try to parse message body as JSON
      const parsedBody = JSON.parse(messageBody);

      // Validate that jobType and data properties exist
      if (!parsedBody.jobType || !parsedBody.data) {
        throw new Error('Message body missing jobType or data properties');
      }

      // Validate that jobType is a valid JobType enum value
      if (!Object.values(JobType).includes(parsedBody.jobType)) {
        throw new Error(`Invalid job type: ${parsedBody.jobType}`);
      }

      // Return structured object with jobType and data
      return {
        jobType: parsedBody.jobType as JobType,
        data: parsedBody.data,
      };
    } catch (error) {
      // Handle parsing errors with appropriate error messages
      logger.error('Error parsing SQS message body', { error, messageId: message.MessageId });
      throw new Error(`Error parsing SQS message body: ${error.message}`);
    }
  }

  /**
   * Determines if an error should trigger a retry based on job type
   * @param error 
   * @param jobType 
   */
  private isRetryableError(error: any, jobType: JobType): boolean {
    // Use the appropriate isRetryableError function based on job type
    switch (jobType) {
      case JobType.REFUND_PROCESSING:
        return handlers.refundProcessor.isRetryableError(error);
      case JobType.GATEWAY_CHECK:
        return handlers.gatewayCheck.isRetryableError(error);
      case JobType.APPROVAL_HANDLER:
        return handlers.approvalHandler.isRetryableError(error);
      case JobType.NOTIFICATION_HANDLER:
        return handlers.notificationHandler.isRetryableError(error);
      default:
        logger.warn(`Unknown job type: ${jobType}, not retrying`);
        return false;
    }
  }

  /**
   * Gets the current retry count from message attributes
   * @param message 
   */
  private getRetryCount(message: Message): number {
    // Check if message has attributes
    if (!message.MessageAttributes) {
      return 0;
    }

    // Check if retry count attribute exists
    const retryCountAttribute = message.MessageAttributes.RetryCount;
    if (!retryCountAttribute || !retryCountAttribute.StringValue) {
      return 0;
    }

    // Parse retry count from attribute value
    const retryCount = parseInt(retryCountAttribute.StringValue, 10);

    // Return retry count or 0 if not found or invalid
    return isNaN(retryCount) ? 0 : retryCount;
  }

  /**
   * Calculates exponential backoff time based on retry count
   * @param retryCount 
   */
  private calculateBackoff(retryCount: number): number {
    // Get base delay and backoff factor from configuration
    const baseDelay = config.workers.retryDelay;
    const backoffFactor = config.workers.backoffFactor;

    // Calculate delay using exponential formula: baseDelay * (backoffFactor ^ retryCount)
    let delay = baseDelay * Math.pow(backoffFactor, retryCount);

    // Add random jitter to prevent thundering herd problem
    const jitter = Math.random() * config.workers.jitter;
    delay += jitter;

    // Ensure delay doesn't exceed maximum allowed visibility timeout
    const maxVisibilityTimeout = 43200; // 12 hours
    return Math.min(delay, maxVisibilityTimeout);
  }
}

// Export the WorkerProcessor class
export { WorkerProcessor };

// Export the default class
export default WorkerProcessor;