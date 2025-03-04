import { v4 as uuidv4 } from 'uuid'; // uuid@^9.0.0
import {
  IApprovalRequest,
  IApprovalRule,
  IApprovalWorkflow,
  IApprovalDecision,
  IRefundRequest,
  ApprovalStatus,
  IApprover,
} from '../../common/interfaces/approval.interface';
import { RefundStatus } from '../../common/enums/refund-status.enum';
import { BusinessError } from '../../common/errors/business-error';
import { logger } from '../../common/utils/logger';
import eventEmitter from '../../common/utils/event-emitter';
import metrics from '../../common/utils/metrics';
import { ApprovalRule } from './models/approval-rule.model';
import { ApprovalWorkflow } from './models/approval-workflow.model';
import ruleEngine from './rule-engine';
import { createApprovalRequest, updateApprovalRequest, getApprovalRequest, getApprovalRequestByRefundId, recordApprovalDecision, validateApproverAuthority, escalateApprovalRequest, processEscalations } from './handlers';
import { scheduleEscalationCheck } from './escalation-manager';
import refundRequestService from '../refund-request-manager';

const ESCALATION_CHECK_INTERVAL_MINUTES = 5;

/**
 * Service class that manages approval workflows for refund requests
 */
export class ApprovalWorkflowService {
  escalationCheckTimer: NodeJS.Timeout;

  /**
   * Initializes the ApprovalWorkflowService
   */
  constructor() {
    this.initialize();
  }

  /**
   * Initializes the service and starts escalation checking
   */
  initialize(): void {
    this.escalationCheckTimer = scheduleEscalationCheck(ESCALATION_CHECK_INTERVAL_MINUTES);
    logger.info('ApprovalWorkflowService initialized');
  }

  /**
   * Properly shuts down the service, clearing any timers
   */
  shutdown(): void {
    if (this.escalationCheckTimer) {
      clearInterval(this.escalationCheckTimer);
      this.escalationCheckTimer = null;
    }
    logger.info('ApprovalWorkflowService shut down');
  }

  /**
   * Checks if a refund requires approval based on rules and workflows
   * @param refundRequest 
   * @returns Result indicating if approval is required and matching rules/workflows
   */
  async checkRefundRequiresApproval(refundRequest: IRefundRequest): Promise<{ requiresApproval: boolean; matchedRules: any[]; matchedWorkflows: any[]; }> {
    return checkRefundRequiresApproval(refundRequest);
  }

  /**
   * Creates an approval request for a refund
   * @param refundRequest 
   * @param matchedRules 
   * @param matchedWorkflows 
   * @returns The created approval request
   */
  async createRefundApprovalRequest(refundRequest: IRefundRequest, matchedRules: any[], matchedWorkflows: any[]): Promise<IApprovalRequest> {
    return createRefundApprovalRequest(refundRequest, matchedRules, matchedWorkflows);
  }

  /**
   * Records an approval decision
   * @param approvalId 
   * @param approverId 
   * @param decision 
   * @param notes 
   * @returns The updated approval request
   */
  async makeApprovalDecision(approvalId: string, approverId: string, decision: string, notes: string): Promise<IApprovalRequest> {
    return makeApprovalDecision(approvalId, approverId, decision, notes);
  }

  /**
   * Gets details of an approval request
   * @param approvalId 
   * @returns The approval request details
   */
  async getApprovalRequestDetails(approvalId: string): Promise<IApprovalRequest> {
    return getApprovalRequestDetails(approvalId);
  }

  /**
   * Gets approvals for a refund
   * @param refundRequestId 
   * @returns The approval request or null
   */
  async getApprovalsByRefund(refundRequestId: string): Promise<IApprovalRequest | null> {
    return getApprovalsByRefund(refundRequestId);
  }

  /**
   * Lists pending approval requests
   * @param filters 
   * @param pagination 
   * @returns List of approval requests and total count
   */
  async listPendingApprovals(filters: object, pagination: object): Promise<{ approvals: IApprovalRequest[]; total: number; }> {
    return listPendingApprovals(filters, pagination);
  }

  /**
   * Manually escalates an approval request
   * @param approvalId 
   * @param userId 
   * @param reason 
   * @returns The updated approval request
   */
  async manuallyEscalateApproval(approvalId: string, userId: string, reason: string): Promise<IApprovalRequest> {
    return manuallyEscalateApproval(approvalId, userId, reason);
  }

  /**
   * Runs an immediate escalation check
   * @param batchSize 
   * @returns The number of escalated approvals
   */
  async runEscalationCheck(batchSize: number): Promise<number> {
    return runEscalationCheck(batchSize);
  }

