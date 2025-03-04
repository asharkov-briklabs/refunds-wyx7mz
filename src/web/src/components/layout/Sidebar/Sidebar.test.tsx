import React from 'react'; // react ^18.2.0
import { screen, fireEvent, within } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { vi, describe, it, expect, beforeEach } from 'vitest'; // vitest ^0.29.2

import Sidebar from './Sidebar'; // Import the Sidebar component being tested
import { renderWithProviders, createMockUser, setupUserEvent } from '../../../utils/test.utils'; // Testing utility for rendering components with necessary providers
import { UserRole } from '../../../types/user.types'; // User role constants for testing role-based navigation
import { PIKE_ROUTES, BARRACUDA_ROUTES } from '../../../constants/routes.constants'; // Route constants for Pike and Barracuda interface navigation

// Mock the useResponsive hook to simulate different viewport sizes
const mockUseResponsive = (overrides = {}) => {
  const defaultValues = {
    width: 1200,
    height: 800,
    up: vi.fn(),
    down: vi.fn(),
    between: vi.fn(),
    only: vi.fn(),
    currentBreakpoint: 'desktop',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  };
  return { ...defaultValues, ...overrides };
};

// Mock the useAuth hook to provide authentication state for testing
const mockUseAuth = (overrides = {}) => {
  const defaultAuth = {
    user: createMockUser({ roles: [UserRole.MERCHANT_ADMIN] }),
    token: 'test-token',
    isAuthenticated: true,
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    handleRedirectCallback: vi.fn(),
    hasPermission: vi.fn(),
    hasRole: (role) => defaultAuth.user.roles.includes(role),
    isAdmin: vi.fn(),
    isMerchantAdmin: vi.fn(),
    handleMfaChallenge: vi.fn(),
    refreshToken: vi.fn(),
  };
  return { ...defaultAuth, ...overrides };
};

