/**
 * Authentication Service
 * 
 * Core authentication service that manages Auth0 integration, token handling,
 * user permissions, and multi-factor authentication for both Pike (merchant)
 * and Barracuda (admin) interfaces of the Refunds Service.
 * 
 * @version 1.0.0
 */

import auth0 from 'auth0-js'; // v9.21.0
import jwt_decode from 'jwt-decode'; // v3.1.2

import authConfig from '../../config/auth.config';
import apiClient from '../api/api.client';
import { 
  User, 
  UserRole, 
  UserPermission, 
  LoginRequest, 
  LoginResponse, 
  MfaRequest 
} from '../../types/user.types';

// Token storage key in localStorage
const TOKEN_STORAGE_KEY = 'auth_token';

/**
 * Create an Auth0 WebAuth instance with the appropriate configuration
 * @returns Configured Auth0 WebAuth instance
 */
const createAuth0Client = (): auth0.WebAuth => {
  return new auth0.WebAuth({
    domain: authConfig.domain,
    clientID: authConfig.clientId,
    redirectUri: authConfig.redirectUri,
    responseType: authConfig.responseType,
    scope: authConfig.scope,
    audience: authConfig.audience
  });
};

/**
 * Initiates the login process using Auth0 authentication
 * @param loginRequest Login request parameters
 * @returns Promise resolving to login response with user data and token
 */
const login = async (loginRequest: LoginRequest): Promise<LoginResponse> => {
  try {
    // Create Auth0 client
    const auth0Client = createAuth0Client();
    
    // Validate required parameters
    if (!loginRequest.email || !loginRequest.password) {
      throw new Error('Email and password are required');
    }
    
    // Start the login process - Auth0 will redirect the browser
    auth0Client.authorize({
      email: loginRequest.email,
      redirectUri: loginRequest.redirectUri || authConfig.redirectUri,
    });
    
    // Return a promise that never resolves since we're redirecting to Auth0
    return new Promise<LoginResponse>(() => {
      // This promise intentionally doesn't resolve or reject
      // as we're redirecting to Auth0
    });
  } catch (error) {
    console.error('Login initiation error:', error);
    throw error;
  }
};

/**
 * Logs the user out and clears authentication state
 * @returns Promise that resolves when logout is complete
 */
