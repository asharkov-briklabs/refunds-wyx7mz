import React from 'react'; // ^18.2.0
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // ^14.0.0
import RefundList from './RefundList';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';
import useRefund from '../../../hooks/useRefund';
import usePagination from '../../../hooks/usePagination';
import { RefundStatus, RefundSummary, RefundMethod } from '../../../types/refund.types';
import jest from 'jest'; // ^29.5.0

// Mock the useRefund hook
jest.mock('../../../hooks/useRefund', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock the usePagination hook
jest.mock('../../../hooks/usePagination', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('RefundList', () => {
  let mockRefunds: RefundSummary[];
  let mockGetRefunds: jest.Mock;
  let mockGoToNextPage: jest.Mock;
  let mockGoToPreviousPage: jest.Mock;
  let mockOnRefundClick: jest.Mock;
  let mockOnCreateRefund: jest.Mock;
  let user: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRefunds = [
      {
        refundId: '1',
        transactionId: 'txn1',
        amount: 100,
        currency: 'USD',
        status: RefundStatus.COMPLETED,
        refundMethod: RefundMethod.ORIGINAL_PAYMENT,
        createdAt: '2023-01-01T00:00:00.000Z',
        customerName: 'John Doe',
        reason: 'Product Defect',
      },
      {
        refundId: '2',
        transactionId: 'txn2',
        amount: 50,
        currency: 'USD',
        status: RefundStatus.PROCESSING,
        refundMethod: RefundMethod.ORIGINAL_PAYMENT,
        createdAt: '2023-01-02T00:00:00.000Z',
        customerName: 'Jane Smith',
        reason: 'Shipping Delay',
      },
    ];

    mockGetRefunds = jest.fn();
    mockGoToNextPage = jest.fn();
    mockGoToPreviousPage = jest.fn();
    mockOnRefundClick = jest.fn();
    mockOnCreateRefund = jest.fn();

    (useRefund as jest.Mock).mockReturnValue({
      refunds: mockRefunds,
      pagination: {
        totalItems: 20,
        pageSize: 10,
        page: 1,
        totalPages: 2,
      },
      loading: false,
      error: null,
      getRefunds: mockGetRefunds,
    });

    (usePagination as jest.Mock).mockReturnValue({
      currentPage: 1,
      totalPages: 2,
      goToNextPage: mockGoToNextPage,
      goToPreviousPage: mockGoToPreviousPage,
    });

    user = setupUserEvent();
  });

  test('renders the refund list with data', async () => {
    renderWithProviders(<RefundList />);

    expect(screen.getByText('Refund ID')).toBeInTheDocument();
    expect(screen.getByText('Transaction ID')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();

    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();

    expect(screen.getByText('Jan 1, 2023')).toBeInTheDocument();
    expect(screen.getByText('Jan 2, 2023')).toBeInTheDocument();
  });

  test('handles empty refund list', () => {
    (useRefund as jest.Mock).mockReturnValue({
      refunds: [],
      pagination: {
        totalItems: 0,
        pageSize: 10,
        page: 1,
        totalPages: 0,
      },
      loading: false,
      error: null,
      getRefunds: mockGetRefunds,
    });

    renderWithProviders(<RefundList />);

    expect(screen.getByText('No refunds found.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Refund' })).toBeInTheDocument();
  });

  test('handles status filtering', async () => {
    renderWithProviders(<RefundList />);

    await fireEvent.click(screen.getByRole('combobox', { name: 'status' }));
    await fireEvent.click(screen.getByText('Completed'));

    expect(mockGetRefunds).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'COMPLETED',
        pagination: {
          page: 1,
          pageSize: 10,
        },
      })
    );
  });

  test('handles pagination', async () => {
    renderWithProviders(<RefundList />);

    expect(screen.getByText('Showing 1 to 2 of 20 items')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(mockGoToNextPage).toHaveBeenCalled();

    await fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(mockGoToPreviousPage).toHaveBeenCalled();
  });

  test('calls onRefundClick when a row is clicked', async () => {
    renderWithProviders(<RefundList onRefundClick={mockOnRefundClick} />);

    const row = screen.getByText('txn1').closest('tr');
    if (row) {
      await user.click(row);
    }

    expect(mockOnRefundClick).toHaveBeenCalledWith(mockRefunds[0]);
  });

  test('calls onCreateRefund when create button is clicked', async () => {
    renderWithProviders(<RefundList onCreateRefund={mockOnCreateRefund} />);

    await fireEvent.click(screen.getByRole('button', { name: 'Create Refund' }));

    expect(mockOnCreateRefund).toHaveBeenCalled();
  });

  test('calls getRefunds when component mounts', () => {
    renderWithProviders(<RefundList />);

    expect(mockGetRefunds).toHaveBeenCalledWith(
      expect.objectContaining({
        pagination: {
          page: 1,
          pageSize: 10,
        },
      })
    );
  });

  test('handles loading state', () => {
    (useRefund as jest.Mock).mockReturnValue({
      refunds: [],
      pagination: {
        totalItems: 0,
        pageSize: 10,
        page: 1,
        totalPages: 0,
      },
      loading: true,
      error: null,
      getRefunds: mockGetRefunds,
    });

    renderWithProviders(<RefundList />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  test('handles error state', () => {
    (useRefund as jest.Mock).mockReturnValue({
      refunds: [],
      pagination: {
        totalItems: 0,
        pageSize: 10,
        page: 1,
        totalPages: 0,
      },
      loading: false,
      error: 'Failed to fetch data',
      getRefunds: mockGetRefunds,
    });

    renderWithProviders(<RefundList />);

    expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});