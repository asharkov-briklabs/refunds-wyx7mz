import React, { useState, useEffect, useMemo } from 'react'; // React v18.2.0
import { useNavigate } from 'react-router-dom'; // react-router-dom v6.8.0
import MainLayout from '../../../components/layout/MainLayout';
import PageHeader from '../../../components/layout/PageHeader';
import Card from '../../../components/common/Card';
import DateRangeSelector from '../../../components/shared/DateRangeSelector';
import Tabs from '../../../components/common/Tabs';
import RefundDashboard from '../../../components/barracuda/RefundDashboard';
import RefundAnalytics from '../../../components/barracuda/RefundAnalytics';
import Spinner from '../../../components/common/Spinner';
import Button from '../../../components/common/Button';
import MerchantSelector from '../../../components/barracuda/MerchantSelector';
import useReport from '../../../hooks/useReport';
import { DateRange, TimeFrame } from '../../../types/common.types';
import { DashboardData } from '../../../types/report.types';

// Enum defining available dashboard types
enum DashboardType {
  OVERVIEW = 'overview',
  REFUNDS = 'refunds',
  ANALYTICS = 'analytics',
  PERFORMANCE = 'performance',
  COMPLIANCE = 'compliance',
}

// Interface defining a dashboard tab configuration
interface DashboardTab {
  id: DashboardType;
  label: string;
  description?: string;
}

/**
 * Page component that displays various dashboard views for refund analytics and monitoring
 * @returns {JSX.Element} The rendered dashboard page component
 */
const DashboardsPage: React.FC = () => {
  // LD1: Initialize state for selected dashboard type with useState
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardType>(DashboardType.OVERVIEW);
  // LD1: Initialize state for date range with useState, defaulting to LAST_30_DAYS
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  // LD1: Initialize state for selected merchant ID with useState
  const [selectedMerchant, setSelectedMerchant] = useState<string | undefined>(undefined);
  // LD1: Initialize state for dashboard data with useState
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  // LD1: Initialize loading state with useState
  const [loading, setLoading] = useState<boolean>(false);
  // LD1: Initialize compare with previous period flag with useState
  const [compareWithPrevious, setCompareWithPrevious] = useState<boolean>(false);
  // LD1: Set up navigation hook for routing
  const navigate = useNavigate();
  // LD1: Use the useReport hook to fetch dashboard data
  const { getDashboardData } = useReport();

  // LD1: Create fetchDashboardData function to fetch dashboard data based on current filters
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await getDashboardData({
        timeRange: dateRange || undefined,
        merchantId: selectedMerchant,
        compareWithPrevious: compareWithPrevious,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  // LD1: Create handleDateRangeChange function to update date range and refetch data
  const handleDateRangeChange = (newDateRange: DateRange, timeFrame: TimeFrame) => {
    setDateRange(newDateRange);
    fetchDashboardData();
  };

  // LD1: Create handleMerchantChange function to update selected merchant and refetch data
  const handleMerchantChange = (merchantId: string) => {
    setSelectedMerchant(merchantId);
    fetchDashboardData();
  };

  // LD1: Create handleCompareToggle function to toggle comparison with previous period
  const handleCompareToggle = () => {
    setCompareWithPrevious(!compareWithPrevious);
    fetchDashboardData();
  };

  // LD1: Create handleDashboardChange function to change dashboard type
  const handleDashboardChange = (dashboardType: DashboardType) => {
    setSelectedDashboard(dashboardType);
  };

  // LD1: Set up useEffect to fetch dashboard data when component mounts or filters change
  useEffect(() => {
    fetchDashboardData();
  }, [dateRange, selectedMerchant, compareWithPrevious]);

  // LD1: Create dashboard tabs configuration using useMemo
  const dashboardTabs: DashboardTab[] = useMemo(() => [
    { id: DashboardType.OVERVIEW, label: 'Overview', description: 'Summary of key refund metrics' },
    { id: DashboardType.ANALYTICS, label: 'Analytics', description: 'Detailed refund analytics and trends' },
    { id: DashboardType.REFUNDS, label: 'Refunds', description: 'List of recent refunds' },
    { id: DashboardType.PERFORMANCE, label: 'Performance', description: 'Performance metrics for refund processing' },
    { id: DashboardType.COMPLIANCE, label: 'Compliance', description: 'Compliance metrics and violations' },
  ], []);

  // LD1: Render page with MainLayout wrapper
  return (
    <MainLayout>
      {/* LD1: Render PageHeader with title 'Dashboards' */}
      <PageHeader title="Dashboards" />

      {/* LD1: Render filter controls including DateRangeSelector and MerchantSelector */}
      <div className="mb-4">
        <DateRangeSelector onChange={handleDateRangeChange} />
        <MerchantSelector onChange={handleMerchantChange} />
      </div>

      {/* LD1: Render Tabs component for switching between dashboard types */}
      <Tabs
        tabs={dashboardTabs.map(tab => ({
          id: tab.id,
          label: tab.label,
          content: null,
        }))}
        defaultActiveTab={selectedDashboard}
        onChange={handleDashboardChange}
      />

      {/* LD1: Render loading spinner when data is being fetched */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" color="primary" ariaLabel="Loading dashboard data" />
        </div>
      ) : (
        <>
          {/* LD1: Conditionally render different dashboard components based on selected type */}
          {/* LD1: For OVERVIEW type, render RefundDashboard component */}
          {selectedDashboard === DashboardType.OVERVIEW && (
            <RefundDashboard />
          )}

          {/* LD1: For ANALYTICS type, render RefundAnalytics component */}
          {selectedDashboard === DashboardType.ANALYTICS && (
            <RefundAnalytics />
          )}

          {/* LD1: For other types, render placeholders or specific dashboard components */}
          {[DashboardType.REFUNDS, DashboardType.PERFORMANCE, DashboardType.COMPLIANCE].includes(selectedDashboard) && (
            <Card>
              <p>Dashboard content for {selectedDashboard} is under development.</p>
            </Card>
          )}
        </>
      )}
    </MainLayout>
  );
};

export default DashboardsPage;