// src/backend/services/approval-workflow-engine/handlers/escalation.handler.ts
import { v4 as uuidv4 } from 'uuid'; // uuid@^9.0.0
import { ApprovalStatus, IApprovalRequest, IApprover } from '../../../common/interfaces/approval.interface';
import approvalRequestRepository from '../../../database/repositories/approval-request.repo';
import ruleEngine from '../rule-engine';
import notificationService from '../../notification-service';
import { refundRequestService } from '../../refund-request-manager';
import { logger } from '../../../common/utils/logger';
import eventEmitter from '../../../common/utils/event-emitter';
import { BusinessError } from '../../../common/errors/business-error';

/**
 * Processes all approval requests that have exceeded their deadline and require escalation
 * @param batchSize The number of approval requests to process in a single batch
 * @returns The number of approval requests that were escalated
 */
export const processEscalations = async (batchSize: number): Promise<number> => {
  // Get current datetime
  const currentTime = new Date();

  // Find approval requests due for escalation using approvalRequestRepository.findDueEscalations(currentTime, batchSize)
  const approvals = await approvalRequestRepository.findDueEscalations(currentTime, batchSize);

  // Log the number of approvals found for escalation
  logger.info(`Found ${approvals.length} approvals due for escalation`);

  // Initialize escalation counter
  let escalatedCount = 0;

  // For each approval request that needs escalation:
  for (const approvalRequest of approvals) {
    try {
      // Attempt to escalate using escalateApprovalRequest function
      await escalateApprovalRequest(approvalRequest);

      // Increment counter for each successful escalation
      escalatedCount++;
    } catch (escalationError: any) {
      // Log any escalation failures but continue processing others
      logger.error(`Failed to escalate approval request ${approvalRequest.approvalId}: ${escalationError.message}`);
    }
  }

  // Return total number of successfully escalated requests
  return escalatedCount;
};

/**
 * Escalates a single approval request to the next level of approvers
 * @param approvalRequest The approval request to escalate
 * @returns The updated approval request or null if escalation failed
 */
export const escalateApprovalRequest = async (approvalRequest: IApprovalRequest): Promise<IApprovalRequest | null> => {
  // Log the start of escalation for the approval request
  logger.info(`Escalating approval request ${approvalRequest.approvalId}`);

  try {
    // Retrieve refund request details using refundRequestService.getRefundRequest
    const refundRequest = await refundRequestService.getRefundRequest(approvalRequest.refundRequestId);

    // Get applicable rules using ruleEngine.getApplicableRules
    const rules = ruleEngine.getApplicableRules(refundRequest, []);

    // Get applicable workflows using ruleEngine.getApplicableWorkflows
    const workflows = ruleEngine.getApplicableWorkflows(refundRequest, []);

    // Determine maximum escalation level based on rules and workflows
    const maxLevel = ruleEngine.getMaxEscalationLevel(rules, workflows);

    // Check if current escalation level is already at maximum
    if (approvalRequest.escalationLevel >= maxLevel) {
      // If at maximum level, handle according to handleMaxEscalationReached function
      return await handleMaxEscalationReached(approvalRequest, rules, workflows);
    }

    // Calculate new escalation level (current + 1)
    const newLevel = approvalRequest.escalationLevel + 1;

    // Calculate new escalation deadline using ruleEngine.calculateEscalationDeadline
    const newEscalationDue = ruleEngine.calculateEscalationDeadline(rules[0], newLevel);

    // Update approval request with new level and ESCALATED status
    approvalRequest.escalationLevel = newLevel;
    approvalRequest.escalationDue = newEscalationDue;
    approvalRequest.status = ApprovalStatus.ESCALATED;

    // Determine approvers for the new escalation level using getApproversForLevel
    const newApprovers = await getApproversForLevel(refundRequest, rules, workflows, newLevel);

    // Add new approvers to the approval request
    approvalRequest.approvers.push(...newApprovers);

    // Notify new approvers about the escalated request
    await notifyApprovers(approvalRequest, refundRequest, newApprovers);

    // Emit approval.escalated event with approval details
    eventEmitter.emit('approval.escalated', {
      approvalId: approvalRequest.approvalId,
      newLevel: newLevel,
      newApprovers: newApprovers,
    });

    // Update the approval request in the database
    await approvalRequestRepository.update(approvalRequest);

    // Log successful escalation with new level and deadline
    logger.info(`Successfully escalated approval request ${approvalRequest.approvalId} to level ${newLevel}`, {
      newLevel: newLevel,
      newEscalationDue: newEscalationDue,
    });

    // Return the updated approval request
    return approvalRequest;
  } catch (error: any) {
    // Log escalation failure
    logger.error(`Failed to escalate approval request ${approvalRequest.approvalId}: ${error.message}`);
    return null;
  }
};

