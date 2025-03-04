import React from 'react'; // react ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { CreateRefundPage } from './CreateRefundPage';
import { renderWithProviders, setupUserEvent, waitForComponentToPaint } from '../../../utils/test.utils';
import { useNavigate, useParams, useLocation } from 'react-router-dom'; // react-router-dom ^6.10.0
import { jest } from '@jest/globals'; // jest ^29.5.0

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: jest.fn(),
  useLocation: jest.fn(),
}));

describe('CreateRefundPage component', () => {
  let userEvent: ReturnType<typeof setupUserEvent>;

  beforeEach(() => {
    jest.clearAllMocks();
    userEvent = setupUserEvent();
  });

  it('should render loading state when fetching transaction', async () => {
    (useParams as jest.Mock).mockReturnValue({ transactionId: 'txn123' });

    const { container } = renderWithProviders(<CreateRefundPage />, {
      preloadedState: {
        refund: {
          refunds: [],
          currentRefund: null,
          currentTransaction: null,
          statistics: null,
          pagination: {
            totalItems: 0,
            pageSize: 10,
            page: 1,
            totalPages: 0
          },
          loading: true,
          error: null
        }
      }
    });

    expect(screen.getByText('Loading transaction details...')).toBeInTheDocument();
    expect(container.querySelector('.refund-form')).not.toBeInTheDocument();
  });

  it('should render the form when transaction data is loaded', async () => {
    (useParams as jest.Mock).mockReturnValue({ transactionId: 'txn123' });

    const { container } = renderWithProviders(<CreateRefundPage />, {
      preloadedState: {
        refund: {
          refunds: [],
          currentRefund: null,
          currentTransaction: {
            transactionId: 'txn123',
            customerId: 'cus123',
            customerName: 'John Doe',
            amount: 100,
            currency: 'USD',
            date: '2023-01-01',
            status: 'completed',
            paymentMethod: 'credit_card',
            paymentDetails: {},
            refundEligible: true,
            availableRefundMethods: ['ORIGINAL_PAYMENT'],
            refundedAmount: 0
          },
          statistics: null,
          pagination: {
            totalItems: 0,
            pageSize: 10,
            page: 1,
            totalPages: 0
          },
          loading: false,
          error: null
        }
      }
    });

    await waitForComponentToPaint(renderWithProviders(<CreateRefundPage />, {
        preloadedState: {
          refund: {
            refunds: [],
            currentRefund: null,
            currentTransaction: {
              transactionId: 'txn123',
              customerId: 'cus123',
              customerName: 'John Doe',
              amount: 100,
              currency: 'USD',
              date: '2023-01-01',
              status: 'completed',
              paymentMethod: 'credit_card',
              paymentDetails: {},
              refundEligible: true,
              availableRefundMethods: ['ORIGINAL_PAYMENT'],
              refundedAmount: 0
            },
            statistics: null,
            pagination: {
              totalItems: 0,
              pageSize: 10,
              page: 1,
              totalPages: 0
            },
            loading: false,
            error: null
          }
        }
      }));

    expect(container.querySelector('.refund-form')).toBeInTheDocument();
    expect(screen.getByText('Original Transaction')).toBeInTheDocument();
    expect(screen.getByText('Transaction ID:')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should handle form submission correctly', async () => {
    (useParams as jest.Mock).mockReturnValue({ transactionId: 'txn123' });

    const { container } = renderWithProviders(<CreateRefundPage />, {
      preloadedState: {
        refund: {
          refunds: [],
          currentRefund: null,
          currentTransaction: {
            transactionId: 'txn123',
            customerId: 'cus123',
            customerName: 'John Doe',
            amount: 100,
            currency: 'USD',
            date: '2023-01-01',
            status: 'completed',
            paymentMethod: 'credit_card',
            paymentDetails: {},
            refundEligible: true,
            availableRefundMethods: ['ORIGINAL_PAYMENT'],
            refundedAmount: 0
          },
          statistics: null,
          pagination: {
            totalItems: 0,
            pageSize: 10,
            page: 1,
            totalPages: 0
          },
          loading: false,
          error: null
        }
      }
    });

    await waitForComponentToPaint(renderWithProviders(<CreateRefundPage />, {
        preloadedState: {
          refund: {
            refunds: [],
            currentRefund: null,
            currentTransaction: {
              transactionId: 'txn123',
              customerId: 'cus123',
              customerName: 'John Doe',
              amount: 100,
              currency: 'USD',
              date: '2023-01-01',
              status: 'completed',
              paymentMethod: 'credit_card',
              paymentDetails: {},
              refundEligible: true,
              availableRefundMethods: ['ORIGINAL_PAYMENT'],
              refundedAmount: 0
            },
            statistics: null,
            pagination: {
              totalItems: 0,
              pageSize: 10,
              page: 1,
              totalPages: 0
            },
            loading: false,
            error: null
          }
        }
      }));

    await userEvent.click(screen.getByText('Full Refund'));
    await userEvent.selectOptions(screen.getByLabelText('Reason:'), 'CUSTOMER_REQUEST');
    await userEvent.click(screen.getByText('Process Refund'));

    expect(screen.getByText('Processing...')).toBeInTheDocument();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/refunds/')));
  });

  it('should display error when transaction fetch fails', async () => {
    (useParams as jest.Mock).mockReturnValue({ transactionId: 'txn123' });

    const { container } = renderWithProviders(<CreateRefundPage />, {
      preloadedState: {
        refund: {
          refunds: [],
          currentRefund: null,
          currentTransaction: null,
          statistics: null,
          pagination: {
            totalItems: 0,
            pageSize: 10,
            page: 1,
            totalPages: 0
          },
          loading: false,
          error: 'Failed to fetch transaction'
        }
      }
    });

    expect(screen.getByText('Unable to load transaction details. Please try again.')).toBeInTheDocument();
    expect(container.querySelector('.refund-form')).not.toBeInTheDocument();
  });

  it('should display error when form submission fails', async () => {
    (useParams as jest.Mock).mockReturnValue({ transactionId: 'txn123' });

    const { container } = renderWithProviders(<CreateRefundPage />, {
      preloadedState: {
        refund: {
          refunds: [],
          currentRefund: null,
          currentTransaction: {
            transactionId: 'txn123',
            customerId: 'cus123',
            customerName: 'John Doe',
            amount: 100,
            currency: 'USD',
            date: '2023-01-01',
            status: 'completed',
            paymentMethod: 'credit_card',
            paymentDetails: {},
            refundEligible: true,
            availableRefundMethods: ['ORIGINAL_PAYMENT'],
            refundedAmount: 0
          },
          statistics: null,
          pagination: {
            totalItems: 0,
            pageSize: 10,
            page: 1,
            totalPages: 0
          },
          loading: false,
          error: null
        }
      }
    });

    await waitForComponentToPaint(renderWithProviders(<CreateRefundPage />, {
        preloadedState: {
          refund: {
            refunds: [],
            currentRefund: null,
            currentTransaction: {
              transactionId: 'txn123',
              customerId: 'cus123',
              customerName: 'John Doe',
              amount: 100,
              currency: 'USD',
              date: '2023-01-01',
              status: 'completed',
              paymentMethod: 'credit_card',
              paymentDetails: {},
              refundEligible: true,
              availableRefundMethods: ['ORIGINAL_PAYMENT'],
              refundedAmount: 0
            },
            statistics: null,
            pagination: {
              totalItems: 0,
              pageSize: 10,
              page: 1,
              totalPages: 0
            },
            loading: false,
            error: null
          }
        }
      }));

    (useNavigate as jest.Mock).mockImplementation(() => {
      throw new Error('Submission failed');
    });

    await userEvent.click(screen.getByText('Full Refund'));
    await userEvent.selectOptions(screen.getByLabelText('Reason:'), 'CUSTOMER_REQUEST');
    await userEvent.click(screen.getByText('Process Refund'));

    expect(screen.getByText('Processing...')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Submission failed')).toBeInTheDocument());
    expect(container.querySelector('.refund-form')).toBeInTheDocument();
  });

  it('should navigate back when cancel button is clicked', async () => {
    (useParams as jest.Mock).mockReturnValue({ transactionId: 'txn123' });

    renderWithProviders(<CreateRefundPage />, {
      preloadedState: {
        refund: {
          refunds: [],
          currentRefund: null,
          currentTransaction: {
            transactionId: 'txn123',
            customerId: 'cus123',
            customerName: 'John Doe',
            amount: 100,
            currency: 'USD',
            date: '2023-01-01',
            status: 'completed',
            paymentMethod: 'credit_card',
            paymentDetails: {},
            refundEligible: true,
            availableRefundMethods: ['ORIGINAL_PAYMENT'],
            refundedAmount: 0
          },
          statistics: null,
          pagination: {
            totalItems: 0,
            pageSize: 10,
            page: 1,
            totalPages: 0
          },
          loading: false,
          error: null
        }
      }
    });

    await waitForComponentToPaint(renderWithProviders(<CreateRefundPage />, {
        preloadedState: {
          refund: {
            refunds: [],
            currentRefund: null,
            currentTransaction: {
              transactionId: 'txn123',
              customerId: 'cus123',
              customerName: 'John Doe',
              amount: 100,
              currency: 'USD',
              date: '2023-01-01',
              status: 'completed',
              paymentMethod: 'credit_card',
              paymentDetails: {},
              refundEligible: true,
              availableRefundMethods: ['ORIGINAL_PAYMENT'],
              refundedAmount: 0
            },
            statistics: null,
            pagination: {
              totalItems: 0,
              pageSize: 10,
              page: 1,
              totalPages: 0
            },
            loading: false,
            error: null
          }
        }
      }));

    await userEvent.click(screen.getByText('Cancel'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});