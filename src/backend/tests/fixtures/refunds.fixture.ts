import { RefundStatus } from '../../../common/enums/refund-status.enum';
import { RefundMethod } from '../../../common/enums/refund-method.enum';
import { ApprovalStatus } from '../../../common/enums/approval-status.enum';
import { 
  IRefundRequestDocument, 
  IStatusHistoryEntry 
} from '../../../database/models/refund-request.model';
import { mockBankAccounts } from './bank-accounts.fixture';

/**
 * Creates a status history entry for refund request fixtures
 * 
 * @param status The refund status
 * @param timestamp The timestamp of the status change
 * @param changedBy The user or system that changed the status
 * @param reason Optional reason for the status change
 * @returns A status history entry object
 */
export function createStatusHistoryEntry(
  status: RefundStatus,
  timestamp: Date,
  changedBy: string,
  reason?: string
): IStatusHistoryEntry {
  return {
    status,
    timestamp,
    changedBy,
    reason
  };
}

/**
 * Creates a customized refund request fixture with default values that can be overridden
 * 
 * @param overrides Properties to override in the default refund request
 * @returns A mock refund request object for testing
 */
export function createRefundRequest(overrides: Partial<IRefundRequestDocument> = {}): IRefundRequestDocument {
  const defaults = {
    refundRequestId: 'req_001_draft',
    transactionId: mockEntityIds.transaction,
    merchantId: mockEntityIds.merchant,
    customerId: mockEntityIds.customer,
    amount: 99.99,
    currency: 'USD',
    refundMethod: RefundMethod.ORIGINAL_PAYMENT,
    reasonCode: 'CUSTOMER_REQUEST',
    reason: 'Customer changed their mind',
    bankAccountId: null,
    status: RefundStatus.DRAFT,
    createdBy: mockEntityIds.user,
    createdAt: new Date('2023-05-15T10:00:00Z'),
    updatedAt: new Date('2023-05-15T10:00:00Z'),
    submitedAt: null,
    processedAt: null,
    completedAt: null,
    approvalId: null,
    gatewayReference: null,
    statusHistory: [
      {
        status: RefundStatus.DRAFT,
        timestamp: new Date('2023-05-15T10:00:00Z'),
        changedBy: mockEntityIds.user,
        reason: 'Initial creation'
      }
    ],
    supportingDocuments: [],
    metadata: {}
  } as unknown as IRefundRequestDocument;

  return {
    ...defaults,
    ...overrides
  };
}

/**
 * Common entity IDs used across refund fixtures
 */
export const mockEntityIds = {
  merchant: 'mer_67890',
  customer: 'cus_54321',
  transaction: 'txn_12345',
  user: 'user_merchant_admin',
  approval: 'apr_12345'
};

/**
 * Collection of pre-configured mock refund request objects for various test scenarios
 */
