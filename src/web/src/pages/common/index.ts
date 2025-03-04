// Import the ErrorPage component and its types for error states
import ErrorPage, { ErrorPageProps, ErrorCategory } from './ErrorPage';
// Import the LoginPage component for authentication
import LoginPage from './LoginPage';
// Import the NotFoundPage component for 404 pages
import NotFoundPage from './NotFoundPage';
// Import the UnauthorizedPage component for permission denied pages
import UnauthorizedPage from './UnauthorizedPage';

/**
 * @file Exports the common page components used across both Pike (merchant) and Barracuda (admin) interfaces,
 * including error pages, authentication pages, and other shared UI components.
 */

/**
 * @description Exports the ErrorPage component for displaying system errors
 * @exports ErrorPage
 * @type {React.FC<ErrorPageProps>}
 */
export { ErrorPage };

/**
 * @description Exports the ErrorPageProps interface for the ErrorPage component
 * @exports ErrorPageProps
 * @type {interface}
 */
export type { ErrorPageProps };

/**
 * @description Exports the ErrorCategory enum for categorizing types of errors
 * @exports ErrorCategory
 * @type {enum}
 */
export { ErrorCategory };

/**
 * @description Exports the LoginPage component for user authentication
 * @exports LoginPage
 * @type {React.FC}
 */
export { LoginPage };

/**
 * @description Exports the NotFoundPage component for 404 Not Found pages
 * @exports NotFoundPage
 * @type {React.FC}
 */
export { NotFoundPage };

/**
 * @description Exports the UnauthorizedPage component for 403 Unauthorized pages
 * @exports UnauthorizedPage
 * @type {React.FC}
 */
export { UnauthorizedPage };