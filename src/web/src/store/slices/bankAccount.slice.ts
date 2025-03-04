# src/web/src/store/slices/bankAccount.slice.ts
```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // @reduxjs/toolkit ^1.9.5
import {
  BankAccount,
  BankAccountCreationRequest,
  BankAccountUpdateRequest,
  BankAccountListParams,
  BankAccountsListResponse,
  BankAccountVerificationMethod,
  BankAccountVerificationRequest,
  VerificationResponse,
  MicroDepositVerificationData,
} from '../../types/bank-account.types';
import bankAccountApi from '../../services/api/bank-account.api';
import { RootState } from '../store';

/**
 * Interface for bank account state in Redux store
 */
interface BankAccountState {
  /** List of bank accounts */
  accounts: BankAccount[];
  /** Loading state for async operations */
  loading: boolean;
  /** Error message if any operation failed */
  error: string | null;
  /** Current page in paginated list */
  currentPage: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of bank accounts */
  totalItems: number;
    /** Total number of pages */
  totalPages: number;
  /** Current verification process data */
  currentVerification: VerificationResponse | null;
}

/**
 * Initial state for the bank account slice
 */
const initialState: BankAccountState = {
  accounts: [],
  loading: false,
  error: null,
  currentPage: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 0,
  currentVerification: null,
};

/**
 * Async thunk for fetching a paginated list of bank accounts
 * @param params - BankAccountListParams
 * @returns Promise resolving to paginated bank accounts response
 */
export const fetchBankAccounts = createAsyncThunk<
  BankAccountsListResponse,
  BankAccountListParams
>(
  'bankAccount/fetchBankAccounts',
  async (params: BankAccountListParams) => {
    try {
      // Call bankAccountApi.getBankAccounts with the provided parameters
      const response = await bankAccountApi.getBankAccounts(params);
      // Return the response data on success
      return response.data;
    } catch (error: any) {
      // Handle and throw any errors that occur during the API call
      throw error.message;
    }
  }
);

/**
 * Async thunk for fetching a specific bank account by ID
 * @param accountId - string
 * @returns Promise resolving to bank account data
 */
export const fetchBankAccountById = createAsyncThunk<
  BankAccount,
  string
>(
  'bankAccount/fetchBankAccountById',
  async (accountId: string) => {
    try {
      // Call bankAccountApi.getBankAccountById with the provided account ID
      const response = await bankAccountApi.getBankAccountById(accountId);
      // Return the response data on success
      return response.data;
    } catch (error: any) {
      // Handle and throw any errors that occur during the API call
      throw error.message;
    }
  }
);

/**
 * Async thunk for creating a new bank account
 * @param accountData - BankAccountCreationRequest
 * @returns Promise resolving to created bank account data
 */
export const createBankAccount = createAsyncThunk<
  BankAccount,
  BankAccountCreationRequest
>(
  'bankAccount/createBankAccount',
  async (accountData: BankAccountCreationRequest) => {
    try {
      // Call bankAccountApi.createBankAccount with the provided account data
      const response = await bankAccountApi.createBankAccount(accountData);
      // Return the response data on success
      return response.data;
    } catch (error: any) {
      // Handle and throw any errors that occur during the API call
      throw error.message;
    }
  }
);

/**
 * Async thunk for updating an existing bank account
 * @param {accountId: string, accountData: BankAccountUpdateRequest} - {accountId: string, accountData: BankAccountUpdateRequest}
 * @returns Promise resolving to updated bank account data
 */
export const updateBankAccount = createAsyncThunk<
  BankAccount,
  { accountId: string; accountData: BankAccountUpdateRequest }
>(
  'bankAccount/updateBankAccount',
  async ({ accountId, accountData }: { accountId: string; accountData: BankAccountUpdateRequest }) => {
    try {
      // Destructure accountId and accountData from the payload
      // Call bankAccountApi.updateBankAccount with the account ID and update data
      const response = await bankAccountApi.updateBankAccount(accountId, accountData);
      // Return the response data on success
      return response.data;
    } catch (error: any) {
      // Handle and throw any errors that occur during the API call
      throw error.message;
    }
  }
);

/**
 * Async thunk for deleting a bank account
 * @param accountId - string
 * @returns Promise resolving to success status and deleted account ID
 */
export const deleteBankAccount = createAsyncThunk<
  { success: boolean; accountId: string },
  string
>(
  'bankAccount/deleteBankAccount',
  async (accountId: string) => {
    try {
      // Call bankAccountApi.deleteBankAccount with the provided account ID
      await bankAccountApi.deleteBankAccount(accountId);
      // Return a success response with the account ID on success
      return { success: true, accountId };
    } catch (error: any) {
      // Handle and throw any errors that occur during the API call
      throw error.message;
    }
  }
);

/**
 * Async thunk for setting a bank account as default
 * @param accountId - string
 * @returns Promise resolving to updated bank account data
 */
export const setDefaultBankAccount = createAsyncThunk<
  BankAccount,
  string
>(
  'bankAccount/setDefaultBankAccount',
  async (accountId: string) => {
    try {
      // Call bankAccountApi.setDefaultBankAccount with the provided account ID
      const response = await bankAccountApi.setDefaultBankAccount(accountId);
      // Return the response data on success
      return response.data;
    } catch (error: any) {
      // Handle and throw any errors that occur during the API call
      throw error.message;
    }
  }
);

/**
 * Async thunk for initiating bank account verification
 * @param {accountId: string, method: BankAccountVerificationMethod} - {accountId: string, method: BankAccountVerificationMethod}
 * @returns Promise resolving to verification response data
 */
export const initiateAccountVerification = createAsyncThunk<
  VerificationResponse,
  { accountId: string; method: BankAccountVerificationMethod }
>(
  'bankAccount/initiateAccountVerification',
  async ({ accountId, method }: { accountId: string; method: BankAccountVerificationMethod }) => {
    try {
      // Destructure accountId and method from the payload
      // Call bankAccountApi.initiateVerification with the account ID and verification method
      const response = await bankAccountApi.initiateVerification(accountId, method);
      // Return the response data on success
      return response.data;
    } catch (error: any) {
      // Handle and throw any errors that occur during the API call
      throw error.message;
    }
  }
);

/**
 * Async thunk for checking the verification status of a bank account
 * @param accountId - string
 * @returns Promise resolving to verification status data
 */
export const getAccountVerificationStatus = createAsyncThunk<
  VerificationResponse,
  string
>(
  'bankAccount/getAccountVerificationStatus',
  async (accountId: string) => {
    try {
      // Call bankAccountApi.getVerificationStatus with the provided account ID
      const response = await bankAccountApi.getVerificationStatus(accountId);
      // Return the response data on success
      return response.data;
    } catch (error: any) {
      // Handle and throw any errors that occur during the API call
      throw error.message;
    }
  }
);

/**
 * Async thunk for completing bank account verification
 * @param verificationData - BankAccountVerificationRequest
 * @returns Promise resolving to verification completion data
 */
export const completeAccountVerification = createAsyncThunk<
  VerificationResponse,
  BankAccountVerificationRequest
>(
  'bankAccount/completeAccountVerification',
  async (verificationData: BankAccountVerificationRequest) => {
    try {
      // Call bankAccountApi.completeVerification with the provided verification data
      const response = await bankAccountApi.completeVerification(verificationData);
      // Return the response data on success
      return response.data;
    } catch (error: any) {
      // Handle and throw any errors that occur during the API call
      throw error.message;
    }
  }
);

/**
 * Async thunk for completing micro-deposit verification
 * @param {accountId: string, depositData: MicroDepositVerificationData} - {accountId: string, depositData: MicroDepositVerificationData}
 * @returns Promise resolving to verification completion data
 */
export const completeMicroDepositVerification = createAsyncThunk<
  VerificationResponse,
  { accountId: string; depositData: MicroDepositVerificationData }
>(
  'bankAccount/completeMicroDepositVerification',
  async ({ accountId, depositData }: { accountId: string; depositData: MicroDepositVerificationData }) => {
    try {
      // Destructure accountId and depositData from the payload
      // Call bankAccountApi.completeMicroDepositVerification with the account ID and deposit data
      const response = await bankAccountApi.completeMicroDepositVerification(accountId, depositData);
      // Return the response data on success
      return response.data;
    } catch (error: any) {
      // Handle and throw any errors that occur during the API call
      throw error.message;
    }
  }
);

/**
 * Creating bankAccountSlice to manage bank account related states
 */
export const bankAccountSlice = createSlice({
  name: 'bankAccount',
  initialState,
  reducers: {
    /**
     * Reducer to set the current page
     * @param state - The current state
     * @param action - PayloadAction<number>
     */
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    /**
     * Reducer to set the page size
     * @param state - The current state
     * @param action - PayloadAction<number>
     */
    setPageSize: (state, action: PayloadAction<number>) => {
      state.pageSize = action.payload;
    },
    /**
     * Reducer to clear the bank account error
     * @param state - The current state
     */
    clearBankAccountError: (state) => {
      state.error = null;
    },
    /**
     * Reducer to reset the bank account state
     * @param state - The current state
     */
    resetBankAccountState: (state) => {
      state.accounts = [];
      state.loading = false;
      state.error = null;
      state.currentPage = 1;
      state.pageSize = 10;
      state.totalItems = 0;
      state.totalPages = 0;
      state.currentVerification = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBankAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBankAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts = action.payload.items;
        state.totalItems = action.payload.totalItems;
        state.pageSize = action.payload.pageSize;
        state.currentPage = action.payload.page;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchBankAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error as string;
      })
      .addCase(fetchBankAccountById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBankAccountById.fulfilled, (state, action) => {
        state.loading = false;
      })
      .addCase(fetchBankAccountById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error as string;
      })
      .addCase(createBankAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBankAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts = [...state.accounts, action.payload];
      })
      .addCase(createBankAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error as string;
      })
      .addCase(updateBankAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBankAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts = state.accounts.map((account) =>
          account.accountId === action.payload.accountId ? action.payload : account
        );
      })
      .addCase(updateBankAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error as string;
      })
      .addCase(deleteBankAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBankAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts = state.accounts.filter(
          (account) => account.accountId !== action.payload.accountId
        );
      })
      .addCase(deleteBankAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error as string;
      })
      .addCase(setDefaultBankAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(setDefaultBankAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts = state.accounts.map((account) => ({
          ...account,
          isDefault: account.accountId === action.payload.accountId,
        }));
      })
      .addCase(setDefaultBankAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error as string;
      })
      .addCase(initiateAccountVerification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initiateAccountVerification.fulfilled, (state, action) => {
        state.loading = false;
        state.currentVerification = action.payload;
      })
      .addCase(initiateAccountVerification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error as string;
      })
      .addCase(getAccountVerificationStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAccountVerificationStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.currentVerification = action.payload;
      })
      .addCase(getAccountVerificationStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error as string;
      })
       .addCase(completeAccountVerification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(completeAccountVerification.fulfilled, (state, action) => {
        state.loading = false;
        state.currentVerification = action.payload;
      })
      .addCase(completeAccountVerification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error as string;
      })
       .addCase(completeMicroDepositVerification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(completeMicroDepositVerification.fulfilled, (state, action) => {
        state.loading = false;
        state.currentVerification = action.payload;
      })
      .addCase(completeMicroDepositVerification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error as string;
      });
  },
});

/**
 * Extract the actions from the slice
 */
export const bankAccountActions = {
  ...bankAccountSlice.actions,
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
};

/**
 * Selectors
 */
/**
 * Selector for retrieving bank accounts from state
 * @param state - RootState
 * @returns Array of bank accounts
 */
export const selectBankAccounts = (state: RootState): BankAccount[] =>
  state.bankAccount.accounts;

/**
 * Selector for finding a specific bank account by ID
 * @param state - RootState
 * @param accountId - string | undefined
 * @returns Bank account if found, undefined otherwise
 */
export const selectBankAccountById = (
  state: RootState,
  accountId: string | undefined
): BankAccount | undefined => {
  if (!accountId) return undefined;
  return state.bankAccount.accounts.find((account) => account.accountId === accountId);
};

/**
 * Selector for retrieving the default bank account
 * @param state - RootState
 * @returns Default bank account if exists, undefined otherwise
 */
export const selectDefaultBankAccount = (state: RootState): BankAccount | undefined =>
  state.bankAccount.accounts.find((account) => account.isDefault);

/**
 * Selector for retrieving loading state
 * @param state - RootState
 * @returns Current loading state
 */
export const selectBankAccountsLoading = (state: RootState): boolean =>
  state.bankAccount.loading;

/**
 * Selector for retrieving error state
 * @param state - RootState
 * @returns Current error message or null
 */
export const selectBankAccountsError = (state: RootState): string | null =>
  state.bankAccount.error;

/**
 * Selector for retrieving pagination state
 * @param state - RootState
 * @returns Pagination data including page, pageSize, and totalItems
 */
export const selectBankAccountsPagination = (state: RootState): any => ({
  currentPage: state.bankAccount.currentPage,
  pageSize: state.bankAccount.pageSize,
  totalItems: state.bankAccount.totalItems,
  totalPages: state.bankAccount.totalPages,
});

/**
 * Export the reducer as the default export
 */
export default bankAccountSlice.reducer;