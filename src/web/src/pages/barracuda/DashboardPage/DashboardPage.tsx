import React, { useEffect } from 'react'; // React v18.2.0
import { useNavigate } from 'react-router-dom'; // react-router-dom v6.8.0
import MainLayout from '../../../components/layout/MainLayout';
import PageHeader from '../../../components/layout/PageHeader';
import RefundDashboard from '../../../components/barracuda/RefundDashboard';
import useRefund from '../../../hooks/useRefund';
import { BARRACUDA_ROUTES } from '../../../constants/routes.constants';

/**
 * Main dashboard page component for the Barracuda (admin) interface
 * @returns {JSX.Element} The rendered dashboard page component
 */
const DashboardPage: React.FC = () => {
  // LD1: Import required components and hooks

  // LD1: Define the DashboardPage functional component

  // LD1: Initialize hooks (useRefund)
  const { resetRefundState } = useRefund();

  // LD1: Set up navigation hook for routing
  const navigate = useNavigate();

  // LD1: Set up useEffect to reset refund state when component unmounts
  useEffect(() => {
    // Reset refund state when component unmounts
    return () => {
      resetRefundState();
    };
  }, [resetRefundState]);

  // LD1: Render the MainLayout component as the page wrapper
  return (
    <MainLayout>
      {/* LD1: Render PageHeader with appropriate title */}
      <PageHeader title="Dashboard" />

      {/* LD1: Render RefundDashboard component with refund metrics and issues */}
      <RefundDashboard />
    </MainLayout>
  );
};

// LD1: Export the DashboardPage component for use in routing
export default DashboardPage;