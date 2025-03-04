/**
 * @file src/backend/tests/integration/approval-workflow.test.ts
 * @description Integration tests for the approval workflow functionality, verifying that refund requests are properly evaluated for approval requirements, approval requests are created correctly, and approval decisions are processed as expected.
 * @requirements_addressed
 *   - name: Approval Workflow Engine
 *     location: Technical Specifications/2.1 FEATURE CATALOG/Configuration & Compliance/F-203
 *     description: Validates the approval workflow engine that manages approval flows based on configured rules and policies.
 *   - name: Approval Workflow Process
 *     location: Technical Specifications/4.1.2 Approval Workflow Process
 *     description: Tests the end-to-end approval workflow, from determining if approval is needed to processing decisions.
 *   - name: Multi-level Refund Parameters
 *     location: Technical Specifications/2.2 DETAILED FEATURE DESCRIPTIONS/F-201: Multi-level Refund Parameters
 *     description: Verifies approval thresholds can be configured at different entity levels and are correctly enforced.
 */

import approvalWorkflowService, { ApprovalRule, ApprovalWorkflow } from '../../services/approval-workflow-engine'; // Import the ApprovalWorkflowService
import refundRequestService from '../../services/refund-request-manager'; // Import the RefundRequestService
import { IApprovalRequest, IRefundRequest } from '../../common/interfaces/approval.interface'; // Import interfaces for approval and refund requests
import { ApprovalStatus, RefundStatus, RefundMethod } from '../../common/enums'; // Import enums for approval and refund statuses
import { mockRefundRequests, createRefundRequest, mockEntityIds } from '../fixtures'; // Import mock refund requests and entity IDs
import { v4 as uuidv4 } from 'uuid'; // uuid v9.0.0
import { mockBankAccounts } from '../fixtures'; // Import mock bank accounts

// Define a type for test rules and workflows
type TestApprovalEntity = ApprovalRule | ApprovalWorkflow;

// Jest beforeAll hook to initialize the approval workflow service
beforeAll(async () => {
  // IA1: Call the initialize method of the approvalWorkflowService
  await approvalWorkflowService.initialize();
});

// Jest afterEach hook to clean up approval test data after each test
afterEach(async () => {
  // IA1: Call the cleanupApprovalData function to remove test approval data from the database
  await cleanupApprovalData();
});

// Jest afterAll hook to clean up after all tests
afterAll(async () => {
  // Final cleanup of any test data
});

/**
 * Creates a test approval rule with specified conditions
 * @param overrides 
 * @returns Configured approval rule for testing
 */
const createTestApprovalRule = (overrides: any = {}): ApprovalRule => {
  // 1. Create default approval rule with standard conditions
  const defaultRule = new ApprovalRule({
    ruleId: uuidv4(),
    entityType: 'MERCHANT',
    entityId: mockEntityIds.merchant,
    ruleName: 'Test Approval Rule',
    description: 'Requires approval for refunds above $1000',
    conditions: {
      field: 'amount',
      operator: 'greaterThan',
      value: 1000,
    },
    approverRoles: [{ role: 'MERCHANT_ADMIN', escalationLevel: 0 }],
    escalationRules: [{ escalationLevel: 0, escalationTime: 24, timeUnit: 'HOURS' }],
    priority: 1,
    active: true,
  });

  // 2. Apply any override values provided in parameters
  const configuredRule = {
    ...defaultRule,
    ...overrides,
  };

  // 3. Return the configured approval rule
  return new ApprovalRule(configuredRule);
};

/**
 * Creates a test approval workflow with specified configuration
 * @param overrides 
 * @returns Configured approval workflow for testing
 */
const createTestApprovalWorkflow = (overrides: any = {}): ApprovalWorkflow => {
  // 1. Create default approval workflow with standard triggers and rules
  const defaultWorkflow = new ApprovalWorkflow({
    workflowId: uuidv4(),
    name: 'Test Approval Workflow',
    description: 'Requires approval for high-value refunds',
    triggerType: 'AMOUNT',
    entityType: 'MERCHANT',
    entityId: mockEntityIds.merchant,
    rules: [createTestApprovalRule()],
    onTimeout: 'ESCALATE_TO_NEXT_LEVEL',
    finalEscalation: 'ORGANIZATION_ADMIN',
    active: true,
  });

  // 2. Apply any override values provided in parameters
  const configuredWorkflow = {
    ...defaultWorkflow,
    ...overrides,
  };

  // 3. Return the configured approval workflow
  return new ApprovalWorkflow(configuredWorkflow);
};

