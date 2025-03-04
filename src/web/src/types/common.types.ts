/**
 * Common TypeScript type definitions used across the Refunds Service web application.
 * These types provide standardized interfaces for pagination, filtering, sorting,
 * as well as common entity types, status enums, and utility types.
 */

/**
 * Common interface for pagination parameters used in API requests
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Enumeration for sort directions used in list sorting
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

/**
 * Interface for sort parameters used in list requests
 */
export interface SortParams {
  field: string;
  direction: SortDirection;
}

/**
 * Enumeration of entity types for parameter configuration hierarchy
 */
export enum EntityType {
  MERCHANT = 'MERCHANT',
  ORGANIZATION = 'ORGANIZATION',
  PROGRAM = 'PROGRAM',
  BANK = 'BANK'
}

/**
 * Common interface for date range selection in reports and filters
 */
export interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * Common interface for select dropdown options throughout the UI
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Type for supported currency codes in the application
 */
export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';

/**
 * Generic status type used across the application for consistent status representation
 */
export type Status = 'success' | 'warning' | 'error' | 'info' | 'pending';

/**
 * Generic key-value pair interface used for metadata and dynamic attributes
 */
export interface KeyValuePair {
  key: string;
  value: any;
}

/**
 * Predefined time frames for reporting and filtering
 */
export enum TimeFrame {
  TODAY = 'TODAY',
  YESTERDAY = 'YESTERDAY',
  THIS_WEEK = 'THIS_WEEK',
  LAST_WEEK = 'LAST_WEEK',
  THIS_MONTH = 'THIS_MONTH',
  LAST_MONTH = 'LAST_MONTH',
  LAST_30_DAYS = 'LAST_30_DAYS',
  LAST_90_DAYS = 'LAST_90_DAYS',
  CUSTOM = 'CUSTOM'
}

/**
 * Generic result interface for action outcomes in the UI
 */
export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Supported formats for exporting data from reports and lists
 */
export enum ExportFormat {
  CSV = 'CSV',
  EXCEL = 'EXCEL',
  PDF = 'PDF',
  JSON = 'JSON'
}

/**
 * Common loading states for API requests and async operations
 */
export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED'
}

/**
 * Button variants for consistent UI styling across the application
 */
export enum ButtonVariant {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  TERTIARY = 'TERTIARY',
  DANGER = 'DANGER',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  GHOST = 'GHOST',
  LINK = 'LINK'
}

/**
 * Status values for tracking API request states in Redux slices
 */
export enum ApiStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

/**
 * Common interface for table column definitions used in data tables
 */
export interface TableColumn {
  id: string;
  label: string;
  width?: string | number;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}