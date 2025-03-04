import { v4 as uuidv4 } from 'uuid'; // uuid@^9.0.0
import { 
  IApprovalRule, 
  IApprovalCondition, 
  IComplexApprovalCondition,
  IApproverRoleConfig,
  IEscalationRule
} from '../../../common/interfaces/approval.interface';
import { RefundMethod } from '../../../common/enums/refund-method.enum';
import { logger } from '../../../common/utils/logger';

/**
 * Extracts a field value from an object using dot notation for nested properties
 * 
 * @param obj - The object to extract the value from
 * @param fieldPath - The path to the field using dot notation (e.g., 'user.address.city')
 * @returns The value at the specified path or undefined if any part of the path doesn't exist
 */
export function getFieldValue(obj: any, fieldPath: string): any {
  if (!obj || !fieldPath) {
    return undefined;
  }

  const parts = fieldPath.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Evaluates a single condition against a field value using the specified operator
 * 
 * @param fieldValue - The actual value from the object being evaluated
 * @param operator - The comparison operator to use
 * @param expectedValue - The expected value to compare against
 * @returns Boolean result of the comparison
 */
export function evaluateCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
  // Handle undefined or null field values based on the operator
  if (fieldValue === undefined || fieldValue === null) {
    // If checking for equality with null/undefined, return true
    if (operator === 'equals' && (expectedValue === null || expectedValue === undefined)) {
      return true;
    }
    // If checking for inequality with null/undefined, return true
    if (operator === 'notEquals' && (expectedValue !== null && expectedValue !== undefined)) {
      return true;
    }
    // For other operators, null/undefined fields always fail the condition
    return false;
  }

  switch (operator) {
    case 'equals':
      return fieldValue === expectedValue;
    case 'notEquals':
      return fieldValue !== expectedValue;
    case 'greaterThan':
      return fieldValue > expectedValue;
    case 'lessThan':
      return fieldValue < expectedValue;
    case 'greaterThanOrEqual':
      return fieldValue >= expectedValue;
    case 'lessThanOrEqual':
      return fieldValue <= expectedValue;
    case 'in':
      return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
    case 'notIn':
      return Array.isArray(expectedValue) && !expectedValue.includes(fieldValue);
    case 'contains':
      if (typeof fieldValue === 'string') {
        return fieldValue.includes(String(expectedValue));
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(expectedValue);
      }
      return false;
    case 'startsWith':
      return typeof fieldValue === 'string' && fieldValue.startsWith(String(expectedValue));
    case 'endsWith':
      return typeof fieldValue === 'string' && fieldValue.endsWith(String(expectedValue));
    default:
      logger.error(`Unknown operator: ${operator}`);
      return false;
  }
}

/**
 * Model representing a configurable rule that determines when a refund requires approval
 * and how the approval process should be managed.
 */
export class ApprovalRule implements IApprovalRule {
  /**
   * Unique identifier for this rule
   */
  ruleId: string;