describe('Sidebar component', () => {
  it('renders Pike interface navigation correctly', () => {
    // Mock useAuth to return a user with MERCHANT_ADMIN role
    vi.mock('../../../hooks/useAuth', () => ({
      useAuth: () => mockUseAuth(),
    }));

    // Mock useResponsive for desktop view
    vi.mock('../../../hooks/useResponsive', () => ({
      default: () => mockUseResponsive(),
    }));

    // Render the Sidebar with 'pike' interface type
    renderWithProviders(<Sidebar interfaceType="pike" isCollapsed={false} toggleCollapsed={() => {}} />);

    // Verify all Pike navigation items are correctly rendered
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Refunds')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Bank Accounts')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();

    // Verify that Barracuda-specific navigation items are not present
    expect(screen.queryByText('Merchants')).not.toBeInTheDocument();
    expect(screen.queryByText('Configuration')).not.toBeInTheDocument();
  });

  it('renders Barracuda interface navigation correctly', () => {
    // Mock useAuth to return a user with BARRACUDA_ADMIN role
    vi.mock('../../../hooks/useAuth', () => ({
      useAuth: () => mockUseAuth({ user: createMockUser({ roles: [UserRole.BARRACUDA_ADMIN] }) }),
    }));

    // Mock useResponsive for desktop view
    vi.mock('../../../hooks/useResponsive', () => ({
      default: () => mockUseResponsive(),
    }));

    // Render the Sidebar with 'barracuda' interface type
    renderWithProviders(<Sidebar interfaceType="barracuda" isCollapsed={false} toggleCollapsed={() => {}} />);

    // Verify all Barracuda navigation items are correctly rendered
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Refunds')).toBeInTheDocument();
    expect(screen.getByText('Merchants')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByText('Parameters')).toBeInTheDocument();
    expect(screen.getByText('Rules')).toBeInTheDocument();
    expect(screen.getByText('Workflows')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Compliance')).toBeInTheDocument();

    // Verify that Pike-specific navigation items are not present
    expect(screen.queryByText('Bank Accounts')).not.toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('shows and hides navigation item text when collapsed state changes', () => {
    // Create toggle function mock with vi.fn()
    const toggleCollapsed = vi.fn();

    // Render Sidebar with isCollapsed=false initially
    renderWithProviders(<Sidebar interfaceType="pike" isCollapsed={false} toggleCollapsed={toggleCollapsed} />);

    // Verify navigation item texts are visible
    expect(screen.getByText('Dashboard')).toBeVisible();
    expect(screen.getByText('Refunds')).toBeVisible();

    // Re-render Sidebar with isCollapsed=true
    renderWithProviders(<Sidebar interfaceType="pike" isCollapsed={true} toggleCollapsed={toggleCollapsed} />);

    // Verify navigation item texts are not visible
    expect(screen.queryByText('Dashboard')).not.toBeVisible();
    expect(screen.queryByText('Refunds')).not.toBeVisible();

    // Verify only icons are displayed
    const icons = screen.getAllByRole('img');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('handles collapsed state automatically on mobile devices', () => {
    // Mock useResponsive to return isMobile=true
    vi.mock('../../../hooks/useResponsive', () => ({
      default: () => mockUseResponsive({ isMobile: true }),
    }));

    // Render Sidebar component
    renderWithProviders(<Sidebar interfaceType="pike" isCollapsed={false} toggleCollapsed={() => {}} />);

    // Verify Sidebar is automatically collapsed on mobile
    expect(screen.queryByText('Dashboard')).not.toBeVisible();
    expect(screen.queryByText('Refunds')).not.toBeVisible();

    // Verify only icons are visible in mobile view
    const icons = screen.getAllByRole('img');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('supports keyboard navigation', async () => {
    // Mock useAuth to return a user with MERCHANT_ADMIN role
    vi.mock('../../../hooks/useAuth', () => ({
      useAuth: () => mockUseAuth(),
    }));

    // Mock useResponsive for desktop view
    vi.mock('../../../hooks/useResponsive', () => ({
      default: () => mockUseResponsive(),
    }));

    // Render Sidebar component
    const { container } = renderWithProviders(<Sidebar interfaceType="pike" isCollapsed={false} toggleCollapsed={() => {}} />);

    // Simulate Tab key presses to navigate through menu items
    const user = setupUserEvent();
    await user.tab();

    // Verify focus moves correctly between navigation items
    const firstNavItem = container.querySelector('.nav-item');
    expect(firstNavItem).toHaveFocus();

    await user.tab();
    const secondNavItem = container.querySelectorAll('.nav-item')[1];
    expect(secondNavItem).toHaveFocus();

    // Simulate Enter key press on a focused item
    await user.keyboard('[Enter]');

    // Verify navigation behavior on keyboard interaction
    // (This part depends on your actual navigation implementation)
  });

  it('shows navigation items based on user roles', () => {
    const testCases = [
      {
        role: UserRole.MERCHANT_ADMIN,
        expectedItems: ['Dashboard', 'Refunds', 'Transactions', 'Bank Accounts', 'Settings'],
        interfaceType: 'pike',
      },
      {
        role: UserRole.BARRACUDA_ADMIN,
        expectedItems: ['Dashboard', 'Refunds', 'Merchants', 'Transactions', 'Configuration', 'Parameters', 'Rules', 'Workflows', 'Analytics', 'Reports', 'Compliance'],
        interfaceType: 'barracuda',
      },
      {
        role: UserRole.BANK_ADMIN,
        expectedItems: ['Dashboard', 'Refunds', 'Merchants', 'Transactions', 'Parameters', 'Workflows', 'Analytics', 'Reports'],
        interfaceType: 'barracuda',
      },
      {
        role: UserRole.ORGANIZATION_ADMIN,
        expectedItems: ['Dashboard', 'Refunds', 'Merchants', 'Transactions', 'Parameters', 'Analytics', 'Reports'],
        interfaceType: 'barracuda',
      },
    ];

    testCases.forEach(({ role, expectedItems, interfaceType }) => {
      // Mock useAuth to return a user with the specified role
      vi.mock('../../../hooks/useAuth', () => ({
        useAuth: () => mockUseAuth({ user: createMockUser({ roles: [role] }) }),
      }));

      // Mock useResponsive for desktop view
      vi.mock('../../../hooks/useResponsive', () => ({
        default: () => mockUseResponsive(),
      }));

      // Render Sidebar with the specified interface type
      renderWithProviders(<Sidebar interfaceType={interfaceType} isCollapsed={false} toggleCollapsed={() => {}} />);

      // Verify that only navigation items appropriate for the user's role are displayed
      expectedItems.forEach(item => {
        expect(screen.getByText(item)).toBeInTheDocument();
      });

      // Verify that restricted items are not accessible to unauthorized roles
      const allNavItems = interfaceType === 'pike' ? ['Dashboard', 'Refunds', 'Transactions', 'Bank Accounts', 'Settings'] : ['Dashboard', 'Refunds', 'Merchants', 'Transactions', 'Configuration', 'Parameters', 'Rules', 'Workflows', 'Analytics', 'Reports', 'Compliance'];
      allNavItems.filter(item => !expectedItems.includes(item)).forEach(item => {
        expect(screen.queryByText(item)).not.toBeInTheDocument();
      });
    });
  });

  it('calls toggleCollapsed when toggle button is clicked', async () => {
    // Create toggle function mock with vi.fn()
    const toggleCollapsed = vi.fn();

    // Mock useAuth to return a user with MERCHANT_ADMIN role
    vi.mock('../../../hooks/useAuth', () => ({
      useAuth: () => mockUseAuth(),
    }));

    // Mock useResponsive for desktop view
    vi.mock('../../../hooks/useResponsive', () => ({
      default: () => mockUseResponsive(),
    }));

    // Render Sidebar with the mock toggle function
    renderWithProviders(<Sidebar interfaceType="pike" isCollapsed={false} toggleCollapsed={toggleCollapsed} />);

    // Find and click the toggle button
    const toggleButton = screen.getByRole('button', { name: 'Collapse sidebar' });
    const user = setupUserEvent();
    await user.click(toggleButton);

    // Verify that the toggle function was called
    expect(toggleCollapsed).toHaveBeenCalledTimes(1);
  });

  it('highlights the active route correctly', () => {
    // Mock router with a specific current path
    const currentPath = '/pike/refunds';
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom')
      return {
        ...actual,
        useLocation: () => ({
          pathname: currentPath,
        }),
      }
    });

    // Mock useAuth to return a user with MERCHANT_ADMIN role
    vi.mock('../../../hooks/useAuth', () => ({
      useAuth: () => mockUseAuth(),
    }));

    // Mock useResponsive for desktop view
    vi.mock('../../../hooks/useResponsive', () => ({
      default: () => mockUseResponsive(),
    }));

    // Render Sidebar component
    const { container } = renderWithProviders(<Sidebar interfaceType="pike" isCollapsed={false} toggleCollapsed={() => {}} />);

    // Verify that the navigation item matching the current path has the active class/style
    const activeNavItem = container.querySelector(`.nav-item[href="${currentPath}"]`);
    expect(activeNavItem).toHaveClass('nav-item--active');

    // Verify other navigation items don't have the active indicator
    const allNavItems = container.querySelectorAll('.nav-item');
    allNavItems.forEach(item => {
      if (item !== activeNavItem) {
        expect(item).not.toHaveClass('nav-item--active');
      }
    });
  });
});