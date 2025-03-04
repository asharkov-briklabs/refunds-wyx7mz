/**
 * @file User Types
 * 
 * This file contains TypeScript definitions for user-related types including:
 * - User data structures
 * - Role and permission enums
 * - Authentication interfaces
 * - Authorization types
 * 
 * These types support the authentication framework using Auth0 with OAuth 2.0 and JWT,
 * as well as the hierarchical role-based access control system with granular permissions.
 */

/**
 * Defines the possible user roles within the Refunds Service application
 * These roles form the basis of the role-based access control system
 */
export enum UserRole {
  /**
   * System-wide admin with full access to all features and data
   */
  BARRACUDA_ADMIN = 'BARRACUDA_ADMIN',
  
  /**
   * Bank-level admin with access to bank's merchants and settings
   */
  BANK_ADMIN = 'BANK_ADMIN',
  
  /**
   * Organization-level admin with access to organization's merchants and settings
   */
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN',
  
  /**
   * Platform-level admin with access to platform settings
   */
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  
  /**
   * Merchant-specific admin with access to their own merchant settings
   */
  MERCHANT_ADMIN = 'MERCHANT_ADMIN',
  
  /**
   * Support staff with limited access to help customers
   */
  SUPPORT_STAFF = 'SUPPORT_STAFF'
}

/**
 * Defines granular permissions for specific actions within the application
 * These permissions are assigned to roles and determine what actions a user can perform
 */
export enum UserPermission {
  /**
   * Permission to create new refund requests
   */
  CREATE_REFUND = 'CREATE_REFUND',
  
  /**
   * Permission to view refund details
   */
  VIEW_REFUND = 'VIEW_REFUND',
  
  /**
   * Permission to update refund information (pre-processing)
   */
  UPDATE_REFUND = 'UPDATE_REFUND',
  
  /**
   * Permission to cancel refund requests
   */
  CANCEL_REFUND = 'CANCEL_REFUND',
  
  /**
   * Permission to approve refund requests in approval workflows
   */
  APPROVE_REFUND = 'APPROVE_REFUND',
  
  /**
   * Permission to reject refund requests in approval workflows
   */
  REJECT_REFUND = 'REJECT_REFUND',
  
  /**
   * Permission to view bank account information
   */
  VIEW_BANK_ACCOUNT = 'VIEW_BANK_ACCOUNT',
  
  /**
   * Permission to manage (create, edit, delete) bank accounts
   */
  MANAGE_BANK_ACCOUNT = 'MANAGE_BANK_ACCOUNT',
  
  /**
   * Permission to view configuration parameters
   */
  VIEW_PARAMETERS = 'VIEW_PARAMETERS',
  
  /**
   * Permission to manage (create, edit, delete) configuration parameters
   */
  MANAGE_PARAMETERS = 'MANAGE_PARAMETERS',
  
  /**
   * Permission to view reports and analytics
   */
  VIEW_REPORTS = 'VIEW_REPORTS',
  
  /**
   * Permission to create custom reports
   */
  CREATE_REPORTS = 'CREATE_REPORTS',
  
  /**
   * Permission to manage approval workflows
   */
  MANAGE_WORKFLOWS = 'MANAGE_WORKFLOWS',
  
  /**
   * Permission to manage compliance rules and settings
   */
  MANAGE_COMPLIANCE = 'MANAGE_COMPLIANCE'
}

/**
 * Defines the structure of user data throughout the application
 * Contains core identity information as well as role and permission assignments
 */
export interface User {
  /**
   * Unique user identifier
   */
  id: string;
  
  /**
   * User's email address (used for login)
   */
  email: string;
  
  /**
   * User's first name
   */
  firstName: string;
  
  /**
   * User's last name
   */
  lastName: string;
  
  /**
   * Array of assigned roles that determine access level
   */
  roles: UserRole[];
  
  /**
   * Array of specific permissions assigned to the user
   * (in addition to permissions derived from roles)
   */
  permissions: UserPermission[];
  
  /**
   * Merchant ID if the user is associated with a specific merchant
   * Null for users not tied to a specific merchant
   */
  merchantId: string | null;
  
  /**
   * Organization ID if the user is associated with a specific organization
   * Null for users not tied to a specific organization
   */
  organizationId: string | null;
  
  /**
   * Bank ID if the user is associated with a specific bank
   * Null for users not tied to a specific bank
   */
  bankId: string | null;
  
  /**
   * Program ID if the user is associated with a specific program
   * Null for users not tied to a specific program
   */
  programId: string | null;
  
  /**
   * Flag indicating if multi-factor authentication is enabled for the user
   */
  mfaEnabled: boolean;
  
  /**
   * Timestamp of the user's last login
   * Null if the user has never logged in
   */
  lastLogin: string | null;
  
  /**
   * Timestamp when the user record was created
   */
  createdAt: string;
  
  /**
   * Timestamp when the user record was last updated
   */
  updatedAt: string;
}

/**
 * Defines the request structure for user login
 */
export interface LoginRequest {
  /**
   * User's email address
   */
  email: string;
  
  /**
   * User's password
   */
  password: string;
  
  /**
   * URI to redirect to after successful authentication
   */
  redirectUri: string;
}

/**
 * Defines the response structure for successful login
 */
export interface LoginResponse {
  /**
   * User object containing the authenticated user's details
   */
  user: User;
  
  /**
   * JWT token for authenticating subsequent requests
   */
  token: string;
  
  /**
   * Timestamp (in seconds) when the token expires
   */
  expiresAt: number;
  
  /**
   * Flag indicating if MFA verification is required
   */
  requiresMfa: boolean;
}

/**
 * Defines the request structure for multi-factor authentication
 */
export interface MfaRequest {
  /**
   * Temporary token received after initial authentication
   */
  mfaToken: string;
  
  /**
   * Verification code provided by the user from their MFA device
   */
  code: string;
}

/**
 * Defines the structure of authentication state in Redux store
 */
export interface AuthState {
  /**
   * Flag indicating if the user is authenticated
   */
  isAuthenticated: boolean;
  
  /**
   * The authenticated user's data (null if not authenticated)
   */
  user: User | null;
  
  /**
   * JWT token for API requests (null if not authenticated)
   */
  token: string | null;
  
  /**
   * Flag indicating if an authentication operation is in progress
   */
  loading: boolean;
  
  /**
   * Error message if authentication failed (null if no error)
   */
  error: string | null;
}

/**
 * Maps user roles to their associated permissions for role-based access control
 * This type is used to define the default permissions granted to each role
 */
export type RolePermissionMap = Record<UserRole, UserPermission[]>;