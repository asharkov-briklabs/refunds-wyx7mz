import React from 'react'; // react ^18.2.0
import { screen, waitFor, fireEvent } from '@testing-library/react'; // @testing-library/react ^14.0.0
import SettingsPage from './SettingsPage';
import { renderWithProviders, setupUserEvent, waitForComponentToPaint } from '../../../utils/test.utils';
import { mockBankAccounts, mockParameters } from '../../../tests/mocks';
import BankAccountList from '../../../components/pike/BankAccountList';
import BankAccountForm from '../../../components/pike/BankAccountForm';

/**
 * Mock function for the useBankAccount hook
 * @returns {object} Mocked useBankAccount hook with test functions and data
 */
const mockUseBankAccount = () => {
  // LD1: Create mock bankAccounts array
  const bankAccounts = mockBankAccounts;

  // LD1: Create mock functions for fetchBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount
  const fetchBankAccounts = jest.fn();
  const createBankAccount = jest.fn();
  const updateBankAccount = jest.fn();
  const deleteBankAccount = jest.fn();

  // LD1: Create mock loading state
  const loading = false;

  // LD1: Return mock object with all properties and functions required by the hook
  return {
    bankAccounts,
    fetchBankAccounts,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
    loading,
  };
};

/**
 * Mock function for the useParameter hook
 * @returns {object} Mocked useParameter hook with test functions and data
 */
const mockUseParameter = () => {
  // LD1: Create mock parameters array
  const parameters = mockParameters;

  // LD1: Create mock functions for fetchParameters, updateParameter
  const fetchParameters = jest.fn();
  const updateParameter = jest.fn();

  // LD1: Create mock loading state
  const loading = false;

  // LD1: Return mock object with all properties and functions required by the hook
  return {
    parameters,
    fetchParameters,
    updateParameter,
    loading,
  };
};

/**
 * Mock function for the useToast hook
 * @returns {object} Mocked useToast hook with test functions
 */
