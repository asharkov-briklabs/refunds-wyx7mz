import React from 'react'; // react ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { act } from 'react-dom/test-utils'; // react-dom/test-utils ^18.2.0
import jest from 'jest'; // jest ^29.5.0
import { renderWithProviders } from '../../../utils/test.utils';
import RefundDetailsPage from './RefundDetailsPage';
import { PIKE_ROUTES } from '../../../constants/routes.constants';
import { RefundStatus } from '../../../types/refund.types';

// Mock the useRefund hook
jest.mock('../../../hooks/useRefund', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    currentRefund: {
      refundId: 'refund123',
      transactionId: 'txn123',
      merchantId: 'mer123',
      customerId: 'cust123',
      amount: 50.00,
      currency: 'USD',
      refundMethod: 'ORIGINAL_PAYMENT',
      reasonCode: 'CUSTOMER_REQUEST',
      reason: 'Customer request',
      status: RefundStatus.COMPLETED,
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-02T00:00:00.000Z',
      processedAt: '2023-01-02T00:00:00.000Z',
      completedAt: '2023-01-03T00:00:00.000Z',
      bankAccountId: null,
      approvalId: null,
      gatewayReference: null,
      estimatedCompletionDate: null,
      supportingDocuments: [],
      metadata: null,
      statusHistory: [],
      errors: null,
    },
    loading: false,
    error: null,
    getRefund: jest.fn(),
    getRefunds: jest.fn(),
    createRefund: jest.fn(),
    cancelRefund: jest.fn(),
    getTransactionForRefund: jest.fn(),
    getRefundStatistics: jest.fn(),
    resetRefundState: jest.fn(),
  })),
}));

