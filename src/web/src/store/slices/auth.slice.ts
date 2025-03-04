import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, AuthState, LoginRequest, MfaRequest } from '../../types/user.types';
import authService from '../../services/auth/auth.service';

/**
 * Initial state for the authentication slice
 */
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null
};

/**
 * Async thunk for handling user login through Auth0
 * Note: This will redirect to Auth0 and won't actually return
 */
export const login = createAsyncThunk<void, LoginRequest>(
  'auth/login',
  async (loginRequest, { rejectWithValue }) => {
    try {
      await authService.login(loginRequest);
      // This won't execute due to Auth0 redirect
      return;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Login failed'
      );
    }
  }
);

/**
 * Async thunk for handling user logout
 * Note: This will redirect to logout URL and won't actually return
 */
export const logout = createAsyncThunk<void, void>(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
      // This won't execute due to Auth0 redirect
      return;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Logout failed'
      );
    }
  }
);

/**
 * Async thunk for processing Auth0 redirect callback after authentication
 */
export const handleRedirectCallback = createAsyncThunk<
  { user: User; token: string; requiresMfa: boolean },
  void
>(
  'auth/handleRedirectCallback',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.handleRedirectCallback();
      return {
        user: response.user,
        token: response.token,
        requiresMfa: response.requiresMfa
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Authentication callback failed'
      );
    }
  }
);

/**
 * Async thunk for handling multi-factor authentication challenges
 */
export const handleMfaChallenge = createAsyncThunk<
  { user: User; token: string },
  MfaRequest
>(
  'auth/handleMfaChallenge',
  async (mfaRequest, { rejectWithValue }) => {
    try {
      const response = await authService.handleMfaChallenge(mfaRequest);
      return {
        user: response.user,
        token: response.token
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'MFA verification failed'
      );
    }
  }
);

/**
 * Async thunk for refreshing the authentication token
 */
export const refreshToken = createAsyncThunk<string | null, void>(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = await authService.renewToken();
      return token;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Token refresh failed'
      );
    }
  }
);

/**
 * Redux slice for authentication state
 */
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Reducer for setting user data
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    // Reducer for setting authentication token
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    // Reducer for clearing authentication errors
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Handle login action states
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state) => {
        // This won't execute due to Auth0 redirect
        state.loading = false;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Login failed';
      });

    // Handle logout action states
    builder
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        // Reset auth state to initial values
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.loading = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Logout failed';
      });

    // Handle redirect callback action states
    builder
      .addCase(handleRedirectCallback.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(handleRedirectCallback.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        // Only set authenticated if MFA is not required
        state.isAuthenticated = !action.payload.requiresMfa;
      })
      .addCase(handleRedirectCallback.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Authentication callback failed';
      });

    // Handle MFA challenge action states
    builder
      .addCase(handleMfaChallenge.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(handleMfaChallenge.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(handleMfaChallenge.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'MFA verification failed';
      });

    // Handle token refresh action states
    builder
      .addCase(refreshToken.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.token = action.payload;
        } else {
          // If token refresh fails with null, we should log the user out
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
        }
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Token refresh failed';
        // Invalid token usually means the user needs to log in again
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      });
  }
});

// Export actions
export const { setUser, setToken, clearError } = authSlice.actions;

// Export the reducer as default
export default authSlice.reducer;