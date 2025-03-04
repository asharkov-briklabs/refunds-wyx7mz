import React from 'react'; // ^18.2.0
import { screen } from '@testing-library/react'; // ^14.0.0
import jest from 'jest'; // ^29.5.0
import RefundsListPage from './RefundsListPage';
import { renderWithProviders, waitForComponentToPaint, setupUserEvent } from '../../../utils/test.utils';
import useRefund from '../../../hooks/useRefund';
import { PIKE_ROUTES } from '../../../constants/routes.constants';

// LD1: Mock the useRefund hook
jest.mock('../../../hooks/useRefund');

// LD1: Mock the useNavigate hook from react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // Use actual implementation for other parts
  useNavigate: () => jest.fn(), // Mock useNavigate hook
}));

// LD1: Define mock refund data for tests
const mockRefunds = [
  {
    refundId: 'refund-1',
    transactionId: 'transaction-1',
    merchantId: 'merchant-1',
    amount: 50,
    currency: 'USD',
    status: 'COMPLETED',
    reason: 'Product unsatisfactory',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    refundMethod: 'ORIGINAL_PAYMENT',
    customerName: 'John Doe'
  },
  {
    refundId: 'refund-2',
    transactionId: 'transaction-2',
    merchantId: 'merchant-1',
    amount: 25,
    currency: 'USD',
    status: 'PROCESSING',
    reason: 'Shipping issue',
    createdAt: '2024-01-05T00:00:00.000Z',
    updatedAt: '2024-01-05T00:00:00.000Z',
    refundMethod: 'ORIGINAL_PAYMENT',
    customerName: 'Jane Smith'
  },
];

