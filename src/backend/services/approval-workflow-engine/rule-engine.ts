import { 
  IApprovalRule, 
  IApprovalCondition, 
  IComplexApprovalCondition,
  IEscalationRule,
  IApproverRoleConfig,
  IApprovalWorkflow
} from '../../../common/interfaces/approval.interface';

import {
  ApprovalRule,
  getFieldValue,
  evaluateCondition
} from './models/approval-rule.model';

import { logger } from '../../../common/utils/logger';

/**
 * Evaluates a refund request against a set of approval rules
 * to determine if approval is required
 * 
 * @param refundRequest - The refund request to evaluate
 * @param rules - The approval rules to evaluate against
 * @returns Object containing whether approval is required and the matched rules
 */
function evaluateApprovalRules(
  refundRequest: any,
  rules: Array<IApprovalRule | ApprovalRule>
): { requiresApproval: boolean; matchedRules: ApprovalRule[] } {
  logger.debug(`Evaluating ${rules?.length || 0} rules for refund request`, { 
    refundId: refundRequest?.refundRequestId 
  });

  // If no rules provided, no approval required
  if (!rules || rules.length === 0) {
    return { requiresApproval: false, matchedRules: [] };
  }

  // Convert all rule objects to ApprovalRule instances if they aren't already
  const ruleInstances = rules.map(rule => 
    rule instanceof ApprovalRule ? rule : new ApprovalRule(rule)
  );

  // Sort rules by priority (lower number = higher priority)
  ruleInstances.sort((a, b) => a.priority - b.priority);

  // Initialize empty array to collect rules that match the refund
  const matchedRules: ApprovalRule[] = [];

  // Evaluate each rule against the refund request
  for (const rule of ruleInstances) {
    if (rule.matchesRefund(refundRequest)) {
      logger.debug(`Rule ${rule.ruleId} (${rule.ruleName}) matched refund request`, {
        refundId: refundRequest.refundRequestId,
        ruleId: rule.ruleId
      });
      matchedRules.push(rule);
    }
  }

  return {
    requiresApproval: matchedRules.length > 0,
    matchedRules
  };
}

/**
 * Evaluates a refund request against approval workflows
 * to determine if approval is required
 * 
 * @param refundRequest - The refund request to evaluate
 * @param workflows - The approval workflows to evaluate against
 * @returns Object containing whether approval is required and matched workflows/rules
 */
function evaluateApprovalWorkflows(
  refundRequest: any,
  workflows: Array<IApprovalWorkflow>
): { 
  requiresApproval: boolean; 
  matchedWorkflows: IApprovalWorkflow[];
  matchedRules: ApprovalRule[];
} {
  logger.debug(`Evaluating ${workflows?.length || 0} workflows for refund request`, { 
    refundId: refundRequest?.refundRequestId 
  });

  // If no workflows provided, no approval required
  if (!workflows || workflows.length === 0) {
    return { 
      requiresApproval: false, 
      matchedWorkflows: [],
      matchedRules: []
    };
  }

  // Initialize arrays for matched workflows and rules
  const matchedWorkflows: IApprovalWorkflow[] = [];
  const matchedRules: ApprovalRule[] = [];

  // Evaluate each workflow against the refund request
  for (const workflow of workflows) {
    // Check if this workflow applies to the entity in the refund request
    let entityMatch = false;
    
    switch (workflow.entityType) {
      case 'MERCHANT':
        entityMatch = refundRequest.merchantId === workflow.entityId;
        break;
      case 'ORGANIZATION':
        entityMatch = refundRequest.organizationId === workflow.entityId;
        break;
      case 'PROGRAM':
        entityMatch = refundRequest.programId === workflow.entityId;
        break;
      case 'BANK':
        entityMatch = refundRequest.bankId === workflow.entityId;
        break;
      default:
        logger.error(`Unknown entity type: ${workflow.entityType}`);
        break;
    }
    
    if (entityMatch) {
      // Evaluate the rules in this workflow
      const { requiresApproval, matchedRules: workflowMatchedRules } = evaluateApprovalRules(
        refundRequest,
        workflow.rules
      );
      
      // If any rules match, add workflow to matched workflows
      if (requiresApproval) {
        matchedWorkflows.push(workflow);
        matchedRules.push(...workflowMatchedRules);
        
        logger.debug(`Workflow ${workflow.workflowId} (${workflow.name}) matched refund request`, {
          refundId: refundRequest.refundRequestId,
          workflowId: workflow.workflowId,
          matchedRuleCount: workflowMatchedRules.length
        });
      }
    }
  }

  return {
    requiresApproval: matchedWorkflows.length > 0,
    matchedWorkflows,
    matchedRules
  };
}

