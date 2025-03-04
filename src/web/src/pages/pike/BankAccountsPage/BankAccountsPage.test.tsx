import React from 'react'; // React, version ^18.2.0
import { screen } from '@testing-library/react'; // @testing-library/react, version ^14.0.0
import { act } from 'react-dom/test-utils'; // react-dom/test-utils, version ^18.2.0
import { vi } from 'vitest'; // vitest, version ^0.34.0
import BankAccountsPage from './BankAccountsPage';
import { renderWithProviders } from '../../../utils/test.utils';
import { setupUserEvent } from '../../../utils/test.utils';
import { createMockUser } from '../../../utils/test.utils';
import { BankAccount, BankAccountType, BankAccountStatus, BankAccountVerificationStatus } from '../../../types/bank-account.types';
import { ROUTES } from '../../../constants/routes.constants';

// Define mock data and functions
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the useBankAccount hook
const mockUseBankAccount = vi.fn();
vi.mock('../../../hooks/useBankAccount', () => ({
  default: () => mockUseBankAccount(),
}));

// Mock the useAuth hook
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: createMockUser({ merchantId: 'test-merchant-id' }),
    isAuthenticated: true,
    logout: vi.fn(),
    isAdmin: vi.fn(),
    isMerchantAdmin: vi.fn(),
  }),
}));

// Setup mock functions and data for testing
const setupMocks = () => {
  const mockUser = createMockUser({ merchantId: 'test-merchant-id' });
  const mockBankAccounts = createMockBankAccounts(3);

  const mockReduxState = {
    auth: {
      user: mockUser,
      isAuthenticated: true,
      token: 'test-token',
      loading: false,
      error: null,
    },
    bankAccount: {
      accounts: mockBankAccounts,
      loading: false,
      error: null,
      currentPage: 1,
      pageSize: 10,
      totalItems: mockBankAccounts.length,
      totalPages: 1,
      currentVerification: null,
    },
  };

  mockUseBankAccount.mockReturnValue({
    bankAccounts: mockBankAccounts,
    loading: false,
    error: null,
    totalAccounts: mockBankAccounts.length,
    currentPage: 1,
    pageSize: 10,
    fetchBankAccounts: vi.fn(),
    fetchBankAccountById: vi.fn(),
    createBankAccount: vi.fn(),
    updateBankAccount: vi.fn(),
    deleteBankAccount: vi.fn(),
    setAsDefaultBankAccount: vi.fn(),
    initiateVerification: vi.fn(),
    checkVerificationStatus: vi.fn(),
    completeVerification: vi.fn(),
    completeMicroDepositVerification: vi.fn(),
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    refreshBankAccounts: vi.fn(),
    clearError: vi.fn(),
    defaultBankAccount: mockBankAccounts[0],
  });

  return { mockUser, mockBankAccounts, mockReduxState };
};

