/**
 * Environment Configuration for Refunds Service Web Application
 * 
 * This file centralizes all environment-specific configuration,
 * loads values from environment variables, and provides typed access
 * with appropriate defaults for different deployment environments.
 * 
 * Usage:
 *   import config from 'src/config/env.config';
 *   
 *   // Use full config
 *   const apiUrl = config.api.baseUrl;
 *   
 *   // Or use destructured exports
 *   import { api, isProduction } from 'src/config/env.config';
 */

// Environment types
type Environment = 'development' | 'test' | 'staging' | 'production';

// API Configuration type
interface ApiConfig {
  baseUrl: string;
  timeout: number;
  endpoints: {
    refunds: string;
    refundDetails: string;
    bankAccounts: string;
    parameters: string;
    approvals: string;
    rejects: string;
    transactions: string;
    merchants: string;
    [key: string]: string;
  };
}

// Auth Configuration type
interface AuthConfig {
  domain: string;
  clientId: string;
  audience: string;
  redirectUri: string;
  logoutUri: string;
  responseType: string;
  scope: string;
}

// Application Configuration type
interface AppConfig {
  name: string;
  version: string;
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enabled: boolean;
  };
}

// Full Config type
interface Config {
  environment: Environment;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  isStaging: boolean;
  api: ApiConfig;
  auth: AuthConfig;
  app: AppConfig;
}

/**
 * Determines the current environment (development, test, staging, production)
 * @returns The detected environment name
 */
const getEnvironment = (): Environment => {
  const env = (process.env.REACT_APP_ENV || process.env.NODE_ENV || '').toLowerCase();
  
  if (env === 'test' || env === 'testing') {
    return 'test';
  }
  if (env === 'staging') {
    return 'staging';
  }
  if (env === 'production' || env === 'prod') {
    return 'production';
  }
  // Default to development
  return 'development';
};

/**
 * Checks if the current environment matches the specified environment
 * @param env Environment to check against
 * @returns True if current environment matches the specified environment
 */
const isEnvironment = (env: Environment): boolean => {
  return getEnvironment() === env;
};

// Detect current environment
const environment = getEnvironment();

// Create configuration object
const config: Config = {
  // Environment information
  environment,
  isProduction: isEnvironment('production'),
  isDevelopment: isEnvironment('development'),
  isTest: isEnvironment('test'),
  isStaging: isEnvironment('staging'),
  
  // API Configuration
  api: {
    // Base URL varies by environment
    baseUrl: process.env.REACT_APP_API_BASE_URL || (
      environment === 'production' ? 'https://api.brik.com/refunds' :
      environment === 'staging' ? 'https://api.staging.brik.com/refunds' :
      environment === 'test' ? 'https://api.test.brik.com/refunds' :
      'https://api.dev.brik.com/refunds'
    ),
    // Default timeout: 30 seconds, can be overridden
    timeout: parseInt(process.env.REACT_APP_API_TIMEOUT || '30000', 10),
    // API endpoints
    endpoints: {
      refunds: '/refunds',
      refundDetails: '/refunds/:id',
      bankAccounts: '/merchants/:merchantId/bank-accounts',
      parameters: '/merchants/:merchantId/refund-parameters',
      approvals: '/refunds/:id/approve',
      rejects: '/refunds/:id/reject',
      transactions: '/transactions',
      merchants: '/merchants',
    }
  },
  
  // Auth0 Configuration
  auth: {
    domain: process.env.REACT_APP_AUTH0_DOMAIN || (
      environment === 'production' ? 'brik.auth0.com' :
      environment === 'staging' ? 'brik-staging.auth0.com' :
      'brik-dev.auth0.com'
    ),
    clientId: process.env.REACT_APP_AUTH0_CLIENT_ID || (
      environment === 'production' ? 'prod-client-id' :
      environment === 'staging' ? 'staging-client-id' :
      'dev-client-id'
    ),
    audience: process.env.REACT_APP_AUTH0_AUDIENCE || (
      environment === 'production' ? 'https://api.brik.com/' :
      environment === 'staging' ? 'https://api.staging.brik.com/' :
      'https://api.dev.brik.com/'
    ),
    redirectUri: process.env.REACT_APP_AUTH0_REDIRECT_URI || 
      window.location.origin + '/callback',
    logoutUri: process.env.REACT_APP_AUTH0_LOGOUT_URI || 
      window.location.origin,
    responseType: 'token id_token',
    scope: 'openid profile email'
  },
  
  // Application Configuration
  app: {
    name: 'Brik Refunds Service',
    version: process.env.REACT_APP_VERSION || '1.0.0',
    logging: {
      level: (process.env.REACT_APP_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 
        (environment === 'production' ? 'error' : 'debug'),
      enabled: process.env.REACT_APP_LOGGING_ENABLED !== 'false'
    }
  }
};

// Validate critical configuration settings
const validateConfig = (config: Config): void => {
  if (!config.api.baseUrl) {
    console.error('API base URL is not configured properly');
  }
  
  if (!config.auth.domain || !config.auth.clientId) {
    console.error('Auth0 is not configured properly');
  }
};

// Run validation
validateConfig(config);

// Export helper functions
export { getEnvironment, isEnvironment };

// Export configuration sections individually
export const { environment, isProduction, isDevelopment, isTest, isStaging, api, auth, app } = config;

// Export full configuration as default
export default config;