/**
 * Gets rules applicable to a specific refund request based on entity type/ID
 * 
 * @param refundRequest - The refund request to filter rules for
 * @param rules - The complete set of rules
 * @returns Rules that are applicable to the refund request based on entity
 */
function getApplicableRules(
  refundRequest: any,
  rules: Array<IApprovalRule | ApprovalRule>
): ApprovalRule[] {
  // Convert all rules to ApprovalRule instances if needed
  const ruleInstances = rules.map(rule => 
    rule instanceof ApprovalRule ? rule : new ApprovalRule(rule)
  );
  
  // Filter rules to only include those where entity type/ID matches the refund request
  return ruleInstances.filter(rule => {
    switch (rule.entityType) {
      case 'MERCHANT':
        return refundRequest.merchantId === rule.entityId;
      case 'ORGANIZATION':
        return refundRequest.organizationId === rule.entityId;
      case 'PROGRAM':
        return refundRequest.programId === rule.entityId;
      case 'BANK':
        return refundRequest.bankId === rule.entityId;
      default:
        logger.error(`Unknown entity type: ${rule.entityType}`);
        return false;
    }
  });
}

/**
 * Determines the required approvers for a refund request based on matched rules
 * 
 * @param refundRequest - The refund request
 * @param matchedRules - Rules that matched the refund request
 * @param escalationLevel - The escalation level to get approvers for
 * @returns List of approver roles at the specified escalation level
 */
function determineApprovers(
  refundRequest: any,
  matchedRules: ApprovalRule[],
  escalationLevel: number
): string[] {
  logger.debug(`Determining approvers for refund request at escalation level ${escalationLevel}`, {
    refundId: refundRequest.refundRequestId,
    matchedRuleCount: matchedRules.length,
    escalationLevel
  });

  // Initialize empty array for approvers
  const approvers: string[] = [];

  // Get approvers from each matched rule
  for (const rule of matchedRules) {
    const ruleApprovers = rule.getRequiredApprovers(escalationLevel);
    approvers.push(...ruleApprovers);
    
    logger.debug(`Rule ${rule.ruleId} requires approvers: ${ruleApprovers.join(', ')}`, {
      ruleId: rule.ruleId,
      escalationLevel
    });
  }

  // Remove duplicates
  const uniqueApprovers = [...new Set(approvers)];
  
  logger.debug(`Final approvers list: ${uniqueApprovers.join(', ')}`, {
    escalationLevel,
    approverCount: uniqueApprovers.length
  });

  return uniqueApprovers;
}

/**
 * Calculates the escalation deadline based on a rule and escalation level
 * 
 * @param rule - The rule containing escalation configuration
 * @param escalationLevel - The escalation level to calculate the deadline for
 * @returns The calculated deadline for escalation
 */
function calculateEscalationDeadline(
  rule: ApprovalRule,
  escalationLevel: number
): Date {
  // Find escalation rule for this level
  const escalationRule = rule.escalationRules.find(
    r => r.escalationLevel === escalationLevel
  );
  
  // Start with current date
  const now = new Date();
  
  // If escalation rule found, calculate based on its configuration
  if (escalationRule) {
    const { escalationTime, timeUnit } = escalationRule;
    
    switch (timeUnit) {
      case 'MINUTES':
        return new Date(now.getTime() + escalationTime * 60 * 1000);
      case 'HOURS':
        return new Date(now.getTime() + escalationTime * 60 * 60 * 1000);
      case 'DAYS':
        return new Date(now.getTime() + escalationTime * 24 * 60 * 60 * 1000);
      default:
        logger.warn(`Unknown time unit: ${timeUnit}, using default 4 hours`);
        return new Date(now.getTime() + 4 * 60 * 60 * 1000);
    }
  }
  
  // Default to 4 hour escalation if no rule found
  logger.debug(`No escalation rule found for level ${escalationLevel}, using default 4 hours`);
  return new Date(now.getTime() + 4 * 60 * 60 * 1000);
}

