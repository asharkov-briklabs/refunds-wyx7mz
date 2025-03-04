/**
 * AWS SQS Configuration for Refunds Service
 * 
 * This configuration file defines the AWS SQS settings for handling
 * asynchronous processing of refund requests, gateway operations,
 * notifications, and error handling throughout the Refunds Service.
 * 
 * @version 1.0.0
 */

/**
 * SQS Queue Type: Standard or FIFO
 * - Standard: Higher throughput, at-least-once delivery, best-effort ordering
 * - FIFO: Exactly-once processing, strict ordering, limited throughput
 */
export type QueueType = 'standard' | 'fifo';

/**
 * Interface defining individual SQS queue configuration
 */
export interface QueueConfig {
  /** Unique name for the queue */
  name: string;
  
  /** Full queue URL including region and account ID */
  url: string;
  
  /** Queue type - standard or FIFO */
  type: QueueType;
  
  /** Message visibility timeout in seconds */
  visibilityTimeout: number;
  
  /** Maximum number of receive attempts before sending to DLQ */
  maxReceiveCount: number;
  
  /** Dead letter queue ARN (if applicable) */
  deadLetterQueueArn?: string;
  
  /** Message retention period in seconds */
  messageRetentionPeriod: number;
  
  /** Delay in seconds for message delivery (standard queues) */
  delaySeconds?: number;
  
  /** Whether the queue has content-based deduplication enabled (FIFO only) */
  contentBasedDeduplication?: boolean;
  
  /** Maximum message size in bytes */
  maximumMessageSize: number;
  
  /** Timeout for long polling receive message calls */
  receiveMessageWaitTimeSeconds: number;
  
  /** Batch size for processing messages */
  batchSize: number;
}

/**
 * Interface for the complete SQS configuration
 */
export interface SQSConfig {
  /** AWS region for SQS */
  region: string;
  
  /** Custom endpoint for local development */
  endpoint?: string;
  
  /** Flag indicating if using local SQS (e.g., localstack) */
  local: boolean;
  
  /** Map of queue names to their configurations */
  queues: {
    /** Queue for processing new refund requests with high throughput */
    refundRequest: QueueConfig;
    
    /** FIFO queue for ordered processing of gateway operations */
    gatewayProcessing: QueueConfig;
    
    /** Queue for handling failed message processing */
    deadLetter: QueueConfig;
    
    /** Queue for notification delivery */
    notification: QueueConfig;
  };
}

/**
 * Get environment-specific SQS configuration based on Node environment
 * 
 * @returns Complete SQS configuration object
 */
function getEnvironmentConfig(): SQSConfig {
  // Determine environment
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isLocal = nodeEnv === 'development' || nodeEnv === 'test';
  
  // Base account and region information
  const region = process.env.AWS_REGION || 'us-east-1';
  const accountId = process.env.AWS_ACCOUNT_ID || '000000000000';
  
  // Base queue URL format
  const baseQueueUrl = isLocal
    ? `http://localhost:4566/queue`
    : `https://sqs.${region}.amazonaws.com/${accountId}`;
  
  // Create base configuration
  const config: SQSConfig = {
    region,
    local: isLocal,
    endpoint: isLocal ? 'http://localhost:4566' : undefined,
    queues: {
      // Refund Request Queue - Standard queue with high throughput
      refundRequest: {
        name: `refund-request-queue${isLocal ? '' : '-' + nodeEnv}`,
        url: `${baseQueueUrl}/refund-request-queue${isLocal ? '' : '-' + nodeEnv}`,
        type: 'standard',
        visibilityTimeout: 300, // 5 minutes
        maxReceiveCount: 3,
        messageRetentionPeriod: 1209600, // 14 days
        delaySeconds: 0,
        maximumMessageSize: 262144, // 256 KB
        receiveMessageWaitTimeSeconds: 20, // Long polling
        batchSize: 10
      },
      
      // Gateway Processing Queue - FIFO queue for ordered processing
      gatewayProcessing: {
        name: `gateway-processing-queue.fifo${isLocal ? '' : '-' + nodeEnv}`,
        url: `${baseQueueUrl}/gateway-processing-queue.fifo${isLocal ? '' : '-' + nodeEnv}`,
        type: 'fifo',
        visibilityTimeout: 900, // 15 minutes for gateway processing
        maxReceiveCount: 5, // More retries for gateway operations
        messageRetentionPeriod: 345600, // 4 days
        contentBasedDeduplication: true,
        maximumMessageSize: 262144, // 256 KB
        receiveMessageWaitTimeSeconds: 20, // Long polling
        batchSize: 5 // Smaller batch size for FIFO queues
      },
      
      // Dead Letter Queue - For failed message handling
      deadLetter: {
        name: `dead-letter-queue${isLocal ? '' : '-' + nodeEnv}`,
        url: `${baseQueueUrl}/dead-letter-queue${isLocal ? '' : '-' + nodeEnv}`,
        type: 'standard',
        visibilityTimeout: 60, // 1 minute for inspection
        maxReceiveCount: 1, // No retries from dead letter queue
        messageRetentionPeriod: 1209600, // 14 days
        maximumMessageSize: 262144, // 256 KB
        receiveMessageWaitTimeSeconds: 0, // No long polling
        batchSize: 10
      },
      
      // Notification Queue - Standard queue with batching support
      notification: {
        name: `notification-queue${isLocal ? '' : '-' + nodeEnv}`,
        url: `${baseQueueUrl}/notification-queue${isLocal ? '' : '-' + nodeEnv}`,
        type: 'standard',
        visibilityTimeout: 60, // 1 minute for quick notification processing
        maxReceiveCount: 3,
        messageRetentionPeriod: 259200, // 3 days
        delaySeconds: 0,
        maximumMessageSize: 262144, // 256 KB
        receiveMessageWaitTimeSeconds: 10, // Moderate long polling
        batchSize: 20 // Larger batch size for notifications
      }
    }
  };

  // Apply environment-specific overrides
  if (nodeEnv === 'production') {
    // Production overrides
    config.queues.refundRequest.visibilityTimeout = 600; // 10 minutes for production
    config.queues.refundRequest.deadLetterQueueArn = `arn:aws:sqs:${region}:${accountId}:dead-letter-queue-production`;
    config.queues.gatewayProcessing.deadLetterQueueArn = `arn:aws:sqs:${region}:${accountId}:dead-letter-queue-production`;
    config.queues.notification.deadLetterQueueArn = `arn:aws:sqs:${region}:${accountId}:dead-letter-queue-production`;
  } else if (nodeEnv === 'staging') {
    // Staging overrides
    config.queues.refundRequest.deadLetterQueueArn = `arn:aws:sqs:${region}:${accountId}:dead-letter-queue-staging`;
    config.queues.gatewayProcessing.deadLetterQueueArn = `arn:aws:sqs:${region}:${accountId}:dead-letter-queue-staging`;
    config.queues.notification.deadLetterQueueArn = `arn:aws:sqs:${region}:${accountId}:dead-letter-queue-staging`;
  } else {
    // Development/Test overrides
    // Use shorter visibility timeouts for faster testing
    config.queues.refundRequest.visibilityTimeout = 180; // 3 minutes
    config.queues.gatewayProcessing.visibilityTimeout = 300; // 5 minutes
  }

  return config;
}

// Create and export the SQS configuration
const sqsConfig = getEnvironmentConfig();
export default sqsConfig;