  /**
   * Gets metrics about approvals
   * @returns Approval metrics
   */
  async trackApprovalsMetrics(): Promise<object> {
    return trackApprovalsMetrics();
  }
}

// Export a new instance of the ApprovalWorkflowService
const approvalWorkflowService = new ApprovalWorkflowService();

export default approvalWorkflowService;

/**
 * Checks if a refund request requires approval based on configured rules
 * @param refundRequest 
 * @returns Result indicating if approval is required and the matching rules/workflows
 */
async function checkRefundRequiresApproval(refundRequest: IRefundRequest): Promise<{ requiresApproval: boolean; matchedRules: any[]; matchedWorkflows: any[]; }> {
  // Log the start of checking if approval is required
  logger.info(`Checking if approval is required for refund: ${refundRequest.refundRequestId}`);

  // Retrieve applicable approval rules from the repository
  const rules = await approvalRequestRepository.find({}); // TODO: Implement rule retrieval logic

  // Retrieve applicable approval workflows from the repository
  const workflows = await approvalRequestRepository.find({}); // TODO: Implement workflow retrieval logic

  // Use rule engine to evaluate the refund against approval rules
  const { requiresApproval: requiresApprovalFromRules, matchedRules } = ruleEngine.evaluateApprovalRules(refundRequest, rules);

  // Use rule engine to evaluate the refund against approval workflows
  const { requiresApproval: requiresApprovalFromWorkflows, matchedWorkflows, matchedRules: workflowMatchedRules } = ruleEngine.evaluateApprovalWorkflows(refundRequest, workflows);

  // Combine results from both evaluations
  const requiresApproval = requiresApprovalFromRules || requiresApprovalFromWorkflows;
  const allMatchedRules = [...matchedRules, ...workflowMatchedRules];

  // Log the result of the approval check
  logger.info(`Approval required: ${requiresApproval} for refund: ${refundRequest.refundRequestId}`, {
    matchedRuleCount: allMatchedRules.length,
    matchedWorkflowCount: matchedWorkflows.length,
  });

  // Return whether approval is required along with matched rules and workflows
  return { requiresApproval, matchedRules: allMatchedRules, matchedWorkflows };
}

/**
 * Records an approval decision made by an authorized approver
 * @param approvalId 
 * @param approverId 
 * @param decision 
 * @param notes 
 * @returns The updated approval request with the decision recorded
 */
async function makeApprovalDecision(approvalId: string, approverId: string, decision: string, notes: string): Promise<IApprovalRequest> {
  // Log the start of recording an approval decision
  logger.info(`Recording approval decision for approval: ${approvalId}, approver: ${approverId}, decision: ${decision}`);

  // Validate approvalId, approverId, and decision
  if (!approvalId) {
    throw new BusinessError('VALIDATION_ERROR', 'Approval ID is required');
  }
  if (!approverId) {
    throw new BusinessError('VALIDATION_ERROR', 'Approver ID is required');
  }
  if (!decision) {
    throw new BusinessError('VALIDATION_ERROR', 'Decision is required');
  }

  // Create decision object with provided information
  const decisionObject: IApprovalDecision = {
    decisionId: uuidv4(),
    approvalId: approvalId,
    approverId: approverId,
    decision: decision,
    decisionNotes: notes,
    decidedAt: new Date(),
  };

  // Call recordApprovalDecision handler to process the decision
  const updatedApprovalRequest = await recordApprovalDecision(approvalId, decisionObject);

  // Record approval metrics using metrics.recordApprovalTime
  metrics.recordApprovalTime(approvalId, new Date().getTime() - updatedApprovalRequest.requestDate.getTime());

  // Log successful recording of decision
  logger.info(`Successfully recorded decision for approval: ${approvalId}, decision: ${decision}`);

  // Return the updated approval request
  return updatedApprovalRequest;
}

/**
 * Retrieves detailed information about an approval request
 * @param approvalId 
 * @returns The approval request details
 */
async function getApprovalRequestDetails(approvalId: string): Promise<IApprovalRequest> {
  // Log the start of retrieving approval request details
  logger.info(`Retrieving approval request details for approval: ${approvalId}`);

  // Call getApprovalRequest handler to retrieve the approval request
  const approvalRequest = await getApprovalRequest(approvalId);

  // If the request is not found, throw an error
  if (!approvalRequest) {
    throw new BusinessError('RESOURCE_NOT_FOUND', `Approval request not found with ID: ${approvalId}`);
  }

  // Log successful retrieval of approval request details
  logger.info(`Successfully retrieved approval request details for approval: ${approvalId}`);

  // Return the approval request details
  return approvalRequest;
}

