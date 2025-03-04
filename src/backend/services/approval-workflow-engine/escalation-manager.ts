// src/backend/services/approval-workflow-engine/escalation-manager.ts
import { v4 as uuidv4 } from 'uuid'; // uuid@^9.0.0
import { ApprovalStatus } from '../../common/enums/approval-status.enum';
import { IApprovalRequest, IApprover, IEscalationRule, IApprovalWorkflow } from '../../common/interfaces/approval.interface';
import { approvalRequestRepository } from '../../database/repositories/approval-request.repo';
import ruleEngine from './rule-engine';
import notificationService from '../../services/notification-service';
import refundRequestService from '../../refund-request-manager';
import { logger } from '../../common/utils/logger';
import eventEmitter from '../../common/utils/event-emitter';
import { BusinessError } from '../../common/errors/business-error';

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_ESCALATION_LEVEL = 3;
const DEFAULT_ESCALATION_TIME_HOURS = 4;

/**
 * Schedules a task to check for approvals that need escalation
 * @param intervalMinutes 
 * @returns Timer reference that can be used to cancel the scheduled task
 */
export function scheduleEscalationCheck(intervalMinutes: number): NodeJS.Timeout {
  logger.info(`Scheduling escalation check every ${intervalMinutes} minutes`);
  const intervalMs = intervalMinutes * 60 * 1000;
  return setInterval(processEscalations, intervalMs);
}

/**
 * Processes approval requests that have exceeded their deadline and require escalation
 * @param batchSize 
 * @returns The number of approval requests that were escalated
 */
export async function processEscalations(batchSize?: number): Promise<number> {
  const size = batchSize || DEFAULT_BATCH_SIZE;
  const currentTime = new Date();
  logger.info(`Processing escalations with batch size: ${size}, current time: ${currentTime}`);

  let escalatedCount = 0;

  try {
    // Find approval requests due for escalation
    const approvals = await approvalRequestRepository.findDueEscalations(currentTime, size);

    logger.info(`Found ${approvals.length} approvals due for escalation`);

    // Process each approval request that needs escalation
    for (const approvalRequest of approvals) {
      try {
        // Escalate the approval request
        await escalateApprovalRequest(approvalRequest);
        escalatedCount++;
      } catch (error) {
        logger.error(`Error escalating approval request ${approvalRequest.approvalId}: ${error.message}`);
      }
    }
  } catch (error) {
    logger.error(`Error processing escalations: ${error.message}`);
  }

  logger.info(`Successfully escalated ${escalatedCount} approval requests`);
  return escalatedCount;
}

/**
 * Escalates a single approval request to the next level of approvers
 * @param approvalRequest 
 * @returns The updated approval request or null if escalation failed
 */
export async function escalateApprovalRequest(approvalRequest: IApprovalRequest): Promise<IApprovalRequest | null> {
  logger.info(`Escalating approval request: ${approvalRequest.approvalId}`);

  try {
    // Retrieve refund request details
    const refundRequest = await refundRequestService.getRefundRequest(approvalRequest.refundRequestId);

    // Get applicable rules and workflows
    const rules = ruleEngine.getApplicableRules(refundRequest, []);
    const workflows = ruleEngine.getApplicableWorkflows(refundRequest, []);

    // Get maximum escalation level
    const maxLevel = getMaxEscalationLevel(rules, workflows);

    // Check if current escalation level equals or exceeds maximum level
    if (approvalRequest.escalationLevel >= maxLevel) {
      logger.info(`Approval request ${approvalRequest.approvalId} has reached maximum escalation level`);
      return handleMaxEscalationReached(approvalRequest, rules, workflows);
    }

    // Calculate new escalation level
    const newLevel = approvalRequest.escalationLevel + 1;

    // Calculate new escalation deadline
    const newDeadline = ruleEngine.calculateEscalationDeadline(rules[0], newLevel);

    // Update the approval request with new escalation level and deadline
    approvalRequest.escalationLevel = newLevel;
    approvalRequest.escalationDue = newDeadline;
    approvalRequest.status = ApprovalStatus.ESCALATED;

    // Determine approvers for the new escalation level
    const approvers = getApproversForLevel(refundRequest, rules, workflows, newLevel);

    // Add new approvers to the approval request
    approvalRequest.approvers.push(...approvers);

    // Update the approval request in the database
    await approvalRequestRepository.update(approvalRequest);

    // Send notifications to new approvers about the escalated request
    await notifyApprovers(approvalRequest, refundRequest, approvers);

    // Emit 'approval.escalated' event with approval details
    eventEmitter.emit('approval.escalated', {
      approvalId: approvalRequest.approvalId,
      newLevel: newLevel,
      newDeadline: newDeadline,
      approvers: approvers
    });

    logger.info(`Successfully escalated approval request ${approvalRequest.approvalId} to level ${newLevel}, due: ${newDeadline}`);
    return approvalRequest;
  } catch (error) {
    logger.error(`Error escalating approval request ${approvalRequest.approvalId}: ${error.message}`);
    return null;
  }
}

