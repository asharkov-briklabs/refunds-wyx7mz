/**
 * Refund Types
 * 
 * This module defines TypeScript interfaces and types for refund-related entities
 * used throughout the application.
 */

/**
 * Enum defining all possible statuses for a refund throughout its lifecycle
 */
export enum RefundStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  PROCESSING = 'PROCESSING',
  GATEWAY_PENDING = 'GATEWAY_PENDING',
  GATEWAY_ERROR = 'GATEWAY_ERROR',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
  CANCELED = 'CANCELED'
}

/**
 * Enum defining available refund methods in the system
 */
export enum RefundMethod {
  ORIGINAL_PAYMENT = 'ORIGINAL_PAYMENT',
  BALANCE = 'BALANCE',
  OTHER = 'OTHER'
}

/**
 * Complete refund data model with detailed information about a refund
 */
export interface Refund {
  refundId: string;
  transactionId: string;
  merchantId: string;
  customerId: string;
  amount: number;
  currency: string;
  refundMethod: RefundMethod;
  reasonCode: string;
  reason: string;
  status: RefundStatus;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
  completedAt: string | null;
  bankAccountId: string | null;
  approvalId: string | null;
  gatewayReference: string | null;
  estimatedCompletionDate: string | null;
  supportingDocuments: Array<{ documentId: string; documentType: string; url: string }>;
  metadata: Record<string, any> | null;
  statusHistory: Array<{ status: RefundStatus; timestamp: string; changedBy: string }>;
  errors: Array<{ code: string; message: string; timestamp: string }> | null;
}

/**
 * Summarized refund data for list views and dashboard displays
 */
export interface RefundSummary {
  refundId: string;
  transactionId: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  refundMethod: RefundMethod;
  createdAt: string;
  customerName: string | null;
  reason: string;
}

/**
 * Form data for creating or updating a refund in the UI
 */
export interface RefundFormData {
  transactionId: string;
  amount: number;
  refundMethod: RefundMethod;
  reasonCode: string;
  reason: string;
  bankAccountId: string | null;
  supportingDocuments: Array<{ documentId: string; documentType: string }>;
  isFullRefund: boolean;
}

/**
 * Transaction data needed for refund creation and display
 */
export interface TransactionSummary {
  transactionId: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  date: string;
  status: string;
  paymentMethod: string;
  paymentDetails: Record<string, any>;
  refundEligible: boolean;
  availableRefundMethods: RefundMethod[];
  refundedAmount: number;
}

/**
 * Represents a status change in the refund lifecycle for tracking history
 */
export interface RefundStatusHistoryItem {
  status: RefundStatus;
  timestamp: string;
  changedBy: string;
  notes: string | null;
}

/**
 * Represents validation errors for refund data with field-specific information
 */
export interface RefundValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Represents an event in the refund timeline for displaying refund progress
 */
export interface RefundTimelineEvent {
  eventType: string;
  timestamp: string;
  title: string;
  description: string | null;
  status: RefundStatus | null;
  actor: string | null;
}

/**
 * Enum defining standard reason codes for refunds to ensure consistent categorization
 */
export enum RefundReasonCode {
  CUSTOMER_REQUEST = 'CUSTOMER_REQUEST',
  DUPLICATE_CHARGE = 'DUPLICATE_CHARGE',
  FRAUDULENT = 'FRAUDULENT',
  ORDER_CHANGE = 'ORDER_CHANGE',
  PRODUCT_UNSATISFACTORY = 'PRODUCT_UNSATISFACTORY',
  SUBSCRIPTION_CANCELED = 'SUBSCRIPTION_CANCELED',
  OTHER = 'OTHER'
}