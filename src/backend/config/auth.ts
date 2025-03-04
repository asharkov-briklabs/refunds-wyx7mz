/**
 * Authentication Configuration
 * 
 * This file centralizes all authentication and authorization related settings
 * used across the Refunds Service, including Auth0 settings, JWT validation parameters,
 * and role-based access control definitions.
 */

import * as dotenv from 'dotenv'; // dotenv v16.0.0
import developmentConfig from './environments/development';

// Load environment variables
dotenv.config();

/**
 * Environment interface for type checking
 */
export interface Environment {
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
    auth0: {
      domain: string;
      audience: string;
      clientId: string;
    };
  };
  [key: string]: any; // Allow other environment properties
}

/**
 * Interface defining the structure of authentication configuration
 */
export interface AuthConfig {
  auth0: {
    domain: string;
    audience: string;
    clientId: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    issuer?: string;
    algorithms: string[];
  };
  roles: {
    [key: string]: {
      level: number;
      description: string;
      inherits?: string[];
    };
  };
  permissions: {
    [key: string]: {
      description: string;
      roles: string[];
    };
  };
}

/**
 * Retrieves authentication configuration based on current environment
 * 
 * @param env Environment configuration
 * @returns Authentication configuration object
 */
export function getAuthConfig(env: Environment): AuthConfig {
  // Extract auth settings from the environment configuration
  const { auth: envAuth } = env;
  
  // Default auth configuration
  const defaultConfig: AuthConfig = {
    auth0: {
      domain: process.env.AUTH0_DOMAIN || 'dev-auth.brik.com',
      audience: process.env.AUTH0_AUDIENCE || 'http://localhost:3000',
      clientId: process.env.AUTH0_CLIENT_ID || 'dev-client-id',
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'development-jwt-secret-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      algorithms: ['RS256'],
    },
    roles: {
      BARRACUDA_ADMIN: {
        level: 100,
        description: 'System-wide administrator with full access to all features and data',
      },
      BANK_ADMIN: {
        level: 80,
        description: 'Bank-level administrator with access to bank-specific data and configurations',
        inherits: [],
      },
      ORGANIZATION_ADMIN: {
        level: 60,
        description: 'Organization-level administrator with access to organization-specific data and configurations',
        inherits: [],
      },
      PLATFORM_ADMIN: {
        level: 50,
        description: 'Platform-level administrator with access to platform-specific settings',
        inherits: [],
      },
      MERCHANT_ADMIN: {
        level: 40,
        description: 'Merchant-level administrator with access to merchant-specific data',
        inherits: [],
      },
      SUPPORT_STAFF: {
        level: 20,
        description: 'Support staff with limited access to assist merchants and customers',
        inherits: [],
      },
    },
    permissions: {
      // Refund Processing permissions
      'create:refund': {
        description: 'Create refund requests',
        roles: ['MERCHANT_ADMIN', 'ORGANIZATION_ADMIN', 'BANK_ADMIN', 'BARRACUDA_ADMIN', 'SUPPORT_STAFF'],
      },
      'read:refund': {
        description: 'View refund details',
        roles: ['MERCHANT_ADMIN', 'ORGANIZATION_ADMIN', 'BANK_ADMIN', 'BARRACUDA_ADMIN', 'SUPPORT_STAFF'],
      },
      'update:refund': {
        description: 'Update refund details',
        roles: ['MERCHANT_ADMIN', 'ORGANIZATION_ADMIN', 'BANK_ADMIN', 'BARRACUDA_ADMIN'],
      },
      'cancel:refund': {
        description: 'Cancel refund requests',
        roles: ['MERCHANT_ADMIN', 'ORGANIZATION_ADMIN', 'BANK_ADMIN', 'BARRACUDA_ADMIN'],
      },
      
      // Parameter Configuration permissions
      'read:params': {
        description: 'View configuration parameters',
        roles: ['MERCHANT_ADMIN', 'ORGANIZATION_ADMIN', 'BANK_ADMIN', 'BARRACUDA_ADMIN'],
      },
      'write:params': {
        description: 'Modify configuration parameters',
        roles: ['ORGANIZATION_ADMIN', 'BANK_ADMIN', 'BARRACUDA_ADMIN'],
      },
      
      // Bank Account permissions
      'read:bankaccounts': {
        description: 'View bank account details',
        roles: ['MERCHANT_ADMIN', 'ORGANIZATION_ADMIN', 'BANK_ADMIN', 'BARRACUDA_ADMIN'],
      },
      'manage:bankaccounts': {
        description: 'Create, update, and delete bank accounts',
        roles: ['MERCHANT_ADMIN', 'ORGANIZATION_ADMIN', 'BANK_ADMIN', 'BARRACUDA_ADMIN'],
      },
      
      // Approval workflow permissions
      'approve:refund': {
        description: 'Approve refund requests',
        roles: ['MERCHANT_ADMIN', 'ORGANIZATION_ADMIN', 'BANK_ADMIN', 'BARRACUDA_ADMIN'],
      },
      'reject:refund': {
        description: 'Reject refund requests',
        roles: ['MERCHANT_ADMIN', 'ORGANIZATION_ADMIN', 'BANK_ADMIN', 'BARRACUDA_ADMIN'],
      },
      'configure:approval': {
        description: 'Configure approval workflows',
        roles: ['ORGANIZATION_ADMIN', 'BANK_ADMIN', 'BARRACUDA_ADMIN'],
      },
      
      // Reporting permissions
      'view:reports': {
        description: 'View reports and analytics',
        roles: ['MERCHANT_ADMIN', 'ORGANIZATION_ADMIN', 'BANK_ADMIN', 'BARRACUDA_ADMIN', 'SUPPORT_STAFF'],
      },
      'create:reports': {
        description: 'Create custom reports',
        roles: ['ORGANIZATION_ADMIN', 'BANK_ADMIN', 'BARRACUDA_ADMIN'],
      },
      'export:reports': {
        description: 'Export report data',
        roles: ['MERCHANT_ADMIN', 'ORGANIZATION_ADMIN', 'BANK_ADMIN', 'BARRACUDA_ADMIN'],
      },
      
      // Compliance permissions
      'view:compliance': {
        description: 'View compliance settings and violations',
        roles: ['ORGANIZATION_ADMIN', 'BANK_ADMIN', 'BARRACUDA_ADMIN'],
      },
      'manage:compliance': {
        description: 'Manage compliance rules and settings',
        roles: ['BANK_ADMIN', 'BARRACUDA_ADMIN'],
      },
    },
  };
  
  // Merge with environment-specific settings if available
  if (envAuth) {
    return {
      auth0: {
        ...defaultConfig.auth0,
        domain: envAuth.auth0?.domain || defaultConfig.auth0.domain,
        audience: envAuth.auth0?.audience || defaultConfig.auth0.audience,
        clientId: envAuth.auth0?.clientId || defaultConfig.auth0.clientId,
      },
      jwt: {
        ...defaultConfig.jwt,
        secret: envAuth.jwtSecret || defaultConfig.jwt.secret,
        expiresIn: envAuth.jwtExpiresIn || defaultConfig.jwt.expiresIn,
      },
      roles: defaultConfig.roles,
      permissions: defaultConfig.permissions,
    };
  }
  
  return defaultConfig;
}

// Create configuration based on current environment
const authConfig = getAuthConfig(developmentConfig as Environment);

export default authConfig;