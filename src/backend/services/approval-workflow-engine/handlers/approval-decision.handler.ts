// src/backend/services/approval-workflow-engine/handlers/approval-decision.handler.ts
import { v4 as uuidv4 } from 'uuid'; // uuid@^9.0.0
import {
  IApprovalRequest,
  IApprover,
  IApprovalDecision,
  
} from '../../../../common/interfaces/approval.interface';
import { ApprovalStatus } from '../../../../common/enums/approval-status.enum';
import { RefundStatus } from '../../../../common/enums/refund-status.enum';
import { BusinessError } from '../../../../common/errors/business-error';
import approvalRequestRepository from '../../../../database/repositories/approval-request.repo';
import refundRequestService from '../../../refund-request-manager';
import notificationService from '../../../notification-service';
import { logger } from '../../../../common/utils/logger';
import eventEmitter from '../../../../common/utils/event-emitter';
import metrics from '../../../../common/utils/metrics';

/**
 * Records an approval decision (approve/reject) made by an approver and updates related entities
 * @param approvalId 
 * @param decision 
 * @returns The updated approval request with the recorded decision
 */
export const recordApprovalDecision = async (
  approvalId: string,
  decision: IApprovalDecision
): Promise<IApprovalRequest> => {
  // Validate approvalId and decision object are valid
  if (!approvalId) {
    throw new BusinessError('VALIDATION_ERROR', 'Approval ID is required');
  }

  if (!decision || typeof decision !== 'object') {
    throw new BusinessError('VALIDATION_ERROR', 'Decision object is required');
  }

  // Get approval request by ID from approvalRequestRepository
  const approvalRequest = await approvalRequestRepository.findById(approvalId);

  // Verify the approval request exists and is in PENDING status
  if (!approvalRequest) {
    throw new BusinessError('RESOURCE_NOT_FOUND', `Approval request not found with ID: ${approvalId}`);
  }

  if (approvalRequest.status !== ApprovalStatus.PENDING) {
    throw new BusinessError('INVALID_STATE', `Approval request is not in PENDING state: ${approvalRequest.status}`);
  }

  // Validate that the approver is authorized to make a decision on this request
  if (!validateApproverAuthority(decision.approverId, approvalRequest)) {
    throw new BusinessError('PERMISSION_DENIED', 'Approver is not authorized to make this decision');
  }

  // Generate a decision ID if not provided using uuidv4()
  decision.decisionId = decision.decisionId || uuidv4();

  // Set the decidedAt timestamp to current date
  decision.decidedAt = new Date();

  // Add the decision to the approval request using approvalRequestRepository.addDecision
  await approvalRequestRepository.addDecision(approvalId, decision);

  // Determine if the decision is sufficient to approve or reject the request
  const outcome = await processApprovalOutcome(approvalRequest);

  // If approved, update approval status to APPROVED and refund status to PROCESSING
  if (outcome.approved) {
    approvalRequest.status = ApprovalStatus.APPROVED;
    await approvalRequestRepository.update(approvalRequest);
    await updateRefundBasedOnDecision(approvalRequest.refundId, true);
  }

  // If rejected, update approval status to REJECTED and refund status to REJECTED
  if (outcome.status === ApprovalStatus.REJECTED) {
    approvalRequest.status = ApprovalStatus.REJECTED;
    await approvalRequestRepository.update(approvalRequest);
    await updateRefundBasedOnDecision(approvalRequest.refundId, false);
  }

  // Save the updated approval request
  await approvalRequestRepository.update(approvalRequest);

  // Record metrics for approval processing time
  metrics.recordApprovalTime(approvalId, decision.decidedAt.getTime() - approvalRequest.requestDate.getTime());

  // Send appropriate notifications based on the decision outcome
  await sendDecisionNotifications(approvalRequest, decision.decision);

  // Emit approval.updated event with approval status
  eventEmitter.emit('approval.updated', {
    approvalId: approvalRequest.approvalId,
    status: approvalRequest.status,
  });

  // Return the updated approval request
  return approvalRequest;
};

/**
 * Validates that an approver has the authority to make a decision on an approval request
 * @param approverId 
 * @param approvalRequest 
 * @returns True if the approver is authorized, false otherwise
 */
