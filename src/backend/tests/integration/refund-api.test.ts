import request from 'supertest'; // supertest@^6.3.3
import express, { Application } from 'express'; // express@^4.18.2
import { describe, it, beforeAll, beforeEach, afterEach, afterAll, expect, jest } from '@jest/globals'; // @jest/globals@^29.5.0
import MockDate from 'mockdate'; // mockdate@^3.0.5
import { server, refundRoutes } from '../../api/server';
import { RefundStatus, RefundMethod } from '../../common/enums/refund-status.enum';
import { StatusCode } from '../../common/constants/status-codes';
import { ErrorCode } from '../../common/constants/error-codes';
import { mockRefundRequests, createRefundRequest, mockEntityIds } from '../fixtures/refunds.fixture';
import { createRefundRequest as createRefundRequestType } from '../fixtures/refunds.fixture';
import { mockBankAccounts } from '../fixtures/bank-accounts.fixture';
import refundRequestRepository from '../../database/repositories/refund-request.repo';

// Define global variables for the Express app and authentication token
let app: Application;
let authToken: string;

/**
 * Sets up a test Express application with refund routes for API testing
 */
async function setupTestApp(): Promise<Application> {
  // Create a new Express application
  const testApp = express();

  // Register refund routes to the application
  testApp.use(refundRoutes);

  // Configure authentication middleware for testing
  testApp.use((req, res, next) => {
    // Mock authentication by attaching a user object to the request
    (req as any).auth = {
      userId: 'test_user',
      merchantId: 'test_merchant',
      roles: ['MERCHANT_ADMIN']
    };
    next();
  });

  // Configure error handling middleware
  testApp.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Test error' });
  });

  // Return the configured application
  return testApp;
}

/**
 * Generates a test authentication token with specified user roles
 */
function generateAuthToken(options: { userId?: string; merchantId?: string; roles?: string[] } = {}): string {
  // Set default user role to 'MERCHANT_ADMIN' if not specified
  const userRole = options.roles || ['MERCHANT_ADMIN'];

  // Create payload with userId, merchantId, and roles
  const payload = {
    userId: options.userId || 'test_user',
    merchantId: options.merchantId || 'test_merchant',
    roles: userRole
  };

  // Generate and sign JWT token
  // Note: In a real implementation, this would use a proper JWT library and signing key
  const token = `test_token_${payload.userId}_${payload.roles.join(',')}`;

  // Return the token string
  return token;
}

/**
 * Sets up mock responses for dependent services and repositories
 */
function setupMockResponses(): void {
  // Mock refundRequestRepository.findById to return test refund requests
  jest.spyOn(refundRequestRepository, 'findById').mockImplementation(async (refundId: string) => {
    if (refundId === mockRefundRequests.draft.refundRequestId) {
      return mockRefundRequests.draft;
    } else if (refundId === mockRefundRequests.submitted.refundRequestId) {
      return mockRefundRequests.submitted;
    } else if (refundId === mockRefundRequests.pendingApproval.refundRequestId) {
      return mockRefundRequests.pendingApproval;
    } else if (refundId === mockRefundRequests.completed.refundRequestId) {
      return mockRefundRequests.completed;
    } else if (refundId === mockRefundRequests.failed.refundRequestId) {
      return mockRefundRequests.failed;
    } else if (refundId === mockRefundRequests.canceled.refundRequestId) {
      return mockRefundRequests.canceled;
    } else {
      return null;
    }
  });

  // Mock refundRequestRepository.findByMerchant to return paginated results
  jest.spyOn(refundRequestRepository, 'findByMerchant').mockImplementation(async (merchantId: string, options: any) => {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const results = Object.values(mockRefundRequests).slice(startIndex, endIndex);
    return {
      results: results,
      total: Object.keys(mockRefundRequests).length
    };
  });

  // Mock refundRequestRepository.create to return test refund requests
  jest.spyOn(refundRequestRepository, 'create').mockImplementation(async (refundData: any) => {
    const newRefund = createRefundRequest(refundData);
    return newRefund;
  });

  // Mock refundRequestRepository.update to return updated refund requests
  jest.spyOn(refundRequestRepository, 'update').mockImplementation(async (refund: any) => {
    return refund;
  });

  // Mock dependent services like payment service and gateway service
  // TODO: Add mocks for payment service and gateway service
}

/**
 * Refund API Integration Tests
 */
