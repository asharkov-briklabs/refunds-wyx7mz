/**
 * Protected Route Component
 *
 * This higher-order component implements protected routes that require authentication
 * and optionally checks for specific user roles before allowing access. It redirects
 * unauthenticated users to the login page and unauthorized users to an error page.
 *
 * Used by both Pike (merchant) and Barracuda (admin) interfaces to ensure consistent
 * authentication and authorization enforcement across the application.
 */

import React from 'react'; // ^18.2.0
import { Navigate, useLocation } from 'react-router-dom'; // ^6.10.0

import { useAuthContext } from '../services/auth/auth.context';
import { UserRole } from '../types/user.types';

/**
 * Props for the PrivateRoute component
 */
interface PrivateRouteProps {
  /**
   * The child component(s) to render if authentication and authorization pass
   */
  children: React.ReactNode;
  
  /**
   * Optional role requirement for role-based access control
   */
  requiredRole?: UserRole;
}

/**
 * A higher-order component that protects routes requiring authentication
 * and optionally verifies user roles before allowing access.
 *
 * @param PrivateRouteProps - Component props containing children and optional role requirements
 * @returns The child components if authenticated and authorized, otherwise redirects appropriately
 */
const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requiredRole }) => {
  // Get authentication state and role checking function from auth context
  const { isAuthenticated, hasRole } = useAuthContext();
  
  // Get current location to enable return to the same page after login
  const location = useLocation();
  
  // If user is not authenticated, redirect to login page with return URL
  if (!isAuthenticated) {
    // Create a URL-encoded string with the current location's pathname and search params
    const returnUrl = encodeURIComponent(`${location.pathname}${location.search}`);
    
    // Redirect to login with return URL as query parameter
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />;
  }
  
  // If a specific role is required, check if user has that role
  if (requiredRole) {
    // Check if user has the required role using the hasRole function from auth context
    const authorized = hasRole(requiredRole);
    
    // If user doesn't have the required role, redirect to unauthorized page
    if (!authorized) {
      return <Navigate to="/unauthorized" replace />;
    }
  }
  
  // If authentication and authorization pass, render the protected route
  return <>{children}</>;
};

export default PrivateRoute;