// src/web/src/pages/pike/SettingsPage/SettingsPage.tsx
import React, { useState, useEffect, useCallback } from 'react'; // React v18.2.0
import MainLayout from '../../../components/layout/MainLayout';
import PageHeader from '../../../components/layout/PageHeader';
import Card from '../../../components/common/Card';
import Tabs from '../../../components/common/Tabs';
import Button from '../../../components/common/Button';
import BankAccountList from '../../../components/pike/BankAccountList';
import BankAccountForm from '../../../components/pike/BankAccountForm';
import useBankAccount from '../../../hooks/useBankAccount';
import useParameter from '../../../hooks/useParameter';
import useToast from '../../../hooks/useToast';
import { BankAccount } from '../../../types/bank-account.types';
import { Parameter } from '../../../types/parameter.types';

/**
 * Functional component that renders the merchant settings page with bank account management and notification preferences
 * @returns {JSX.Element} The rendered component
 */
const SettingsPage: React.FC = () => {
  // LD1: Define state for the active tab using useState hook: const [activeTab, setActiveTab] = useState('bankAccounts')
  const [activeTab, setActiveTab] = useState<'bankAccounts' | 'notificationPreferences'>('bankAccounts');

  // LD1: Define state for showing bank account form: const [showBankAccountForm, setShowBankAccountForm] = useState(false)
  const [showBankAccountForm, setShowBankAccountForm] = useState(false);

  // LD1: Define state for the bank account being edited: const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  // LD1: Access bank account management functionality: const { bankAccounts, fetchBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount, loading: bankAccountsLoading } = useBankAccount()
  const { bankAccounts, fetchBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount, loading: bankAccountsLoading } = useBankAccount();

  // LD1: Access parameter management functionality: const { parameters, fetchParameters, updateParameter, loading: parametersLoading } = useParameter()
  const { parameters, fetchParameters, updateParameter, loading: parametersLoading } = useParameter();

  // LD1: Access toast notifications: const { showToast } = useToast()
  const { showToast } = useToast();

  // LD1: Fetch bank accounts and parameters on component mount using useEffect
  useEffect(() => {
    fetchBankAccounts({ merchantId: 'your_merchant_id' }); // Replace 'your_merchant_id' with the actual merchant ID
    fetchParameters({ entityType: 'MERCHANT', entityId: 'your_merchant_id', page: 1, pageSize: 10 }); // Replace 'your_merchant_id' with the actual merchant ID
  }, [fetchBankAccounts, fetchParameters]);

  // LD1: Define handleTabChange function to switch between settings tabs
  const handleTabChange = (tabId: 'bankAccounts' | 'notificationPreferences') => {
    setActiveTab(tabId);
  };

  // LD1: Define handleAddBankAccount function to show the bank account form
  const handleAddBankAccount = () => {
    setShowBankAccountForm(true);
    setEditingAccount(null);
  };

  // LD1: Define handleEditBankAccount function to populate form with existing account data
  const handleEditBankAccount = (account: BankAccount) => {
    setEditingAccount(account);
    setShowBankAccountForm(true);
  };

  // LD1: Define handleBankAccountSubmit function to create or update bank accounts
  const handleBankAccountSubmit = async (accountData: any) => {
    if (editingAccount) {
      // Update existing account
      await updateBankAccount(editingAccount.accountId, accountData);
    } else {
      // Create new account
      await createBankAccount(accountData);
    }
    setShowBankAccountForm(false);
  };

  // LD1: Define handleBankAccountDelete function to delete bank accounts
  const handleBankAccountDelete = async (accountId: string) => {
    await deleteBankAccount(accountId);
  };

  // LD1: Define handleCloseForm function to close the bank account form
  const handleCloseForm = () => {
    setShowBankAccountForm(false);
    setEditingAccount(null);
  };

  // LD1: Define handleParameterChange function to update merchant parameters
  const handleParameterChange = async (parameter: Parameter, newValue: any) => {
    await updateParameter(parameter.name, parameter.entityType, parameter.entityId, { value: newValue });
    showToast(`Parameter ${parameter.name} updated successfully!`);
  };

  // LD1: Render the main layout with page header 'Settings'
  return (
    <MainLayout>
      <PageHeader title="Settings" />
      <Card>
        <Tabs
          tabs={[
            {
              id: 'bankAccounts',
              label: 'Bank Accounts',
              content: (
                <div>
                  <BankAccountList merchantId="your_merchant_id" /> {/* Replace 'your_merchant_id' with the actual merchant ID */}
                  {showBankAccountForm && (
                    <BankAccountForm
                      accountData={editingAccount}
                      onSubmit={handleBankAccountSubmit}
                      onCancel={handleCloseForm}
                      isLoading={bankAccountsLoading}
                    />
                  )}
                </div>
              ),
            },
            {
              id: 'notificationPreferences',
              label: 'Notification Preferences',
              content: (
                <div>
                  {/* Render notification preferences content here */}
                </div>
              ),
            },
          ]}
          defaultActiveTab={activeTab}
          onChange={handleTabChange}
        />
      </Card>
    </MainLayout>
  );
};

export default SettingsPage;