# src/web/src/pages/pike/CreateBankAccountPage/CreateBankAccountPage.test.tsx
```typescript
import React from 'react'; // react ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { act } from 'react-dom/test-utils'; // react-dom/test-utils ^18.2.0
import { MockedFunction } from 'jest-mock'; // jest-mock ^29.5.0
import CreateBankAccountPage from './CreateBankAccountPage';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';
import { PIKE_ROUTES, BASE_ROUTES } from '../../../constants/routes.constants';
import { BankAccountFormData } from '../../../types/bank-account.types';

// Mock the useNavigate hook
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Mock the useBankAccount hook
jest.mock('../../../hooks/useBankAccount', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock the useToast hook
jest.mock('../../../hooks/useToast', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('CreateBankAccountPage', () => {
  let navigate: MockedFunction<any>;
  let useBankAccount: MockedFunction<any>;
  let useToast: MockedFunction<any>;
  let createBankAccount: MockedFunction<any>;
  let showSuccessToast: MockedFunction<any>;
  let showErrorToast: MockedFunction<any>;
  let setupUser: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Configure mock implementation for navigation hook
    navigate = jest.fn();
    (require('react-router-dom').useNavigate as MockedFunction<any>).mockReturnValue(navigate);

    // Configure mock implementation for useBankAccount hook
    useBankAccount = require('../../../hooks/useBankAccount').default as MockedFunction<any>;
    createBankAccount = jest.fn().mockResolvedValue({});
    useBankAccount.mockReturnValue({
      createBankAccount,
      loading: false,
      error: null,
    });

    // Configure mock implementation for useToast hook
    useToast = require('../../../hooks/useToast').default as MockedFunction<any>;
    showSuccessToast = jest.fn();
    showErrorToast = jest.fn();
    useToast.mockReturnValue({
      success: showSuccessToast,
      error: showErrorToast,
    });

    setupUser = setupUserEvent();
  });

  it('should render bank account creation form', async () => {
    // Render component with test providers
    renderWithProviders(<CreateBankAccountPage />);

    // Check that page title is displayed
    expect(screen.getByText('Add Bank Account')).toBeInTheDocument();

    // Check that form fields are rendered
    expect(screen.getByLabelText('Account Holder Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Account Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Routing Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Account Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Account Number')).toBeInTheDocument();

    // Check that submit and cancel buttons are rendered
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('should submit bank account form with valid data', async () => {
    // Render component with test providers
    renderWithProviders(<CreateBankAccountPage />);

    // Set up user event for interactions
    const user = setupUserEvent();

    // Fill out form fields with valid data
    await user.type(screen.getByLabelText('Account Holder Name'), 'John Doe');
    await user.selectOptions(screen.getByLabelText('Account Type'), 'CHECKING');
    await user.type(screen.getByLabelText('Routing Number'), '123456789');
    await user.type(screen.getByLabelText('Account Number'), '1234567890');
    await user.type(screen.getByLabelText('Confirm Account Number'), '1234567890');

    // Click submit button
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Submit' }));
    });

    // Verify that createBankAccount was called with correct data
    expect(createBankAccount).toHaveBeenCalledWith({
      accountHolderName: 'John Doe',
      accountType: 'CHECKING',
      routingNumber: '123456789',
      accountNumber: '1234567890',
      confirmAccountNumber: '1234567890',
      isDefault: false,
      initiateVerification: false,
      verificationMethod: 'MICRO_DEPOSIT',
    });

    // Verify success message is displayed
    await waitFor(() => {
      expect(showSuccessToast).toHaveBeenCalledWith('Bank account created successfully!');
    });
  });

  it('should handle errors during form submission', async () => {
    // Mock createBankAccount to throw an error
    createBankAccount.mockRejectedValue(new Error('Failed to create account'));

    // Render component with test providers
    renderWithProviders(<CreateBankAccountPage />);

    // Set up user event for interactions
    const user = setupUserEvent();

    // Fill out form fields with valid data
    await user.type(screen.getByLabelText('Account Holder Name'), 'John Doe');
    await user.selectOptions(screen.getByLabelText('Account Type'), 'CHECKING');
    await user.type(screen.getByLabelText('Routing Number'), '123456789');
    await user.type(screen.getByLabelText('Account Number'), '1234567890');
    await user.type(screen.getByLabelText('Confirm Account Number'), '1234567890');

    // Click submit button
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Submit' }));
    });

    // Verify error toast was displayed
    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith('Failed to create bank account. Please try again.');
    });

    // Verify error alert is displayed in the form
    expect(screen.getByText('Failed to create bank account. Please try again.')).toBeInTheDocument();
  });

  it('should navigate back when cancel button is clicked', async () => {
    // Render component with test providers
    renderWithProviders(<CreateBankAccountPage />);

    // Set up user event for interactions
    const user = setupUserEvent();

    // Click cancel button
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
    });

    // Verify that navigate was called with correct path
    expect(navigate).toHaveBeenCalledWith(BASE_ROUTES.PIKE + PIKE_ROUTES.BANK_ACCOUNTS);
  });

  it('should show success message after account creation', async () => {
    // Render component with test providers
    renderWithProviders(<CreateBankAccountPage />);

    // Set up user event for interactions
    const user = setupUserEvent();

    // Fill out form fields with valid data
    await user.type(screen.getByLabelText('Account Holder Name'), 'John Doe');
    await user.selectOptions(screen.getByLabelText('Account Type'), 'CHECKING');
    await user.type(screen.getByLabelText('Routing Number'), '123456789');
    await user.type(screen.getByLabelText('Account Number'), '1234567890');
    await user.type(screen.getByLabelText('Confirm Account Number'), '1234567890');

    // Click submit button
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Submit' }));
    });

    // Verify success toast was called
    await waitFor(() => {
      expect(showSuccessToast).toHaveBeenCalledWith('Bank account created successfully!');
    });

    // Verify success message is displayed in the UI
    await waitFor(() => {
      expect(screen.getByText('Bank account created successfully!')).toBeInTheDocument();
    });
  });
});