import { logger } from '../common/utils/logger'; // internal
import { getConnection, connect, disconnect, ConnectionStatus } from './connection'; // internal
import * as models from './models'; // internal
import repositories from './repositories'; // internal
import * as allRepositories from './repositories'; // internal
import { runMigrations } from './migrations'; // internal

/**
 * Initializes the database connection and runs any pending migrations to ensure schema is up to date
 * @param options 
 * @returns {Promise<void>} Resolves when database is connected and migrations are complete
 */
export const initDatabase = async (options?: any): Promise<void> => {
  try {
    // Call the connect function with provided options
    await connect(options);

    // Log successful database connection
    logger.info('Database connection established');

    // Run migrations to ensure database schema is up to date
    logger.info('Running database migrations...');
    await runMigrations();

    // Log successful database initialization and migration status
    logger.info('Database initialized and migrations completed successfully');
  } catch (error) {
    // Log any errors during database initialization
    logger.error('Database initialization failed', { error });
    throw error;
  }
};

// Export all database related functionality
export {
    getConnection,
    connect,
    disconnect,
    ConnectionStatus,
    initDatabase,
    runMigrations,
    repositories,
    allRepositories as repositoriesNS,
    models as modelsNS
};

export * from './models';
export * from './repositories';