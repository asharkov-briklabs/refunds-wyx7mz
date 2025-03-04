/**
 * Auth Service Integration
 * 
 * This module exports authentication and authorization capabilities for the Refunds Service
 * through integration with Auth0. It provides JWT-based authentication with OAuth 2.0,
 * token validation, user permission verification, and role-based access control.
 * 
 * @module auth-service
 * @version 1.0.0
 */

// Import all type definitions from types module
import * as types from './types';

// Import auth service client implementation and singleton instance
import { AuthServiceClient, authServiceClient } from './client';

// Re-export all type definitions for easy access
export { types };

// Re-export the AuthServiceClient class and singleton instance
export { AuthServiceClient, authServiceClient };

/**
 * Default export of the singleton auth service client instance
 * for simpler import syntax: `import authService from './auth-service'`
 */
export default authServiceClient;