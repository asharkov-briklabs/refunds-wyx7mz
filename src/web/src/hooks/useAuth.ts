import { useCallback } from 'react';
import { useAuthContext } from '../services/auth/auth.context';
import { User, UserRole, UserPermission, LoginRequest, MfaRequest } from '../types/user.types';

/**
 * Return type for the useAuth hook
 */
interface UseAuthReturn {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (loginRequest: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  handleRedirectCallback: () => Promise<void>;
  hasPermission: (permission: UserPermission, resourceId?: string) => boolean;
  hasRole: (role: UserRole) => boolean;
  isAdmin: () => boolean;
  isMerchantAdmin: () => boolean;
  handleMfaChallenge: (mfaRequest: MfaRequest) => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

/**
 * Custom hook that provides authentication functionality for components
 * 
 * This hook abstracts the authentication context and provides a simplified interface
 * for authentication in both Pike (merchant) and Barracuda (admin) interfaces.
 * 
 * @returns Object containing authentication state and methods
 */
const useAuth = (): UseAuthReturn => {
  // Call useAuthContext to get the authentication context
  const { 
    user, 
    token, 
    isAuthenticated, 
    loading, 
    error, 
    login, 
    logout, 
    handleRedirectCallback,
    hasPermission,
    hasRole,
    handleMfaChallenge,
    refreshToken
  } = useAuthContext();
  
  /**
   * Convenience method to check if the user has admin privileges
   */
  const isAdmin = useCallback((): boolean => {
    return hasRole(UserRole.BARRACUDA_ADMIN);
  }, [hasRole]);
  
  /**
   * Convenience method to check if the user has merchant admin privileges
   */
  const isMerchantAdmin = useCallback((): boolean => {
    return hasRole(UserRole.MERCHANT_ADMIN);
  }, [hasRole]);
  
  // Return an object with authentication state and methods for components to use
  return {
    user,
    token,
    isAuthenticated,
    isLoading: loading, // rename for consistency
    error,
    login,
    logout,
    handleRedirectCallback,
    hasPermission,
    hasRole,
    isAdmin,
    isMerchantAdmin,
    handleMfaChallenge,
    refreshToken
  };
};

export { useAuth };
export type { UseAuthReturn };