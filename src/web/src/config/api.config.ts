/**
 * API Configuration for Refunds Service Web Application
 * 
 * This file centralizes all API-related configuration including endpoints,
 * timeouts, versioning, and environment-specific settings. It provides
 * a single source of truth for all API interactions throughout both Pike
 * (merchant) and Barracuda (admin) interfaces.
 */

import { API_VERSION, API_TIMEOUT } from '../constants/api.constants'; // v1.0.0
import envConfig, { api, environment } from './env.config';

/**
 * Resolves final API configuration based on environment settings
 * @returns Complete API configuration object with environment-specific settings
 */
const getApiConfig = () => {
  // Extract API settings and environment from envConfig
  const apiSettings = api;
  const currentEnv = environment;
  
  // Determine environment-specific API URLs
  const apiUrl = apiSettings.baseUrl;
  
  // Set up default headers for all API requests
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-API-Version': API_VERSION,
  };
  
  // Add environment-specific headers if needed
  if (currentEnv === 'development' || currentEnv === 'test') {
    headers['X-Environment'] = currentEnv;
  }
  
  // Configure endpoints with both Pike (merchant) and Barracuda (admin) endpoints
  const endpoints = {
    // Base endpoints from environment config
    ...apiSettings.endpoints,
    
    // Pike (merchant) interface specific endpoints
    merchantRefunds: '/merchants/:merchantId/refunds',
    customerRefundHistory: '/merchants/:merchantId/customers/:customerId/refunds',
    refundSummary: '/merchants/:merchantId/refunds/summary',
    
    // Barracuda (admin) interface specific endpoints
    adminRefundDashboard: '/admin/refunds/dashboard',
    adminRefundAnalytics: '/admin/refunds/analytics',
    adminCardNetworkRules: '/admin/compliance/card-network-rules',
    adminApprovalWorkflows: '/admin/workflows',
    adminRefundParameters: '/admin/parameters',
  };
  
  // Configure rate limits based on environment
  const rateLimits = {
    default: currentEnv === 'production' ? 100 : 500, // requests per minute
    refundCreation: currentEnv === 'production' ? 50 : 200, // requests per minute
    reporting: currentEnv === 'production' ? 30 : 100, // requests per minute
  };
  
  // Merge environment-specific settings with defaults
  const config = {
    apiUrl,
    apiVersion: API_VERSION,
    timeout: apiSettings.timeout || API_TIMEOUT,
    endpoints,
    headers,
    rateLimits,
  };
  
  // Return the complete API configuration object
  return config;
};

// Generate the API configuration
const apiConfig = getApiConfig();

// Export the complete API configuration
export default apiConfig;