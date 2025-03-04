import React, { useState, useCallback } from 'react'; // ^18.2.0
import Card from '../../common/Card';
import TextField from '../../common/TextField';
import { Select } from '../../common/Select';
import Checkbox from '../../common/Checkbox';
import Button from '../../common/Button';
import {
  BankAccountType,
  BankAccountFormData,
  BankAccountVerificationMethod,
  BankAccount,
} from '../../../types/bank-account.types';
import useBankAccount from '../../../hooks/useBankAccount';
import useToast from '../../../hooks/useToast';
import { useAuth } from '../../../hooks/useAuth';
import {
  validateRequired,
  validateRoutingNumber,
  validateAccountNumber,
  validateAccountsMatch,
  validateForm,
} from '../../../utils/validation.utils';
import { BANK_ACCOUNT_ERROR_MESSAGES } from '../../../constants/error-messages.constants';

/**
 * Interface defining props for the BankAccountForm component
 */
export interface BankAccountFormProps {
  /** Existing bank account data for editing (optional) */
  accountData?: BankAccount | undefined;
  /** Function to call on form submission */
  onSubmit: (account: BankAccountFormData) => Promise<void>;
  /** Function to call on form cancellation */
  onCancel: () => void;
  /** Flag indicating if the form is in a loading state */
  isLoading: boolean;
  /** Optional CSS class name for the form */
  className?: string;
}

/**
 * A form component for creating and editing bank accounts
 */
const BankAccountForm: React.FC<BankAccountFormProps> = ({
  accountData,
  onSubmit,
  onCancel,
  isLoading,
  className,
}) => {
  // Get user data and merchantId from useAuth hook
  const { user } = useAuth();
  const merchantId = user?.merchantId;

  // Initialize form state with default values or existing account data
  const [formData, setFormData] = useState<BankAccountFormData>({
    accountHolderName: accountData?.accountHolderName || '',
    accountType: accountData?.accountType || BankAccountType.CHECKING,
    routingNumber: accountData?.routingNumber || '',
    accountNumber: '',
    confirmAccountNumber: '',
    isDefault: accountData?.isDefault || false,
    initiateVerification: false,
    verificationMethod: BankAccountVerificationMethod.MICRO_DEPOSIT,
  });

  // Set up state for validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Set up state for showing/hiding verification options
  const [showVerificationOptions, setShowVerificationOptions] = useState(false);

  // Set up toast notification handler
  const { success } = useToast();

  // Set up banking hooks for account operations
  const { createBankAccount, updateBankAccount } = useBankAccount();

  // Define validation rules for all form fields
  const validationRules = {
    accountHolderName: (value: string) => validateRequired(value, 'Account Holder Name'),
    routingNumber: (value: string) => validateRoutingNumber(value),
    accountNumber: (value: string) => validateAccountNumber(value),
    confirmAccountNumber: (value: string) => validateAccountsMatch(value, formData.accountNumber),
  };

  // Implement validate function to validate all fields
  const validate = useCallback(() => {
    const newErrors = validateForm(formData, validationRules);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validationRules]);

  // Implement handleChange to update form fields and clear errors
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value } as any);
    setErrors({ ...errors, [name]: '' });
  };

  // Implement handleSubmit to validate and submit form data
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      if (accountData) {
        // Update existing account
        await updateBankAccount(accountData.accountId, formData);
      } else {
        // Create new account
        await onSubmit(formData);
      }
    }
  };

  // Implement toggleDefault to handle default account checkbox
  const toggleDefault = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, isDefault: e.target.checked });
  };

  // Implement toggleVerification to show/hide verification options
  const toggleVerification = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowVerificationOptions(e.target.checked);
    setFormData({ ...formData, initiateVerification: e.target.checked });
  };

  return (
    <Card title={accountData ? 'Edit Bank Account' : 'Add Bank Account'} className={className}>
      <form onSubmit={handleSubmit}>
        <TextField
          id="accountHolderName"
          name="accountHolderName"
          label="Account Holder Name"
          value={formData.accountHolderName}
          onChange={handleChange}
          error={errors.accountHolderName}
          required
        />
        <Select
          id="accountType"
          name="accountType"
          label="Account Type"
          value={formData.accountType}
          onChange={handleChange}
          options={[
            { value: BankAccountType.CHECKING, label: 'Checking' },
            { value: BankAccountType.SAVINGS, label: 'Savings' },
          ]}
          required
        />
        <TextField
          id="routingNumber"
          name="routingNumber"
          label="Routing Number"
          value={formData.routingNumber}
          onChange={handleChange}
          error={errors.routingNumber}
          required
        />
        <TextField
          id="accountNumber"
          name="accountNumber"
          label="Account Number"
          type="password"
          value={formData.accountNumber}
          onChange={handleChange}
          error={errors.accountNumber}
          required
        />
        <TextField
          id="confirmAccountNumber"
          name="confirmAccountNumber"
          label="Confirm Account Number"
          type="password"
          value={formData.confirmAccountNumber}
          onChange={handleChange}
          error={errors.confirmAccountNumber}
          required
        />
        <Checkbox
          id="isDefault"
          name="isDefault"
          label="Set as Default Account"
          checked={formData.isDefault}
          onChange={toggleDefault}
        />
        <Checkbox
          id="initiateVerification"
          name="initiateVerification"
          label="Verify Account Now"
          checked={formData.initiateVerification}
          onChange={toggleVerification}
        />

        {showVerificationOptions && (
          <Select
            id="verificationMethod"
            name="verificationMethod"
            label="Verification Method"
            value={formData.verificationMethod}
            onChange={handleChange}
            options={[
              { value: BankAccountVerificationMethod.MICRO_DEPOSIT, label: 'Micro-deposit' },
              { value: BankAccountVerificationMethod.INSTANT_VERIFICATION, label: 'Instant Verification' },
            ]}
            required
          />
        )}

        <div className="flex justify-end mt-4">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" className="ml-2" disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default BankAccountForm;
export type { BankAccountFormProps };