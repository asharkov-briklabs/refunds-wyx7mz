import axios from 'axios'; // axios ^1.3.4
import * as jwt from 'jsonwebtoken'; // jsonwebtoken ^9.0.0
import jwksClient from 'jwks-rsa'; // jwks-rsa ^3.0.1

import {
  JwtPayload, TokenResponse, LoginParams, RefreshTokenParams,
  AuthError, UserInfo, UserRole, Permission
} from './types';
import authConfig from '../../config/auth';
import { logger } from '../../common/utils/logger';
import { ApiError } from '../../common/errors';
import { ErrorCode } from '../../common/constants/error-codes';

/**
 * Client for interacting with Auth0 authentication service.
 * Provides methods for authentication, token management, and permission verification.
 */
class AuthServiceClient {
  private jwksClient: jwksClient.JwksClient;
  private authDomain: string;
  private clientId: string;
  private clientSecret: string;
  private audience: string;

  /**
   * Initializes the Auth Service client with configuration from auth config
   */
  constructor() {
    // Initialize jwksClient for verifying JWT signatures
    this.jwksClient = jwksClient({
      jwksUri: `https://${authConfig.auth0.domain}/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5
    });

    // Set Auth0 configuration from config
    this.authDomain = authConfig.auth0.domain;
    this.clientId = authConfig.auth0.clientId;
    this.clientSecret = process.env.AUTH0_CLIENT_SECRET || '';
    this.audience = authConfig.auth0.audience;
  }

  /**
   * Authenticates a user with Auth0 and returns authentication tokens
   * @param params Login parameters including username and password
   * @returns Promise resolving to token response with access token, refresh token, etc.
   */
  async login(params: LoginParams): Promise<TokenResponse> {
    try {
      logger.info('Authenticating user', { username: params.username });

      // Prepare request data
      const data = {
        grant_type: 'password',
        username: params.username,
        password: params.password,
        audience: params.audience || this.audience,
        scope: params.scope || 'openid profile email',
        client_id: this.clientId,
        client_secret: this.clientSecret
      };

      // Make request to Auth0 token endpoint
      const response = await axios.post<TokenResponse>(
        `https://${this.authDomain}/oauth/token`,
        data,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('User authenticated successfully', { username: params.username });
      return response.data;
    } catch (error) {
      logger.error('Authentication failed', { error, username: params.username });
      return this.handleAuthError(error);
    }
  }

  /**
   * Refreshes an expired access token using the refresh token
   * @param params Parameters containing refresh token and optional scope
   * @returns Promise resolving to new token response
   */
  async refreshToken(params: RefreshTokenParams): Promise<TokenResponse> {
    try {
      logger.debug('Refreshing token');

      // Prepare request data
      const data = {
        grant_type: 'refresh_token',
        refresh_token: params.refresh_token,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: params.scope || 'openid profile email'
      };

      // Make request to Auth0 token endpoint
      const response = await axios.post<TokenResponse>(
        `https://${this.authDomain}/oauth/token`,
        data,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      logger.debug('Token refreshed successfully');
      return response.data;
    } catch (error) {
      logger.error('Token refresh failed', { error });
      return this.handleAuthError(error);
    }
  }

  /**
   * Verifies and decodes a JWT token
   * @param token JWT token to verify
   * @returns Promise resolving to decoded JWT payload if valid
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      logger.debug('Verifying token');

      // Decode token header to get key ID (kid)
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded !== 'object') {
        throw new Error('Invalid token');
      }

      const { header } = decoded;
      const kid = header.kid;

      if (!kid) {
        throw new Error('Token header missing kid (key ID)');
      }

      // Get signing key from jwksClient
      const signingKey = await this.getSigningKey(kid);

      // Verify token using jsonwebtoken and signing key
      const verifyOptions: jwt.VerifyOptions = {
        algorithms: authConfig.jwt.algorithms as jwt.Algorithm[],
        audience: this.audience,
        issuer: `https://${this.authDomain}/`
      };

      const payload = jwt.verify(token, signingKey, verifyOptions) as JwtPayload;
      logger.debug('Token verified successfully');
      return payload;
    } catch (error) {
      logger.error('Token verification failed', { error });
      return this.handleAuthError(error);
    }
  }

  /**
   * Extracts user information from a JWT token payload
   * @param payload Decoded JWT payload
   * @returns User information including ID, roles, and permissions
   */
  getUserInfo(payload: JwtPayload): UserInfo {
    // Extract user information from token payload
    return {
      id: payload.sub,
      email: payload.email,
      roles: this.getUserRoles(payload),
      permissions: this.getUserPermissions(payload),
      merchantId: payload.merchantId,
      organizationId: payload.organizationId,
      bankId: payload.bankId,
      programId: payload.programId
    };
  }

  /**
   * Gets roles associated with a user from their JWT token
   * @param payload Decoded JWT payload
   * @returns Array of role names
   */
  getUserRoles(payload: JwtPayload): string[] {
    // Extract roles array from token payload
    return payload.roles || [];
  }

  /**
   * Gets permissions associated with a user from their JWT token
   * @param payload Decoded JWT payload
   * @returns Array of permission names
   */
  getUserPermissions(payload: JwtPayload): string[] {
    // Extract permissions array from token payload
    return payload.permissions || [];
  }

  /**
   * Checks if a user has a specific permission
   * @param payload Decoded JWT payload
   * @param permission Permission to check
   * @returns True if user has the permission, false otherwise
   */
  hasPermission(payload: JwtPayload, permission: string | Permission): boolean {
    const permissions = this.getUserPermissions(payload);
    return permissions.includes(permission.toString());
  }

  /**
   * Checks if a user has a specific role
   * @param payload Decoded JWT payload
   * @param role Role to check
   * @returns True if user has the role, false otherwise
   */
  hasRole(payload: JwtPayload, role: string | UserRole): boolean {
    const roles = this.getUserRoles(payload);
    return roles.includes(role.toString());
  }

  /**
   * Retrieves the signing key for JWT verification
   * @param kid Key ID from JWT header
   * @returns Promise resolving to public key for verifying JWT signature
   * @private
   */
  private async getSigningKey(kid: string): Promise<string> {
    try {
      // Get signing key from JWKS client
      const key = await this.jwksClient.getSigningKey(kid);
      return key.getPublicKey();
    } catch (error) {
      logger.error('Failed to get signing key', { kid, error });
      throw new ApiError(
        ErrorCode.AUTHENTICATION_FAILED,
        'Failed to get token signing key'
      );
    }
  }

  /**
   * Handles authentication errors and converts them to ApiErrors
   * @param error Error to handle
   * @throws ApiError with appropriate error code and message
   * @private
   */
  private handleAuthError(error: any): never {
    logger.error('Auth error occurred', { error });

    // Extract error details if available
    const errorResponse = error.response?.data as AuthError;
    const errorMessage = errorResponse?.error_description || error.message || 'Authentication error';

    // Determine appropriate error code
    let errorCode = ErrorCode.AUTHENTICATION_FAILED;
    if (error.name === 'TokenExpiredError' || errorResponse?.error === 'invalid_token') {
      errorCode = ErrorCode.TOKEN_EXPIRED;
    } else if (error.response?.status === 401 || errorResponse?.error === 'invalid_grant') {
      errorCode = ErrorCode.INVALID_CREDENTIALS;
    }

    throw new ApiError(errorCode, errorMessage);
  }
}

// Create singleton instance
const authServiceClient = new AuthServiceClient();

// Export class and singleton instance
export { AuthServiceClient, authServiceClient };