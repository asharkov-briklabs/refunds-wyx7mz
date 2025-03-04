import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react ^18.2.0
import { useNavigate, useParams, useLocation } from 'react-router-dom'; // react-router-dom ^6.8.0
import { MagnifyingGlassIcon, FilterIcon } from '@heroicons/react/24/outline'; // @heroicons/react/24/outline ^2.0.18
import RefundDashboard from '../../../components/barracuda/RefundDashboard';
import Table from '../../../components/common/Table';
import Card from '../../../components/common/Card';
import TextField from '../../../components/common/TextField';
import Button from '../../../components/common/Button';
import Select from '../../../components/common/Select';
import Pagination from '../../../components/common/Pagination';
import Spinner from '../../../components/common/Spinner';
import RefundStatusBadge from '../../../components/shared/RefundStatusBadge';
import DateRangeSelector from '../../../components/shared/DateRangeSelector';
import PageHeader from '../../../components/layout/PageHeader';
import MerchantSelector from '../../../components/barracuda/MerchantSelector';
import useRefund from '../../../hooks/useRefund';
import useToast from '../../../hooks/useToast';
import { RefundStatus, RefundMethod, RefundSummary } from '../../../types/refund.types';
import { DateRange, TimeFrame } from '../../../types/common.types';
import { formatCurrency, formatDate } from '../../../utils/currency.utils';
import { ROUTES } from '../../../constants/routes.constants';
import { getRefundStatusLabel } from '../../../constants/refund-status.constants';

/**
 * Main component for the RefundsPage displaying refund data with filtering and pagination
 * @returns {JSX.Element} The rendered RefundsPage component
 */
