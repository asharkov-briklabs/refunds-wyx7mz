import { JwtPayload as BaseJwtPayload } from "jsonwebtoken"; // jsonwebtoken@^9.0.0

/**
 * Interface representing a user profile from Auth0
 */
export interface UserProfile {
  sub: string;           // Subject identifier (user ID)
  email: string;         // User's email address
  name: string;          // User's full name
  nickname: string;      // User's nickname/username
  picture: string;       // URL to user's profile picture
  updated_at: string;    // Last update timestamp
}

/**
 * Extended JWT payload with custom claims for Refunds Service
 * Includes standard JWT claims and Brik-specific claims for authorization
 */
export interface JwtPayload extends BaseJwtPayload {
  sub: string;           // Subject identifier (user ID)
  iss: string;           // Issuer of the token (Auth0 URL)
  aud: string;           // Audience (API identifier)
  iat: number;           // Issued at timestamp
  exp: number;           // Expiration timestamp
  azp: string;           // Authorized party (client ID)
  scope: string;         // Space-separated list of scopes
  permissions: string[]; // User permissions
  roles: string[];       // User roles
  
  // Brik-specific claims
  email: string;         // User email
  merchantId: string;    // Associated merchant ID
  organizationId: string; // Associated organization ID
  bankId: string;        // Associated bank ID
  programId: string;     // Associated program ID
}

/**
 * Response from successful authentication with Auth0
 */
export interface TokenResponse {
  access_token: string;  // JWT access token
  refresh_token: string; // Refresh token for obtaining new access tokens
  id_token: string;      // ID token containing user information
  token_type: string;    // Token type (usually "Bearer")
  expires_in: number;    // Token lifetime in seconds
}

/**
 * Parameters for logging in via Auth0
 */
export interface LoginParams {
  username: string;      // User's email or username
  password: string;      // User's password
  scope: string;         // Requested scopes
  audience: string;      // API identifier
}

/**
 * Parameters for refreshing an access token
 */
export interface RefreshTokenParams {
  refresh_token: string; // Valid refresh token
  scope: string;         // Requested scopes
}

/**
 * Error response from Auth0
 */
export interface AuthError {
  error: string;             // Error code
  error_description: string; // Human-readable error description
  statusCode: number;        // HTTP status code
}

/**
 * Enumeration of user roles in the Refunds Service
 */
export enum UserRole {
  BARRACUDA_ADMIN = "BARRACUDA_ADMIN",       // System-wide admin with full access
  BANK_ADMIN = "BANK_ADMIN",                 // Bank-level administrator
  ORGANIZATION_ADMIN = "ORGANIZATION_ADMIN", // Organization-level administrator
  MERCHANT_ADMIN = "MERCHANT_ADMIN",         // Merchant-level administrator
  SUPPORT_STAFF = "SUPPORT_STAFF"            // Limited-scope support personnel
}

/**
 * Enumeration of permissions in the Refunds Service
 */
export enum Permission {
  // Refund management permissions
  CREATE_REFUND = "create:refund",
  VIEW_REFUND = "view:refund",
  UPDATE_REFUND = "update:refund",
  CANCEL_REFUND = "cancel:refund",
  APPROVE_REFUND = "approve:refund",
  
  // Bank account management permissions
  MANAGE_BANK_ACCOUNTS = "manage:bankaccounts",
  VIEW_BANK_ACCOUNTS = "view:bankaccounts",
  
  // Parameter configuration permissions
  CONFIGURE_PARAMETERS = "configure:parameters",
  VIEW_PARAMETERS = "view:parameters",
  
  // Reporting permissions
  GENERATE_REPORTS = "generate:reports",
  VIEW_REPORTS = "view:reports"
}

/**
 * User information extracted from JWT token for application use
 */
export interface UserInfo {
  id: string;            // User ID (from sub claim)
  email: string;         // User email
  roles: string[];       // User roles
  permissions: string[]; // User permissions
  merchantId: string;    // Associated merchant ID
  organizationId: string; // Associated organization ID
  bankId: string;        // Associated bank ID
  programId: string;     // Associated program ID
}