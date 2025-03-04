import { mockTransactions, createMockPaymentServiceClient } from '../../mocks/services/payment-service.mock';
import { mockEntityIds, mockRefundRequests, createRefundRequest } from '../../fixtures/refunds.fixture';
import { RefundStatus, RefundMethod } from '../../../common/enums/refund-status.enum';
import { IRefundRequestDocument } from '../../../database/models/refund-request.model';
import { BusinessError, ValidationError } from '../../../common/errors/business-error';
import { executeStateTransition } from '../../../services/refund-request-manager/state-machine';
import { PaymentMethodType } from '../../../common/interfaces/payment.interface';

describe('RefundRequestManager', () => {
  let refundRequestManager: any;
  let refundRequestRepository: any;
  let paymentMethodHandlerService: any;
  let approvalWorkflowService: any;
  let complianceEngineService: any;
  let notificationService: any;
  let paymentServiceClient: any;

  beforeEach(() => {
    refundRequestRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      update: jest.fn(),
      findByMerchantId: jest.fn(),
      search: jest.fn(),
      updateGatewayReference: jest.fn()
    };

    paymentMethodHandlerService = {
      validateRefund: jest.fn(),
      processRefund: jest.fn(),
      getTransactionForRefund: jest.fn(),
      getSupportedRefundMethods: jest.fn()
    };

    approvalWorkflowService = {
      checkRefundRequiresApproval: jest.fn(),
      createRefundApprovalRequest: jest.fn(),
      getApprovalsByRefund: jest.fn()
    };

    complianceEngineService = {
      validateRefundCompliance: jest.fn()
    };

    notificationService = {
      sendNotification: jest.fn()
    };

    paymentServiceClient = createMockPaymentServiceClient();

    refundRequestManager = {
      createRefundRequest: jest.fn(),
      getRefundRequest: jest.fn(),
      submitRefundRequest: jest.fn(),
      processRefundRequest: jest.fn(),
      cancelRefundRequest: jest.fn(),
      getRefundRequestsByMerchant: jest.fn(),
      searchRefundRequests: jest.fn(),
      updateRefundStatus: jest.fn(),
      handleGatewayCallback: jest.fn(),
      handleApprovalResult: jest.fn()
    };
  });

  describe('createRefundRequest', () => {
    it('should create a refund request', async () => {
      const refundData = {
        transactionId: mockEntityIds.transaction,
        amount: 50,
        reason: 'Test reason',
        refundMethod: RefundMethod.ORIGINAL_PAYMENT
      };

      refundRequestRepository.create.mockResolvedValue(refundData);

      const result = await refundRequestManager.createRefundRequest(refundData);

      expect(refundRequestRepository.create).toHaveBeenCalledWith(refundData);
      expect(result).toEqual(refundData);
    });
  });

  describe('getRefundRequest', () => {
    it('should get a refund request by ID', async () => {
      const refundId = 'req_123';
      const refundData = { refundId, amount: 50 };

      refundRequestRepository.findById.mockResolvedValue(refundData);

      const result = await refundRequestManager.getRefundRequest(refundId);

      expect(refundRequestRepository.findById).toHaveBeenCalledWith(refundId);
      expect(result).toEqual(refundData);
    });
  });

  describe('submitRefundRequest', () => {
    it('should submit a refund request', async () => {
      const refundId = 'req_123';
      const refundData = { refundId, status: RefundStatus.DRAFT };

      refundRequestRepository.findById.mockResolvedValue(refundData);
      complianceEngineService.validateRefundCompliance.mockResolvedValue({ compliant: true });
      approvalWorkflowService.checkRefundRequiresApproval.mockResolvedValue({ requiresApproval: false });
      refundRequestRepository.updateStatus.mockResolvedValue({ refundId, status: RefundStatus.SUBMITTED });

      const result = await refundRequestManager.submitRefundRequest(refundId);

      expect(refundRequestRepository.findById).toHaveBeenCalledWith(refundId);
      expect(complianceEngineService.validateRefundCompliance).toHaveBeenCalledWith(refundData);
      expect(approvalWorkflowService.checkRefundRequiresApproval).toHaveBeenCalledWith(refundData);
      expect(refundRequestRepository.updateStatus).toHaveBeenCalledWith(refundId, RefundStatus.SUBMITTED);
      expect(result).toEqual({ refundId, status: RefundStatus.SUBMITTED });
    });
  });

  describe('processRefundRequest', () => {
    it('should process a refund request', async () => {
      const refundId = 'req_123';
      const refundData = { refundId, status: RefundStatus.SUBMITTED, refundMethod: RefundMethod.ORIGINAL_PAYMENT };
      const transactionData = { transactionId: 'txn_123' };

      refundRequestRepository.findById.mockResolvedValue(refundData);
      paymentMethodHandlerService.getTransactionForRefund.mockResolvedValue(transactionData);
      paymentMethodHandlerService.processRefund.mockResolvedValue({ success: true });
      refundRequestRepository.updateStatus.mockResolvedValue({ refundId, status: RefundStatus.COMPLETED });

      const result = await refundRequestManager.processRefundRequest(refundId);

      expect(refundRequestRepository.findById).toHaveBeenCalledWith(refundId);
      expect(paymentMethodHandlerService.getTransactionForRefund).toHaveBeenCalledWith(refundData.transactionId);
      expect(paymentMethodHandlerService.processRefund).toHaveBeenCalledWith(refundData, transactionData);
      expect(refundRequestRepository.updateStatus).toHaveBeenCalledWith(refundId, RefundStatus.COMPLETED);
      expect(result).toEqual({ refundId, status: RefundStatus.COMPLETED });
    });
  });

  describe('cancelRefundRequest', () => {
    it('should cancel a refund request', async () => {
      const refundId = 'req_123';
      const cancellationReason = 'Test reason';
      const refundData = { refundId, status: RefundStatus.SUBMITTED };

      refundRequestRepository.findById.mockResolvedValue(refundData);
      refundRequestRepository.updateStatus.mockResolvedValue({ refundId, status: RefundStatus.CANCELED });

      const result = await refundRequestManager.cancelRefundRequest(refundId, cancellationReason);

      expect(refundRequestRepository.findById).toHaveBeenCalledWith(refundId);
      expect(refundRequestRepository.updateStatus).toHaveBeenCalledWith(refundId, RefundStatus.CANCELED, cancellationReason);
      expect(result).toEqual({ refundId, status: RefundStatus.CANCELED });
    });
  });

  describe('getRefundRequestsByMerchant', () => {
    it('should get refund requests by merchant ID', async () => {
      const merchantId = 'mer_123';
      const paginationOptions = { page: 1, limit: 10 };
      const refundRequests = [{ refundId: 'req_123' }];

      refundRequestRepository.findByMerchantId.mockResolvedValue(refundRequests);

      const result = await refundRequestManager.getRefundRequestsByMerchant(merchantId, paginationOptions);

      expect(refundRequestRepository.findByMerchantId).toHaveBeenCalledWith(merchantId, paginationOptions);
      expect(result).toEqual(refundRequests);
    });
  });

  describe('searchRefundRequests', () => {
    it('should search refund requests', async () => {
      const filterCriteria = { status: RefundStatus.SUBMITTED };
      const paginationOptions = { page: 1, limit: 10 };
      const refundRequests = [{ refundId: 'req_123' }];

      refundRequestRepository.search.mockResolvedValue(refundRequests);

      const result = await refundRequestManager.searchRefundRequests(filterCriteria, paginationOptions);

      expect(refundRequestRepository.search).toHaveBeenCalledWith(filterCriteria, paginationOptions);
      expect(result).toEqual(refundRequests);
    });
  });

  describe('updateRefundStatus', () => {
    it('should update refund status', async () => {
      const refundId = 'req_123';
      const newStatus = RefundStatus.COMPLETED;
      const statusMetadata = { gatewayReference: 'ref_123' };
      const refundData = { refundId, status: RefundStatus.SUBMITTED };

      refundRequestRepository.findById.mockResolvedValue(refundData);
      refundRequestRepository.updateStatus.mockResolvedValue({ refundId, status: newStatus });

      const result = await refundRequestManager.updateRefundStatus(refundId, newStatus, statusMetadata);

      expect(refundRequestRepository.findById).toHaveBeenCalledWith(refundId);
      expect(refundRequestRepository.updateStatus).toHaveBeenCalledWith(refundId, newStatus, statusMetadata);
      expect(result).toEqual({ refundId, status: newStatus });
    });
  });

  describe('handleGatewayCallback', () => {
    it('should handle gateway callback', async () => {
      const callbackData = { refundId: 'req_123', status: 'COMPLETED' };

      refundRequestRepository.updateGatewayReference.mockResolvedValue(true);

      const result = await refundRequestManager.handleGatewayCallback(callbackData);

      expect(refundRequestRepository.updateGatewayReference).toHaveBeenCalledWith(callbackData.refundId, callbackData.status);
      expect(result).toBe(true);
    });
  });

  describe('handleApprovalResult', () => {
    it('should handle approval result', async () => {
      const refundId = 'req_123';
      const approvalResult = 'APPROVED';
      const approvalMetadata = { approverId: 'user_456' };
      const refundData = { refundId, status: RefundStatus.PENDING_APPROVAL };

      refundRequestRepository.findById.mockResolvedValue(refundData);
      refundRequestRepository.updateStatus.mockResolvedValue({ refundId, status: RefundStatus.PROCESSING });

      const result = await refundRequestManager.handleApprovalResult(refundId, approvalResult, approvalMetadata);

      expect(refundRequestRepository.findById).toHaveBeenCalledWith(refundId);
      expect(refundRequestRepository.updateStatus).toHaveBeenCalledWith(refundId, RefundStatus.PROCESSING, approvalMetadata);
      expect(result).toEqual({ refundId, status: RefundStatus.PROCESSING });
    });
  });
});