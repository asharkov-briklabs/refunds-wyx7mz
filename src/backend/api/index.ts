import { createApp, startServer, stopServer, app } from './server'; // Import server implementation functions and Express application
import { logger } from '../common/utils/logger'; // Import logging functionality for server events
import config from '../config'; // Import application configuration including environment information

/**
 * Sets up handlers for process termination signals to ensure graceful shutdown
 */
function handleProcessSignals(): void {
  // Set up handler for SIGTERM signal
  process.on('SIGTERM', async () => {
    // Log shutdown initiation
    logger.info('Received SIGTERM signal, initiating graceful shutdown...');

    try {
      // Call stopServer() to gracefully shut down the HTTP server
      await stopServer();
      logger.info('Server stopped successfully.');

      // Exit the process with success code once server is stopped
      process.exit(0);
    } catch (err) {
      // Log any errors during shutdown
      logger.error('Error during shutdown', { error: err });

      // Exit the process with failure code
      process.exit(1);
    }
  });

  // Set up handler for SIGINT signal (Ctrl+C)
  process.on('SIGINT', async () => {
    // Log shutdown initiation
    logger.info('Received SIGINT signal, initiating graceful shutdown...');

    try {
      // Call stopServer() to gracefully shut down the HTTP server
      await stopServer();
      logger.info('Server stopped successfully.');

      // Exit the process with success code once server is stopped
      process.exit(0);
    } catch (err) {
      // Log any errors during shutdown
      logger.error('Error during shutdown', { error: err });

      // Exit the process with failure code
      process.exit(1);
    }
  });
}

/**
 * Initializes the application and starts the server
 */
async function bootstrap(): Promise<void> {
  // Log application startup with environment information
  logger.info('Starting Refunds Service API', { environment: config.environment });

  try {
    // Initialize and start the HTTP server using startServer()
    await startServer();

    // Set up process signal handlers for graceful shutdown
    handleProcessSignals();

    // Log successful server startup
    logger.info('Refunds Service API started successfully');
  } catch (err) {
    // Log any errors during startup
    logger.error('Failed to start Refunds Service API', { error: err });

    // Exit the process with failure code
    process.exit(1);
  }
}

// Call bootstrap to start the application
bootstrap();

// Export the Express application instance for testing and other usages
export { app, createApp, startServer, stopServer };