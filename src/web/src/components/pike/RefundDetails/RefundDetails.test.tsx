import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react'; // version ^14.0.0
import userEvent from '@testing-library/user-event'; // version ^14.0.0
import { RefundDetails } from './RefundDetails';
import { useRefund } from '@company/refund-hooks'; // version ^1.0.0
import { RefundStatus, RefundMethod } from '@company/refund-types'; // version ^1.0.0

// Mock the useRefund hook
jest.mock('@company/refund-hooks');

// Mock router hooks
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ refundId: 'REF10011' }),
  useNavigate: () => jest.fn(),
}));

describe('RefundDetails Component', () => {
  // Mock functions from useRefund
  const mockGetRefund = jest.fn();
  const mockCancelRefund = jest.fn().mockResolvedValue({ success: true });
  const mockNavigate = jest.fn();

  // Setup mock data for different scenarios
  const mockRefund = {
    refundId: 'REF10011',
    status: RefundStatus.PROCESSING,
    transaction: {
      transactionId: 'TXN9876540',
      date: '2023-05-15',
      amount: 129.99,
      customerName: 'John Smith',
      paymentMethod: 'Visa ****4242',
    },
    amount: 129.99,
    refundMethod: RefundMethod.ORIGINAL_PAYMENT,
    reason: 'CUSTOMER_REQUEST',
    description: 'Customer received damaged product and requested full refund.',
    timeline: {
      created: '2023-05-16T10:15:00Z',
      submitted: '2023-05-16T10:15:00Z',
      processing: '2023-05-16T10:18:00Z',
    },
    estimatedCompletionDate: {
      start: '2023-05-18',
      end: '2023-05-20',
    },
    supportingDocuments: [],
    canCancel: true,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    
    // Default mock implementation
    (useRefund as jest.Mock).mockReturnValue({
      refund: mockRefund,
      isLoading: false,
      error: null,
      getRefund: mockGetRefund,
      cancelRefund: mockCancelRefund,
    });

    // Reset navigation mock
    (useRefund as jest.Mock).mockImplementation(() => ({
      refund: mockRefund,
      isLoading: false,
      error: null,
      getRefund: mockGetRefund,
      cancelRefund: mockCancelRefund,
      navigate: mockNavigate,
    }));
  });

  test('renders loading state when data is being fetched', () => {
    (useRefund as jest.Mock).mockReturnValue({
      refund: null,
      isLoading: true,
      error: null,
      getRefund: mockGetRefund,
      cancelRefund: mockCancelRefund,
    });

    render(<RefundDetails />);
    
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    expect(screen.queryByText('Refund ID: REF10011')).not.toBeInTheDocument();
  });

  test('renders error state when fetch fails', () => {
    const errorMessage = 'Failed to load refund details';
    
    (useRefund as jest.Mock).mockReturnValue({
      refund: null,
      isLoading: false,
      error: new Error(errorMessage),
      getRefund: mockGetRefund,
      cancelRefund: mockCancelRefund,
    });

    render(<RefundDetails />);
    
    expect(screen.getByText(/error/i)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.queryByText('Refund ID: REF10011')).not.toBeInTheDocument();
  });

  test('renders refund details correctly', () => {
    render(<RefundDetails />);
    
    // Check refund ID and status
    expect(screen.getByText(/REF10011/i)).toBeInTheDocument();
    expect(screen.getByText(/PROCESSING/i)).toBeInTheDocument();
    
    // Check transaction information section
    expect(screen.getByText(/Transaction Information/i)).toBeInTheDocument();
    expect(screen.getByText(/TXN9876540/i)).toBeInTheDocument();
    expect(screen.getByText(/2023-05-15/i)).toBeInTheDocument();
    expect(screen.getByText(/\$129\.99/i)).toBeInTheDocument();
    expect(screen.getByText(/John Smith/i)).toBeInTheDocument();
    expect(screen.getByText(/Visa \*\*\*\*4242/i)).toBeInTheDocument();
    
    // Check refund details section
    expect(screen.getByText(/Refund Details/i)).toBeInTheDocument();
    expect(screen.getByText(/ORIGINAL_PAYMENT/i)).toBeInTheDocument();
    expect(screen.getByText(/CUSTOMER_REQUEST/i)).toBeInTheDocument();
    expect(screen.getByText(/Customer received damaged product/i)).toBeInTheDocument();
    
    // Check processing timeline
    expect(screen.getByText(/Processing Timeline/i)).toBeInTheDocument();
    expect(screen.getByText(/05\/16\/23 10:15 AM/i)).toBeInTheDocument(); // Created date
    expect(screen.getByText(/05\/16\/23 10:18 AM/i)).toBeInTheDocument(); // Processing date
    
    // Check estimated completion
    expect(screen.getByText(/Estimated Completion: 05\/18\/23 - 05\/20\/23/i)).toBeInTheDocument();
  });

  test('displays the correct status badge based on refund status', () => {
    const statusTestCases = [
      { status: RefundStatus.DRAFT, expectedClass: 'status-draft' },
      { status: RefundStatus.SUBMITTED, expectedClass: 'status-submitted' },
      { status: RefundStatus.PENDING_APPROVAL, expectedClass: 'status-pending-approval' },
      { status: RefundStatus.PROCESSING, expectedClass: 'status-processing' },
      { status: RefundStatus.COMPLETED, expectedClass: 'status-completed' },
      { status: RefundStatus.FAILED, expectedClass: 'status-failed' },
      { status: RefundStatus.CANCELED, expectedClass: 'status-canceled' },
    ];

    statusTestCases.forEach(({ status, expectedClass }) => {
      (useRefund as jest.Mock).mockReturnValue({
        refund: { ...mockRefund, status },
        isLoading: false,
        error: null,
        getRefund: mockGetRefund,
        cancelRefund: mockCancelRefund,
      });

      const { unmount } = render(<RefundDetails />);
      
      const statusBadge = screen.getByTestId('status-badge');
      expect(statusBadge).toHaveClass(expectedClass);
      expect(statusBadge).toHaveTextContent(status);
      
      unmount();
    });
  });

  test('shows appropriate refund method details', () => {
    const methodTestCases = [
      { 
        method: RefundMethod.ORIGINAL_PAYMENT, 
        expectedText: 'original payment method'
      },
      { 
        method: RefundMethod.BALANCE, 
        expectedText: 'merchant balance'
      },
      { 
        method: RefundMethod.OTHER, 
        expectedText: 'bank account',
        bankAccount: {
          accountId: 'BA12345',
          accountHolderName: 'John Doe',
          accountNumberLast4: '6789',
          routingNumber: '123456789'
        }
      },
    ];

    methodTestCases.forEach(({ method, expectedText, bankAccount }) => {
      (useRefund as jest.Mock).mockReturnValue({
        refund: { 
          ...mockRefund, 
          refundMethod: method,
          bankAccount: bankAccount ?? null
        },
        isLoading: false,
        error: null,
        getRefund: mockGetRefund,
        cancelRefund: mockCancelRefund,
      });

      const { unmount } = render(<RefundDetails />);
      
      expect(screen.getByText(new RegExp(expectedText, 'i'))).toBeInTheDocument();
      
      if (method === RefundMethod.OTHER && bankAccount) {
        expect(screen.getByText(new RegExp(`${bankAccount.accountHolderName}`, 'i'))).toBeInTheDocument();
        expect(screen.getByText(new RegExp(`\\*\\*\\*\\*${bankAccount.accountNumberLast4}`, 'i'))).toBeInTheDocument();
      }
      
      unmount();
    });
  });

  test('displays supporting documentation when available', () => {
    // Test with documents
    const documentsData = [
      { documentId: 'doc_12345', documentType: 'CUSTOMER_EMAIL', uploadedAt: '2023-05-15T10:32:20Z', url: 'https://storage.example.com/documents/doc_12345' }
    ];
    
    (useRefund as jest.Mock).mockReturnValue({
      refund: { ...mockRefund, supportingDocuments: documentsData },
      isLoading: false,
      error: null,
      getRefund: mockGetRefund,
      cancelRefund: mockCancelRefund,
    });

    const { unmount } = render(<RefundDetails />);
    
    expect(screen.getByText(/Supporting Documents/i)).toBeInTheDocument();
    expect(screen.getByText(/CUSTOMER_EMAIL/i)).toBeInTheDocument();
    expect(screen.getByText(/05\/15\/23/i)).toBeInTheDocument();
    
    unmount();
    
    // Test without documents
    (useRefund as jest.Mock).mockReturnValue({
      refund: { ...mockRefund, supportingDocuments: [] },
      isLoading: false,
      error: null,
      getRefund: mockGetRefund,
      cancelRefund: mockCancelRefund,
    });

    render(<RefundDetails />);
    
    expect(screen.getByText(/Supporting Documents/i)).toBeInTheDocument();
    expect(screen.getByText(/No supporting documents available/i)).toBeInTheDocument();
  });

  test('shows context-specific information based on status', () => {
    const statusContextTestCases = [
      { 
        status: RefundStatus.COMPLETED, 
        expectedContext: 'This refund has been successfully processed'
      },
      { 
        status: RefundStatus.PROCESSING, 
        expectedContext: 'This refund is currently being processed by the payment gateway'
      },
      { 
        status: RefundStatus.PENDING_APPROVAL, 
        expectedContext: 'This refund is waiting for approval'
      },
      { 
        status: RefundStatus.FAILED, 
        expectedContext: 'This refund has failed processing'
      },
    ];

    statusContextTestCases.forEach(({ status, expectedContext }) => {
      (useRefund as jest.Mock).mockReturnValue({
        refund: { ...mockRefund, status },
        isLoading: false,
        error: null,
        getRefund: mockGetRefund,
        cancelRefund: mockCancelRefund,
      });

      const { unmount } = render(<RefundDetails />);
      
      expect(screen.getByText(new RegExp(expectedContext, 'i'))).toBeInTheDocument();
      
      unmount();
    });
  });

  test('shows cancel button only for cancelable refunds', () => {
    // Test statuses where cancel button should be visible
    const cancelableStatuses = [
      RefundStatus.PROCESSING,
      RefundStatus.PENDING_APPROVAL
    ];

    cancelableStatuses.forEach(status => {
      (useRefund as jest.Mock).mockReturnValue({
        refund: { ...mockRefund, status, canCancel: true },
        isLoading: false,
        error: null,
        getRefund: mockGetRefund,
        cancelRefund: mockCancelRefund,
      });

      const { unmount } = render(<RefundDetails />);
      
      expect(screen.getByText(/Cancel Refund/i)).toBeInTheDocument();
      
      unmount();
    });

    // Test statuses where cancel button should NOT be visible
    const nonCancelableStatuses = [
      RefundStatus.COMPLETED,
      RefundStatus.FAILED,
      RefundStatus.CANCELED
    ];

    nonCancelableStatuses.forEach(status => {
      (useRefund as jest.Mock).mockReturnValue({
        refund: { ...mockRefund, status, canCancel: false },
        isLoading: false,
        error: null,
        getRefund: mockGetRefund,
        cancelRefund: mockCancelRefund,
      });

      const { unmount } = render(<RefundDetails />);
      
      expect(screen.queryByText(/Cancel Refund/i)).not.toBeInTheDocument();
      
      unmount();
    });
  });

  test('handles cancel refund action correctly', async () => {
    const user = userEvent.setup();
    
    render(<RefundDetails />);
    
    // Click cancel button
    await user.click(screen.getByText(/Cancel Refund/i));
    
    // Confirmation dialog should appear
    expect(screen.getByText(/Confirm Refund Cancellation/i)).toBeInTheDocument();
    
    // Fill in reason for cancellation
    await user.type(screen.getByTestId('cancellation-reason'), 'Customer changed mind');
    
    // Confirm cancellation
    await user.click(screen.getByText(/Confirm Cancellation/i));
    
    // Check that cancelRefund was called with correct parameters
    expect(mockCancelRefund).toHaveBeenCalledWith('REF10011', 'Customer changed mind');
    
    // Check success message is shown
    await waitFor(() => {
      expect(screen.getByText(/Refund has been successfully cancelled/i)).toBeInTheDocument();
    });
  });

  test('calls getRefund on mount with correct refund ID', () => {
    render(<RefundDetails />);
    
    expect(mockGetRefund).toHaveBeenCalledTimes(1);
    expect(mockGetRefund).toHaveBeenCalledWith('REF10011');
  });

  test('navigates back when back button is clicked', async () => {
    // Mock the navigation function for this specific test
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockImplementation(() => mockNavigate);
    
    const user = userEvent.setup();
    
    render(<RefundDetails />);
    
    // Click back button
    await user.click(screen.getByText(/Back to Refunds/i));
    
    // Check navigation was triggered
    expect(mockNavigate).toHaveBeenCalledWith('/refunds');
  });
});