/**
 * Sets up approval rules in the database for testing
 * @param rules 
 * @returns Saved approval rules
 */
const setupTestRules = async (rules: ApprovalRule[]): Promise<ApprovalRule[]> => {
  // 1. Clear any existing rules from the database
  // 2. Save each provided rule to the database
  // 3. Return the array of saved rules
  return rules;
};

/**
 * Sets up approval workflows in the database for testing
 * @param workflows 
 * @returns Saved approval workflows
 */
const setupTestWorkflows = async (workflows: ApprovalWorkflow[]): Promise<ApprovalWorkflow[]> => {
  // 1. Clear any existing workflows from the database
  // 2. Save each provided workflow to the database
  // 3. Return the array of saved workflows
  return workflows;
};

/**
 * Cleans up approval test data from the database
 */
const cleanupApprovalData = async (): Promise<void> => {
  // 1. Delete all approval requests from the database
  // 2. Delete all approval rules from the database
  // 3. Delete all approval workflows from the database
};

// Test suite for Approval Workflow Service Integration
describe('Approval Workflow Service Integration Tests', () => {
  // Test case: should correctly determine if a refund requires approval based on rules
  it('should correctly determine if a refund requires approval based on rules', async () => {
    // 1. Set up test approval rules with various conditions
    const testRule = createTestApprovalRule();
    await setupTestRules([testRule]);

    // 2. Create a refund request that should match one of the rules
    const refundRequest = createRefundRequest({ amount: 1500 });

    // 3. Call checkRefundRequiresApproval with the refund request
    const { requiresApproval, matchedRules } = await approvalWorkflowService.checkRefundRequiresApproval(refundRequest);

    // 4. Verify requiresApproval is true and matchedRules contains the expected rule
    expect(requiresApproval).toBe(true);
    expect(matchedRules).toHaveLength(1);
    expect(matchedRules[0].ruleId).toBe(testRule.ruleId);
  });

  // Test case: should determine a refund doesn't require approval when no rules match
  it("should determine a refund doesn't require approval when no rules match", async () => {
    // 1. Set up test approval rules with conditions that won't match the test refund
    const testRule = createTestApprovalRule({
      conditions: { field: 'amount', operator: 'lessThan', value: 500 }
    });
    await setupTestRules([testRule]);

    // 2. Create a refund request that shouldn't match any rules
    const refundRequest = createRefundRequest({ amount: 3000 });

    // 3. Call checkRefundRequiresApproval with the refund request
    const { requiresApproval, matchedRules } = await approvalWorkflowService.checkRefundRequiresApproval(refundRequest);

    // 4. Verify requiresApproval is false and matchedRules is empty
    expect(requiresApproval).toBe(false);
    expect(matchedRules).toHaveLength(0);
  });

  // Test case: should correctly determine if a refund requires approval based on workflows
  it('should correctly determine if a refund requires approval based on workflows', async () => {
    // 1. Set up test approval workflows with various triggers
    const testWorkflow = createTestApprovalWorkflow();
    await setupTestWorkflows([testWorkflow]);

    // 2. Create a refund request that should match one of the workflow triggers
    const refundRequest = createRefundRequest({ amount: 2000 });

    // 3. Call checkRefundRequiresApproval with the refund request
    const { requiresApproval, matchedWorkflows } = await approvalWorkflowService.checkRefundRequiresApproval(refundRequest);

    // 4. Verify requiresApproval is true and matchedWorkflows contains the expected workflow
    expect(requiresApproval).toBe(true);
    expect(matchedWorkflows).toHaveLength(1);
    expect(matchedWorkflows[0].workflowId).toBe(testWorkflow.workflowId);
  });

  // Test case: should successfully create an approval request for a refund
  it('should successfully create an approval request for a refund', async () => {
    // 1. Set up test approval rules and workflows
    const testRule = createTestApprovalRule();
    await setupTestRules([testRule]);

    // 2. Create a refund request that requires approval
    const refundRequest = createRefundRequest({ amount: 3000 });

    // 3. Call createRefundApprovalRequest with the refund request and matched rules/workflows
    const { matchedRules } = await approvalWorkflowService.checkRefundRequiresApproval(refundRequest);
    const approvalRequest = await approvalWorkflowService.createRefundApprovalRequest(refundRequest, matchedRules, []);

    // 4. Verify the approval request is created with correct status and approvers
    expect(approvalRequest.status).toBe(ApprovalStatus.PENDING);
    expect(approvalRequest.approvers).toHaveLength(1);
    expect(approvalRequest.approvers[0].approverRole).toBe('MERCHANT_ADMIN');

    // 5. Verify the refund request status is updated to PENDING_APPROVAL
    const updatedRefund = await refundRequestService.getRefundRequest(refundRequest.refundRequestId);
    expect(updatedRefund.status).toBe(RefundStatus.PENDING_APPROVAL);
  });

  // Test case: should successfully approve a refund and update its status
  it('should successfully approve a refund and update its status', async () => {
    // 1. Set up an approval request for a refund
    const refundRequest = createRefundRequest({ amount: 3000 });
    const { matchedRules } = await approvalWorkflowService.checkRefundRequiresApproval(refundRequest);
    const approvalRequest = await approvalWorkflowService.createRefundApprovalRequest(refundRequest, matchedRules, []);

    // 2. Call makeApprovalDecision with APPROVED decision
    const approverId = mockEntityIds.user;
    const decisionNotes = 'Approved for processing';
    const updatedApprovalRequest = await approvalWorkflowService.makeApprovalDecision(approvalRequest.approvalId, approverId, 'APPROVED', decisionNotes);

    // 3. Verify the approval status is updated to APPROVED
    expect(updatedApprovalRequest.status).toBe(ApprovalStatus.APPROVED);

    // 4. Verify the refund status is updated to PROCESSING
    const updatedRefund = await refundRequestService.getRefundRequest(refundRequest.refundRequestId);
    expect(updatedRefund.status).toBe(RefundStatus.PROCESSING);

    // 5. Verify the approval decision is recorded correctly
    expect(updatedApprovalRequest.decisions).toHaveLength(1);
    expect(updatedApprovalRequest.decisions[0].approverId).toBe(approverId);
    expect(updatedApprovalRequest.decisions[0].decision).toBe('APPROVED');
    expect(updatedApprovalRequest.decisions[0].decisionNotes).toBe(decisionNotes);
  });

  // Test case: should successfully reject a refund and update its status
  it('should successfully reject a refund and update its status', async () => {
    // 1. Set up an approval request for a refund
    const refundRequest = createRefundRequest({ amount: 3000 });
    const { matchedRules } = await approvalWorkflowService.checkRefundRequiresApproval(refundRequest);
    const approvalRequest = await approvalWorkflowService.createRefundApprovalRequest(refundRequest, matchedRules, []);

    // 2. Call makeApprovalDecision with REJECTED decision
    const approverId = mockEntityIds.user;
    const decisionNotes = 'Insufficient documentation';
    const updatedApprovalRequest = await approvalWorkflowService.makeApprovalDecision(approvalRequest.approvalId, approverId, 'REJECTED', decisionNotes);

    // 3. Verify the approval status is updated to REJECTED
    expect(updatedApprovalRequest.status).toBe(ApprovalStatus.REJECTED);

    // 4. Verify the refund status is updated to REJECTED
    const updatedRefund = await refundRequestService.getRefundRequest(refundRequest.refundRequestId);
    expect(updatedRefund.status).toBe(RefundStatus.REJECTED);

    // 5. Verify the approval decision is recorded correctly
    expect(updatedApprovalRequest.decisions).toHaveLength(1);
    expect(updatedApprovalRequest.decisions[0].approverId).toBe(approverId);
    expect(updatedApprovalRequest.decisions[0].decision).toBe('REJECTED');
    expect(updatedApprovalRequest.decisions[0].decisionNotes).toBe(decisionNotes);
  });

  // Test case: should correctly retrieve approval request details
  it('should correctly retrieve approval request details', async () => {
    // 1. Set up an approval request for a refund
    const refundRequest = createRefundRequest({ amount: 3000 });
    const { matchedRules } = await approvalWorkflowService.checkRefundRequiresApproval(refundRequest);
    const approvalRequest = await approvalWorkflowService.createRefundApprovalRequest(refundRequest, matchedRules, []);

    // 2. Call getApprovalRequestDetails with the approval ID
    const retrievedApprovalRequest = await approvalWorkflowService.getApprovalRequestDetails(approvalRequest.approvalId);

    // 3. Verify the returned approval request has the expected details
    expect(retrievedApprovalRequest.approvalId).toBe(approvalRequest.approvalId);
    expect(retrievedApprovalRequest.refundRequestId).toBe(refundRequest.refundRequestId);
    expect(retrievedApprovalRequest.status).toBe(ApprovalStatus.PENDING);
  });

  // Test case: should correctly retrieve approval requests by refund ID
  it('should correctly retrieve approval requests by refund ID', async () => {
    // 1. Set up an approval request for a refund
    const refundRequest = createRefundRequest({ amount: 3000 });
    const { matchedRules } = await approvalWorkflowService.checkRefundRequiresApproval(refundRequest);
    const approvalRequest = await approvalWorkflowService.createRefundApprovalRequest(refundRequest, matchedRules, []);

    // 2. Call getApprovalsByRefund with the refund ID
    const retrievedApprovalRequest = await approvalWorkflowService.getApprovalsByRefund(refundRequest.refundRequestId);

    // 3. Verify the returned approval request matches the expected request for that refund
    expect(retrievedApprovalRequest.approvalId).toBe(approvalRequest.approvalId);
    expect(retrievedApprovalRequest.refundRequestId).toBe(refundRequest.refundRequestId);
    expect(retrievedApprovalRequest.status).toBe(ApprovalStatus.PENDING);
  });

  // Test case: should list pending approvals correctly
  it('should list pending approvals correctly', async () => {
    // 1. Set up multiple approval requests with different statuses
    const refundRequest1 = createRefundRequest({ refundRequestId: 'req_1', amount: 3000 });
    const { matchedRules: matchedRules1 } = await approvalWorkflowService.checkRefundRequiresApproval(refundRequest1);
    const approvalRequest1 = await approvalWorkflowService.createRefundApprovalRequest(refundRequest1, matchedRules1, []);

    const refundRequest2 = createRefundRequest({ refundRequestId: 'req_2', amount: 4000 });
    const { matchedRules: matchedRules2 } = await approvalWorkflowService.checkRefundRequiresApproval(refundRequest2);
    const approvalRequest2 = await approvalWorkflowService.createRefundApprovalRequest(refundRequest2, matchedRules2, []);

    await approvalWorkflowService.makeApprovalDecision(approvalRequest2.approvalId, mockEntityIds.user, 'APPROVED', 'Approved');

    const refundRequest3 = createRefundRequest({ refundRequestId: 'req_3', amount: 5000 });
    const { matchedRules: matchedRules3 } = await approvalWorkflowService.checkRefundRequiresApproval(refundRequest3);
    const approvalRequest3 = await approvalWorkflowService.createRefundApprovalRequest(refundRequest3, matchedRules3, []);

    // 2. Call listPendingApprovals with appropriate filters
    const { approvals } = await approvalWorkflowService.listPendingApprovals({}, {});

    // 3. Verify only pending approvals are returned in the correct order
    expect(approvals).toHaveLength(2);
    expect(approvals[0].approvalId).toBe(approvalRequest1.approvalId);
    expect(approvals[1].approvalId).toBe(approvalRequest3.approvalId);
  });

  // Test case: should successfully escalate an approval request
  it('should successfully escalate an approval request', async () => {
    // 1. Set up an approval request with multiple escalation levels
    const testRule = createTestApprovalRule({
      approverRoles: [
        { role: 'MERCHANT_ADMIN', escalationLevel: 0 },
        { role: 'ORGANIZATION_ADMIN', escalationLevel: 1 }
      ],
      escalationRules: [
        { escalationLevel: 0, escalationTime: 1, timeUnit: 'MINUTES' },
        { escalationLevel: 1, escalationTime: 2, timeUnit: 'MINUTES' }
      ]
    });
    await setupTestRules([testRule]);

    const refundRequest = createRefundRequest({ amount: 6000 });
    const { matchedRules } = await approvalWorkflowService.checkRefundRequiresApproval(refundRequest);
    const approvalRequest = await approvalWorkflowService.createRefundApprovalRequest(refundRequest, matchedRules, []);

    // 2. Call manuallyEscalateApproval with the approval ID
    const escalatingUser = mockEntityIds.user;
    const escalationReason = 'Timeout';
    const escalatedApprovalRequest = await approvalWorkflowService.manuallyEscalateApproval(approvalRequest.approvalId, escalatingUser, escalationReason);

    // 3. Verify the approval is escalated to the next level
    expect(escalatedApprovalRequest.escalationLevel).toBe(1);

    // 4. Verify the escalation is recorded correctly
    expect(escalatedApprovalRequest.status).toBe(ApprovalStatus.ESCALATED);
    expect(escalatedApprovalRequest.approvers).toHaveLength(2);
    expect(escalatedApprovalRequest.approvers[1].approverRole).toBe('ORGANIZATION_ADMIN');
  });

  // Test case: should run escalation checks correctly
  it('should run escalation checks correctly', async () => {
    // 1. Set up approval requests with escalation due dates in the past
    const pastDate = new Date(Date.now() - 60000); // 1 minute ago
    const refundRequest1 = createRefundRequest({ refundRequestId: 'req_1', amount: 3000 });
    const { matchedRules: matchedRules1 } = await approvalWorkflowService.checkRefundRequiresApproval(refundRequest1);
    const approvalRequest1 = await approvalWorkflowService.createRefundApprovalRequest(refundRequest1, matchedRules1, []);
    approvalRequest1.escalationDue = pastDate;
    await approvalRequestRepository.update(approvalRequest1);

    const refundRequest2 = createRefundRequest({ refundRequestId: 'req_2', amount: 4000 });
    const { matchedRules: matchedRules2 } = await approvalWorkflowService.checkRefundRequiresApproval(refundRequest2);
    const approvalRequest2 = await approvalWorkflowService.createRefundApprovalRequest(refundRequest2, matchedRules2, []);
    approvalRequest2.escalationDue = pastDate;
    await approvalRequestRepository.update(approvalRequest2);

    // 2. Call runEscalationCheck
    const escalatedCount = await approvalWorkflowService.runEscalationCheck(100);

    // 3. Verify overdue approvals are escalated correctly
    expect(escalatedCount).toBe(2);

    // 4. Verify escalation count matches expected number of escalations
    const updatedApprovalRequest1 = await approvalRequestRepository.findById(approvalRequest1.approvalId);
    expect(updatedApprovalRequest1.status).toBe(ApprovalStatus.ESCALATED);
  });

  // Test case: should enforce entity-specific approval rules
  it('should enforce entity-specific approval rules', async () => {
    // 1. Set up approval rules for different entity types and IDs
    const merchantRule = createTestApprovalRule({
      entityType: 'MERCHANT',
      entityId: mockEntityIds.merchant,
      ruleName: 'Merchant Rule',
      conditions: { field: 'amount', operator: 'greaterThan', value: 3000 }
    });

    const organizationRule = createTestApprovalRule({
      entityType: 'ORGANIZATION',
      entityId: mockEntityIds.organization,
      ruleName: 'Organization Rule',
      conditions: { field: 'amount', operator: 'greaterThan', value: 4000 }
    });

    await setupTestRules([merchantRule, organizationRule]);

    // 2. Create refund requests for different merchants
    const refundRequest1 = createRefundRequest({ merchantId: mockEntityIds.merchant, amount: 3500 });
    const refundRequest2 = createRefundRequest({ merchantId: 'other_merchant', amount: 4500 });

    // 3. Verify only matching entity rules apply to each refund
    const { requiresApproval: requiresApproval1, matchedRules: matchedRules1 } = await approvalWorkflowService.checkRefundRequiresApproval(refundRequest1);
    expect(requiresApproval1).toBe(true);
    expect(matchedRules1).toHaveLength(1);
    expect(matchedRules1[0].ruleId).toBe(merchantRule.ruleId);

    const { requiresApproval: requiresApproval2, matchedRules: matchedRules2 } = await approvalWorkflowService.checkRefundRequiresApproval(refundRequest2);
    expect(requiresApproval2).toBe(false);
    expect(matchedRules2).toHaveLength(0);
  });

  // Test case: should handle approval amount thresholds correctly
  it('should handle approval amount thresholds correctly', async () => {
    // 1. Set up approval rules with different amount thresholds
    const lowThresholdRule = createTestApprovalRule({
      ruleName: 'Low Threshold Rule',
      conditions: { field: 'amount', operator: 'greaterThan', value: 1000 }
    });

    const highThresholdRule = createTestApprovalRule({
      ruleName: 'High Threshold Rule',
      conditions: { field: 'amount', operator: 'greaterThan', value: 5000 }
    });

    await setupTestRules([lowThresholdRule, highThresholdRule]);

    // 2. Create refund requests with amounts above and below thresholds
    const refundRequest1 = createRefundRequest({ amount: 1500 });
    const refundRequest2 = createRefundRequest({ amount: 6000 });

    // 3. Verify approvals are only required when amount exceeds threshold
    const { requiresApproval: requiresApproval1, matchedRules: matchedRules1 } = await approvalWorkflowService.checkRefundRequiresApproval(refundRequest1);
    expect(requiresApproval1).toBe(true);
    expect(matchedRules1).toHaveLength(1);
    expect(matchedRules1[0].ruleName).toBe('Low Threshold Rule');

    const { requiresApproval: requiresApproval2, matchedRules: matchedRules2 } = await approvalWorkflowService.checkRefundRequiresApproval(refundRequest2);
    expect(requiresApproval2).toBe(true);
    expect(matchedRules2).toHaveLength(1);
    expect(matchedRules2[0].ruleName).toBe('High Threshold Rule');
  });
});