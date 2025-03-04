import express from 'express'; // express@^4.18.2
import helmet from 'helmet'; // helmet@^6.0.1
import cors from 'cors'; // cors@^2.8.5
import compression from 'compression'; // compression@^1.7.4
import morgan from 'morgan'; // morgan@^1.10.0
import swaggerUi from 'swagger-ui-express'; // swagger-ui-express@^4.6.2
import http from 'http'; // Node.js built-in
import { configureRoutes } from './routes';
import { logger } from '../common/utils/logger';
import { apiErrorHandler } from './middleware';
import { OpenAPISpec } from './openapi';
import config from '../config';
import { errorHandler, requestLogger, correlationIdMiddleware } from '../common/middleware';

// Export the Express application instance for testing and other usages
export let app: express.Application;

// Export the HTTP server instance for lifecycle management
export let server: http.Server | null = null;

/**
 * Creates and configures an Express application with middleware and routes
 * @returns Configured Express application
 */
export function createApp(): express.Application {
  // Create a new Express application instance
  app = express();

  // Configure middleware (helmet, cors, compression, etc.)
  app.use(helmet());
  app.use(cors(config.server.cors));
  app.use(compression());

  // Set up correlation ID tracking for request tracing
  app.use(correlationIdMiddleware);

  // Configure request logging with morgan and custom logger
  app.use(requestLogger);

  // Set up routes using the configureRoutes function
  configureRoutes(app);

  // Add Swagger UI documentation at the /api-docs endpoint
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(OpenAPISpec));

  // Configure error handling middleware
  app.use(apiErrorHandler);

  // Return the configured application
  return app;
}

/**
 * Starts the HTTP server on the configured port
 * @returns Promise resolving to the HTTP server instance
 */
export async function startServer(): Promise<http.Server> {
  // Check if server is already running and return it if so
  if (server && server.listening) {
    logger.info('Server is already running');
    return server;
  }

  // Create Express app if not already created
  if (!app) {
    createApp();
  }

  // Get port from config or default to 3000
  const port = config.server.port || 3000;

  // Create HTTP server instance
  server = http.createServer(app);

  // Set up error handling for the server
  setupServerErrorHandling(server);

  // Start the server listening on the configured port
  return new Promise((resolve, reject) => {
    server!.listen(port, () => {
      logger.info(`Server started and listening on port ${port}`);
      resolve(server!);
    });

    server!.on('error', (err) => {
      logger.error('Server failed to start', { error: err.message });
      reject(err);
    });
  });
}

/**
 * Gracefully stops the HTTP server if running
 * @returns Promise that resolves when the server is stopped
 */
export async function stopServer(): Promise<void> {
  // Check if server is running
  if (!server) {
    logger.info('Server is not running, nothing to stop');
    return Promise.resolve();
  }

  // If not running, resolve immediately
  return new Promise((resolve, reject) => {
    // If running, call server.close() to stop accepting new connections
    server!.close((err) => {
      if (err) {
        logger.error('Error stopping server', { error: err.message });
        return reject(err);
      }

      // Wait for existing connections to close
      logger.info('Server stopped accepting new connections');
      server = null;

      // Resolve promise when complete
      resolve();
    });
  });
}

/**
 * Sets up error event handlers for the HTTP server
 * @param server 
 * @returns void
 */
function setupServerErrorHandling(server: http.Server): void {
  // Set up handler for 'error' events
  server.on('error', (error: Error & { syscall: string; code: string }) => {
    // Handle specific error cases (e.g., EADDRINUSE)
    if (error.syscall !== 'listen') {
      // Ignore non-listening errors
      return;
    }

    // Handle specific error codes
    switch (error.code) {
      case 'EACCES':
        logger.error('Insufficient privileges to bind to port', { port: config.server.port });
        process.exit(1);
        break;
      case 'EADDRINUSE':
        logger.error('Port is already in use', { port: config.server.port });
        process.exit(1);
        break;
      default:
        // Log error details with appropriate severity
        logger.error('An unexpected error occurred on the server', {
          error: error.message,
          code: error.code,
          stack: error.stack
        });
        process.exit(1);
    }
  });
}

// Export the createApp function
export { createApp };