describe('Refund API Integration Tests', () => {
  // Before all tests, set up the test Express application
  beforeAll(async () => {
    app = await setupTestApp();
    authToken = generateAuthToken();
  });

  // Before each test, set up mock responses
  beforeEach(() => {
    setupMockResponses();
  });

  // After each test, restore mock implementations
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // After all tests, clean up test resources
  afterAll(async () => {
    // TODO: Add cleanup logic if needed
  });

  it('should create a refund request successfully', async () => {
    // Prepare test refund request data
    const refundData = {
      transactionId: 'txn_12345',
      amount: 50.00,
      reason: 'Customer request',
      refundMethod: 'ORIGINAL_PAYMENT'
    };

    // Make POST request to /refunds endpoint
    const response = await request(app)
      .post('/refunds')
      .set('Authorization', `Bearer ${authToken}`)
      .send(refundData);

    // Verify response status is CREATED (201)
    expect(response.status).toBe(StatusCode.CREATED);

    // Verify response contains created refund with correct data
    expect(response.body.refund).toBeDefined();
    expect(response.body.refund.transactionId).toBe(refundData.transactionId);
    expect(response.body.refund.amount).toBe(refundData.amount);
    expect(response.body.refund.reason).toBe(refundData.reason);
    expect(response.body.refund.refundMethod).toBe(refundData.refundMethod);

    // Verify initial status is set correctly
    expect(response.body.refund.status).toBe(RefundStatus.DRAFT);
  });

  it('should validate refund request data on creation', async () => {
    // Prepare invalid refund request data (missing required fields)
    const invalidRefundData = {
      transactionId: 'txn_12345',
      reason: 'Customer request',
      refundMethod: 'ORIGINAL_PAYMENT'
    };

    // Make POST request to /refunds endpoint
    const response = await request(app)
      .post('/refunds')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidRefundData);

    // Verify response status is BAD_REQUEST (400)
    expect(response.status).toBe(StatusCode.BAD_REQUEST);

    // Verify response contains validation error details
    expect(response.body.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(response.body.message).toBe('The request contains invalid data');
    expect(response.body.fieldErrors).toBeDefined();
  });

  it('should get a refund by ID', async () => {
    // Setup mock repository to return a specific refund
    const refundId = mockRefundRequests.submitted.refundRequestId;

    // Make GET request to /refunds/:refundId endpoint
    const response = await request(app)
      .get(`/refunds/${refundId}`)
      .set('Authorization', `Bearer ${authToken}`);

    // Verify response status is OK (200)
    expect(response.status).toBe(StatusCode.OK);

    // Verify response contains correct refund data
    expect(response.body.refund).toBeDefined();
    expect(response.body.refund.refundRequestId).toBe(refundId);
  });

  it('should return 404 for non-existent refund', async () => {
    // Setup mock repository to return null for unknown ID
    jest.spyOn(refundRequestRepository, 'findById').mockResolvedValue(null);
    const refundId = 'non_existent_refund';

    // Make GET request to /refunds/:refundId with unknown ID
    const response = await request(app)
      .get(`/refunds/${refundId}`)
      .set('Authorization', `Bearer ${authToken}`);

    // Verify response status is NOT_FOUND (404)
    expect(response.status).toBe(StatusCode.NOT_FOUND);

    // Verify response contains appropriate error message
    expect(response.body.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    expect(response.body.message).toBe('The requested resource was not found');
  });

  it('should list refunds with pagination', async () => {
    // Setup mock repository to return paginated results
    const page = 2;
    const limit = 3;

    // Make GET request to /refunds with pagination params
    const response = await request(app)
      .get(`/refunds?page=${page}&limit=${limit}`)
      .set('Authorization', `Bearer ${authToken}`);

    // Verify response status is OK (200)
    expect(response.status).toBe(StatusCode.OK);

    // Verify response contains correct pagination metadata
    expect(response.body.refunds).toBeDefined();
    expect(response.body.total).toBe(Object.keys(mockRefundRequests).length);
    expect(response.body.page).toBe(page);
    expect(response.body.limit).toBe(limit);

    // Verify response contains expected refund items
    expect(response.body.refunds.length).toBeLessThanOrEqual(limit);
  });

  it('should filter refunds by status', async () => {
    // Setup mock repository to filter by status
    const status = RefundStatus.SUBMITTED;

    // Make GET request to /refunds with status filter
    const response = await request(app)
      .get(`/refunds?status=${status}`)
      .set('Authorization', `Bearer ${authToken}`);

    // Verify response status is OK (200)
    expect(response.status).toBe(StatusCode.OK);

    // Verify response contains only refunds with specified status
    response.body.refunds.forEach(refund => {
      expect(refund.status).toBe(status);
    });

    // Verify filtering is correctly passed to repository
    // TODO: Add verification of repository call with correct filter
  });

  it('should filter refunds by date range', async () => {
    // Setup mock repository to filter by date range
    const dateRangeStart = '2023-05-10';
    const dateRangeEnd = '2023-05-20';

    // Make GET request to /refunds with date range params
    const response = await request(app)
      .get(`/refunds?dateRangeStart=${dateRangeStart}&dateRangeEnd=${dateRangeEnd}`)
      .set('Authorization', `Bearer ${authToken}`);

    // Verify response status is OK (200)
    expect(response.status).toBe(StatusCode.OK);

    // Verify response contains only refunds within date range
    // TODO: Add date range validation

    // Verify date filtering is correctly passed to repository
    // TODO: Add verification of repository call with correct filter
  });

  it('should cancel a refund', async () => {
    // Setup mock repository with cancellable refund
    const refundId = mockRefundRequests.submitted.refundRequestId;
    const cancellationReason = 'Customer changed their mind';

    // Make PUT request to /refunds/:refundId/cancel
    const response = await request(app)
      .put(`/refunds/${refundId}/cancel`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ reason: cancellationReason });

    // Verify response status is OK (200)
    expect(response.status).toBe(StatusCode.OK);

    // Verify refund status is updated to CANCELED
    expect(response.body.refund.status).toBe(RefundStatus.CANCELED);

    // Verify cancellation reason is recorded
    // TODO: Add verification of cancellation reason
  });

  it('should reject cancellation of completed refund', async () => {
    // Setup mock repository with completed refund
    const refundId = mockRefundRequests.completed.refundRequestId;
    const cancellationReason = 'Attempt to cancel completed refund';

    // Make PUT request to /refunds/:refundId/cancel
    const response = await request(app)
      .put(`/refunds/${refundId}/cancel`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ reason: cancellationReason });

    // Verify response status is UNPROCESSABLE_ENTITY (422)
    expect(response.status).toBe(StatusCode.UNPROCESSABLE_ENTITY);

    // Verify response contains state transition error
    expect(response.body.code).toBe(ErrorCode.INVALID_STATE_TRANSITION);
  });

  it('should get supported refund methods', async () => {
    // Setup mock service to return supported methods
    const transactionId = 'txn_12345';

    // Make GET request to /refunds/methods with transactionId
    const response = await request(app)
      .get(`/refunds/methods?transactionId=${transactionId}`)
      .set('Authorization', `Bearer ${authToken}`);

    // Verify response status is OK (200)
    expect(response.status).toBe(StatusCode.OK);

    // Verify response contains list of supported methods
    expect(response.body.methods).toBeDefined();
    // TODO: Add more specific validation of supported methods
  });

  it('should get refund statistics', async () => {
    // Setup mock service to return refund metrics

    // Make GET request to /refunds/statistics
    const response = await request(app)
      .get('/refunds/statistics')
      .set('Authorization', `Bearer ${authToken}`);

    // Verify response status is OK (200)
    expect(response.status).toBe(StatusCode.OK);

    // Verify response contains correct metrics data
    expect(response.body.statistics).toBeDefined();
    // TODO: Add more specific validation of metrics data
  });

  it('should enforce authentication on protected endpoints', async () => {
    // Make request to protected endpoint without auth token
    const responseWithoutToken = await request(app).get('/refunds');

    // Verify response status is UNAUTHORIZED (401)
    expect(responseWithoutToken.status).toBe(StatusCode.UNAUTHORIZED);

    // Make request with invalid auth token
    const responseWithInvalidToken = await request(app)
      .get('/refunds')
      .set('Authorization', 'Bearer invalid_token');

    // Verify response status is UNAUTHORIZED (401)
    expect(responseWithInvalidToken.status).toBe(StatusCode.UNAUTHORIZED);
  });

  it('should enforce authorization based on user role', async () => {
    // Generate token with insufficient permissions
    const insufficientToken = generateAuthToken({ roles: ['SUPPORT_STAFF'] });

    // Make request to restricted endpoint
    const responseWithInsufficientPermissions = await request(app)
      .post('/refunds')
      .set('Authorization', `Bearer ${insufficientToken}`)
      .send({ transactionId: 'txn_123', amount: 10, reason: 'test', refundMethod: 'ORIGINAL_PAYMENT' });

    // Verify response status is FORBIDDEN (403)
    expect(responseWithInsufficientPermissions.status).toBe(StatusCode.FORBIDDEN);

    // Generate token with sufficient permissions
    const sufficientToken = generateAuthToken({ roles: ['MERCHANT_ADMIN'] });

    // Make same request
    const responseWithSufficientPermissions = await request(app)
      .post('/refunds')
      .set('Authorization', `Bearer ${sufficientToken}`)
      .send({ transactionId: 'txn_123', amount: 10, reason: 'test', refundMethod: 'ORIGINAL_PAYMENT' });

    // Verify request succeeds with appropriate status
    expect(responseWithSufficientPermissions.status).not.toBe(StatusCode.FORBIDDEN);
  });
});

