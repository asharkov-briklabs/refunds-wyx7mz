/**
 * Authentication Module Entry Point
 * 
 * This file exports authentication-related components and services for use throughout
 * the Refunds Service web application. It centralizes authentication exports to provide
 * a consistent interface for both Pike (merchant) and Barracuda (admin) interfaces.
 * 
 * @version 1.0.0
 */

// Import authentication service
import authService from './auth.service';

// Import authentication context provider and hook
import { AuthProvider, useAuthContext } from './auth.context';

// Re-export authentication service as default
export default authService;

// Re-export authentication context provider and hook
export { AuthProvider, useAuthContext };