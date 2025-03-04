/**
 * Refund API Service
 *
 * This service handles communication with the backend API for refund-related operations,
 * providing methods for creating, retrieving, updating, and cancelling refunds,
 * as well as fetching transaction data and generating refund statistics.
 */

import { get, post, put } from './api.client'; // axios ^1.4.0
import { REFUND_ENDPOINTS } from '../../constants/api.constants';
import { 
  ApiResponse, 
  PaginatedResponse, 
  CreateRefundRequest, 
  UpdateRefundRequest, 
  CancelRefundRequest, 
  RefundFilterParams, 
  RefundStatistics 
} from '../../types/api.types';
import { 
  Refund, 
  RefundSummary, 
  TransactionSummary,
  RefundMethod
} from '../../types/refund.types';
import { PaginationParams } from '../../types/common.types';

/**
 * Fetches a paginated list of refunds with optional filtering
 * @param params Filter and pagination parameters
 * @returns Promise resolving to paginated refund list response
 */
const getRefunds = async (
  params: RefundFilterParams
): Promise<ApiResponse<PaginatedResponse<RefundSummary>>> => {
  return await get(REFUND_ENDPOINTS.BASE, params);
};

/**
 * Fetches detailed information about a specific refund by its ID
 * @param refundId The unique identifier of the refund
 * @returns Promise resolving to detailed refund data
 */
const getRefundById = async (
  refundId: string
): Promise<ApiResponse<Refund>> => {
  if (!refundId) {
    throw new Error('Refund ID is required');
  }
  
  return await get(REFUND_ENDPOINTS.GET_BY_ID(refundId));
};

/**
 * Fetches transaction details for creating a refund
 * @param transactionId The unique identifier of the transaction
 * @returns Promise resolving to transaction summary data
 */
const getTransactionForRefund = async (
  transactionId: string
): Promise<ApiResponse<TransactionSummary>> => {
  if (!transactionId) {
    throw new Error('Transaction ID is required');
  }
  
  return await get(REFUND_ENDPOINTS.TRANSACTION(transactionId));
};

/**
 * Creates a new refund request
 * @param refundData The refund data to be created
 * @returns Promise resolving to created refund data
 */
const createRefund = async (
  refundData: CreateRefundRequest
): Promise<ApiResponse<Refund>> => {
  // Validate required fields
  if (!refundData.transactionId) {
    throw new Error('Transaction ID is required');
  }
  
  if (refundData.amount <= 0) {
    throw new Error('Refund amount must be greater than zero');
  }
  
  if (!refundData.refundMethod) {
    throw new Error('Refund method is required');
  }
  
  if (!refundData.reasonCode || !refundData.reason) {
    throw new Error('Refund reason is required');
  }
  
  // If OTHER refund method is selected, bank account ID is required
  if (refundData.refundMethod === RefundMethod.OTHER && !refundData.bankAccountId) {
    throw new Error('Bank account ID is required for OTHER refund method');
  }
  
  return await post(REFUND_ENDPOINTS.CREATE, refundData);
};

/**
 * Updates an existing refund request (pre-processing only)
 * @param refundId The unique identifier of the refund
 * @param refundData The refund data to be updated
 * @returns Promise resolving to updated refund data
 */
const updateRefund = async (
  refundId: string,
  refundData: UpdateRefundRequest
): Promise<ApiResponse<Refund>> => {
  if (!refundId) {
    throw new Error('Refund ID is required');
  }
  
  // Validate update data
  if (refundData.amount <= 0) {
    throw new Error('Refund amount must be greater than zero');
  }
  
  // If OTHER refund method is selected, bank account ID is required
  if (refundData.refundMethod === RefundMethod.OTHER && !refundData.bankAccountId) {
    throw new Error('Bank account ID is required for OTHER refund method');
  }
  
  return await put(REFUND_ENDPOINTS.UPDATE(refundId), refundData);
};

/**
 * Cancels a pending refund request
 * @param refundId The unique identifier of the refund
 * @param cancelData The cancellation data including reason
 * @returns Promise resolving to cancelled refund data
 */
const cancelRefund = async (
  refundId: string,
  cancelData: CancelRefundRequest
): Promise<ApiResponse<Refund>> => {
  if (!refundId) {
    throw new Error('Refund ID is required');
  }
  
  if (!cancelData.reason) {
    throw new Error('Cancellation reason is required');
  }
  
  return await put(REFUND_ENDPOINTS.CANCEL(refundId), cancelData);
};

/**
 * Fetches statistical data about refunds for reporting
 * @param params Parameters for statistics filtering
 * @returns Promise resolving to refund statistics data
 */
const getRefundStatistics = async (
  params: Record<string, any> = {}
): Promise<ApiResponse<RefundStatistics>> => {
  return await get(REFUND_ENDPOINTS.STATISTICS, params);
};

/**
 * Convenience method to fetch refunds for a specific customer
 * @param customerId The unique identifier of the customer
 * @param pagination Pagination parameters
 * @returns Promise resolving to paginated list of customer refunds
 */
const getRefundsByCustomer = async (
  customerId: string,
  pagination: PaginationParams
): Promise<ApiResponse<PaginatedResponse<RefundSummary>>> => {
  if (!customerId) {
    throw new Error('Customer ID is required');
  }
  
  return await getRefunds({
    customerId,
    ...pagination
  });
};

export default {
  getRefunds,
  getRefundById,
  getTransactionForRefund,
  createRefund,
  updateRefund,
  cancelRefund,
  getRefundStatistics,
  getRefundsByCustomer
};