/**
 * Refund API Edge Cases
 */
describe('Refund API Edge Cases', () => {
  beforeAll(async () => {
    app = await setupTestApp();
    authToken = generateAuthToken();
  });

  beforeEach(() => {
    setupMockResponses();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should handle concurrent refund creation with idempotency key', async () => {
    // Prepare refund request with idempotency key
    const idempotencyKey = 'unique_idempotency_key';
    const refundData = {
      transactionId: 'txn_12345',
      amount: 50.00,
      reason: 'Customer request',
      refundMethod: 'ORIGINAL_PAYMENT'
    };

    // Mock the repository to simulate concurrent creation attempts
    const createRefundMock = jest.spyOn(refundRequestRepository, 'create');
    createRefundMock.mockImplementation(async () => {
      // Simulate a delay to mimic concurrent requests
      await new Promise(resolve => setTimeout(resolve, 50));
      return createRefundRequest(refundData);
    });

    // Make two identical POST requests with same idempotency key
    const [response1, response2] = await Promise.all([
      request(app)
        .post('/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(refundData),
      request(app)
        .post('/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(refundData)
    ]);

    // Verify both return same refund ID
    expect(response1.body.refund.refundRequestId).toBe(response2.body.refund.refundRequestId);

    // Verify only one refund was created in repository
    expect(createRefundMock).toHaveBeenCalledTimes(1);
  });

  it('should handle large result sets with proper pagination', async () => {
    // Setup mock repository to return large result set
    const totalRefunds = 50;
    const pageSize = 10;
    const page = 3;

    jest.spyOn(refundRequestRepository, 'findByMerchant').mockImplementation(async () => {
      const results = Array.from({ length: pageSize }, (_, i) => createRefundRequest({ refundRequestId: `req_${i + (page - 1) * pageSize}` }));
      return { results, total: totalRefunds };
    });

    // Make GET request to /refunds with pagination
    const response = await request(app)
      .get(`/refunds?page=${page}&limit=${pageSize}`)
      .set('Authorization', `Bearer ${authToken}`);

    // Verify response contains correct page size
    expect(response.body.refunds.length).toBe(pageSize);

    // Verify total count and page calculation is correct
    expect(response.body.total).toBe(totalRefunds);
  });

  it('should reject invalid refund amount', async () => {
    // Prepare refund request with negative amount
    const refundData = {
      transactionId: 'txn_12345',
      amount: -50.00,
      reason: 'Customer request',
      refundMethod: 'ORIGINAL_PAYMENT'
    };

    // Make POST request to /refunds
    const response = await request(app)
      .post('/refunds')
      .set('Authorization', `Bearer ${authToken}`)
      .send(refundData);

    // Verify response status is BAD_REQUEST (400)
    expect(response.status).toBe(StatusCode.BAD_REQUEST);

    // Verify validation error message for amount
    expect(response.body.fieldErrors[0].field).toBe('amount');
    expect(response.body.fieldErrors[0].message).toBe('Refund amount must be greater than zero');
  });

  it('should reject refund amount exceeding transaction amount', async () => {
    // Prepare refund request with amount > transaction amount
    const refundData = {
      transactionId: 'txn_12345',
      amount: 200.00,
      reason: 'Customer request',
      refundMethod: 'ORIGINAL_PAYMENT'
    };

    // Make POST request to /refunds
    const response = await request(app)
      .post('/refunds')
      .set('Authorization', `Bearer ${authToken}`)
      .send(refundData);

    // Verify response status is BAD_REQUEST (400)
    expect(response.status).toBe(StatusCode.BAD_REQUEST);

    // Verify validation error about exceeding transaction amount
    expect(response.body.fieldErrors[0].field).toBe('amount');
    expect(response.body.fieldErrors[0].message).toBe('Refund amount must be greater than zero');
  });

  it('should handle server errors gracefully', async () => {
    // Mock repository to throw unexpected error
    jest.spyOn(refundRequestRepository, 'create').mockImplementation(async () => {
      throw new Error('Unexpected database error');
    });

    // Make request that would trigger the error
    const response = await request(app)
      .post('/refunds')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ transactionId: 'txn_123', amount: 10, reason: 'test', refundMethod: 'ORIGINAL_PAYMENT' });

    // Verify response status is appropriate error code
    expect(response.status).toBe(StatusCode.INTERNAL_SERVER_ERROR);

    // Verify error does not expose sensitive details
    expect(response.body.message).toBe('An unexpected error occurred');
  });
});