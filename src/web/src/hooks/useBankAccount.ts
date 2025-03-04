import { useState, useEffect, useCallback } from 'react'; // react version ^18.2.0
import { useDispatch, useSelector } from '../store/hooks';
import bankAccountApi from '../services/api/bank-account.api';
import { logError } from '../utils/error.utils';
import {
  BankAccount,
  BankAccountFormData,
  BankAccountCreationRequest,
  BankAccountListParams,
  BankAccountVerificationMethod,
  BankAccountsListResponse,
  VerificationResponse,
  MicroDepositVerificationData,
} from '../types/bank-account.types';
import useToast from './useToast';
import { useAuth } from './useAuth';
import {
  fetchBankAccounts,
  fetchBankAccountById,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  setDefaultBankAccount,
  initiateAccountVerification,
  getAccountVerificationStatus,
  completeAccountVerification,
  completeMicroDepositVerification,
  bankAccountActions,
  selectBankAccounts,
  selectBankAccountById,
  selectDefaultBankAccount,
  selectBankAccountsLoading,
  selectBankAccountsError,
  selectBankAccountsPagination,
} from '../store/slices/bankAccount.slice';

/**
 * Interface defining the return type of the useBankAccount hook
 */
interface UseBankAccountReturn {
  bankAccounts: BankAccount[];
  loading: boolean;
  error: string | null;
  totalAccounts: number;
  currentPage: number;
  pageSize: number;
  defaultBankAccount: BankAccount | undefined;
  fetchBankAccounts: (params?: Partial<BankAccountListParams>) => Promise<void>;
  fetchBankAccountById: (accountId: string) => Promise<BankAccount | null>;
  createBankAccount: (accountData: BankAccountFormData) => Promise<BankAccount | null>;
  updateBankAccount: (accountId: string, accountData: Partial<BankAccountFormData>) => Promise<BankAccount | null>;
  deleteBankAccount: (accountId: string) => Promise<boolean>;
  setAsDefaultBankAccount: (accountId: string) => Promise<BankAccount | null>;
  initiateVerification: (accountId: string, method: BankAccountVerificationMethod) => Promise<VerificationResponse | null>;
  checkVerificationStatus: (accountId: string) => Promise<VerificationResponse | null>;
  completeVerification: (verificationData: { accountId: string, verificationMethod: BankAccountVerificationMethod, verificationData: any }) => Promise<VerificationResponse | null>;
  completeMicroDepositVerification: (accountId: string, depositData: MicroDepositVerificationData) => Promise<VerificationResponse | null>;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  refreshBankAccounts: () => Promise<void>;
  clearError: () => void;
}

/**
 * Custom React hook that provides bank account management functionality
 * @returns An object containing bank account state and operations
 */