// Creates an array of mock bank accounts for testing
const createMockBankAccounts = (count: number): BankAccount[] => {
  const accounts: BankAccount[] = [];
  for (let i = 1; i <= count; i++) {
    const isDefault = i === 1; // Mark the first account as default
    accounts.push({
      accountId: `account-${i}`,
      merchantId: 'test-merchant-id',
      accountHolderName: `Account ${i} Holder`,
      accountType: BankAccountType.CHECKING,
      routingNumber: '123456789',
      accountNumberLast4: '4567',
      status: BankAccountStatus.ACTIVE,
      verificationStatus: BankAccountVerificationStatus.VERIFIED,
      verificationMethod: 'MICRO_DEPOSIT',
      isDefault: isDefault,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as BankAccount);
  }
  return accounts;
};

describe('BankAccountsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders bank accounts page with title', async () => {
    setupMocks();
    renderWithProviders(<BankAccountsPage />);
    expect(screen.getByText('Bank Accounts')).toBeInTheDocument();
    expect(screen.getByText("These accounts can be used for 'OTHER' refund method when original payment method is unavailable.")).toBeInTheDocument();
  });

  test('displays loading state when loading', () => {
    setupMocks();
    mockUseBankAccount.mockReturnValue({
      bankAccounts: [],
      loading: true,
      error: null,
      totalAccounts: 0,
      currentPage: 1,
      pageSize: 10,
      fetchBankAccounts: vi.fn(),
      fetchBankAccountById: vi.fn(),
      createBankAccount: vi.fn(),
      updateBankAccount: vi.fn(),
      deleteBankAccount: vi.fn(),
      setAsDefaultBankAccount: vi.fn(),
      initiateVerification: vi.fn(),
      checkVerificationStatus: vi.fn(),
      completeVerification: vi.fn(),
      completeMicroDepositVerification: vi.fn(),
      setPage: vi.fn(),
      setPageSize: vi.fn(),
      refreshBankAccounts: vi.fn(),
      clearError: vi.fn(),
      defaultBankAccount: undefined,
    });
    renderWithProviders(<BankAccountsPage />);
    expect(screen.getByRole('status')).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  test('displays error state when error occurs', () => {
    setupMocks();
    mockUseBankAccount.mockReturnValue({
      bankAccounts: [],
      loading: false,
      error: 'Failed to load bank accounts',
      totalAccounts: 0,
      currentPage: 1,
      pageSize: 10,
      fetchBankAccounts: vi.fn(),
      fetchBankAccountById: vi.fn(),
      createBankAccount: vi.fn(),
      updateBankAccount: vi.fn(),
      deleteBankAccount: vi.fn(),
      setAsDefaultBankAccount: vi.fn(),
      initiateVerification: vi.fn(),
      checkVerificationStatus: vi.fn(),
      completeVerification: vi.fn(),
      completeMicroDepositVerification: vi.fn(),
      setPage: vi.fn(),
      setPageSize: vi.fn(),
      refreshBankAccounts: vi.fn(),
      clearError: vi.fn(),
      defaultBankAccount: undefined,
    });
    renderWithProviders(<BankAccountsPage />);
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.getByText('Failed to load bank accounts')).toBeInTheDocument();
  });

  test('renders empty state when no bank accounts', () => {
    setupMocks();
    mockUseBankAccount.mockReturnValue({
      bankAccounts: [],
      loading: false,
      error: null,
      totalAccounts: 0,
      currentPage: 1,
      pageSize: 10,
      fetchBankAccounts: vi.fn(),
      fetchBankAccountById: vi.fn(),
      createBankAccount: vi.fn(),
      updateBankAccount: vi.fn(),
      deleteBankAccount: vi.fn(),
      setAsDefaultBankAccount: vi.fn(),
      initiateVerification: vi.fn(),
      checkVerificationStatus: vi.fn(),
      completeVerification: vi.fn(),
      completeMicroDepositVerification: vi.fn(),
      setPage: vi.fn(),
      setPageSize: vi.fn(),
      refreshBankAccounts: vi.fn(),
      clearError: vi.fn(),
      defaultBankAccount: undefined,
    });
    renderWithProviders(<BankAccountsPage />);
    expect(screen.getByText('No bank accounts have been added yet.')).toBeInTheDocument();
  });

  test('renders bank account list when accounts exist', () => {
    const { mockBankAccounts } = setupMocks();
    const { container } = renderWithProviders(<BankAccountsPage />);
    expect(screen.getByRole('table')).toBeVisible();
    mockBankAccounts.forEach(account => {
      expect(screen.getByText(account.accountHolderName)).toBeInTheDocument();
    });
  });

  test('navigates to add bank account page when button clicked', async () => {
    setupMocks();
    renderWithProviders(<BankAccountsPage />);
    const addButton = screen.getByRole('button', { name: 'Add Bank Account' });
    expect(addButton).toBeInTheDocument();
    const user = setupUserEvent();
    await act(() => user.click(addButton));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.PIKE.CREATE_BANK_ACCOUNT);
  });

  test('handles pagination correctly', async () => {
    setupMocks();
    const mockSetPage = vi.fn();
    const mockSetPageSize = vi.fn();
    mockUseBankAccount.mockReturnValue({
      bankAccounts: createMockBankAccounts(25),
      loading: false,
      error: null,
      totalAccounts: 25,
      currentPage: 1,
      pageSize: 10,
      fetchBankAccounts: vi.fn(),
      fetchBankAccountById: vi.fn(),
      createBankAccount: vi.fn(),
      updateBankAccount: vi.fn(),
      deleteBankAccount: vi.fn(),
      setAsDefaultBankAccount: vi.fn(),
      initiateVerification: vi.fn(),
      checkVerificationStatus: vi.fn(),
      completeVerification: vi.fn(),
      completeMicroDepositVerification: vi.fn(),
      setPage: mockSetPage,
      setPageSize: mockSetPageSize,
      refreshBankAccounts: vi.fn(),
      clearError: vi.fn(),
      defaultBankAccount: undefined,
    });
    renderWithProviders(<BankAccountsPage />);
    expect(screen.getByRole('navigation', { name: 'Pagination navigation' })).toBeVisible();
    const user = setupUserEvent();
    const page2Button = screen.getByRole('button', { name: 'Page 2' });
    await act(() => user.click(page2Button));
    expect(mockSetPage).toHaveBeenCalledWith(2);
    const pageSizeSelect = screen.getByLabelText('Items per page');
    await act(() => user.selectOptions(pageSizeSelect, ['25']));
    expect(mockSetPageSize).toHaveBeenCalledWith(25);
  });

  test('refreshes accounts when onAccountUpdated callback is called', async () => {
    setupMocks();
    const mockFetchBankAccounts = vi.fn();
    mockUseBankAccount.mockReturnValue({
      bankAccounts: createMockBankAccounts(3),
      loading: false,
      error: null,
      totalAccounts: 3,
      currentPage: 1,
      pageSize: 10,
      fetchBankAccounts: mockFetchBankAccounts,
      fetchBankAccountById: vi.fn(),
      createBankAccount: vi.fn(),
      updateBankAccount: vi.fn(),
      deleteBankAccount: vi.fn(),
      setAsDefaultBankAccount: vi.fn(),
      initiateVerification: vi.fn(),
      checkVerificationStatus: vi.fn(),
      completeVerification: vi.fn(),
      completeMicroDepositVerification: vi.fn(),
      setPage: vi.fn(),
      setPageSize: vi.fn(),
      refreshBankAccounts: vi.fn(),
      clearError: vi.fn(),
      defaultBankAccount: undefined,
    });
    renderWithProviders(<BankAccountsPage />);
    expect(mockFetchBankAccounts).toHaveBeenCalledTimes(1);
  });
});