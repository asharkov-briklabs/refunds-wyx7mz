import React from 'react'; // react ^18.2.0
import { screen, waitFor, fireEvent } from '@testing-library/react'; // @testing-library/react ^13.4.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event ^14.4.3
import RefundsPage from './RefundsPage';
import { renderWithProviders } from '../../../utils/test.utils';
import useRefund from '../../../hooks/useRefund';
import { RefundStatus, RefundSummary } from '../../../types/refund.types';

// Mock the useRefund hook for testing
jest.mock('../../../hooks/useRefund', () => ({
  __esModule: true,
  default: jest.fn()
}));

// Mock the useNavigate hook for testing navigation
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn()
}));

describe('RefundsPage component', () => {
  let mockGetRefunds: jest.Mock;
  let mockGetRefundStatistics: jest.Mock;
  let mockCancelRefund: jest.Mock;
  let mockResetRefundState: jest.Mock;
  let mockNavigate: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up mock implementation for useRefund hook methods
    mockGetRefunds = jest.fn();
    mockGetRefundStatistics = jest.fn();
    mockCancelRefund = jest.fn().mockResolvedValue(undefined);
    mockResetRefundState = jest.fn();
    mockNavigate = jest.fn();

    (useRefund as jest.Mock).mockImplementation(() => ({
      refunds: [
        { refundId: '1', transactionId: 'txn-1', amount: 100, currency: 'USD', status: RefundStatus.COMPLETED, refundMethod: 'ORIGINAL_PAYMENT', createdAt: '2023-01-01', customerName: 'John Doe', reason: 'Requested by customer' },
        { refundId: '2', transactionId: 'txn-2', amount: 50, currency: 'USD', status: RefundStatus.PROCESSING, refundMethod: 'BALANCE', createdAt: '2023-01-02', customerName: 'Jane Smith', reason: 'Item not received' }
      ],
      pagination: { totalItems: 2, pageSize: 10, page: 1, totalPages: 1 },
      loading: false,
      error: null,
      getRefunds: mockGetRefunds,
      cancelRefund: mockCancelRefund,
      getRefundStatistics: mockGetRefundStatistics,
      resetRefundState: mockResetRefundState
    }));

    (require('react-router-dom').useNavigate as jest.Mock).mockImplementation(() => mockNavigate);
  });

  afterEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    // Reset any global test state
  });

  it('renders the refunds page with table', async () => {
    // Render the RefundsPage component with necessary providers
    renderWithProviders(<RefundsPage />);

    // Wait for the refunds table to be rendered
    await waitFor(() => screen.getByText('Refunds'));

    // Assert that page header is present with correct title
    expect(screen.getByText('Refunds')).toBeInTheDocument();

    // Assert that filter controls are present (search, status dropdown, date range)
    expect(screen.getByPlaceholderText('Search refunds...')).toBeInTheDocument();
    expect(screen.getByText('Filter by status')).toBeInTheDocument();
    expect(screen.getByText('Time Period')).toBeInTheDocument();

    // Assert that the table is rendered with correct columns
    expect(screen.getByText('Refund ID')).toBeInTheDocument();
    expect(screen.getByText('Transaction ID')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Method')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();

    // Assert that refund data rows are displayed with correct values
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('txn-1')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('ORIGINAL_PAYMENT')).toBeInTheDocument();
    expect(screen.getByText('Jan 1, 2023')).toBeInTheDocument();

    // Assert that pagination controls are present
    expect(screen.getByRole('navigation', { name: 'Pagination navigation' })).toBeInTheDocument();
  });

  it('calls getRefunds on mount with default parameters', async () => {
    // Render the RefundsPage component with necessary providers
    renderWithProviders(<RefundsPage />);

    // Wait for component to mount and stabilize
    await waitFor(() => expect(mockGetRefunds).toHaveBeenCalledTimes(1));

    // Assert that getRefunds was called exactly once
    expect(mockGetRefunds).toHaveBeenCalledTimes(1);

    // Assert that getRefunds was called with the expected default parameters (page 1, default filters)
    expect(mockGetRefunds).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      searchQuery: '',
      status: [],
      dateRangeStart: undefined,
      dateRangeEnd: undefined,
      merchantId: undefined,
    });
  });

  it('updates filters when search input changes', async () => {
    // Render the RefundsPage component with necessary providers
    renderWithProviders(<RefundsPage />);

    // Find the search input field
    const searchInput = screen.getByPlaceholderText('Search refunds...');

    // Type a search query into the search field
    fireEvent.change(searchInput, { target: { value: 'txn-1' } });

    // Wait for debounced search to be triggered
    await waitFor(() => expect(mockGetRefunds).toHaveBeenCalledTimes(2));

    // Assert that getRefunds was called with the expected search parameter
    expect(mockGetRefunds).toHaveBeenCalledWith(expect.objectContaining({
      searchQuery: 'txn-1',
      page: 1
    }));
  });

  it('updates filters when status filter changes', async () => {
    // Render the RefundsPage component with necessary providers
    renderWithProviders(<RefundsPage />);

    // Find the status filter dropdown
    const statusFilter = screen.getByText('Filter by status');

    // Select a status option from the dropdown
    fireEvent.mouseDown(statusFilter);
    const statusOption = await screen.findByText('Completed');
    fireEvent.click(statusOption);

    // Assert that getRefunds was called with the expected status filter
    await waitFor(() => expect(mockGetRefunds).toHaveBeenCalledTimes(2));
    expect(mockGetRefunds).toHaveBeenCalledWith(expect.objectContaining({
      status: ['COMPLETED'],
      page: 1
    }));
  });

  it('updates filters when date range changes', async () => {
    // Render the RefundsPage component with necessary providers
    renderWithProviders(<RefundsPage />);

    // Find the date range selector component
    const dateRangeSelector = screen.getByText('Time Period');

    // Select a new date range
    fireEvent.mouseDown(dateRangeSelector);
    const lastMonthOption = await screen.findByText('Last 30 Days');
    fireEvent.click(lastMonthOption);

    // Assert that getRefunds was called with the expected date range parameters
    await waitFor(() => expect(mockGetRefunds).toHaveBeenCalledTimes(2));
    expect(mockGetRefunds).toHaveBeenCalledWith(expect.objectContaining({
      dateRangeStart: expect.any(String),
      dateRangeEnd: expect.any(String),
      page: 1
    }));
  });

  it('changes page when pagination controls are clicked', async () => {
    // Render the RefundsPage component with necessary providers
    renderWithProviders(<RefundsPage />);

    // Find the pagination next page button
    const nextPageButton = screen.getByRole('button', { name: 'Next page' });

    // Click the next page button
    fireEvent.click(nextPageButton);

    // Assert that getRefunds was called with page parameter incremented
    await waitFor(() => expect(mockGetRefunds).toHaveBeenCalledTimes(2));
    expect(mockGetRefunds).toHaveBeenCalledWith(expect.objectContaining({
      page: 2
    }));

    // Find the pagination previous page button
    const previousPageButton = screen.getByRole('button', { name: 'Previous page' });

    // Click the previous page button
    fireEvent.click(previousPageButton);

    // Assert that getRefunds was called with page parameter decremented
    await waitFor(() => expect(mockGetRefunds).toHaveBeenCalledTimes(3));
    expect(mockGetRefunds).toHaveBeenCalledWith(expect.objectContaining({
      page: 1
    }));
  });

  it('navigates to refund details when a row is clicked', async () => {
    // Render the RefundsPage component with necessary providers
    renderWithProviders(<RefundsPage />);

    // Find a refund row in the table
    const refundRow = await screen.findByText('1');

    // Click on the refund row
    fireEvent.click(refundRow);

    // Assert that useNavigate was called with the correct refund details URL path
    expect(mockNavigate).toHaveBeenCalledWith('/barracuda/refunds/1');
  });

  it('calls cancelRefund when cancel button is clicked and confirmed', async () => {
    // Render the RefundsPage component with necessary providers
    renderWithProviders(<RefundsPage />);

    // Find a cancel button in the refund row
    const cancelButton = await screen.findByText('Cancel');

    // Click the cancel button
    fireEvent.click(cancelButton);

    // Assert that a confirmation dialog appears
    expect(window.prompt).toHaveBeenCalledTimes(1);

    // Click the confirm button in the dialog
    (window.prompt as jest.Mock).mockReturnValue('Test reason');

    // Assert that cancelRefund was called with the correct refund ID
    await waitFor(() => expect(mockCancelRefund).toHaveBeenCalledWith('1', 'Test reason'));

    // Assert that getRefunds was called again to refresh the data
    await waitFor(() => expect(mockGetRefunds).toHaveBeenCalledTimes(2));
  });

  it('calls resetRefundState on unmount', async () => {
    // Render the RefundsPage component with necessary providers
    const { unmount } = renderWithProviders(<RefundsPage />);

    // Unmount the component
    unmount();

    // Assert that resetRefundState was called exactly once
    expect(mockResetRefundState).toHaveBeenCalledTimes(1);
  });

  it('toggles between dashboard and list view', async () => {
    // Render the RefundsPage component with necessary providers
    renderWithProviders(<RefundsPage />);

    // Assert that the page initially shows the list view
    expect(screen.getByText('Refunds')).toBeInTheDocument();

    // Find the dashboard view toggle button
    const dashboardButton = screen.getByText('Dashboard');

    // Click the dashboard view toggle button
    fireEvent.click(dashboardButton);

    // Assert that the dashboard component is displayed
    expect(mockGetRefundStatistics).toHaveBeenCalled();

    // Find the list view toggle button
    const listViewButton = screen.getByText('List View');

    // Click the list view toggle button
    fireEvent.click(listViewButton);

    // Assert that the list view is displayed again
    expect(screen.getByText('Refunds')).toBeInTheDocument();
  });
});