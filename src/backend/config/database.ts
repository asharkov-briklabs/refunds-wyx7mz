import * as dotenv from 'dotenv'; // dotenv ^16.0.0
import { logger } from '../common/utils/logger';

// Load environment variables
dotenv.config();

// Determine the current environment
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Interface for MongoDB connection options
 */
interface MongoDBOptions {
  useNewUrlParser: boolean;
  useUnifiedTopology: boolean;
  autoIndex: boolean;
  poolSize: number;
  serverSelectionTimeoutMS: number;
  socketTimeoutMS: number;
  ssl: boolean;
  retryWrites?: boolean;
  retryReads?: boolean;
  w?: string;
  wtimeoutMS?: number;
}

/**
 * Interface for replica set configuration
 */
interface ReplicaSetConfig {
  enabled: boolean;
  name?: string;
  nodes?: number;
}

/**
 * Interface for database configuration
 */
interface DatabaseConfig {
  type: string;
  uri: string;
  options: MongoDBOptions;
  readPreference: string;
  replicaSet: ReplicaSetConfig;
}

/**
 * Interface for environment-specific database configurations
 */
interface EnvironmentConfigs {
  [key: string]: DatabaseConfig;
}

/**
 * Default database configuration to fall back to if environment-specific
 * configuration is not available
 */
const DEFAULT_DATABASE_CONFIG: DatabaseConfig = {
  type: 'mongodb',
  uri: 'mongodb://localhost:27017/refund-service',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoIndex: true,
    poolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    ssl: false
  },
  readPreference: 'primary',
  replicaSet: {
    enabled: false
  }
};

/**
 * Environment-specific database configuration settings
 */
const DATABASE_CONFIG: EnvironmentConfigs = {
  development: {
    type: 'mongodb',
    uri: 'mongodb://localhost:27017/refund-service-dev',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: true,
      poolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      ssl: false
    },
    readPreference: 'primary',
    replicaSet: {
      enabled: false
    }
  },
  test: {
    type: 'mongodb',
    uri: 'mongodb://mongodb:27017/refund-service-test',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: true,
      poolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      ssl: false
    },
    readPreference: 'primary',
    replicaSet: {
      enabled: false
    }
  },
  staging: {
    type: 'mongodb',
    uri: "${process.env.MONGO_URI || 'mongodb://mongodb-staging:27017/refund-service-staging'}",
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: false,
      poolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      ssl: true,
      retryWrites: true,
      retryReads: true
    },
    readPreference: 'primaryPreferred',
    replicaSet: {
      enabled: true,
      name: 'rs0',
      nodes: 3
    }
  },
  production: {
    type: 'mongodb',
    uri: '${process.env.MONGO_URI}',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: false,
      poolSize: 20,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 60000,
      ssl: true,
      retryWrites: true,
      retryReads: true,
      w: 'majority',
      wtimeoutMS: 10000
    },
    readPreference: 'primaryPreferred',
    replicaSet: {
      enabled: true,
      name: 'rs0',
      nodes: 3
    }
  }
};

/**
 * Retrieves database configuration based on the current environment with optional overrides
 * 
 * @param overrides - Optional configuration overrides
 * @returns Database configuration object for the current environment
 */
export function getDatabaseConfig(overrides: Partial<DatabaseConfig> = {}): DatabaseConfig {
  // Determine the current environment from NODE_ENV
  const env = NODE_ENV;
  
  // Select the appropriate environment-specific database configuration
  const config = DATABASE_CONFIG[env] || DEFAULT_DATABASE_CONFIG;
  
  // Log the environment being used
  logger.info(`Loading database configuration for environment: ${env}`);
  logger.debug('Database configuration details', {
    type: config.type,
    readPreference: config.readPreference,
    replicaSetEnabled: config.replicaSet.enabled
  });
  
  // Apply any overrides provided to the function
  const mergedConfig = { ...config, ...overrides };
  
  // Return the final database configuration
  return mergedConfig;
}

// Get the configuration for the current environment
const config = getDatabaseConfig();

// Export the configuration and utility function
export default config;