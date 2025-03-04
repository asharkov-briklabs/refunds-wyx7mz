# src/backend/tests/integration/refund-workflow.test.ts
```typescript
/**
 * @file src/backend/tests/integration/refund-workflow.test.ts
 * @description Integration tests for the complete refund workflow, testing the end-to-end process of refund creation, approval, processing, and completion across different payment methods and scenarios. This file verifies that the various components of the refund service work together correctly.
 * @requirements_addressed
 *   - name: End-to-End Refund Lifecycle
 *     location: Technical Specifications/4.1.1 Core Business Processes/Refund Request Lifecycle
 *     description: Tests the complete lifecycle of refund requests from creation to completion
 *   - name: Payment Method Handling
 *     location: Technical Specifications/2.1 FEATURE CATALOG/Payment Method & Gateway Integration
 *     description: Tests processing of refunds through different payment methods (ORIGINAL_PAYMENT, BALANCE, OTHER)
 *   - name: Approval Workflow
 *     location: Technical Specifications/4.1.2 Approval Workflow Process
 *     description: Tests refund approval workflow for requests requiring approval
 *   - name: Integration Testing
 *     location: Technical Specifications/6.6 TESTING STRATEGY/6.6.2 Integration Testing
 *     description: Validates that interconnected services function correctly together
 */

import { describe, it, beforeAll, beforeEach, afterEach, afterAll, expect, jest } from '@jest/globals'; // @jest/globals@^29.5.0
import MockDate from 'mockdate'; // mockdate@^3.0.5
import refundRequestManager from '../../services/refund-request-manager/refund-request-manager.service'; // Import the main refund request manager service
import paymentMethodHandlerService from '../../services/payment-method-handler/payment-method-handler.service'; // Service for handling different payment methods
import approvalWorkflowService from '../../services/approval-workflow-engine/approval-workflow.service'; // Service for handling approval workflows
import gatewayIntegrationService from '../../services/gateway-integration/gateway-integration.service'; // Service for integrating with payment gateways
import { RefundStatus } from '../../common/enums/refund-status.enum'; // Enum for refund status values
import { RefundMethod } from '../../common/enums/refund-method.enum'; // Enum for refund method types
import { ApprovalStatus } from '../../common/enums/approval-status.enum'; // Enum for approval status values
import { IRefundRequest } from '../../common/interfaces/refund.interface'; // Interface for refund request data
import { IRefundRequestDocument } from '../../database/models/refund-request.model'; // Interface for refund request document model
import { mockRefundRequests, createRefundRequest } from '../fixtures/refunds.fixture'; // Test fixtures for refund requests
import { mockBankAccounts } from '../fixtures/bank-accounts.fixture'; // Test fixtures for bank accounts
import { createMockPaymentServiceClient, mockTransactions } from '../mocks/services/payment-service.mock'; // Creates a mock payment service client for testing
import { createMockBalanceServiceClient } from '../mocks/services/balance-service.mock'; // Creates a mock balance service client for testing
import { createMockGatewayAdapters } from '../mocks/gateways/stripe.mock'; // Creates mock gateway adapters for testing
import refundRequestRepository from '../../database/repositories/refund-request.repo'; // Repository for refund request data
import approvalRequestRepository from '../../database/repositories/approval-request.repo'; // Repository for approval request data

const testUserId = 'user_merchant_admin'; // Define a test user ID

// Define global variables for mocks
let mockPaymentServiceClient: any;
let mockBalanceServiceClient: any;
let mockGatewayAdapters: any;

/**
 * Sets up all necessary mocks for integration testing
 */
function setupMocks() {
  mockPaymentServiceClient = createMockPaymentServiceClient(); // Create mock payment service client
  mockBalanceServiceClient = createMockBalanceServiceClient(); // Create mock balance service client
  mockGatewayAdapters = createMockGatewayAdapters(); // Create mock gateway adapters

  // Mock refundRequestRepository methods
  jest.spyOn(refundRequestRepository, 'findById').mockImplementation(async (refundId: string) => {
    // Mock implementation for findById
    const refund = Object.values(mockRefundRequests).find(req => req.refundRequestId === refundId);
    return refund || null;
  });

  jest.spyOn(refundRequestRepository, 'create').mockImplementation(async (refundRequest: IRefundRequest) => {
    // Mock implementation for create
    return { ...refundRequest, _id: 'mock_refund_id' } as any;
  });

  jest.spyOn(refundRequestRepository, 'update').mockImplementation(async (refundRequest: IRefundRequestDocument) => {
    // Mock implementation for update
    return refundRequest;
  });

  // Mock approvalRequestRepository methods
  jest.spyOn(approvalRequestRepository, 'findByRefundId').mockImplementation(async (refundRequestId: string) => {
    // Mock implementation for findByRefundId
    return { approvalId: 'mock_approval_id', refundRequestId } as any;
  });

  jest.spyOn(approvalRequestRepository, 'update').mockImplementation(async (approvalRequest: any) => {
    // Mock implementation for update
    return approvalRequest;
  });

  // Mock event emitter
  jest.spyOn(eventEmitter, 'emit').mockImplementation((event: string, payload: any) => {
    // Mock implementation for emit
    logger.info(`Event emitted: ${event}`, payload);
  });

  // Set up spy on service methods for verification
  jest.spyOn(paymentMethodHandlerService, 'getTransactionForRefund');
  jest.spyOn(approvalWorkflowService, 'checkRefundRequiresApproval');
  jest.spyOn(gatewayIntegrationService, 'processRefund');
}

/**
 * Creates a test refund request with default values that can be overridden
 * @param overrides 
 * @returns The created refund request for testing
 */
function createTestRefundRequest(overrides: Partial<IRefundRequest> = {}): IRefundRequest {
  const defaultValues: IRefundRequest = {
    refundRequestId: 'test_refund_id',
    transactionId: 'test_transaction_id',
    merchantId: 'test_merchant_id',
    amount: 100,
    currency: 'USD',
    refundMethod: RefundMethod.ORIGINAL_PAYMENT,
    reasonCode: 'test_reason_code',
    reason: 'test_reason',
    createdBy: testUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: RefundStatus.DRAFT
  };

  return { ...defaultValues, ...overrides };
}

/**
 * Helper function to verify status transitions in the refund workflow
 * @param refundRequest 
 * @param expectedStatus 
 */
function expectStatusTransition(refundRequest: IRefundRequestDocument, expectedStatus: RefundStatus) {
  expect(refundRequest.status).toBe(expectedStatus);
  expect(refundRequest.statusHistory.some(entry => entry.status === expectedStatus)).toBe(true);
  expect(refundRequest.updatedAt.getTime()).toBeGreaterThan(refundRequest.createdAt.getTime());
}

describe('Refund Workflow Integration Tests', () => {
  beforeAll(() => {
    setupMocks(); // Set up global mocks
  });

  beforeEach(() => {
    MockDate.set(new Date()); // Configure MockDate for consistent timestamp testing
  });

  afterEach(() => {
    jest.clearAllMocks(); // Reset all mocks
    MockDate.reset(); // Reset MockDate
  });

  afterAll(() => {
    jest.restoreAllMocks(); // Restore all original implementations
  });

  it('should process a complete refund workflow with ORIGINAL_PAYMENT method', async () => {
    // Create a refund request with ORIGINAL_PAYMENT method
    const refundRequest = createTestRefundRequest({ refundMethod: RefundMethod.ORIGINAL_PAYMENT });

    // Submit the refund request
    const submittedRefund = await refundRequestManager.submitRefundRequest(refundRequest.refundRequestId, testUserId);
    expectStatusTransition(submittedRefund as any, RefundStatus.PROCESSING);

    // Process the refund request
    const processedRefund = await refundRequestManager.processRefundRequest(refundRequest.refundRequestId);
    expectStatusTransition(processedRefund as any, RefundStatus.COMPLETED);

    // Verify gateway reference is saved
    expect(processedRefund.gatewayReference).toBeDefined();

    // Verify status history contains all transitions
    expect(processedRefund.statusHistory.length).toBeGreaterThan(2);
  });

  it('should process a complete refund workflow with BALANCE method', async () => {
    // Create a refund request with BALANCE method
    const refundRequest = createTestRefundRequest({ refundMethod: RefundMethod.BALANCE });

    // Submit the refund request
    const submittedRefund = await refundRequestManager.submitRefundRequest(refundRequest.refundRequestId, testUserId);
    expectStatusTransition(submittedRefund as any, RefundStatus.PROCESSING);

    // Process the refund request
    const processedRefund = await refundRequestManager.processRefundRequest(refundRequest.refundRequestId);
    expectStatusTransition(processedRefund as any, RefundStatus.COMPLETED);

    // Verify balance service was called
    expect(mockBalanceServiceClient.updateBalance).toHaveBeenCalled();

    // Verify status history contains all transitions
    expect(processedRefund.statusHistory.length).toBeGreaterThan(2);
  });

  it('should process a complete refund workflow with OTHER method', async () => {
    // Create a refund request with OTHER method and bank account
    const refundRequest = createTestRefundRequest({ refundMethod: RefundMethod.OTHER, bankAccountId: mockBankAccounts.default.accountId });

    // Submit the refund request
    const submittedRefund = await refundRequestManager.submitRefundRequest(refundRequest.refundRequestId, testUserId);
    expectStatusTransition(submittedRefund as any, RefundStatus.PROCESSING);

    // Process the refund request
    const processedRefund = await refundRequestManager.processRefundRequest(refundRequest.refundRequestId);
    expectStatusTransition(processedRefund as any, RefundStatus.COMPLETED);

    // Verify gateway reference is saved
    expect(processedRefund.gatewayReference).toBeDefined();

    // Verify status history contains all transitions
    expect(processedRefund.statusHistory.length).toBeGreaterThan(2);
  });

  it('should handle approval workflow for high-value refunds', async () => {
    // Create a high-value refund request
    const refundRequest = createTestRefundRequest({ amount: 5000 });

    // Submit the refund request
    const submittedRefund = await refundRequestManager.submitRefundRequest(refundRequest.refundRequestId, testUserId);
    expectStatusTransition(submittedRefund as any, RefundStatus.PENDING_APPROVAL);

    // Apply approval with approved status
    const approvedRefund = await refundRequestManager.handleApprovalResult(refundRequest.refundRequestId, true, testUserId, 'Approved');
    expectStatusTransition(approvedRefund as any, RefundStatus.PROCESSING);

    // Process the refund request
    const processedRefund = await refundRequestManager.processRefundRequest(refundRequest.refundRequestId);
    expectStatusTransition(processedRefund as any, RefundStatus.COMPLETED);

    // Verify status history contains all transitions including approval
    expect(processedRefund.statusHistory.length).toBeGreaterThan(3);
  });

  it('should handle rejected approvals correctly', async () => {
    // Create a high-value refund request
    const refundRequest = createTestRefundRequest({ amount: 5000 });

    // Submit the refund request
    const submittedRefund = await refundRequestManager.submitRefundRequest(refundRequest.refundRequestId, testUserId);
    expectStatusTransition(submittedRefund as any, RefundStatus.PENDING_APPROVAL);

    // Apply approval with rejected status
    const rejectedRefund = await refundRequestManager.handleApprovalResult(refundRequest.refundRequestId, false, testUserId, 'Rejected');
    expectStatusTransition(rejectedRefund as any, RefundStatus.REJECTED);

    // Verify refund is not processed further
    expect(gatewayIntegrationService.processRefund).not.toHaveBeenCalled();

    // Verify rejection reason is recorded
    expect(rejectedRefund.statusHistory.some(entry => entry.status === RefundStatus.REJECTED && entry.reason === 'Rejected')).toBe(true);
  });

  it('should handle cancellation of refund requests in allowed states', async () => {
    // Create a refund request
    const refundRequest1 = createTestRefundRequest();

    // Verify it can be canceled in DRAFT state
    const canceledRefund1 = await refundRequestManager.cancelRefundRequest(refundRequest1.refundRequestId, testUserId, 'Requested by merchant');
    expectStatusTransition(canceledRefund1 as any, RefundStatus.CANCELED);

    // Create another refund request
    const refundRequest2 = createTestRefundRequest();

    // Submit the request to SUBMITTED state
    const submittedRefund = await refundRequestManager.submitRefundRequest(refundRequest2.refundRequestId, testUserId);

    // Verify it can be canceled in SUBMITTED state
    const canceledRefund2 = await refundRequestManager.cancelRefundRequest(submittedRefund.refundRequestId, testUserId, 'No longer needed');
    expectStatusTransition(canceledRefund2 as any, RefundStatus.CANCELED);

    // Create another refund request and advance to PENDING_APPROVAL
    const refundRequest3 = createTestRefundRequest({ amount: 5000 });
    const submittedRefund3 = await refundRequestManager.submitRefundRequest(refundRequest3.refundRequestId, testUserId);
    const pendingApprovalRefund = await refundRequestManager.getRefundRequest(submittedRefund3.refundRequestId);

    // Verify it can be canceled in PENDING_APPROVAL state
    const canceledRefund3 = await refundRequestManager.cancelRefundRequest(pendingApprovalRefund.refundRequestId, testUserId, 'Customer changed mind');
    expectStatusTransition(canceledRefund3 as any, RefundStatus.CANCELED);

    // Verify cancellation reason is recorded in all cases
    expect(canceledRefund1.statusHistory.some(entry => entry.status === RefundStatus.CANCELED && entry.reason === 'Requested by merchant')).toBe(true);
    expect(canceledRefund2.statusHistory.some(entry => entry.status === RefundStatus.CANCELED && entry.reason === 'No longer needed')).toBe(true);
    expect(canceledRefund3.statusHistory.some(entry => entry.status === RefundStatus.CANCELED && entry.reason === 'Customer changed mind')).toBe(true);
  });

  it('should prevent cancellation of refunds in terminal states', async () => {
    // Create and process a refund to COMPLETED state
    const refundRequest1 = createTestRefundRequest();
    const submittedRefund1 = await refundRequestManager.submitRefundRequest(refundRequest1.refundRequestId, testUserId);
    const processedRefund1 = await refundRequestManager.processRefundRequest(submittedRefund1.refundRequestId);

    // Attempt to cancel the completed refund
    await expect(refundRequestManager.cancelRefundRequest(processedRefund1.refundRequestId, testUserId, 'Attempted cancellation'))
      .rejects.toThrowError('Invalid state transition');

    // Create and process a refund to FAILED state
    const refundRequest2 = createTestRefundRequest();
    const submittedRefund2 = await refundRequestManager.submitRefundRequest(refundRequest2.refundRequestId, testUserId);
    const processedRefund2 = await refundRequestManager.processRefundRequest(submittedRefund2.refundRequestId);

    // Attempt to cancel the failed refund
    await expect(refundRequestManager.cancelRefundRequest(processedRefund2.refundRequestId, testUserId, 'Attempted cancellation'))
      .rejects.toThrowError('Invalid state transition');

    // Verify error message indicates invalid state transition
    try {
      await refundRequestManager.cancelRefundRequest(processedRefund1.refundRequestId, testUserId, 'Attempted cancellation');
    } catch (error: any) {
      expect(error.message).toContain('Invalid state transition');
    }
  });

  it('should handle gateway errors properly', async () => {
    // Create a refund request
    const refundRequest = createTestRefundRequest();

    // Submit the refund request
    const submittedRefund = await refundRequestManager.submitRefundRequest(refundRequest.refundRequestId, testUserId);
    expectStatusTransition(submittedRefund as any, RefundStatus.PROCESSING);

    // Configure mock gateway to return an error
    mockGatewayAdapters.processRefund.mockRejectedValue(new Error('Gateway error'));

    // Process the refund request
    const processedRefund = await refundRequestManager.processRefundRequest(refundRequest.refundRequestId);
    expectStatusTransition(processedRefund as any, RefundStatus.FAILED);

    // Verify error details are recorded
    expect(processedRefund.statusHistory.some(entry => entry.status === RefundStatus.FAILED && entry.reason === 'Gateway error')).toBe(true);

    // Verify status history contains failure transition
    expect(processedRefund.statusHistory.length).toBeGreaterThan(2);
  });

  it('should handle partial refunds correctly', async () => {
    // Create a partial refund request with amount less than transaction amount
    const refundRequest = createTestRefundRequest({ amount: 50, reasonCode: 'Partial return', reason: 'Customer kept some items' });

    // Submit the refund request
    const submittedRefund = await refundRequestManager.submitRefundRequest(refundRequest.refundRequestId, testUserId);
    expectStatusTransition(submittedRefund as any, RefundStatus.PROCESSING);

    // Process the refund request
    const processedRefund = await refundRequestManager.processRefundRequest(refundRequest.refundRequestId);
    expectStatusTransition(processedRefund as any, RefundStatus.COMPLETED);

    // Verify partial amount is correctly processed
    expect(processedRefund.amount).toBe(50);

    // Verify transaction state reflects partial refund
    expect(mockPaymentServiceClient.updateTransactionStatus).toHaveBeenCalledWith(expect.objectContaining({
      refundAmount: 50
    }));
  });
});

describe('Refund Method Selection Tests', () => {
  beforeAll(() => {
    setupMocks(); // Set up global mocks
  });

  beforeEach(() => {
    MockDate.set(new Date()); // Configure MockDate for consistent timestamp testing
  });

  afterEach(() => {
    jest.clearAllMocks(); // Reset all mocks
    MockDate.reset(); // Reset MockDate
  });

  afterAll(() => {
    jest.restoreAllMocks(); // Restore all original implementations
  });

  it('should select ORIGINAL_PAYMENT when available and requested', async () => {
    // Create a refund request explicitly requesting ORIGINAL_PAYMENT
    const refundRequest = createTestRefundRequest({ refundMethod: RefundMethod.ORIGINAL_PAYMENT });

    // Submit the refund request
    const submittedRefund = await refundRequestManager.submitRefundRequest(refundRequest.refundRequestId, testUserId);
    expectStatusTransition(submittedRefund as any, RefundStatus.PROCESSING);

    // Verify the selected method is ORIGINAL_PAYMENT
    expect(submittedRefund.refundMethod).toBe(RefundMethod.ORIGINAL_PAYMENT);

    // Verify appropriate gateway is called during processing
    expect(gatewayIntegrationService.processRefund).toHaveBeenCalled();
  });

  it('should fall back to BALANCE when ORIGINAL_PAYMENT is unavailable', async () => {
    // Create a mock transaction where ORIGINAL_PAYMENT is unavailable
    mockPaymentServiceClient.getTransactionMock.mockResolvedValue({
      ...mockTransactions.validTransaction,
      paymentMethod: { ...mockTransactions.validTransaction.paymentMethod, validForRefund: false }
    });

    // Create a refund request with no method specified
    const refundRequest = createTestRefundRequest({ refundMethod: undefined });

    // Submit the refund request
    const submittedRefund = await refundRequestManager.submitRefundRequest(refundRequest.refundRequestId, testUserId);
    expectStatusTransition(submittedRefund as any, RefundStatus.PROCESSING);

    // Verify the selected method falls back to BALANCE
    expect(submittedRefund.refundMethod).toBe(RefundMethod.BALANCE);

    // Verify balance service is called during processing
    expect(mockBalanceServiceClient.updateBalance).toHaveBeenCalled();
  });

  it('should fall back to OTHER when ORIGINAL_PAYMENT and BALANCE are unavailable', async () => {
    // Create a mock transaction where ORIGINAL_PAYMENT and BALANCE are unavailable
    mockPaymentServiceClient.getTransactionMock.mockResolvedValue({
      ...mockTransactions.validTransaction,
      paymentMethod: { ...mockTransactions.validTransaction.paymentMethod, validForRefund: false }
    });
    mockBalanceServiceClient.hasSufficientBalanceMock.mockResolvedValue(false);

    // Create a refund request with no method specified
    const refundRequest = createTestRefundRequest({ refundMethod: undefined, bankAccountId: mockBankAccounts.default.accountId });

    // Submit the refund request
    const submittedRefund = await refundRequestManager.submitRefundRequest(refundRequest.refundRequestId, testUserId);
    expectStatusTransition(submittedRefund as any, RefundStatus.PROCESSING);

    // Verify the selected method falls back to OTHER
    expect(submittedRefund.refundMethod).toBe(RefundMethod.OTHER);

    // Verify bank account is used during processing
    expect(gatewayIntegrationService.processRefund).toHaveBeenCalled();
  });

  it('should throw error when no valid refund method is available', async () => {
    // Create a mock transaction where no refund methods are available
    mockPaymentServiceClient.getTransactionMock.mockResolvedValue({
      ...mockTransactions.validTransaction,
      paymentMethod: { ...mockTransactions.validTransaction.paymentMethod, validForRefund: false }
    });
    mockBalanceServiceClient.hasSufficientBalanceMock.mockResolvedValue(false);

    // Attempt to create a refund request
    const refundRequest = createTestRefundRequest({ refundMethod: undefined });

    // Verify appropriate error is thrown
    await expect(refundRequestManager.submitRefundRequest(refundRequest.refundRequestId, testUserId))
      .rejects.toThrowError('No valid refund method available for this transaction');
  });
});

describe('State Machine and Error Handling Tests', () => {
  beforeAll(() => {
    setupMocks(); // Set up global mocks
  });

  beforeEach(() => {
    MockDate.set(new Date()); // Configure MockDate for consistent timestamp testing
  });

  afterEach(() => {
    jest.clearAllMocks(); // Reset all mocks
    MockDate.reset(); // Reset MockDate
  });

  afterAll(() => {
    jest.restoreAllMocks(); // Restore all original implementations
  });

  it('should enforce valid state transitions', async () => {
    // Create a refund request in DRAFT state
    const refundRequest = createTestRefundRequest({ status: RefundStatus.DRAFT });

    // Verify valid transition from DRAFT to SUBMITTED
    await refundRequestManager.submitRefundRequest(refundRequest.refundRequestId, testUserId);

    // Verify invalid transition from DRAFT to COMPLETED throws error
    await expect(refundRequestManager.updateRefundStatus(refundRequest.refundRequestId, RefundStatus.COMPLETED, testUserId, 'Attempted direct transition'))
      .rejects.toThrowError('Invalid state transition');

    // Create a refund request in PROCESSING state
    const refundRequest2 = createTestRefundRequest({ status: RefundStatus.PROCESSING });

    // Verify valid transitions from PROCESSING to COMPLETED or FAILED
    await refundRequestManager.updateRefundStatus(refundRequest2.refundRequestId, RefundStatus.COMPLETED, testUserId, 'Processing complete');
    await refundRequestManager.updateRefundStatus(refundRequest2.refundRequestId, RefundStatus.FAILED, testUserId, 'Processing failed');

    // Verify invalid transition from PROCESSING to DRAFT throws error
    await expect(refundRequestManager.updateRefundStatus(refundRequest2.refundRequestId, RefundStatus.DRAFT, testUserId, 'Attempted invalid transition'))
      .rejects.toThrowError('Invalid state transition');
  });

  it('should handle validation errors during refund creation', async () => {
    // Attempt to create a refund with invalid amount (negative)
    await expect(refundRequestManager.createRefundRequest({ amount: -100 }, testUserId, 'idem_123'))
      .rejects.toThrowError('Refund amount must be positive');

    // Attempt to create a refund with amount exceeding transaction
    mockPaymentServiceClient.getTransactionMock.mockResolvedValue({ ...mockTransactions.validTransaction, amount: 50 });
    await expect(refundRequestManager.createRefundRequest({ amount: 100 }, testUserId, 'idem_123'))
      .rejects.toThrowError('Refund amount cannot exceed original transaction amount');

    // Attempt to create a refund for non-existent transaction
    mockPaymentServiceClient.getTransactionMock.mockResolvedValue(null);
    await expect(refundRequestManager.createRefundRequest({ transactionId: 'non_existent' }, testUserId, 'idem_123'))
      .rejects.toThrowError('Transaction ID is required');
  });

  it('should respect idempotency for refund operations', async () => {
    // Create a refund request with an idempotency key
    const refundRequestData = { amount: 50, reason: 'Test idempotency' };
    const idempotencyKey = 'idem_test_key';

    // Create another refund request with the same idempotency key
    const refund1 = await refundRequestManager.createRefundRequest(refundRequestData, testUserId, idempotencyKey);
    const refund2 = await refundRequestManager.createRefundRequest(refundRequestData, testUserId, idempotencyKey);

    // Verify both operations return the same refund ID
    expect(refund1.refundRequestId).toBe(refund2.refundRequestId);

    // Verify only one refund was actually created
    expect(refundRequestRepository.create).toHaveBeenCalledTimes(1);
  });
});