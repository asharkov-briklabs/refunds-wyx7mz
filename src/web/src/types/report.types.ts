/**
 * TypeScript type definitions for reporting functionality in the Refunds Service web application.
 * This file defines interfaces and types for report definitions, parameters, execution, results,
 * scheduling, and analytics.
 */
import { 
  DateRange, 
  PaginationParams, 
  SelectOption, 
  SortParams,
  ExportFormat
} from './common.types';

/**
 * Enumeration of available report types in the system
 */
export enum ReportType {
  REFUND_SUMMARY = 'REFUND_SUMMARY',
  REFUND_TRENDS = 'REFUND_TRENDS',
  REFUND_STATUS = 'REFUND_STATUS',
  PAYMENT_METHOD_ANALYSIS = 'PAYMENT_METHOD_ANALYSIS',
  APPROVAL_WORKFLOW = 'APPROVAL_WORKFLOW',
  COMPLIANCE_REPORT = 'COMPLIANCE_REPORT',
  CUSTOM = 'CUSTOM'
}

/**
 * Enumeration of parameter types used in report definitions
 */
export enum ParameterType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
  DATERANGE = 'DATERANGE',
  SELECT = 'SELECT',
  MULTISELECT = 'MULTISELECT'
}

/**
 * Enumeration of supported export formats for reports
 */
export enum OutputFormat {
  CSV = 'CSV',
  EXCEL = 'EXCEL',
  PDF = 'PDF',
  JSON = 'JSON'
}

/**
 * Enumeration of report execution status values
 */
export enum ReportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED'
}

/**
 * Enumeration of scheduling frequencies for recurring reports
 */
export enum ScheduleFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM'
}

/**
 * Interface defining a parameter in a report definition
 */
export interface ParameterDefinition {
  /** Unique identifier for the parameter */
  name: string;
  /** Type of parameter (string, number, date, etc.) */
  type: ParameterType;
  /** Human-readable label for the parameter */
  label: string;
  /** Whether the parameter is required */
  required: boolean;
  /** Default value for the parameter */
  defaultValue?: any;
  /** Available options for SELECT and MULTISELECT parameters */
  options?: SelectOption[];
  /** Validation rules for the parameter */
  validation?: Record<string, any>;
  /** Description of the parameter */
  description?: string;
}

/**
 * Interface defining a report template
 */
export interface ReportDefinition {
  /** Unique identifier for the report definition */
  id: string;
  /** Type of report */
  type: ReportType;
  /** Human-readable name for the report */
  name: string;
  /** Description of the report */
  description: string;
  /** Parameters that can be provided when executing the report */
  parameters: ParameterDefinition[];
  /** Data source for the report */
  dataSource: string;
  /** Timestamp when the report definition was created */
  createdAt: string;
  /** Timestamp when the report definition was last updated */
  updatedAt: string;
}

/**
 * Interface defining a report execution instance
 */
export interface ReportExecution {
  /** Unique identifier for the report execution */
  id: string;
  /** ID of the report definition used for this execution */
  reportDefinitionId: string;
  /** Parameters used for this execution */
  parameters: Record<string, any>;
  /** Current status of the execution */
  status: ReportStatus;
  /** Timestamp when the execution started */
  startTime: string;
  /** Timestamp when the execution completed (if completed) */
  endTime?: string;
  /** ID of the user who initiated the execution */
  userId: string;
  /** Error message if the execution failed */
  error?: string;
  /** Number of rows in the result set */
  rowCount?: number;
}

/**
 * Interface defining a visualization for report data
 */
export interface ReportVisualization {
  /** Type of visualization (chart, table, metric, etc.) */
  type: string;
  /** Title of the visualization */
  title: string;
  /** Description of the visualization */
  description?: string;
  /** Configuration options for the visualization */
  config: Record<string, any>;
  /** Data for the visualization */
  data: any;
}

/**
 * Interface defining the result data from a report execution
 */
export interface ReportResult {
  /** ID of the execution that produced this result */
  executionId: string;
  /** Name of the report */
  reportName: string;
  /** Parameters used to generate the report */
  parameters: Record<string, any>;
  /** Timestamp when the report was generated */
  generatedAt: string;
  /** Raw data from the report */
  data: any;
  /** Column headers for tabular data */
  headers: string[];
  /** Rows of data for tabular display */
  rows: any[][];
  /** Summary metrics calculated from the data */
  summary?: Record<string, any>;
  /** Visualizations of the report data */
  visualizations?: ReportVisualization[];
}

/**
 * Interface defining a recipient for scheduled reports
 */
export interface ScheduleRecipient {
  /** Email address of the recipient */
  email: string;
  /** Name of the recipient */
  name?: string;
  /** User ID of the recipient if they are a system user */
  userId?: string;
}

/**
 * Interface defining the schedule configuration for reports
 */
export interface ReportSchedule {
  /** How often the report should run */
  frequency: ScheduleFrequency;
  /** Cron-like expression for custom schedules */
  expression: string;
  /** Date when the schedule should start */
  startDate: string;
  /** Date when the schedule should end (optional) */
  endDate?: string;
  /** Format for the report output */
  outputFormat: OutputFormat;
  /** Recipients who should receive the report */
  recipients: ScheduleRecipient[];
}

