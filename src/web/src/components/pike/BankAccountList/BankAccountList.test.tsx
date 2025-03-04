import React from 'react'; // react ^18.2.0
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // @testing-library/react ^14.0.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event ^14.4.3
import jest from 'jest'; // jest ^29.5.0
import { MemoryRouter } from 'react-router-dom'; // react-router-dom ^6.0.0
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';
import BankAccountList from './BankAccountList';
import { BankAccountStatus, BankAccountVerificationStatus, BankAccountType } from '../../../types/bank-account.types';

// Mock the bank account management hook to control its returned values in tests
jest.mock('../../../hooks/useBankAccount', () => ({
  __esModule: true,
  default: jest.fn()
}));

// Mock the navigation hook to verify navigation calls
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navigateMock
}));

// Mock the toast notification hook to verify notifications
jest.mock('../../../hooks/useToast', () => ({
  __esModule: true,
  default: () => ({ showToast: toastMock })
}));

// Define mock navigate function
const navigateMock = jest.fn();

// Define mock toast function
const toastMock = jest.fn();

// Define a mock bank account data structure for testing
interface MockBankAccount {
  accountId: string;
  merchantId: string;
  accountHolderName: string;
  accountType: BankAccountType;
  routingNumber: string;
  accountNumberLast4: string;
  status: BankAccountStatus;
  verificationStatus: BankAccountVerificationStatus;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Helper function to set up the component for testing
const setup = (props: any = {}) => {
  // Set up default props including merchantId and onAccountUpdated callback
  const defaultProps = {
    merchantId: 'test-merchant',
    onAccountUpdated: jest.fn(),
    ...props,
  };

  // Create testing utilities using setupUserEvent
  const user = setupUserEvent();

  // Render the component with necessary providers using renderWithProviders
  const renderResult = renderWithProviders(
    <MemoryRouter>
      <BankAccountList {...defaultProps} />
    </MemoryRouter>
  );

  // Return utilities and rendered component
  return {
    ...renderResult,
    user,
    props: defaultProps,
  };
};

// Function that creates an array of mock bank accounts for testing
const mockBankAccounts = (): MockBankAccount[] => {
  // Create array with multiple bank account objects with different properties
  const accounts: MockBankAccount[] = [
    {
      accountId: 'account-1',
      merchantId: 'test-merchant',
      accountHolderName: 'Test Account 1',
      accountType: BankAccountType.CHECKING,
      routingNumber: '123456789',
      accountNumberLast4: '1234',
      status: BankAccountStatus.ACTIVE,
      verificationStatus: BankAccountVerificationStatus.VERIFIED,
      isDefault: true,
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    },
    {
      accountId: 'account-2',
      merchantId: 'test-merchant',
      accountHolderName: 'Test Account 2',
      accountType: BankAccountType.SAVINGS,
      routingNumber: '987654321',
      accountNumberLast4: '5678',
      status: BankAccountStatus.ACTIVE,
      verificationStatus: BankAccountVerificationStatus.PENDING,
      isDefault: false,
      createdAt: '2023-02-01T00:00:00.000Z',
      updatedAt: '2023-02-01T00:00:00.000Z',
    },
    {
      accountId: 'account-3',
      merchantId: 'test-merchant',
      accountHolderName: 'Test Account 3',
      accountType: BankAccountType.CHECKING,
      routingNumber: '456789123',
      accountNumberLast4: '9012',
      status: BankAccountStatus.INACTIVE,
      verificationStatus: BankAccountVerificationStatus.FAILED,
      isDefault: false,
      createdAt: '2023-03-01T00:00:00.000Z',
      updatedAt: '2023-03-01T00:00:00.000Z',
    },
  ];

  // Return the mock accounts array
  return accounts;
};

// Tests for the BankAccountList component
describe('BankAccountList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (require('../../../hooks/useBankAccount').default as jest.Mock).mockReturnValue({
      bankAccounts: [],
      loading: false,
      error: null,
      fetchBankAccounts: jest.fn(),
      setDefaultBankAccount: jest.fn(),
      deleteBankAccount: jest.fn(),
    });
  });

  it('renders loading state initially', () => {
    // Mock useBankAccount hook to return loading=true
    (require('../../../hooks/useBankAccount').default as jest.Mock).mockReturnValue({
      bankAccounts: [],
      loading: true,
      error: null,
      fetchBankAccounts: jest.fn(),
      setDefaultBankAccount: jest.fn(),
      deleteBankAccount: jest.fn(),
    });

    // Render the component
    setup();

    // Verify loading spinner is displayed
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Verify table is not rendered yet
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders empty state when no accounts exist', () => {
    // Mock useBankAccount hook to return empty accounts array
    (require('../../../hooks/useBankAccount').default as jest.Mock).mockReturnValue({
      bankAccounts: [],
      loading: false,
      error: null,
      fetchBankAccounts: jest.fn(),
      setDefaultBankAccount: jest.fn(),
      deleteBankAccount: jest.fn(),
    });

    // Render the component
    setup();

    // Verify empty state message is displayed
    expect(screen.getByText('No bank accounts have been added yet.')).toBeInTheDocument();

    // Verify Add Bank Account button is displayed
    expect(screen.getByRole('button', { name: 'Add Bank Account' })).toBeInTheDocument();

    // Verify table is not rendered
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders account list properly when accounts exist', () => {
    // Mock useBankAccount hook to return array of accounts
    (require('../../../hooks/useBankAccount').default as jest.Mock).mockReturnValue({
      bankAccounts: mockBankAccounts(),
      loading: false,
      error: null,
      fetchBankAccounts: jest.fn(),
      setDefaultBankAccount: jest.fn(),
      deleteBankAccount: jest.fn(),
    });

    // Render the component
    setup();

    // Verify table is displayed with correct headers
    expect(screen.getByRole('columnheader', { name: 'Account Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Account Type' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Last 4' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Default' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();

    // Verify each account is displayed with correct information
    const accounts = mockBankAccounts();
    accounts.forEach((account) => {
      expect(screen.getByText(account.accountHolderName)).toBeInTheDocument();
      expect(screen.getByText(account.accountType)).toBeInTheDocument();
      expect(screen.getByText(account.accountNumberLast4)).toBeInTheDocument();
    });

    // Verify default account has selected radio button
    const defaultAccount = accounts.find((account) => account.isDefault);
    if (defaultAccount) {
      const radioButton = screen.getByRole('radio', { name: '' });
      expect(radioButton).toBeChecked();
    }
  });

  it('renders error state when error occurs', () => {
    // Mock useBankAccount hook to return an error
    (require('../../../hooks/useBankAccount').default as jest.Mock).mockReturnValue({
      bankAccounts: [],
      loading: false,
      error: 'Failed to load bank accounts',
      fetchBankAccounts: jest.fn(),
      setDefaultBankAccount: jest.fn(),
      deleteBankAccount: jest.fn(),
    });

    // Render the component
    setup();

    // Verify error message is displayed
    expect(screen.getByText('Failed to load bank accounts')).toBeInTheDocument();

    // Verify table is not rendered
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('displays different verification status styles correctly', () => {
    // Mock useBankAccount hook to return accounts with different verification statuses
    (require('../../../hooks/useBankAccount').default as jest.Mock).mockReturnValue({
      bankAccounts: mockBankAccounts(),
      loading: false,
      error: null,
      fetchBankAccounts: jest.fn(),
      setDefaultBankAccount: jest.fn(),
      deleteBankAccount: jest.fn(),
    });

    // Render the component
    setup();

    // Check that VERIFIED status has green styling
    expect(screen.getByText('VERIFIED')).toHaveClass('text-green-500');

    // Check that PENDING status has yellow styling
    expect(screen.getByText('PENDING')).toHaveClass('text-yellow-500');

    // Check that FAILED status has red styling
    expect(screen.getByText('FAILED')).toHaveClass('text-red-500');
  });

  it('calls setDefaultBankAccount when default radio is clicked', async () => {
    // Mock useBankAccount hook with spy on setDefaultBankAccount
    const setDefaultBankAccountMock = jest.fn();
    (require('../../../hooks/useBankAccount').default as jest.Mock).mockReturnValue({
      bankAccounts: mockBankAccounts(),
      loading: false,
      error: null,
      fetchBankAccounts: jest.fn(),
      setDefaultBankAccount: setDefaultBankAccountMock,
      deleteBankAccount: jest.fn(),
    });

    // Render the component with mock accounts
    setup();

    // Click radio button for a non-default account
    const radioButton = screen.getAllByRole('radio', { name: '' })[1];
    await userEvent.click(radioButton);

    // Verify setDefaultBankAccount was called with correct account ID
    expect(setDefaultBankAccountMock).toHaveBeenCalledWith('account-2');

    // Verify toast notification is shown on success
    expect(toastMock).toHaveBeenCalledWith('Default bank account updated successfully!');
  });

  it('navigates to edit page when edit button is clicked', async () => {
    // Set up mock navigate function
    navigateMock.mockImplementation(() => {});

    // Mock useBankAccount hook with mock accounts
    (require('../../../hooks/useBankAccount').default as jest.Mock).mockReturnValue({
      bankAccounts: mockBankAccounts(),
      loading: false,
      error: null,
      fetchBankAccounts: jest.fn(),
      setDefaultBankAccount: jest.fn(),
      deleteBankAccount: jest.fn(),
    });

    // Render component with MemoryRouter
    setup();

    // Click edit button for a specific account
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    await userEvent.click(editButton);

    // Verify navigate was called with correct path including account ID
    expect(navigateMock).toHaveBeenCalledWith('/bank-accounts/account-1/edit');
  });

  it('shows confirmation dialog when delete button is clicked', async () => {
    // Mock useBankAccount hook with mock accounts
    (require('../../../hooks/useBankAccount').default as jest.Mock).mockReturnValue({
      bankAccounts: mockBankAccounts(),
      loading: false,
      error: null,
      fetchBankAccounts: jest.fn(),
      setDefaultBankAccount: jest.fn(),
      deleteBankAccount: jest.fn(),
    });

    // Render the component with mock accounts
    setup();

    // Click delete button for a specific account
    const deleteButton = screen.getAllByRole('button', { name: 'Delete' })[0];
    await userEvent.click(deleteButton);

    // Verify confirmation dialog is displayed
    expect(screen.getByRole('dialog', { name: 'Delete Bank Account' })).toBeInTheDocument();

    // Verify dialog contains relevant account information
    expect(screen.getByText('Are you sure you want to delete this bank account? This action cannot be undone.')).toBeInTheDocument();
  });

  it('calls deleteBankAccount when delete is confirmed', async () => {
    // Mock useBankAccount hook with spy on deleteBankAccount
    const deleteBankAccountMock = jest.fn();
    (require('../../../hooks/useBankAccount').default as jest.Mock).mockReturnValue({
      bankAccounts: mockBankAccounts(),
      loading: false,
      error: null,
      fetchBankAccounts: jest.fn(),
      setDefaultBankAccount: jest.fn(),
      deleteBankAccount: deleteBankAccountMock,
    });

    // Render the component with mock accounts
    setup();

    // Click delete button for a specific account
    const deleteButton = screen.getAllByRole('button', { name: 'Delete' })[0];
    await userEvent.click(deleteButton);

    // Click confirm button in dialog
    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    await userEvent.click(confirmButton);

    // Verify deleteBankAccount was called with correct account ID
    expect(deleteBankAccountMock).toHaveBeenCalledWith('account-1');

    // Verify toast notification is shown on success
    expect(toastMock).toHaveBeenCalledWith('Bank account deleted successfully!');
  });

  it('closes confirmation dialog when cancel is clicked', async () => {
    // Mock useBankAccount hook with mock accounts
    (require('../../../hooks/useBankAccount').default as jest.Mock).mockReturnValue({
      bankAccounts: mockBankAccounts(),
      loading: false,
      error: null,
      fetchBankAccounts: jest.fn(),
      setDefaultBankAccount: jest.fn(),
      deleteBankAccount: jest.fn(),
    });

    // Render the component with mock accounts
    setup();

    // Click delete button for a specific account
    const deleteButton = screen.getAllByRole('button', { name: 'Delete' })[0];
    await userEvent.click(deleteButton);

    // Verify confirmation dialog is displayed
    expect(screen.getByRole('dialog', { name: 'Delete Bank Account' })).toBeInTheDocument();

    // Click cancel button in dialog
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await userEvent.click(cancelButton);

    // Verify dialog is no longer displayed
    expect(screen.queryByRole('dialog', { name: 'Delete Bank Account' })).not.toBeInTheDocument();
  });

  it('navigates to add page when add button is clicked', async () => {
    // Set up mock navigate function
    navigateMock.mockImplementation(() => {});

    // Mock useBankAccount hook with mock accounts
    (require('../../../hooks/useBankAccount').default as jest.Mock).mockReturnValue({
      bankAccounts: mockBankAccounts(),
      loading: false,
      error: null,
      fetchBankAccounts: jest.fn(),
      setDefaultBankAccount: jest.fn(),
      deleteBankAccount: jest.fn(),
    });

    // Render component with MemoryRouter
    setup();

    // Click Add Bank Account button
    const addButton = screen.getByRole('button', { name: 'Add Bank Account' });
    await userEvent.click(addButton);

    // Verify navigate was called with correct create path
    expect(navigateMock).toHaveBeenCalledWith('/bank-accounts/add');
  });

  it('calls onAccountUpdated when account changes', async () => {
    // Create spy for onAccountUpdated callback
    const onAccountUpdatedSpy = jest.fn();

    // Mock successful setDefaultBankAccount in the useBankAccount hook
    (require('../../../hooks/useBankAccount').default as jest.Mock).mockReturnValue({
      bankAccounts: mockBankAccounts(),
      loading: false,
      error: null,
      fetchBankAccounts: jest.fn(),
      setDefaultBankAccount: jest.fn().mockResolvedValue(true),
      deleteBankAccount: jest.fn(),
    });

    // Render component with the spy callback
    const { user } = setup({ onAccountUpdated: onAccountUpdatedSpy });

    // Trigger account update (set as default)
    const radioButton = screen.getAllByRole('radio', { name: '' })[1];
    await userEvent.click(radioButton);

    // Verify onAccountUpdated callback was called
    expect(onAccountUpdatedSpy).toHaveBeenCalled();
  });
});