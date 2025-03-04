import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file'; // winston-daily-rotate-file@^4.7.1
import { AsyncLocalStorage } from 'node:async_hooks';

// Store correlation IDs across async boundaries
const correlationIds = new AsyncLocalStorage<string>();

/**
 * Logger configuration interface
 */
interface LoggerConfig {
  level: string;
  piiPatterns: RegExp[];
  fileEnabled: boolean;
  filePath: string;
  maxFiles: string;
  serviceName?: string;
  additionalTransports?: winston.transport[];
}

// Default logger configuration
const defaultLogConfig: LoggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
  // Patterns for sensitive data that should be masked in logs
  piiPatterns: [
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,  // Credit card numbers (with or without spaces/dashes)
    /\b\d{9}\b/g,  // Social security numbers or routing numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, // Email addresses
    /\b(?:\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}\b/g, // Phone numbers
  ],
  fileEnabled: process.env.LOG_TO_FILE === 'true',
  filePath: 'logs/%DATE%.log',
  maxFiles: '14d',
  serviceName: process.env.SERVICE_NAME || 'refund-service'
};

// Singleton logger instance
let loggerInstance: winston.Logger | null = null;

/**
 * Configures the Winston logger with appropriate transports and formatting
 * based on provided options or defaults
 * 
 * @param options - Configuration options for the logger
 * @returns Configured Winston logger instance
 */
function configureLogger(options: Partial<LoggerConfig> = {}): winston.Logger {
  const config: LoggerConfig = { ...defaultLogConfig, ...options };
  
  // Set up formatters
  const formatters = [
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.printf(info => {
      // Add correlation ID if present
      const correlationId = getCorrelationId();
      if (correlationId) {
        info.correlationId = correlationId;
      }
      
      // Add service name
      info.service = config.serviceName;
      
      // Format metadata
      if (info.metadata) {
        info.metadata = formatMetadata(info.metadata);
      }
      
      return JSON.stringify(info);
    })
  ];
  
  // Create transports array
  const transports: winston.transport[] = [
    new winston.transports.Console({
      level: config.level,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ];
  
  // Add file transport if enabled
  if (config.fileEnabled) {
    transports.push(new DailyRotateFile({
      filename: config.filePath,
      datePattern: 'YYYY-MM-DD',
      maxFiles: config.maxFiles,
      level: config.level
    }));
  }
  
  // Add additional transports if provided
  if (config.additionalTransports?.length) {
    transports.push(...config.additionalTransports);
  }
  // Add additional transports based on environment
  else if (process.env.NODE_ENV === 'production') {
    // In a real implementation, we would add additional production-appropriate
    // transports like Elasticsearch, Datadog, etc.
    /*
    transports.push(new winston.transports.Http({
      host: process.env.LOGGING_HOST,
      port: parseInt(process.env.LOGGING_PORT || '443'),
      ssl: true,
      level: config.level
    }));
    */
  }
  
  // Create the logger
  const logger = winston.createLogger({
    level: config.level,
    format: winston.format.combine(
      ...formatters,
      winston.format.json()
    ),
    defaultMeta: { service: config.serviceName },
    transports
  });
  
  // Store the config for future reference
  (logger as any).config = config;
  
  return logger;
}

/**
 * Formats and sanitizes metadata for logging, handling special objects like errors
 * 
 * @param metadata - The metadata object to format
 * @returns Formatted metadata object
 */
function formatMetadata(metadata: any): any {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  
  const formatted: any = {};
  
  // Handle Error objects
  if (metadata instanceof Error) {
    return {
      message: metadata.message,
      name: metadata.name,
      stack: metadata.stack,
      ...(metadata as any).metadata // Include any metadata attached to the error
    };
  }
  
  // Process each property, applying PII masking
  Object.keys(metadata).forEach(key => {
    const value = metadata[key];
    
    // Skip undefined or null values
    if (value === undefined || value === null) {
      return;
    }
    
    // Recursively format objects
    if (typeof value === 'object' && !(value instanceof Error)) {
      formatted[key] = formatMetadata(value);
      return;
    }
    
    // Apply PII masking to strings
    if (typeof value === 'string') {
      formatted[key] = maskPII(value);
      return;
    }
    
    // Pass through other values
    formatted[key] = value;
  });
  
  return formatted;
}

/**
 * Sets the correlation ID for the current execution context
 * This makes the ID available throughout the request lifecycle
 * 
 * @param correlationId - The correlation ID to set
 */
function setCorrelationId(correlationId: string): void {
  if (!correlationId) {
    throw new Error('Correlation ID cannot be empty');
  }
  correlationIds.enterWith(correlationId);
}

/**
 * Retrieves the correlation ID from the current execution context
 * 
 * @returns Current correlation ID or undefined if not set
 */
function getCorrelationId(): string | undefined {
  return correlationIds.getStore();
}

/**
 * Creates a child logger with bound context for a specific component or request
 * 
 * @param context - Context object to bind to the logger
 * @returns Winston logger instance with bound context
 */
function createChildLogger(context: any): winston.Logger {
  const logger = getLogger();
  const formattedContext = formatMetadata(context);
  return logger.child({ metadata: formattedContext });
}

/**
 * Masks personally identifiable information (PII) in strings using regex patterns
 * 
 * @param input - String that may contain PII
 * @returns String with PII masked
 */
function maskPII(input: string): string {
  if (typeof input !== 'string') {
    return input;
  }
  
  const logger = getLogger();
  const config = (logger as any).config || defaultLogConfig;
  
  let result = input;
  
  // Apply each PII pattern
  config.piiPatterns.forEach((pattern: RegExp) => {
    result = result.replace(pattern, match => {
      // Keep first and last characters for some context, mask the rest
      if (match.length <= 4) {
        return '*'.repeat(match.length);
      }
      return match.charAt(0) + '*'.repeat(match.length - 2) + match.charAt(match.length - 1);
    });
  });
  
  return result;
}

/**
 * Updates the logger configuration after initialization
 * 
 * @param newConfig - New configuration settings
 */
function updateLoggerConfig(newConfig: Partial<LoggerConfig>): void {
  if (!loggerInstance) {
    loggerInstance = configureLogger(newConfig);
    return;
  }
  
  // Merge with existing config
  const existingConfig = (loggerInstance as any).config || defaultLogConfig;
  const updatedConfig = { ...existingConfig, ...newConfig };
  
  // Reconfigure the logger
  loggerInstance = configureLogger(updatedConfig);
}

/**
 * Gets the configured logger instance or creates a new one with default settings
 * 
 * @returns Winston logger instance
 */
function getLogger(): winston.Logger {
  if (!loggerInstance) {
    loggerInstance = configureLogger();
  }
  return loggerInstance;
}

// Create the default logger instance
const logger = getLogger();

// Export the configured logger and utility functions
export { 
  logger,
  setCorrelationId,
  getCorrelationId,
  createChildLogger,
  maskPII,
  configureLogger,
  updateLoggerConfig
};