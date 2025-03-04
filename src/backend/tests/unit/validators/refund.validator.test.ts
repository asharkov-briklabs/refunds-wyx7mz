import { 
  validateCreateRefundRequest, 
  validateUpdateRefundRequest, 
  validateCancelRefundRequest, 
  validateRefundMethodForTransaction 
} from '../../../services/refund-api/validators/refund.validator';
import { RefundMethod } from '../../../common/enums/refund-method.enum';
import { ErrorCode } from '../../../common/constants/error-codes';
import { RefundStatus } from '../../../common/enums/refund-status.enum';

// Mock isValidId function
jest.mock('../../../common/utils/validation-utils', () => {
  const originalModule = jest.requireActual('../../../common/utils/validation-utils');
  return {
    ...originalModule,
    isValidId: jest.fn().mockImplementation((id) => {
      // Simple UUID validation for testing
      return typeof id === 'string' && 
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    })
  };
});

// Mock logger to prevent console output during tests
jest.mock('../../../common/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('validateCreateRefundRequest', () => {
  const validRefundRequest = {
    transactionId: '123e4567-e89b-12d3-a456-426614174000',
    amount: 100.00,
    reason: 'Customer requested refund',
    reasonCode: 'CUSTOMER_REQUEST',
    refundMethod: RefundMethod.ORIGINAL_PAYMENT
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate a valid refund request', () => {
    const result = validateCreateRefundRequest(validRefundRequest);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject request with missing required fields', () => {
    const invalidRequest = {
      // Missing transactionId, amount, and refundMethod
      reason: 'Customer requested refund',
      reasonCode: 'CUSTOMER_REQUEST'
    };
    
    const result = validateCreateRefundRequest(invalidRequest);
    
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    
    // Check for specific error about required fields
    expect(result.errors.some(error => 
      error.code === ErrorCode.REQUIRED_FIELD_MISSING ||
      error.code === ErrorCode.VALIDATION_ERROR
    )).toBe(true);
  });

  it('should reject request with invalid refund amount', () => {
    // Test with negative amount
    const negativeAmountRequest = {
      ...validRefundRequest,
      amount: -50.00
    };
    
    const negativeResult = validateCreateRefundRequest(negativeAmountRequest);
    expect(negativeResult.success).toBe(false);
    expect(negativeResult.errors.some(error => 
      error.field === 'amount' || error.field === 'refundAmount'
    )).toBe(true);
    
    // Test with zero amount
    const zeroAmountRequest = {
      ...validRefundRequest,
      amount: 0
    };
    
    const zeroResult = validateCreateRefundRequest(zeroAmountRequest);
    expect(zeroResult.success).toBe(false);
    expect(zeroResult.errors.some(error => 
      error.field === 'amount' || error.field === 'refundAmount'
    )).toBe(true);
  });

  it('should validate refund method enum values', () => {
    // Test with invalid refund method
    const invalidMethodRequest = {
      ...validRefundRequest,
      refundMethod: 'INVALID_METHOD'
    };
    
    const result = validateCreateRefundRequest(invalidMethodRequest);
    expect(result.success).toBe(false);
    expect(result.errors.some(error => 
      error.field === 'refundMethod'
    )).toBe(true);
  });

  it('should require bankAccountId when refund method is OTHER', () => {
    const otherMethodRequest = {
      ...validRefundRequest,
      refundMethod: RefundMethod.OTHER
      // Missing bankAccountId
    };
    
    const result = validateCreateRefundRequest(otherMethodRequest);
    expect(result.success).toBe(false);
    expect(result.errors.some(error => 
      error.field === 'bankAccountId' && 
      error.code === ErrorCode.REQUIRED_FIELD_MISSING
    )).toBe(true);
  });

  it('should validate bankAccountId format when provided', () => {
    const invalidBankAccountRequest = {
      ...validRefundRequest,
      refundMethod: RefundMethod.OTHER,
      bankAccountId: 'invalid-format'  // Not a valid UUID format
    };
    
    const result = validateCreateRefundRequest(invalidBankAccountRequest);
    expect(result.success).toBe(false);
    expect(result.errors.some(error => 
      error.field === 'bankAccountId' && 
      error.code === ErrorCode.INVALID_FORMAT
    )).toBe(true);
  });

  it('should accept valid request with OTHER method and valid bankAccountId', () => {
    const validOtherRequest = {
      ...validRefundRequest,
      refundMethod: RefundMethod.OTHER,
      bankAccountId: '123e4567-e89b-12d3-a456-426614174000'
    };
    
    const result = validateCreateRefundRequest(validOtherRequest);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should validate when optional fields are provided', () => {
    const requestWithOptionalFields = {
      ...validRefundRequest,
      metadata: { customField: 'value' },
      supportingDocuments: [
        {
          documentId: '123e4567-e89b-12d3-a456-426614174000',
          documentType: 'RECEIPT',
          url: 'https://example.com/docs/receipt.pdf'
        }
      ]
    };
    
    const result = validateCreateRefundRequest(requestWithOptionalFields);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('validateUpdateRefundRequest', () => {
  // Setup existing refund for testing
  const existingRefund = {
    refundId: '123e4567-e89b-12d3-a456-426614174000',
    transactionId: '223e4567-e89b-12d3-a456-426614174000',
    amount: 100.00,
    reason: 'Original reason',
    reasonCode: 'ORIGINAL_CODE',
    refundMethod: RefundMethod.ORIGINAL_PAYMENT,
    status: RefundStatus.DRAFT
  };

  // Setup valid update request
  const validUpdateRequest = {
    reason: 'Updated reason',
    reasonCode: 'UPDATED_CODE'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate a valid update request', () => {
    const result = validateUpdateRefundRequest(validUpdateRequest, existingRefund);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject updates for refunds not in DRAFT or SUBMITTED status', () => {
    const processingRefund = {
      ...existingRefund,
      status: RefundStatus.PROCESSING
    };
    
    const result = validateUpdateRefundRequest(validUpdateRequest, processingRefund);
    expect(result.success).toBe(false);
    expect(result.errors.some(error => 
      error.field === 'status' && 
      error.code === ErrorCode.INVALID_STATE
    )).toBe(true);
  });

  it('should accept updates for refunds in SUBMITTED status', () => {
    const submittedRefund = {
      ...existingRefund,
      status: RefundStatus.SUBMITTED
    };
    
    const result = validateUpdateRefundRequest(validUpdateRequest, submittedRefund);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate refund method if it is being updated', () => {
    const invalidMethodRequest = {
      refundMethod: 'INVALID_METHOD'
    };
    
    const result = validateUpdateRefundRequest(invalidMethodRequest, existingRefund);
    expect(result.success).toBe(false);
    expect(result.errors.some(error => 
      error.field === 'refundMethod'
    )).toBe(true);
  });

  it('should require bankAccountId when updating refund method to OTHER', () => {
    const updateToOtherRequest = {
      refundMethod: RefundMethod.OTHER
      // Missing bankAccountId
    };
    
    const result = validateUpdateRefundRequest(updateToOtherRequest, existingRefund);
    expect(result.success).toBe(false);
    expect(result.errors.some(error => 
      error.field === 'bankAccountId' && 
      error.code === ErrorCode.REQUIRED_FIELD_MISSING
    )).toBe(true);
  });

  it('should validate bankAccountId format when updating to OTHER method', () => {
    const invalidBankAccountRequest = {
      refundMethod: RefundMethod.OTHER,
      bankAccountId: 'invalid-format' // Not a valid UUID format
    };
    
    const result = validateUpdateRefundRequest(invalidBankAccountRequest, existingRefund);
    expect(result.success).toBe(false);
    expect(result.errors.some(error => 
      error.field === 'bankAccountId' && 
      error.code === ErrorCode.INVALID_FORMAT
    )).toBe(true);
  });

  it('should accept valid update with OTHER method and valid bankAccountId', () => {
    const validOtherRequest = {
      refundMethod: RefundMethod.OTHER,
      bankAccountId: '123e4567-e89b-12d3-a456-426614174000'
    };
    
    const result = validateUpdateRefundRequest(validOtherRequest, existingRefund);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should not require bankAccountId when existing refund already has one', () => {
    const existingRefundWithBankAccount = {
      ...existingRefund,
      bankAccountId: '123e4567-e89b-12d3-a456-426614174000'
    };
    
    const updateToOtherRequest = {
      refundMethod: RefundMethod.OTHER
      // No bankAccountId in request, but existing refund has one
    };
    
    const result = validateUpdateRefundRequest(updateToOtherRequest, existingRefundWithBankAccount);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should allow updating supporting documents', () => {
    const updateWithDocuments = {
      supportingDocuments: [
        {
          documentId: '123e4567-e89b-12d3-a456-426614174000',
          documentType: 'RECEIPT',
          url: 'https://example.com/docs/receipt.pdf'
        }
      ]
    };
    
    const result = validateUpdateRefundRequest(updateWithDocuments, existingRefund);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('validateCancelRefundRequest', () => {
  // Setup existing refund for testing
  const existingRefund = {
    refundId: '123e4567-e89b-12d3-a456-426614174000',
    transactionId: '223e4567-e89b-12d3-a456-426614174000',
    amount: 100.00,
    reason: 'Original reason',
    reasonCode: 'ORIGINAL_CODE',
    refundMethod: RefundMethod.ORIGINAL_PAYMENT,
    status: RefundStatus.DRAFT
  };

  // Setup valid cancellation request
  const validCancelRequest = {
    reason: 'Customer changed their mind'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate a valid cancellation request', () => {
    const result = validateCancelRefundRequest(validCancelRequest, existingRefund);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate cancellation with no reason provided', () => {
    const noReasonRequest = {};
    
    const result = validateCancelRefundRequest(noReasonRequest, existingRefund);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject cancellation for completed refunds', () => {
    const completedRefund = {
      ...existingRefund,
      status: RefundStatus.COMPLETED
    };
    
    const result = validateCancelRefundRequest(validCancelRequest, completedRefund);
    expect(result.success).toBe(false);
    expect(result.errors.some(error => 
      error.field === 'status' && 
      error.code === ErrorCode.INVALID_STATE
    )).toBe(true);
  });

  it('should reject cancellation for failed refunds', () => {
    const failedRefund = {
      ...existingRefund,
      status: RefundStatus.FAILED
    };
    
    const result = validateCancelRefundRequest(validCancelRequest, failedRefund);
    expect(result.success).toBe(false);
    expect(result.errors.some(error => 
      error.field === 'status' && 
      error.code === ErrorCode.INVALID_STATE
    )).toBe(true);
  });

  it('should reject cancellation for already cancelled refunds', () => {
    const cancelledRefund = {
      ...existingRefund,
      status: RefundStatus.CANCELED
    };
    
    const result = validateCancelRefundRequest(validCancelRequest, cancelledRefund);
    expect(result.success).toBe(false);
    expect(result.errors.some(error => 
      error.field === 'status' && 
      error.code === ErrorCode.INVALID_STATE
    )).toBe(true);
  });

  it('should allow cancellation for refunds in DRAFT status', () => {
    const draftRefund = {
      ...existingRefund,
      status: RefundStatus.DRAFT
    };
    
    const result = validateCancelRefundRequest(validCancelRequest, draftRefund);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should allow cancellation for refunds in SUBMITTED status', () => {
    const submittedRefund = {
      ...existingRefund,
      status: RefundStatus.SUBMITTED
    };
    
    const result = validateCancelRefundRequest(validCancelRequest, submittedRefund);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should allow cancellation for refunds in PENDING_APPROVAL status', () => {
    const pendingApprovalRefund = {
      ...existingRefund,
      status: RefundStatus.PENDING_APPROVAL
    };
    
    const result = validateCancelRefundRequest(validCancelRequest, pendingApprovalRefund);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should allow cancellation for refunds in PROCESSING status', () => {
    const processingRefund = {
      ...existingRefund,
      status: RefundStatus.PROCESSING
    };
    
    const result = validateCancelRefundRequest(validCancelRequest, processingRefund);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('validateRefundMethodForTransaction', () => {
  // Setup transaction for testing
  const validTransaction = {
    transactionId: '123e4567-e89b-12d3-a456-426614174000',
    amount: 100.00,
    status: 'COMPLETED',
    processedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    paymentMethodDetails: {
      supportsRefunds: true
    }
  };

  // Setup merchant settings for testing
  const merchantSettings = {
    refundTimeLimit: 90, // 90 days
    balanceAmount: 500.00,
    hasVerifiedBankAccount: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate ORIGINAL_PAYMENT method for eligible transaction', () => {
    const result = validateRefundMethodForTransaction(
      RefundMethod.ORIGINAL_PAYMENT,
      validTransaction,
      merchantSettings
    );
    
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject ORIGINAL_PAYMENT for non-completed transactions', () => {
    const pendingTransaction = {
      ...validTransaction,
      status: 'PENDING'
    };
    
    const result = validateRefundMethodForTransaction(
      RefundMethod.ORIGINAL_PAYMENT,
      pendingTransaction,
      merchantSettings
    );
    
    expect(result.success).toBe(false);
    expect(result.errors.some(error => 
      error.field === 'refundMethod' && 
      error.code === ErrorCode.METHOD_NOT_ALLOWED
    )).toBe(true);
  });

  it('should reject ORIGINAL_PAYMENT for transactions outside time limit', () => {
    const oldTransaction = {
      ...validTransaction,
      processedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) // 100 days ago
    };
    
    const result = validateRefundMethodForTransaction(
      RefundMethod.ORIGINAL_PAYMENT,
      oldTransaction,
      merchantSettings
    );
    
    expect(result.success).toBe(false);
    expect(result.errors.some(error => 
      error.field === 'refundMethod' && 
      error.code === ErrorCode.REFUND_TIME_LIMIT_EXCEEDED
    )).toBe(true);
  });

  it('should reject ORIGINAL_PAYMENT for payment methods that don\'t support refunds', () => {
    const nonRefundableTransaction = {
      ...validTransaction,
      paymentMethodDetails: {
        supportsRefunds: false
      }
    };
    
    const result = validateRefundMethodForTransaction(
      RefundMethod.ORIGINAL_PAYMENT,
      nonRefundableTransaction,
      merchantSettings
    );
    
    expect(result.success).toBe(false);
    expect(result.errors.some(error => 
      error.field === 'refundMethod' && 
      error.code === ErrorCode.METHOD_NOT_ALLOWED
    )).toBe(true);
  });

  it('should validate BALANCE method when merchant has sufficient balance', () => {
    const result = validateRefundMethodForTransaction(
      RefundMethod.BALANCE,
      validTransaction,
      merchantSettings
    );
    
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject BALANCE method when merchant has insufficient balance', () => {
    const highAmountTransaction = {
      ...validTransaction,
      amount: 1000.00 // Higher than merchant balance
    };
    
    const result = validateRefundMethodForTransaction(
      RefundMethod.BALANCE,
      highAmountTransaction,
      merchantSettings
    );
    
    expect(result.success).toBe(false);
    expect(result.errors.some(error => 
      error.field === 'refundMethod' && 
      error.code === ErrorCode.INSUFFICIENT_BALANCE
    )).toBe(true);
  });

  it('should validate OTHER method when merchant has verified bank account', () => {
    const result = validateRefundMethodForTransaction(
      RefundMethod.OTHER,
      validTransaction,
      merchantSettings
    );
    
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject OTHER method when merchant has no verified bank account', () => {
    const merchantWithoutBankAccount = {
      ...merchantSettings,
      hasVerifiedBankAccount: false
    };
    
    const result = validateRefundMethodForTransaction(
      RefundMethod.OTHER,
      validTransaction,
      merchantWithoutBankAccount
    );
    
    expect(result.success).toBe(false);
    expect(result.errors.some(error => 
      error.field === 'refundMethod' && 
      error.code === ErrorCode.METHOD_NOT_ALLOWED
    )).toBe(true);
  });

  it('should reject an invalid refund method value', () => {
    const result = validateRefundMethodForTransaction(
      'INVALID_METHOD' as any,
      validTransaction,
      merchantSettings
    );
    
    expect(result.success).toBe(false);
    expect(result.errors.some(error => 
      error.field === 'refundMethod'
    )).toBe(true);
  });
  
  it('should use default refund time limit when not specified in merchant settings', () => {
    const settingsWithoutTimeLimit = {
      ...merchantSettings,
      refundTimeLimit: undefined
    };
    
    // Create transaction just outside the default 90-day limit
    const oldTransaction = {
      ...validTransaction,
      processedAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000) // 91 days ago
    };
    
    const result = validateRefundMethodForTransaction(
      RefundMethod.ORIGINAL_PAYMENT,
      oldTransaction,
      settingsWithoutTimeLimit
    );
    
    expect(result.success).toBe(false);
    expect(result.errors.some(error => 
      error.field === 'refundMethod' && 
      error.code === ErrorCode.REFUND_TIME_LIMIT_EXCEEDED
    )).toBe(true);
  });
});