/**
 * Interface defining a scheduled report
 */
export interface ScheduledReport {
  /** Unique identifier for the scheduled report */
  id: string;
  /** ID of the report definition to execute */
  reportDefinitionId: string;
  /** Name of the report for display purposes */
  reportName: string;
  /** Parameters to use when executing the report */
  parameters: Record<string, any>;
  /** Schedule configuration */
  schedule: ReportSchedule;
  /** Whether the schedule is currently active */
  enabled: boolean;
  /** ID of the user who created the schedule */
  userId: string;
  /** ID of the last execution of this schedule */
  lastExecutionId?: string;
  /** Timestamp of the last time this schedule was run */
  lastRunTime?: string;
  /** Timestamp of when this schedule will next run */
  nextRunTime?: string;
  /** Timestamp when the schedule was created */
  createdAt: string;
  /** Timestamp when the schedule was last updated */
  updatedAt: string;
}

/**
 * Interface defining a single metric value for refund reporting
 */
export interface RefundMetric {
  /** Name of the metric */
  name: string;
  /** Current value of the metric */
  value: number;
  /** Previous value for comparison */
  previousValue?: number;
  /** Percentage change from previous value */
  changePercent?: number;
  /** Direction of change */
  trend?: 'up' | 'down' | 'neutral';
  /** How to format the metric for display */
  format: 'number' | 'currency' | 'percent' | 'time';
}

/**
 * Interface defining a comprehensive set of refund metrics and trends
 */
export interface RefundMetrics {
  /** Time range for the metrics */
  timeRange: DateRange;
  /** Comparison time range for trend analysis */
  comparisonTimeRange?: DateRange;
  /** Key metrics with current values and trends */
  metrics: Record<string, RefundMetric>;
  /** Time-series data for trend visualization */
  trends: Record<string, any[]>;
  /** Distribution data for categorical breakdowns */
  distributions: Record<string, any[]>;
}

/**
 * Interface defining a widget for the analytics dashboard
 */
export interface DashboardWidget {
  /** Unique identifier for the widget */
  id: string;
  /** Type of widget (metric, chart, table, etc.) */
  type: string;
  /** Title of the widget */
  title: string;
  /** Data for the widget */
  data: any;
  /** Configuration options for the widget */
  config: Record<string, any>;
  /** Size of the widget in the dashboard grid */
  size: 'small' | 'medium' | 'large' | 'full';
}

/**
 * Interface defining the structure of dashboard data
 */
export interface DashboardData {
  /** Time range for the dashboard data */
  timeRange: DateRange;
  /** Comparison time range for trend analysis */
  comparisonTimeRange?: DateRange;
  /** Widgets to display on the dashboard */
  widgets: DashboardWidget[];
  /** Summary metrics for the dashboard */
  summary: Record<string, RefundMetric>;
}

/**
 * Interface for report generation request parameters
 */
export interface GenerateReportRequest {
  /** ID of the report definition to generate */
  reportDefinitionId: string;
  /** Parameters for the report */
  parameters: Record<string, any>;
}

/**
 * Interface for report export request parameters
 */
export interface ExportReportRequest {
  /** ID of the report execution to export */
  executionId: string;
  /** Format to export the report in */
  format: OutputFormat;
}

/**
 * Interface for report scheduling request parameters
 */
export interface ScheduleReportRequest {
  /** ID of the report definition to schedule */
  reportDefinitionId: string;
  /** Parameters for the report */
  parameters: Record<string, any>;
  /** Schedule configuration */
  schedule: ReportSchedule;
}

/**
 * Interface for report listing request parameters
 */
export interface GetReportsRequest {
  /** Pagination parameters */
  pagination: PaginationParams;
  /** Sort parameters */
  sortParams?: SortParams;
  /** Filter criteria */
  filter?: Record<string, any>;
}

/**
 * Interface for scheduled report listing request parameters
 */
export interface GetScheduledReportsRequest {
  /** Pagination parameters */
  pagination: PaginationParams;
  /** Sort parameters */
  sortParams?: SortParams;
  /** Filter criteria */
  filter?: Record<string, any>;
}

/**
 * Interface for refund metrics request parameters
 */
export interface GetRefundMetricsRequest {
  /** Time range for the metrics */
  timeRange: DateRange;
  /** Whether to compare with previous period */
  compareWithPrevious?: boolean;
  /** Specific merchant ID to filter by */
  merchantId?: string;
  /** Dimensions to group metrics by */
  dimensions?: string[];
  /** Specific metrics to include */
  metrics?: string[];
}

/**
 * Interface for dashboard data request parameters
 */
export interface GetDashboardDataRequest {
  /** Time range for the dashboard data */
  timeRange: DateRange;
  /** Whether to compare with previous period */
  compareWithPrevious?: boolean;
  /** Specific merchant ID to filter by */
  merchantId?: string;
  /** Specific widgets to include */
  widgets?: string[];
}