/**
 * Test Teardown Module
 * 
 * Responsible for cleaning up resources, connections, and resetting the testing environment
 * after tests have completed. This ensures proper isolation between test runs and prevents
 * resource leaks.
 */

import { afterAll } from 'jest'; // jest ^29.5.0
import mockDate from 'mockdate'; // mockdate ^3.0.5
import { disconnect } from '../database/connection';
import { closeConnection } from '../config/redis';
import { resetAllMocks } from './mocks';
import { logger } from '../common/utils/logger';

// MongoDB memory server for isolated testing
let mongoServer: MongoMemoryServer | null = null;

// SQS service for queue operations
let sqsService: SQSService | null = null;

/**
 * Cleans up all test resources and connections after tests
 * 
 * @returns Promise that resolves when all cleanup is complete
 */
async function teardownTestEnvironment(): Promise<void> {
  logger.info('Starting test environment teardown');

  try {
    // Reset all mock implementations to their default state
    logger.info('Resetting all mocks');
    resetAllMocks();

    // Reset any mocked dates
    logger.info('Resetting mocked dates');
    mockDate.reset();

    // Close MongoDB connection
    logger.info('Closing MongoDB connection');
    await disconnect();

    // Close Redis client connections
    logger.info('Closing Redis client connections');
    await closeConnection();

    // Stop MongoDB memory server if it's running
    if (mongoServer) {
      logger.info('Stopping MongoDB memory server');
      await mongoServer.stop();
      mongoServer = null;
    }

    // Clean up SQS test queues if created
    await cleanupSQSQueues();

    logger.info('Test environment teardown completed successfully');
  } catch (error) {
    logger.error('Error during test environment teardown', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined 
    });
    // Re-throw to ensure Jest knows there was a problem
    throw error;
  }
}

/**
 * Cleans up any SQS queues created during tests
 * 
 * @returns Promise that resolves when all SQS queues are cleaned up
 */
async function cleanupSQSQueues(): Promise<void> {
  if (!sqsService) {
    logger.info('No SQS service initialized, skipping queue cleanup');
    return;
  }

  try {
    logger.info('Cleaning up SQS test queues');
    // Purge any test queues to remove messages
    await sqsService.purgeTestQueues();
    logger.info('SQS test queues cleaned up successfully');
  } catch (error) {
    logger.error('Error cleaning up SQS test queues', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    // We don't re-throw here to allow other cleanup to continue
  }
}

// Register teardown function to run after all tests complete
afterAll(async () => {
  await teardownTestEnvironment();
});