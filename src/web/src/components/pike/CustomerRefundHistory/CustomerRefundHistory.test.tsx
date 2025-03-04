import React from 'react'; // react ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { userEvent } from '@testing-library/user-event'; // @testing-library/user-event ^14.4.3
import { jest } from '@jest/globals'; // @jest/globals ^29.5.0
import CustomerRefundHistory from './CustomerRefundHistory';
import { renderWithProviders } from '../../../utils/test.utils';
import * as refundSlice from '../../../store/slices/refund.slice';
import { RefundStatus } from '../../../types/refund.types';

// Mock data for refunds
const mockRefunds = [
  {
    refundId: 'REF10012',
    transactionId: 'TXN9876543',
    amount: 45.00,
    currency: 'USD',
    status: RefundStatus.COMPLETED,
    refundMethod: 'ORIGINAL_PAYMENT',
    createdAt: '2023-05-17T09:30:00Z',
    customerName: 'John Smith',
    reason: 'CUSTOMER_REQUEST',
  },
  {
    refundId: 'REF10011',
    transactionId: 'TXN9876540',
    amount: 129.99,
    currency: 'USD',
    status: RefundStatus.PROCESSING,
    refundMethod: 'ORIGINAL_PAYMENT',
    createdAt: '2023-05-16T10:15:00Z',
    customerName: 'John Smith',
    reason: 'PRODUCT_UNSATISFACTORY',
  },
  {
    refundId: 'REF10009',
    transactionId: 'TXN9876523',
    amount: 24.50,
    currency: 'USD',
    status: RefundStatus.FAILED,
    refundMethod: 'BALANCE',
    createdAt: '2023-05-14T14:22:00Z',
    customerName: 'John Smith',
    reason: 'ORDER_CHANGE',
  },
];

// Mock statistics data
const mockStatistics = {
  totalCount: 3,
  totalAmount: 199.49,
  averageAmount: 66.50,
  methodDistribution: { ORIGINAL_PAYMENT: 2, BALANCE: 1 },
  statusDistribution: { COMPLETED: 1, PROCESSING: 1, FAILED: 1 },
  volumeByDate: [
    { date: '2023-05-14', count: 1, amount: 24.50 },
    { date: '2023-05-16', count: 1, amount: 129.99 },
    { date: '2023-05-17', count: 1, amount: 45.00 },
  ],
  averageProcessingTime: 1.8,
  totalTransactions: 37,
};

/**
 * Setup function for common test configuration
 */
const setup = () => {
  // Create mock refund data array
  const refunds = mockRefunds;

  // Create mock statistics data
  const statistics = mockStatistics;

  // Set up Jest spy for Redux actions
  const fetchRefundsSpy = jest.spyOn(refundSlice, 'fetchRefunds');
  const fetchRefundStatisticsSpy = jest.spyOn(refundSlice, 'fetchRefundStatistics');

  // Return configured test objects and mock data for reuse in tests
  return { refunds, statistics, fetchRefundsSpy, fetchRefundStatisticsSpy };
};

describe('CustomerRefundHistory component', () => {
  /**
   * Tests that the component renders correctly with loading state
   */
  test('renders in loading state', () => {
    // Mock Redux state to show loading state
    const preloadedState = {
      refund: {
        refunds: [],
        currentRefund: null,
        currentTransaction: null,
        statistics: null,
        pagination: { totalItems: 0, pageSize: 10, page: 1, totalPages: 0 },
        loading: true,
        error: null,
      },
    };

    // Render the component with providers
    renderWithProviders(<CustomerRefundHistory customerId="test-customer" />, { preloadedState });

    // Assert that loading indicator is visible
    expect(screen.getByRole('status')).toBeVisible();

    // Assert that refund table is not visible yet
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  /**
   * Tests that the component displays refund data properly
   */
  test('displays refund history data', async () => {
    // Arrange
    const { refunds, fetchRefundsSpy } = setup();
    const preloadedState = {
      refund: {
        refunds: refunds,
        currentRefund: null,
        currentTransaction: null,
        statistics: null,
        pagination: { totalItems: refunds.length, pageSize: 10, page: 1, totalPages: 1 },
        loading: false,
        error: null,
      },
    };

    // Act
    renderWithProviders(<CustomerRefundHistory customerId="test-customer" />, { preloadedState });

    // Assert
    await waitFor(() => {
      expect(fetchRefundsSpy).toHaveBeenCalled();
    });

    // Assert that refund table is visible
    expect(screen.getByRole('table')).toBeVisible();

    // Assert that the correct number of refunds are displayed
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(refunds.length + 1); // +1 for header row

    // Assert that refund details (ID, amount, status) are displayed correctly
    expect(screen.getByText('REF10012')).toBeInTheDocument();
    expect(screen.getByText('$45.00')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });

  /**
   * Tests that the component displays summary metrics correctly
   */
  test('displays refund summary metrics', async () => {
    // Arrange
    const { refunds, statistics, fetchRefundsSpy, fetchRefundStatisticsSpy } = setup();
    const preloadedState = {
      refund: {
        refunds: refunds,
        currentRefund: null,
        currentTransaction: null,
        statistics: statistics,
        pagination: { totalItems: refunds.length, pageSize: 10, page: 1, totalPages: 1 },
        loading: false,
        error: null,
      },
    };

    // Act
    renderWithProviders(<CustomerRefundHistory customerId="test-customer" />, { preloadedState });

    // Assert
    await waitFor(() => {
      expect(fetchRefundsSpy).toHaveBeenCalled();
      expect(fetchRefundStatisticsSpy).toHaveBeenCalled();
    });

    // Assert that total refund amount is displayed correctly
    expect(screen.getByText('$199.49')).toBeInTheDocument();

    // Assert that refund rate is calculated and displayed correctly
    expect(screen.getByText('5.39%')).toBeInTheDocument();
  });

  /**
   * Tests that empty state is handled properly
   */
  test('displays empty state when no refunds', async () => {
    // Mock Redux state with empty refund list
    const preloadedState = {
      refund: {
        refunds: [],
        currentRefund: null,
        currentTransaction: null,
        statistics: null,
        pagination: { totalItems: 0, pageSize: 10, page: 1, totalPages: 0 },
        loading: false,
        error: null,
      },
    };

    // Render the component with providers
    renderWithProviders(<CustomerRefundHistory customerId="test-customer" />, { preloadedState });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('No refund history available for this customer.')).toBeInTheDocument();
    });

    // Assert that empty state message is displayed
    expect(screen.getByText('No refund history available for this customer.')).toBeVisible();

    // Assert that refund table is not shown
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  /**
   * Tests that error state is handled properly
   */
  test('handles error state', async () => {
    // Mock Redux state with error
    const preloadedState = {
      refund: {
        refunds: [],
        currentRefund: null,
        currentTransaction: null,
        statistics: null,
        pagination: { totalItems: 0, pageSize: 10, page: 1, totalPages: 0 },
        loading: false,
        error: 'Failed to fetch data',
      },
    };

    // Render the component with providers
    renderWithProviders(<CustomerRefundHistory customerId="test-customer" />, { preloadedState });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
    });

    // Assert that error message is displayed
    expect(screen.getByText('Failed to fetch data')).toBeVisible();

    // Assert that refund table is not shown
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});