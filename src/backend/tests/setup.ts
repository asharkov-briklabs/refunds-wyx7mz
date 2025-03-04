import { MongoMemoryServer } from 'mongodb-memory-server'; // mongodb-memory-server ^8.12.0
import mockDate from 'mockdate'; // mockdate ^3.0.5
import * as dotenv from 'dotenv'; // dotenv ^16.0.3
import { connect } from '../database/connection';
import { logger } from '../common/utils/logger';
import { resetAllMocks } from './mocks';
import { SQSService } from '../integrations/aws/sqs';
import testConfig from '../config/environments/test';

// Global variables for test environment
let mongoServer: MongoMemoryServer | null = null;
let sqsService: SQSService | null = null;

/**
 * Sets up an in-memory MongoDB server for isolated testing
 */
async function setupMockDatabase(): Promise<void> {
  try {
    // Create a new MongoMemoryServer instance
    mongoServer = await MongoMemoryServer.create();
    
    // Get the URI of the in-memory MongoDB server
    const mongoUri = mongoServer.getUri();
    
    // Override the database URI in the test configuration
    testConfig.database.uri = mongoUri;
    
    // Initialize the database connection using connect() function
    await connect();
    
    logger.info('Mock database setup successfully', { uri: mongoUri });
  } catch (error) {
    logger.error('Failed to set up mock database', { error });
    throw error;
  }
}

/**
 * Sets up SQS queues for message-based testing
 */
async function setupTestQueues(): Promise<void> {
  try {
    // Initialize SQSService with test configuration
    sqsService = new SQSService();
    
    // Get test queue names from configuration
    const queueNames = Object.values(testConfig.sqs.queues);
    
    // Create required queues if they don't exist
    for (const queueName of queueNames) {
      const queueExists = await sqsService.checkQueueExists(queueName);
      
      if (!queueExists) {
        logger.info(`Creating test SQS queue: ${queueName}`);
        
        // Determine if this is a FIFO queue
        const isFifo = queueName.endsWith('.fifo');
        
        // Create the queue
        await sqsService.createQueue(queueName, {
          FifoQueue: isFifo,
          ContentBasedDeduplication: isFifo,
          VisibilityTimeout: testConfig.sqs.visibilityTimeout || 30
        });
      }
    }
    
    // Configure dead letter queue if specified in config
    const deadLetterQueueName = testConfig.sqs.queues.deadLetterQueue;
    const mainQueueName = testConfig.sqs.queues.refundProcessing;
    
    if (deadLetterQueueName && mainQueueName) {
      logger.info(`Configuring dead letter queue: ${deadLetterQueueName} for ${mainQueueName}`);
      await sqsService.configureDeadLetterQueue(mainQueueName, deadLetterQueueName, 3);
    }
    
    logger.info('Test SQS queues setup successfully');
  } catch (error) {
    logger.error('Failed to set up test SQS queues', { error });
    throw error;
  }
}

/**
 * Sets up all mock objects and services for testing
 */
function setupMocks(): void {
  // Reset all mocks to their initial state using resetAllMocks()
  resetAllMocks();
  
  // Set up consistent date/time using mockDate
  const fixedDate = new Date('2023-05-15T10:00:00Z');
  mockDate.set(fixedDate);
  
  logger.info('Mocks setup successfully', { fixedDate: fixedDate.toISOString() });
}

/**
 * Performs all necessary setup operations before tests
 */
async function setupEnvironment(): Promise<void> {
  try {
    // Load environment variables from .env.test file
    dotenv.config({ path: '.env.test' });
    
    // Call setupMockDatabase() to set up the database
    await setupMockDatabase();
    
    // Call setupTestQueues() to set up SQS queues
    await setupTestQueues();
    
    // Call setupMocks() to configure mocks
    setupMocks();
    
    logger.info('Test environment setup successfully');
  } catch (error) {
    logger.error('Failed to set up test environment', { error });
    throw error;
  }
}

// Set up all resources before any tests run
beforeAll(async () => {
  try {
    // Call setupEnvironment() to perform full environment setup
    await setupEnvironment();
  } catch (error) {
    logger.error('Error in beforeAll hook', { error });
    throw error;
  }
});