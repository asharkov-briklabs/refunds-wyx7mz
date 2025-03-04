import { v4 as uuidv4 } from 'uuid'; // uuid@^9.0.0
import {
  IApprovalRequest,
  IApprover,
  IRefundRequest,
  ApprovalStatus,
} from '../../../common/interfaces/approval.interface';
import { BusinessError } from '../../../common/errors/business-error';
import { ApprovalRule } from '../models/approval-rule.model';
import { ApprovalWorkflow } from '../models/approval-workflow.model';
import approvalRequestRepository from '../../../database/repositories/approval-request.repo';
import notificationService from '../../notification-service';
import { logger } from '../../../common/utils/logger';
import eventEmitter from '../../../common/utils/event-emitter';

/**
 * Creates a new approval request for a refund request
 * @param refundRequest - The refund request to create an approval for
 * @param matchingRules - Array of approval rules that match the refund request
 * @param matchingWorkflows - Array of approval workflows that match the refund request
 * @returns The created approval request
 */
export const createApprovalRequest = async (
  refundRequest: IRefundRequest,
  matchingRules: ApprovalRule[],
  matchingWorkflows: ApprovalWorkflow[]
): Promise<IApprovalRequest> => {
  // Log the creation of a new approval request
  logger.info(`Creating approval request for refund: ${refundRequest.refundRequestId}`);

  // Check if an approval request already exists for this refund
  const existingApprovalRequest = await approvalRequestRepository.findByRefundId(refundRequest.refundRequestId);
  if (existingApprovalRequest) {
    throw new BusinessError(
      'DUPLICATE_REQUEST',
      `Approval request already exists for refund: ${refundRequest.refundRequestId}`
    );
  }

  // Generate unique approval ID using uuidv4
  const approvalId = uuidv4();

  // Determine initial approvers based on matching rules and workflows
  const initialApprovers = determineInitialApprovers(matchingRules, matchingWorkflows);

  // Set initial escalation level to 0
  const escalationLevel = 0;

  // Calculate escalation deadline based on rule/workflow configuration
  const escalationDue = calculateEscalationDeadline(matchingRules, matchingWorkflows, escalationLevel);

  // Create approval request object with status PENDING
  const approvalRequest: IApprovalRequest = {
    approvalId: approvalId,
    refundRequestId: refundRequest.refundRequestId,
    status: ApprovalStatus.PENDING,
    requestDate: new Date(),
    approvers: initialApprovers,
    decisions: [],
    escalationLevel: escalationLevel,
    escalationDue: escalationDue,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Save approval request to database using approvalRequestRepository
  const createdApprovalRequest = await approvalRequestRepository.create(approvalRequest);

  // Emit event for approval.created
  eventEmitter.emit('approval.created', createdApprovalRequest);

  // Notify approvers about the new request
  await notifyApprovers(createdApprovalRequest, refundRequest);

  // Log success
  logger.info(`Approval request created successfully: ${approvalId}`);

  // Return the created approval request
  return createdApprovalRequest;
};

/**
 * Updates an existing approval request with new data
 * @param approvalId - The ID of the approval request to update
 * @param updateData - Partial approval request data to update
 * @returns The updated approval request
 */
export const updateApprovalRequest = async (
  approvalId: string,
  updateData: Partial<IApprovalRequest>
): Promise<IApprovalRequest> => {
  // Find the approval request by ID
  const approvalRequest = await approvalRequestRepository.findById(approvalId);

  // Throw error if approval request not found
  if (!approvalRequest) {
    throw new BusinessError('RESOURCE_NOT_FOUND', `Approval request not found: ${approvalId}`);
  }

  // Update the approval request with new data
  Object.assign(approvalRequest, updateData);

  // Log the update operation
  logger.info(`Updating approval request: ${approvalId}`);

  // Save the updated request to the database
  const updatedApprovalRequest = await approvalRequestRepository.update(approvalRequest);

  // Log success
  logger.info(`Approval request updated successfully: ${approvalId}`);

  // Return the updated approval request
  return updatedApprovalRequest;
};

/**
 * Retrieves an approval request by its ID
 * @param approvalId - The ID of the approval request
 * @returns The approval request if found
 */
export const getApprovalRequest = async (approvalId: string): Promise<IApprovalRequest> => {
  // Call approvalRequestRepository.findById with approvalId
  const approvalRequest = await approvalRequestRepository.findById(approvalId);

  // Throw error if approval request not found
  if (!approvalRequest) {
    throw new BusinessError('RESOURCE_NOT_FOUND', `Approval request not found: ${approvalId}`);
  }

  // Return the found approval request
  return approvalRequest;
};

/**
 * Retrieves an approval request by the associated refund ID
 * @param refundRequestId - The ID of the refund request
 * @returns The approval request if found, null otherwise
 */
export const getApprovalRequestByRefundId = async (refundRequestId: string): Promise<IApprovalRequest | null> => {
  // Call approvalRequestRepository.findByRefundId with refundRequestId
  const approvalRequest = await approvalRequestRepository.findByRefundId(refundRequestId);

  // Return the found approval request or null if not found
  return approvalRequest;
};

/**
 * Sends notifications to approvers about a new or updated approval request
 * @param approvalRequest - The approval request
 * @param refundRequest - The refund request
 */
export const notifyApprovers = async (approvalRequest: IApprovalRequest, refundRequest: IRefundRequest): Promise<void> => {
  // Filter approvers at the current escalation level
  const approvers = approvalRequest.approvers.filter(
    (approver) => approver.escalationLevel === approvalRequest.escalationLevel
  );

  // For each approver, prepare notification context with approval and refund details
  for (const approver of approvers) {
    // Prepare notification context with approval and refund details
    const notificationContext = {
      approverName: approver.approverId, // Replace with actual approver name retrieval logic
      merchantName: refundRequest.merchantId, // Replace with actual merchant name retrieval logic
      refundId: approvalRequest.refundRequestId,
      transactionId: refundRequest.refundRequestId, // Assuming refundRequestId can be used as transactionId
      amount: refundRequest.amount,
      currency: 'USD', // Replace with actual currency from refundRequest
      approvalDeadline: approvalRequest.escalationDue.toISOString(),
      approvalUrl: `https://example.com/approvals/${approvalRequest.approvalId}`, // Replace with actual approval URL
    };

    // Determine notification type (new request or escalation)
    const notificationType =
      approvalRequest.escalationLevel === 0
        ? 'APPROVAL_REQUESTED'
        : 'APPROVAL_REMINDER';

    try {
      // Send notifications through notificationService
      await notificationService.sendNotification(
        notificationType,
        approver.approverId,
        'EMAIL', // Replace with actual channel selection logic
        notificationContext
      );
      logger.info(`Notification sent to approver ${approver.approverId} for approval ${approvalRequest.approvalId}`);
    } catch (error) {
      logger.error(`Error sending notification to approver ${approver.approverId}`, {
        error,
        approvalId: approvalRequest.approvalId,
        approverId: approver.approverId,
      });
    }
  }
};

/**
 * Determines the initial set of approvers based on applicable rules and workflows
 * @param matchingRules - Array of approval rules that match the refund request
 * @param matchingWorkflows - Array of approval workflows that match the refund request
 * @returns Array of initial approvers
 */
export const determineInitialApprovers = (
  matchingRules: ApprovalRule[],
  matchingWorkflows: ApprovalWorkflow[]
): IApprover[] => {
  // Initialize empty set for unique approver roles
  const uniqueApproverRoles = new Set<string>();

  // Collect approver roles from matching rules at escalation level 0
  matchingRules.forEach((rule) => {
    rule.getRequiredApprovers(0).forEach((role) => uniqueApproverRoles.add(role));
  });

  // Collect approver roles from matching workflows at escalation level 0
  matchingWorkflows.forEach((workflow) => {
    workflow.getApproversByLevel(0).forEach((role) => uniqueApproverRoles.add(role));
  });

  // Convert unique roles to IApprover objects with necessary properties
  const initialApprovers: IApprover[] = Array.from(uniqueApproverRoles).map((role) => ({
    id: uuidv4(),
    approvalId: '', // approvalId will be populated when the approval request is created
    approverId: '', // approverId will be populated based on the user assigned to the role
    approverRole: role,
    escalationLevel: 0,
    assignedAt: new Date(),
    notifiedAt: new Date(),
  }));

  return initialApprovers;
};

/**
 * Calculates the deadline for escalation based on rules and workflows
 * @param matchingRules - Array of approval rules that match the refund request
 * @param matchingWorkflows - Array of approval workflows that match the refund request
 * @param escalationLevel - The current escalation level
 * @returns The calculated escalation deadline
 */
export const calculateEscalationDeadline = (
  matchingRules: ApprovalRule[],
  matchingWorkflows: ApprovalWorkflow[],
  escalationLevel: number
): Date => {
  // Create a new Date object for the current time
  let deadline = new Date();

  // Find the shortest escalation time among all matching rules
  let shortestTime = Infinity;
  matchingRules.forEach((rule) => {
    const escalationTime = rule.getEscalationTime(escalationLevel);
    const timeInMinutes = convertToMinutes(escalationTime.time, escalationTime.unit);
    shortestTime = Math.min(shortestTime, timeInMinutes);
  });

  // Find the shortest escalation time among all matching workflows
  matchingWorkflows.forEach((workflow) => {
    const escalationTime = {time: 4, unit: 'HOURS'};//workflow.getEscalationTime(escalationLevel);
    const timeInMinutes = convertToMinutes(escalationTime.time, escalationTime.unit);
    shortestTime = Math.min(shortestTime, timeInMinutes);
  });

  // Use the shortest time overall (rules have priority over workflows)
  if (shortestTime !== Infinity) {
    deadline = new Date(Date.now() + shortestTime * 60 * 1000); // Convert minutes to milliseconds
  } else {
    // If no escalation time is defined, set a default deadline (e.g., 24 hours)
    deadline.setDate(deadline.getDate() + 1);
  }

  return deadline;
};

/**
 * Converts a time duration to minutes based on the specified time unit
 * @param time - Time value
 * @param unit - Time unit (MINUTES, HOURS, DAYS)
 * @returns Equivalent time in minutes
 */
function convertToMinutes(time: number, unit: string): number {
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