/**
 * Handles approval requests that have reached the maximum escalation level
 * @param approvalRequest The approval request that has reached maximum escalation
 * @param rules The applicable rules for the approval request
 * @param workflows The applicable workflows for the approval request
 * @returns The updated approval request or null if handling failed
 */
export const handleMaxEscalationReached = async (approvalRequest: IApprovalRequest, rules: any, workflows: any): Promise<IApprovalRequest | null> => {
  // Log that maximum escalation level has been reached
  logger.info(`Maximum escalation level reached for approval request ${approvalRequest.approvalId}`);

  try {
    // Determine final escalation action from rules and workflows (AUTO_APPROVE, AUTO_REJECT, NOTIFY_ADMIN)
    const finalAction = getFinalEscalationAction(rules, workflows);

    // If final action is AUTO_APPROVE, update status to APPROVED
    if (finalAction === 'AUTO_APPROVE') {
      approvalRequest.status = ApprovalStatus.APPROVED;
      logger.info(`Auto-approving approval request ${approvalRequest.approvalId}`);
    }

    // If final action is AUTO_REJECT, update status to REJECTED
    else if (finalAction === 'AUTO_REJECT') {
      approvalRequest.status = ApprovalStatus.REJECTED;
      logger.info(`Auto-rejecting approval request ${approvalRequest.approvalId}`);
    }

    // If final action is NOTIFY_ADMIN, identify admin roles to notify
    else if (finalAction === 'NOTIFY_ADMIN') {
      // TODO: Implement admin notification logic
      logger.info(`Notifying admins about approval request ${approvalRequest.approvalId}`);
    }

    // Update the approval request with the final status
    await approvalRequestRepository.update(approvalRequest);

    // Emit appropriate event based on final action
    eventEmitter.emit(`approval.${finalAction.toLowerCase()}`, {
      approvalId: approvalRequest.approvalId,
      finalAction: finalAction,
    });

    // Log the final escalation action taken
    logger.info(`Final escalation action taken for approval request ${approvalRequest.approvalId}: ${finalAction}`);

    // Return the updated approval request
    return approvalRequest;
  } catch (error: any) {
    // Log handling failure
    logger.error(`Failed to handle maximum escalation for approval request ${approvalRequest.approvalId}: ${error.message}`);
    return null;
  }
};

/**
 * Gets approvers for a specific escalation level based on rules and workflows
 * @param refundRequest The refund request
 * @param rules The applicable rules for the refund request
 * @param workflows The applicable workflows for the refund request
 * @param escalationLevel The escalation level to get approvers for
 * @returns Array of approvers for the specified escalation level
 */
