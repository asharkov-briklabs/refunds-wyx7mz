import { logger } from '../common/utils/logger'; // Imports the logger object for logging
import { config } from '../config'; // Imports the configuration object
import { QueueManager } from './queue-manager'; // Imports the QueueManager class
import { WorkerProcessor } from './processor'; // Imports the WorkerProcessor class
import * as jobs from './jobs'; // Imports all job definitions
import * as handlers from './handlers'; // Imports all job handlers

/**
 * Global variable to hold the WorkerProcessor instance.
 * This allows for controlled access and lifecycle management of the worker.
 */
let workerProcessor: WorkerProcessor | null = null;

/**
 * Initializes the worker system by setting up the queue manager, processor, and starting background processing
 * @param options - Configuration options for the worker initialization
 * @returns A promise that resolves when workers are initialized
 */
export async function initializeWorkers(options: any): Promise<void> {
  // LD1: Log worker initialization start
  logger.info('Initializing workers...');

  // LD2: Configure worker settings from provided options or defaults
  const workerConfig = {
    pollInterval: options?.pollInterval || config.workers.pollInterval || 5000,
    maxConcurrentMessages: options?.maxConcurrentMessages || config.workers.maxConcurrentMessages || 10,
  };

  // LD3: Create a new WorkerProcessor instance
  workerProcessor = new WorkerProcessor();

  // LD4: Store the processor instance in the global workerProcessor variable
  // (already done in LD3)

  // LD5: Call processor.start() to begin polling for messages
  await workerProcessor.start();

  // LD6: Log successful initialization of workers
  logger.info('Workers initialized successfully', { workerConfig });

  // LD7: Return a resolved promise
  return Promise.resolve();
}

/**
 * Gracefully shuts down the worker system, completing in-progress jobs and stopping the processor
 * @param options - Configuration options for the worker shutdown
 * @returns A promise that resolves when workers are shut down
 */
export async function shutdownWorkers(options: any): Promise<void> {
  // LD1: Log worker shutdown start
  logger.info('Shutting down workers...');

  // LD2: Check if worker processor is initialized
  if (workerProcessor) {
    // LD3: If processor exists, call processor.stop() to gracefully stop processing
    await workerProcessor.stop();

    // LD4: Wait for all in-progress jobs to complete
    // (already handled by workerProcessor.stop())

    // LD5: Set workerProcessor to null to free resources
    workerProcessor = null;

    // LD6: Log successful shutdown of workers
    logger.info('Workers shut down successfully');
  } else {
    logger.warn('No active worker processor found during shutdown');
  }

  // LD7: Return a promise that resolves when shutdown is complete
  return Promise.resolve();
}

// IE3: Export all job definitions for use by other modules
export { jobs };

// IE3: Export all job handlers for use by other modules
export { handlers };

// IE3: Export QueueManager class for queue operations
export { QueueManager };

// IE3: Export WorkerProcessor class for direct usage
export { WorkerProcessor };

// IE3: Export function to initialize the worker system
export { initializeWorkers };

// IE3: Export function to gracefully shut down the worker system
export { shutdownWorkers };