const logout = async (): Promise<void> => {
  try {
    // Clear token from local storage
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    
    // Clear token from API client
    apiClient.clearAuthToken();
    
    // Create Auth0 client
    const auth0Client = createAuth0Client();
    
    // Perform Auth0 logout - this will redirect the browser
    auth0Client.logout({
      returnTo: authConfig.logoutUri
    });
    
    // Return a promise that never resolves since we're redirecting
    return new Promise<void>(() => {
      // This promise intentionally doesn't resolve or reject
      // as we're redirecting to Auth0 logout page
    });
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

/**
 * Processes the authentication result after redirect from Auth0
 * @returns Promise resolving to login response with user data and token
 */
const handleRedirectCallback = async (): Promise<LoginResponse> => {
  return new Promise<LoginResponse>((resolve, reject) => {
    try {
      // Create Auth0 client
      const auth0Client = createAuth0Client();
      
      // Parse the authentication result from URL hash
      auth0Client.parseHash((err, authResult) => {
        if (err) {
          console.error('Auth0 parse hash error:', err);
          reject(err);
          return;
        }
        
        if (!authResult || !authResult.idToken || !authResult.accessToken) {
          reject(new Error('Failed to parse authentication result'));
          return;
        }
        
        // Extract the tokens
        const idToken = authResult.idToken;
        const accessToken = authResult.accessToken;
        
        // Store the access token in local storage
        localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
        
        // Set the token in API client for authenticated requests
        apiClient.setAuthToken(accessToken);
        
        // Decode the tokens to get user information
        const decodedIdToken = jwt_decode<any>(idToken);
        
        // Extract user information from the tokens
        const user: User = {
          id: decodedIdToken.sub,
          email: decodedIdToken.email,
          firstName: decodedIdToken.given_name || '',
          lastName: decodedIdToken.family_name || '',
          roles: decodedIdToken['https://brik.com/roles'] || [],
          permissions: decodedIdToken['https://brik.com/permissions'] || [],
          merchantId: decodedIdToken['https://brik.com/merchant_id'] || null,
          organizationId: decodedIdToken['https://brik.com/organization_id'] || null,
          bankId: decodedIdToken['https://brik.com/bank_id'] || null,
          programId: decodedIdToken['https://brik.com/program_id'] || null,
          mfaEnabled: decodedIdToken['https://brik.com/mfa_enabled'] || false,
          lastLogin: decodedIdToken['https://brik.com/last_login'] || null,
          createdAt: decodedIdToken['https://brik.com/created_at'] || new Date().toISOString(),
          updatedAt: decodedIdToken['https://brik.com/updated_at'] || new Date().toISOString()
        };
        
        // Check if MFA is required based on user roles
        const requiresMfa = isMfaRequired(user);
        
        // Calculate token expiration time
        const expiresAt = decodedIdToken.exp;
        
        // Return login response with user data and token
        resolve({
          user,
          token: accessToken,
          expiresAt,
          requiresMfa
        });
      });
    } catch (error) {
      console.error('Error handling redirect callback:', error);
      reject(error);
    }
  });
};

/**
 * Retrieves the current authentication token
 * @returns Current authentication token or null if not authenticated
 */
const getToken = (): string | null => {
  // Get token from local storage
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  
  // Check if token exists and is not expired
  if (token && !checkTokenExpiration()) {
    return token;
  }
  
  return null;
};

/**
 * Retrieves the current user information from the stored token
 * @returns Current user information or null if not authenticated
 */
const getUserInfo = (): User | null => {
  // Get the current token
  const token = getToken();
  if (!token) {
    return null;
  }
  
  try {
    // Decode the token to extract user information
    const decodedToken = jwt_decode<any>(token);
    
    // Format and return the user object
    return {
      id: decodedToken.sub,
      email: decodedToken.email,
      firstName: decodedToken.given_name || '',
      lastName: decodedToken.family_name || '',
      roles: decodedToken['https://brik.com/roles'] || [],
      permissions: decodedToken['https://brik.com/permissions'] || [],
      merchantId: decodedToken['https://brik.com/merchant_id'] || null,
      organizationId: decodedToken['https://brik.com/organization_id'] || null,
      bankId: decodedToken['https://brik.com/bank_id'] || null,
      programId: decodedToken['https://brik.com/program_id'] || null,
      mfaEnabled: decodedToken['https://brik.com/mfa_enabled'] || false,
      lastLogin: decodedToken['https://brik.com/last_login'] || null,
      createdAt: decodedToken['https://brik.com/created_at'] || new Date().toISOString(),
      updatedAt: decodedToken['https://brik.com/updated_at'] || new Date().toISOString()
    };
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Checks if the user is currently authenticated
 * @returns True if user is authenticated, false otherwise
 */
const isAuthenticated = (): boolean => {
  // Get the current token
  const token = getToken();
  
  // If no token exists, user is not authenticated
  return !!token;
};

/**
 * Checks if the current user has a specific permission
 * @param permission Permission to check
 * @param resourceId Optional resource ID to check access for
 * @returns True if user has the permission, false otherwise
 */
const hasPermission = (permission: UserPermission, resourceId?: string): boolean => {
  // Get current user information
  const user = getUserInfo();
  if (!user) {
    return false;
  }
  
  // Check if user has the specific permission directly
  if (user.permissions.includes(permission)) {
    return true;
  }
  
  // Check if user's roles include roles that have the permission
  for (const role of user.roles) {
    const rolePermissions = authConfig.rolePermissionMap[role];
    if (rolePermissions && rolePermissions.includes(permission)) {
      // If resourceId is provided, check if user has access to the resource
      if (resourceId) {
        // Resource-based permission checks
        if (role === UserRole.BARRACUDA_ADMIN) {
          // Barracuda admins have access to all resources
          return true;
        }
        
        // For organization admins, check if resource is in their organization
        if (role === UserRole.ORGANIZATION_ADMIN && user.organizationId) {
          // This would ideally check if the resource belongs to the user's organization
          // For now, we'll do a simple check if it's the same organization
          if (resourceId === user.organizationId) {
            return true;
          }
        }
        
        // For merchant admins, check if resource is their merchant
        if (role === UserRole.MERCHANT_ADMIN && user.merchantId) {
          if (resourceId === user.merchantId) {
            return true;
          }
        }
        
        // Similar checks for bank admins and platform admins
        if (role === UserRole.BANK_ADMIN && user.bankId) {
          if (resourceId === user.bankId) {
            return true;
          }
        }
        
        // If none of the above checks pass, deny access to the specific resource
        return false;
      }
      
      // If no resourceId provided, user has the permission via their role
      return true;
    }
  }
  
  // If we get here, user doesn't have the permission
  return false;
};

/**
 * Checks if the current user has a specific role
 * @param role Role to check
 * @returns True if user has the role, false otherwise
 */
const hasRole = (role: UserRole): boolean => {
  // Get current user information
  const user = getUserInfo();
  if (!user) {
    return false;
  }
  
  // Check if user's roles array includes the specified role
  return user.roles.includes(role);
};

/**
 * Renews the authentication token before it expires
 * @returns Promise resolving to new token or null if renewal fails
 */
const renewToken = async (): Promise<string | null> => {
  return new Promise<string | null>((resolve, reject) => {
    try {
      // Initialize Auth0 WebAuth instance with config values
      const auth0Client = createAuth0Client();
      
      // Call Auth0 checkSession method to silently renew the token
      auth0Client.checkSession({}, (err, authResult) => {
        if (err) {
          console.error('Error renewing token:', err);
          resolve(null);
          return;
        }
        
        if (!authResult || !authResult.accessToken) {
          console.warn('No auth result or access token from token renewal');
          resolve(null);
          return;
        }
        
        // If successful, store the new token in local storage
        localStorage.setItem(TOKEN_STORAGE_KEY, authResult.accessToken);
        
        // Update the token in API client
        apiClient.setAuthToken(authResult.accessToken);
        
        // Return the new token
        resolve(authResult.accessToken);
      });
    } catch (error) {
      console.error('Token renewal error:', error);
      reject(error);
    }
  });
};

/**
 * Handles multi-factor authentication challenges during login
 * @param mfaRequest MFA request with verification code
 * @returns Promise resolving to login response after MFA verification
 */
const handleMfaChallenge = async (mfaRequest: MfaRequest): Promise<LoginResponse> => {
  try {
    // Validate MFA request parameters
    if (!mfaRequest.mfaToken || !mfaRequest.code) {
      throw new Error('MFA token and verification code are required');
    }
    
    // Make API request to verify MFA code
    const response = await apiClient.post<LoginResponse>('/auth/mfa-verify', mfaRequest);
    
    // If unsuccessful, handle errors and throw appropriate exception
    if (!response.success || !response.data) {
      const errorMessage = response.error?.message || 'MFA verification failed';
      throw new Error(errorMessage);
    }
    
    // If successful, extract and decode the new token
    const { token, user, expiresAt } = response.data;
    
    // Store the new token in local storage
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    
    // Set the new token in API client
    apiClient.setAuthToken(token);
    
    // Return login response with user data and new token
    return response.data;
  } catch (error) {
    console.error('MFA verification error:', error);
    throw error;
  }
};

/**
 * Determines if MFA is required for the current user based on roles
 * @param user User object to check against MFA requirements
 * @returns True if MFA is required, false otherwise
 */
const isMfaRequired = (user: User): boolean => {
  // If user has MFA already enabled, return true
  if (user.mfaEnabled) {
    return true;
  }
  
  // Check each of the user's roles against MFA requirements in config
  for (const role of user.roles) {
    const requirement = authConfig.mfaRequirements[role];
    // If any role requires MFA, return true
    if (requirement === 'required') {
      return true;
    }
  }
  
  // Otherwise, return false
  return false;
};

/**
 * Checks if the current token is expired or close to expiring
 * @returns True if token needs renewal, false otherwise
 */
const checkTokenExpiration = (): boolean => {
  // Get the current token
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  
  // If no token exists, return true (needs renewal)
  if (!token) {
    return true;
  }
  
  try {
    // Decode the token to get expiration time
    const decodedToken = jwt_decode<any>(token);
    
    // Calculate the current time plus the renewal offset
    const currentTime = Math.floor(Date.now() / 1000);
    const renewalTime = currentTime + authConfig.tokenRenewalOffsetSeconds;
    
    // Return true if token expires before the offset time, false otherwise
    return decodedToken.exp < renewalTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // If error occurs, assume token needs renewal
  }
};

// Export the authentication service methods
export default {
  login,
  logout,
  handleRedirectCallback,
  getToken,
  getUserInfo,
  isAuthenticated,
  hasPermission,
  hasRole,
  renewToken,
  handleMfaChallenge,
  isMfaRequired,
  checkTokenExpiration
};