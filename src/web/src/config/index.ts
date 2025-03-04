/**
 * Central configuration export file for the Refunds Service
 * 
 * This file aggregates and re-exports all configuration modules to provide
 * a single entry point for importing application configuration.
 * 
 * Usage:
 *   // Import all configuration as a single object
 *   import config from 'src/config';
 *   const apiUrl = config.api.apiUrl;
 *   
 *   // Import specific configuration modules
 *   import { api, auth } from 'src/config';
 *   const endpoint = api.endpoints.refunds;
 *   
 * @version 1.0.0
 */

// Import configuration modules
import envConfig, { environment, isProduction, isDevelopment, isTest, isStaging, api, auth, app } from './env.config';
import apiConfig from './api.config';
import authConfig from './auth.config';
import { routesConfig } from './routes.config';

// Re-export environment configuration
export { environment, isProduction, isDevelopment, isTest, isStaging, api, auth, app };

// Re-export API configuration
export { 
  apiConfig as api,
  // Named exports from apiConfig
  apiConfig.apiUrl,
  apiConfig.apiVersion,
  apiConfig.timeout,
  apiConfig.endpoints,
  apiConfig.headers,
  apiConfig.rateLimits
};

// Re-export auth configuration
export {
  authConfig as auth,
  // Named exports from authConfig
  authConfig.domain,
  authConfig.clientId,
  authConfig.audience,
  authConfig.redirectUri,
  authConfig.logoutUri,
  authConfig.responseType,
  authConfig.scope,
  authConfig.sessionCheckExpiryDays,
  authConfig.tokenRenewalOffsetSeconds,
  authConfig.rolePermissionMap,
  authConfig.mfaRequirements
};

// Re-export routes configuration
export {
  routesConfig as routes
};

// Default export combining all configuration
export default {
  env: envConfig,
  api: apiConfig,
  auth: authConfig,
  routes: routesConfig
};