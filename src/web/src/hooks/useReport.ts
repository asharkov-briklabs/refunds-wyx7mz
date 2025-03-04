import { useState, useEffect, useCallback, useMemo } from 'react'; // react version ^18.2.0
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { reportActions } from '../store/slices/report.slice';
import {
  fetchReportsThunk,
  fetchReportByIdThunk,
  generateReportThunk,
  getReportResultThunk,
  exportReportThunk,
  getScheduledReportsThunk,
  scheduleReportThunk,
  updateScheduledReportThunk,
  deleteScheduledReportThunk,
  enableScheduledReportThunk,
  disableScheduledReportThunk,
  getRefundMetricsThunk,
  getDashboardDataThunk,
  selectReports,
  selectCurrentReport,
  selectReportExecution,
  selectReportResult,
  selectScheduledReports,
  selectRefundMetrics,
  selectDashboardData,
  selectReportLoading,
  selectReportError,
  selectTotalReports,
  selectTotalScheduledReports,
} from '../store/slices/report.slice';
import {
  ReportDefinition,
  ReportExecution,
  ReportResult,
  ScheduledReport,
  RefundMetrics,
  DashboardData,
  GenerateReportRequest,
  ExportReportRequest,
  ScheduleReportRequest,
  GetReportsRequest,
  GetScheduledReportsRequest,
  GetRefundMetricsRequest,
  GetDashboardDataRequest,
  OutputFormat,
} from '../types/report.types';
import { useToast } from './useToast';

/**
 * Interface defining the return type of the useReport hook
 */
export interface UseReportResult {
  reports: ReportDefinition[];
  currentReport: ReportDefinition | null;
  reportExecution: ReportExecution | null;
  reportResult: ReportResult | null;
  scheduledReports: ScheduledReport[];
  refundMetrics: RefundMetrics | null;
  dashboardData: DashboardData | null;
  loading: boolean;
  error: string | null;
  totalReports: number;
  totalScheduledReports: number;
  fetchReports: (params: GetReportsRequest) => void;
  fetchReportById: (reportId: string) => void;
  generateReport: (reportType: string, parameters: Record<string, any>) => void;
  getReportResult: (executionId: string) => void;
  exportReport: (reportId: string, format: OutputFormat) => void;
  getScheduledReports: (params: GetScheduledReportsRequest) => void;
  scheduleReport: (scheduleParams: ScheduleReportRequest) => void;
  updateScheduledReport: (scheduleId: string, scheduleParams: Partial<ScheduleReportRequest>) => void;
  deleteScheduledReport: (scheduleId: string) => void;
  toggleScheduledReport: (scheduleId: string, enabled: boolean) => void;
  getRefundMetrics: (metricsParams: GetRefundMetricsRequest) => void;
  getDashboardData: (dashboardParams: GetDashboardDataRequest) => void;
  clearReportState: () => void;
}

/**
 * Custom hook that provides an interface for report-related operations
 * @returns An object containing report state and functions to manage reports
 */
