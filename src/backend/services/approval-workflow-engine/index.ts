import approvalWorkflowService, { ApprovalWorkflowService } from './approval-workflow.service'; // Import the ApprovalWorkflowService class
import { ApprovalRule, ApprovalWorkflow, getFieldValue, evaluateCondition } from './models/index'; // Import ApprovalRule and ApprovalWorkflow models
import { createApprovalRequest, updateApprovalRequest, recordApprovalDecision, validateApproverAuthority, getApprovalRequest, getApprovalRequestByRefundId, processEscalations, escalateApprovalRequest } from './handlers/index'; // Import handler functions
import { scheduleEscalationCheck } from './escalation-manager'; // Import function for scheduling escalation checks
import ruleEngine from './rule-engine'; // Import the rule engine

/**
 * @file src/backend/services/approval-workflow-engine/index.ts
 * @description Entry point for the Approval Workflow Engine service that exports the service instance and related models, providing a unified interface for approval workflow management throughout the refunds service.
 * @requirements_addressed
 *   - name: Approval Workflow Engine
 *     location: Technical Specifications/2.1 FEATURE CATALOG/Configuration & Compliance/F-203
 *     description: Provides a central service for configurable approval workflows based on rules, enabling proper approvals for high-value refunds and other conditions requiring oversight.
 *   - name: Approval Workflow Process
 *     location: Technical Specifications/4.1.2 Approval Workflow Process
 *     description: Implements the workflow to handle approval requests, approver notifications, decisions, and escalations for refund processing.
 */

// Export the ApprovalWorkflowService class
export { ApprovalWorkflowService };

// Export the singleton instance of ApprovalWorkflowService
export default approvalWorkflowService;

// Re-export ApprovalRule class for creating and evaluating approval rules
export { ApprovalRule };

// Re-export ApprovalWorkflow class for managing approval workflows
export { ApprovalWorkflow };

// Re-export utility function for extracting field values during rule evaluation
export { getFieldValue };

// Re-export utility function for evaluating conditions with various operators
export { evaluateCondition };

// Re-export rule engine for direct access to rule evaluation functions
export { ruleEngine };

// Re-export function for creating approval requests
export { createApprovalRequest };

// Re-export function for updating approval requests
export { updateApprovalRequest };

// Re-export function for recording approval decisions
export { recordApprovalDecision };

// Re-export function for validating approver authority
export { validateApproverAuthority };

// Re-export function for escalating specific approval requests
export { escalateApprovalRequest };