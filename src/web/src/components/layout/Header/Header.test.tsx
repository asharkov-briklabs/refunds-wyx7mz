import React from 'react'; // react ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import UserEvent from '@testing-library/user-event'; // @testing-library/user-event ^14.4.3
import Header from './Header';
import { renderWithProviders, setupUserEvent, createMockUser } from '../../../utils/test.utils';
import { BASE_ROUTES, PIKE_ROUTES, BARRACUDA_ROUTES } from '../../../constants/routes.constants';
import NotificationCenter from '../NotificationCenter/NotificationCenter';

// Mock the useAuth hook
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

// Mock the NotificationCenter component
jest.mock('../NotificationCenter/NotificationCenter', () => {
  return {
    __esModule: true,
    default: () => <div data-testid="mock-notification-center">Mock NotificationCenter</div>,
  };
});

describe('Header component', () => {
  // LD1: Main test suite for the Header component
  // LD1: Setup mock for useAuth hook with jest.mock
  // LD1: Setup mock for NotificationCenter component
  // LD1: Run tests for unauthenticated state
  // LD1: Run tests for authenticated state with merchant user
  // LD1: Run tests for authenticated state with admin user
  // LD1: Test user menu interactions
  // LD1: Test logout functionality
  // LD1: Test responsive behavior

  test('renders correctly when user is not authenticated', () => {
    // LD1: Tests that the Header displays correctly for unauthenticated users
    // LD1: Mock useAuth to return isAuthenticated: false
    (require('../../../hooks/useAuth') as any).useAuth.mockReturnValue({
      isAuthenticated: false,
    });

    // LD1: Render Header with renderWithProviders
    renderWithProviders(<Header />);

    // LD1: Verify logo is present
    const logo = screen.getByRole('img', { name: /Brik Logo/i });
    expect(logo).toBeInTheDocument();

    // LD1: Verify navigation links are not present
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();

    // LD1: Verify login button is present
    expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();

    // LD1: Verify user profile is not present
    expect(screen.queryByRole('button', { name: /Open user menu/i })).not.toBeInTheDocument();

    // LD1: Verify NotificationCenter is not present
    expect(screen.queryByTestId('mock-notification-center')).not.toBeInTheDocument();
  });

  test('renders Pike navigation when authenticated as merchant user', () => {
    // LD1: Tests that the Header displays Pike navigation for merchant users
    // LD1: Mock useAuth to return isAuthenticated: true and isMerchantAdmin: true
    (require('../../../hooks/useAuth') as any).useAuth.mockReturnValue({
      isAuthenticated: true,
      isMerchantAdmin: () => true,
      isAdmin: () => false,
      user: createMockUser(),
    });

    // LD1: Render Header with renderWithProviders and Pike route
    renderWithProviders(<Header />, { route: BASE_ROUTES.PIKE + PIKE_ROUTES.DASHBOARD });

    // LD1: Verify logo links to Pike dashboard
    const logo = screen.getByRole('link', { name: /Brik Logo/i });
    expect(logo).toHaveAttribute('href', BASE_ROUTES.PIKE + PIKE_ROUTES.DASHBOARD);

    // LD1: Verify Pike navigation links are present
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Refunds/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Transactions/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Bank Accounts/i })).toBeInTheDocument();

    // LD1: Verify user profile is present
    expect(screen.getByRole('button', { name: /Open user menu/i })).toBeInTheDocument();

    // LD1: Verify NotificationCenter is present
    expect(screen.getByTestId('mock-notification-center')).toBeInTheDocument();
  });

  test('renders Barracuda navigation when authenticated as admin user', () => {
    // LD1: Tests that the Header displays Barracuda navigation for admin users
    // LD1: Mock useAuth to return isAuthenticated: true and isAdmin: true
    (require('../../../hooks/useAuth') as any).useAuth.mockReturnValue({
      isAuthenticated: true,
      isAdmin: () => true,
      isMerchantAdmin: () => false,
      user: createMockUser(),
    });

    // LD1: Render Header with renderWithProviders and Barracuda route
    renderWithProviders(<Header />, { route: BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.DASHBOARD });

    // LD1: Verify logo links to Barracuda dashboard
    const logo = screen.getByRole('link', { name: /Brik Logo/i });
    expect(logo).toHaveAttribute('href', BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.DASHBOARD);

    // LD1: Verify Barracuda navigation links are present
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Merchants/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Refunds/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Configuration/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Analytics/i })).toBeInTheDocument();

    // LD1: Verify user profile is present
    expect(screen.getByRole('button', { name: /Open user menu/i })).toBeInTheDocument();

    // LD1: Verify NotificationCenter is present
    expect(screen.getByTestId('mock-notification-center')).toBeInTheDocument();
  });

  test('toggles user menu when profile is clicked', async () => {
    // LD1: Tests that the user menu opens and closes when clicked
    // LD1: Mock useAuth to return isAuthenticated: true with mock user
    (require('../../../hooks/useAuth') as any).useAuth.mockReturnValue({
      isAuthenticated: true,
      isAdmin: () => false,
      isMerchantAdmin: () => true,
      user: createMockUser(),
    });

    // LD1: Render Header with renderWithProviders
    const { container } = renderWithProviders(<Header />);

    // LD1: Setup userEvent for interactions
    const user = setupUserEvent();

    // LD1: Click on user profile
    const profileButton = screen.getByRole('button', { name: /Open user menu/i });
    await user.click(profileButton);

    // LD1: Verify user menu is visible
    await waitFor(() => {
      expect(screen.getByRole('menu', { orientation: 'vertical' })).toBeVisible();
    });

    // LD1: Verify logout option is present
    expect(screen.getByRole('menuitem', { name: /Sign out/i })).toBeInTheDocument();

    // LD1: Click outside menu
    await user.click(container.querySelector('header') as Element);

    // LD1: Verify user menu is closed
    await waitFor(() => {
      expect(screen.queryByRole('menu', { orientation: 'vertical' })).not.toBeInTheDocument();
    });
  });

  test('calls logout when logout button is clicked', async () => {
    // LD1: Tests that clicking logout calls the logout function
    // LD1: Create mock logout function
    const mockLogout = jest.fn();

    // LD1: Mock useAuth to return isAuthenticated: true with mock logout function
    (require('../../../hooks/useAuth') as any).useAuth.mockReturnValue({
      isAuthenticated: true,
      isAdmin: () => false,
      isMerchantAdmin: () => true,
      user: createMockUser(),
      logout: mockLogout,
    });

    // LD1: Render Header with renderWithProviders
    const { container } = renderWithProviders(<Header />);

    // LD1: Setup userEvent for interactions
    const user = setupUserEvent();

    // LD1: Open user menu by clicking profile
    const profileButton = screen.getByRole('button', { name: /Open user menu/i });
    await user.click(profileButton);

    // LD1: Click on logout button
    const logoutButton = screen.getByRole('menuitem', { name: /Sign out/i });
    await user.click(logoutButton);

    // LD1: Verify logout function was called
    expect(mockLogout).toHaveBeenCalled();

    // LD1: Verify user menu is closed after logout
    await waitFor(() => {
      expect(screen.queryByRole('menu', { orientation: 'vertical' })).not.toBeInTheDocument();
    });
  });

  test('renders mobile menu on small screens', async () => {
    // LD1: Tests that the Header adapts to mobile viewports
    // LD1: Mock window.matchMedia to simulate small screen
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(min-width: 768px)' ? false : true,
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    // LD1: Mock useAuth to return isAuthenticated: true
    (require('../../../hooks/useAuth') as any).useAuth.mockReturnValue({
      isAuthenticated: true,
      isAdmin: () => false,
      isMerchantAdmin: () => true,
      user: createMockUser(),
    });

    // LD1: Render Header with renderWithProviders
    const { container } = renderWithProviders(<Header />);

    // LD1: Verify hamburger menu icon is present
    const hamburgerButton = screen.getByRole('button', { name: /Open navigation menu/i });
    expect(hamburgerButton).toBeInTheDocument();

    // LD1: Verify navigation is collapsed
    const navElement = screen.getByRole('navigation');
    expect(navElement).toHaveClass('hidden');

    // LD1: Click hamburger menu
    const user = setupUserEvent();
    await user.click(hamburgerButton);

    // LD1: Verify mobile navigation is expanded
    await waitFor(() => {
      expect(navElement).not.toHaveClass('hidden');
    });

    // LD1: Verify navigation links are present in mobile menu
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Refunds/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Transactions/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Bank Accounts/i })).toBeInTheDocument();
  });
});