describe('RefundDetailsPage Component', () => {
  beforeEach(() => {
    (jest.mocked(require('../../../hooks/useRefund').default)).mockClear();
  });

  it('renders loading state initially', () => {
    (require('../../../hooks/useRefund').default as jest.Mock).mockReturnValue({
      currentRefund: null,
      loading: true,
      error: null,
      getRefund: jest.fn(),
      getRefunds: jest.fn(),
      createRefund: jest.fn(),
      cancelRefund: jest.fn(),
      getTransactionForRefund: jest.fn(),
      getRefundStatistics: jest.fn(),
      resetRefundState: jest.fn(),
    });

    renderWithProviders(<RefundDetailsPage />, { route: `${PIKE_ROUTES.REFUNDS}/refund123` });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('fetches the refund using the ID from URL parameters', async () => {
    const getRefundMock = jest.fn();
    (require('../../../hooks/useRefund').default as jest.Mock).mockReturnValue({
      currentRefund: null,
      loading: false,
      error: null,
      getRefund: getRefundMock,
      getRefunds: jest.fn(),
      createRefund: jest.fn(),
      cancelRefund: jest.fn(),
      getTransactionForRefund: jest.fn(),
      getRefundStatistics: jest.fn(),
      resetRefundState: jest.fn(),
    });

    renderWithProviders(<RefundDetailsPage />, { route: `${PIKE_ROUTES.REFUNDS}/refund123` });
    await waitFor(() => expect(getRefundMock).toHaveBeenCalledWith('refund123'));
  });

  it('renders error message when fetching fails', async () => {
    (require('../../../hooks/useRefund').default as jest.Mock).mockReturnValue({
      currentRefund: null,
      loading: false,
      error: 'Failed to fetch refund',
      getRefund: jest.fn(),
      getRefunds: jest.fn(),
      createRefund: jest.fn(),
      cancelRefund: jest.fn(),
      getTransactionForRefund: jest.fn(),
      getRefundStatistics: jest.fn(),
      resetRefundState: jest.fn(),
    });

    renderWithProviders(<RefundDetailsPage />, { route: `${PIKE_ROUTES.REFUNDS}/refund123` });
    await waitFor(() => expect(screen.getByText('Failed to fetch refund')).toBeInTheDocument());
  });

  it('renders refund details when data is loaded', async () => {
    (require('../../../hooks/useRefund').default as jest.Mock).mockReturnValue({
      currentRefund: {
        refundId: 'refund123',
        transactionId: 'txn123',
        merchantId: 'mer123',
        customerId: 'cust123',
        amount: 50.00,
        currency: 'USD',
        refundMethod: 'ORIGINAL_PAYMENT',
        reasonCode: 'CUSTOMER_REQUEST',
        reason: 'Customer request',
        status: RefundStatus.COMPLETED,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z',
        processedAt: '2023-01-02T00:00:00.000Z',
        completedAt: '2023-01-03T00:00:00.000Z',
        bankAccountId: null,
        approvalId: null,
        gatewayReference: null,
        estimatedCompletionDate: null,
        supportingDocuments: [],
        metadata: null,
        statusHistory: [],
        errors: null,
      },
      loading: false,
      error: null,
      getRefund: jest.fn(),
      getRefunds: jest.fn(),
      createRefund: jest.fn(),
      cancelRefund: jest.fn(),
      getTransactionForRefund: jest.fn(),
      getRefundStatistics: jest.fn(),
      resetRefundState: jest.fn(),
    });

    renderWithProviders(<RefundDetailsPage />, { route: `${PIKE_ROUTES.REFUNDS}/refund123` });
    await waitFor(() => expect(screen.getByText('Refund ID: refund123')).toBeInTheDocument());
  });

  it('displays correct breadcrumb navigation', async () => {
    (require('../../../hooks/useRefund').default as jest.Mock).mockReturnValue({
      currentRefund: {
        refundId: 'refund123',
        transactionId: 'txn123',
        merchantId: 'mer123',
        customerId: 'cust123',
        amount: 50.00,
        currency: 'USD',
        refundMethod: 'ORIGINAL_PAYMENT',
        reasonCode: 'CUSTOMER_REQUEST',
        reason: 'Customer request',
        status: RefundStatus.COMPLETED,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z',
        processedAt: '2023-01-02T00:00:00.000Z',
        completedAt: '2023-01-03T00:00:00.000Z',
        bankAccountId: null,
        approvalId: null,
        gatewayReference: null,
        estimatedCompletionDate: null,
        supportingDocuments: [],
        metadata: null,
        statusHistory: [],
        errors: null,
      },
      loading: false,
      error: null,
      getRefund: jest.fn(),
      getRefunds: jest.fn(),
      createRefund: jest.fn(),
      cancelRefund: jest.fn(),
      getTransactionForRefund: jest.fn(),
      getRefundStatistics: jest.fn(),
      resetRefundState: jest.fn(),
    });

    renderWithProviders(<RefundDetailsPage />, { route: `${PIKE_ROUTES.REFUNDS}/refund123` });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Refunds')).toBeInTheDocument();
    expect(screen.getByText('refund123')).toBeInTheDocument();
  });

  it('passes the correct refund data to the RefundDetails component', async () => {
    const mockRefundData = {
      refundId: 'refund123',
      transactionId: 'txn123',
      merchantId: 'mer123',
      customerId: 'cust123',
      amount: 50.00,
      currency: 'USD',
      refundMethod: 'ORIGINAL_PAYMENT',
      reasonCode: 'CUSTOMER_REQUEST',
      reason: 'Customer request',
      status: RefundStatus.COMPLETED,
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-02T00:00:00.000Z',
      processedAt: '2023-01-02T00:00:00.000Z',
      completedAt: '2023-01-03T00:00:00.000Z',
      bankAccountId: null,
      approvalId: null,
      gatewayReference: null,
      estimatedCompletionDate: null,
      supportingDocuments: [],
      metadata: null,
      statusHistory: [],
      errors: null,
    };

    (require('../../../hooks/useRefund').default as jest.Mock).mockReturnValue({
      currentRefund: mockRefundData,
      loading: false,
      error: null,
      getRefund: jest.fn(),
      getRefunds: jest.fn(),
      createRefund: jest.fn(),
      cancelRefund: jest.fn(),
      getTransactionForRefund: jest.fn(),
      getRefundStatistics: jest.fn(),
      resetRefundState: jest.fn(),
    });

    renderWithProviders(<RefundDetailsPage />, { route: `${PIKE_ROUTES.REFUNDS}/refund123` });
    await waitFor(() => expect(screen.getByText('Refund ID: refund123')).toBeInTheDocument());
  });
});