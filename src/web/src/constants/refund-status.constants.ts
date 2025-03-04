/**
 * Refund Status Constants
 * 
 * This module provides constants and utility functions related to refund statuses,
 * including display labels, descriptions, colors for visual indicators, and icon mappings.
 * These constants are used throughout the application for consistent representation of refund statuses.
 */

import { RefundStatus } from '../types/refund.types';

/**
 * Human-readable labels for each refund status
 * Used for display in UI components
 */
export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  [RefundStatus.DRAFT]: 'Draft',
  [RefundStatus.SUBMITTED]: 'Submitted',
  [RefundStatus.VALIDATION_FAILED]: 'Validation Failed',
  [RefundStatus.PENDING_APPROVAL]: 'Pending Approval',
  [RefundStatus.PROCESSING]: 'Processing',
  [RefundStatus.GATEWAY_PENDING]: 'Processing with Gateway',
  [RefundStatus.GATEWAY_ERROR]: 'Gateway Error',
  [RefundStatus.COMPLETED]: 'Completed',
  [RefundStatus.FAILED]: 'Failed',
  [RefundStatus.REJECTED]: 'Rejected',
  [RefundStatus.CANCELED]: 'Canceled'
};

/**
 * Detailed descriptions for each refund status
 * Used for tooltips and detailed information displays
 */
export const REFUND_STATUS_DESCRIPTIONS: Record<RefundStatus, string> = {
  [RefundStatus.DRAFT]: 'The refund request has been created but not yet submitted',
  [RefundStatus.SUBMITTED]: 'The refund request has been submitted for processing',
  [RefundStatus.VALIDATION_FAILED]: 'The refund request failed validation checks',
  [RefundStatus.PENDING_APPROVAL]: 'The refund request is awaiting approval',
  [RefundStatus.PROCESSING]: 'The refund request is being processed',
  [RefundStatus.GATEWAY_PENDING]: 'The refund is being processed by the payment gateway',
  [RefundStatus.GATEWAY_ERROR]: 'The payment gateway encountered an error',
  [RefundStatus.COMPLETED]: 'The refund has been successfully processed',
  [RefundStatus.FAILED]: 'The refund processing has failed',
  [RefundStatus.REJECTED]: 'The refund request was rejected',
  [RefundStatus.CANCELED]: 'The refund request was canceled'
};

/**
 * Color codes for each refund status
 * Used for visual indicators in the UI (e.g., status badges, progress bars)
 */
export const REFUND_STATUS_COLORS: Record<RefundStatus, string> = {
  [RefundStatus.DRAFT]: 'gray',
  [RefundStatus.SUBMITTED]: 'blue',
  [RefundStatus.VALIDATION_FAILED]: 'red',
  [RefundStatus.PENDING_APPROVAL]: 'yellow',
  [RefundStatus.PROCESSING]: 'blue',
  [RefundStatus.GATEWAY_PENDING]: 'blue',
  [RefundStatus.GATEWAY_ERROR]: 'orange',
  [RefundStatus.COMPLETED]: 'green',
  [RefundStatus.FAILED]: 'red',
  [RefundStatus.REJECTED]: 'red',
  [RefundStatus.CANCELED]: 'gray'
};

/**
 * Icon names for each refund status
 * Used with icon components to provide visual cues about the status
 */
export const REFUND_STATUS_ICONS: Record<RefundStatus, string> = {
  [RefundStatus.DRAFT]: 'draft',
  [RefundStatus.SUBMITTED]: 'document',
  [RefundStatus.VALIDATION_FAILED]: 'exclamation-circle',
  [RefundStatus.PENDING_APPROVAL]: 'clock',
  [RefundStatus.PROCESSING]: 'spinner',
  [RefundStatus.GATEWAY_PENDING]: 'spinner',
  [RefundStatus.GATEWAY_ERROR]: 'warning',
  [RefundStatus.COMPLETED]: 'check-circle',
  [RefundStatus.FAILED]: 'times-circle',
  [RefundStatus.REJECTED]: 'times-circle',
  [RefundStatus.CANCELED]: 'ban'
};

/**
 * Progress percentage for each refund status
 * Used for progress bars and indicators (0-100)
 */
export const REFUND_STATUS_PROGRESS: Record<RefundStatus, number> = {
  [RefundStatus.DRAFT]: 0,
  [RefundStatus.SUBMITTED]: 20,
  [RefundStatus.VALIDATION_FAILED]: 20,
  [RefundStatus.PENDING_APPROVAL]: 40,
  [RefundStatus.PROCESSING]: 60,
  [RefundStatus.GATEWAY_PENDING]: 80,
  [RefundStatus.GATEWAY_ERROR]: 60,
  [RefundStatus.COMPLETED]: 100,
  [RefundStatus.FAILED]: 100,
  [RefundStatus.REJECTED]: 100,
  [RefundStatus.CANCELED]: 100
};

/**
 * Returns the human-readable label for a refund status
 * 
 * @param status - The refund status
 * @returns The display label for the specified refund status
 */
export function getRefundStatusLabel(status: RefundStatus): string {
  return REFUND_STATUS_LABELS[status] || 'Unknown Status';
}

/**
 * Returns the detailed description for a refund status
 * 
 * @param status - The refund status
 * @returns The description for the specified refund status
 */
export function getRefundStatusDescription(status: RefundStatus): string {
  return REFUND_STATUS_DESCRIPTIONS[status] || 'Status description not available';
}

/**
 * Returns the color associated with a refund status for visual indicators
 * 
 * @param status - The refund status
 * @returns The color code or name for the specified refund status
 */
export function getRefundStatusColor(status: RefundStatus): string {
  return REFUND_STATUS_COLORS[status] || 'gray';
}

/**
 * Returns the icon name for a refund status to use with icon components
 * 
 * @param status - The refund status
 * @returns The icon name for the specified refund status
 */
export function getRefundStatusIcon(status: RefundStatus): string {
  return REFUND_STATUS_ICONS[status] || 'question-circle';
}

/**
 * Returns the progress percentage for a refund status for progress indicators
 * 
 * @param status - The refund status
 * @returns The progress percentage (0-100) for the specified refund status
 */
export function getRefundStatusProgress(status: RefundStatus): number {
  return REFUND_STATUS_PROGRESS[status] || 0;
}

/**
 * Determines if a refund status indicates the refund process is complete (whether successful or not)
 * 
 * @param status - The refund status
 * @returns True if the refund process is complete, false otherwise
 */
export function isRefundCompleted(status: RefundStatus): boolean {
  return [
    RefundStatus.COMPLETED,
    RefundStatus.FAILED,
    RefundStatus.REJECTED,
    RefundStatus.CANCELED
  ].includes(status);
}

/**
 * Determines if a refund is actively being processed
 * 
 * @param status - The refund status
 * @returns True if the refund is in progress, false otherwise
 */
export function isRefundInProgress(status: RefundStatus): boolean {
  return [
    RefundStatus.PROCESSING,
    RefundStatus.GATEWAY_PENDING,
    RefundStatus.PENDING_APPROVAL
  ].includes(status);
}

/**
 * Determines if a refund was successfully completed
 * 
 * @param status - The refund status
 * @returns True if the refund was successfully completed, false otherwise
 */
export function isRefundSuccessful(status: RefundStatus): boolean {
  return status === RefundStatus.COMPLETED;
}