import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

// Types for our component
interface Transaction {
  id: string;
  date: string;
  amount: number;
  currency: string;
  customerName: string;
  customerId?: string;
  paymentMethod: {
    type: string;
    last4?: string;
    brand?: string;
  };
}

interface RefundRequest {
  transactionId: string;
  amount: number;
  reasonCode: string;
  reason?: string;
  refundMethod: 'ORIGINAL_PAYMENT' | 'BALANCE' | 'OTHER';
  bankAccountId?: string;
  metadata?: Record<string, any>;
  supportingDocuments?: File[];
}

/**
 * Component that renders the refund creation page
 */
const CreateRefundPage: React.FC = () => {
  const navigate = useNavigate();
  const { transactionId } = useParams<{ transactionId: string }>();
  const location = useLocation();
  
  // Transaction data state
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [isFullRefund, setIsFullRefund] = useState<boolean>(true);
  const [refundMethod, setRefundMethod] = useState<'ORIGINAL_PAYMENT' | 'BALANCE' | 'OTHER'>('ORIGINAL_PAYMENT');
  const [reasonCode, setReasonCode] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [supportingDocuments, setSupportingDocuments] = useState<File[]>([]);
  
  // Submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Fetch transaction details if transactionId is available
  useEffect(() => {
    if (transactionId) {
      fetchTransaction(transactionId);
    }
  }, [transactionId]);
  
  /**
   * Fetches transaction details for the given ID
   */
  const fetchTransaction = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would be an API call to the Payment Service
      // const response = await api.getTransaction(id);
      // const data = response.data;
      
      // Simulate API call for demonstration
      const data: Transaction = {
        id,
        date: new Date().toISOString(),
        amount: 129.99,
        currency: 'USD',
        customerName: 'John Smith',
        paymentMethod: {
          type: 'credit_card',
          brand: 'Visa',
          last4: '4242'
        }
      };
      
      setTransaction(data);
      setRefundAmount(data.amount);
    } catch (err) {
      console.error('Failed to fetch transaction:', err);
      setError('Unable to load transaction details. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Handles form submission of the refund request
   */
  const handleSubmit = async (refundRequest: RefundRequest) => {
    setSubmitting(true);
    setSubmitError(null);
    
    try {
      // In a real implementation, this would be an API call to the Refund Service
      // const response = await api.createRefund(refundRequest);
      // const refundId = response.data.refundId;
      
      // Simulate successful API response
      const refundId = 'ref_' + Math.random().toString(36).substring(2, 11);
      
      // Navigate to the refund details page
      navigate(`/refunds/${refundId}`);
    } catch (error: any) {
      console.error('Failed to create refund:', error);
      setSubmitError(error.message || 'Unable to process refund. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Format currency for display
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency 
    }).format(amount);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Format payment method for display
  const formatPaymentMethod = (paymentMethod: Transaction['paymentMethod']) => {
    if (paymentMethod.type === 'credit_card' || paymentMethod.type === 'debit_card') {
      return `${paymentMethod.brand} ****${paymentMethod.last4}`;
    }
    return paymentMethod.type;
  };
  
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate form
    if (!transactionId) {
      setSubmitError('Transaction ID is required.');
      return;
    }
    
    if (refundAmount <= 0) {
      setSubmitError('Refund amount must be greater than zero.');
      return;
    }
    
    if (transaction && refundAmount > transaction.amount) {
      setSubmitError('Refund amount cannot exceed the original transaction amount.');
      return;
    }
    
    if (!reasonCode) {
      setSubmitError('Please select a reason for the refund.');
      return;
    }
    
    if (refundMethod === 'OTHER' && !bankAccountId) {
      setSubmitError('Please select a bank account for the refund.');
      return;
    }
    
    // Create refund request
    const refundRequest: RefundRequest = {
      transactionId,
      amount: refundAmount,
      reasonCode,
      reason: description || undefined,
      refundMethod,
      bankAccountId: refundMethod === 'OTHER' ? bankAccountId : undefined,
      supportingDocuments: supportingDocuments.length > 0 ? supportingDocuments : undefined
    };
    
    // Submit refund request
    handleSubmit(refundRequest);
  };
  
  if (loading) {
    return <div className="loading-container">Loading transaction details...</div>;
  }
  
  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button className="button" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }
  
  return (
    <div className="create-refund-page">
      <h1 className="page-title">Create Refund</h1>
      
      {transaction && (
        <div className="transaction-card">
          <h2 className="section-title">Original Transaction</h2>
          <div className="transaction-details">
            <div className="detail-row">
              <span className="detail-label">Transaction ID:</span>
              <span className="detail-value">{transaction.id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Date:</span>
              <span className="detail-value">{formatDate(transaction.date)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Amount:</span>
              <span className="detail-value">{formatCurrency(transaction.amount, transaction.currency)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Customer:</span>
              <span className="detail-value">{transaction.customerName}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Payment Method:</span>
              <span className="detail-value">{formatPaymentMethod(transaction.paymentMethod)}</span>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleFormSubmit} className="refund-form">
        <h2 className="section-title">Refund Details</h2>
        
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isFullRefund}
              onChange={(e) => {
                setIsFullRefund(e.target.checked);
                if (e.target.checked && transaction) {
                  setRefundAmount(transaction.amount);
                }
              }}
              className="checkbox-input"
            />
            <span className="checkbox-text">Full Refund</span>
          </label>
        </div>
        
        <div className="form-group">
          <label className="form-label">
            Refund Amount:
            <div className="input-with-prefix">
              <span className="input-prefix">$</span>
              <input
                type="number"
                value={refundAmount}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  setRefundAmount(isNaN(value) ? 0 : value);
                  if (transaction) {
                    setIsFullRefund(value === transaction.amount);
                  }
                }}
                disabled={isFullRefund}
                min={0.01}
                max={transaction?.amount}
                step={0.01}
                required
                className="form-input"
              />
            </div>
          </label>
        </div>
        
        <div className="form-group">
          <label className="form-label">
            Refund Method:
            <select
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value as 'ORIGINAL_PAYMENT' | 'BALANCE' | 'OTHER')}
              required
              className="form-select"
            >
              <option value="ORIGINAL_PAYMENT">Original Payment Method</option>
              <option value="BALANCE">Balance</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
        </div>
        
        {refundMethod === 'OTHER' && (
          <div className="form-group">
            <label className="form-label">
              Bank Account:
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                required
                className="form-select"
              >
                <option value="">Select a bank account</option>
                <option value="bank_123">Business Checking (...1234)</option>
                <option value="bank_456">Savings (...5678)</option>
              </select>
            </label>
          </div>
        )}
        
        <div className="form-group">
          <label className="form-label">
            Reason:
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              required
              className="form-select"
            >
              <option value="">Select a reason</option>
              <option value="CUSTOMER_REQUEST">Customer Request</option>
              <option value="DUPLICATE">Duplicate Charge</option>
              <option value="FRAUDULENT">Fraudulent Charge</option>
              <option value="MERCHANDISE_RETURN">Merchandise Return</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
        </div>
        
        <div className="form-group">
          <label className="form-label">
            Description:
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="form-textarea"
              placeholder="Enter additional details about this refund..."
            />
          </label>
        </div>
        
        <div className="form-group">
          <label className="form-label">
            Supporting Documents:
            <input
              type="file"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setSupportingDocuments(files);
              }}
              className="form-file-input"
            />
          </label>
          <div className="help-text">Optional</div>
        </div>
        
        {refundMethod === 'ORIGINAL_PAYMENT' && (
          <div className="info-box">
            <p>
              Refunds to original payment method typically process within 5-7 business days
              depending on the customer's bank.
            </p>
          </div>
        )}
        
        {refundMethod === 'BALANCE' && (
          <div className="info-box">
            <p>
              Refunds to merchant balance are processed immediately.
            </p>
          </div>
        )}
        
        {refundMethod === 'OTHER' && (
          <div className="info-box">
            <p>
              Bank account refunds typically process within 3-5 business days.
            </p>
          </div>
        )}
        
        {submitError && (
          <div className="error-box">
            <p>{submitError}</p>
          </div>
        )}
        
        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={submitting}
            className="button button-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="button button-primary"
          >
            {submitting ? 'Processing...' : 'Process Refund'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateRefundPage;