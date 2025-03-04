import React, { useState, useEffect, useCallback } from 'react'; // React v18.2.0
import { useNavigate } from 'react-router-dom'; // react-router-dom v6.0.0
import MainLayout from '../../../components/layout/MainLayout';
import PageHeader from '../../../components/layout/PageHeader';
import MetricCard from '../../../components/charts/MetricCard';
import RefundList from '../../../components/pike/RefundList';
import BankAccountList from '../../../components/pike/BankAccountList';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import Spinner from '../../../components/common/Spinner';
import useRefund, { UseRefundReturn } from '../../../hooks/useRefund';
import useAuth from '../../../hooks/useAuth';
import { RefundStatistics } from '../../../types/refund.types';

/**
 * The main dashboard page component for merchant users
 * @returns {JSX.Element} The rendered dashboard page
 */
const DashboardPage: React.FC = () => {
  // IE1: Get navigation function from useNavigate hook
  const navigate = useNavigate();

  // IE1: Get current user information from useAuth hook
  const { currentUser } = useAuth();

  // IE1: Get refund statistics, loading state, and getRefundStatistics function from useRefund hook
  const { statistics, loading, getRefundStatistics } = useRefund();

  /**
   * Navigates to the create refund page
   * @returns {void} No return value
   */
  const handleCreateRefund = useCallback(() => {
    // IE1: Use navigate function to redirect to the create refund page route
    navigate('/refunds/create');
  }, [navigate]);

  /**
   * Navigates to the details page for a specific refund
   * @param {RefundSummary} refund - refund
   * @returns {void} No return value
   */
  const handleRefundClick = useCallback((refund: any) => {
    // IE1: Use navigate function to redirect to the refund details page with the refund ID
    navigate(`/refunds/${refund.refundId}`);
  }, [navigate]);

  // IE1: Fetch refund statistics when component mounts
  useEffect(() => {
    getRefundStatistics({});
  }, [getRefundStatistics]);

  // IE1: Render the main layout with page header and dashboard content
  // IE1: Display metrics section with cards showing key statistics
  // IE1: Display recent refunds section with RefundList component
  // IE1: Display bank accounts section with BankAccountList component
  // IE1: Add appropriate loading states for async data
  return (
    <MainLayout>
      <PageHeader title="Dashboard" actions={<Button onClick={handleCreateRefund}>Create Refund</Button>} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <MetricCard
          label="Total Refund Amount"
          value={statistics?.totalAmount || 0}
          format="currency"
          isLoading={loading}
        />
        <MetricCard
          label="Refund Count"
          value={statistics?.totalCount || 0}
          format="number"
          isLoading={loading}
        />
        <MetricCard
          label="Average Processing Time"
          value={statistics?.averageProcessingTime || 0}
          format="number"
          isLoading={loading}
        />
        <MetricCard
          label="Success Rate"
          value={statistics?.successRate || 0}
          format="percentage"
          isLoading={loading}
        />
      </div>
      <Card title="Recent Refunds">
        <RefundList onRefundClick={handleRefundClick} />
      </Card>
      <Card title="Bank Accounts">
        <BankAccountList merchantId={currentUser?.merchantId || ''} />
      </Card>
    </MainLayout>
  );
};

export default DashboardPage;