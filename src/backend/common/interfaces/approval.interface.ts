import { RefundStatus } from '../enums/refund-status.enum';
import { ApprovalStatus } from '../enums/approval-status.enum';

/**
 * Approval Workflow Interfaces
 * 
 * This file defines interfaces related to the approval workflow for refund requests.
 * These interfaces define the structure of approval requests, approvers, decisions,
 * rules, and escalation mechanisms.
 * 
 * The approval system is designed to be configurable at multiple levels (merchant,
 * organization, program, bank) with flexible rule conditions and escalation paths.
 */

/**
 * Interface representing an approval request for a refund.
 * Tracks the approval process including who needs to approve, decisions made,
 * and escalation status.
 */
export interface IApprovalRequest {
  /**
   * Unique identifier for the approval request
   */
  approvalId: string;
  
  /**
   * Reference to the refund request this approval is for
   */
  refundRequestId: string;
  
  /**
   * Current status of the approval request
   */
  status: ApprovalStatus;
  
  /**
   * Date when the approval request was created
   */
  requestDate: Date;
  
  /**
   * List of approvers who need to review this request
   */
  approvers: IApprover[];
  
  /**
   * List of decisions made on this approval request
   */
  decisions: IApprovalDecision[];
  
  /**
   * Current escalation level of the approval request
   */
  escalationLevel: number;
  
  /**
   * Date when the current escalation level is due to escalate
   */
  escalationDue: Date;
  
  /**
   * Date when the approval request was created
   */
  createdAt: Date;
  
  /**
   * Date when the approval request was last updated
   */
  updatedAt: Date;
}

/**
 * Interface representing an approver for an approval request.
 * Contains information about who needs to approve and at what escalation level.
 */
export interface IApprover {
  /**
   * Unique identifier for this approver record
   */
  id: string;
  
  /**
   * Reference to the approval request
   */
  approvalId: string;
  
  /**
   * Identifier of the user who can approve
   */
  approverId: string;
  
  /**
   * Role of the approver (e.g., MERCHANT_ADMIN, ORGANIZATION_ADMIN)
   */
  approverRole: string;
  
  /**
   * Escalation level at which this approver is involved
   */
  escalationLevel: number;
  
  /**
   * Date when the approver was assigned to this request
   */
  assignedAt: Date;
  
  /**
   * Date when the approver was notified about this request
   */
  notifiedAt: Date;
}

/**
 * Interface representing a decision made on an approval request.
 * Records the approver's decision and related metadata.
 */
export interface IApprovalDecision {
  /**
   * Unique identifier for this decision
   */
  decisionId: string;
  
  /**
   * Reference to the approval request
   */
  approvalId: string;
  
  /**
   * Identifier of the user who made the decision
   */
  approverId: string;
  
  /**
   * The decision outcome - either approved or rejected
   */
  decision: 'APPROVED' | 'REJECTED';
  
  /**
   * Notes provided by the approver explaining their decision
   */
  decisionNotes: string;
  
  /**
   * Date when the decision was made
   */
  decidedAt: Date;
}

/**
 * Interface representing a rule that determines when approval is required.
 * Contains conditions, approver configuration, and escalation rules.
 */
export interface IApprovalRule {
  /**
   * Unique identifier for this rule
   */
  ruleId: string;
  
  /**
   * Type of entity this rule applies to
   */
  entityType: 'MERCHANT' | 'ORGANIZATION' | 'PROGRAM' | 'BANK';
  
  /**
   * Identifier of the specific entity this rule applies to
   */
  entityId: string;
  
  /**
   * Name of the rule for identification
   */
  ruleName: string;
  
  /**
   * Detailed description of the rule
   */
  description: string;
  
  /**
   * Conditions that determine when this rule applies
   */
  conditions: IApprovalCondition | IComplexApprovalCondition;
  
  /**
   * Configuration of approver roles for this rule
   */
  approverRoles: IApproverRoleConfig[];
  
  /**
   * Rules for escalation timing and behavior
   */
  escalationRules: IEscalationRule[];
  
  /**
   * Priority of this rule (lower number = higher priority)
   */
  priority: number;
  
  /**
   * Whether this rule is currently active
   */
  active: boolean;
  
  /**
   * Date when the rule was created
   */
  createdAt: Date;
  
  /**
   * Date when the rule was last updated
   */
  updatedAt: Date;
}

/**
 * Interface representing configuration for approver roles.
 * Maps roles to escalation levels in the approval process.
 */
export interface IApproverRoleConfig {
  /**
   * Role identifier (e.g., MERCHANT_ADMIN, ORGANIZATION_ADMIN)
   */
  role: string;
  
  /**
   * The escalation level at which this role is involved
   */
  escalationLevel: number;
}

/**
 * Interface representing a simple condition for an approval rule.
 * Used to evaluate whether a rule applies to a given refund request.
 */
export interface IApprovalCondition {
  /**
   * The field to evaluate (e.g., 'amount', 'refundMethod')
   */
  field: string;
  
  /**
   * The comparison operator to use
   */
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 
    'greaterThanOrEqual' | 'lessThanOrEqual' | 'in' | 'notIn' | 
    'contains' | 'startsWith' | 'endsWith';
  
  /**
   * The value to compare against
   */
  value: any;
}

/**
 * Interface representing complex conditions with logical operators.
 * Allows for building complex rule conditions using AND, OR, and NOT logic.
 */
export interface IComplexApprovalCondition {
  /**
   * The logical operator to apply to the conditions
   */
  operator: 'AND' | 'OR' | 'NOT';
  
  /**
   * The list of conditions to combine with the logical operator
   */
  conditions: Array<IApprovalCondition | IComplexApprovalCondition>;
}

/**
 * Interface representing rules for escalation timing in the approval process.
 * Determines when approvals should be escalated to the next level.
 */
export interface IEscalationRule {
  /**
   * The escalation level this rule applies to
   */
  escalationLevel: number;
  
  /**
   * The amount of time before escalation
   */
  escalationTime: number;
  
  /**
   * The unit of time for escalation
   */
  timeUnit: 'MINUTES' | 'HOURS' | 'DAYS';
}

/**
 * Interface representing a complete approval workflow configuration.
 * Contains rules and settings for approval processes at a specific entity level.
 */
export interface IApprovalWorkflow {
  /**
   * Unique identifier for this workflow
   */
  workflowId: string;
  
  /**
   * Name of the workflow for identification
   */
  name: string;
  
  /**
   * Detailed description of the workflow
   */
  description: string;
  
  /**
   * The type of trigger for this workflow
   */
  triggerType: 'AMOUNT' | 'REFUND_METHOD' | 'CUSTOMER' | 'MERCHANT' | 'CUSTOM';
  
  /**
   * Type of entity this workflow applies to
   */
  entityType: 'MERCHANT' | 'ORGANIZATION' | 'PROGRAM' | 'BANK';
  
  /**
   * Identifier of the specific entity this workflow applies to
   */
  entityId: string;
  
  /**
   * The approval rules that are part of this workflow
   */
  rules: IApprovalRule[];
  
  /**
   * Action to take when an approval times out
   */
  onTimeout: 'ESCALATE_TO_NEXT_LEVEL' | 'AUTO_APPROVE' | 'AUTO_REJECT';
  
  /**
   * Role or user for final escalation
   */
  finalEscalation: string;
  
  /**
   * Whether this workflow is currently active
   */
  active: boolean;
  
  /**
   * Date when the workflow was created
   */
  createdAt: Date;
  
  /**
   * Date when the workflow was last updated
   */
  updatedAt: Date;
}