export const validateApproverAuthority = (
  approverId: string,
  approvalRequest: IApprovalRequest
): boolean => {
  // Get the current escalation level from the approval request
  const currentEscalationLevel = approvalRequest.escalationLevel;

  // Filter the approvers list to only include those at the current escalation level
  const authorizedApprovers = approvalRequest.approvers.filter(
    (approver: IApprover) => approver.escalationLevel === currentEscalationLevel
  );

  // Check if the provided approverId matches any of the authorized approvers
  const isAuthorized = authorizedApprovers.some(
    (approver: IApprover) => approver.approverId === approverId
  );

  // Return true if the approver is found in the authorized list, false otherwise
  return isAuthorized;
};

/**
 * Processes the outcome of an approval request based on accumulated decisions
 * @param approvalRequest 
 * @returns The determination of approval status
 */
export const processApprovalOutcome = async (
  approvalRequest: IApprovalRequest
): Promise<{ approved: boolean; status: ApprovalStatus }> => {
  // Filter decisions to only include those from current escalation level
  const currentDecisions = approvalRequest.decisions.filter(
    (decision: IApprovalDecision) => {
      const approver = approvalRequest.approvers.find(
        (a: IApprover) => a.approverId === decision.approverId
      );
      return approver && approver.escalationLevel === approvalRequest.escalationLevel;
    }
  );

  // Count the number of approvals and rejections
  const approvals = currentDecisions.filter((d: IApprovalDecision) => d.decision === 'APPROVED').length;
  const rejections = currentDecisions.filter((d: IApprovalDecision) => d.decision === 'REJECTED').length;

  // If any rejection exists, return {approved: false, status: REJECTED}
  if (rejections > 0) {
    return { approved: false, status: ApprovalStatus.REJECTED };
  }

  // If all required approvers have approved, return {approved: true, status: APPROVED}
  if (approvals === approvalRequest.approvers.filter((a: IApprover) => a.escalationLevel === approvalRequest.escalationLevel).length) {
    return { approved: true, status: ApprovalStatus.APPROVED };
  }

  // Otherwise, return {approved: false, status: PENDING} to indicate decision is still pending
  return { approved: false, status: ApprovalStatus.PENDING };
};

/**
 * Updates the associated refund request based on the approval decision
 * @param refundId 
 * @param approved 
 * @returns No return value
 */
export const updateRefundBasedOnDecision = async (
  refundId: string,
  approved: boolean
): Promise<void> => {
  // Get the refund request using refundRequestService.getRefundRequest()
  const refundRequest = await refundRequestService.getRefundRequest(refundId);

  let newStatus: RefundStatus;
  if (approved) {
    // If approved, update refund status to PROCESSING
    newStatus = RefundStatus.PROCESSING;
  } else {
    // If rejected, update refund status to REJECTED
    newStatus = RefundStatus.REJECTED;
  }

  // Save the updated refund status using refundRequestService.updateRefundStatus()
  await refundRequestService.updateRefundStatus(refundId, newStatus, {
    reason: `Refund ${approved ? 'approved' : 'rejected'} by approver.`,
  });

  // Log the refund status update completion
  logger.info(`Refund status updated to ${newStatus} for refund ID: ${refundId}`);
};

/**
 * Sends notifications about the approval decision to relevant stakeholders
 * @param approvalRequest 
 * @param decision 
 * @returns No return value
 */
export const sendDecisionNotifications = async (
  approvalRequest: IApprovalRequest,
  decision: string
): Promise<void> => {
  // Get refund request details for notification context
  const refundRequestDetails = await refundRequestService.getRefundRequest(approvalRequest.refundId);

  let notificationType: string;
  if (decision === 'APPROVED') {
    // For approval notification, notify the refund requestor
    notificationType = 'APPROVAL_APPROVED';
  } else {
    // For rejection notification, notify the refund requestor and include rejection reason
    notificationType = 'APPROVAL_REJECTED';
  }

  // Format notification with appropriate message and context
  const notificationContext = {
    refundId: approvalRequest.refundId,
    decision: decision,
    // Include other relevant details
  };

  // Send notification through notificationService
  await notificationService.sendNotification(
    notificationType,
    refundRequestDetails.requestorId, // Replace with actual recipient
    'EMAIL', // Replace with actual channel
    notificationContext
  );

  // Log notification success or failure
  logger.info(`Notification sent for approval decision: ${decision} for refund ID: ${approvalRequest.refundId}`);
};