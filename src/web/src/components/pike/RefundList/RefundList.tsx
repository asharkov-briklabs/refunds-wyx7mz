import React, { useState, useEffect, useMemo, useCallback } from 'react'; // ^18.2.0
import { Table, TableColumn } from '../../common/Table';
import { Button, ButtonVariant } from '../../common/Button';
import { Select, SelectSize } from '../../common/Select';
import RefundStatusBadge from '../../shared/RefundStatusBadge';
import useRefund from '../../../hooks/useRefund';
import usePagination from '../../../hooks/usePagination';
import { RefundStatus, RefundSummary } from '../../../types/refund.types';
import { formatCurrency } from '../../../utils/currency.utils';
import { formatDateToMedium } from '../../../utils/date.utils';
import classNames from 'classnames'; // Import classNames

// Define the number of items to display per page
const ITEMS_PER_PAGE = 10;

// Define default filter values
const DEFAULT_FILTERS = { status: undefined, dateRange: { start: undefined, end: undefined }, searchTerm: '' };

/**
 * Interface for the RefundList component props
 */
interface RefundListProps {
  /** Optional function called when a refund row is clicked, receives the refund object */
  onRefundClick?: (refund: RefundSummary) => void;
  /** Optional function called when the Create Refund button is clicked */
  onCreateRefund?: () => void;
  /** Optional additional CSS classes to apply to the component */
  className?: string;
}

/**
 * Component that displays a paginated list of refunds with filtering options
 */
const RefundList: React.FC<RefundListProps> = ({ onRefundClick, onCreateRefund, className }) => {
  // Initialize filter state for status, date range, and search term
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Use the useRefund hook to access refund data and functions
  const { refunds, pagination, loading, error, getRefunds } = useRefund();

  // Use the usePagination hook for managing pagination state
  const { currentPage, totalPages, goToPage } = usePagination({
    totalItems: pagination.totalItems,
    itemsPerPage: ITEMS_PER_PAGE,
    initialPage: pagination.page,
  });

  // Create effect to load refunds when component mounts or filters change
  useEffect(() => {
    getRefunds({
      ...filters,
      pagination: {
        page: currentPage,
        pageSize: ITEMS_PER_PAGE,
      },
    });
  }, [getRefunds, filters, currentPage]);

  // Define column configuration for the Table component
  const columnConfig: TableColumn<RefundSummary>[] = useMemo(
    () => [
      { field: 'refundId', label: 'Refund ID', sortable: true },
      { field: 'transactionId', label: 'Transaction ID', sortable: true },
      { field: 'amount', label: 'Amount', sortable: true, render: formatAmount },
      { field: 'status', label: 'Status', sortable: true, render: formatStatus },
      { field: 'createdAt', label: 'Date', sortable: true, render: formatDate },
    ],
    []
  );

  // Implement handleFilterChange function for updating filters
  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters((prevFilters) => ({ ...prevFilters, ...newFilters }));
    goToPage(1); // Reset to first page on filter change
  };

  // Create formatter functions for table cell rendering (formatStatus, formatAmount, formatDate)
  const formatStatus = (refund: RefundSummary): JSX.Element => {
    // Return a RefundStatusBadge component with the refund's status
    return <RefundStatusBadge status={refund.status} />;
  };

  const formatAmount = (refund: RefundSummary): string => {
    // Use formatCurrency utility to format the refund amount with the appropriate currency
    return formatCurrency(refund.amount, refund.currency);
  };

  const formatDate = (refund: RefundSummary): string => {
    // Use formatDateToMedium utility to format the refund createdAt date
    return formatDateToMedium(refund.createdAt);
  };

  // Define status options for the status filter dropdown
  const statusOptions = useMemo(() => [
    { value: '', label: 'All Statuses' },
    { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
    { value: 'PROCESSING', label: 'Processing' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'FAILED', label: 'Failed' },
  ], []);

  return (
    <div className={classNames('refund-list-container', className)}>
      {/* Render filter controls (status dropdown, search input, date range selector) */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <Select
            name="status"
            value={filters.status || ''}
            options={statusOptions}
            size={SelectSize.SM}
            onChange={(e) => handleFilterChange({ status: e.target.value as RefundStatus | undefined })}
            className="w-48"
          />
          {/* Add search input and date range selector here */}
        </div>
        {/* Include Create Refund button if onCreateRefund is provided */}
        {onCreateRefund && (
          <Button variant={ButtonVariant.PRIMARY} size="sm" onClick={onCreateRefund}>
            Create Refund
          </Button>
        )}
      </div>

      {/* Render the Table component with refund data and column config */}
      <Table
        data={refunds}
        columns={columnConfig}
        isLoading={loading}
        emptyMessage={error || 'No refunds found.'}
        onRowClick={onRefundClick}
        pagination={{
          currentPage,
          totalItems: pagination.totalItems,
          itemsPerPage: ITEMS_PER_PAGE,
          totalPages,
          onPageChange: goToPage,
        }}
      />
    </div>
  );
};

export default RefundList;