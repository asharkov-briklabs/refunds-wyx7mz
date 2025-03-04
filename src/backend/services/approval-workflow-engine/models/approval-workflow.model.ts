import { v4 as uuidv4 } from 'uuid'; // uuid@^9.0.0
import { 
  IApprovalWorkflow, 
  IApprovalRule, 
  IApprovalCondition,
  IComplexApprovalCondition,
  IApproverRoleConfig,
  IEscalationRule 
} from '../../../common/interfaces/approval.interface';
import { ApprovalRule } from './approval-rule.model';
import { logger } from '../../../common/utils/logger';

/**
 * Model representing a configurable workflow that determines when a refund requires approval
 * and how the approval process works
 */
export class ApprovalWorkflow implements IApprovalWorkflow {
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
   * Numeric threshold value, used with AMOUNT trigger type
   */
  threshold?: number;

  /**
   * Additional condition for custom trigger types
   */
  additionalConditions?: IApprovalCondition | IComplexApprovalCondition;

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

  /**
   * Creates a new approval workflow instance
   * 
   * @param data - Partial workflow data to initialize the instance with
   */
  constructor(data: Partial<IApprovalWorkflow> = {}) {
    this.workflowId = data.workflowId || uuidv4();
    this.name = data.name || 'New Approval Workflow';
    this.description = data.description || '';
    this.triggerType = data.triggerType || 'AMOUNT';
    this.threshold = this.triggerType === 'AMOUNT' ? (data.threshold || 1000) : undefined;
    this.additionalConditions = this.triggerType === 'CUSTOM' ? data.additionalConditions : undefined;
    this.entityType = data.entityType || 'MERCHANT';
    this.entityId = data.entityId || '';
    this.rules = data.rules || [];
    this.onTimeout = data.onTimeout || 'ESCALATE_TO_NEXT_LEVEL';
    this.finalEscalation = data.finalEscalation || '';
    this.active = data.active !== undefined ? data.active : true;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Determines if this workflow is applicable to a refund request based on trigger type and conditions
   * 
   * @param refundRequest - The refund request to evaluate
   * @returns True if the workflow applies to the refund request, false otherwise
   */
  isApplicable(refundRequest: any): boolean {
    // Check if workflow is active
    if (!this.active) {
      logger.debug(`Workflow ${this.workflowId} is inactive, skipping`);
      return false;
    }

    // Check if refund request belongs to the entity specified by this workflow
    if (!this.isEntityMatch(refundRequest)) {
      logger.debug(`Workflow ${this.workflowId} entity doesn't match refund request`);
      return false;
    }

    // Evaluate trigger conditions
    const triggerMet = this.evaluateTriggerCondition(refundRequest);
    
    logger.debug(`Workflow ${this.workflowId} trigger condition evaluation: ${triggerMet}`);
    return triggerMet;
  }

  /**
   * Gets the list of approver roles required at a specific escalation level across all rules
   * 
   * @param escalationLevel - The escalation level to get approvers for
   * @returns List of approver role identifiers at the specified escalation level
   */
  getApproversByLevel(escalationLevel: number): string[] {
    const approverRoles: string[] = [];
    
    // Collect approver roles from all rules for the specified escalation level
    this.rules.forEach(rule => {
      const ruleApprovers = rule.approverRoles
        .filter(approver => approver.escalationLevel === escalationLevel)
        .map(approver => approver.role);
      
      // Add unique roles only
      ruleApprovers.forEach(role => {
        if (!approverRoles.includes(role)) {
          approverRoles.push(role);
        }
      });
    });
    
    logger.debug(`Approvers for workflow ${this.workflowId} at level ${escalationLevel}: ${approverRoles.join(', ')}`);
    return approverRoles;
  }

  /**
   * Calculates the escalation deadline for a specific escalation level
   * 
   * @param escalationLevel - The escalation level to calculate deadline for
   * @returns The calculated deadline date
   */
  getEscalationDeadline(escalationLevel: number): Date {
    // Find rules with escalation configuration for the specified level
    const escalationRules = this.rules
      .flatMap(rule => rule.escalationRules)
      .filter(rule => rule.escalationLevel === escalationLevel);
    
    if (escalationRules.length === 0) {
      logger.debug(`No escalation rules found for level ${escalationLevel}, using default values`);
      // Default: 4 hours
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + 4);
      return deadline;
    }
    
    // Use the shortest escalation time among all rules
    const shortestRule = escalationRules.reduce((prev, curr) => {
      const prevTimeInMinutes = this.convertToMinutes(prev.escalationTime, prev.timeUnit);
      const currTimeInMinutes = this.convertToMinutes(curr.escalationTime, curr.timeUnit);
      return prevTimeInMinutes <= currTimeInMinutes ? prev : curr;
    });
    
    // Calculate deadline based on the shortest rule
    const deadline = new Date();
    
    switch (shortestRule.timeUnit) {
      case 'MINUTES':
        deadline.setMinutes(deadline.getMinutes() + shortestRule.escalationTime);
        break;
      case 'HOURS':
        deadline.setHours(deadline.getHours() + shortestRule.escalationTime);
        break;
      case 'DAYS':
        deadline.setDate(deadline.getDate() + shortestRule.escalationTime);
        break;
    }
    
    logger.debug(`Calculated escalation deadline for level ${escalationLevel}: ${deadline.toISOString()}`);
    return deadline;
  }