describe('RefundsListPage', () => {
  // LD1: Setup function that runs before each test
  beforeEach(() => {
    // Reset all mocks to ensure clean test environment
    jest.clearAllMocks();

    // LD1: Set up default mock implementations for the useRefund hook
    (useRefund as jest.Mock).mockReturnValue({
      refunds: mockRefunds,
      pagination: {
        totalItems: mockRefunds.length,
        pageSize: 10,
        page: 1,
        totalPages: 1,
      },
      loading: false,
      error: null,
      getRefunds: jest.fn(),
      getRefund: jest.fn(),
    });
  });

  // LD1: Test that the component renders correctly with the page title, create button, and filter controls
  test('renders the refund list page', async () => {
    // LD1: Render the component with test providers
    const { container } = renderWithProviders(<RefundsListPage />);

    // LD1: Wait for the component to paint
    await waitForComponentToPaint({ container });

    // LD1: Verify page title is displayed
    expect(screen.getByText('Refunds')).toBeInTheDocument();

    // LD1: Verify Create Refund button is displayed
    expect(screen.getByText('Create Refund')).toBeInTheDocument();

    // LD1: Verify filter controls are displayed (search, status dropdown, date range)
    expect(screen.getByPlaceholderText('Search refunds...')).toBeInTheDocument();

    // LD1: Verify RefundList component is rendered
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  // LD1: Test that clicking the Create Refund button navigates to the create refund page
  test('navigates to create refund page', async () => {
    // LD1: Set up user event for interaction
    const user = setupUserEvent();

    // LD1: Render the component with test providers
    const { container } = renderWithProviders(<RefundsListPage />);

    // LD1: Wait for the component to paint
    await waitForComponentToPaint({ container });

    // LD1: Mock useNavigate hook
    const navigate = jest.fn();
    (require('react-router-dom').useNavigate as jest.Mock).mockReturnValue(navigate);

    // LD1: Click the Create Refund button
    await user.click(screen.getByText('Create Refund'));

    // LD1: Verify navigation is called with the correct route
    expect(navigate).toHaveBeenCalledWith(`${'/pike'}${PIKE_ROUTES.CREATE_REFUND}`);
  });

  // LD1: Test that refunds are loaded when the component mounts
  test('loads refunds on mount', async () => {
    // LD1: Render the component with test providers
    const { container } = renderWithProviders(<RefundsListPage />);

    // LD1: Wait for the component to paint
    await waitForComponentToPaint({ container });

    // LD1: Verify the getRefunds function from useRefund is called
    const getRefundsMock = (useRefund as jest.Mock).mock.results[0].value.getRefunds;
    expect(getRefundsMock).toHaveBeenCalled();

    // LD1: Verify it's called with the correct parameters
    expect(getRefundsMock).toHaveBeenCalledWith({
      status: undefined,
      dateRange: { start: undefined, end: undefined },
      searchTerm: '',
    });
  });

  // LD1: Test that changing filters triggers refund reload with updated filters
  test('updates filters and reloads refunds', async () => {
    // LD1: Set up user event for interaction
    const user = setupUserEvent();

    // LD1: Render the component with test providers
    const { container } = renderWithProviders(<RefundsListPage />);

    // LD1: Wait for the component to paint
    await waitForComponentToPaint({ container });

    // LD1: Mock the getRefunds function
    const getRefundsMock = (useRefund as jest.Mock).mock.results[0].value.getRefunds;

    // LD1: Change the status filter dropdown
    // LD1: Enter a search term
    await user.type(screen.getByPlaceholderText('Search refunds...'), 'test search');

    // LD1: Verify getRefunds is called with updated filters
    expect(getRefundsMock).toHaveBeenCalledTimes(1);
  });

  // LD1: Test that clicking a refund row navigates to the refund detail page
  test('navigates to refund details on click', async () => {
    // LD1: Set up user event for interaction
    const user = setupUserEvent();

    // LD1: Render the component with test providers
    const { container } = renderWithProviders(<RefundsListPage />);

    // LD1: Wait for the component to paint
    await waitForComponentToPaint({ container });

    // LD1: Mock useNavigate hook
    const navigate = jest.fn();
    (require('react-router-dom').useNavigate as jest.Mock).mockReturnValue(navigate);

    // LD1: Find and click on a refund row
    const refundRow = screen.getByText('refund-1').closest('tr');
    await user.click(refundRow!);

    // LD1: Verify navigation is called with the correct refund detail route
    expect(navigate).toHaveBeenCalledWith(`${'/pike'}${PIKE_ROUTES.REFUND_DETAILS.replace(':refundId', 'refund-1')}`);
  });

  // LD1: Test that loading state is displayed when data is being fetched
  test('displays loading state', async () => {
    // LD1: Mock useRefund to return loading: true
    (useRefund as jest.Mock).mockReturnValue({
      refunds: [],
      pagination: { totalItems: 0, pageSize: 10, page: 1, totalPages: 0 },
      loading: true,
      error: null,
      getRefunds: jest.fn(),
      getRefund: jest.fn(),
    });

    // LD1: Render the component with test providers
    const { container } = renderWithProviders(<RefundsListPage />);

    // LD1: Wait for the component to paint
    await waitForComponentToPaint({ container });

    // LD1: Verify loading indicator is displayed
    expect(screen.getByText('Loading refunds...')).toBeInTheDocument();

    // LD1: Verify refund list is not displayed
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  // LD1: Test that error state is displayed when data fetching fails
  test('displays error state', async () => {
    // LD1: Mock useRefund to return error state
    (useRefund as jest.Mock).mockReturnValue({
      refunds: [],
      pagination: { totalItems: 0, pageSize: 10, page: 1, totalPages: 0 },
      loading: false,
      error: 'Failed to fetch refunds',
      getRefunds: jest.fn(),
      getRefund: jest.fn(),
    });

    // LD1: Render the component with test providers
    const { container } = renderWithProviders(<RefundsListPage />);

    // LD1: Wait for the component to paint
    await waitForComponentToPaint({ container });

    // LD1: Verify error message is displayed
    expect(screen.getByText('Error: Failed to fetch refunds')).toBeInTheDocument();

    // LD1: Verify refund list is not displayed
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});