/**
 * Handles the case when an approval request has reached its maximum escalation level
 * @param approvalRequest 
 * @param rules 
 * @param workflows 
 * @returns The updated approval request or null if handling failed
 */
async function handleMaxEscalationReached(approvalRequest: IApprovalRequest, rules: any[], workflows: IApprovalWorkflow[]): Promise<IApprovalRequest | null> {
  logger.info(`Handling max escalation reached for approval request: ${approvalRequest.approvalId}`);

  try {
    // Determine final escalation action
    const finalAction = getFinalEscalationAction(rules, workflows);

    if (finalAction === 'AUTO_APPROVE') {
      // Auto-approve the request
      approvalRequest.status = ApprovalStatus.APPROVED;
      logger.info(`Auto-approving approval request ${approvalRequest.approvalId}`);
    } else if (finalAction === 'AUTO_REJECT') {
      // Auto-reject the request
      approvalRequest.status = ApprovalStatus.REJECTED;
      logger.info(`Auto-rejecting approval request ${approvalRequest.approvalId}`);
    } else {
      // Notify admin roles
      const adminRoles = getAdminRoles();
      logger.info(`Notifying admin roles for approval request ${approvalRequest.approvalId}`);

      // Send high priority notifications to admin roles
      notificationService.sendNotification(
        'APPROVAL_ESCALATED',
        adminRoles.join(','),
        'EMAIL',
        {
          approvalId: approvalRequest.approvalId,
          message: 'Approval request reached maximum escalation level'
        }
      );
    }

    // Update approval request with final status
    await approvalRequestRepository.updateStatus(approvalRequest.approvalId, approvalRequest.status);

    // Emit appropriate event based on the final action taken
    eventEmitter.emit(`approval.${finalAction.toLowerCase()}`, {
      approvalId: approvalRequest.approvalId,
      status: approvalRequest.status
    });

    logger.info(`Final action taken for approval request ${approvalRequest.approvalId}: ${finalAction}`);
    return approvalRequest;
  } catch (error) {
    logger.error(`Error handling max escalation reached for approval request ${approvalRequest.approvalId}: ${error.message}`);
    return null;
  }
}

/**
 * Determines the final action to take when maximum escalation level is reached
 * @param rules 
 * @param workflows 
 * @returns The final escalation action to take: AUTO_APPROVE, AUTO_REJECT, or NOTIFY_ADMIN
 */
function getFinalEscalationAction(rules: any[], workflows: IApprovalWorkflow[]): string {
  // Check rules for finalEscalation or onTimeout settings
  for (const rule of rules) {
    if (rule.finalEscalation) {
      return rule.finalEscalation;
    }
    if (rule.onTimeout) {
      return rule.onTimeout;
    }
  }

  // Check workflows for finalEscalation or onTimeout settings
  for (const workflow of workflows) {
    if (workflow.finalEscalation) {
      return workflow.finalEscalation;
    }
    if (workflow.onTimeout) {
      return workflow.onTimeout;
    }
  }

  // Default to NOTIFY_ADMIN if not specified
  return 'NOTIFY_ADMIN';
}

/**
 * Determines the maximum escalation level from rules and workflows
 * @param rules 
 * @param workflows 
 * @returns The maximum escalation level
 */