function useReport(): UseReportResult {
  // Initialize dispatch and toast notifications
  const dispatch = useAppDispatch();
  const { success, error } = useToast();

  // Select report-related state using Redux selectors
  const reports = useAppSelector(selectReports);
  const currentReport = useAppSelector(selectCurrentReport);
  const reportExecution = useAppSelector(selectReportExecution);
  const reportResult = useAppSelector(selectReportResult);
  const scheduledReports = useAppSelector(selectScheduledReports);
  const refundMetrics = useAppSelector(selectRefundMetrics);
  const dashboardData = useAppSelector(selectDashboardData);
  const loading = useAppSelector(selectReportLoading);
  const reportError = useAppSelector(selectReportError);
  const totalReports = useAppSelector(selectTotalReports);
  const totalScheduledReports = useAppSelector(selectTotalScheduledReports);

  /**
   * Function to fetch report definitions with pagination and filtering
   * @param params Parameters for fetching reports
   */
  const fetchReports = useCallback((params: GetReportsRequest) => {
    dispatch(fetchReportsThunk(params))
      .then(() => {
        // Optionally display a success message
        success('Report definitions fetched successfully');
      })
      .catch((err: any) => {
        // Display an error message
        error(`Failed to fetch report definitions: ${err.message}`);
      });
  }, [dispatch, success, error]);

  /**
   * Function to fetch a specific report by ID
   * @param reportId ID of the report to fetch
   */
  const fetchReportById = useCallback((reportId: string) => {
    dispatch(fetchReportByIdThunk(reportId))
      .then(() => {
        // Optionally display a success message
        success('Report fetched successfully');
      })
      .catch((err: any) => {
        // Display an error message
        error(`Failed to fetch report: ${err.message}`);
      });
  }, [dispatch, success, error]);

  /**
   * Function to generate a report with specified parameters
   * @param reportType Type of report to generate
   * @param parameters Parameters for the report
   */
  const generateReport = useCallback((reportType: string, parameters: Record<string, any>) => {
    dispatch(generateReportThunk({ reportType, parameters }))
      .then(() => {
        // Optionally display a success message
        success('Report generated successfully');
      })
      .catch((err: any) => {
        // Display an error message
        error(`Failed to generate report: ${err.message}`);
      });
  }, [dispatch, success, error]);

  /**
   * Function to fetch results for a generated report
   * @param executionId ID of the report execution
   */
  const getReportResult = useCallback((executionId: string) => {
    dispatch(getReportResultThunk(executionId))
      .then(() => {
        // Optionally display a success message
        success('Report results fetched successfully');
      })
      .catch((err: any) => {
        // Display an error message
        error(`Failed to fetch report results: ${err.message}`);
      });
  }, [dispatch, success, error]);

  /**
   * Function to export a report in the specified format
   * @param reportId ID of the report to export
   * @param format Format to export the report in
   */
  const exportReport = useCallback((reportId: string, format: OutputFormat) => {
    dispatch(exportReportThunk({ reportId, format }))
      .then(() => {
        // Optionally display a success message
        success('Report exported successfully');
      })
      .catch((err: any) => {
        // Display an error message
        error(`Failed to export report: ${err.message}`);
      });
  }, [dispatch, success, error]);

  /**
   * Function to fetch scheduled reports with pagination
   * @param params Parameters for fetching scheduled reports
   */
  const getScheduledReports = useCallback((params: GetScheduledReportsRequest) => {
    dispatch(getScheduledReportsThunk(params))
      .then(() => {
        // Optionally display a success message
        success('Scheduled reports fetched successfully');
      })
      .catch((err: any) => {
        // Display an error message
        error(`Failed to fetch scheduled reports: ${err.message}`);
      });
  }, [dispatch, success, error]);

  /**
   * Function to create a new scheduled report
   * @param scheduleParams Parameters for the scheduled report
   */
  const scheduleReport = useCallback((scheduleParams: ScheduleReportRequest) => {
    dispatch(scheduleReportThunk(scheduleParams))
      .then(() => {
        // Optionally display a success message
        success('Scheduled report created successfully');
      })
      .catch((err: any) => {
        // Display an error message
        error(`Failed to schedule report: ${err.message}`);
      });
  }, [dispatch, success, error]);

  /**
   * Function to update an existing scheduled report
   * @param scheduleId ID of the scheduled report to update
   * @param scheduleParams Parameters to update for the scheduled report
   */
  const updateScheduledReport = useCallback((scheduleId: string, scheduleParams: Partial<ScheduleReportRequest>) => {
    dispatch(updateScheduledReportThunk({ scheduleId, scheduleParams }))
      .then(() => {
        // Optionally display a success message
        success('Scheduled report updated successfully');
      })
      .catch((err: any) => {
        // Display an error message
        error(`Failed to update scheduled report: ${err.message}`);
      });
  }, [dispatch, success, error]);

  /**
   * Function to delete a scheduled report
   * @param scheduleId ID of the scheduled report to delete
   */
  const deleteScheduledReport = useCallback((scheduleId: string) => {
    dispatch(deleteScheduledReportThunk(scheduleId))
      .then(() => {
        // Optionally display a success message
        success('Scheduled report deleted successfully');
      })
      .catch((err: any) => {
        // Display an error message
        error(`Failed to delete scheduled report: ${err.message}`);
      });
  }, [dispatch, success, error]);

  /**
   * Function to enable or disable a scheduled report
   * @param scheduleId ID of the scheduled report to toggle
   * @param enabled Whether to enable or disable the report
   */
  const toggleScheduledReport = useCallback((scheduleId: string, enabled: boolean) => {
    const thunk = enabled ? enableScheduledReportThunk : disableScheduledReportThunk;
    dispatch(thunk(scheduleId))
      .then(() => {
        // Optionally display a success message
        success(`Scheduled report ${enabled ? 'enabled' : 'disabled'} successfully`);
      })
      .catch((err: any) => {
        // Display an error message
        error(`Failed to ${enabled ? 'enable' : 'disable'} scheduled report: ${err.message}`);
      });
  }, [dispatch, success, error]);

  /**
   * Function to fetch refund metrics for analysis
   * @param metricsParams Parameters for the metrics request
   */
  const getRefundMetrics = useCallback((metricsParams: GetRefundMetricsRequest) => {
    dispatch(getRefundMetricsThunk(metricsParams))
      .then(() => {
        // Optionally display a success message
        success('Refund metrics fetched successfully');
      })
      .catch((err: any) => {
        // Display an error message
        error(`Failed to fetch refund metrics: ${err.message}`);
      });
  }, [dispatch, success, error]);

  /**
   * Function to fetch dashboard data with metrics and visualizations
   * @param dashboardParams Parameters for the dashboard request
   */
  const getDashboardData = useCallback((dashboardParams: GetDashboardDataRequest) => {
    dispatch(getDashboardDataThunk(dashboardParams))
      .then(() => {
        // Optionally display a success message
        success('Dashboard data fetched successfully');
      })
      .catch((err: any) => {
        // Display an error message
        error(`Failed to fetch dashboard data: ${err.message}`);
      });
  }, [dispatch, success, error]);

  /**
   * Function to clear report state when unmounting
   */
  const clearReportState = useCallback(() => {
    dispatch(reportActions.clearCurrentReport());
  }, [dispatch]);

  // Return all state variables and functions as an object
  return {
    reports,
    currentReport,
    reportExecution,
    reportResult,
    scheduledReports,
    refundMetrics,
    dashboardData,
    loading,
    error: reportError,
    totalReports,
    totalScheduledReports,
    fetchReports,
    fetchReportById,
    generateReport,
    getReportResult,
    exportReport,
    getScheduledReports,
    scheduleReport,
    updateScheduledReport,
    deleteScheduledReport,
    toggleScheduledReport,
    getRefundMetrics,
    getDashboardData,
    clearReportState,
  };
}

export default useReport;