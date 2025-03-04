/**
 * API Types
 * 
 * This module defines TypeScript interfaces and types for API communication in the
 * Refunds Service web application. It provides standardized request and response types
 * used by API service clients when communicating with backend endpoints.
 */

import { RefundMethod } from './refund.types';
import { PaginationParams, EntityType } from './common.types';

/**
 * Generic interface for all API responses with consistent structure
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: ApiError | null;
  meta: Record<string, any> | null;
}

/**
 * Standard error format returned by API endpoints
 */
export interface ApiError {
  code: string;
  message: string;
  details: Record<string, any> | null;
  field: string | null;
}

/**
 * Interface for field-level validation errors
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Generic interface for paginated API responses
 */
export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Interface for create refund request payload
 */
export interface CreateRefundRequest {
  transactionId: string;
  amount: number;
  refundMethod: RefundMethod;
  reasonCode: string;
  reason: string;
  bankAccountId: string | null;
  supportingDocuments: Array<{ documentId: string; documentType: string }>;
  metadata: Record<string, any> | null;
}

/**
 * Interface for update refund request payload
 */
export interface UpdateRefundRequest {
  amount: number;
  refundMethod: RefundMethod;
  reasonCode: string;
  reason: string;
  bankAccountId: string | null;
  supportingDocuments: Array<{ documentId: string; documentType: string }>;
}

/**
 * Interface for cancel refund request payload
 */
export interface CancelRefundRequest {
  reason: string;
}

/**
 * Interface for refund listing filter parameters
 */
export interface RefundFilterParams {
  merchantId?: string;
  customerId?: string;
  status?: string[];
  refundMethod?: string[];
  minAmount?: number;
  maxAmount?: number;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  searchQuery?: string;
}

/**
 * Interface for refund statistics data
 */
export interface RefundStatistics {
  totalCount: number;
  totalAmount: number;
  averageAmount: number;
  methodDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  volumeByDate: Array<{ date: string; count: number; amount: number }>;
  averageProcessingTime: number;
}

/**
 * Interface for bank account creation request payload
 */
export interface BankAccountCreationRequest {
  accountHolderName: string;
  accountType: string;
  routingNumber: string;
  accountNumber: string;
  isDefault: boolean;
  initializeVerification: boolean;
  verificationMethod: string;
}

/**
 * Interface for bank account verification request payload
 */
export interface BankAccountVerificationRequest {
  accountId: string;
  verificationType: string;
  verificationData: Record<string, any>;
}

/**
 * Interface for parameter creation request payload
 */
export interface ParameterCreateRequest {
  parameterName: string;
  parameterValue: any;
  entityType: EntityType;
  entityId: string;
  description?: string;
  effectiveDate?: string;
  expirationDate?: string;
}

/**
 * Interface for parameter update request payload
 */
export interface ParameterUpdateRequest {
  parameterValue: any;
  description?: string;
  effectiveDate?: string;
  expirationDate?: string;
}

/**
 * Interface for parameter listing request parameters
 */
export interface ParameterListParams {
  entityType: EntityType;
  entityId: string;
  searchQuery?: string;
  pagination: PaginationParams;
}

/**
 * Interface for notification listing filter parameters
 */
export interface NotificationFilters {
  read?: boolean;
  type?: string[];
  startDate?: string;
  endDate?: string;
  pagination: PaginationParams;
}

/**
 * Interface for report generation request payload
 */
export interface ReportGenerationRequest {
  reportType: string;
  parameters: Record<string, any>;
  format: string;
  name: string;
}

/**
 * Interface for approval decision request payload
 */
export interface ApprovalDecisionRequest {
  decision: string;
  notes: string;
}