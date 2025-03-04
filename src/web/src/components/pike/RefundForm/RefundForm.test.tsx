import React from 'react'; // react ^18.2.0
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { RefundForm } from './RefundForm';
import useRefund from '../../../hooks/useRefund';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';
import { TransactionSummary, RefundMethod } from '../../../types/refund.types';
import jest from 'jest'; // jest ^29.5.0

// Mock the useRefund hook
jest.mock('../../../hooks/useRefund', () => ({
  __esModule: true,
  default: jest.fn()
}));

describe('RefundForm', () => {
  let mockTransaction: TransactionSummary;
  let mockCreateRefund: jest.Mock;
  let mockOnSuccess: jest.Mock;
  let mockOnCancel: jest.Mock;
  let user: any;

  beforeEach(() => {
    // Reset mocks
    mockCreateRefund = jest.fn();
    mockOnSuccess = jest.fn();
    mockOnCancel = jest.fn();

    // Set up mock transaction data
    mockTransaction = {
      transactionId: 'txn_123',
      customerId: 'cus_123',
      customerName: 'John Doe',
      amount: 100,
      currency: 'USD',
      date: '2023-08-22',
      status: 'COMPLETED',
      paymentMethod: 'Credit Card',
      paymentDetails: {},
      refundEligible: true,
      availableRefundMethods: [RefundMethod.ORIGINAL_PAYMENT, RefundMethod.BALANCE],
      refundedAmount: 0,
    };

    // Set up mock implementation for useRefund hook
    (useRefund as jest.Mock).mockReturnValue({
      createRefund: mockCreateRefund,
    });

    // Set up userEvent instance
    user = setupUserEvent();
  });

  test('renders the form with transaction data', async () => {
    // Render the component with mock transaction data
    renderWithProviders(<RefundForm transaction={mockTransaction} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    // Verify transaction details are displayed
    expect(screen.getByText(`Transaction ID: ${mockTransaction.transactionId}`)).toBeInTheDocument();
    expect(screen.getByText(`Date: ${mockTransaction.date}`)).toBeInTheDocument();
    expect(screen.getByText(`Amount: ${mockTransaction.amount} ${mockTransaction.currency}`)).toBeInTheDocument();
    expect(screen.getByText(`Customer: ${mockTransaction.customerName}`)).toBeInTheDocument();
    expect(screen.getByText(`Payment Method: ${mockTransaction.paymentMethod}`)).toBeInTheDocument();

    // Verify form fields are rendered
    expect(screen.getByLabelText('Refund Amount')).toBeInTheDocument();
    expect(screen.getByLabelText('Full Refund')).toBeInTheDocument();
    expect(screen.getByLabelText('Refund Method')).toBeInTheDocument();
    expect(screen.getByLabelText('Reason Code')).toBeInTheDocument();
    expect(screen.getByLabelText('Reason Description')).toBeInTheDocument();

    // Verify default refund method is selected
    expect((screen.getByLabelText('Refund Method') as HTMLSelectElement).value).toBe(mockTransaction.availableRefundMethods[0]);
  });

  test('handles full refund checkbox', async () => {
    // Render the component with mock transaction data
    renderWithProviders(<RefundForm transaction={mockTransaction} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    // Verify initial refund amount is empty
    const amountInput = screen.getByLabelText('Refund Amount') as HTMLInputElement;
    expect(amountInput.value).toBe('100.00');

    // Check the full refund checkbox
    const fullRefundCheckbox = screen.getByLabelText('Full Refund') as HTMLInputElement;
    await user.click(fullRefundCheckbox);

    // Verify amount is set to full transaction amount
    expect(amountInput.value).toBe('100.00');

    // Uncheck the full refund checkbox
    await user.click(fullRefundCheckbox);

    // Verify amount remains the same
    expect(amountInput.value).toBe('0.00');
  });

  test('validates refund amount', async () => {
    // Render the component with mock transaction data
    renderWithProviders(<RefundForm transaction={mockTransaction} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const amountInput = screen.getByLabelText('Refund Amount') as HTMLInputElement;
    const submitButton = screen.getByText('Process Refund');

    // Enter invalid (negative) amount
    await user.type(amountInput, '-10');
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('Refund amount must be greater than zero')).toBeInTheDocument();
    });

    // Enter invalid (excessive) amount
    await user.clear(amountInput);
    await user.type(amountInput, '1000');
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('Refund amount cannot exceed original transaction amount')).toBeInTheDocument();
    });

    // Enter valid amount
    await user.clear(amountInput);
    await user.type(amountInput, '50');
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.queryByText('Refund amount must be greater than zero')).not.toBeInTheDocument();
      expect(screen.queryByText('Refund amount cannot exceed original transaction amount')).not.toBeInTheDocument();
    });
  });

  test('validates refund method selection', async () => {
    // Render the component with mock transaction data
    renderWithProviders(<RefundForm transaction={mockTransaction} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const refundMethodSelect = screen.getByLabelText('Refund Method') as HTMLSelectElement;
    const submitButton = screen.getByText('Process Refund');

    // Clear refund method selection
    fireEvent.change(refundMethodSelect, { target: { value: '' } });
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('Please select a refund method')).toBeInTheDocument();
    });

    // Select valid refund method
    fireEvent.change(refundMethodSelect, { target: { value: RefundMethod.ORIGINAL_PAYMENT } });
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.queryByText('Please select a refund method')).not.toBeInTheDocument();
    });
  });

  test('validates reason code and description', async () => {
    // Render the component with mock transaction data
    renderWithProviders(<RefundForm transaction={mockTransaction} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const reasonCodeSelect = screen.getByLabelText('Reason Code') as HTMLSelectElement;
    const reasonDescriptionInput = screen.getByLabelText('Reason Description') as HTMLInputElement;
    const submitButton = screen.getByText('Process Refund');

    // Leave reason code empty
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('Please select a reason code')).toBeInTheDocument();
    });

    // Select valid reason code
    fireEvent.change(reasonCodeSelect, { target: { value: 'CUSTOMER_REQUEST' } });

    // Leave description empty
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('Please provide a reason description')).toBeInTheDocument();
    });

    // Enter valid description
    await user.type(reasonDescriptionInput, 'Customer requested refund');
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.queryByText('Please select a reason code')).not.toBeInTheDocument();
      expect(screen.queryByText('Please provide a reason description')).not.toBeInTheDocument();
    });
  });

  test('handles bank account selection for OTHER method', async () => {
    // Render the component with mock transaction data
    renderWithProviders(<RefundForm transaction={mockTransaction} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const refundMethodSelect = screen.getByLabelText('Refund Method') as HTMLSelectElement;
    const submitButton = screen.getByText('Process Refund');

    // Select OTHER as refund method
    fireEvent.change(refundMethodSelect, { target: { value: RefundMethod.OTHER } });
    await waitFor(() => {
      expect(screen.getByText('Please select a bank account')).toBeInTheDocument();
    });

    // Leave bank account selection empty
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('Please select a bank account')).toBeInTheDocument();
    });

    // Select a bank account
    // Assuming you have a way to select a bank account in your component
    // For example, if you have a select element with bank accounts:
    // const bankAccountSelect = screen.getByLabelText('Bank Account') as HTMLSelectElement;
    // fireEvent.change(bankAccountSelect, { target: { value: 'bank_123' } });

    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.queryByText('Please select a bank account')).not.toBeInTheDocument();
    });
  });

  test('submits the form with valid data', async () => {
    // Render the component with mock transaction data
    renderWithProviders(<RefundForm transaction={mockTransaction} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    // Fill in all required fields with valid data
    const amountInput = screen.getByLabelText('Refund Amount') as HTMLInputElement;
    const refundMethodSelect = screen.getByLabelText('Refund Method') as HTMLSelectElement;
    const reasonCodeSelect = screen.getByLabelText('Reason Code') as HTMLSelectElement;
    const reasonDescriptionInput = screen.getByLabelText('Reason Description') as HTMLInputElement;

    await user.type(amountInput, '50');
    fireEvent.change(refundMethodSelect, { target: { value: RefundMethod.ORIGINAL_PAYMENT } });
    fireEvent.change(reasonCodeSelect, { target: { value: 'CUSTOMER_REQUEST' } });
    await user.type(reasonDescriptionInput, 'Customer requested refund');

    // Mock successful API response
    mockCreateRefund.mockResolvedValue(undefined);

    // Submit the form
    const submitButton = screen.getByText('Process Refund');
    fireEvent.click(submitButton);

    // Verify createRefund function was called with correct data
    expect(mockCreateRefund).toHaveBeenCalledWith(expect.objectContaining({
      transactionId: mockTransaction.transactionId,
      amount: 50,
      refundMethod: RefundMethod.ORIGINAL_PAYMENT,
      reasonCode: 'CUSTOMER_REQUEST',
      reason: 'Customer requested refund',
    }));

    // Verify onSuccess callback was called
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(mockTransaction.transactionId);
    });

    // Verify no error messages are displayed
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('handles submission errors', async () => {
    // Render the component with mock transaction data
    renderWithProviders(<RefundForm transaction={mockTransaction} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    // Fill in all required fields with valid data
    const amountInput = screen.getByLabelText('Refund Amount') as HTMLInputElement;
    const refundMethodSelect = screen.getByLabelText('Refund Method') as HTMLSelectElement;
    const reasonCodeSelect = screen.getByLabelText('Reason Code') as HTMLSelectElement;
    const reasonDescriptionInput = screen.getByLabelText('Reason Description') as HTMLInputElement;

    await user.type(amountInput, '50');
    fireEvent.change(refundMethodSelect, { target: { value: RefundMethod.ORIGINAL_PAYMENT } });
    fireEvent.change(reasonCodeSelect, { target: { value: 'CUSTOMER_REQUEST' } });
    await user.type(reasonDescriptionInput, 'Customer requested refund');

    // Mock API failure response
    mockCreateRefund.mockRejectedValue(new Error('API error'));

    // Submit the form
    const submitButton = screen.getByText('Process Refund');
    fireEvent.click(submitButton);

    // Verify createRefund function was called
    expect(mockCreateRefund).toHaveBeenCalled();

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Verify onSuccess callback was not called
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  test('calls onCancel when cancel button is clicked', async () => {
    // Render the component with mock transaction data and mock onCancel callback
    renderWithProviders(<RefundForm transaction={mockTransaction} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    // Click the cancel button
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Verify onCancel callback was called
    expect(mockOnCancel).toHaveBeenCalled();
  });
});