const RefundsPage: React.FC = () => {
  // LD1: Initialize state for filter criteria (search term, status, date range, merchant, etc.)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RefundStatus[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>(TimeFrame.LAST_30_DAYS);
  const [merchantId, setMerchantId] = useState<string | null>(null);

  // LD1: Initialize state for pagination (page, pageSize)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // LD1: Initialize state for detailed view mode (dashboard or list view)
  const [viewMode, setViewMode] = useState<'dashboard' | 'list'>('dashboard');

  // LD1: Use the useRefund hook to access refund data and operations
  const { refunds, pagination, loading, error, getRefunds, cancelRefund } = useRefund();

  // LD1: Use the useToast hook for notification display
  const { success, error: toastError } = useToast();

  // LD1: Use the useNavigate hook for navigation between pages
  const navigate = useNavigate();

  // LD1: Use the useLocation and useParams hooks to read URL parameters
  const location = useLocation();
  const params = useParams();

  // LD1: Create a useEffect hook to fetch initial refund data on component mount
  useEffect(() => {
    fetchRefundData();
  }, [page, pageSize, searchTerm, statusFilter, dateRange, merchantId, fetchRefundData]);

  // LD1: Create a useEffect hook to update filters when URL parameters change
  useEffect(() => {
    // TODO: Implement URL parameter-based filtering
  }, [location, params]);

  // LD1: Create a function to handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1); // Reset to first page on search
  };

  // LD1: Create a function to handle filter changes (status, date range, merchant)
  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, (option) => option.value) as RefundStatus[];
    setStatusFilter(selectedOptions);
    setPage(1); // Reset to first page on filter change
  };

  const handleDateRangeChange = (newDateRange: DateRange, newTimeFrame: TimeFrame) => {
    setDateRange(newDateRange);
    setTimeFrame(newTimeFrame);
    setPage(1); // Reset to first page on date range change
  };

  const handleMerchantChange = (newMerchantId: string) => {
    setMerchantId(newMerchantId);
    setPage(1); // Reset to first page on merchant change
  };

  // LD1: Create a function to handle pagination changes
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page on page size change
  };

  // LD1: Create a function to handle row clicks for viewing refund details
  const handleRowClick = (refund: RefundSummary) => {
    navigate(ROUTES.BARRACUDA.REFUND_DETAILS.replace(':refundId', refund.refundId));
  };

  // LD1: Create a function to handle refund cancellation with confirmation
  const handleCancelRefund = async (refundId: string) => {
    const reason = prompt('Please enter the reason for cancelling this refund:');
    if (reason) {
      try {
        await cancelRefund(refundId, reason);
        success('Refund cancellation initiated successfully.');
      } catch (err: any) {
        toastError(`Failed to cancel refund: ${err.message}`);
      }
    } else {
      alert('Cancellation reason is required.');
    }
  };

  // LD1: Create a memoized table columns definition with sorting and custom cell rendering
  const columns = useMemo(() => [
    { field: 'refundId', header: 'Refund ID', sortable: true },
    { field: 'transactionId', header: 'Transaction ID', sortable: true },
    { field: 'amount', header: 'Amount', sortable: true, render: (value: number) => formatCurrency(value) },
    { field: 'status', header: 'Status', sortable: true, render: (status: RefundStatus) => <RefundStatusBadge status={status} /> },
    { field: 'refundMethod', header: 'Method', sortable: true },
    { field: 'createdAt', header: 'Date', sortable: true, render: (value: string) => formatDate(value) },
    {
      field: 'actions',
      header: 'Actions',
      render: (_, refund: RefundSummary) => (
        <Button variant="danger" size="sm" onClick={() => handleCancelRefund(refund.refundId)}>
          Cancel
        </Button>
      ),
    },
  ], [handleCancelRefund]);

  // LD1: Create a memoized filter options for the status filter dropdown
  const statusOptions = useMemo(() => {
    return Object.values(RefundStatus).map(status => ({
      value: status,
      label: getRefundStatusLabel(status),
    }));
  }, []);

  // LD1: Create a useCallback hook to fetch refund data
  const fetchRefundData = useCallback(async () => {
    await getRefunds({
      page,
      pageSize,
      searchQuery: searchTerm,
      status: statusFilter,
      dateRangeStart: dateRange?.startDate,
      dateRangeEnd: dateRange?.endDate,
      merchantId: merchantId || undefined,
    });
  }, [getRefunds, page, pageSize, searchTerm, statusFilter, dateRange, merchantId]);

  // LD1: Render the page header with title and view toggle buttons
  return (
    <div>
      <PageHeader
        title="Refunds"
        subtitle="Manage and monitor refund requests across all merchants"
        actions={(
          <div>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium ${viewMode === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setViewMode('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`ml-2 px-4 py-2 rounded-md text-sm font-medium ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setViewMode('list')}
            >
              List View
            </button>
          </div>
        )}
      />

      {/* LD1: Render the filter section with search, status filter, date range, and merchant selector */}
      <Card className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <TextField
            placeholder="Search refunds..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="md:col-span-1"
            startAdornment={<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />}
          />
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={handleStatusFilterChange}
            isMulti
            placeholder="Filter by status"
            className="md:col-span-1"
          />
          <DateRangeSelector
            onChange={handleDateRangeChange}
            className="md:col-span-1"
          />
          <MerchantSelector
            onChange={handleMerchantChange}
            className="md:col-span-1"
          />
        </div>
      </Card>

      {/* LD1: Render either the dashboard view or the refunds table based on view mode */}
      {viewMode === 'dashboard' ? (
        <RefundDashboard />
      ) : (
        <Card>
          {/* LD1: Render loading indicators when data is being fetched */}
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Spinner size="lg" color="primary" ariaLabel="Loading refunds" />
            </div>
          ) : error ? (
            <div className="text-red-500 py-4">{error}</div>
          ) : (
            <Table
              data={refunds}
              columns={columns}
              onRowClick={handleRowClick}
              ariaLabel="Refunds list"
              pagination={{
                currentPage: page,
                totalItems: pagination.totalItems,
                itemsPerPage: pageSize,
                totalPages: pagination.totalPages,
                onPageChange: handlePageChange,
                onPageSizeChange: handlePageSizeChange,
                pageSizeOptions: [10, 20, 50, 100],
              }}
            />
          )}
        </Card>
      )}
    </div>
  );
};

export default RefundsPage;