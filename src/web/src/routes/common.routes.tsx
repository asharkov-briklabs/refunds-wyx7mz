import React from 'react'; // react ^18.2.0
import { Route, Navigate } from 'react-router-dom'; // react-router-dom ^6.10.0
import LoginPage from '../pages/common/LoginPage';
import ErrorPage from '../pages/common/ErrorPage';
import NotFoundPage from '../pages/common/NotFoundPage';
import UnauthorizedPage from '../pages/common/UnauthorizedPage';
import PrivateRoute from './protected.routes';
import { BASE_ROUTES, COMMON_ROUTES } from '../constants/routes.constants';

/**
 * Array of common route elements for the application
 *
 * @remarks
 * This array defines the routes that are accessible to both Pike (merchant) and Barracuda (admin) interfaces.
 * It includes routes for login, error, not found, and unauthorized pages.
 */
export const commonRoutes: JSX.Element[] = [
  /**
   * Route for the login page
   *
   * @remarks
   * This route is used for user authentication.
   * It is associated with the LoginPage component.
   * The path is constructed using the AUTH and LOGIN constants from the routes configuration.
   */
  <Route path={BASE_ROUTES.AUTH + COMMON_ROUTES.LOGIN} element={<LoginPage />} />,
  /**
   * Route for the generic error page
   *
   * @remarks
   * This route is used to display system errors.
   * It is associated with the ErrorPage component.
   * The path is defined by the ERROR constant from the routes configuration.
   */
  <Route path={COMMON_ROUTES.ERROR} element={<ErrorPage />} />,
  /**
   * Route for 404 not found page
   *
   * @remarks
   * This route is used to display a 404 error when a requested resource is not found.
   * It is associated with the NotFoundPage component.
   * The path is defined by the NOT_FOUND constant from the routes configuration.
   */
  <Route path={COMMON_ROUTES.NOT_FOUND} element={<NotFoundPage />} />,
  /**
   * Route for 403 unauthorized page
   *
   * @remarks
   * This route is used to display an unauthorized access message when a user lacks the necessary permissions.
   * It is associated with the UnauthorizedPage component.
   * The path is defined by the UNAUTHORIZED constant from the routes configuration.
   */
  <Route path={COMMON_ROUTES.UNAUTHORIZED} element={<UnauthorizedPage />} />,
  /**
   * Catch-all route that redirects to the not found page
   *
   * @remarks
   * This route is used to handle any unmatched routes and redirect the user to the 404 not found page.
   * It uses the Navigate component to perform the redirection.
   * The path is set to "*" to match any route, and the to prop is set to the NOT_FOUND constant from the routes configuration.
   */
  <Route path="*" element={<Navigate to={COMMON_ROUTES.NOT_FOUND} replace />} />,
];