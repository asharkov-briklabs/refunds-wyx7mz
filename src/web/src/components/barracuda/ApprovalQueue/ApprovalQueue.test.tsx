import React from 'react'; // ^18.2.0
import { screen, waitFor, within } from '@testing-library/react'; // ^14.0.0
import { describe, it, expect, vi, beforeEach } from 'vitest'; // ^0.32.0
import ApprovalQueue from './ApprovalQueue';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';
import { RefundStatus } from '../../../types/refund.types';
import userEvent from '@testing-library/user-event';

describe('ApprovalQueue Component', () => {
  // LD1: Set up mocks for the Redux store and API calls
  const mockGetRefunds = vi.fn();
  const mockApproveRefund = vi.fn();
  const mockRejectRefund = vi.fn();

  // LD1: Group related tests for the ApprovalQueue component
  beforeEach(() => {
    // LD1: Reset all mocks
    vi.clearAllMocks();

    // LD1: Set up a clean testing environment for each test
    vi.mock('../../../hooks/useRefund', () => ({
      default: () => ({
        refunds: [],
        getRefunds: mockGetRefunds,
        loading: false,
        error: null,
        cancelRefund: vi.fn(),
      }),
    }));

    vi.mock('../../../services/api/refund.api', () => ({
      approveRefund: mockApproveRefund,
      rejectRefund: mockRejectRefund,
    }));
  });

  it('renders the approval queue with loading state', async () => {
    // LD1: Mock the loading state to be true
    vi.mock('../../../hooks/useRefund', () => ({
      default: () => ({
        refunds: [],
        getRefunds: mockGetRefunds,
        loading: true,
        error: null,
        cancelRefund: vi.fn(),
      }),
    }));

    // LD1: Render the ApprovalQueue component
    renderWithProviders(<ApprovalQueue />);

    // LD1: Verify that a loading indicator is displayed
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders empty state when no approvals are pending', async () => {
    // LD1: Mock an empty array of refunds
    vi.mock('../../../hooks/useRefund', () => ({
      default: () => ({
        refunds: [],
        getRefunds: mockGetRefunds,
        loading: false,
        error: null,
        cancelRefund: vi.fn(),
      }),
    }));

    // LD1: Render the ApprovalQueue component
    renderWithProviders(<ApprovalQueue />);

    // LD1: Verify that an empty state message is displayed
    expect(screen.getByText('No refunds pending approval')).toBeInTheDocument();

    // LD1: Check that the table is not displayed
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders the approval queue with refund requests', async () => {
    // LD1: Mock an array of refund requests with PENDING_APPROVAL status
    const mockRefunds = [
      { refundId: '1', transactionId: 'TXN123', amount: 100, currency: 'USD', createdAt: '2023-01-01', status: RefundStatus.PENDING_APPROVAL, customerName: 'John Doe', reason: 'Test' },
      { refundId: '2', transactionId: 'TXN456', amount: 200, currency: 'EUR', createdAt: '2023-01-02', status: RefundStatus.PENDING_APPROVAL, customerName: 'Jane Smith', reason: 'Test' },
    ];

    vi.mock('../../../hooks/useRefund', () => ({
      default: () => ({
        refunds: mockRefunds,
        getRefunds: mockGetRefunds,
        loading: false,
        error: null,
        cancelRefund: vi.fn(),
      }),
    }));

    // LD1: Render the ApprovalQueue component
    renderWithProviders(<ApprovalQueue />);

    // LD1: Verify that the table is displayed
    expect(screen.getByRole('table')).toBeInTheDocument();

    // LD1: Check that each refund request is rendered in the table
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('TXN123')).toBeInTheDocument();
    expect(screen.getByText('$ 100')).toBeInTheDocument();
    expect(screen.getByText('Jan 1, 2023')).toBeInTheDocument();
    expect(screen.getByText('Pending Approval')).toBeInTheDocument();
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('TXN456')).toBeInTheDocument();
    expect(screen.getByText('€ 200')).toBeInTheDocument();
    expect(screen.getByText('Jan 2, 2023')).toBeInTheDocument();

    // LD1: Verify correct columns are displayed (ID, Merchant, Amount, Customer, Date, Status, Actions)
    const table = screen.getByRole('table');
    const headers = within(table).getAllRole('columnheader');
    expect(headers).toHaveLength(6);
    expect(headers[0]).toHaveTextContent('Refund ID');
    expect(headers[1]).toHaveTextContent('Transaction ID');
    expect(headers[2]).toHaveTextContent('Amount');
    expect(headers[3]).toHaveTextContent('Date');
    expect(headers[4]).toHaveTextContent('Status');
    expect(headers[5]).toHaveTextContent('Actions');
  });

  it('allows filtering refunds by search term', async () => {
    // LD1: Mock an array of refund requests
    vi.mock('../../../hooks/useRefund', () => ({
      default: () => ({
        refunds: [],
        getRefunds: mockGetRefunds,
        loading: false,
        error: null,
        cancelRefund: vi.fn(),
      }),
    }));

    // LD1: Render the ApprovalQueue component
    renderWithProviders(<ApprovalQueue />);

    // LD1: Find the search input field
    const searchInput = screen.getByLabelText('Search');

    // LD1: Type a search term in the field
    const searchTerm = 'TXN123';
    await userEvent.type(searchInput, searchTerm);

    // LD1: Verify that the getRefunds function is called with the search term
    expect(mockGetRefunds).toHaveBeenCalledWith({ searchQuery: searchTerm, status: [RefundStatus.PENDING_APPROVAL] });

    // LD1: Verify the search term is correctly applied to the filter
    expect(searchInput).toHaveValue(searchTerm);
  });

  it('allows filtering refunds by date range', async () => {
    // LD1: Mock an array of refund requests
    vi.mock('../../../hooks/useRefund', () => ({
      default: () => ({
        refunds: [],
        getRefunds: mockGetRefunds,
        loading: false,
        error: null,
        cancelRefund: vi.fn(),
      }),
    }));

    // LD1: Render the ApprovalQueue component
    renderWithProviders(<ApprovalQueue />);

    // LD1: Find the date range selector component
    const dateRangeSelector = screen.getByLabelText('Time Period');

    // LD1: Select a date range
    await userEvent.selectOptions(dateRangeSelector, 'Last 30 Days');

    // LD1: Verify that the getRefunds function is called with the date range
    expect(mockGetRefunds).toHaveBeenCalled();

    // LD1: Verify the date range is correctly applied to the filter
    expect(mockGetRefunds).toHaveBeenCalledWith(expect.objectContaining({
      dateRange: expect.any(Object),
      status: [RefundStatus.PENDING_APPROVAL]
    }));
  });

  it('opens approval confirmation dialog when approve button is clicked', async () => {
    // LD1: Mock an array of refund requests
    const mockRefunds = [
      { refundId: '1', transactionId: 'TXN123', amount: 100, currency: 'USD', createdAt: '2023-01-01', status: RefundStatus.PENDING_APPROVAL, customerName: 'John Doe', reason: 'Test' },
    ];

    vi.mock('../../../hooks/useRefund', () => ({
      default: () => ({
        refunds: mockRefunds,
        getRefunds: mockGetRefunds,
        loading: false,
        error: null,
        cancelRefund: vi.fn(),
      }),
    }));

    // LD1: Render the ApprovalQueue component
    renderWithProviders(<ApprovalQueue />);
    const setupUser = setupUserEvent();

    // LD1: Find an approve button for a refund request
    const approveButton = screen.getByRole('button', { name: 'Approve' });

    // LD1: Click the approve button
    await setupUser.click(approveButton);

    // LD1: Verify that the approval confirmation dialog is displayed
    expect(screen.getByRole('dialog', { name: 'Approve Refund' })).toBeInTheDocument();

    // LD1: Check that the dialog contains the correct refund information
    expect(screen.getByText('Are you sure you want to approve this refund?')).toBeInTheDocument();

    // LD1: Verify that the notes field is present
    expect(screen.getByLabelText('Notes')).toBeInTheDocument();
  });

  it('opens rejection confirmation dialog when reject button is clicked', async () => {
    // LD1: Mock an array of refund requests
    const mockRefunds = [
      { refundId: '1', transactionId: 'TXN123', amount: 100, currency: 'USD', createdAt: '2023-01-01', status: RefundStatus.PENDING_APPROVAL, customerName: 'John Doe', reason: 'Test' },
    ];

    vi.mock('../../../hooks/useRefund', () => ({
      default: () => ({
        refunds: mockRefunds,
        getRefunds: mockGetRefunds,
        loading: false,
        error: null,
        cancelRefund: vi.fn(),
      }),
    }));

    // LD1: Render the ApprovalQueue component
    renderWithProviders(<ApprovalQueue />);
    const setupUser = setupUserEvent();

    // LD1: Find a reject button for a refund request
    const rejectButton = screen.getByRole('button', { name: 'Reject' });

    // LD1: Click the reject button
    await setupUser.click(rejectButton);

    // LD1: Verify that the rejection confirmation dialog is displayed
    expect(screen.getByRole('dialog', { name: 'Reject Refund' })).toBeInTheDocument();

    // LD1: Check that the dialog contains the correct refund information
    expect(screen.getByText('Are you sure you want to reject this refund?')).toBeInTheDocument();

    // LD1: Verify that the reason field is present and required
    expect(screen.getByLabelText('Rejection Reason')).toBeInTheDocument();
  });

  it('calls the appropriate API when a refund is approved', async () => {
    // LD1: Mock an array of refund requests
    const mockRefunds = [
      { refundId: '1', transactionId: 'TXN123', amount: 100, currency: 'USD', createdAt: '2023-01-01', status: RefundStatus.PENDING_APPROVAL, customerName: 'John Doe', reason: 'Test' },
    ];

    // LD1: Mock the approveRefund API function
    mockApproveRefund.mockResolvedValue({ success: true });

    vi.mock('../../../hooks/useRefund', () => ({
      default: () => ({
        refunds: mockRefunds,
        getRefunds: mockGetRefunds,
        loading: false,
        error: null,
        cancelRefund: vi.fn(),
      }),
    }));

    // LD1: Render the ApprovalQueue component
    renderWithProviders(<ApprovalQueue />);
    const setupUser = setupUserEvent();

    // LD1: Open the approval confirmation dialog
    const approveButton = screen.getByRole('button', { name: 'Approve' });
    await setupUser.click(approveButton);

    // LD1: Enter approval notes
    const notesInput = screen.getByLabelText('Notes');
    const approvalNotes = 'Approval notes';
    await setupUser.type(notesInput, approvalNotes);

    // LD1: Click the confirm button
    const confirmButton = screen.getByRole('button', { name: 'Approve' });
    await setupUser.click(confirmButton);

    // LD1: Verify that the approveRefund function is called with the correct refund ID and notes
    expect(mockApproveRefund).toHaveBeenCalledWith('1', approvalNotes);

    // LD1: Verify that a success message is displayed
    await waitFor(() => {
      expect(screen.getByText('Approval confirmed with notes: Approval notes')).toBeInTheDocument();
    });

    // LD1: Check that the refund list is refreshed
    expect(mockGetRefunds).toHaveBeenCalled();
  });

  it('calls the appropriate API when a refund is rejected', async () => {
    // LD1: Mock an array of refund requests
    const mockRefunds = [
      { refundId: '1', transactionId: 'TXN123', amount: 100, currency: 'USD', createdAt: '2023-01-01', status: RefundStatus.PENDING_APPROVAL, customerName: 'John Doe', reason: 'Test' },
    ];

    // LD1: Mock the rejectRefund API function
    mockRejectRefund.mockResolvedValue({ success: true });

    vi.mock('../../../hooks/useRefund', () => ({
      default: () => ({
        refunds: mockRefunds,
        getRefunds: mockGetRefunds,
        loading: false,
        error: null,
        cancelRefund: vi.fn(),
      }),
    }));

    // LD1: Render the ApprovalQueue component
    renderWithProviders(<ApprovalQueue />);
    const setupUser = setupUserEvent();

    // LD1: Open the rejection confirmation dialog
    const rejectButton = screen.getByRole('button', { name: 'Reject' });
    await setupUser.click(rejectButton);

    // LD1: Enter rejection reason
    const reasonInput = screen.getByLabelText('Rejection Reason');
    const rejectionReason = 'Rejection reason';
    await setupUser.type(reasonInput, rejectionReason);

    // LD1: Click the confirm button
    const confirmButton = screen.getByRole('button', { name: 'Reject' });
    await setupUser.click(confirmButton);

    // LD1: Verify that the rejectRefund function is called with the correct refund ID and reason
    expect(mockRejectRefund).toHaveBeenCalledWith('1', rejectionReason);

    // LD1: Verify that a success message is displayed
    await waitFor(() => {
      expect(screen.getByText('Rejection confirmed with reason: Rejection reason')).toBeInTheDocument();
    });

    // LD1: Check that the refund list is refreshed
    expect(mockGetRefunds).toHaveBeenCalled();
  });

  it('validates that rejection reason is required', async () => {
    // LD1: Mock an array of refund requests
    const mockRefunds = [
      { refundId: '1', transactionId: 'TXN123', amount: 100, currency: 'USD', createdAt: '2023-01-01', status: RefundStatus.PENDING_APPROVAL, customerName: 'John Doe', reason: 'Test' },
    ];

    vi.mock('../../../hooks/useRefund', () => ({
      default: () => ({
        refunds: mockRefunds,
        getRefunds: mockGetRefunds,
        loading: false,
        error: null,
        cancelRefund: vi.fn(),
      }),
    }));

    // LD1: Render the ApprovalQueue component
    renderWithProviders(<ApprovalQueue />);
    const setupUser = setupUserEvent();

    // LD1: Open the rejection confirmation dialog
    const rejectButton = screen.getByRole('button', { name: 'Reject' });
    await setupUser.click(rejectButton);

    // LD1: Leave the rejection reason empty
    // LD1: Click the confirm button
    const confirmButton = screen.getByRole('button', { name: 'Reject' });
    await setupUser.click(confirmButton);

    // LD1: Verify that an error message is displayed
    expect(screen.getByText('Please provide a reason')).toBeInTheDocument();

    // LD1: Check that the rejectRefund function is not called
    expect(mockRejectRefund).not.toHaveBeenCalled();
  });

  it('shows error message when approval fails', async () => {
    // LD1: Mock an array of refund requests
    const mockRefunds = [
      { refundId: '1', transactionId: 'TXN123', amount: 100, currency: 'USD', createdAt: '2023-01-01', status: RefundStatus.PENDING_APPROVAL, customerName: 'John Doe', reason: 'Test' },
    ];

    // LD1: Mock the approveRefund API function to throw an error
    mockApproveRefund.mockRejectedValue(new Error('Approval failed'));

    vi.mock('../../../hooks/useRefund', () => ({
      default: () => ({
        refunds: mockRefunds,
        getRefunds: mockGetRefunds,
        loading: false,
        error: null,
        cancelRefund: vi.fn(),
      }),
    }));

    // LD1: Render the ApprovalQueue component
    renderWithProviders(<ApprovalQueue />);
    const setupUser = setupUserEvent();

    // LD1: Complete the approval flow
    const approveButton = screen.getByRole('button', { name: 'Approve' });
    await setupUser.click(approveButton);

    const notesInput = screen.getByLabelText('Notes');
    const approvalNotes = 'Approval notes';
    await setupUser.type(notesInput, approvalNotes);

    const confirmButton = screen.getByRole('button', { name: 'Approve' });
    await setupUser.click(confirmButton);

    // LD1: Verify that an error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Approval failed')).toBeInTheDocument();
    });

    // LD1: Check that the dialog remains open
    expect(screen.getByRole('dialog', { name: 'Approve Refund' })).toBeInTheDocument();
  });

  it('shows error message when rejection fails', async () => {
    // LD1: Mock an array of refund requests
    const mockRefunds = [
      { refundId: '1', transactionId: 'TXN123', amount: 100, currency: 'USD', createdAt: '2023-01-01', status: RefundStatus.PENDING_APPROVAL, customerName: 'John Doe', reason: 'Test' },
    ];

    // LD1: Mock the rejectRefund API function to throw an error
    mockRejectRefund.mockRejectedValue(new Error('Rejection failed'));

    vi.mock('../../../hooks/useRefund', () => ({
      default: () => ({
        refunds: mockRefunds,
        getRefunds: mockGetRefunds,
        loading: false,
        error: null,
        cancelRefund: vi.fn(),
      }),
    }));

    // LD1: Render the ApprovalQueue component
    renderWithProviders(<ApprovalQueue />);
    const setupUser = setupUserEvent();

    // LD1: Complete the rejection flow
    const rejectButton = screen.getByRole('button', { name: 'Reject' });
    await setupUser.click(rejectButton);

    const reasonInput = screen.getByLabelText('Rejection Reason');
    const rejectionReason = 'Rejection reason';
    await setupUser.type(reasonInput, rejectionReason);

    const confirmButton = screen.getByRole('button', { name: 'Reject' });
    await setupUser.click(confirmButton);

    // LD1: Verify that an error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Rejection failed')).toBeInTheDocument();
    });

    // LD1: Check that the dialog remains open
    expect(screen.getByRole('dialog', { name: 'Reject Refund' })).toBeInTheDocument();
  });
});