export const getApproversForLevel = async (refundRequest: any, rules: any, workflows: any, escalationLevel: number): Promise<IApprover[]> => {
  // Initialize set to track unique approver roles
  const approverRoles = new Set<string>();

  // Extract approver roles from rules at the specified escalation level
  for (const rule of rules) {
    for (const approver of rule.approverRoles) {
      if (approver.escalationLevel === escalationLevel) {
        approverRoles.add(approver.role);
      }
    }
  }

  // Extract approver roles from workflows at the specified escalation level
  for (const workflow of workflows) {
    for (const rule of workflow.rules) {
      for (const approver of rule.approverRoles) {
        if (approver.escalationLevel === escalationLevel) {
          approverRoles.add(approver.role);
        }
      }
    }
  }

  // For each unique approver role, create an IApprover object
  const approvers: IApprover[] = [];
  for (const role of approverRoles) {
    // Generate ID for each approver using uuidv4
    const approverId = uuidv4();

    // Set appropriate escalation level and role for each approver
    approvers.push({
      id: approverId,
      approvalId: refundRequest.approvalId,
      approverId: null, // TODO: Replace with actual user ID
      approverRole: role,
      escalationLevel: escalationLevel,
      assignedAt: new Date(),
      notifiedAt: null,
    });
  }

  // Return array of IApprover objects
  return approvers;
};

/**
 * Sends notifications to approvers about an escalated approval request
 * @param approvalRequest The approval request
 * @param refundRequest The refund request
 * @param approvers The approvers to notify
 */
export const notifyApprovers = async (approvalRequest: IApprovalRequest, refundRequest: any, approvers: IApprover[]): Promise<void> => {
  // For each approver:
  for (const approver of approvers) {
    try {
      // Prepare notification context with refund and approval details
      const context = {
        refundId: refundRequest.refundRequestId,
        amount: refundRequest.amount,
        currency: refundRequest.currency,
        approverRole: approver.approverRole,
        escalationLevel: approver.escalationLevel,
        deadline: approvalRequest.escalationDue,
      };

      // Set notification type to APPROVAL_ESCALATED
      const notificationType = 'APPROVAL_ESCALATED';

      // Add estimated completion time information if available
      // TODO: Add estimated completion time information if available

      // Send notification using notificationService.sendNotification
      await notificationService.sendNotification(notificationType, approver.approverId, 'EMAIL', context);

      // Track successful notification in logs
      logger.info(`Sent notification to approver ${approver.approverId} for approval request ${approvalRequest.approvalId}`);

      // Update approver's notifiedAt timestamp
      approver.notifiedAt = new Date();
    } catch (error: any) {
      // Handle and log any notification errors but continue processing
      logger.error(`Failed to send notification to approver ${approver.approverId} for approval request ${approvalRequest.approvalId}: ${error.message}`);
    }
  }
};

/**
 * Determines the final action to take when maximum escalation level is reached
 * @param rules The applicable rules for the approval request
 * @param workflows The applicable workflows for the approval request
 * @returns The final escalation action to take
 */
export const getFinalEscalationAction = (rules: any, workflows: any): string => {
  // Check rules for onTimeout or finalEscalation settings
  for (const rule of rules) {
    if (rule.onTimeout) {
      return rule.onTimeout;
    }
    if (rule.finalEscalation) {
      return rule.finalEscalation;
    }
  }

  // Check workflows for onTimeout or finalEscalation settings
  for (const workflow of workflows) {
    if (workflow.onTimeout) {
      return workflow.onTimeout;
    }
    if (workflow.finalEscalation) {
      return workflow.finalEscalation;
    }
  }

  // Apply priority order (rules take precedence over workflows)
  // Default to NOTIFY_ADMIN if no specific action is configured
  return 'NOTIFY_ADMIN';
};

/**
 * Determines the maximum escalation level from applicable rules and workflows
 * @param rules The applicable rules for the approval request
 * @param workflows The applicable workflows for the approval request
 * @returns The maximum escalation level
 */
export const getMaxEscalationLevel = (rules: any, workflows: any): number => {
  let maxLevel = 0;

  // Check each rule for highest escalation level in approverRoles
  for (const rule of rules) {
    for (const approver of rule.approverRoles) {
      if (approver.escalationLevel > maxLevel) {
        maxLevel = approver.escalationLevel;
      }
    }
  }

  // Check each workflow for highest escalation level in approverRoles
  for (const workflow of workflows) {
    for (const rule of workflow.rules) {
      for (const approver of rule.approverRoles) {
        if (approver.escalationLevel > maxLevel) {
          maxLevel = approver.escalationLevel;
        }
      }
    }
  }

  return maxLevel;
};