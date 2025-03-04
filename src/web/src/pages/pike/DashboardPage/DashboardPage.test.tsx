import React from 'react'; // react ^18.2.0
import { render, waitFor, screen } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';
import DashboardPage from './DashboardPage';
import { RefundStatus } from '../../../types/refund.types'; // Import RefundStatus enum

// Mock useNavigate hook from react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // Use actual implementation for other parts
  useNavigate: jest.fn(), // Mock useNavigate
}));

// Mock useAuth hook
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

// Mock useRefund hook
jest.mock('../../../hooks/useRefund', () => ({
  useRefund: jest.fn(),
}));

describe('DashboardPage', () => {
  // Mock data for testing
  const mockUser = {
    id: 'user_123',
    name: 'Test Merchant',
    email: 'merchant@example.com',
    role: 'MERCHANT_ADMIN',
    merchantId: 'merchant_abc123',
  };

  const mockStats = {
    totalAmount: 1234.56,
    refundCount: 42,
    averageProcessingTime: 2.4,
    successRate: 98.7,
  };

  const mockRefunds = [
    {
      refundId: 'ref_123',
      transactionId: 'txn_456',
      amount: 99.99,
      currency: 'USD',
      status: RefundStatus.COMPLETED,
      refundMethod: 'ORIGINAL_PAYMENT',
      createdAt: '2023-05-15T10:30:00Z',
      customerName: 'John Doe',
      reason: 'Customer request',
    },
    {
      refundId: 'ref_124',
      transactionId: 'txn_457',
      amount: 45.00,
      currency: 'USD',
      status: RefundStatus.PROCESSING,
      refundMethod: 'BALANCE',
      createdAt: '2023-05-14T14:20:00Z',
      customerName: 'Jane Smith',
      reason: 'Product unsatisfactory',
    },
  ];

  // Test: renders the dashboard page with metrics and sections
  test('renders the dashboard page with metrics and sections', async () => {
    // Arrange: Mock useNavigate, useAuth, and useRefund hooks
    const mockNavigate = jest.fn();
    (require('react-router-dom').useNavigate as jest.Mock).mockReturnValue(mockNavigate);

    (require('../../../hooks/useAuth').useAuth as jest.Mock).mockReturnValue({
      currentUser: mockUser,
      isAuthenticated: true,
    });

    const mockGetRefundStatistics = jest.fn();
    (require('../../../hooks/useRefund').useRefund as jest.Mock).mockReturnValue({
      statistics: mockStats,
      loading: false,
      getRefundStatistics: mockGetRefundStatistics,
    });

    // Act: Render the DashboardPage component with mocked providers
    renderWithProviders(<DashboardPage />);

    // Assert: Check that key metrics are displayed (total amount, refund count, etc.)
    await waitFor(() => {
      expect(screen.getByText(`$${mockStats.totalAmount}`)).toBeInTheDocument();
      expect(screen.getByText(String(mockStats.refundCount))).toBeInTheDocument();
      expect(screen.getByText(String(mockStats.averageProcessingTime))).toBeInTheDocument();
      expect(screen.getByText(`${mockStats.successRate}%`)).toBeInTheDocument();
    });

    // Assert: Verify that Recent Refunds section is rendered
    expect(screen.getByText('Recent Refunds')).toBeInTheDocument();

    // Assert: Verify that Bank Accounts section is rendered
    expect(screen.getByText('Bank Accounts')).toBeInTheDocument();

    // Assert: Expect the getRefundStatistics function to have been called
    expect(mockGetRefundStatistics).toHaveBeenCalled();
  });

  // Test: displays loading state when fetching data
  test('displays loading state when fetching data', () => {
    // Arrange: Mock useRefund hook with loading state set to true
    (require('../../../hooks/useRefund').useRefund as jest.Mock).mockReturnValue({
      statistics: null,
      loading: true,
      getRefundStatistics: jest.fn(),
    });

    // Act: Render the DashboardPage component
    renderWithProviders(<DashboardPage />);

    // Assert: Verify that loading indicators are displayed
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Assert: Verify that metrics are not displayed while loading
    expect(screen.queryByText(`$${mockStats.totalAmount}`)).not.toBeInTheDocument();
  });

  // Test: navigates to create refund page when button is clicked
  test('navigates to create refund page when button is clicked', async () => {
    // Arrange: Mock useNavigate, useAuth, and useRefund hooks
    const mockNavigate = jest.fn();
    (require('react-router-dom').useNavigate as jest.Mock).mockReturnValue(mockNavigate);

    (require('../../../hooks/useAuth').useAuth as jest.Mock).mockReturnValue({
      currentUser: mockUser,
      isAuthenticated: true,
    });

    (require('../../../hooks/useRefund').useRefund as jest.Mock).mockReturnValue({
      statistics: mockStats,
      loading: false,
      getRefundStatistics: jest.fn(),
    });

    // Act: Render the DashboardPage component
    renderWithProviders(<DashboardPage />);

    // Arrange: Find and click the Create Refund button
    const createRefundButton = screen.getByText('Create Refund');
    const user = setupUserEvent();
    await user.click(createRefundButton);

    // Assert: Verify that the navigate function was called with the correct path
    expect(mockNavigate).toHaveBeenCalledWith('/refunds/create');
  });

  // Test: navigates to refund details when a refund is clicked
  test('navigates to refund details when a refund is clicked', async () => {
    // Arrange: Mock useNavigate, useAuth, and useRefund hooks
    const mockNavigate = jest.fn();
    (require('react-router-dom').useNavigate as jest.Mock).mockReturnValue(mockNavigate);

    (require('../../../hooks/useAuth').useAuth as jest.Mock).mockReturnValue({
      currentUser: mockUser,
      isAuthenticated: true,
    });

    (require('../../../hooks/useRefund').useRefund as jest.Mock).mockReturnValue({
      statistics: mockStats,
      loading: false,
      refunds: mockRefunds,
      getRefundStatistics: jest.fn(),
    });

    // Act: Render the DashboardPage component
    renderWithProviders(<DashboardPage />);

    // Arrange: Find and click on a refund row
    const refundRow = await screen.findByText(mockRefunds[0].refundId);
    const user = setupUserEvent();
    await user.click(refundRow);

    // Assert: Verify that the navigate function was called with the correct refund details path
    expect(mockNavigate).toHaveBeenCalledWith(`/refunds/${mockRefunds[0].refundId}`);
  });
});