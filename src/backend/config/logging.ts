import dotenv from 'dotenv'; // dotenv v16.0.0

// Load environment variables
dotenv.config();

// Define types for configuration
interface FileConfig {
  enabled: boolean;
  path?: string;
  maxFiles?: string;
  zippedArchive?: boolean;
}

interface ConsoleConfig {
  enabled: boolean;
}

interface CloudwatchConfig {
  enabled: boolean;
  logGroupName?: string;
  logStreamName?: string;
}

interface ElasticsearchAuth {
  username: string;
  password: string;
}

interface ElasticsearchConfig {
  enabled: boolean;
  node?: string;
  indexPrefix?: string;
  auth?: ElasticsearchAuth;
}

interface ServiceContext {
  service: string;
  version: string;
}

interface LoggingConfig {
  level: string;
  format: string;
  colorize: boolean;
  file: FileConfig;
  console: ConsoleConfig;
  cloudwatch: CloudwatchConfig;
  elasticsearch: ElasticsearchConfig;
  piiPatterns: string[];
  serviceContext: ServiceContext;
}

// Log level mapping for standardization
const LOG_LEVEL_MAP: Record<string, string> = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR'
};

// Default configuration to use as fallback
const DEFAULT_LOGGING_CONFIG: LoggingConfig = {
  level: 'info',
  format: 'json',
  colorize: false,
  file: {
    enabled: false,
    path: 'logs/%DATE%.log',
    maxFiles: '14d',
    zippedArchive: true
  },
  console: {
    enabled: true
  },
  cloudwatch: {
    enabled: false,
    logGroupName: '/refund-service/default',
    logStreamName: 'main'
  },
  elasticsearch: {
    enabled: false
  },
  piiPatterns: [
    '/\\b\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b/g', // Credit card numbers
    '/\\b\\d{9}\\b/g', // Routing numbers 
    '/\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b/g' // Email addresses
  ],
  serviceContext: {
    service: 'refund-service',
    version: '1.0.0'
  }
};

// Environment-specific configurations
const ENVIRONMENT_LOGGING_CONFIG: Record<string, Partial<LoggingConfig>> = {
  development: {
    level: 'debug',
    format: 'json',
    colorize: true,
    file: {
      enabled: true,
      path: 'logs/dev-%DATE%.log'
    },
    console: {
      enabled: true
    },
    cloudwatch: {
      enabled: false
    },
    elasticsearch: {
      enabled: false
    }
  },
  test: {
    level: 'debug',
    format: 'json',
    colorize: false,
    file: {
      enabled: false
    },
    console: {
      enabled: false
    },
    cloudwatch: {
      enabled: false
    },
    elasticsearch: {
      enabled: false
    }
  },
  staging: {
    level: 'info',
    format: 'json',
    colorize: false,
    file: {
      enabled: false
    },
    console: {
      enabled: true
    },
    cloudwatch: {
      enabled: true,
      logGroupName: '/refund-service/staging',
      logStreamName: process.env.HOSTNAME || 'main'
    },
    elasticsearch: {
      enabled: true,
      node: process.env.ELASTICSEARCH_NODE,
      indexPrefix: 'refund-service-staging'
    }
  },
  production: {
    level: 'info',
    format: 'json',
    colorize: false,
    file: {
      enabled: false
    },
    console: {
      enabled: true
    },
    cloudwatch: {
      enabled: true,
      logGroupName: '/refund-service/production',
      logStreamName: process.env.HOSTNAME || 'main'
    },
    elasticsearch: {
      enabled: true,
      node: process.env.ELASTICSEARCH_NODE,
      indexPrefix: 'refund-service-production',
      auth: {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD
      }
    }
  }
};

/**
 * Retrieves logging configuration based on environment and overrides
 * 
 * @param overrides - Optional configuration overrides
 * @returns Complete logging configuration object
 */
export function getLoggingConfig(overrides: Partial<LoggingConfig> = {}): LoggingConfig {
  // Determine current environment from NODE_ENV
  const environment = process.env.NODE_ENV || 'development';
  
  // Select base configuration for the environment
  const environmentConfig = ENVIRONMENT_LOGGING_CONFIG[environment] || {};
  
  // Merge configurations: default -> environment-specific -> overrides
  const config = {
    ...DEFAULT_LOGGING_CONFIG,
    ...environmentConfig,
    ...overrides
  };
  
  // Ensure log level is standardized
  if (config.level && LOG_LEVEL_MAP[config.level.toLowerCase()]) {
    config.level = LOG_LEVEL_MAP[config.level.toLowerCase()];
  }
  
  return config;
}

// Default export of logging configuration for the current environment
export default getLoggingConfig();