import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Refund, RefundSummary, TransactionSummary } from '../../types/refund.types';
import { REFUND_ENDPOINTS } from '../../constants/api.constants';
import { 
  RefundFilterParams, 
  CreateRefundRequest, 
  UpdateRefundRequest, 
  CancelRefundRequest, 
  PaginatedResponse,
  RefundStatistics
} from '../../types/api.types';

// Define the state structure
export interface RefundState {
  refunds: RefundSummary[];
  currentRefund: Refund | null;
  currentTransaction: TransactionSummary | null;
  statistics: RefundStatistics | null;
  pagination: {
    totalItems: number;
    pageSize: number;
    page: number;
    totalPages: number;
  };
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: RefundState = {
  refunds: [],
  currentRefund: null,
  currentTransaction: null,
  statistics: null,
  pagination: {
    totalItems: 0,
    pageSize: 10,
    page: 1,
    totalPages: 0
  },
  loading: false,
  error: null
};

// Async thunks for API operations
export const fetchRefunds = createAsyncThunk<PaginatedResponse<RefundSummary>, RefundFilterParams>(
  'refund/fetchRefunds',
  async (params) => {
    // Real implementation would use API service to call REFUND_ENDPOINTS.BASE
    const response = await fetch(`${REFUND_ENDPOINTS.BASE}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Add params to query string
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch refunds');
    }
    
    return await response.json();
  }
);

export const fetchRefundById = createAsyncThunk<Refund, string>(
  'refund/fetchRefundById',
  async (refundId) => {
    const response = await fetch(REFUND_ENDPOINTS.GET_BY_ID(refundId), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch refund details');
    }
    
    return await response.json();
  }
);

export const fetchTransactionForRefund = createAsyncThunk<TransactionSummary, string>(
  'refund/fetchTransactionForRefund',
  async (transactionId) => {
    const response = await fetch(REFUND_ENDPOINTS.TRANSACTION(transactionId), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch transaction details');
    }
    
    return await response.json();
  }
);

export const createRefund = createAsyncThunk<Refund, CreateRefundRequest>(
  'refund/createRefund',
  async (refundData) => {
    const response = await fetch(REFUND_ENDPOINTS.CREATE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(refundData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create refund');
    }
    
    return await response.json();
  }
);

export const updateRefund = createAsyncThunk<Refund, { refundId: string, data: UpdateRefundRequest }>(
  'refund/updateRefund',
  async ({ refundId, data }) => {
    const response = await fetch(REFUND_ENDPOINTS.UPDATE(refundId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update refund');
    }
    
    return await response.json();
  }
);

export const cancelRefund = createAsyncThunk<Refund, { refundId: string, reason: string }>(
  'refund/cancelRefund',
  async ({ refundId, reason }) => {
    const response = await fetch(REFUND_ENDPOINTS.CANCEL(refundId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason } as CancelRefundRequest)
    });
    
    if (!response.ok) {
      throw new Error('Failed to cancel refund');
    }
    
    return await response.json();
  }
);

export const fetchRefundStatistics = createAsyncThunk<RefundStatistics, Record<string, any>>(
  'refund/fetchRefundStatistics',
  async (params) => {
    // Convert params to query string
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      queryParams.append(key, String(value));
    });
    
    const response = await fetch(`${REFUND_ENDPOINTS.STATISTICS}?${queryParams.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch refund statistics');
    }
    
    return await response.json();
  }
);

// Create the refund slice
export const refundSlice = createSlice({
  name: 'refund',
  initialState,
  reducers: {
    setCurrentRefund: (state, action: PayloadAction<Refund>) => {
      state.currentRefund = action.payload;
    },
    clearCurrentRefund: (state) => {
      state.currentRefund = null;
    },
    setCurrentTransaction: (state, action: PayloadAction<TransactionSummary>) => {
      state.currentTransaction = action.payload;
    },
    clearCurrentTransaction: (state) => {
      state.currentTransaction = null;
    },
    setRefunds: (state, action: PayloadAction<RefundSummary[]>) => {
      state.refunds = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setRefundStatistics: (state, action: PayloadAction<RefundStatistics>) => {
      state.statistics = action.payload;
    }
  },
  extraReducers: (builder) => {
    // Handle fetchRefunds
    builder
      .addCase(fetchRefunds.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRefunds.fulfilled, (state, action) => {
        state.loading = false;
        state.refunds = action.payload.items;
        state.pagination = {
          totalItems: action.payload.totalItems,
          pageSize: action.payload.pageSize,
          page: action.payload.page,
          totalPages: action.payload.totalPages
        };
      })
      .addCase(fetchRefunds.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch refunds';
      });

    // Handle fetchRefundById
    builder
      .addCase(fetchRefundById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRefundById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRefund = action.payload;
      })
      .addCase(fetchRefundById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch refund details';
      });

    // Handle fetchTransactionForRefund
    builder
      .addCase(fetchTransactionForRefund.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactionForRefund.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTransaction = action.payload;
      })
      .addCase(fetchTransactionForRefund.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch transaction details';
      });

    // Handle createRefund
    builder
      .addCase(createRefund.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRefund.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRefund = action.payload;
      })
      .addCase(createRefund.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create refund';
      });

    // Handle updateRefund
    builder
      .addCase(updateRefund.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateRefund.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRefund = action.payload;
        
        // Update in the list if it exists
        const index = state.refunds.findIndex(r => r.refundId === action.payload.refundId);
        if (index !== -1) {
          // Create a summary from the detailed refund
          const summary: RefundSummary = {
            refundId: action.payload.refundId,
            transactionId: action.payload.transactionId,
            amount: action.payload.amount,
            currency: action.payload.currency,
            status: action.payload.status,
            refundMethod: action.payload.refundMethod,
            createdAt: action.payload.createdAt,
            customerName: null, // This info might not be available in the detailed refund
            reason: action.payload.reason
          };
          state.refunds[index] = summary;
        }
      })
      .addCase(updateRefund.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update refund';
      });

    // Handle cancelRefund
    builder
      .addCase(cancelRefund.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelRefund.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRefund = action.payload;
        
        // Update in the list if it exists
        const index = state.refunds.findIndex(r => r.refundId === action.payload.refundId);
        if (index !== -1) {
          // Create a summary from the detailed refund
          const summary: RefundSummary = {
            refundId: action.payload.refundId,
            transactionId: action.payload.transactionId,
            amount: action.payload.amount,
            currency: action.payload.currency,
            status: action.payload.status,
            refundMethod: action.payload.refundMethod,
            createdAt: action.payload.createdAt,
            customerName: null, // This info might not be available in the detailed refund
            reason: action.payload.reason
          };
          state.refunds[index] = summary;
        }
      })
      .addCase(cancelRefund.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to cancel refund';
      });

    // Handle fetchRefundStatistics
    builder
      .addCase(fetchRefundStatistics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRefundStatistics.fulfilled, (state, action) => {
        state.loading = false;
        state.statistics = action.payload;
      })
      .addCase(fetchRefundStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch refund statistics';
      });
  }
});

// Export actions
export const refundActions = refundSlice.actions;

// Export reducer
export default refundSlice.reducer;