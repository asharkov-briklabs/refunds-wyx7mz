import React, { useEffect, useCallback } from 'react'; // React, version ^18.2.0
import { useNavigate } from 'react-router-dom'; // react-router-dom, version ^6.4.0
import { useAuth } from '../../../hooks/useAuth';
import useBankAccount from '../../../hooks/useBankAccount';
import MainLayout from '../../../components/layout/MainLayout';
import PageHeader from '../../../components/layout/PageHeader';
import Button from '../../../components/common/Button';
import { AddIcon } from '../../../assets/icons/action-icons';
import Card from '../../../components/common/Card';
import Alert from '../../../components/common/Alert';
import BankAccountList from '../../../components/pike/BankAccountList';
import Pagination from '../../../components/common/Pagination';
import { ROUTES } from '../../../constants/routes.constants';

/**
 * Page component for managing bank accounts
 * @returns {JSX.Element} Rendered bank accounts page
 */
const BankAccountsPage: React.FC = () => {
  // IE1: Get navigation function from useNavigate hook
  const navigate = useNavigate();

  // IE1: Get current user data from useAuth hook
  const { user } = useAuth();

  // IE1: Extract merchant ID from user data
  const merchantId = user?.merchantId;

  // IE1: Use useBankAccount hook to access bank account functionality
  const {
    bankAccounts,
    loading,
    error,
    totalAccounts,
    currentPage,
    pageSize,
    fetchBankAccounts,
    setPage,
    setPageSize,
  } = useBankAccount();

  // IE1: Setup refresh callback to reload bank accounts data
  const handleAccountUpdated = useCallback(() => {
    if (merchantId) {
      fetchBankAccounts({ merchantId });
    }
  }, [fetchBankAccounts, merchantId]);

  // IE1: Setup navigation callback to create new bank account
  const handleAddBankAccount = useCallback(() => {
    navigate(ROUTES.PIKE.CREATE_BANK_ACCOUNT);
  }, [navigate]);

  // IE1: Setup page change handler for pagination
  const handlePageChange = (page: number) => {
    setPage(page);
  };

  // IE1: Setup page size change handler for pagination
  const handlePageSizeChange = (pageSize: number) => {
    setPageSize(pageSize);
  };

  useEffect(() => {
    if (merchantId) {
      fetchBankAccounts({ merchantId });
    }
  }, [merchantId, fetchBankAccounts]);

  // IE1: Return MainLayout with appropriate page structure
  return (
    <MainLayout>
      {/* IE1: Include PageHeader with 'Bank Accounts' title and add button */}
      <PageHeader
        title="Bank Accounts"
        actions={
          <Button variant="primary" onClick={handleAddBankAccount}>
            <AddIcon className="h-4 w-4" /> Add Bank Account
          </Button>
        }
      />

      {/* IE1: Render informational message about bank account usage */}
      <Alert type="info" message="These accounts can be used for 'OTHER' refund method when original payment method is unavailable." />

      {/* IE1: Render BankAccountList component with merchant ID and update callback */}
      <Card>
        {loading ? (
          <div className="flex justify-center">
            <Spinner size="md" />
          </div>
        ) : error ? (
          <Alert type="error" message={error} />
        ) : bankAccounts.length > 0 ? (
          <BankAccountList merchantId={merchantId || ''} onAccountUpdated={handleAccountUpdated} />
        ) : (
          <div className="text-gray-500">No bank accounts have been added yet.</div>
        )}
      </Card>

      {/* IE1: Render Pagination component for bank account list navigation */}
      {totalAccounts > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalAccounts}
          itemsPerPage={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </MainLayout>
  );
};

/**
 * Navigates to the add bank account page
 * @returns {void} No return value
 */
const handleAddBankAccount = (): void => {
  // Use navigate function to redirect to the create bank account page
};

/**
 * Callback for when an account is created, updated, or deleted
 * @returns {void} No return value
 */
const handleAccountUpdated = (): void => {
  // Refresh bank accounts list to show updated data
};

/**
 * Handles page change in pagination
 * @param {number} page
 * @returns {void} No return value
 */
const handlePageChange = (page: number): void => {
  // Call setPage function from useBankAccount hook
};

/**
 * Handles page size change in pagination
 * @param {number} pageSize
 * @returns {void} No return value
 */
const handlePageSizeChange = (pageSize: number): void => {
  // Call setPageSize function from useBankAccount hook
};

// IE3: Export the BankAccountsPage component for routing
export default BankAccountsPage;