/**
 * Report API Service
 *
 * This service handles communication with the backend API for report-related operations,
 * including retrieving report definitions, generating reports, exporting reports,
 * scheduling recurring reports, and accessing dashboard data and refund metrics.
 *
 * @version 1.0.0
 */

import apiClient from './api.client';
import { REPORTING_ENDPOINTS } from '../../constants/api.constants';
import {
  ApiResponse,
  PaginatedResponse
} from '../../types/api.types';
import {
  ReportDefinition,
  ReportExecution,
  ReportResult,
  ScheduledReport,
  GenerateReportRequest,
  ExportReportRequest,
  ScheduleReportRequest,
  GetReportsRequest,
  GetScheduledReportsRequest,
  RefundMetrics,
  GetRefundMetricsRequest,
  DashboardData,
  GetDashboardDataRequest,
  OutputFormat
} from '../../types/report.types';

/**
 * Fetches available report definitions with optional filtering
 * @param params Filter and pagination parameters
 * @returns Promise resolving to paginated list of report definitions
 */
const getReportDefinitions = async (
  params: GetReportsRequest
): Promise<ApiResponse<PaginatedResponse<ReportDefinition>>> => {
  return apiClient.get(REPORTING_ENDPOINTS.BASE, params);
};

/**
 * Fetches a specific report definition by its ID
 * @param reportDefinitionId The ID of the report definition to retrieve
 * @returns Promise resolving to detailed report definition
 */
const getReportDefinitionById = async (
  reportDefinitionId: string
): Promise<ApiResponse<ReportDefinition>> => {
  if (!reportDefinitionId) {
    throw new Error('Report definition ID is required');
  }
  
  return apiClient.get(REPORTING_ENDPOINTS.GET_BY_ID(reportDefinitionId));
};

/**
 * Generates a report based on the specified definition and parameters
 * @param generateParams Report generation parameters including definition ID and parameters
 * @returns Promise resolving to report execution data
 */
const generateReport = async (
  generateParams: GenerateReportRequest
): Promise<ApiResponse<ReportExecution>> => {
  if (!generateParams.reportDefinitionId) {
    throw new Error('Report definition ID is required');
  }
  
  return apiClient.post(REPORTING_ENDPOINTS.GENERATE, generateParams);
};

/**
 * Fetches the status and metadata of a report execution
 * @param executionId The ID of the report execution to retrieve
 * @returns Promise resolving to report execution data
 */
const getReportExecutionById = async (
  executionId: string
): Promise<ApiResponse<ReportExecution>> => {
  if (!executionId) {
    throw new Error('Execution ID is required');
  }
  
  return apiClient.get(`${REPORTING_ENDPOINTS.BASE}/executions/${executionId}`);
};

/**
 * Fetches the results of a completed report execution
 * @param executionId The ID of the report execution to retrieve results for
 * @returns Promise resolving to report result data
 */
const getReportResults = async (
  executionId: string
): Promise<ApiResponse<ReportResult>> => {
  if (!executionId) {
    throw new Error('Execution ID is required');
  }
  
  return apiClient.get(`${REPORTING_ENDPOINTS.BASE}/executions/${executionId}/results`);
};

/**
 * Exports a report in the specified format
 * @param executionId The ID of the report execution to export
 * @param format The format to export the report in (CSV, EXCEL, PDF, JSON)
 * @returns Promise resolving to report file blob
 */
const exportReport = async (
  executionId: string,
  format: OutputFormat
): Promise<Blob> => {
  if (!executionId) {
    throw new Error('Execution ID is required');
  }
  
  if (!format) {
    throw new Error('Export format is required');
  }
  
  const response = await apiClient.get(
    REPORTING_ENDPOINTS.EXPORT(executionId), 
    { format },
    { responseType: 'blob' }
  );
  
  if (response.success && response.data) {
    return response.data as unknown as Blob;
  }
  
  throw new Error('Failed to export report');
};

