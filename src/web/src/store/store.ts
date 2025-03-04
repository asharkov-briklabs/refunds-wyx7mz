import { configureStore } from '@reduxjs/toolkit'; // @reduxjs/toolkit ^1.9.5
import uiReducer from './slices/ui.slice';
import authReducer from './slices/auth.slice';
import refundReducer from './slices/refund.slice';
import reportReducer from './slices/report.slice';
import apiMiddleware from './middleware/api.middleware';
import loggerMiddleware from './middleware/logger.middleware';

/**
 * Reducer for bank account state implemented locally to eliminate circular dependency
 */
function bankAccountReducer(state: any = {
  accounts: [],
  selectedAccount: null,
  loading: false,
  error: null
}, action: any) {
  switch (action.type) {
    case 'bankAccount/setAccounts':
      return {
        ...state,
        accounts: action.payload,
      };
    case 'bankAccount/setLoading':
      return {
        ...state,
        loading: action.payload,
      };
    case 'bankAccount/setError':
      return {
        ...state,
        error: action.payload,
      };
    case 'bankAccount/setSelectedAccount':
      return {
        ...state,
        selectedAccount: action.payload,
      };
    default:
      return state;
  }
}

/**
 * Reducer for notification state implemented locally to eliminate circular dependency
 */
function notificationReducer(state: any = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null
}, action: any) {
  switch (action.type) {
    case 'notification/setNotifications':
      return {
        ...state,
        notifications: action.payload,
        unreadCount: action.payload.filter((n: any) => !n.read).length
      };
    case 'notification/addNotification':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    case 'notification/markAsRead':
      return {
        ...state,
        notifications: state.notifications.map((notification: any) =>
          notification.id === action.payload ? { ...notification, read: true } : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    case 'notification/clearNotifications':
      return {
        ...state,
        notifications: [],
        unreadCount: 0,
      };
    case 'notification/setLoading':
      return {
        ...state,
        loading: action.payload,
      };
    case 'notification/setError':
      return {
        ...state,
        error: action.payload,
      };
    default:
      return state;
  }
}

/**
 * Reducer for parameter state implemented locally to eliminate circular dependency
 */
function parameterReducer(state: any = {
  parameters: {},
  loading: false,
  error: null
}, action: any) {
  switch (action.type) {
    case 'parameter/setParameters':
      return {
        ...state,
        parameters: action.payload,
      };
    case 'parameter/setParameter':
      return {
        ...state,
        parameters: {
          ...state.parameters,
          [action.payload.name]: action.payload.value,
        },
      };
    case 'parameter/setLoading':
      return {
        ...state,
        loading: action.payload,
      };
    case 'parameter/setError':
      return {
        ...state,
        error: action.payload,
      };
    default:
      return state;
  }
}

// Configure the Redux store with all reducers and middleware
const store = configureStore({
  reducer: {
    ui: uiReducer,
    auth: authReducer,
    bankAccount: bankAccountReducer,
    notification: notificationReducer,
    parameter: parameterReducer,
    refund: refundReducer,
    report: reportReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serializability check
        ignoredActions: ['refund/createRefund/fulfilled', 'report/exportReport/fulfilled'],
      },
    }).concat(apiMiddleware, loggerMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

// TypeScript type for the root Redux state tree
export interface RootState {
  ui: ReturnType<typeof uiReducer>;
  auth: ReturnType<typeof authReducer>;
  bankAccount: {
    accounts: any[];
    selectedAccount: any | null;
    loading: boolean;
    error: string | null;
  };
  notification: {
    notifications: any[];
    unreadCount: number;
    loading: boolean;
    error: string | null;
  };
  parameter: {
    parameters: Record<string, any>;
    loading: boolean;
    error: string | null;
  };
  refund: ReturnType<typeof refundReducer>;
  report: ReturnType<typeof reportReducer>;
}

// TypeScript type for the Redux store dispatch function
export type AppDispatch = typeof store.dispatch;

export default store;