const mockUseToast = () => {
  // LD1: Create mock function for showToast
  const showToast = jest.fn();

  // LD1: Create mock functions for success, error, warning, info notification methods
  const success = jest.fn();
  const error = jest.fn();
  const warning = jest.fn();
  const info = jest.fn();

  // LD1: Return mock object with all properties and functions required by the hook
  return {
    showToast,
    success,
    error,
    warning,
    info,
  };
};

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mock('../../../hooks/useBankAccount', () => ({
      __esModule: true,
      default: mockUseBankAccount,
    }));
    jest.mock('../../../hooks/useParameter', () => ({
      __esModule: true,
      default: mockUseParameter,
    }));
    jest.mock('../../../hooks/useToast', () => ({
      __esModule: true,
      default: mockUseToast,
    }));
  });

  it('renders the settings page with bank accounts tab by default', async () => {
    // Arrange
    const { container } = renderWithProviders(<SettingsPage />);
    await waitForComponentToPaint({ container });

    // Assert
    // F-306: SettingsPage renders without crashing
    expect(screen.getByText('Settings')).toBeInTheDocument();
    // F-306: Page title 'Settings' is present
    expect(screen.getByRole('tab', { name: 'Bank Accounts' })).toBeInTheDocument();
    // F-306: Bank Accounts tab is selected by default
    expect(screen.getByRole('tab', { name: 'Bank Accounts' })).toHaveClass('tabs__tab--active');
    // F-205: BankAccountList component is rendered
    expect(screen.getByTestId('bank-account-list')).toBeInTheDocument();
    // F-205: Add Bank Account button is visible
    expect(screen.getByRole('button', { name: 'Add Bank Account' })).toBeInTheDocument();
  });

  it('can switch between tabs', async () => {
    // Arrange
    const { container } = renderWithProviders(<SettingsPage />);
    await waitForComponentToPaint({ container });
    const user = setupUserEvent();

    // Act
    // F-306: Bank Accounts tab is selected by default
    const bankAccountsTab = screen.getByRole('tab', { name: 'Bank Accounts' });
    expect(bankAccountsTab).toHaveClass('tabs__tab--active');
    // F-306: Notification Preferences tab becomes active when clicked
    const notificationPreferencesTab = screen.getByRole('tab', { name: 'Notification Preferences' });
    await user.click(notificationPreferencesTab);
    expect(notificationPreferencesTab).toHaveClass('tabs__tab--active');
    // F-206: Parameter settings are visible in the Notification Preferences tab
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
  });

  it('shows bank account form when add button is clicked', async () => {
    // Arrange
    const { container } = renderWithProviders(<SettingsPage />);
    await waitForComponentToPaint({ container });
    const user = setupUserEvent();

    // Act
    // F-205: Add Bank Account button is visible
    const addButton = screen.getByRole('button', { name: 'Add Bank Account' });
    // F-205: BankAccountForm is not initially rendered
    expect(screen.queryByTestId('bank-account-form')).not.toBeInTheDocument();
    await user.click(addButton);
    // Assert
    // F-205: BankAccountForm appears when Add button is clicked
    expect(screen.getByTestId('bank-account-form')).toBeInTheDocument();
  });

  it('can edit existing bank account', async () => {
    // Arrange
    const { container } = renderWithProviders(<SettingsPage />);
    await waitForComponentToPaint({ container });
    const user = setupUserEvent();

    // Act
    // F-205: BankAccountList is rendered with edit buttons
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    // F-205: BankAccountForm is not initially rendered
    expect(screen.queryByTestId('bank-account-form')).not.toBeInTheDocument();
    await user.click(editButton);

    // Assert
    // F-205: BankAccountForm appears with account data when edit button is clicked
    expect(screen.getByTestId('bank-account-form')).toBeInTheDocument();
  });

  it('can submit bank account form', async () => {
    // Arrange
    const { container } = renderWithProviders(<SettingsPage />);
    await waitForComponentToPaint({ container });
    const user = setupUserEvent();

    // Act
    // F-205: BankAccountForm is rendered after clicking Add
    const addButton = screen.getByRole('button', { name: 'Add Bank Account' });
    await user.click(addButton);
    const accountHolderNameInput = screen.getByLabelText('Account Holder Name');
    const routingNumberInput = screen.getByLabelText('Routing Number');
    const accountNumberInput = screen.getByLabelText('Account Number');
    const confirmAccountNumberInput = screen.getByLabelText('Confirm Account Number');
    const submitButton = screen.getByRole('button', { name: 'Submit' });

    // F-205: Form can be filled with account details
    await user.type(accountHolderNameInput, 'Test Account');
    await user.type(routingNumberInput, '123456789');
    await user.type(accountNumberInput, '1234567890');
    await user.type(confirmAccountNumberInput, '1234567890');

    // F-205: Form submits successfully on Save button click
    await user.click(submitButton);

    // Assert
    // F-205: Success toast notification is displayed
    await waitFor(() => {
      expect(screen.getByText('Bank account created successfully!')).toBeInTheDocument();
    });
    // F-205: BankAccountForm is hidden after successful submission
    expect(screen.queryByTestId('bank-account-form')).not.toBeInTheDocument();
  });

  it('can update notification preferences', async () => {
    // Arrange
    const { container } = renderWithProviders(<SettingsPage />);
    await waitForComponentToPaint({ container });
    const user = setupUserEvent();

    // Act
    // F-206: Switches to Notification Preferences tab
    const notificationPreferencesTab = screen.getByRole('tab', { name: 'Notification Preferences' });
    await user.click(notificationPreferencesTab);

    // F-206: Parameter toggles/inputs are rendered
    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    // F-206: Can change parameter values
    const toggle = screen.getByRole('checkbox', { name: 'Refund approvals (EMAIL)' });
    await user.click(toggle);

    // Assert
    // F-206: UpdateParameter is called with correct values
    await waitFor(() => {
      expect(mockUseParameter().updateParameter).toHaveBeenCalled();
    });

    // F-206: Success toast notification is displayed after updating
    await waitFor(() => {
      expect(screen.getByText('Parameter undefined updated successfully!')).toBeInTheDocument();
    });
  });

  it('shows error message when bank account loading fails', async () => {
    // Arrange
    jest.mock('../../../hooks/useBankAccount', () => ({
      __esModule: true,
      default: () => ({
        ...mockUseBankAccount(),
        loading: false,
        error: 'Failed to load bank accounts',
      }),
    }));

    const { container } = renderWithProviders(<SettingsPage />);
    await waitForComponentToPaint({ container });

    // Assert
    // F-205: Mock useBankAccount to return error state
    // F-205: Error alert component is rendered
    expect(screen.getByRole('alert')).toBeInTheDocument();
    // F-205: Error message is displayed to the user
    expect(screen.getByText('Failed to load bank accounts')).toBeInTheDocument();
  });

  it('shows error message when parameters loading fails', async () => {
    // Arrange
    jest.mock('../../../hooks/useParameter', () => ({
      __esModule: true,
      default: () => ({
        ...mockUseParameter(),
        loading: false,
        error: 'Failed to load parameters',
      }),
    }));

    const { container } = renderWithProviders(<SettingsPage />);
    await waitForComponentToPaint({ container });
    const user = setupUserEvent();

    // Act
    // F-206: Switch to Notification Preferences tab
    const notificationPreferencesTab = screen.getByRole('tab', { name: 'Notification Preferences' });
    await user.click(notificationPreferencesTab);

    // Assert
    // F-206: Mock useParameter to return error state
    // F-206: Error alert component is rendered
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    // F-206: Error message is displayed to the user
    expect(screen.getByText('Failed to load parameters')).toBeInTheDocument();
  });
});