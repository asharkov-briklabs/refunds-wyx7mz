import { jest } from '@jest/globals'; // @jest/globals v29.5.0

// Mock response for successful refund
const successfulRefundResponse = {
  transactionId: 'fiserv-ref-123456',
  status: 'Approved',
  amount: 100.0,
  currency: 'USD',
  processingTime: new Date().toISOString(),
  authCode: 'AUTH123456',
  merchantId: 'MERCH123',
  originalTransactionId: 'txn-123456'
};

// Mock response for pending refund
const pendingRefundResponse = {
  transactionId: 'fiserv-ref-123457',
  status: 'Pending',
  amount: 50.0,
  currency: 'USD',
  processingTime: new Date().toISOString(),
  merchantId: 'MERCH123',
  originalTransactionId: 'txn-123457'
};

// Mock response for failed refund
const failedRefundResponse = {
  transactionId: 'fiserv-ref-123458',
  status: 'Declined',
  amount: 75.0,
  currency: 'USD',
  processingTime: new Date().toISOString(),
  merchantId: 'MERCH123',
  originalTransactionId: 'txn-123458',
  responseCode: '05',
  responseMessage: 'Do not honor'
};

/**
 * Mock function that simulates processing a refund through Fiserv
 * @param refundRequest The refund request object
 * @returns A simulated gateway result with success status
 */
const processRefund = jest.fn((refundRequest) => {
  return {
    success: true,
    gatewayReference: 'fiserv-ref-' + Math.floor(Math.random() * 1000000),
    status: 'COMPLETED',
    response: { ...successfulRefundResponse }
  };
});

/**
 * Mock function that simulates checking the status of a refund through Fiserv
 * @param refundId The ID of the refund to check
 * @returns A simulated gateway result with the current status
 */
const checkRefundStatus = jest.fn((refundId) => {
  return {
    success: true,
    gatewayReference: refundId,
    status: 'COMPLETED',
    response: { ...successfulRefundResponse, transactionId: refundId }
  };
});

/**
 * Configures the mock to simulate a failed refund on the next call
 */
const simulateFailedRefund = jest.fn(() => {
  processRefund.mockImplementationOnce((refundRequest) => {
    return {
      success: false,
      gatewayReference: 'fiserv-ref-' + Math.floor(Math.random() * 1000000),
      status: 'FAILED',
      error: 'DECLINED',
      errorMessage: 'Do not honor',
      response: { ...failedRefundResponse }
    };
  });
});

/**
 * Configures the mock to simulate a pending refund on the next call
 */
const simulatePendingRefund = jest.fn(() => {
  processRefund.mockImplementationOnce((refundRequest) => {
    return {
      success: true,
      gatewayReference: 'fiserv-ref-' + Math.floor(Math.random() * 1000000),
      status: 'PENDING',
      response: { ...pendingRefundResponse }
    };
  });
});

/**
 * Configures the mock to simulate a network error on the next call
 */
const simulateNetworkError = jest.fn(() => {
  processRefund.mockImplementationOnce((refundRequest) => {
    throw new Error('Network error: Unable to connect to Fiserv gateway');
  });
});

/**
 * Configures the mock to simulate a timeout error on the next call
 */
const simulateTimeoutError = jest.fn(() => {
  processRefund.mockImplementationOnce((refundRequest) => {
    throw new Error('Timeout error: Fiserv gateway did not respond within the timeout period');
  });
});

/**
 * Resets all mock functions to their default implementations
 */
const resetMocks = jest.fn(() => {
  processRefund.mockReset();
  checkRefundStatus.mockReset();
  
  // Restore default successful response behavior
  processRefund.mockImplementation((refundRequest) => {
    return {
      success: true,
      gatewayReference: 'fiserv-ref-' + Math.floor(Math.random() * 1000000),
      status: 'COMPLETED',
      response: { ...successfulRefundResponse }
    };
  });
  
  checkRefundStatus.mockImplementation((refundId) => {
    return {
      success: true,
      gatewayReference: refundId,
      status: 'COMPLETED',
      response: { ...successfulRefundResponse, transactionId: refundId }
    };
  });
});

/**
 * Fiserv Gateway Mock
 * Provides a comprehensive mock of the Fiserv payment gateway for testing
 */
const FiservMock = {
  processRefund,
  checkRefundStatus,
  simulateFailedRefund,
  simulatePendingRefund,
  simulateNetworkError,
  simulateTimeoutError,
  resetMocks
};

export default FiservMock;