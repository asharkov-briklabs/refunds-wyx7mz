import React, { useEffect } from 'react'; // react version ^18.2.0
import { useParams, useNavigate } from 'react-router-dom'; // react-router-dom version ^6.11.2
import RefundDetails from '../../../components/pike/RefundDetails';
import MainLayout from '../../../components/layout/MainLayout';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import Spinner from '../../../components/common/Spinner';
import ErrorMessage from '../../../components/shared/ErrorMessage';
import useRefund from '../../../hooks/useRefund';
import { PIKE_ROUTES } from '../../../constants/routes.constants';

/**
 * Page component for displaying detailed information about a specific refund
 * @returns {JSX.Element} The rendered refund details page
 */
const RefundDetailsPage: React.FC = () => {
  // LD1: Extract refundId from URL parameters using useParams
  const { refundId } = useParams<{ refundId: string }>();

  // LD1: Initialize navigation with useNavigate
  const navigate = useNavigate();

  // LD1: Use the useRefund hook to get refund-related state and operations
  const { getRefund, currentRefund, loading, error } = useRefund();

  // LD1: Call getRefund on component mount with the refundId from URL
  useEffect(() => {
    if (refundId) {
      getRefund(refundId);
    }
  }, [refundId, getRefund]);

  // LD1: Set up breadcrumb items for navigation context
  const breadcrumbItems = [
    { label: 'Dashboard', path: PIKE_ROUTES.DASHBOARD },
    { label: 'Refunds', path: PIKE_ROUTES.REFUNDS },
    { label: refundId || 'Refund Details', path: `${PIKE_ROUTES.REFUNDS}/${refundId}`, active: true },
  ];

  // LD1: Render page content inside MainLayout component
  return (
    <MainLayout>
      {/* LD1: Display Breadcrumbs for navigation hierarchy */}
      <Breadcrumbs items={breadcrumbItems} className="mb-4" />

      {/* LD1: Handle loading state with Spinner component */}
      {loading && <Spinner />}

      {/* LD1: Handle error state with ErrorMessage component */}
      {error && <ErrorMessage message={error} />}

      {/* LD1: Render RefundDetails component with refund data */}
      {currentRefund && (
        <RefundDetails refund={currentRefund} />
      )}
    </MainLayout>
  );
};

export default RefundDetailsPage;