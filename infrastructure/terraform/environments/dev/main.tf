import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query'; // react-query 4.0+
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// API Client
import { refundsApi } from '../../api/refundsApi';

// Components
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { DateRangePicker } from '../ui/DateRangePicker';
import { Table } from '../ui/Table';
import { StatusIndicator } from '../ui/StatusIndicator';
import { Pagination } from '../ui/Pagination';
import { Card } from '../ui/Card';

// Types
import { RefundStatus, Refund } from '../../types/refund';

// Utils
import { formatCurrency } from '../../utils/formatters';

const statusOptions = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELED', label: 'Canceled' },
];

const dateRangeOptions = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
];

interface RefundStatusDashboardProps {
  merchantId: string;
}

export const RefundStatusDashboard: React.FC<RefundStatusDashboardProps> = ({ merchantId }) => {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [dateRange, setDateRange] = useState('last30days');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const navigate = useNavigate();

  // Calculate date range based on selection
  const getDateRangeFilter = () => {
    if (dateRange === 'custom' && customDateRange.start && customDateRange.end) {
      return {
        start: customDateRange.start,
        end: customDateRange.end
      };
    }
    
    const today = new Date();
    const end = new Date();
    let start = new Date();
    
    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        start.setDate(today.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(today.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'last7days':
        start.setDate(today.getDate() - 7);
        break;
      case 'thisMonth':
        start.setDate(1);
        break;
      case 'lastMonth':
        start.setMonth(today.getMonth() - 1);
        start.setDate(1);
        end.setDate(0);
        break;
      case 'last30days':
      default:
        start.setDate(today.getDate() - 30);
    }
    
    return { start, end };
  };

  // Fetch refunds data
  const { data, isLoading, error, refetch } = useQuery(
    ['refunds', merchantId, selectedStatus, dateRange, customDateRange, page, pageSize, searchTerm],
    () => {
      const dateFilter = getDateRangeFilter();
      
      return refundsApi.getRefunds({
        merchantId,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        dateRangeStart: dateFilter.start.toISOString(),
        dateRangeEnd: dateFilter.end.toISOString(),
        page,
        pageSize,
        searchTerm: searchTerm || undefined,
      });
    },
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1); // Reset to first page on new search
  };

  // Handle status filter change
  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    setPage(1); // Reset to first page on filter change
  };

  // Handle date range change
  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    setPage(1); // Reset to first page on filter change
  };

  // Handle custom date range change
  const handleCustomDateChange = (range: { start: Date | null; end: Date | null }) => {
    setCustomDateRange(range);
    if (range.start && range.end) {
      setPage(1); // Reset to first page on filter change
    }
  };

  // Navigate to refund creation page
  const handleCreateRefund = () => {
    navigate('/refunds/create');
  };

  // Navigate to refund details page
  const handleViewRefund = (refundId: string) => {
    navigate(`/refunds/${refundId}`);
  };

  // Calculate status progress for the indicator
  const getStatusProgress = (status: RefundStatus): number => {
    switch (status) {
      case 'DRAFT':
        return 10;
      case 'SUBMITTED':
        return 30;
      case 'PENDING_APPROVAL':
        return 50;
      case 'PROCESSING':
        return 70;
      case 'COMPLETED':
        return 100;
      case 'FAILED':
        return 0;
      case 'CANCELED':
        return 0;
      default:
        return 0;
    }
  };

  // Render loading state
  if (isLoading && !data) {
    return (
      <Card>
        <div className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading refunds...</p>
        </div>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card>
        <div className="p-8 text-center">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-700 mb-4">There was an error loading your refunds.</p>
          <Button onClick={() => refetch()} variant="secondary">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Refunds</h1>
        <Button onClick={handleCreateRefund} variant="primary">
          Create Refund
        </Button>
      </div>

      <Card>
        <div className="p-6 space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search refunds..."
                value={searchTerm}
                onChange={handleSearchChange}
                leftIcon="search"
              />
            </div>
            <div>
              <Select
                label="Status"
                options={statusOptions}
                value={selectedStatus}
                onChange={handleStatusChange}
              />
            </div>
            <div>
              <Select
                label="Date Range"
                options={dateRangeOptions}
                value={dateRange}
                onChange={handleDateRangeChange}
              />
            </div>
            {dateRange === 'custom' && (
              <div>
                <DateRangePicker
                  startDate={customDateRange.start}
                  endDate={customDateRange.end}
                  onChange={handleCustomDateChange}
                />
              </div>
            )}
          </div>

          {/* Refunds Table */}
          <Table
            columns={[
              { header: 'Refund ID', accessor: 'refundId' },
              { header: 'Transaction', accessor: 'transactionId' },
              { 
                header: 'Amount', 
                accessor: 'amount', 
                cell: (row: Refund) => formatCurrency(row.amount, row.currency) 
              },
              { 
                header: 'Status', 
                accessor: 'status',
                cell: (row: Refund) => (
                  <div className="space-y-1">
                    <div>{row.status.replace('_', ' ')}</div>
                    <StatusIndicator 
                      progress={getStatusProgress(row.status)}
                      status={row.status}
                    />
                  </div>
                )
              },
              { 
                header: 'Date', 
                accessor: 'createdAt',
                cell: (row: Refund) => format(new Date(row.createdAt), 'MM/dd/yy')
              },
              {
                header: 'Actions',
                accessor: 'actions',
                cell: (row: Refund) => (
                  <Button
                    variant="text"
                    onClick={() => handleViewRefund(row.refundId)}
                  >
                    View
                  </Button>
                )
              }
            ]}
            data={data?.refunds || []}
            onRowClick={(row) => handleViewRefund(row.refundId)}
          />

          {/* Pagination */}
          {data && (
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Showing {data.refunds.length} of {data.total} refunds
              </div>
              <Pagination
                currentPage={page}
                totalPages={Math.ceil(data.total / pageSize)}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default RefundStatusDashboard;