import React from 'react'; // react ^18.2.0
import { act } from 'react-dom/test-utils'; // react-dom/test-utils ^18.2.0
import { screen } from '@testing-library/react'; // @testing-library/react ^13.0.0
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';
import MainLayout from './MainLayout';
import { BASE_ROUTES } from '../../../constants/routes.constants';

// Test suite for the MainLayout component
describe('MainLayout component', () => {
  // Test case: renders without crashing
  it('renders without crashing', () => {
    // LD1: Render MainLayout with test content using renderWithProviders
    const { container } = renderWithProviders(<MainLayout><div>Test Content</div></MainLayout>);

    // LD2: Verify the content is visible in the document
    expect(container).toBeInTheDocument();
  });

  // Test case: renders children content
  it('renders children content', () => {
    // LD1: Render MainLayout with specific test content
    renderWithProviders(<MainLayout><div data-testid="test-child">Test Content</div></MainLayout>);

    // LD2: Verify the test content is present in the rendered output
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
  });

  // Test case: renders Header and Footer when authenticated
  it('renders Header and Footer when authenticated', () => {
    // LD1: Mock authenticated user state in the auth context
    const preloadedState = {
      auth: {
        isAuthenticated: true,
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          roles: ['MERCHANT_ADMIN'],
          permissions: ['CREATE_REFUND', 'VIEW_REFUND'],
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
        loading: false,
        error: null,
      },
    };

    // LD2: Render MainLayout
    renderWithProviders(<MainLayout><div>Test Content</div></MainLayout>, { preloadedState });

    // LD3: Verify Header component is present
    expect(screen.getByRole('banner')).toBeInTheDocument();

    // LD4: Verify Footer component is present
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  // Test case: doesn't render Header and Footer when not authenticated
  it("doesn't render Header and Footer when not authenticated", () => {
    // LD1: Mock unauthenticated user state
    const preloadedState = {
      auth: {
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
      },
    };

    // LD2: Render MainLayout
    renderWithProviders(<MainLayout><div>Test Content</div></MainLayout>, { preloadedState });

    // LD3: Verify Header component is not present
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();

    // LD4: Verify Footer component is not present
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  // Test case: renders Sidebar when authenticated
  it('renders Sidebar when authenticated', () => {
    // LD1: Mock authenticated user state
    const preloadedState = {
      auth: {
        isAuthenticated: true,
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          roles: ['MERCHANT_ADMIN'],
          permissions: ['CREATE_REFUND', 'VIEW_REFUND'],
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
        loading: false,
        error: null,
      },
    };

    // LD2: Render MainLayout
    renderWithProviders(<MainLayout><div>Test Content</div></MainLayout>, { preloadedState });

    // LD3: Verify Sidebar component is present
    expect(screen.getByRole('navigation', { name: 'Merchant Navigation' })).toBeInTheDocument();
  });

  // Test case: applies Pike styles when on Pike routes
  it('applies Pike styles when on Pike routes', () => {
    // LD1: Mock authenticated user state
    const preloadedState = {
      auth: {
        isAuthenticated: true,
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          roles: ['MERCHANT_ADMIN'],
          permissions: ['CREATE_REFUND', 'VIEW_REFUND'],
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
        loading: false,
        error: null,
      },
    };

    // LD2: Set route to a Pike route
    const route = BASE_ROUTES.PIKE + '/dashboard';

    // LD3: Render MainLayout
    const { container } = renderWithProviders(<MainLayout><div>Test Content</div></MainLayout>, { preloadedState, route });

    // LD4: Verify Pike-specific CSS classes are applied
    expect(container.querySelector('.bg-gray-50')).toBeInTheDocument();
  });

  // Test case: applies Barracuda styles when on Barracuda routes
  it('applies Barracuda styles when on Barracuda routes', () => {
    // LD1: Mock authenticated user state
    const preloadedState = {
      auth: {
        isAuthenticated: true,
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          roles: ['BARRACUDA_ADMIN'],
          permissions: ['CREATE_REFUND', 'VIEW_REFUND'],
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
        loading: false,
        error: null,
      },
    };

    // LD2: Set route to a Barracuda route
    const route = BASE_ROUTES.BARRACUDA + '/dashboard';

    // LD3: Render MainLayout
    const { container } = renderWithProviders(<MainLayout><div>Test Content</div></MainLayout>, { preloadedState, route });

    // LD4: Verify Barracuda-specific CSS classes are applied
    expect(container.querySelector('.bg-gray-50')).toBeInTheDocument();
  });

  // Test case: toggles sidebar on button click
  it('toggles sidebar on button click', async () => {
    // LD1: Mock authenticated user state
    const preloadedState = {
      auth: {
        isAuthenticated: true,
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          roles: ['MERCHANT_ADMIN'],
          permissions: ['CREATE_REFUND', 'VIEW_REFUND'],
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
        loading: false,
        error: null,
      },
    };

    // LD2: Render MainLayout
    renderWithProviders(<MainLayout><div>Test Content</div></MainLayout>, { preloadedState });

    // LD3: Find and click the sidebar toggle button
    const toggleButton = screen.getByRole('button', { name: 'Collapse sidebar' });
    const user = setupUserEvent();
    await act(() => user.click(toggleButton));

    // LD4: Verify sidebar collapsed state changes
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
  });

  // Test case: handles responsive layout for mobile
  it('handles responsive layout for mobile', () => {
    // LD1: Mock useResponsive hook to return isMobile = true
    jest.mock('../../../hooks/useResponsive', () => ({
      __esModule: true,
      default: () => ({
        width: 400,
        height: 800,
        up: jest.fn(),
        down: jest.fn(),
        between: jest.fn(),
        only: jest.fn(),
        currentBreakpoint: 'mobile',
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      }),
    }));

    // LD2: Render MainLayout
    renderWithProviders(<MainLayout><div>Test Content</div></MainLayout>);

    // LD3: Verify sidebar starts in collapsed state on mobile
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
  });

  // Test case: handles responsive layout for tablet
  it('handles responsive layout for tablet', () => {
    // LD1: Mock useResponsive hook to return isTablet = true
    jest.mock('../../../hooks/useResponsive', () => ({
      __esModule: true,
      default: () => ({
        width: 800,
        height: 1200,
        up: jest.fn(),
        down: jest.fn(),
        between: jest.fn(),
        only: jest.fn(),
        currentBreakpoint: 'tablet',
        isMobile: false,
        isTablet: true,
        isDesktop: false,
      }),
    }));

    // LD2: Render MainLayout
    renderWithProviders(<MainLayout><div>Test Content</div></MainLayout>);

    // LD3: Verify appropriate layout adjustments for tablet view
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
  });
});