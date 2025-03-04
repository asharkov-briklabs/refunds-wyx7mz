import React, { useState, useEffect, useCallback } from 'react'; // ^18.2.0
import { useNavigate } from 'react-router-dom'; // ^6.10.0
import classNames from 'classnames'; // ^2.3.2
import RefundList from '../../../components/pike/RefundList';
import PageHeader from '../../../components/layout/PageHeader';
import Button from '../../../components/common/Button';
import DateRangeSelector from '../../../components/shared/DateRangeSelector';
import TextField from '../../../components/common/TextField';
import Card from '../../../components/common/Card';
import useRefund from '../../../hooks/useRefund';
import useToast from '../../../hooks/useToast';
import { DateRange, TimeFrame } from '../../../types/common.types';
import { RefundFilterParams } from '../../../types/api.types';
import { RefundStatus } from '../../../types/refund.types';
import { BASE_ROUTES, PIKE_ROUTES } from '../../../constants/routes.constants';

/**
 * Main component that renders the Refunds List page for merchants in the Pike interface
 * @returns {JSX.Element} The rendered Refunds List page
 */
const RefundsListPage: React.FC = () => {
  // IE1: Initialize navigation hook for routing
  const navigate = useNavigate();

  // LD1: Set up state for filter parameters (status, date range, search term)
  const [filters, setFilters] = useState<RefundFilterParams>({
    status: undefined,
    dateRange: { start: undefined, end: undefined },
    searchTerm: '',
  });

  // LD1: Initialize useRefund hook to access refund data and functionality
  const { refunds, loading, error, getRefunds } = useRefund();

  // LD1: Initialize useToast hook for notifications
  const { error: toastError } = useToast();

  /**
   * Handler for when a refund is clicked in the list
   * @param {RefundSummary} refund - refund
   * @returns {void} Navigates to the refund details page
   */
  const handleRefundClick = useCallback((refund: any) => {
    // S1: Navigate to the refund details page using the refund ID
    navigate(`${BASE_ROUTES.PIKE}${PIKE_ROUTES.REFUND_DETAILS.replace(':refundId', refund.refundId)}`);
  }, [navigate]);

  /**
   * Handler for the Create Refund button click
   * @returns {void} Navigates to the create refund page
   */
  const handleCreateRefund = useCallback(() => {
    // S1: Navigate to the create refund page route
    navigate(`${BASE_ROUTES.PIKE}${PIKE_ROUTES.CREATE_REFUND}`);
  }, [navigate]);

  /**
   * Updates filter state when any filter control changes
   * @param {Partial<RefundFilterParams>} updatedFilters - updatedFilters
   * @returns {void} Updates the filter state
   */
  const handleFilterChange = useCallback((updatedFilters: Partial<RefundFilterParams>) => {
    // S1: Merge the updated filters with current filter state
    setFilters((prevFilters) => ({ ...prevFilters, ...updatedFilters }));
  }, []);

  /**
   * Handles date range selection changes
   * @param {DateRange} dateRange - dateRange
   * @param {TimeFrame} timeFrame - timeFrame
   * @returns {void} Updates filter with selected date range
   */
  const handleDateRangeChange = useCallback((dateRange: DateRange, timeFrame: TimeFrame) => {
    // S1: Update filter state with the new date range
    handleFilterChange({ dateRange });
  }, [handleFilterChange]);

  /**
   * Handles changes to the search input
   * @param {React.ChangeEvent<HTMLInputElement>} event - event
   * @returns {void} Updates filter with search term
   */
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    // S1: Extract search term from event target value
    const searchTerm = event.target.value;
    // S1: Update filter state with the new search term
    handleFilterChange({ searchTerm });
  }, [handleFilterChange]);

  // LD2: Set up effect to load refunds when filters change
  useEffect(() => {
    getRefunds(filters);
  }, [filters, getRefunds]);

  return (
    <div>
      {/* LD3: Render PageHeader with title and Create Refund button */}
      <PageHeader
        title="Refunds"
        actions={<Button onClick={handleCreateRefund}>Create Refund</Button>}
      />

      {/* LD4: Render Card containing filter controls (search, status dropdown, date range) */}
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <TextField
            placeholder="Search refunds..."
            onChange={handleSearchChange}
            className="w-64"
          />
          <DateRangeSelector onChange={handleDateRangeChange} />
        </div>
      </Card>

      {/* LD5: Render RefundList component with refund data and handlers */}
      {loading && <div>Loading refunds...</div>}
      {error && <div>Error: {error}</div>}
      {!loading && !error && (
        <RefundList
          refunds={refunds}
          onRefundClick={handleRefundClick}
          onCreateRefund={handleCreateRefund}
        />
      )}
    </div>
  );
};

export default RefundsListPage;