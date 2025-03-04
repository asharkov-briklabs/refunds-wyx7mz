# src/web/src/components/pike/RefundForm/RefundForm.tsx
```typescript
import React, { useState, useCallback, useEffect } from 'react'; // react ^18.2.0
import {
  TextField,
  Select,
  CurrencyInput,
  Checkbox,
  Button,
  FileUpload,
  Alert,
  Card,
} from '../../common';
import useRefund from '../../../hooks/useRefund';
import {
  RefundFormData,
  TransactionSummary,
  RefundMethod,
  RefundReasonCode,
} from '../../../types/refund.types';
import {
  getRefundMethodLabel,
  getRefundMethodDescription,
  getRefundMethodProcessingTime,
  requiresBankAccount,
  getSortedRefundMethods,
} from '../../../constants/refund-method.constants';
import { SelectOption } from '../../../types/common.types';

/**
 * Interface for RefundForm component props
 */
export interface RefundFormProps {
  transaction: TransactionSummary;
  onSuccess: (refundId: string) => void;
  onCancel: () => void;
  className?: string;
}

/**
 * Validates the refund form data before submission
 * @param formData 
 * @param transaction 
 * @returns Validation result with isValid flag and error fields
 */
const validateForm = (formData: RefundFormData, transaction: TransactionSummary) => {
  const errors: Partial<RefundFormData> = {};
  let isValid = true;

  if (formData.amount <= 0) {
    errors.amount = 'Refund amount must be greater than zero';
    isValid = false;
  }

  if (formData.amount > transaction.amount) {
    errors.amount = 'Refund amount cannot exceed original transaction amount';
    isValid = false;
  }

  if (!formData.refundMethod) {
    errors.refundMethod = 'Please select a refund method';
    isValid = false;
  }

  if (formData.refundMethod === RefundMethod.OTHER && !formData.bankAccountId) {
    errors.bankAccountId = 'Please select a bank account';
    isValid = false;
  }

  if (!formData.reasonCode) {
    errors.reasonCode = 'Please select a reason code';
    isValid = false;
  }

  if (!formData.reason) {
    errors.reason = 'Please provide a reason description';
    isValid = false;
  }

  return { isValid, errors };
};

/**
 * A form component for creating refund requests
 * @param props 
 * @returns The rendered refund form component
 */
const RefundForm: React.FC<RefundFormProps> = ({ transaction, onSuccess, onCancel, className }) => {
  // LD1: Destructure props to access transaction data, onSuccess, and onCancel callbacks
  // LD1: Initialize form state for refund data with default values
  const [formData, setFormData] = useState<RefundFormData>({
    transactionId: transaction.transactionId,
    amount: transaction.amount,
    refundMethod: transaction.availableRefundMethods[0] || null,
    reasonCode: null,
    reason: '',
    bankAccountId: null,
    supportingDocuments: [],
    isFullRefund: true,
  });

  // LD1: Set up validation state for form fields
  const [errors, setErrors] = useState<Partial<RefundFormData>>({});
  const [loading, setLoading] = useState(false);
  const { createRefund } = useRefund();

  // LD1: Create handler for full refund checkbox toggling
  const handleFullRefundToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setFormData({
      ...formData,
      isFullRefund: checked,
      amount: checked ? transaction.amount : 0,
    });
  };

  // LD1: Create handler for refund amount changes with validation
  const handleAmountChange = (amount: number) => {
    setFormData({
      ...formData,
      amount,
      isFullRefund: false,
    });
  };

  // LD1: Create handler for refund method selection with bank account logic
  const handleRefundMethodChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const method = event.target.value as RefundMethod;
    setFormData({
      ...formData,
      refundMethod: method,
      bankAccountId: requiresBankAccount(method) ? formData.bankAccountId : null,
    });
  };

  // LD1: Create handler for reason code and description changes
  const handleReasonCodeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({
      ...formData,
      reasonCode: event.target.value as RefundReasonCode,
    });
  };

  const handleReasonChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      reason: event.target.value,
    });
  };

  // LD1: Create handler for supporting document uploads
  const handleSupportingDocumentsChange = (files: File[]) => {
    // Assuming you have a way to upload these files and get document IDs
    const documentIds = files.map(file => ({ documentId: file.name, documentType: 'OTHER' }));
    setFormData({
      ...formData,
      supportingDocuments: documentIds,
    });
  };

  // LD1: Implement form submission with validation checks
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // LD1: Validate form data using validateForm function
    const { isValid, errors } = validateForm(formData, transaction);
    if (!isValid) {
      setErrors(errors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      // LD1: Call createRefund API with form data
      if (createRefund) {
        await createRefund(formData);
        onSuccess(transaction.transactionId);
      }
    } catch (error: any) {
      setErrors({ form: error.message });
    } finally {
      setLoading(false);
    }
  };

  // LD1: Generate select options for refund methods
  const refundMethodOptions: SelectOption[] = generateRefundMethodOptions(transaction.availableRefundMethods);

  // LD1: Generate select options for reason codes
  const reasonCodeOptions: SelectOption[] = generateReasonCodeOptions();

  // LD1: Render transaction information section with order details
  // LD1: Render refund details section with amount input and full refund checkbox
  // LD1: Render refund method selection with available methods
  // LD1: Render reason code and description fields
  // LD1: Render supporting documents upload section
  // LD1: Display contextual information about processing times
  // LD1: Include form submission and cancel buttons
  // LD1: Show validation errors when present
  return (
    <Card title="Create Refund" className={className}>
      {errors.form && <Alert type="error" message={errors.form} />}
      <form onSubmit={handleSubmit}>
        <Card title="Transaction Information">
          <p>Transaction ID: {transaction.transactionId}</p>
          <p>Date: {transaction.date}</p>
          <p>Amount: {transaction.amount} {transaction.currency}</p>
          <p>Customer: {transaction.customerName}</p>
          <p>Payment Method: {transaction.paymentMethod}</p>
        </Card>

        <Card title="Refund Details">
          <CurrencyInput
            id="refundAmount"
            label="Refund Amount"
            value={formData.amount}
            onChange={handleAmountChange}
            currencyCode={transaction.currency}
            error={errors.amount}
            required
            disabled={formData.isFullRefund}
          />
          <Checkbox
            id="fullRefund"
            name="fullRefund"
            label="Full Refund"
            checked={formData.isFullRefund}
            onChange={handleFullRefundToggle}
            disabled={loading}
          />
        </Card>

        <Card title="Refund Method">
          <Select
            id="refundMethod"
            name="refundMethod"
            label="Refund Method"
            options={refundMethodOptions}
            value={formData.refundMethod}
            onChange={handleRefundMethodChange}
            error={errors.refundMethod}
            required
            disabled={loading}
          />
          {formData.refundMethod && (
            <p>{getRefundMethodDescription(formData.refundMethod)}</p>
          )}
          {formData.refundMethod && (
            <p>Processing Time: {getRefundMethodProcessingTime(formData.refundMethod)}</p>
          )}
        </Card>

        <Card title="Reason">
          <Select
            id="reasonCode"
            name="reasonCode"
            label="Reason Code"
            options={reasonCodeOptions}
            value={formData.reasonCode}
            onChange={handleReasonCodeChange}
            error={errors.reasonCode}
            required
            disabled={loading}
          />
          <TextField
            id="reason"
            name="reason"
            label="Reason Description"
            value={formData.reason}
            onChange={handleReasonChange}
            error={errors.reason}
            required
            disabled={loading}
          />
        </Card>

        <Card title="Supporting Documents">
          <FileUpload
            id="supportingDocuments"
            name="supportingDocuments"
            label="Supporting Documents"
            onChange={handleSupportingDocumentsChange}
            multiple
            disabled={loading}
          />
        </Card>

        <Button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Process Refund'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </form>
    </Card>
  );
};

/**
 * Generates select options for reason codes
 * @returns Array of options for the reason code dropdown
 */
const generateReasonCodeOptions = (): SelectOption[] => {
  return Object.values(RefundReasonCode).map(code => ({
    value: code,
    label: code.replace(/_/g, ' '),
  }));
};

/**
 * Generates select options for refund methods
 * @param availableMethods 
 * @returns Array of options for the refund method dropdown
 */
const generateRefundMethodOptions = (availableMethods: RefundMethod[]): SelectOption[] => {
  const sortedMethods = getSortedRefundMethods(availableMethods);
  return sortedMethods.map(method => ({
    value: method,
    label: getRefundMethodLabel(method),
  }));
};

export default RefundForm;