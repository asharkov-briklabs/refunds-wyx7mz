import {
    store,
    RootState,
    AppDispatch
} from './store';
import {
    useAppDispatch,
    useAppSelector
} from './hooks';
import {
    reducers,
    uiReducer,
    authReducer,
    bankAccountReducer,
    notificationReducer,
    parameterReducer,
    refundReducer,
    reportReducer
} from './slices';
import {
    login,
    logout,
    handleRedirectCallback,
    handleMfaChallenge,
    refreshToken,
    fetchBankAccounts,
    createBankAccount,
    updateBankAccount,
    fetchNotifications,
    markNotificationAsRead,
    fetchParameters,
    fetchRefunds,
    fetchRefundById,
    createRefund,
    updateRefund,
    cancelRefund,
    fetchReports,
    generateReport
} from './slices';
import {
    selectLoading,
    selectModalVisible,
    selectSidebarOpen,
    selectActiveView,
    selectTheme,
    selectBankAccounts,
    selectBankAccountById,
    selectDefaultBankAccount,
    selectNotifications,
    selectUnreadCount
} from './slices';
import {
    apiMiddleware,
    loggerMiddleware,
    createLoggerMiddleware
} from './middleware';

/**
 * Exports the configured Redux store instance for use throughout the application.
 * @exports store
 */
export { store };

/**
 * Exports the RootState interface for type-safe access to the Redux store's state.
 * @exports RootState
 */
export type { RootState };

/**
 * Exports the AppDispatch type for type-safe dispatching of Redux actions.
 * @exports AppDispatch
 */
export type { AppDispatch };

/**
 * Exports the useAppDispatch hook for dispatching actions with type safety.
 * @exports useAppDispatch
 */
export { useAppDispatch };

/**
 * Exports the useAppSelector hook for selecting state with type safety.
 * @exports useAppSelector
 */
export { useAppSelector };

/**
 * Exports the combined reducers object for configuring the Redux store.
 * @exports reducers
 */
export { reducers };

/**
 * Exports individual reducers for direct use if needed.
 * @exports uiReducer
 * @exports authReducer
 * @exports bankAccountReducer
 * @exports notificationReducer
 * @exports parameterReducer
 * @exports refundReducer
 * @exports reportReducer
 */
export {
    uiReducer,
    authReducer,
    bankAccountReducer,
    notificationReducer,
    parameterReducer,
    refundReducer,
    reportReducer
};

/**
 * Exports action creators for each Redux slice.
 * @exports uiActions
 * @exports bankAccountActions
 * @exports notificationActions
 * @exports parameterActions
 * @exports refundActions
 * @exports reportActions
 */
export {
    uiActions,
    bankAccountActions,
    notificationActions,
    parameterActions,
    refundActions,
    reportActions
};

/**
 * Exports async thunks for performing asynchronous operations.
 * @exports login
 * @exports logout
 * @exports handleRedirectCallback
 * @exports handleMfaChallenge
 * @exports refreshToken
 * @exports fetchBankAccounts
 * @exports createBankAccount
 * @exports updateBankAccount
 * @exports fetchNotifications
 * @exports markNotificationAsRead
 * @exports fetchParameters
 * @exports fetchRefunds
 * @exports fetchRefundById
 * @exports createRefund
 * @exports updateRefund
 * @exports cancelRefund
 * @exports fetchReports
 * @exports generateReport
 */
export {
    login,
    logout,
    handleRedirectCallback,
    handleMfaChallenge,
    refreshToken,
    fetchBankAccounts,
    createBankAccount,
    updateBankAccount,
    fetchNotifications,
    markNotificationAsRead,
    fetchParameters,
    fetchRefunds,
    fetchRefundById,
    createRefund,
    updateRefund,
    cancelRefund,
    fetchReports,
    generateReport
};

/**
 * Exports selector functions for accessing specific parts of the state.
 * @exports selectLoading
 * @exports selectModalVisible
 * @exports selectSidebarOpen
 * @exports selectActiveView
 * @exports selectTheme
 * @exports selectBankAccounts
 * @exports selectBankAccountById
 * @exports selectDefaultBankAccount
 * @exports selectNotifications
 * @exports selectUnreadCount
 */
export {
    selectLoading,
    selectModalVisible,
    selectSidebarOpen,
    selectActiveView,
    selectTheme,
    selectBankAccounts,
    selectBankAccountById,
    selectDefaultBankAccount,
    selectNotifications,
    selectUnreadCount,
    apiMiddleware,
    loggerMiddleware,
    createLoggerMiddleware
};