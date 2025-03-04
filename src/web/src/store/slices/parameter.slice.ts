# src/web/src/store/slices/parameter.slice.ts
```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // @reduxjs/toolkit ^1.9.5
import parameterApi from '../../services/api/parameter.api';
import { 
  Parameter, 
  ParameterDefinition, 
  ParameterCreateRequest, 
  ParameterUpdateRequest, 
  ParameterListParams,
  ParameterInheritanceList,
  ResolvedParameter,
  EntityType
} from '../../types/parameter.types';
import { RootState } from '../store';

/**
 * Interface defining the state structure for the parameter slice
 */
interface ParameterState {
  parameters: Parameter[];
  parameterDefinitions: ParameterDefinition[];
  currentParameter: Parameter | null;
  parameterInheritance: ParameterInheritanceList | null;
  resolvedParameter: ResolvedParameter | null;
  loading: boolean;
  error: string | null;
  totalItems: number;
}

/**
 * Initial state for the parameter slice
 */
const initialState: ParameterState = {
  parameters: [],
  parameterDefinitions: [],
  currentParameter: null,
  parameterInheritance: null,
  resolvedParameter: null,
  loading: false,
  error: null,
  totalItems: 0,
};

/**
 * Async thunk for fetching a paginated list of parameters
 * @param params Query parameters for filtering and pagination
 * @returns Promise resolving to parameters list and total count
 */
export const fetchParametersThunk = createAsyncThunk<
  { parameters: Parameter[]; totalItems: number },
  ParameterListParams
>(
  'parameter/fetchParameters',
  async (params: ParameterListParams, { rejectWithValue }) => {
    try {
      const response = await parameterApi.getParameters(params);
      if (response.success) {
        return {
          parameters: response.data.items,
          totalItems: response.data.totalItems,
        };
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch parameters');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch parameters');
    }
  }
);

/**
 * Async thunk for fetching a specific parameter by name
 * @param { parameterName: string, entityType: EntityType, entityId: string } Parameter identifier information
 * @returns Promise resolving to the requested parameter
 */
export const getParameterByNameThunk = createAsyncThunk<
  Parameter,
  { parameterName: string; entityType: EntityType; entityId: string }
>(
  'parameter/getParameterByName',
  async (args: { parameterName: string; entityType: EntityType; entityId: string }, { rejectWithValue }) => {
    try {
      const { parameterName, entityType, entityId } = args;
      const response = await parameterApi.getParameterByName(parameterName, entityType, entityId);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch parameter');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch parameter');
    }
  }
);

/**
 * Async thunk for creating a new parameter
 * @param {ParameterCreateRequest} Parameter creation data
 * @returns Promise resolving to the created parameter
 */
export const createParameterThunk = createAsyncThunk<
  Parameter,
  ParameterCreateRequest
>(
  'parameter/createParameter',
  async (request: ParameterCreateRequest, { rejectWithValue }) => {
    try {
      const response = await parameterApi.createParameter(request);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to create parameter');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create parameter');
    }
  }
);

/**
 * Async thunk for updating an existing parameter
 * @param { parameterName: string, entityType: EntityType, entityId: string, request: ParameterUpdateRequest } Parameter update information
 * @returns Promise resolving to the updated parameter
 */
export const updateParameterThunk = createAsyncThunk<
  Parameter,
  { parameterName: string; entityType: EntityType; entityId: string; request: ParameterUpdateRequest }
>(
  'parameter/updateParameter',
  async (args: { parameterName: string; entityType: EntityType; entityId: string; request: ParameterUpdateRequest }, { rejectWithValue }) => {
    try {
      const { parameterName, entityType, entityId, request } = args;
      const response = await parameterApi.updateParameter(parameterName, entityType, entityId, request);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to update parameter');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update parameter');
    }
  }
);

/**
 * Async thunk for deleting a parameter
 * @param { parameterName: string, entityType: EntityType, entityId: string } Parameter identifier information
 * @returns Promise resolving when parameter is deleted
 */
export const deleteParameterThunk = createAsyncThunk<
  void,
  { parameterName: string; entityType: EntityType; entityId: string }
>(
  'parameter/deleteParameter',
  async (args: { parameterName: string; entityType: EntityType; entityId: string }, { rejectWithValue }) => {
    try {
      const { parameterName, entityType, entityId } = args;
      const response = await parameterApi.deleteParameter(parameterName, entityType, entityId);
      if (response.success) {
        return;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to delete parameter');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete parameter');
    }
  }
);

/**
 * Async thunk for fetching parameter inheritance hierarchy
 * @param { entityType: EntityType, entityId: string } Entity identifier information
 * @returns Promise resolving to inheritance hierarchy
 */
export const getParameterInheritanceThunk = createAsyncThunk<
  ParameterInheritanceList,
  { entityType: EntityType; entityId: string }
>(
  'parameter/getParameterInheritance',
  async (args: { entityType: EntityType; entityId: string }, { rejectWithValue }) => {
    try {
      const { entityType, entityId } = args;
      const response = await parameterApi.getParameterInheritance(entityType, entityId);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch parameter inheritance');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch parameter inheritance');
    }
  }
);

/**
 * Async thunk for fetching all parameter definitions
 * @returns Promise resolving to parameter definitions list
 */
export const getParameterDefinitionsThunk = createAsyncThunk<
  ParameterDefinition[]
>(
  'parameter/getParameterDefinitions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await parameterApi.getParameterDefinitions();
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch parameter definitions');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch parameter definitions');
    }
  }
);

/**
 * Async thunk for resolving a parameter with its inheritance chain
 * @param { parameterName: string, entityType: EntityType, entityId: string } Parameter identifier information
 * @returns Promise resolving to the resolved parameter with inheritance chain
 */
export const resolveParameterThunk = createAsyncThunk<
  ResolvedParameter,
  { parameterName: string; entityType: EntityType; entityId: string }
>(
  'parameter/resolveParameter',
  async (args: { parameterName: string; entityType: EntityType; entityId: string }, { rejectWithValue }) => {
    try {
      const { parameterName, entityType, entityId } = args;
      const response = await parameterApi.resolveParameter(parameterName, entityType, entityId);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to resolve parameter');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to resolve parameter');
    }
  }
);

/**
 * Redux slice for managing parameter state
 */
export const parameterSlice = createSlice({
  name: 'parameter',
  initialState,
  reducers: {
    /**
     * Reducer for setting the parameters list
     * @param {Parameter[]} parameters - The parameters list
     */
    setParameters: (state, action: PayloadAction<Parameter[]>) => {
      state.parameters = action.payload;
    },
    /**
     * Reducer for setting the current parameter
     * @param {Parameter | null} parameter - The current parameter or null
     */
    setCurrentParameter: (state, action: PayloadAction<Parameter | null>) => {
      state.currentParameter = action.payload;
    },
    /**
     * Reducer for setting the parameter definitions list
     * @param {ParameterDefinition[]} parameterDefinitions - The parameter definitions list
     */
    setParameterDefinitions: (state, action: PayloadAction<ParameterDefinition[]>) => {
      state.parameterDefinitions = action.payload;
    },
    /**
     * Reducer for setting the parameter inheritance
     * @param {ParameterInheritanceList | null} parameterInheritance - The parameter inheritance hierarchy or null
     */
    setParameterInheritance: (state, action: PayloadAction<ParameterInheritanceList | null>) => {
      state.parameterInheritance = action.payload;
    },
    /**
     * Reducer for setting the resolved parameter
     * @param {ResolvedParameter | null} resolvedParameter - The resolved parameter with inheritance chain or null
     */
    setResolvedParameter: (state, action: PayloadAction<ResolvedParameter | null>) => {
      state.resolvedParameter = action.payload;
    },
    /**
     * Reducer for setting the loading state
     * @param {boolean} loading - The loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    /**
     * Reducer for setting the error state
     * @param {string | null} error - The error message or null
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    /**
     * Reducer for clearing the parameter state
     */
    clearParameterState: (state) => {
      state.parameters = [];
      state.parameterDefinitions = [];
      state.currentParameter = null;
      state.parameterInheritance = null;
      state.resolvedParameter = null;
      state.loading = false;
      state.error = null;
      state.totalItems = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchParametersThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchParametersThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.parameters = action.payload.parameters;
        state.totalItems = action.payload.totalItems;
      })
      .addCase(fetchParametersThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to fetch parameters';
      })
      .addCase(getParameterByNameThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getParameterByNameThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.currentParameter = action.payload;
      })
      .addCase(getParameterByNameThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to fetch parameter by name';
      })
      .addCase(createParameterThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createParameterThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.parameters.push(action.payload);
      })
      .addCase(createParameterThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to create parameter';
      })
      .addCase(updateParameterThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateParameterThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.currentParameter = action.payload;
        state.parameters = state.parameters.map(parameter =>
          parameter.id === action.payload.id ? action.payload : parameter
        );
      })
      .addCase(updateParameterThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to update parameter';
      })
      .addCase(deleteParameterThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteParameterThunk.fulfilled, (state, action) => {
        state.loading = false;
        // Consider updating the parameters list after deletion if needed
      })
      .addCase(deleteParameterThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to delete parameter';
      })
      .addCase(getParameterInheritanceThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getParameterInheritanceThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.parameterInheritance = action.payload;
      })
      .addCase(getParameterInheritanceThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to fetch parameter inheritance';
      })
      .addCase(getParameterDefinitionsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getParameterDefinitionsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.parameterDefinitions = action.payload;
      })
      .addCase(getParameterDefinitionsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to fetch parameter definitions';
      })
       .addCase(resolveParameterThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resolveParameterThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.resolvedParameter = action.payload;
      })
      .addCase(resolveParameterThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to resolve parameter';
      });
  },
});

// Extract actions
export const parameterActions = {
  ...parameterSlice.actions,
  fetchParametersThunk,
  getParameterByNameThunk,
  createParameterThunk,
  updateParameterThunk,
  deleteParameterThunk,
  getParameterInheritanceThunk,
  getParameterDefinitionsThunk,
  resolveParameterThunk,
};

// Extract individual actions for direct use
export const { 
  setParameters, 
  setCurrentParameter,
  setParameterDefinitions,
  setParameterInheritance,
  setResolvedParameter,
  setLoading, 
  setError,
  clearParameterState
} = parameterSlice.actions;

// Selectors
export const selectParameters = (state: RootState): Parameter[] => state.parameter.parameters;
export const selectParameterDefinitions = (state: RootState): ParameterDefinition[] => state.parameter.parameterDefinitions;
export const selectCurrentParameter = (state: RootState): Parameter | null => state.parameter.currentParameter;
export const selectParameterInheritance = (state: RootState): ParameterInheritanceList | null => state.parameter.parameterInheritance;
export const selectResolvedParameter = (state: RootState): ResolvedParameter | null => state.parameter.resolvedParameter;
export const selectParameterLoading = (state: RootState): boolean => state.parameter.loading;
export const selectParameterError = (state: RootState): string | null => state.parameter.error;
export const selectTotalParameters = (state: RootState): number => state.parameter.totalItems;

// Export the reducer as default
export default parameterSlice.reducer;