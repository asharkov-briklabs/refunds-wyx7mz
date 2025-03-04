# src/web/src/pages/barracuda/ReportsPage/ReportsPage.tsx
```typescript
import React, { useState, useEffect, useCallback, useMemo } from 'react'; // React v18.2.0
import { PlusIcon, ClockIcon, DocumentIcon } from '@heroicons/react/24/outline'; // @heroicons/react/24/outline version ^2.0.17
import MainLayout from '../../../components/layout/MainLayout';
import PageHeader from '../../../components/layout/PageHeader';
import Button from '../../../components/common/Button';
import Table from '../../../components/common/Table';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/common/Modal';
import { Tabs, Tab } from '../../../components/common/Tabs';
import DateRangeSelector from '../../../components/shared/DateRangeSelector';
import ReportGenerator from '../../../components/barracuda/ReportGenerator';
import useReport from '../../../hooks/useReport';
import { ReportType, ReportDefinition, ScheduledReport, OutputFormat } from '../../../types/report.types';

/**
 * Main component for the Reports page in the Barracuda admin interface
 * @returns Rendered Reports page
 */
const ReportsPage: React.FC = () => {
  // LD1: Initialize report-related state and functions using useReport hook
  const {
    reports,
    scheduledReports,
    loading,
    fetchReports,
    exportReport,
  } = useReport();

  // LD1: Set up local state for UI controls (activeTab, currentView, filters, pagination)
  const [activeTab, setActiveTab] = useState<string>('available');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // LD1: Set up state for report generation modal (isCreateModalOpen)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // LD1: Set up state for scheduled reports modal (isScheduledModalOpen)
  const [isScheduledModalOpen, setIsScheduledModalOpen] = useState(false);

  // LD1: Fetch available reports on component mount
  useEffect(() => {
    fetchReports({ pagination: { page, pageSize } });
  }, [fetchReports, page, pageSize]);

  /**
   * Define pagination handlers for report listings
   * @param number pageNumber
   */
  const handlePageChange = (pageNumber: number) => {
    setPage(pageNumber);
  };

  /**
   * Define filter handlers for report search and date range
   * @param string query
   */
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  /**
   * Define tab change handler for switching between reports and scheduled reports
   * @param string tabId
   */
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setPage(1); // Reset pagination to first page
    // Load appropriate data based on selected tab (reports or scheduled reports)
  };

  /**
   * Implement modal open/close handlers
   */
  const handleCreateReport = () => {
    setIsCreateModalOpen(true);
  };

  /**
   * Closes the report creation modal
   */
  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  /**
   * Handles successful report generation
   * @param object report
   */
  const handleReportGenerated = (report: any) => {
    handleCloseCreateModal();
    // Navigate to report results view
    // Display success notification
    // Refresh reports list
  };

  /**
   * Opens the scheduled reports modal
   */
  const handleViewScheduledReports = () => {
    setIsScheduledModalOpen(true);
    // Fetch current scheduled reports data
  };

  /**
   * Exports a report in the specified format
   * @param string reportId
   * @param OutputFormat format
   */
  const handleExportReport = async (reportId: string, format: OutputFormat) => {
    try {
      await exportReport(reportId, format);
      // Handle successful export by initiating file download
      // Display appropriate notifications for success or failure
    } catch (error) {
      // Handle export error
    }
  };

  /**
   * Define columns configuration for the reports table
   */
  const reportColumns = useMemo(() => [
    { id: 'name', label: 'Report Name' },
    { id: 'description', label: 'Description' },
    { id: 'type', label: 'Type' },
    { id: 'createdAt', label: 'Created At' },
    { id: 'actions', label: 'Actions' },
  ], []);

  /**
   * Define columns configuration for the scheduled reports table
   */
  const scheduledReportColumns = useMemo(() => [
    { id: 'name', label: 'Report Name' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'lastRun', label: 'Last Run' },
    { id: 'nextRun', label: 'Next Run' },
    { id: 'status', label: 'Status' },
    { id: 'actions', label: 'Actions' },
  ], []);

  // LD1: Render the component with MainLayout wrapper
  return (
    <MainLayout>
      {/* LD1: Render PageHeader with title and action buttons */}
      <PageHeader
        title="Reports"
        actions={
          <Button onClick={handleCreateReport}>
            <PlusIcon className="h-5 w-5 mr-2" aria-hidden="true" />
            Generate Report
          </Button>
        }
      />

      {/* LD1: Render tab navigation for 'Available Reports' and 'Scheduled Reports' */}
      <Tabs
        tabs={[
          { id: 'available', label: 'Available Reports', content: null },
          { id: 'scheduled', label: 'Scheduled Reports', content: null },
        ]}
        defaultActiveTab={activeTab}
        onChange={handleTabChange}
      />

      {/* LD1: Render filter controls for searching and date filtering */}
      <div>
        {/* Search Input */}
        {/* Date Range Selector */}
      </div>

      {/* LD1: Render Table component with appropriate data based on active tab */}
      {activeTab === 'available' && (
        <Table
          columns={reportColumns}
          data={reports}
          isLoading={loading}
        />
      )}

      {activeTab === 'scheduled' && (
        <Table
          columns={scheduledReportColumns}
          data={scheduledReports}
          isLoading={loading}
        />
      )}

      {/* LD1: Render report generation modal with ReportGenerator component */}
      <Modal isOpen={isCreateModalOpen} onClose={handleCloseCreateModal} title="Generate Report">
        <ReportGenerator merchantId="someMerchantId" />
      </Modal>

      {/* LD1: Render scheduled reports management modal */}
      <Modal isOpen={isScheduledModalOpen} onClose={() => setIsScheduledModalOpen(false)} title="Scheduled Reports">
        {/* Scheduled Reports Management UI */}
      </Modal>
    </MainLayout>
  );
};

export default ReportsPage;