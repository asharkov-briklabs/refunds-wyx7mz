/**
 * Authentication Context Provider
 * 
 * This component provides authentication state and functionality throughout the
 * component tree for both Pike (merchant) and Barracuda (admin) interfaces of the
 * Refunds Service application.
 * 
 * It implements the React context API to manage:
 * - Authentication state
 * - Login/logout functionality
 * - Token management and renewal
 * - Permission and role checking
 * - Multi-factor authentication handling
 */

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback 
} from 'react'; // ^18.2.0

import authService from './auth.service';
import { 
  User, 
  UserRole, 
  UserPermission, 
  LoginRequest, 
  MfaRequest, 
  AuthState 
} from '../../types/user.types';

/**
 * Type definition for authentication context value
 */
interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (loginRequest: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  handleRedirectCallback: () => Promise<void>;
  hasPermission: (permission: UserPermission, resourceId?: string) => boolean;
  hasRole: (role: UserRole) => boolean;
  handleMfaChallenge: (mfaRequest: MfaRequest) => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

/**
 * Props for the AuthProvider component
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

// Create the authentication context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Authentication Provider Component
 * 
 * Wraps the application and provides authentication state and functionality
 * to all child components through React Context.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // State for authentication data
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Reference for token refresh interval
  const tokenRefreshIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  /**
   * Initialize the authentication state on component mount
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if there's a token in storage
        const storedToken = authService.getToken();
        
        if (storedToken) {
          // Check if token is expired
          const tokenExpired = authService.checkTokenExpiration();
          
          if (tokenExpired) {
            // Try to refresh the token
            const newToken = await authService.renewToken();
            if (newToken) {
              // If successful, get user info and set authenticated state
              const userInfo = authService.getUserInfo();
              setToken(newToken);
              setUser(userInfo);
              setIsAuthenticated(true);
            } else {
              // If refresh fails, clear authentication state
              setToken(null);
              setUser(null);
              setIsAuthenticated(false);
            }
          } else {
            // If token is valid, get user info and set authenticated state
            const userInfo = authService.getUserInfo();
            setToken(storedToken);
            setUser(userInfo);
            setIsAuthenticated(true);
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError(err instanceof Error ? err.message : 'Authentication initialization error');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Clean up function for the effect
    return () => {
      // Clear token refresh interval if it exists
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current);
        tokenRefreshIntervalRef.current = null;
      }
    };
  }, []);

  /**
   * Set up token refresh interval when token changes
   */
  useEffect(() => {
    // Clear existing interval
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
      tokenRefreshIntervalRef.current = null;
    }

    // If authenticated, set up token refresh interval
    if (token && isAuthenticated) {
      // Check token every minute (60000ms) for expiration
      tokenRefreshIntervalRef.current = setInterval(async () => {
        if (authService.checkTokenExpiration()) {
          try {
            const newToken = await authService.renewToken();
            if (newToken) {
              setToken(newToken);
            } else {
              // If token refresh fails, log the user out
              await logout();
            }
          } catch (err) {
            console.error('Error refreshing token:', err);
            // Handle error but don't log out immediately to prevent
            // disruption from temporary network issues
          }
        }
      }, 60000);
    }

    // Clean up on unmount or token change
    return () => {
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current);
        tokenRefreshIntervalRef.current = null;
      }
    };
  }, [token]);

  /**
   * Handle user login
   */
  const login = useCallback(async (loginRequest: LoginRequest): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // Call authentication service to start login process
      await authService.login(loginRequest);
      
      // Note: The actual state update happens in handleRedirectCallback 
      // after the Auth0 redirect, so this function doesn't set state directly
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Handle user logout
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Clean up token refresh interval
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current);
        tokenRefreshIntervalRef.current = null;
      }
      
      // Clear authentication state
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      
      // Call authentication service to complete logout
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
      setError(err instanceof Error ? err.message : 'Logout failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Process redirect callback after authentication
   */
  const handleRedirectCallback = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // Process the callback from Auth0
      const authResult = await authService.handleRedirectCallback();
      
      // Update authentication state with user data and token
      setUser(authResult.user);
      setToken(authResult.token);
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Error handling redirect callback:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh the authentication token
   */
  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      setLoading(true);
      
      // Call auth service to renew token
      const newToken = await authService.renewToken();
      
      if (newToken) {
        setToken(newToken);
        setIsAuthenticated(true);
        return newToken;
      } else {
        // If refresh fails, clear authentication state
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        return null;
      }
    } catch (err) {
      console.error('Token refresh error:', err);
      setError(err instanceof Error ? err.message : 'Token refresh failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback((permission: UserPermission, resourceId?: string): boolean => {
    return authService.hasPermission(permission, resourceId);
  }, []);

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback((role: UserRole): boolean => {
    return authService.hasRole(role);
  }, []);

  /**
   * Handle multi-factor authentication challenge
   */
  const handleMfaChallenge = useCallback(async (mfaRequest: MfaRequest): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // Process MFA verification through auth service
      const result = await authService.handleMfaChallenge(mfaRequest);
      
      // Update auth state with the new token and user information
      setUser(result.user);
      setToken(result.token);
      setIsAuthenticated(true);
    } catch (err) {
      console.error('MFA verification error:', err);
      setError(err instanceof Error ? err.message : 'MFA verification failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Construct context value with all auth state and functions
  const contextValue: AuthContextValue = {
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
  };

  // Provide the auth context to children components
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use the authentication context
 * 
 * @returns The current authentication context value
 * @throws Error if used outside of AuthProvider
 */
export const useAuthContext = (): AuthContextValue => {
  const context = useContext(AuthContext);
  
  // Ensure the hook is used within an AuthProvider
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  
  return context;
};