  /**
   * Type of entity this rule applies to (MERCHANT, ORGANIZATION, PROGRAM, BANK)
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

  /**
   * Creates a new approval rule instance
   * 
   * @param data - Partial rule data to initialize the instance with
   */
  constructor(data: Partial<IApprovalRule> = {}) {
    this.ruleId = data.ruleId || uuidv4();
    this.entityType = data.entityType || 'MERCHANT';
    this.entityId = data.entityId || '';
    this.ruleName = data.ruleName || 'New Approval Rule';
    this.description = data.description || '';
    
    // Default condition if none provided
    this.conditions = data.conditions || {
      field: 'amount',
      operator: 'greaterThan',
      value: 1000
    };
    
    // Default approver roles if none provided
    this.approverRoles = data.approverRoles || [{
      role: 'MERCHANT_ADMIN',
      escalationLevel: 0
    }];
    
    // Default escalation rules if none provided
    this.escalationRules = data.escalationRules || [{
      escalationLevel: 0,
      escalationTime: 4,
      timeUnit: 'HOURS'
    }];
    
    this.priority = data.priority !== undefined ? data.priority : 10;
    this.active = data.active !== undefined ? data.active : true;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Determines if a refund request matches this rule's conditions
   * 
   * @param refundRequest - The refund request to evaluate
   * @returns True if the refund request matches the rule conditions, false otherwise
   */
  matchesRefund(refundRequest: any): boolean {
    // First check if the rule is active
    if (!this.active) {
      logger.debug(`Rule ${this.ruleId} is inactive, skipping`);
      return false;
    }

    // Check if the refund belongs to the entity this rule applies to
    if (!this.isEntityMatch(refundRequest)) {
      logger.debug(`Rule ${this.ruleId} entity doesn't match refund request`);
      return false;
    }

    // Evaluate the rule conditions
    const result = this.evaluateConditions(this.conditions, refundRequest);
    
    logger.debug(`Rule ${this.ruleId} evaluation result: ${result}`);
    return result;
  }

  /**
   * Gets the list of approver roles required for this rule at a specific escalation level
   * 
   * @param escalationLevel - The escalation level to get approvers for
   * @returns List of approver role identifiers at the specified escalation level
   */
  getRequiredApprovers(escalationLevel: number): string[] {
    const approvers = this.approverRoles
      .filter(approver => approver.escalationLevel === escalationLevel)
      .map(approver => approver.role);
    
    logger.debug(`Required approvers for rule ${this.ruleId} at level ${escalationLevel}: ${approvers.join(', ')}`);
    return approvers;
  }

  /**
   * Gets the escalation time configuration for a specific escalation level
   * 
   * @param escalationLevel - The escalation level to get the time configuration for
   * @returns Escalation time configuration with time value and unit
   */
  getEscalationTime(escalationLevel: number): { time: number; unit: string } {
    const escalationRule = this.escalationRules.find(rule => rule.escalationLevel === escalationLevel);
    
    if (!escalationRule) {
      logger.debug(`No escalation rule found for level ${escalationLevel}, using default values`);
      return { time: 4, unit: 'HOURS' };
    }
    
    return {
      time: escalationRule.escalationTime,
      unit: escalationRule.timeUnit
    };
  }

  /**
   * Checks if this rule is currently active
   * 
   * @returns True if the rule is active, false otherwise
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Checks if the refund request matches the entity this rule applies to
   * 
   * @param refundRequest - The refund request to check
   * @returns True if the refund request matches the entity, false otherwise
   */
  private isEntityMatch(refundRequest: any): boolean {
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
   * Recursively evaluates a condition or group of conditions against a refund request
   * 
   * @param condition - The condition or group of conditions to evaluate
   * @param refundRequest - The refund request to evaluate against
   * @returns True if conditions are met, false otherwise
   */
  evaluateConditions(
    condition: IApprovalCondition | IComplexApprovalCondition,
    refundRequest: any
  ): boolean {
    // Handle complex condition with logical operator
    if ('operator' in condition && 'conditions' in condition) {
      const complexCondition = condition as IComplexApprovalCondition;
      
      if (complexCondition.operator === 'AND') {
        return complexCondition.conditions.every(subCondition => 
          this.evaluateConditions(subCondition, refundRequest)
        );
      } 
      else if (complexCondition.operator === 'OR') {
        return complexCondition.conditions.some(subCondition => 
          this.evaluateConditions(subCondition, refundRequest)
        );
      } 
      else if (complexCondition.operator === 'NOT') {
        // NOT should have a single condition
        if (complexCondition.conditions.length !== 1) {
          logger.error('NOT operator should have exactly one condition');
          return false;
        }
        return !this.evaluateConditions(complexCondition.conditions[0], refundRequest);
      } 
      else {
        logger.error(`Unknown logical operator: ${complexCondition.operator}`);
        return false;
      }
    } 
    // Handle simple field condition
    else if ('field' in condition && 'operator' in condition && 'value' in condition) {
      const simpleCondition = condition as IApprovalCondition;
      const fieldValue = getFieldValue(refundRequest, simpleCondition.field);
      
      return evaluateCondition(fieldValue, simpleCondition.operator, simpleCondition.value);
    } 
    else {
      logger.error('Invalid condition structure');
      return false;
    }
  }

  /**
   * Converts the approval rule to a plain JavaScript object
   * 
   * @returns Plain JavaScript object representation of the approval rule
   */
  toJSON(): object {
    return {
      ruleId: this.ruleId,
      entityType: this.entityType,
      entityId: this.entityId,
      ruleName: this.ruleName,
      description: this.description,
      conditions: this.conditions,
      approverRoles: this.approverRoles,
      escalationRules: this.escalationRules,
      priority: this.priority,
      active: this.active,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}