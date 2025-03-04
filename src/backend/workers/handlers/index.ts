import { processRefundRequest, handleRetryableError, handleNonRetryableError, isRetryableError as isRefundRetryableError } from './refund-processor.handler';
import { checkGatewayStatus, processRefundStatusUpdate, isRetryableError as isGatewayRetryableError } from './gateway-check.handler';
import { processApprovals, processEscalations, processReminders, isRetryableError as isApprovalRetryableError } from './approval.handler';
import { handleNotification, handleBulkNotifications, isRetryableError as isNotificationRetryableError } from './notification.handler';

/**
 * @file src/backend/workers/handlers/index.ts
 * @description Exports worker handler functions from the worker handlers directory, providing a centralized entry point for all background processing handlers in the Refunds Service. These handlers manage asynchronous processing of refunds, gateway status checks, approval workflows, and notifications.
 * @requirements_addressed
 *   - name: Asynchronous Processing
 *     location: Technical Specifications/2.3 FUNCTIONAL REQUIREMENTS/F-001: Refund Request Creation
 *     description: Implements background worker handlers for asynchronous processing of refund requests
 *   - name: Background Processing
 *     location: Technical Specifications/6.1 CORE SERVICES ARCHITECTURE/Service Components
 *     description: Provides handlers for background processing of various refund-related tasks
 */

// LD1: Group export for refund processing handler functions
export const refundProcessor = {
  processRefundRequest,
  handleRetryableError,
  handleNonRetryableError,
  isRetryableError: isRefundRetryableError
};

// LD1: Group export for gateway status check handler functions
export const gatewayCheck = {
  checkGatewayStatus,
  processRefundStatusUpdate,
  isRetryableError: isGatewayRetryableError
};

// LD1: Group export for approval workflow handler functions
export const approvalHandler = {
  processApprovals,
  processEscalations,
  processReminders,
  isRetryableError: isApprovalRetryableError
};

// LD1: Group export for notification handler functions
export const notificationHandler = {
  handleNotification,
  handleBulkNotifications,
  isRetryableError: isNotificationRetryableError
};