function getMaxEscalationLevel(rules: any[], workflows: IApprovalWorkflow[]): number {
  let maxLevel = 0;

  // Check rules for maximum level
  for (const rule of rules) {
    if (rule.approverRoles) {
      for (const approver of rule.approverRoles) {
        if (approver.escalationLevel > maxLevel) {
          maxLevel = approver.escalationLevel;
        }
      }
    }
  }

  // Check workflows for any higher escalation levels
  for (const workflow of workflows) {
    if (workflow.rules) {
      for (const rule of workflow.rules) {
        if (rule.approverRoles) {
          for (const approver of rule.approverRoles) {
            if (approver.escalationLevel > maxLevel) {
              maxLevel = approver.escalationLevel;
            }
          }
        }
      }
    }
  }

  // Return the highest level found or DEFAULT_MAX_ESCALATION_LEVEL if none specified
  return maxLevel || DEFAULT_MAX_ESCALATION_LEVEL;
}

/**
 * Gets the list of approvers for a specific escalation level
 * @param refundRequest 
 * @param rules 
 * @param workflows 
 * @param escalationLevel 
 * @returns Array of approvers for the specified escalation level
 */
function getApproversForLevel(refundRequest: any, rules: any[], workflows: IApprovalWorkflow[], escalationLevel: number): IApprover[] {
  const approverRoles = new Set<string>();

  // Extract approver roles from rules
  for (const rule of rules) {
    if (rule.approverRoles) {
      for (const approver of rule.approverRoles) {
        if (approver.escalationLevel === escalationLevel) {
          approverRoles.add(approver.role);
        }
      }
    }
  }

  // Extract approver roles from workflows
  for (const workflow of workflows) {
    if (workflow.rules) {
      for (const rule of workflow.rules) {
        if (rule.approverRoles) {
          for (const approver of rule.approverRoles) {
            if (approver.escalationLevel === escalationLevel) {
              approverRoles.add(approver.role);
            }
          }
        }
      }
    }
  }

  // Create IApprover objects for each unique role
  const approvers: IApprover[] = [];
  approverRoles.forEach(role => {
    approvers.push({
      id: uuidv4(),
      approvalId: refundRequest.approvalId,
      approverId: null, // TODO: Replace with actual user ID based on role
      approverRole: role,
      escalationLevel: escalationLevel,
      assignedAt: new Date(),
      notifiedAt: null
    });
  });

  return approvers;
}

/**
 * Sends notifications to approvers about an escalated approval request
 * @param approvalRequest 
 * @param refundRequest 
 * @param approvers 
 */
async function notifyApprovers(approvalRequest: IApprovalRequest, refundRequest: any, approvers: IApprover[]): Promise<void> {
  // Build notifications array for bulk sending
  const notifications = approvers.map(approver => ({
    notificationType: 'APPROVAL_ESCALATED',
    recipient: approver.approverId,
    channel: 'EMAIL',
    context: {
      approvalId: approvalRequest.approvalId,
      refundId: refundRequest.refundRequestId,
      amount: refundRequest.amount,
      currency: refundRequest.currency,
      escalationLevel: approvalRequest.escalationLevel
    }
  }));

  // Send all notifications using notificationService.sendBulkNotifications
  const results = await notificationService.sendBulkNotifications(notifications);

  // Log notification results
  logger.info(`Sent ${results.length} approval notifications for escalation`, {
    approvalId: approvalRequest.approvalId,
    escalationLevel: approvalRequest.escalationLevel,
    successCount: results.filter(r => r.success).length,
    failureCount: results.filter(r => !r.success).length
  });

  // Update approvers' notifiedAt timestamp
  approvers.forEach(approver => {
    approver.notifiedAt = new Date();
  });
}

/**
 * Gets the list of admin roles for final escalation notifications
 * @returns Array of admin role identifiers
 */
function getAdminRoles(): string[] {
  // TODO: Retrieve admin roles from configuration or database
  return ['PLATFORM_ADMIN', 'BANK_ADMIN', 'ORGANIZATION_ADMIN'];
}

// Export functions for testing and use throughout the module
export {
  scheduleEscalationCheck,
  processEscalations,
  escalateApprovalRequest
};