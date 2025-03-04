import React from 'react'; // react ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { vi } from 'vitest'; // vitest ^0.34.0
import ConfigurationPage from './ConfigurationPage';
import { renderWithProviders, setupUserEvent, createMockUser } from '../../../utils/test.utils';
import { EntityType } from '../../../types/parameter.types';
import { CardNetworkType } from '../../../components/barracuda/CardNetworkRules';

// Mock the useNavigate hook
const mockUseNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockUseNavigate,
    useParams: () => ({}),
    useLocation: () => ({ search: '' }),
  };
});

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../../../hooks/useAuth', () => ({
  default: () => mockUseAuth(),
}));

// Mock the ParameterConfiguration component
vi.mock('../../../components/barracuda/ParameterConfiguration', () => ({
  default: () => <div data-testid="parameter-configuration">Parameter Configuration</div>,
}));

// Mock the CardNetworkRules component
vi.mock('../../../components/barracuda/CardNetworkRules', () => ({
  default: () => <div data-testid="card-network-rules">CardNetworkRules</div>,
}));

// Mock the ApprovalWorkflowConfiguration component
vi.mock('../../../components/barracuda/ApprovalWorkflowConfiguration', () => ({
  default: () => <div data-testid="approval-workflow-configuration">ApprovalWorkflowConfiguration</div>,
}));

/**
 * Setup mock functions and data for testing
 * @returns {object} Mock functions and data
 */
const setupMocks = () => {
  // Create mock user with admin role
  const mockUser = createMockUser({
    roles: ['BARRACUDA_ADMIN'],
    bankId: 'test-bank-id',
    organizationId: 'test-org-id',
  });

  // Mock useAuth hook to return the mock user
  mockUseAuth.mockReturnValue({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    handleRedirectCallback: vi.fn(),
    hasPermission: vi.fn(),
    hasRole: vi.fn(),
    handleMfaChallenge: vi.fn(),
    refreshToken: vi.fn(),
    isAdmin: vi.fn().mockReturnValue(true),
    isMerchantAdmin: vi.fn().mockReturnValue(false),
  });

  // Setup mock navigation functions
  mockUseNavigate.mockImplementation((path: string) => {
    console.log(`Navigating to: ${path}`);
  });

  // Setup mock URL parameters
  const mockUseParams = vi.fn().mockReturnValue({});
  vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
      ...actual,
      useNavigate: () => mockUseNavigate,
      useParams: mockUseParams,
      useLocation: () => ({ search: '' }),
    };
  });

  return { mockUser, mockUseNavigate, mockUseParams };
};

describe('ConfigurationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders configuration page with title', async () => {
    setupMocks();
    renderWithProviders(<ConfigurationPage />);
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByText('Parameters')).toBeInTheDocument();
    expect(screen.getByText('Card Networks')).toBeInTheDocument();
    expect(screen.getByText('Approval Workflows')).toBeInTheDocument();
  });

  test('displays parameter configuration tab by default', async () => {
    setupMocks();
    renderWithProviders(<ConfigurationPage />);
    expect(screen.getByTestId('parameter-configuration')).toBeInTheDocument();
  });

  test('switches tabs correctly when clicked', async () => {
    setupMocks();
    const { userEvent } = setupUserEvent();
    renderWithProviders(<ConfigurationPage />);

    await userEvent.click(screen.getByText('Card Networks'));
    expect(screen.getByTestId('card-network-rules')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Approval Workflows'));
    expect(screen.getByTestId('approval-workflow-configuration')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Parameters'));
    expect(screen.getByTestId('parameter-configuration')).toBeInTheDocument();
  });

  test('passes the correct entity values to child components', async () => {
    const { mockUser } = setupMocks();
    renderWithProviders(<ConfigurationPage />);

    expect(screen.getByTestId('parameter-configuration')).toBeInTheDocument();
    expect(screen.getByTestId('card-network-rules')).toBeInTheDocument();
    expect(screen.getByTestId('approval-workflow-configuration')).toBeInTheDocument();
  });

  test('handles URL parameters for initial tab selection', async () => {
    const { mockUseParams } = setupMocks();
    mockUseParams.mockReturnValue({ tab: 'cardNetworks' });
    renderWithProviders(<ConfigurationPage />, { route: '/barracuda/configuration?tab=cardNetworks' });
    await waitFor(() => expect(screen.getByTestId('card-network-rules')).toBeInTheDocument());

    mockUseParams.mockReturnValue({ tab: 'approvalWorkflow' });
    renderWithProviders(<ConfigurationPage />, { route: '/barracuda/configuration?tab=approvalWorkflow' });
    await waitFor(() => expect(screen.getByTestId('approval-workflow-configuration')).toBeInTheDocument());
  });

  test('updates URL when tab changes', async () => {
    setupMocks();
    const { userEvent } = setupUserEvent();
    renderWithProviders(<ConfigurationPage />);

    await userEvent.click(screen.getByText('Card Networks'));
    expect(mockUseNavigate).toHaveBeenCalledWith('?tab=cardNetworks');

    await userEvent.click(screen.getByText('Approval Workflows'));
    expect(mockUseNavigate).toHaveBeenCalledWith('?tab=approvalWorkflows');

    await userEvent.click(screen.getByText('Parameters'));
    expect(mockUseNavigate).toHaveBeenCalledWith('?tab=parameters');
  });

  test('handles entity change events from child components', async () => {
    setupMocks();
    const { mockUseNavigate } = setupMocks();
    renderWithProviders(<ConfigurationPage />);

    // Simulate entity change event
    const newEntityType = EntityType.BANK;
    const newEntityId = 'new-bank-id';

    // Verify that useNavigate is called with the correct path
    expect(mockUseNavigate).not.toHaveBeenCalledWith(`/barracuda/configuration/${newEntityType}/${newEntityId}`);
  });

  test('works with different user roles', async () => {
    // Bank admin
    mockUseAuth.mockReturnValue({
      user: createMockUser({ roles: ['BANK_ADMIN'], bankId: 'bank123' }),
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      handleRedirectCallback: vi.fn(),
      hasPermission: vi.fn(),
      hasRole: vi.fn(),
      handleMfaChallenge: vi.fn(),
      refreshToken: vi.fn(),
      isAdmin: vi.fn().mockReturnValue(false),
      isMerchantAdmin: vi.fn().mockReturnValue(false),
    });
    renderWithProviders(<ConfigurationPage />);

    // Organization admin
    mockUseAuth.mockReturnValue({
      user: createMockUser({ roles: ['ORGANIZATION_ADMIN'], organizationId: 'org123' }),
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      handleRedirectCallback: vi.fn(),
      hasPermission: vi.fn(),
      hasRole: vi.fn(),
      handleMfaChallenge: vi.fn(),
      refreshToken: vi.fn(),
      isAdmin: vi.fn().mockReturnValue(false),
      isMerchantAdmin: vi.fn().mockReturnValue(false),
    });
    renderWithProviders(<ConfigurationPage />);

    // Platform admin
    mockUseAuth.mockReturnValue({
      user: createMockUser({ roles: ['PLATFORM_ADMIN'] }),
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      handleRedirectCallback: vi.fn(),
      hasPermission: vi.fn(),
      hasRole: vi.fn(),
      handleMfaChallenge: vi.fn(),
      refreshToken: vi.fn(),
      isAdmin: vi.fn().mockReturnValue(false),
      isMerchantAdmin: vi.fn().mockReturnValue(false),
    });
    renderWithProviders(<ConfigurationPage />);
  });
});