  /**
   * Checks if the refund request matches the entity this workflow applies to
   * 
   * @param refundRequest - The refund request to check
   * @returns True if the refund request matches the entity, false otherwise
   */
  isEntityMatch(refundRequest: any): boolean {
    if (!refundRequest) {
      return false;
    }

    switch (this.entityType) {
      case 'MERCHANT':
        return refundRequest.merchantId === this.entityId;
      case 'ORGANIZATION':
        return refundRequest.organizationId === this.entityId;
      case 'PROGRAM':
        return refundRequest.programId === this.entityId;
      case 'BANK':
        return refundRequest.bankId === this.entityId;
      default:
        logger.error(`Unknown entity type: ${this.entityType}`);
        return false;
    }
  }

  /**
   * Evaluates the trigger condition based on the workflow's triggerType
   * 
   * @param refundRequest - The refund request to evaluate
   * @returns True if the trigger condition is met, false otherwise
   */
  evaluateTriggerCondition(refundRequest: any): boolean {
    if (!refundRequest) {
      return false;
    }

    switch (this.triggerType) {
      case 'AMOUNT':
        // Check if refund amount is greater than or equal to threshold
        return refundRequest.amount >= this.threshold;
        
      case 'REFUND_METHOD':
        // Check if refund method matches criteria that require approval
        return ['OTHER'].includes(refundRequest.refundMethod);
        
      case 'CUSTOMER':
        // Customer-specific conditions could be based on customer status, history, etc.
        if (!refundRequest.customerId) {
          return false;
        }
        // Example: high risk customers require approval
        return refundRequest.customerRiskScore > 70;
        
      case 'MERCHANT':
        // Merchant-specific conditions
        if (!refundRequest.merchantId) {
          return false;
        }
        // Example: new merchants might require approval for all refunds
        return refundRequest.merchantCreatedDays < 90;
        
      case 'CUSTOM':
        // Evaluate custom conditions using ApprovalRule
        if (!this.additionalConditions) {
          logger.error('CUSTOM trigger type requires additionalConditions to be defined');
          return false;
        }
        
        // Use ApprovalRule to evaluate custom conditions
        const approvalRule = new ApprovalRule();
        return approvalRule.evaluateConditions(this.additionalConditions, refundRequest);
        
      default:
        logger.error(`Unknown trigger type: ${this.triggerType}`);
        return false;
    }
  }

  /**
   * Checks if this workflow is currently active
   * 
   * @returns True if the workflow is active, false otherwise
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Gets the action to take when an approval request times out
   * 
   * @returns The timeout action (ESCALATE_TO_NEXT_LEVEL, AUTO_APPROVE, or AUTO_REJECT)
   */
  getTimeoutAction(): 'ESCALATE_TO_NEXT_LEVEL' | 'AUTO_APPROVE' | 'AUTO_REJECT' {
    return this.onTimeout;
  }

  /**
   * Gets the role to escalate to when all approval levels are exhausted
   * 
   * @returns The final escalation role
   */
  getFinalEscalationRole(): string {
    return this.finalEscalation;
  }

  /**
   * Converts a time duration to minutes based on the specified time unit
   * 
   * @param time - Time value
   * @param unit - Time unit (MINUTES, HOURS, DAYS)
   * @returns Equivalent time in minutes
   */
  private convertToMinutes(time: number, unit: string): number {
    switch (unit) {
      case 'MINUTES':
        return time;
      case 'HOURS':
        return time * 60;
      case 'DAYS':
        return time * 24 * 60;
      default:
        logger.error(`Unknown time unit: ${unit}, defaulting to minutes`);
        return time;
    }
  }

  /**
   * Converts the approval workflow to a plain JavaScript object
   * 
   * @returns Plain JavaScript object representation of the approval workflow
   */
  toJSON(): object {
    return {
      workflowId: this.workflowId,
      name: this.name,
      description: this.description,
      triggerType: this.triggerType,
      threshold: this.threshold,
      additionalConditions: this.additionalConditions,
      entityType: this.entityType,
      entityId: this.entityId,
      rules: this.rules,
      onTimeout: this.onTimeout,
      finalEscalation: this.finalEscalation,
      active: this.active,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}