import React, { useState, useCallback } from 'react'; // React v18.2.0
import { useNavigate } from 'react-router-dom'; // react-router-dom v6.8.0
import MainLayout from '../../../components/layout/MainLayout';
import PageHeader from '../../../components/layout/PageHeader';
import BankAccountForm from '../../../components/pike/BankAccountForm';
import Card from '../../../components/common/Card';
import Alert from '../../../components/common/Alert';
import { Breadcrumb } from '../../../components/common/Breadcrumbs';
import useBankAccount from '../../../hooks/useBankAccount';
import useToast from '../../../hooks/useToast';
import { BankAccountFormData } from '../../../types/bank-account.types';
import { PIKE_ROUTES, BASE_ROUTES } from '../../../constants/routes.constants';

/**
 * Page component for creating new bank accounts in the Pike interface
 * @returns {JSX.Element} The rendered create bank account page
 */
const CreateBankAccountPage: React.FC = () => {
  // Initialize navigation hook for redirecting after form submission
  const navigate = useNavigate();

  // Initialize success state for tracking form submission result
  const [success, setSuccess] = useState(false);

  // Get bank account operations and state from useBankAccount hook
  const { createBankAccount, loading, error } = useBankAccount();

  // Get toast notification functions from useToast hook
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  // Define breadcrumbs for navigation path
  const breadcrumbs: Breadcrumb[] = [
    { label: 'Dashboard', path: BASE_ROUTES.PIKE + PIKE_ROUTES.DASHBOARD },
    { label: 'Bank Accounts', path: BASE_ROUTES.PIKE + PIKE_ROUTES.BANK_ACCOUNTS },
    { label: 'Add Bank Account', path: BASE_ROUTES.PIKE + PIKE_ROUTES.CREATE_BANK_ACCOUNT, active: true },
  ];

  /**
   * Handles the submission of the bank account form
   * @param {BankAccountFormData} formData
   * @returns {Promise<void>} Promise that resolves when submission is complete
   */
  const handleSubmit = useCallback(async (formData: BankAccountFormData) => {
    try {
      // Try to create bank account using createBankAccount function from useBankAccount hook
      const newAccount = await createBankAccount(formData);
      if (newAccount) {
        // If successful, set success state to true and show success toast notification
        setSuccess(true);
        showSuccessToast('Bank account created successfully!');
      } else {
        // If createBankAccount returns null, show error toast notification
        showErrorToast('Failed to create bank account. Please try again.');
      }
    } catch (e: any) {
      // If error occurs, show error toast notification
      showErrorToast('Failed to create bank account. Please try again.');
      // Log any errors to error tracking service
      console.error('Error creating bank account:', e);
    }
  }, [createBankAccount, showSuccessToast, showErrorToast]);

  /**
   * Handles cancellation of bank account creation
   * @returns {void} No return value
   */
  const handleCancel = useCallback(() => {
    // Navigate back to bank accounts list page
    navigate(BASE_ROUTES.PIKE + PIKE_ROUTES.BANK_ACCOUNTS);
  }, [navigate]);

  // Render page with MainLayout wrapper
  return (
    <MainLayout>
      {/* Render PageHeader with title and breadcrumbs */}
      <PageHeader title="Add Bank Account" breadcrumbs={breadcrumbs} />

      {/* Conditionally render success message when account is created */}
      {success && (
        <Card>
          <Alert type="success" message="Bank account created successfully!" />
        </Card>
      )}

      {/* Render error alert if submission fails */}
      {error && (
        <Card>
          <Alert type="error" message={error} />
        </Card>
      )}

      {/* Render BankAccountForm component for data entry */}
      <BankAccountForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={loading}
      />
    </MainLayout>
  );
};

export default CreateBankAccountPage;