/**
 * Determines the maximum escalation level across all provided rules
 * 
 * @param rules - The rules to check for escalation levels
 * @returns The highest escalation level found in any rule
 */
function getMaxEscalationLevel(rules: ApprovalRule[]): number {
  let maxLevel = 0;
  
  // Check each rule's approverRoles
  for (const rule of rules) {
    for (const approver of rule.approverRoles) {
      if (approver.escalationLevel > maxLevel) {
        maxLevel = approver.escalationLevel;
      }
    }
  }
  
  return maxLevel;
}

/**
 * Engine for evaluating approval rules against refund requests
 * to determine approval requirements
 */
class ApprovalRuleEngine {
  /**
   * Evaluates a refund request against a set of approval rules
   * 
   * @param refundRequest - The refund request to evaluate
   * @param rules - The approval rules to evaluate against
   * @returns Object containing whether approval is required and the matched rules
   */
  evaluateApprovalRules(
    refundRequest: any,
    rules: Array<IApprovalRule | ApprovalRule>
  ): { requiresApproval: boolean; matchedRules: ApprovalRule[] } {
    return evaluateApprovalRules(refundRequest, rules);
  }
  
  /**
   * Evaluates a refund request against approval workflows
   * 
   * @param refundRequest - The refund request to evaluate
   * @param workflows - The approval workflows to evaluate against
   * @returns Object containing whether approval is required and matched workflows/rules
   */
  evaluateApprovalWorkflows(
    refundRequest: any,
    workflows: Array<IApprovalWorkflow>
  ): { 
    requiresApproval: boolean; 
    matchedWorkflows: IApprovalWorkflow[];
    matchedRules: ApprovalRule[];
  } {
    return evaluateApprovalWorkflows(refundRequest, workflows);
  }
  
  /**
   * Gets rules applicable to a specific refund request
   * 
   * @param refundRequest - The refund request to filter rules for
   * @param rules - The complete set of rules
   * @returns Rules that are applicable to the refund request based on entity
   */
  getApplicableRules(
    refundRequest: any,
    rules: Array<IApprovalRule | ApprovalRule>
  ): ApprovalRule[] {
    return getApplicableRules(refundRequest, rules);
  }
  
  /**
   * Determines approvers for a refund based on matched rules
   * 
   * @param refundRequest - The refund request
   * @param matchedRules - Rules that matched the refund request
   * @param escalationLevel - The escalation level to get approvers for
   * @returns List of approver roles at the specified escalation level
   */
  determineApprovers(
    refundRequest: any,
    matchedRules: ApprovalRule[],
    escalationLevel: number
  ): string[] {
    return determineApprovers(refundRequest, matchedRules, escalationLevel);
  }
  
  /**
   * Calculates escalation deadline for a rule and level
   * 
   * @param rule - The rule containing escalation configuration
   * @param escalationLevel - The escalation level to calculate the deadline for
   * @returns The calculated deadline for escalation
   */
  calculateEscalationDeadline(
    rule: ApprovalRule,
    escalationLevel: number
  ): Date {
    return calculateEscalationDeadline(rule, escalationLevel);
  }
  
  /**
   * Gets the maximum escalation level from rules
   * 
   * @param rules - The rules to check for escalation levels
   * @returns The highest escalation level found in any rule
   */
  getMaxEscalationLevel(rules: ApprovalRule[]): number {
    return getMaxEscalationLevel(rules);
  }
}

// Export the functions for use throughout the approval workflow engine
export default {
  evaluateApprovalRules,
  evaluateApprovalWorkflows,
  getApplicableRules,
  determineApprovers,
  calculateEscalationDeadline,
  getMaxEscalationLevel
};