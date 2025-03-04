/**
 * Authentication Configuration
 * 
 * This file provides configuration for the application's authentication and authorization systems,
 * including Auth0 settings, role-based permissions, and multi-factor authentication requirements.
 * It is used by both Pike (merchant) and Barracuda (admin) interfaces.
 * 
 * @version 1.0.0
 */

import { isDevelopment, isProduction } from './env.config';
import { UserRole, UserPermission } from '../types/user.types';

/**
 * Auth0 domain - Authentication service domain
 * Varies by environment (dev, staging, production)
 * 
 * @version Auth0 2023.10
 */
const domain = process.env.REACT_APP_AUTH0_DOMAIN || (
  isProduction ? 'brik.auth0.com' : 
  isDevelopment ? 'brik-dev.auth0.com' :
  'brik-staging.auth0.com' // Default to staging if not production or development
);

/**
 * Auth0 client ID - Application identifier in Auth0
 * Varies by environment (dev, staging, production)
 * 
 * @version Auth0 2023.10
 */
const clientId = process.env.REACT_APP_AUTH0_CLIENT_ID || (
  isProduction ? 'prod-client-id' : 
  isDevelopment ? 'dev-client-id' :
  'staging-client-id' // Default to staging if not production or development
);

/**
 * Auth0 audience - API identifier for backend access
 * Varies by environment (dev, staging, production)
 * 
 * @version Auth0 2023.10
 */
const audience = process.env.REACT_APP_AUTH0_AUDIENCE || (
  isProduction ? 'https://api.brik.com/' : 
  isDevelopment ? 'https://api.dev.brik.com/' :
  'https://api.staging.brik.com/' // Default to staging if not production or development
);

/**
 * Redirect URI after successful authentication
 * Where Auth0 will redirect after login
 */
const redirectUri = process.env.REACT_APP_AUTH0_REDIRECT_URI || 
  window.location.origin + '/callback';

/**
 * Redirect URI after logout
 * Where Auth0 will redirect after logout
 */
const logoutUri = process.env.REACT_APP_AUTH0_LOGOUT_URI || 
  window.location.origin;

/**
 * OpenID Connect response type
 * Specifies what authentication artifacts to return
 */
const responseType = 'token id_token';

/**
 * OpenID Connect scopes
 * Specifies what user information to request
 */
const scope = 'openid profile email';

/**
 * Session check expiry days
 * How long before session verification is required (8 hours)
 */
const sessionCheckExpiryDays = 0.33;

/**
 * Token renewal offset in seconds
 * How long before token expiry to attempt renewal (5 minutes)
 */
const tokenRenewalOffsetSeconds = 300;

/**
 * Role-Permission Mapping
 * Maps user roles to their allowed permissions
 * Used for role-based access control
 */
const rolePermissionMap: Record<UserRole, UserPermission[]> = {
  // System-wide admin with full access
  [UserRole.BARRACUDA_ADMIN]: [
    UserPermission.CREATE_REFUND,
    UserPermission.VIEW_REFUND,
    UserPermission.UPDATE_REFUND,
    UserPermission.CANCEL_REFUND,
    UserPermission.APPROVE_REFUND,
    UserPermission.REJECT_REFUND,
    UserPermission.VIEW_BANK_ACCOUNT,
    UserPermission.MANAGE_BANK_ACCOUNT,
    UserPermission.VIEW_PARAMETERS,
    UserPermission.MANAGE_PARAMETERS,
    UserPermission.VIEW_REPORTS,
    UserPermission.CREATE_REPORTS,
    UserPermission.MANAGE_WORKFLOWS,
    UserPermission.MANAGE_COMPLIANCE
  ],
  
  // Bank-level admin
  [UserRole.BANK_ADMIN]: [
    UserPermission.VIEW_REFUND,
    UserPermission.APPROVE_REFUND,
    UserPermission.REJECT_REFUND,
    UserPermission.VIEW_BANK_ACCOUNT,
    UserPermission.VIEW_PARAMETERS,
    UserPermission.MANAGE_PARAMETERS,
    UserPermission.VIEW_REPORTS,
    UserPermission.CREATE_REPORTS,
    UserPermission.MANAGE_WORKFLOWS
  ],
  
  // Organization-level admin
  [UserRole.ORGANIZATION_ADMIN]: [
    UserPermission.VIEW_REFUND,
    UserPermission.APPROVE_REFUND,
    UserPermission.REJECT_REFUND,
    UserPermission.VIEW_BANK_ACCOUNT,
    UserPermission.VIEW_PARAMETERS,
    UserPermission.MANAGE_PARAMETERS,
    UserPermission.VIEW_REPORTS,
    UserPermission.CREATE_REPORTS
  ],
  
  // Platform-level admin
  [UserRole.PLATFORM_ADMIN]: [
    UserPermission.VIEW_REFUND,
    UserPermission.VIEW_BANK_ACCOUNT,
    UserPermission.VIEW_PARAMETERS,
    UserPermission.MANAGE_PARAMETERS,
    UserPermission.VIEW_REPORTS,
    UserPermission.CREATE_REPORTS,
    UserPermission.MANAGE_WORKFLOWS
  ],
  
  // Merchant-specific admin
  [UserRole.MERCHANT_ADMIN]: [
    UserPermission.CREATE_REFUND,
    UserPermission.VIEW_REFUND,
    UserPermission.UPDATE_REFUND,
    UserPermission.CANCEL_REFUND,
    UserPermission.APPROVE_REFUND,
    UserPermission.VIEW_BANK_ACCOUNT,
    UserPermission.MANAGE_BANK_ACCOUNT,
    UserPermission.VIEW_PARAMETERS,
    UserPermission.VIEW_REPORTS
  ],
  
  // Support staff with limited access
  [UserRole.SUPPORT_STAFF]: [
    UserPermission.VIEW_REFUND,
    UserPermission.VIEW_BANK_ACCOUNT,
    UserPermission.VIEW_PARAMETERS,
    UserPermission.VIEW_REPORTS
  ]
};

/**
 * Multi-Factor Authentication Requirements
 * Specifies which user roles require MFA
 */
const mfaRequirements: Record<UserRole, 'required' | 'optional' | 'none'> = {
  [UserRole.BARRACUDA_ADMIN]: 'required',
  [UserRole.BANK_ADMIN]: 'required',
  [UserRole.ORGANIZATION_ADMIN]: 'required',
  [UserRole.PLATFORM_ADMIN]: 'required',
  [UserRole.MERCHANT_ADMIN]: 'optional',
  [UserRole.SUPPORT_STAFF]: 'required'
};

// Export all configuration properties
export default {
  domain,
  clientId,
  audience,
  redirectUri,
  logoutUri,
  responseType,
  scope,
  sessionCheckExpiryDays,
  tokenRenewalOffsetSeconds,
  rolePermissionMap,
  mfaRequirements
};