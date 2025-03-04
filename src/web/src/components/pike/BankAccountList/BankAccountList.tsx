import React, { useState, useEffect, useCallback } from 'react'; // ^18.0.0
import { useNavigate } from 'react-router-dom'; // ^6.0.0
import Table from '../../../components/common/Table';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Spinner from '../../../components/common/Spinner';
import Alert from '../../../components/common/Alert';
import RadioGroup from '../../../components/common/RadioGroup';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { EditIcon, DeleteIcon, AddIcon } from '../../../assets/icons/action-icons';
import useBankAccount from '../../../hooks/useBankAccount';
import { BankAccount } from '../../../types/bank-account.types';
import useToast from '../../../hooks/useToast';

/**
 * Interface defining the columns of the bank accounts table
 */
interface ColumnDefinition {
  header: string;
  accessor: string | ((data: BankAccount) => React.ReactNode);
  cellRenderer?: (value: any) => React.ReactNode;
}

/**
 * Props for the BankAccountList component
 */
interface BankAccountListProps {
  /**
   * ID of the merchant whose bank accounts are being displayed
   */
  merchantId: string;
  /**
   * Optional callback that is triggered when an account is updated, created, or deleted
   */
  onAccountUpdated?: () => void;
}

/**
 * Component that displays a list of bank accounts with management actions
 */
const BankAccountList: React.FC<BankAccountListProps> = ({ merchantId, onAccountUpdated }) => {
  // State variables for managing the component
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);

  // Hooks for bank account operations, toast notifications, and navigation
  const {
    bankAccounts,
    loading: bankAccountsLoading,
    error: bankAccountsError,
    fetchBankAccounts,
    setDefaultBankAccount,
    deleteBankAccount,
  } = useBankAccount();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Fetch bank accounts on component mount and when merchantId changes
  useEffect(() => {
    const loadAccounts = async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchBankAccounts({ merchantId });
      } catch (e: any) {
        setError(e.message || 'Failed to load bank accounts.');
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
  }, [fetchBankAccounts, merchantId]);

  // Update local accounts state when bankAccounts from hook changes
  useEffect(() => {
    setAccounts(bankAccounts);
  }, [bankAccounts]);

  /**
   * Handles setting a bank account as default
   * @param accountId The ID of the bank account to set as default
   */
  const handleSetDefault = async (accountId: string) => {
    // Prevent default form submission if event is passed
    try {
      // Call setDefaultBankAccount method from useBankAccount hook
      await setDefaultBankAccount(accountId);
      // Show success toast notification on success
      showToast('Default bank account updated successfully!');
      // Refresh the bank account list
      await fetchBankAccounts({ merchantId });
    } catch (e: any) {
      // Show error toast notification on failure
      showToast(`Failed to set default bank account: ${e.message}`, 'error');
    }
  };

  /**
   * Navigates to the edit page for a bank account
   * @param accountId The ID of the bank account to edit
   */
  const handleEdit = (accountId: string) => {
    // Use navigate function to redirect to the edit bank account page with the account ID
    navigate(`/bank-accounts/${accountId}/edit`);
  };

  /**
   * Handles the deletion of a bank account
   * @param accountId The ID of the bank account to delete
   */
  const handleDelete = async (accountId: string) => {
    // Opens confirmation dialog
    setAccountToDelete(accountId);
    setDeleteConfirmationOpen(true);
  };

  /**
   * Handles the actual deletion after confirmation
   */
  const confirmDelete = async () => {
    // If confirmed, calls the deleteBankAccount method from useBankAccount hook
    if (accountToDelete) {
      try {
        // Call the deleteBankAccount method from useBankAccount hook
        await deleteBankAccount(accountToDelete);
        // Shows success toast notification on successful deletion
        showToast('Bank account deleted successfully!');
        // Refreshes the bank account list
        await fetchBankAccounts({ merchantId });
      } catch (e: any) {
        // Shows error toast notification on failure
        showToast(`Failed to delete bank account: ${e.message}`, 'error');
      } finally {
        // Closes the confirmation dialog
        setDeleteConfirmationOpen(false);
        setAccountToDelete(null);
      }
    }
  };

  /**
   * Navigates to the add bank account page
   */
  const handleAdd = () => {
    // Uses navigate function to redirect to the create bank account page
    navigate('/bank-accounts/add');
  };

  /**
   * Renders the bank account status with appropriate styling
   * @param status The status of the bank account
   * @returns Styled status indicator
   */
  const renderStatus = (status: string) => {
    // Determines the appropriate color based on status (green for VERIFIED, yellow for PENDING, red for others)
    let color = 'text-red-500';
    if (status === 'VERIFIED') {
      color = 'text-green-500';
    } else if (status === 'PENDING') {
      color = 'text-yellow-500';
    }

    // Returns a styled span element with the status text and color
    return <span className={color}>{status}</span>;
  };

  // Define table columns
  const columns: ColumnDefinition[] = [
    { header: 'Account Name', accessor: 'accountHolderName' },
    { header: 'Account Type', accessor: 'accountType' },
    { header: 'Last 4', accessor: 'accountNumberLast4' },
    { header: 'Status', accessor: 'verificationStatus', cellRenderer: renderStatus },
    {
      header: 'Default',
      accessor: (account) => (
        <RadioGroup
          id={`default-account-${account.accountId}`}
          name="defaultAccount"
          value={account.isDefault ? account.accountId : undefined}
          onChange={() => handleSetDefault(account.accountId)}
          options={[{ label: '', value: account.accountId }]}
        />
      ),
    },
    {
      header: 'Actions',
      accessor: (account) => (
        <div className="flex space-x-2">
          <Button variant="tertiary" size="sm" onClick={() => handleEdit(account.accountId)}>
            <EditIcon className="h-4 w-4" />
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(account.accountId)}>
            <DeleteIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card title="Bank Accounts" actions={<Button variant="primary" size="sm" onClick={handleAdd}><AddIcon className="h-4 w-4" /> Add Bank Account</Button>}>
      {loading || bankAccountsLoading ? (
        <div className="flex justify-center">
          <Spinner size="md" />
        </div>
      ) : error || bankAccountsError ? (
        <Alert type="error" message={error || bankAccountsError || 'Failed to load bank accounts.'} />
      ) : accounts.length === 0 ? (
        <div className="text-gray-500">No bank accounts have been added yet.</div>
      ) : (
        <Table
          data={accounts}
          columns={columns}
          rowKey={(row) => row.accountId}
        />
      )}
      <ConfirmDialog
        isOpen={deleteConfirmationOpen}
        title="Delete Bank Account"
        message="Are you sure you want to delete this bank account? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmationOpen(false)}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
      />
    </Card>
  );
};

export default BankAccountList;