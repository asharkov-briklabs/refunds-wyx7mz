import React from 'react'; // ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // ^14.0.0
import { jest } from '@jest/globals'; // ^29.5.0
import UnauthorizedPage from './UnauthorizedPage';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';
import { COMMON_ROUTES, PIKE_ROUTES, BARRACUDA_ROUTES } from '../../../constants/routes.constants';

// Mock the useAuth hook
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: jest.fn(),
    logout: jest.fn(),
    handleRedirectCallback: jest.fn(),
    hasPermission: jest.fn(),
    hasRole: jest.fn(),
    isAdmin: jest.fn(),
    isMerchantAdmin: jest.fn(),
    handleMfaChallenge: jest.fn(),
    refreshToken: jest.fn(),
  }),
}));

// Mock window.history for navigation tests
const mockHistoryBack = jest.fn();
Object.defineProperty(window, 'history', {
  value: {
    back: mockHistoryBack,
  },
});

/**
 * Main test suite for the UnauthorizedPage component
 */
describe('UnauthorizedPage Component', () => {
  /**
   * Test that verifies the unauthorized page renders all expected elements
   */
  it('renders unauthorized page with correct elements', async () => {
    // Render the UnauthorizedPage component with renderWithProviders
    renderWithProviders(<UnauthorizedPage />);

    // Check that '403' status code is displayed
    expect(screen.getByText('403')).toBeInTheDocument();

    // Check that error image is present
    const errorImage = screen.getByAltText('Access Denied Illustration');
    expect(errorImage).toBeInTheDocument();

    // Check that appropriate error message is displayed
    expect(screen.getByText("You don't have permission to access this resource.")).toBeInTheDocument();

    // Verify that page has correct accessibility attributes
    expect(screen.getByRole('heading', { name: 'Error code 403' })).toHaveAttribute('aria-label', 'Error code 403');
  });

  /**
   * Test that verifies login button is displayed for unauthenticated users
   */
  it('shows login button for unauthenticated users', async () => {
    // Mock useAuth to return isAuthenticated: false
    jest.spyOn(require('../../../hooks/useAuth'), 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      handleRedirectCallback: jest.fn(),
      hasPermission: jest.fn(),
      hasRole: jest.fn(),
      isAdmin: jest.fn(),
      isMerchantAdmin: jest.fn(),
      handleMfaChallenge: jest.fn(),
      refreshToken: jest.fn(),
    });

    // Render the UnauthorizedPage component
    renderWithProviders(<UnauthorizedPage />);

    // Check that 'Log In' button is displayed
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();

    // Check that 'Return to Dashboard' button is not displayed
    expect(screen.queryByRole('button', { name: 'Return to Dashboard' })).not.toBeInTheDocument();
  });

  /**
   * Test that verifies dashboard button is displayed for authenticated users
   */
  it('shows dashboard button for authenticated users', async () => {
    // Mock useAuth to return isAuthenticated: true
    jest.spyOn(require('../../../hooks/useAuth'), 'useAuth').mockReturnValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: [],
        permissions: [],
        merchantId: null,
        organizationId: null,
        bankId: null,
        programId: null,
        mfaEnabled: false,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      handleRedirectCallback: jest.fn(),
      hasPermission: jest.fn(),
      hasRole: jest.fn(),
      isAdmin: jest.fn(),
      isMerchantAdmin: jest.fn(),
      handleMfaChallenge: jest.fn(),
      refreshToken: jest.fn(),
    });

    // Render the UnauthorizedPage component
    renderWithProviders(<UnauthorizedPage />);

    // Check that 'Return to Dashboard' button is displayed
    expect(screen.getByRole('button', { name: 'Return to Dashboard' })).toBeInTheDocument();

    // Check that 'Log In' button is not displayed
    expect(screen.queryByRole('button', { name: 'Sign In' })).not.toBeInTheDocument();
  });

  /**
   * Test that verifies navigation to merchant dashboard for merchant admin users
   */
  it('navigates to merchant dashboard when user is merchant admin', async () => {
    // Mock useAuth to return isAuthenticated: true and isMerchantAdmin: true
    jest.spyOn(require('../../../hooks/useAuth'), 'useAuth').mockReturnValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: [],
        permissions: [],
        merchantId: 'test-merchant-id',
        organizationId: null,
        bankId: null,
        programId: null,
        mfaEnabled: false,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      handleRedirectCallback: jest.fn(),
      hasPermission: jest.fn(),
      hasRole: jest.fn(),
      isAdmin: jest.fn(),
      isMerchantAdmin: jest.fn(() => true),
      handleMfaChallenge: jest.fn(),
      refreshToken: jest.fn(),
    });

    // Render the UnauthorizedPage component
    const { container } = renderWithProviders(<UnauthorizedPage />);

    // Click on 'Return to Dashboard' button
    const user = setupUserEvent();
    await user.click(screen.getByRole('button', { name: 'Return to Dashboard' }));

    // Verify navigation to PIKE_ROUTES.DASHBOARD
    await waitFor(() => {
      expect(container.firstChild).toHaveTextContent('Dashboard');
    });
  });

  /**
   * Test that verifies navigation to admin dashboard for admin users
   */
  it('navigates to admin dashboard when user is admin', async () => {
    // Mock useAuth to return isAuthenticated: true and isAdmin: true
    jest.spyOn(require('../../../hooks/useAuth'), 'useAuth').mockReturnValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: [],
        permissions: [],
        merchantId: null,
        organizationId: null,
        bankId: null,
        programId: null,
        mfaEnabled: false,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      handleRedirectCallback: jest.fn(),
      hasPermission: jest.fn(),
      hasRole: jest.fn(),
      isAdmin: jest.fn(() => true),
      isMerchantAdmin: jest.fn(),
      handleMfaChallenge: jest.fn(),
      refreshToken: jest.fn(),
    });

    // Render the UnauthorizedPage component
    const { container } = renderWithProviders(<UnauthorizedPage />);

    // Click on 'Return to Dashboard' button
    const user = setupUserEvent();
    await user.click(screen.getByRole('button', { name: 'Return to Dashboard' }));

    // Verify navigation to BARRACUDA_ROUTES.DASHBOARD
    await waitFor(() => {
      expect(container.firstChild).toHaveTextContent('Dashboard');
    });
  });

  /**
   * Test that verifies navigation to login page when unauthenticated user clicks login button
   */
  it('navigates to login page when unauthenticated user clicks login', async () => {
    // Mock useAuth to return isAuthenticated: false
    jest.spyOn(require('../../../hooks/useAuth'), 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      handleRedirectCallback: jest.fn(),
      hasPermission: jest.fn(),
      hasRole: jest.fn(),
      isAdmin: jest.fn(),
      isMerchantAdmin: jest.fn(),
      handleMfaChallenge: jest.fn(),
      refreshToken: jest.fn(),
    });

    // Render the UnauthorizedPage component
    const { container } = renderWithProviders(<UnauthorizedPage />);

    // Click on 'Log In' button
    const user = setupUserEvent();
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    // Verify navigation to COMMON_ROUTES.LOGIN
    await waitFor(() => {
      expect(container.firstChild).toHaveTextContent('Login');
    });
  });

  /**
   * Test that verifies back navigation when user clicks go back button
   */
  it('navigates back when user clicks go back button', async () => {
    // Mock window.history.back function
    const mockHistoryBack = jest.fn();
    Object.defineProperty(window, 'history', {
      value: {
        back: mockHistoryBack,
      },
    });

    // Render the UnauthorizedPage component
    renderWithProviders(<UnauthorizedPage />);

    // Click on 'Go Back' button
    const user = setupUserEvent();
    await user.click(screen.getByRole('button', { name: 'Go Back' }));

    // Verify window.history.back was called
    expect(mockHistoryBack).toHaveBeenCalled();
  });
});