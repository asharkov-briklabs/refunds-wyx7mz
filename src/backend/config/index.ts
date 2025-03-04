/**
 * Configuration Module for Refunds Service
 * 
 * This module consolidates all configuration settings for the Refunds Service application,
 * providing a unified interface for accessing environment-specific configurations.
 * It loads and merges configurations from various sources including environment-specific
 * settings, database, authentication, logging, and service integrations.
 * 
 * The configuration hierarchy allows parameters to be inherited across program, bank,
 * organization, and merchant levels, while providing consistent access patterns
 * across all environments (development, test, staging, production).
 */

import * as dotenv from 'dotenv'; // dotenv ^16.0.0

// Import environment-specific configuration files
import development from './environments/development';
import test from './environments/test';
import staging from './environments/staging';
import production from './environments/production';

// Import specialized configuration modules
import databaseConfig from './database';
import authConfig from './auth';
import loggingConfig from './logging';
import servicesConfig from './services';
import sqsConfig from './sqs';

// Load environment variables
dotenv.config();

// Determine the current environment
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Returns the current environment name
 * 
 * @returns Current environment name (development, test, staging, or production)
 */
export function getEnvironment(): string {
  // Return normalized environment name or default to 'development'
  const env = NODE_ENV.toLowerCase();
  
  if (['development', 'test', 'staging', 'production'].includes(env)) {
    return env;
  }
  
  return 'development';
}

/**
 * Returns the environment-specific configuration object based on current NODE_ENV
 * 
 * @returns Environment-specific configuration object
 */
export function getEnvironmentConfig(): any {
  const env = getEnvironment();
  
  switch (env) {
    case 'development':
      return development;
    case 'test':
      return test;
    case 'staging':
      return staging;
    case 'production':
      return production;
    default:
      return development;
  }
}

/**
 * Retrieves Redis configuration directly from environment config to avoid circular dependency
 * 
 * @returns Redis configuration from environment settings
 */
export function getRedisConfigFromEnv(): any {
  const envConfig = getEnvironmentConfig();
  return envConfig.redis || {};
}

/**
 * Retrieves the complete configuration based on the current environment
 * 
 * @returns Complete configuration object for the current environment
 */
export function getConfig(): any {
  const env = getEnvironment();
  const envConfig = getEnvironmentConfig();
  
  // Build complete configuration object
  const config = {
    // Environment information
    environment: env,
    
    // Server configuration from environment config
    server: envConfig.server || {},
    
    // Specialized configurations
    database: databaseConfig,
    auth: authConfig,
    logging: loggingConfig,
    services: servicesConfig,
    sqs: sqsConfig,
    
    // Get Redis configuration directly from environment config
    // to avoid circular dependency
    redis: getRedisConfigFromEnv(),
    
    // Include other environment-specific configurations
    payment: envConfig.payment || {},
    security: envConfig.security || {},
    
    // Include AWS configuration if available
    aws: envConfig.aws || {}
  };
  
  return config;
}

// Generate the complete configuration
const config = getConfig();

// Export the configuration and utility functions
export default config;
export { getConfig, getEnvironment, getRedisConfigFromEnv };