export const mockRefundRequests = {
  // Status-based fixtures
  draft: createRefundRequest({
    refundRequestId: 'req_001_draft',
    status: RefundStatus.DRAFT
  }),
  
  submitted: createRefundRequest({
    refundRequestId: 'req_002_submitted',
    status: RefundStatus.SUBMITTED,
    submitedAt: new Date('2023-05-15T10:05:00Z'),
    updatedAt: new Date('2023-05-15T10:05:00Z'),
    statusHistory: [
      createStatusHistoryEntry(
        RefundStatus.DRAFT,
        new Date('2023-05-15T10:00:00Z'),
        mockEntityIds.user,
        'Initial creation'
      ),
      createStatusHistoryEntry(
        RefundStatus.SUBMITTED,
        new Date('2023-05-15T10:05:00Z'),
        mockEntityIds.user,
        'Submitted for processing'
      )
    ]
  }),
  
  pendingApproval: createRefundRequest({
    refundRequestId: 'req_003_pending_approval',
    status: RefundStatus.PENDING_APPROVAL,
    amount: 1299.99, // Higher amount to trigger approval
    submitedAt: new Date('2023-05-15T10:05:00Z'),
    updatedAt: new Date('2023-05-15T10:07:00Z'),
    approvalId: mockEntityIds.approval,
    statusHistory: [
      createStatusHistoryEntry(
        RefundStatus.DRAFT,
        new Date('2023-05-15T10:00:00Z'),
        mockEntityIds.user,
        'Initial creation'
      ),
      createStatusHistoryEntry(
        RefundStatus.SUBMITTED,
        new Date('2023-05-15T10:05:00Z'),
        mockEntityIds.user,
        'Submitted for processing'
      ),
      createStatusHistoryEntry(
        RefundStatus.PENDING_APPROVAL,
        new Date('2023-05-15T10:07:00Z'),
        'system',
        'Amount exceeds approval threshold'
      )
    ],
    metadata: {
      approvalDetails: {
        requiredApprovers: ['MERCHANT_ADMIN', 'ORGANIZATION_ADMIN'],
        currentLevel: 0
      }
    }
  }),
  
  processing: createRefundRequest({
    refundRequestId: 'req_004_processing',
    status: RefundStatus.PROCESSING,
    submitedAt: new Date('2023-05-15T10:05:00Z'),
    processedAt: new Date('2023-05-15T10:10:00Z'),
    updatedAt: new Date('2023-05-15T10:10:00Z'),
    statusHistory: [
      createStatusHistoryEntry(
        RefundStatus.DRAFT,
        new Date('2023-05-15T10:00:00Z'),
        mockEntityIds.user,
        'Initial creation'
      ),
      createStatusHistoryEntry(
        RefundStatus.SUBMITTED,
        new Date('2023-05-15T10:05:00Z'),
        mockEntityIds.user,
        'Submitted for processing'
      ),
      createStatusHistoryEntry(
        RefundStatus.PROCESSING,
        new Date('2023-05-15T10:10:00Z'),
        'system',
        'Processing with payment gateway'
      )
    ]
  }),
  
  completed: createRefundRequest({
    refundRequestId: 'req_005_completed',
    status: RefundStatus.COMPLETED,
    submitedAt: new Date('2023-05-15T10:05:00Z'),
    processedAt: new Date('2023-05-15T10:10:00Z'),
    completedAt: new Date('2023-05-15T10:15:00Z'),
    updatedAt: new Date('2023-05-15T10:15:00Z'),
    gatewayReference: 're_1234567890',
    statusHistory: [
      createStatusHistoryEntry(
        RefundStatus.DRAFT,
        new Date('2023-05-15T10:00:00Z'),
        mockEntityIds.user,
        'Initial creation'
      ),
      createStatusHistoryEntry(
        RefundStatus.SUBMITTED,
        new Date('2023-05-15T10:05:00Z'),
        mockEntityIds.user,
        'Submitted for processing'
      ),
      createStatusHistoryEntry(
        RefundStatus.PROCESSING,
        new Date('2023-05-15T10:10:00Z'),
        'system',
        'Processing with payment gateway'
      ),
      createStatusHistoryEntry(
        RefundStatus.COMPLETED,
        new Date('2023-05-15T10:15:00Z'),
        'system',
        'Successfully processed by gateway'
      )
    ],
    metadata: {
      gatewayResponse: {
        processingTime: '5000ms',
        success: true
      }
    }
  }),
  
  failed: createRefundRequest({
    refundRequestId: 'req_006_failed',
    status: RefundStatus.FAILED,
    submitedAt: new Date('2023-05-15T10:05:00Z'),
    processedAt: new Date('2023-05-15T10:10:00Z'),
    updatedAt: new Date('2023-05-15T10:15:00Z'),
    statusHistory: [
      createStatusHistoryEntry(
        RefundStatus.DRAFT,
        new Date('2023-05-15T10:00:00Z'),
        mockEntityIds.user,
        'Initial creation'
      ),
      createStatusHistoryEntry(
        RefundStatus.SUBMITTED,
        new Date('2023-05-15T10:05:00Z'),
        mockEntityIds.user,
        'Submitted for processing'
      ),
      createStatusHistoryEntry(
        RefundStatus.PROCESSING,
        new Date('2023-05-15T10:10:00Z'),
        'system',
        'Processing with payment gateway'
      ),
      createStatusHistoryEntry(
        RefundStatus.FAILED,
        new Date('2023-05-15T10:15:00Z'),
        'system',
        'Gateway rejected the refund'
      )
    ],
    metadata: {
      error: {
        code: 'CARD_DECLINED',
        message: 'The card issuer declined the refund',
        gatewaySpecific: {
          decline_code: 'card_declined'
        }
      }
    }
  }),
  
  rejected: createRefundRequest({
    refundRequestId: 'req_007_rejected',
    status: RefundStatus.REJECTED,
    amount: 1299.99,
    submitedAt: new Date('2023-05-15T10:05:00Z'),
    updatedAt: new Date('2023-05-15T11:00:00Z'),
    approvalId: mockEntityIds.approval,
    statusHistory: [
      createStatusHistoryEntry(
        RefundStatus.DRAFT,
        new Date('2023-05-15T10:00:00Z'),
        mockEntityIds.user,
        'Initial creation'
      ),
      createStatusHistoryEntry(
        RefundStatus.SUBMITTED,
        new Date('2023-05-15T10:05:00Z'),
        mockEntityIds.user,
        'Submitted for processing'
      ),
      createStatusHistoryEntry(
        RefundStatus.PENDING_APPROVAL,
        new Date('2023-05-15T10:07:00Z'),
        'system',
        'Amount exceeds approval threshold'
      ),
      createStatusHistoryEntry(
        RefundStatus.REJECTED,
        new Date('2023-05-15T11:00:00Z'),
        'user_organization_admin',
        'Insufficient documentation for high-value refund'
      )
    ],
    metadata: {
      approvalDetails: {
        requiredApprovers: ['MERCHANT_ADMIN', 'ORGANIZATION_ADMIN'],
        currentLevel: 1,
        rejectedBy: 'user_organization_admin',
        rejectionReason: 'Insufficient documentation for high-value refund'
      }
    }
  }),
  
  canceled: createRefundRequest({
    refundRequestId: 'req_008_canceled',
    status: RefundStatus.CANCELED,
    submitedAt: new Date('2023-05-15T10:05:00Z'),
    updatedAt: new Date('2023-05-15T10:20:00Z'),
    statusHistory: [
      createStatusHistoryEntry(
        RefundStatus.DRAFT,
        new Date('2023-05-15T10:00:00Z'),
        mockEntityIds.user,
        'Initial creation'
      ),
      createStatusHistoryEntry(
        RefundStatus.SUBMITTED,
        new Date('2023-05-15T10:05:00Z'),
        mockEntityIds.user,
        'Submitted for processing'
      ),
      createStatusHistoryEntry(
        RefundStatus.CANCELED,
        new Date('2023-05-15T10:20:00Z'),
        mockEntityIds.user,
        'Merchant canceled the refund request'
      )
    ]
  }),
  
  // Payment method fixtures
  originalPaymentMethod: createRefundRequest({
    refundRequestId: 'req_009_original_payment',
    status: RefundStatus.COMPLETED,
    refundMethod: RefundMethod.ORIGINAL_PAYMENT,
    submitedAt: new Date('2023-05-15T10:05:00Z'),
    processedAt: new Date('2023-05-15T10:10:00Z'),
    completedAt: new Date('2023-05-15T10:15:00Z'),
    updatedAt: new Date('2023-05-15T10:15:00Z'),
    gatewayReference: 're_1234567890',
    statusHistory: [
      createStatusHistoryEntry(
        RefundStatus.DRAFT,
        new Date('2023-05-15T10:00:00Z'),
        mockEntityIds.user,
        'Initial creation'
      ),
      createStatusHistoryEntry(
        RefundStatus.SUBMITTED,
        new Date('2023-05-15T10:05:00Z'),
        mockEntityIds.user,
        'Submitted for processing'
      ),
      createStatusHistoryEntry(
        RefundStatus.PROCESSING,
        new Date('2023-05-15T10:10:00Z'),
        'system',
        'Processing with payment gateway'
      ),
      createStatusHistoryEntry(
        RefundStatus.COMPLETED,
        new Date('2023-05-15T10:15:00Z'),
        'system',
        'Successfully processed by gateway'
      )
    ],
    metadata: {
      paymentMethod: {
        type: 'CREDIT_CARD',
        last4: '4242',
        brand: 'visa'
      }
    }
  }),
  
  balanceMethod: createRefundRequest({
    refundRequestId: 'req_010_balance',
    status: RefundStatus.COMPLETED,
    refundMethod: RefundMethod.BALANCE,
    submitedAt: new Date('2023-05-15T10:05:00Z'),
    processedAt: new Date('2023-05-15T10:10:00Z'),
    completedAt: new Date('2023-05-15T10:15:00Z'),
    updatedAt: new Date('2023-05-15T10:15:00Z'),
    statusHistory: [
      createStatusHistoryEntry(
        RefundStatus.DRAFT,
        new Date('2023-05-15T10:00:00Z'),
        mockEntityIds.user,
        'Initial creation'
      ),
      createStatusHistoryEntry(
        RefundStatus.SUBMITTED,
        new Date('2023-05-15T10:05:00Z'),
        mockEntityIds.user,
        'Submitted for processing'
      ),
      createStatusHistoryEntry(
        RefundStatus.PROCESSING,
        new Date('2023-05-15T10:10:00Z'),
        'system',
        'Processing with merchant balance'
      ),
      createStatusHistoryEntry(
        RefundStatus.COMPLETED,
        new Date('2023-05-15T10:15:00Z'),
        'system',
        'Successfully processed from merchant balance'
      )
    ],
    metadata: {
      balanceDetails: {
        previousBalance: 5000.00,
        newBalance: 4900.01
      }
    }
  }),
  
  otherMethod: createRefundRequest({
    refundRequestId: 'req_011_other',
    status: RefundStatus.COMPLETED,
    refundMethod: RefundMethod.OTHER,
    bankAccountId: 'ba_002_default',
    submitedAt: new Date('2023-05-15T10:05:00Z'),
    processedAt: new Date('2023-05-15T10:10:00Z'),
    completedAt: new Date('2023-05-15T10:15:00Z'),
    updatedAt: new Date('2023-05-15T10:15:00Z'),
    gatewayReference: 'ach_1234567890',
    statusHistory: [
      createStatusHistoryEntry(
        RefundStatus.DRAFT,
        new Date('2023-05-15T10:00:00Z'),
        mockEntityIds.user,
        'Initial creation'
      ),
      createStatusHistoryEntry(
        RefundStatus.SUBMITTED,
        new Date('2023-05-15T10:05:00Z'),
        mockEntityIds.user,
        'Submitted for processing'
      ),
      createStatusHistoryEntry(
        RefundStatus.PROCESSING,
        new Date('2023-05-15T10:10:00Z'),
        'system',
        'Processing with bank account transfer'
      ),
      createStatusHistoryEntry(
        RefundStatus.COMPLETED,
        new Date('2023-05-15T10:15:00Z'),
        'system',
        'Successfully processed via bank account'
      )
    ],
    metadata: {
      bankAccountDetails: {
        accountId: 'ba_002_default',
        accountType: 'CHECKING',
        last4: '4567'
      }
    }
  }),
  
  // Special case fixtures
  highAmount: createRefundRequest({
    refundRequestId: 'req_012_high_amount',
    status: RefundStatus.PENDING_APPROVAL,
    amount: 4999.99,
    submitedAt: new Date('2023-05-15T10:05:00Z'),
    updatedAt: new Date('2023-05-15T10:07:00Z'),
    approvalId: 'apr_54321',
    statusHistory: [
      createStatusHistoryEntry(
        RefundStatus.DRAFT,
        new Date('2023-05-15T10:00:00Z'),
        mockEntityIds.user,
        'Initial creation'
      ),
      createStatusHistoryEntry(
        RefundStatus.SUBMITTED,
        new Date('2023-05-15T10:05:00Z'),
        mockEntityIds.user,
        'Submitted for processing'
      ),
      createStatusHistoryEntry(
        RefundStatus.PENDING_APPROVAL,
        new Date('2023-05-15T10:07:00Z'),
        'system',
        'Amount exceeds approval threshold'
      )
    ],
    supportingDocuments: [
      {
        documentId: 'doc_12345',
        documentType: 'CUSTOMER_EMAIL',
        uploadedAt: new Date('2023-05-15T10:03:00Z'),
        url: 'https://storage.example.com/documents/doc_12345',
        uploadedBy: mockEntityIds.user
      }
    ],
    metadata: {
      approvalDetails: {
        requiredApprovers: ['MERCHANT_ADMIN', 'ORGANIZATION_ADMIN', 'BANK_ADMIN'],
        currentLevel: 0
      }
    }
  }),
  
  partialRefund: createRefundRequest({
    refundRequestId: 'req_013_partial',
    status: RefundStatus.COMPLETED,
    amount: 49.99, // Partial refund amount
    reasonCode: 'PARTIAL_RETURN',
    reason: 'Customer kept some items',
    submitedAt: new Date('2023-05-15T10:05:00Z'),
    processedAt: new Date('2023-05-15T10:10:00Z'),
    completedAt: new Date('2023-05-15T10:15:00Z'),
    updatedAt: new Date('2023-05-15T10:15:00Z'),
    gatewayReference: 're_0987654321',
    statusHistory: [
      createStatusHistoryEntry(
        RefundStatus.DRAFT,
        new Date('2023-05-15T10:00:00Z'),
        mockEntityIds.user,
        'Initial creation'
      ),
      createStatusHistoryEntry(
        RefundStatus.SUBMITTED,
        new Date('2023-05-15T10:05:00Z'),
        mockEntityIds.user,
        'Submitted for processing'
      ),
      createStatusHistoryEntry(
        RefundStatus.PROCESSING,
        new Date('2023-05-15T10:10:00Z'),
        'system',
        'Processing with payment gateway'
      ),
      createStatusHistoryEntry(
        RefundStatus.COMPLETED,
        new Date('2023-05-15T10:15:00Z'),
        'system',
        'Successfully processed by gateway'
      )
    ],
    metadata: {
      originalAmount: 99.99,
      refundAmount: 49.99,
      items: [
        {
          itemId: 'item_1',
          name: 'Product A',
          quantity: 1,
          amount: 49.99
        }
      ]
    }
  })
};