/**
 * Retrieves approval requests associated with a specific refund
 * @param refundRequestId 
 * @returns The approval request for the refund, or null if none exists
 */
async function getApprovalsByRefund(refundRequestId: string): Promise<IApprovalRequest | null> {
  // Log the start of retrieving approval request by refund ID
  logger.info(`Retrieving approval request by refund ID: ${refundRequestId}`);

  // Call getApprovalRequestByRefundId handler to retrieve approval requests
  const approvalRequest = await getApprovalRequestByRefundId(refundRequestId);

  // Log successful retrieval of approval request or null if none found
  logger.info(`Successfully retrieved approval request by refund ID: ${refundRequestId}`, {
    approvalId: approvalRequest ? approvalRequest.approvalId : null,
  });

  // Return the found approval request or null if none found
  return approvalRequest;
}

/**
 * Lists approval requests that are pending a decision
 * @param filters 
 * @param pagination 
 * @returns List of pending approval requests and total count
 */
async function listPendingApprovals(filters: object, pagination: object): Promise<{ approvals: IApprovalRequest[]; total: number; }> {
  // Log the start of listing pending approvals
  logger.info('Listing pending approval requests');

  // Set up filters to find approvals with PENDING status
  const statusFilter = { status: ApprovalStatus.PENDING };

  // Add any additional filters provided (by merchant, by approver, by date range)
  const combinedFilters = { ...filters, ...statusFilter };

  // Call approvalRequestRepository.findByFilters to get matching approvals
  const { results: approvals, total } = await approvalRequestRepository.findByFilters(combinedFilters, pagination);

  // Log successful retrieval of pending approvals
  logger.info(`Successfully retrieved ${approvals.length} pending approval requests`);

  // Return the approvals along with total count
  return { approvals, total };
}

/**
 * Manually triggers escalation for an approval request
 * @param approvalId 
 * @param userId 
 * @param reason 
 * @returns The updated approval request after escalation
 */
async function manuallyEscalateApproval(approvalId: string, userId: string, reason: string): Promise<IApprovalRequest> {
  // Log the manual escalation request
  logger.info(`Manually escalating approval request: ${approvalId}, user: ${userId}, reason: ${reason}`);

  // Retrieve the approval request by ID
  const approvalRequest = await getApprovalRequestDetails(approvalId);

  // Verify the approval is in a state that can be escalated (PENDING)
  if (approvalRequest.status !== ApprovalStatus.PENDING) {
    throw new BusinessError('INVALID_STATE', `Approval request is not in PENDING state: ${approvalRequest.status}`);
  }

  // Verify the user has permission to trigger an escalation
  if (!validateApproverAuthority(userId, approvalRequest)) {
    throw new BusinessError('PERMISSION_DENIED', 'User does not have permission to trigger escalation');
  }

  // Call escalateApprovalRequest handler to perform the escalation
  const escalatedApprovalRequest = await escalateApprovalRequest(approvalRequest);

  // Log the manual escalation with reason and user ID
  logger.info(`Manually escalated approval request ${approvalId} by user ${userId}, reason: ${reason}`);

  // Return the updated approval request
  return escalatedApprovalRequest;
}

/**
 * Manually triggers a check for approvals that need escalation
 * @param batchSize 
 * @returns The number of approval requests that were escalated
 */
async function runEscalationCheck(batchSize: number): Promise<number> {
  // Log the manual escalation check request
  logger.info(`Manually running escalation check with batch size: ${batchSize}`);

  // Set default batch size if not provided
  const size = batchSize || 100;

  // Call processEscalations handler with the batch size
  const escalatedCount = await processEscalations(size);

  // Log the number of escalated approvals
  logger.info(`Manually escalated ${escalatedCount} approval requests`);

  // Return the count of escalated approvals
  return escalatedCount;
}

/**
 * Records metrics about approval processes
 */
async function trackApprovalsMetrics(): Promise<object> {
  // Log the request to track approval metrics
  logger.info('Tracking approval metrics');

  // Query repositories for various approval statistics
  const totalApprovals = await approvalRequestRepository.countByStatus(ApprovalStatus.APPROVED);
  const totalRejections = await approvalRequestRepository.countByStatus(ApprovalStatus.REJECTED);
  const averageApprovalTime = await approvalRequestRepository.getAverageApprovalTime(new Date(), new Date());

  // Calculate average approval time
  // Calculate approval/rejection ratios
  // Calculate escalation frequency

  // Return compiled metrics object
  return {
    totalApprovals,
    totalRejections,
    averageApprovalTime,
  };
}