import React from 'react'; // react ^18.2.0
import { screen, waitFor, fireEvent } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { act } from 'react-dom/test-utils'; // react-dom/test-utils ^18.2.0
import { RefundDashboard } from './RefundDashboard';
import { renderWithProviders, setupUserEvent, waitForComponentToPaint } from '../../../utils/test.utils';
import { RefundDashboardSummary, RefundIssue, RefundStatus } from '../../../types/refund.types';
import { ROUTES } from '../../../constants/routes.constants';

// Mock the useRefund hook to control data and loading states
jest.mock('../../../hooks/useRefund', () => ({
  __esModule: true,
  default: () => mockUseRefund(),
}));

// Mock the useNavigate hook to test navigation
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Mock data for dashboard summary
const mockDashboardSummary: RefundDashboardSummary = {
  processingCount: 124,
  completedCount: 2543,
  failedCount: 18,
  pendingApprovalCount: 36,
  totalAmount: 124532,
  avgCompletionTime: 2.4,
  previousPeriodData: {
    processingCount: 115,
    completedCount: 2423,
    failedCount: 20,
    pendingApprovalCount: 32,
    totalAmount: 118945,
    avgCompletionTime: 2.6,
  },
};

// Mock data for refunds requiring attention
const mockRefundsRequiringAttention: RefundIssue[] = [
  {
    refundId: 'REF8762',
    merchantName: 'GameStop',
    amount: 299.99,
    currency: 'USD',
    issueType: 'RULE_VIOLATION',
    status: 'VALIDATION_FAILED' as RefundStatus,
    createdAt: '2023-05-17T10:30:00Z',
  },
  {
    refundId: 'REF8745',
    merchantName: 'TechWorld',
    amount: 1299,
    currency: 'USD',
    issueType: 'HIGH_AMOUNT',
    status: 'PENDING_APPROVAL' as RefundStatus,
    createdAt: '2023-05-16T14:45:00Z',
  },
  {
    refundId: 'REF8735',
    merchantName: 'HomeGoods',
    amount: 89.99,
    currency: 'USD',
    issueType: 'GATEWAY_ERROR',
    status: 'GATEWAY_ERROR' as RefundStatus,
    createdAt: '2023-05-16T09:15:00Z',
  },
];

let mockNavigate = jest.fn();

const mockUseRefund = () => ({
  getRefundStatistics: jest.fn(),
  getRefunds: jest.fn(),
  loading: false,
  error: null,
});

describe('RefundDashboard component', () => {
  beforeEach(() => {
    mockNavigate = jest.fn();
  });

  it('renders loading state initially', async () => {
    const mockUseRefundLoading = () => ({
      getRefundStatistics: jest.fn(),
      getRefunds: jest.fn(),
      loading: true,
      error: null,
    });

    jest.mock('../../../hooks/useRefund', () => ({
      __esModule: true,
      default: () => mockUseRefundLoading(),
    }));

    const { getByRole } = renderWithProviders(<RefundDashboard />);
    expect(getByRole('status')).toBeInTheDocument();
  });

  it('renders summary metrics when data is loaded', async () => {
    const mockUseRefundData = () => ({
      getRefundStatistics: jest.fn(),
      getRefunds: jest.fn(),
      loading: false,
      error: null,
      statistics: mockDashboardSummary,
    });

    jest.mock('../../../hooks/useRefund', () => ({
      __esModule: true,
      default: () => mockUseRefundData(),
    }));

    const { getByText } = renderWithProviders(<RefundDashboard />);

    expect(getByText('Processing Refunds')).toBeInTheDocument();
    expect(getByText('124')).toBeInTheDocument();

    expect(getByText('Completed Refunds')).toBeInTheDocument();
    expect(getByText('2,543')).toBeInTheDocument();

    expect(getByText('Failed Refunds')).toBeInTheDocument();
    expect(getByText('18')).toBeInTheDocument();

    expect(getByText('Pending Approval')).toBeInTheDocument();
    expect(getByText('36')).toBeInTheDocument();

    expect(getByText('Total Refund Amount')).toBeInTheDocument();
    expect(getByText('$124,532.00')).toBeInTheDocument();

    expect(getByText('Average Completion Time')).toBeInTheDocument();
    expect(getByText('2.4')).toBeInTheDocument();
  });

  it('renders refunds requiring attention', async () => {
    const mockUseRefundAttention = () => ({
      getRefundStatistics: jest.fn(),
      getRefunds: jest.fn(),
      loading: false,
      error: null,
      refunds: mockRefundsRequiringAttention,
    });

    jest.mock('../../../hooks/useRefund', () => ({
      __esModule: true,
      default: () => mockUseRefundAttention(),
    }));

    const { getByText } = renderWithProviders(<RefundDashboard />);

    expect(getByText('Refunds Requiring Attention')).toBeInTheDocument();
    expect(getByText('REF8762')).toBeInTheDocument();
    expect(getByText('GameStop')).toBeInTheDocument();
    expect(getByText('$299.99')).toBeInTheDocument();
    expect(getByText('RULE_VIOLATION')).toBeInTheDocument();
  });

  it("navigates to issues page when 'See All Issues' is clicked", async () => {
    const mockUserEvent = setupUserEvent();
    const { getByText } = renderWithProviders(<RefundDashboard />);

    await act(async () => {
      await mockUserEvent.click(getByText('See All Issues'));
    });

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.BARRACUDA.REFUNDS);
  });

  it('shows empty state when no refunds require attention', async () => {
    const mockUseRefundEmpty = () => ({
      getRefundStatistics: jest.fn(),
      getRefunds: jest.fn(),
      loading: false,
      error: null,
      refunds: [],
    });

    jest.mock('../../../hooks/useRefund', () => ({
      __esModule: true,
      default: () => mockUseRefundEmpty(),
    }));

    const { getByText } = renderWithProviders(<RefundDashboard />);

    expect(getByText('No refunds currently require attention.')).toBeInTheDocument();
  });

  it('handles error state gracefully', async () => {
    const mockUseRefundError = () => ({
      getRefundStatistics: jest.fn(),
      getRefunds: jest.fn(),
      loading: false,
      error: 'Failed to fetch data',
    });

    jest.mock('../../../hooks/useRefund', () => ({
      __esModule: true,
      default: () => mockUseRefundError(),
    }));

    const { getByText } = renderWithProviders(<RefundDashboard />);

    expect(getByText('Failed to fetch data')).toBeInTheDocument();
  });
});