import React, { useState, useEffect } from 'react'; // react version ^18.2.0
import { useParams, useNavigate, Link } from 'react-router-dom'; // react-router-dom version ^6.11.2
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import RefundStatusBadge from '../../../components/shared/RefundStatusBadge';
import RefundTimeline from '../RefundTimeline';
import { Refund, RefundMethod, RefundStatus } from '../../../types/refund.types';
import { useRefund } from '../../../hooks/useRefund';
import { formatDateTime, formatDateToMedium } from '../../../utils/date.utils';
import { formatCurrency } from '../../../utils/currency.utils';
import { getRefundStatusDescription, isRefundInProgress } from '../../../constants/refund-status.constants';
import { getRefundMethodLabel } from '../../../constants/refund-method.constants';

/**
 * @interface RefundDetailsProps
 * @description Props for the RefundDetails component (empty as it gets data from URL and hooks)
 */
interface RefundDetailsProps {}

/**
 * @function RefundDetails
 * @description Component that displays detailed information about a specific refund
 * @returns {JSX.Element} The rendered RefundDetails component
 */
const RefundDetails: React.FC<RefundDetailsProps> = () => {
  // LD1: Extract refundId from URL parameters using useParams
  const { refundId } = useParams<{ refundId: string }>();

  // LD1: Set up navigation with useNavigate for redirects
  const navigate = useNavigate();

  // LD1: Initialize state for confirmation dialog visibility
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // LD1: Use the useRefund hook to get refund data and operations
  const { 
    currentRefund, 
    loading, 
    error, 
    getRefund, 
    cancelRefund 
  } = useRefund();

  // LD1: Call getRefund on component mount with the refundId from URL
  useEffect(() => {
    if (refundId) {
      getRefund(refundId);
    }
  }, [refundId, getRefund]);

  // LD1: Implement handleCancelRefund function to show confirmation dialog
  const handleCancelRefund = () => {
    setCancelDialogOpen(true);
  };

  // LD1: Implement confirmCancelRefund function to actually cancel the refund
  const confirmCancelRefund = async (reason: string) => {
    if (refundId) {
      await cancelRefund(refundId, reason);
      setCancelDialogOpen(false);
      navigate('/refunds');
    }
  };

  // LD1: Render layout with back button navigation to refunds list
  return (
    <div>
      <Link to="/refunds" className="text-blue-500 hover:underline mb-4 block">
        &lt; Back to Refunds
      </Link>

      {loading && <p>Loading refund details...</p>}
      {error && <p>Error: {error}</p>}

      {currentRefund && (
        <div>
          {/* LD1: Display refund ID and status badge at the top */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Refund ID: {currentRefund.refundId}</h2>
            <RefundStatusBadge status={currentRefund.status} />
          </div>

          {/* LD1: Render Transaction Information section in a Card */}
          <Card title="Transaction Information" className="mb-4">
            <p>Transaction ID: {currentRefund.transactionId}</p>
            <p>Date: {formatDateToMedium(currentRefund.createdAt)}</p>
            <p>Amount: {formatCurrency(currentRefund.amount, currentRefund.currency)}</p>
            <p>Customer ID: {currentRefund.customerId}</p>
          </Card>

          {/* LD1: Render Refund Details section in a Card */}
          <Card title="Refund Details" className="mb-4">
            <p>Refund Amount: {formatCurrency(currentRefund.amount, currentRefund.currency)}</p>
            <p>Refund Method: {getRefundMethodLabel(currentRefund.refundMethod)}</p>
            <p>Reason: {currentRefund.reason}</p>
          </Card>

          {/* LD1: Render Processing Timeline section with the RefundTimeline component */}
          <Card title="Processing Timeline" className="mb-4">
            <RefundTimeline refund={currentRefund} />
          </Card>

          {/* LD1: Display contextual information about the current status */}
          <p className="mb-4">{getRefundStatusDescription(currentRefund.status)}</p>

          {/* LD1: Show Cancel Refund button if refund is still in progress */}
          {isRefundInProgress(currentRefund.status) && (
            <Button variant="danger" onClick={handleCancelRefund}>
              Cancel Refund
            </Button>
          )}

          {/* LD1: Render confirmation dialog when cancelDialogOpen is true */}
          {cancelDialogOpen && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Confirm Cancellation
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to cancel this refund?
                  </p>
                  <textarea
                    className="mt-4 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Reason for cancellation"
                    onChange={(e) => {
                      // Store cancellation reason (implementation needed)
                    }}
                  />
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <Button variant="secondary" onClick={() => setCancelDialogOpen(false)}>
                    Go Back
                  </Button>
                  <Button variant="danger" onClick={() => confirmCancelRefund('User Canceled')}>
                    Confirm Cancellation
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RefundDetails;