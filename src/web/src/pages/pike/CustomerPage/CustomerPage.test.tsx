# src/web/src/pages/pike/CustomerPage/CustomerPage.test.tsx
```typescript
import React from 'react'; // react ^18.2.0
import { render, screen, waitFor, fireEvent } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { act } from 'react-dom/test-utils'; // react-dom/test-utils ^18.2.0
import { MemoryRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom'; // react-router-dom ^6.10.0
import CustomerPage from './CustomerPage';
import { renderWithProviders, waitForComponentToPaint, setupUserEvent } from '../../../utils/test.utils';
import CustomerRefundHistory from '../../../components/pike/CustomerRefundHistory';

jest.mock('../../../hooks/useRefund', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useParams: jest.fn(), useNavigate: jest.fn() }));

describe('CustomerPage Component', () => {
  let mockUseParams: jest.SpyInstance;
  let mockUseNavigate: jest.SpyInstance;
  let mockUseRefund: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseParams = jest.spyOn(require('react-router-dom'), 'useParams');
    mockUseNavigate = jest.spyOn(require('react-router-dom'), 'useNavigate');
    mockUseRefund = require('../../../hooks/useRefund').default as jest.Mock;

    mockUseParams.mockReturnValue({ customerId: 'test-customer-id' });
    mockUseNavigate.mockReturnValue(jest.fn());

    mockUseRefund.mockReturnValue({
      currentRefund: null,
      refunds: [],
      pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
      transaction: null,
      statistics: {
        totalCount: 10,
        totalAmount: 1000,
        averageAmount: 100,
        methodDistribution: {},
        statusDistribution: {},
        volumeByDate: [],
        averageProcessingTime: 24
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
  });

  it('should render customer information', async () => {
    renderWithProviders(<CustomerPage />);
    await waitForComponentToPaint(screen);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('ID: test-customer-id')).toBeInTheDocument();
    expect(screen.getByText('Email: john.doe@example.com')).toBeInTheDocument();
  });

  it('should render tab navigation', async () => {
    renderWithProviders(<CustomerPage />);
    await waitForComponentToPaint(screen);

    expect(screen.getByText('Information')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Refunds')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('should change tab when clicked', async () => {
    const user = setupUserEvent();
    renderWithProviders(<CustomerPage />);
    await waitForComponentToPaint(screen);

    await act(async () => {
      await user.click(screen.getByText('Refunds'));
    });

    expect(screen.getByText('Refunds')).toHaveClass('tabs__tab--active');
    expect(screen.getByText('CustomerRefundHistory')).toBeInTheDocument();
  });

  it('should show loading state', async () => {
    mockUseRefund.mockReturnValue({
      currentRefund: null,
      refunds: [],
      pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
      transaction: null,
      statistics: null,
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

    renderWithProviders(<CustomerPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should handle error state', async () => {
    mockUseRefund.mockReturnValue({
      currentRefund: null,
      refunds: [],
      pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
      transaction: null,
      statistics: null,
      loading: false,
      error: 'Failed to fetch data',
      getRefund: jest.fn(),
      getRefunds: jest.fn(),
      createRefund: jest.fn(),
      cancelRefund: jest.fn(),
      getTransactionForRefund: jest.fn(),
      getRefundStatistics: jest.fn(),
      resetRefundState: jest.fn(),
    });

    renderWithProviders(<CustomerPage />);
    await waitForComponentToPaint(screen);

    expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
  });

  it('should navigate back to customers list', async () => {
    const mockNavigate = jest.fn();
    mockUseNavigate.mockReturnValue(mockNavigate);

    renderWithProviders(<CustomerPage />);
    await waitForComponentToPaint(screen);

    const backButton = screen.getByText('Back to Customers');
    await act(async () => {
      fireEvent.click(backButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});