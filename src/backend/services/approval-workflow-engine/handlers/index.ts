import { createApprovalRequest, updateApprovalRequest, getApprovalRequest, getApprovalRequestByRefundId, notifyApprovers } from './approval-request.handler';
import { recordApprovalDecision, validateApproverAuthority } from './approval-decision.handler';
import { processEscalations, escalateApprovalRequest, handleMaxEscalationReached } from './escalation.handler';

/**
 * @file src/backend/services/approval-workflow-engine/handlers/index.ts
 * @description Entry point that exports all handler functions from the approval workflow engine's handlers directory
 * @requirements_addressed
 *   - name: Approval Workflow Engine
 *     location: Technical Specifications/2.1 FEATURE CATALOG/F-203
 *     description: Provides a centralized access point to approval workflow handlers for request creation, decision processing, and escalation management
 */

// Export approval request handling functions
export {
    createApprovalRequest,
    updateApprovalRequest,
    getApprovalRequest,
    getApprovalRequestByRefundId,
    notifyApprovers,
};

// Export approval decision handling functions
export {
    recordApprovalDecision,
    validateApproverAuthority,
};

// Export escalation handling functions
export {
    processEscalations,
    escalateApprovalRequest,
    handleMaxEscalationReached,
};