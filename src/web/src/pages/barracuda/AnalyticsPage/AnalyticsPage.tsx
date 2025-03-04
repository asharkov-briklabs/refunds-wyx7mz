# src/web/src/pages/barracuda/AnalyticsPage/AnalyticsPage.tsx
```typescript
import React, { useState, useEffect, useCallback } from 'react'; // React v18.2.0+
import MainLayout from '../../../components/layout/MainLayout';
import PageHeader from '../../../components/layout/PageHeader';
import RefundAnalytics from '../../../components/barracuda/RefundAnalytics';
import { DateRange, TimeFrame } from '../../../types/common.types';
import useReport from '../../../hooks/useReport';

/**
 * Main component rendering the analytics page with header and content
 * @returns Rendered analytics page component
 */
const AnalyticsPage: React.FC = () => {
  // LD1: Initialize state for date range, merchant ID, and export format
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [merchantId, setMerchantId] = useState<string | undefined>(undefined);
  const [exportFormat, setExportFormat] = useState<string>('CSV');

  // LD1: Get the refund metrics data and loading state using the useReport hook
  const { refundMetrics, loading, getRefundMetrics } = useReport();

  // LD1: Set up useEffect to track page visits and clear report state on unmount
  useEffect(() => {
    // Track page visit analytics here (e.g., using Google Analytics)
    console.log('Analytics page visited');

    // Clear report state on unmount
    return () => {
      // clearReportState();
    };
  }, []);

  /**
   * Handles date range change events from the date selector
   * @param dateRange dateRange
   * @returns {void} No return value
   */
  const handleDateRangeChange = (dateRange: DateRange): void => {
    // Update dateRange state with new value
    setDateRange(dateRange);
    // Call getRefundMetrics with new date range and current merchantId
    getRefundMetrics({ timeRange: dateRange, merchantId: merchantId });
  };

  /**
   * Handles merchant selection change events
   * @param merchantId string
   * @returns {void} No return value
   */
  const handleMerchantChange = (merchantId: string): void => {
    // Update merchantId state with new value
    setMerchantId(merchantId);
    // Call getRefundMetrics with current date range and new merchantId
    getRefundMetrics({ timeRange: dateRange, merchantId: merchantId });
  };

  /**
   * Handles export action for analytics data
   * @param format OutputFormat
   * @returns {void} No return value
   */
  const handleExport = (format: string): void => {
    // Update exportFormat state
    setExportFormat(format);
    // Trigger export of refund metrics in the specified format
    // Handle successful export with appropriate notification or download
  };

  // LD1: Render the page with MainLayout wrapper for consistent application structure
  // LD1: Render PageHeader with 'Refund Analytics' title and optional export actions
  // LD1: Render main content with RefundAnalytics component and necessary props
  // LD1: Pass callback handlers and loading state to RefundAnalytics component
  return (
    <MainLayout>
      <PageHeader
        title="Refund Analytics"
        actions={
          <div>
            {/* Add export button or dropdown here */}
          </div>
        }
      />
      <RefundAnalytics
        defaultTimeFrame={TimeFrame.LAST_30_DAYS}
        defaultMerchantId={merchantId}
        showMerchantSelector={true}
        onDateRangeChange={handleDateRangeChange}
        onMerchantChange={handleMerchantChange}
      />
    </MainLayout>
  );
};

export default AnalyticsPage;