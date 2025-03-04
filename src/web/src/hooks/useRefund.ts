import { useState, useCallback, useEffect } from 'react'; // react ^18.2.0
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchRefund,
  fetchRefunds,
  createRefund,
  cancelRefund,
  fetchTransactionForRefund,
  fetchRefundStatistics,
} from '../store/slices/refund.slice';
import { refundActions } from '../store/slices/refund.slice';
import {
  Refund,
  RefundSummary,
  RefundStatus,
  TransactionSummary,
  RefundStatistics,
} from '../types/refund.types';
import { CreateRefundRequest, RefundFilterParams } from '../types/api.types';
import useToast from './useToast';

/**
 * @interface UseRefundReturn
 * @description Type definition for the return value of the useRefund hook
 */
export interface UseRefundReturn {
  currentRefund: Refund | null;
  refunds: RefundSummary[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
  transaction: TransactionSummary | null;
  statistics: RefundStatistics | null;
  loading: boolean;
  error: string | null;
  getRefund: (refundId: string) => Promise<void>;
  getRefunds: (params: RefundFilterParams) => Promise<void>;
  createRefund: (refundData: CreateRefundRequest) => Promise<void>;
  cancelRefund: (refundId: string, reason: string) => Promise<void>;
  getTransactionForRefund: (transactionId: string) => Promise<void>;
  getRefundStatistics: (params: Record<string, any>) => Promise<void>;
  resetRefundState: () => void;
}

/**
 * @function useRefund
 * @description Custom hook that provides refund-related functionality and state
 * @returns {UseRefundReturn} Object containing refund state and functions for refund operations
 */
function useRefund(): UseRefundReturn {
  // LD1: Initialize Redux hooks (useAppDispatch, useAppSelector)
  const dispatch = useAppDispatch();

  // LD1: Initialize toast notification hook
  const { success, error: toastError } = useToast();

  // LD1: Select refund-related state using selector functions
  const currentRefund = useAppSelector(selectCurrentRefund);
  const refunds = useAppSelector(selectRefundList);
  const pagination = useAppSelector(selectRefundPagination);
  const transaction = useAppSelector(selectTransactionForRefund);
  const statistics = useAppSelector(selectRefundStatistics);
  const loading = useAppSelector(selectRefundLoading);
  const error = useAppSelector(selectRefundError);

  /**
   * @function getRefund
   * @description Define function to get a refund by ID
   * @param {string} refundId - The ID of the refund to retrieve
   * @returns {Promise<void>}
   */
  const getRefund = useCallback(async (refundId: string): Promise<void> => {
    try {
      // LD1: Dispatch the fetchRefund async thunk action
      await dispatch(fetchRefund(refundId));
    } catch (err: any) {
      // LD1: Handle API errors
      handleApiError(err.message);
    }
  }, [dispatch, handleApiError]);

  /**
   * @function getRefunds
   * @description Define function to get refunds with filtering and pagination
   * @param {RefundFilterParams} params - Parameters for filtering and paginating refunds
   * @returns {Promise<void>}
   */
  const getRefunds = useCallback(async (params: RefundFilterParams): Promise<void> => {
    try {
      // LD1: Dispatch the fetchRefunds async thunk action
      await dispatch(fetchRefunds(params));
    } catch (err: any) {
      // LD1: Handle API errors
      handleApiError(err.message);
    }
  }, [dispatch, handleApiError]);

  /**
   * @function createRefund
   * @description Define function to create a new refund
   * @param {CreateRefundRequest} refundData - Data for creating the refund
   * @returns {Promise<void>}
   */
  const createRefund = useCallback(async (refundData: CreateRefundRequest): Promise<void> => {
    try {
      // LD1: Dispatch the createRefund async thunk action
      await dispatch(createRefund(refundData));
      success('Refund created successfully!'); // LD1: Display success toast
    } catch (err: any) {
      // LD1: Handle API errors
      handleApiError(err.message);
    }
  }, [dispatch, success, handleApiError]);

  /**
   * @function cancelRefund
   * @description Define function to cancel a refund
   * @param {string} refundId - The ID of the refund to cancel
   * @param {string} reason - The reason for canceling the refund
   * @returns {Promise<void>}
   */
  const cancelRefund = useCallback(async (refundId: string, reason: string): Promise<void> => {
    try {
      // LD1: Dispatch the cancelRefund async thunk action
      await dispatch(cancelRefund({ refundId, reason }));
      success('Refund cancelled successfully!'); // LD1: Display success toast
    } catch (err: any) {
      // LD1: Handle API errors
      handleApiError(err.message);
    }
  }, [dispatch, success, handleApiError]);

  /**
   * @function getTransactionForRefund
   * @description Define function to get transaction data for refund creation
   * @param {string} transactionId - The ID of the transaction to retrieve
   * @returns {Promise<void>}
   */
  const getTransactionForRefund = useCallback(async (transactionId: string): Promise<void> => {
    try {
      // LD1: Dispatch the fetchTransactionForRefund async thunk action
      await dispatch(fetchTransactionForRefund(transactionId));
    } catch (err: any) {
      // LD1: Handle API errors
      handleApiError(err.message);
    }
  }, [dispatch, handleApiError]);

  /**
   * @function getRefundStatistics
   * @description Define function to get refund statistics
   * @param {Record<string, any>} params - Parameters for filtering statistics
   * @returns {Promise<void>}
   */
  const getRefundStatistics = useCallback(async (params: Record<string, any>): Promise<void> => {
    try {
      // LD1: Dispatch the fetchRefundStatistics async thunk action
      await dispatch(fetchRefundStatistics(params));
    } catch (err: any) {
      // LD1: Handle API errors
      handleApiError(err.message);
    }
  }, [dispatch, handleApiError]);

  /**
   * @function resetRefundState
   * @description Define function to reset refund state
   * @returns {void}
   */
  const resetRefundState = useCallback((): void => {
    // LD1: Dispatch the resetState action
    dispatch(refundActions.resetState());
  }, [dispatch]);

  /**
   * @function handleApiError
   * @description Define function to handle API errors
   * @param {string} message - The error message to display
   * @returns {void}
   */
  const handleApiError = useCallback((message: string): void => {
    // LD1: Dispatch the setError action
    dispatch(refundActions.setError(message));
    toastError(message); // LD1: Display error toast
  }, [dispatch, toastError]);

  // LD1: Return refund state and functions as an object
  return {
    currentRefund,
    refunds,
    pagination,
    transaction,
    statistics,
    loading,
    error,
    getRefund,
    getRefunds,
    createRefund,
    cancelRefund,
    getTransactionForRefund,
    getRefundStatistics,
    resetRefundState,
  };
}

export default useRefund;