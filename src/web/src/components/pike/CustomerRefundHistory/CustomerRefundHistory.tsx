# src/web/src/components/pike/CustomerRefundHistory/CustomerRefundHistory.tsx
```typescript
import React, { useEffect, useMemo } from 'react'; // react ^18.2.0
import { useRefund } from '../../../hooks/useRefund';
import Table from '../../common/Table';
import RefundStatusBadge from '../../shared/RefundStatusBadge';
import Card from '../../common/Card';
import { formatCurrency } from '../../../utils/currency.utils';
import { formatDate } from '../../../utils/date.utils';
import { RefundSummary, RefundStatus } from '../../../types/refund.types';
import { RefundStatistics } from '../../../types/api.types';

/**
 * @interface CustomerRefundHistoryProps
 * @description Interface for CustomerRefundHistory component props
 */
interface CustomerRefundHistoryProps {
  /**
   * @property customerId
   * @description ID of the customer whose refund history to display
   */
  customerId: string;
  /**
   * @property className
   * @description Additional CSS classes to apply to the component
   */
  className?: string;
}

/**
 * @function CustomerRefundHistory
 * @description Component that displays a customer's refund history including a table of refunds and summary metrics
 * @param {CustomerRefundHistoryProps} props - The props object
 * @returns {JSX.Element} Rendered component displaying customer refund history
 */
const CustomerRefundHistory: React.FC<CustomerRefundHistoryProps> = ({ customerId, className }) => {
  // LD1: Destructure the customerId and className from props
  // LD1: Use the useRefund hook to access refund data and functions
  const { getRefunds, getRefundStatistics, refunds, statistics, loading, pagination } = useRefund();

  // LD1: Use useEffect to fetch refund data for the customer when the component mounts or customerId changes
  useEffect(() => {
    getRefunds({ customerId });
    getRefundStatistics({ customerId });
  }, [customerId, getRefunds, getRefundStatistics]);

  // LD1: Define table columns with headers and cell renderers for the refund history table
  const tableColumns = useMemo(() => [
    {
      id: 'refundId',
      header: 'Refund ID',
      accessor: 'refundId' as keyof RefundSummary,
    },
    {
      id: 'transactionId',
      header: 'Transaction',
      accessor: 'transactionId' as keyof RefundSummary,
    },
    {
      id: 'amount',
      header: 'Amount',
      accessor: 'amount' as keyof RefundSummary,
      cell: (amount: number) => formatCurrency(amount),
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status' as keyof RefundSummary,
      cell: (status: RefundStatus) => <RefundStatusBadge status={status} />,
    },
    {
      id: 'createdAt',
      header: 'Date',
      accessor: 'createdAt' as keyof RefundSummary,
      cell: (createdAt: string) => formatDate(createdAt),
    },
  ], []);

  // LD1: Use useMemo to compute refund rate from statistics (refunds as a percentage of total transactions)
  const refundRate = useMemo(() => {
    if (!statistics) return '0%';
    const rate = statistics.totalCount / statistics.totalAmount;
    return `${(rate * 100).toFixed(2)}%`;
  }, [statistics]);

  // LD1: Render a Card component containing:
  return (
    <Card className={className} title="REFUND HISTORY">
      {/* LD1: A Table component displaying the refund data with status badges and formatted values */}
      <Table
        data={refunds}
        columns={tableColumns}
        isLoading={loading}
        emptyMessage="No refund history available for this customer."
        pagination={{
          currentPage: pagination.page,
          totalItems: pagination.totalItems,
          itemsPerPage: pagination.pageSize,
          onPageChange: (page: number) => getRefunds({ customerId, page }),
        }}
      />
      {/* LD1: A footer showing summary statistics (total refunds amount, refund rate) */}
      <div className="mt-4">
        <p>Total Refunds: {statistics ? formatCurrency(statistics.totalAmount) : '$0.00'}</p>
        <p>Refund Rate: {refundRate}</p>
        {/* LD1: Add contextual guidance about the customer's refund rate */}
        <p className="text-sm text-gray-500">This customer's refund rate is within normal range.</p>
      </div>
    </Card>
  );
};

export default CustomerRefundHistory;