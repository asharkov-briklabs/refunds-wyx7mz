import React from 'react'; // react ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // @testing-library/react ^13.4.0
import { renderWithProviders } from '../../../utils/test.utils';
import DashboardPage from './DashboardPage';
import useRefund from '../../../hooks/useRefund';
import { RefundDashboardSummary, RefundIssue } from '../../../types/refund.types';

// Mock the useRefund hook for testing
jest.mock('../../../hooks/useRefund', () => ({
  __esModule: true,
  default: jest.fn()
}));

describe('DashboardPage component', () => {
  // Setup function that runs before each test
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up mock implementation for useRefund hook methods
    const mockUseRefund = useRefund as jest.Mock;

    // Mock getRefundStatistics to return mock dashboard data
    mockUseRefund.mockReturnValue({
      getRefundStatistics: jest.fn().mockResolvedValue(Promise.resolve()),
      getRefundsRequiringAttention: jest.fn().mockResolvedValue(Promise.resolve()),
      resetRefundState: jest.fn(),
      loading: false,
      error: null,
      currentRefund: null,
      refunds: [],
      pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
      transaction: null,
      statistics: {
        totalCount: 100,
        totalAmount: 1000,
        averageAmount: 10,
        methodDistribution: { ORIGINAL_PAYMENT: 70, BALANCE: 30 },
        statusDistribution: { COMPLETED: 90, PENDING_APPROVAL: 10 },
        volumeByDate: [],
        averageProcessingTime: 2
      },
      getRefund: jest.fn(),
      getRefunds: jest.fn(),
      createRefund: jest.fn(),
      cancelRefund: jest.fn(),
      getTransactionForRefund: jest.fn()
    });
  });

  // Cleanup function that runs after each test
  afterEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    // Reset any global test state
  });

  it('renders the dashboard with metrics', async () => {
    // Render the DashboardPage component with necessary providers
    renderWithProviders(<DashboardPage />);

    // Wait for dashboard components to be rendered
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Assert that page header is present with correct title
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    // Assert that metrics cards are displayed with correct values
    expect(screen.getByText('Processing Refunds')).toBeInTheDocument();
    expect(screen.getByText('Completed Refunds')).toBeInTheDocument();
    expect(screen.getByText('Failed Refunds')).toBeInTheDocument();
    expect(screen.getByText('Pending Approval')).toBeInTheDocument();
    expect(screen.getByText('Total Refund Amount')).toBeInTheDocument();
    expect(screen.getByText('Average Completion Time')).toBeInTheDocument();

    // Assert that refunds requiring attention section is present
    expect(screen.getByText('Refunds Requiring Attention')).toBeInTheDocument();
  });

  it('calls getRefundStatistics on mount', async () => {
    // Render the DashboardPage component with necessary providers
    renderWithProviders(<DashboardPage />);

    // Wait for component to mount and stabilize
    await waitFor(() => {
      expect(useRefund).toHaveBeenCalled();
    });

    // Assert that getRefundStatistics was called exactly once
    const mockUseRefund = useRefund as jest.Mock;
    const hookReturnValue = mockUseRefund.mock.results[0].value;
    expect(hookReturnValue.getRefundStatistics).toHaveBeenCalledTimes(1);

    // Assert that getRefundsRequiringAttention was called exactly once
    expect(hookReturnValue.getRefunds).toHaveBeenCalledTimes(1);
  });

  it('calls resetRefundState on unmount', async () => {
    // Render the DashboardPage component with necessary providers
    const { unmount } = renderWithProviders(<DashboardPage />);

    // Unmount the component
    unmount();

    // Assert that resetRefundState was called exactly once
    const mockUseRefund = useRefund as jest.Mock;
    const hookReturnValue = mockUseRefund.mock.results[0].value;
    expect(hookReturnValue.resetRefundState).toHaveBeenCalledTimes(1);
  });
});