const useBankAccount = (): UseBankAccountReturn => {
  // Get the current user from the useAuth hook
  const { user } = useAuth();
  // Get the Redux dispatch function for dispatching actions
  const dispatch = useDispatch();
  // Use selectors to get bank account state from Redux store
  const bankAccounts = useSelector(selectBankAccounts);
  const loading = useSelector(selectBankAccountsLoading);
  const error = useSelector(selectBankAccountsError);
  const pagination = useSelector(selectBankAccountsPagination);
  const defaultBankAccount = useSelector(selectDefaultBankAccount);
  // Initialize toast notifications using useToast
  const { success, error: toastError } = useToast();

  /**
   * Function for retrieving bank accounts with filtering and pagination
   * @param params Optional parameters for filtering and pagination
   */
  const fetchBankAccountsHandler = useCallback(async (params?: Partial<BankAccountListParams>) => {
    if (!user?.merchantId) {
      logError('No merchant ID found', 'useBankAccount/fetchBankAccounts');
      return;
    }

    const fetchParams: BankAccountListParams = {
      merchantId: user.merchantId,
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      ...params,
    };

    try {
      await dispatch(fetchBankAccounts(fetchParams));
    } catch (e: any) {
      logError('Failed to fetch bank accounts', 'useBankAccount/fetchBankAccounts', e);
      toastError('Failed to fetch bank accounts. Please try again.');
    }
  }, [dispatch, user?.merchantId, pagination.currentPage, pagination.pageSize, toastError]);

  /**
   * Function for retrieving a single bank account's details
   * @param accountId The ID of the bank account to retrieve
   * @returns The bank account details or null if not found
   */
  const fetchBankAccountByIdHandler = useCallback(async (accountId: string): Promise<BankAccount | null> => {
    try {
      // Dispatch the fetchBankAccountById thunk action
      await dispatch(fetchBankAccountById(accountId));
      // Use the selector to get the bank account by ID from the state
      const account = selectBankAccountById(useSelector((state: RootState) => state), accountId);
      return account || null;
    } catch (e: any) {
      logError('Failed to fetch bank account by ID', 'useBankAccount/fetchBankAccountById', e);
      toastError('Failed to fetch bank account details. Please try again.');
      return null;
    }
  }, [dispatch, toastError]);

  /**
   * Function for submitting new bank account requests
   * @param accountData The data for the new bank account
   * @returns The created bank account or null if the operation fails
   */
  const createBankAccountHandler = useCallback(async (accountData: BankAccountFormData): Promise<BankAccount | null> => {
    if (!user?.merchantId) {
      logError('No merchant ID found', 'useBankAccount/createBankAccount');
      toastError('Could not create bank account. Merchant ID not found.');
      return null;
    }

    const creationRequest: BankAccountCreationRequest = {
      ...accountData,
      merchantId: user.merchantId,
    };

    try {
      // Dispatch the createBankAccount thunk action
      const result = await dispatch(createBankAccount(creationRequest));
      if (createBankAccount.fulfilled.match(result)) {
        success('Bank account created successfully!');
        await fetchBankAccountsHandler();
        return result.payload;
      } else {
        toastError('Failed to create bank account. Please try again.');
        return null;
      }
    } catch (e: any) {
      logError('Failed to create bank account', 'useBankAccount/createBankAccount', e);
      toastError('Failed to create bank account. Please try again.');
      return null;
    }
  }, [dispatch, success, toastError, user?.merchantId, fetchBankAccountsHandler]);

  /**
   * Function for modifying existing bank accounts
   * @param accountId The ID of the bank account to update
   * @param accountData The updated data for the bank account
   * @returns The updated bank account or null if the operation fails
   */
  const updateBankAccountHandler = useCallback(async (accountId: string, accountData: Partial<BankAccountFormData>): Promise<BankAccount | null> => {
    try {
      // Dispatch the updateBankAccount thunk action
      const result = await dispatch(updateBankAccount({ accountId, accountData }));
      if (updateBankAccount.fulfilled.match(result)) {
        success('Bank account updated successfully!');
        await fetchBankAccountsHandler();
        return result.payload;
      } else {
        toastError('Failed to update bank account. Please try again.');
        return null;
      }
    } catch (e: any) {
      logError('Failed to update bank account', 'useBankAccount/updateBankAccount', e);
      toastError('Failed to update bank account. Please try again.');
      return null;
    }
  }, [dispatch, success, toastError, fetchBankAccountsHandler]);

  /**
   * Function for removing bank accounts
   * @param accountId The ID of the bank account to remove
   * @returns True if the operation succeeds, false otherwise
   */
  const deleteBankAccountHandler = useCallback(async (accountId: string): Promise<boolean> => {
    try {
      // Dispatch the deleteBankAccount thunk action
      const result = await dispatch(deleteBankAccount(accountId));
      if (deleteBankAccount.fulfilled.match(result)) {
        success('Bank account deleted successfully!');
        await fetchBankAccountsHandler();
        return true;
      } else {
        toastError('Failed to delete bank account. Please try again.');
        return false;
      }
    } catch (e: any) {
      logError('Failed to delete bank account', 'useBankAccount/deleteBankAccount', e);
      toastError('Failed to delete bank account. Please try again.');
      return false;
    }
  }, [dispatch, success, toastError, fetchBankAccountsHandler]);

  /**
   * Function for setting a bank account as the default
   * @param accountId The ID of the bank account to set as default
   * @returns The updated bank account or null if the operation fails
   */
  const setAsDefaultBankAccountHandler = useCallback(async (accountId: string): Promise<BankAccount | null> => {
    try {
      // Dispatch the setDefaultBankAccount thunk action
      const result = await dispatch(setDefaultBankAccount(accountId));
      if (setDefaultBankAccount.fulfilled.match(result)) {
        success('Default bank account updated successfully!');
        await fetchBankAccountsHandler();
        return result.payload;
      } else {
        toastError('Failed to set default bank account. Please try again.');
        return null;
      }
    } catch (e: any) {
      logError('Failed to set default bank account', 'useBankAccount/setAsDefaultBankAccount', e);
      toastError('Failed to set default bank account. Please try again.');
      return null;
    }
  }, [dispatch, success, toastError, fetchBankAccountsHandler]);

  /**
   * Function for starting bank account verification
   * @param accountId The ID of the bank account to verify
   * @param method The verification method to use
   * @returns The verification response or null if the operation fails
   */
  const initiateVerificationHandler = useCallback(async (accountId: string, method: BankAccountVerificationMethod): Promise<VerificationResponse | null> => {
    try {
      // Dispatch the initiateAccountVerification thunk action
      const result = await dispatch(initiateAccountVerification({ accountId, method }));
      if (initiateAccountVerification.fulfilled.match(result)) {
        success('Verification initiated successfully!');
        return result.payload;
      } else {
        toastError('Failed to initiate verification. Please try again.');
        return null;
      }
    } catch (e: any) {
      logError('Failed to initiate verification', 'useBankAccount/initiateVerification', e);
      toastError('Failed to initiate verification. Please try again.');
      return null;
    }
  }, [dispatch, success, toastError]);

  /**
   * Function for checking verification progress
   * @param accountId The ID of the bank account to check
   * @returns The verification response or null if the operation fails
   */
  const checkVerificationStatusHandler = useCallback(async (accountId: string): Promise<VerificationResponse | null> => {
    try {
      // Dispatch the getAccountVerificationStatus thunk action
      const result = await dispatch(getAccountVerificationStatus(accountId));
      if (getAccountVerificationStatus.fulfilled.match(result)) {
        return result.payload;
      } else {
        toastError('Failed to check verification status. Please try again.');
        return null;
      }
    } catch (e: any) {
      logError('Failed to check verification status', 'useBankAccount/checkVerificationStatus', e);
      toastError('Failed to check verification status. Please try again.');
      return null;
    }
  }, [dispatch, toastError]);

  /**
   * Function for finalizing verification process
   * @param verificationData The verification data
   * @returns The verification response or null if the operation fails
   */
  const completeVerificationHandler = useCallback(async (verificationData: { accountId: string, verificationMethod: BankAccountVerificationMethod, verificationData: any }): Promise<VerificationResponse | null> => {
    try {
      // Dispatch the completeAccountVerification thunk action
      const result = await dispatch(completeAccountVerification(verificationData));
      if (completeAccountVerification.fulfilled.match(result)) {
        success('Verification completed successfully!');
        await fetchBankAccountsHandler();
        return result.payload;
      } else {
        toastError('Failed to complete verification. Please try again.');
        return null;
      }
    } catch (e: any) {
      logError('Failed to complete verification', 'useBankAccount/completeVerification', e);
      toastError('Failed to complete verification. Please try again.');
      return null;
    }
  }, [dispatch, success, toastError, fetchBankAccountsHandler]);

  /**
   * Function for confirming micro-deposit amounts
   * @param accountId The ID of the bank account to verify
   * @param depositData The micro-deposit amounts
   * @returns The verification response or null if the operation fails
   */
  const completeMicroDepositVerificationHandler = useCallback(async (accountId: string, depositData: MicroDepositVerificationData): Promise<VerificationResponse | null> => {
    try {
      // Dispatch the completeMicroDepositVerification thunk action
      const result = await dispatch(completeMicroDepositVerification({ accountId, depositData }));
      if (completeMicroDepositVerification.fulfilled.match(result)) {
        success('Micro-deposit verification completed successfully!');
        await fetchBankAccountsHandler();
        return result.payload;
      } else {
        toastError('Failed to complete micro-deposit verification. Please try again.');
        return null;
      }
    } catch (e: any) {
      logError('Failed to complete micro-deposit verification', 'useBankAccount/completeMicroDepositVerification', e);
      toastError('Failed to complete micro-deposit verification. Please try again.');
      return null;
    }
  }, [dispatch, success, toastError, fetchBankAccountsHandler]);

  /**
   * Function to set the current page in the bank account list
   * @param page The page number to set
   */
  const setPageHandler = useCallback((page: number) => {
    dispatch(bankAccountActions.setCurrentPage(page));
  }, [dispatch]);

  /**
   * Function to set the page size in the bank account list
   * @param pageSize The page size to set
   */
  const setPageSizeHandler = useCallback((pageSize: number) => {
    dispatch(bankAccountActions.setPageSize(pageSize));
  }, [dispatch]);

  /**
   * Function to refresh the bank accounts list
   */
  const refreshBankAccountsHandler = useCallback(async () => {
    await fetchBankAccountsHandler();
  }, [fetchBankAccountsHandler]);

  /**
   * Function to clear the error message
   */
  const clearErrorHandler = useCallback(() => {
    dispatch(bankAccountActions.clearBankAccountError());
  }, [dispatch]);

  // Load bank accounts when component mounts or merchantId changes
  useEffect(() => {
    if (user?.merchantId) {
      fetchBankAccountsHandler();
    }
    return () => {
      dispatch(bankAccountActions.resetBankAccountState());
    };
  }, [user?.merchantId, fetchBankAccountsHandler, dispatch]);

  // Return bank account state and operations in an object
  return {
    bankAccounts,
    loading,
    error,
    totalAccounts: pagination.totalItems,
    currentPage: pagination.currentPage,
    pageSize: pagination.pageSize,
    defaultBankAccount,
    fetchBankAccounts: fetchBankAccountsHandler,
    fetchBankAccountById: fetchBankAccountByIdHandler,
    createBankAccount: createBankAccountHandler,
    updateBankAccount: updateBankAccountHandler,
    deleteBankAccount: deleteBankAccountHandler,
    setAsDefaultBankAccount: setAsDefaultBankAccountHandler,
    initiateVerification: initiateVerificationHandler,
    checkVerificationStatus: checkVerificationStatusHandler,
    completeVerification: completeVerificationHandler,
    completeMicroDepositVerification: completeMicroDepositVerificationHandler,
    setPage: setPageHandler,
    setPageSize: setPageSizeHandler,
    refreshBankAccounts: refreshBankAccountsHandler,
    clearError: clearErrorHandler,
  };
};

export default useBankAccount;