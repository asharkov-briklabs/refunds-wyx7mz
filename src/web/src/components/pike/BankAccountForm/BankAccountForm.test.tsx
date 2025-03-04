import React from 'react'; // react ^18.2.0
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event ^14.4.3
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';
import BankAccountForm from './BankAccountForm';
import { BankAccountType, BankAccountVerificationMethod } from '../../../types/bank-account.types';
import { jest } from '@testing-library/jest-dom'; // jest ^29.5.0

describe('BankAccountForm', () => {
  const setup = (props = {}) => {
    const defaultProps = {
      accountData: undefined,
      onSubmit: jest.fn(),
      onCancel: jest.fn(),
      isLoading: false,
      className: '',
    };
    const testProps = { ...defaultProps, ...props };
    const user = setupUserEvent();
    const rendered = renderWithProviders(<BankAccountForm {...testProps} />);
    return { user, rendered, props: testProps };
  };

  const fillFormValidData = async () => {
    await userEvent.type(screen.getByLabelText('Account Holder Name'), 'John Doe');
    await userEvent.type(screen.getByLabelText('Routing Number'), '123456789');
    await userEvent.type(screen.getByLabelText('Account Number'), '1234567890');
    await userEvent.type(screen.getByLabelText('Confirm Account Number'), '1234567890');
    fireEvent.change(screen.getByLabelText('Account Type'), { target: { value: BankAccountType.CHECKING } });
  };

  it('renders correctly with empty form for new account', () => {
    const { rendered } = setup();
    expect(screen.getByLabelText('Account Holder Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Routing Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Account Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Account Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Account Type')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
  });

  it('renders with existing account data when editing', () => {
    const accountData = {
      accountId: '123',
      merchantId: '456',
      accountHolderName: 'Existing Account',
      accountType: BankAccountType.SAVINGS,
      routingNumber: '987654321',
      accountNumberLast4: '1234',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      verificationMethod: BankAccountVerificationMethod.MICRO_DEPOSIT,
      isDefault: true,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-02',
    };
    const { rendered } = setup({ accountData: accountData });
    expect(screen.getByLabelText('Account Holder Name')).toHaveValue(accountData.accountHolderName);
    expect(screen.getByLabelText('Routing Number')).toHaveValue(accountData.routingNumber);
    expect(screen.getByLabelText('Account Number')).toHaveValue('');
    expect(screen.getByLabelText('Confirm Account Number')).toHaveValue('');
  });

  it('validates required fields', async () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => {
      expect(screen.getByText('The Account Holder Name field is required.')).toBeInTheDocument();
      expect(screen.getByText('The Routing Number field is required.')).toBeInTheDocument();
      expect(screen.getByText('The Account Number field is required.')).toBeInTheDocument();
      expect(screen.getByText('The Confirm Account Number field is required.')).toBeInTheDocument();
    });
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('validates routing number format', async () => {
    const { user } = setup();
    await userEvent.type(screen.getByLabelText('Routing Number'), '12345678');
    expect(screen.getByText('Invalid routing number. Please enter a valid 9-digit routing number.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Routing Number'), '9');
    expect(() => screen.getByText('Invalid routing number. Please enter a valid 9-digit routing number.')).not.toThrow();
  });

  it('validates account numbers match', async () => {
    const { user } = setup();
    await userEvent.type(screen.getByLabelText('Account Number'), '1234567890');
    await userEvent.type(screen.getByLabelText('Confirm Account Number'), '0987654321');
    expect(screen.getByText('Account numbers must match.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Confirm Account Number'), '1234567890');
    expect(() => screen.getByText('Account numbers must match.')).toThrow();
  });

  it('toggles verification options when checkbox is clicked', async () => {
    const { user } = setup();
    expect(screen.queryByLabelText('Verification Method')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Verify Account Now'));
    expect(screen.getByLabelText('Verification Method')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Verify Account Now'));
    expect(screen.queryByLabelText('Verification Method')).not.toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    const { props } = setup();
    await fillFormValidData();
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => {
      expect(props.onSubmit).toHaveBeenCalled();
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.onCancel).toHaveBeenCalled();
  });

  it('disables form submission when isLoading is true', () => {
    const { rendered } = setup({ isLoading: true });
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveTextContent('Submitting...');
  });

  it('shows proper error messages with different validation scenarios', async () => {
    const { user } = setup();
    await userEvent.type(screen.getByLabelText('Account Holder Name'), '');
    await userEvent.type(screen.getByLabelText('Routing Number'), 'invalid');
    await userEvent.type(screen.getByLabelText('Account Number'), 'invalid');
    await userEvent.type(screen.getByLabelText('Confirm Account Number'), 'invalid');
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => {
      expect(screen.getByText('The Account Holder Name field is required.')).toBeInTheDocument();
      expect(screen.getByText('Invalid routing number. Please enter a valid 9-digit routing number.')).toBeInTheDocument();
      expect(screen.getByText('Account numbers must match.')).toBeInTheDocument();
    });
  });
});