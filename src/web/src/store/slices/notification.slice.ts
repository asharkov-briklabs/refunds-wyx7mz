# src/web/src/store/slices/notification.slice.ts
```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // @reduxjs/toolkit ^1.9.5
import notificationApi from '../../services/api/notification.api';
import { Notification, NotificationPreference, NotificationFilter } from '../../types/notification.types';
import { RootState } from '../store';

/**
 * Interface defining the state structure for notifications
 */
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  preferences: NotificationPreference[];
}

/**
 * Initial state for the notification slice
 */
const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  preferences: []
};

/**
 * Creates an async thunk for fetching notifications with optional filters
 */
export const fetchNotifications = createAsyncThunk<Notification[], NotificationFilter | undefined>(
  'notification/fetchNotifications',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await notificationApi.getNotifications(filters);
      if (response.success && response.data?.items) {
        return response.data.items;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch notifications');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch notifications');
    }
  }
);

/**
 * Creates an async thunk for marking notifications as read
 */
export const markNotificationsAsRead = createAsyncThunk<void, string[]>(
  'notification/markNotificationsAsRead',
  async (notificationIds, { rejectWithValue, dispatch }) => {
    try {
      const response = await notificationApi.markAsRead(notificationIds);
      if (response.success) {
        // After marking as read, update the unread count
        dispatch(fetchUnreadCount());
      } else {
        return rejectWithValue(response.error?.message || 'Failed to mark notifications as read');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark notifications as read');
    }
  }
);

/**
 * Creates an async thunk for fetching the unread notification count
 */
export const fetchUnreadCount = createAsyncThunk<number>(
  'notification/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationApi.getUnreadCount();
      if (response.success && response.data) {
        return response.data.count;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch unread count');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch unread count');
    }
  }
);

/**
 * Creates an async thunk for fetching notification preferences
 */
export const fetchNotificationPreferences = createAsyncThunk<NotificationPreference[]>(
  'notification/fetchNotificationPreferences',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationApi.getNotificationPreferences();
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch notification preferences');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch notification preferences');
    }
  }
);

/**
 * Creates an async thunk for updating notification preferences
 */
export const updateNotificationPreferences = createAsyncThunk<NotificationPreference[], NotificationPreference[]>(
  'notification/updateNotificationPreferences',
  async (preferences, { rejectWithValue }) => {
    try {
      const response = await notificationApi.updateNotificationPreferences(preferences);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to update notification preferences');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update notification preferences');
    }
  }
);

/**
 * Creates an async thunk for dismissing all notifications
 */
export const dismissAllNotifications = createAsyncThunk<void>(
  'notification/dismissAllNotifications',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const response = await notificationApi.dismissAll();
      if (response.success) {
        dispatch(fetchUnreadCount());
      } else {
        return rejectWithValue(response.error?.message || 'Failed to dismiss all notifications');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to dismiss all notifications');
    }
  }
);

/**
 * Creates a Redux Toolkit slice for managing notification state
 */
const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    /**
     * Reducer for setting notifications
     */
    setNotifications: (state, action: PayloadAction<Notification[]>) => {
      state.notifications = action.payload;
    },
    /**
     * Reducer for adding a single notification
     */
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications = [action.payload, ...state.notifications];
      state.unreadCount += 1;
    },
    /**
     * Reducer for updating a notification
     */
    updateNotification: (state, action: PayloadAction<Notification>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload.id);
      if (index !== -1) {
        state.notifications[index] = action.payload;
      }
    },
    /**
     * Reducer for removing a notification
     */
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    /**
     * Reducer for setting the unread notification count
     */
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    /**
     * Reducer for setting notification preferences
     */
    setPreferences: (state, action: PayloadAction<NotificationPreference[]>) => {
      state.preferences = action.payload;
    },
    /**
     * Reducer for setting the loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    /**
     * Reducer for resetting the notification state
     */
    resetNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
      state.loading = false;
      state.error = null;
      state.preferences = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to fetch notifications';
      })
      .addCase(markNotificationsAsRead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markNotificationsAsRead.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(markNotificationsAsRead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to mark notifications as read';
      })
      .addCase(fetchUnreadCount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.loading = false;
        state.unreadCount = action.payload;
      })
      .addCase(fetchUnreadCount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to fetch unread count';
      })
      .addCase(fetchNotificationPreferences.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotificationPreferences.fulfilled, (state, action) => {
        state.loading = false;
        state.preferences = action.payload;
      })
      .addCase(fetchNotificationPreferences.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to fetch notification preferences';
      })
      .addCase(updateNotificationPreferences.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateNotificationPreferences.fulfilled, (state, action) => {
        state.loading = false;
        state.preferences = action.payload;
      })
      .addCase(updateNotificationPreferences.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to update notification preferences';
      })
      .addCase(dismissAllNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(dismissAllNotifications.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(dismissAllNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to dismiss all notifications';
      });
  },
});

// Extract actions and reducer
export const { 
  setNotifications,
  addNotification,
  updateNotification,
  removeNotification,
  setUnreadCount,
  setPreferences,
  setLoading,
  resetNotifications
} = notificationSlice.actions;

// Selectors
export const selectNotifications = (state: RootState): Notification[] => state.notification.notifications;
export const selectUnreadCount = (state: RootState): number => state.notification.unreadCount;
export const selectIsLoadingNotifications = (state: RootState): boolean => state.notification.loading;
export const selectNotificationPreferences = (state: RootState): NotificationPreference[] => state.notification.preferences;

// Export the reducer
export const notificationReducer = notificationSlice.reducer;

// Export all actions as a single object
export const notificationActions = {
  setNotifications,
  addNotification,
  updateNotification,
  removeNotification,
  setUnreadCount,
  setPreferences,
  setLoading,
  resetNotifications,
  fetchNotifications,
  markNotificationsAsRead,
  fetchUnreadCount,
  fetchNotificationPreferences,
  updateNotificationPreferences,
  dismissAllNotifications
};