/**
 * Schedules a report to run on a recurring basis
 * @param scheduleParams The schedule configuration including report definition, parameters, and schedule
 * @returns Promise resolving to scheduled report data
 */
const scheduleReport = async (
  scheduleParams: ScheduleReportRequest
): Promise<ApiResponse<ScheduledReport>> => {
  if (!scheduleParams.reportDefinitionId) {
    throw new Error('Report definition ID is required');
  }
  
  if (!scheduleParams.schedule) {
    throw new Error('Schedule configuration is required');
  }
  
  return apiClient.post(`${REPORTING_ENDPOINTS.BASE}/schedules`, scheduleParams);
};

/**
 * Fetches a list of scheduled reports with optional filtering
 * @param params Filter and pagination parameters
 * @returns Promise resolving to paginated list of scheduled reports
 */
const getScheduledReports = async (
  params: GetScheduledReportsRequest
): Promise<ApiResponse<PaginatedResponse<ScheduledReport>>> => {
  return apiClient.get(`${REPORTING_ENDPOINTS.BASE}/schedules`, params);
};

/**
 * Fetches a specific scheduled report by its ID
 * @param scheduleId The ID of the scheduled report to retrieve
 * @returns Promise resolving to scheduled report data
 */
const getScheduledReportById = async (
  scheduleId: string
): Promise<ApiResponse<ScheduledReport>> => {
  if (!scheduleId) {
    throw new Error('Schedule ID is required');
  }
  
  return apiClient.get(`${REPORTING_ENDPOINTS.BASE}/schedules/${scheduleId}`);
};

/**
 * Updates an existing scheduled report configuration
 * @param scheduleId The ID of the scheduled report to update
 * @param updateParams The updated schedule configuration
 * @returns Promise resolving to updated scheduled report data
 */
const updateScheduledReport = async (
  scheduleId: string,
  updateParams: Partial<ScheduleReportRequest>
): Promise<ApiResponse<ScheduledReport>> => {
  if (!scheduleId) {
    throw new Error('Schedule ID is required');
  }
  
  return apiClient.put(
    `${REPORTING_ENDPOINTS.BASE}/schedules/${scheduleId}`,
    updateParams
  );
};

/**
 * Deletes a scheduled report
 * @param scheduleId The ID of the scheduled report to delete
 * @returns Promise resolving to success response
 */
const deleteScheduledReport = async (
  scheduleId: string
): Promise<ApiResponse<void>> => {
  if (!scheduleId) {
    throw new Error('Schedule ID is required');
  }
  
  return apiClient.delete(`${REPORTING_ENDPOINTS.BASE}/schedules/${scheduleId}`);
};

/**
 * Fetches refund metrics and trends for analysis
 * @param metricsParams Parameters for the metrics request including time range and dimensions
 * @returns Promise resolving to refund metrics data
 */
const getRefundMetrics = async (
  metricsParams: GetRefundMetricsRequest
): Promise<ApiResponse<RefundMetrics>> => {
  if (!metricsParams.timeRange) {
    throw new Error('Time range is required for metrics');
  }
  
  return apiClient.post(`${REPORTING_ENDPOINTS.BASE}/metrics`, metricsParams);
};

/**
 * Fetches dashboard data including summary metrics and visualizations
 * @param dashboardParams Parameters for the dashboard request including time range
 * @returns Promise resolving to dashboard data
 */
const getDashboardData = async (
  dashboardParams: GetDashboardDataRequest
): Promise<ApiResponse<DashboardData>> => {
  if (!dashboardParams.timeRange) {
    throw new Error('Time range is required for dashboard data');
  }
  
  return apiClient.post(REPORTING_ENDPOINTS.DASHBOARD, dashboardParams);
};

export default {
  getReportDefinitions,
  getReportDefinitionById,
  generateReport,
  getReportExecutionById,
  getReportResults,
  exportReport,
  scheduleReport,
  getScheduledReports,
  getScheduledReportById,
  updateScheduledReport,
  deleteScheduledReport,
  getRefundMetrics,
  getDashboardData
};