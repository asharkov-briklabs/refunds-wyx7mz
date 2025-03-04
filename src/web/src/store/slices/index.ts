import { combineReducers } from '@reduxjs/toolkit'; // @reduxjs/toolkit ^1.9.5
import uiReducer, { uiActions, selectLoading, selectModalVisible, selectSidebarOpen, selectActiveView, selectTheme } from './ui.slice';
import authReducer, { login, logout, handleRedirectCallback, handleMfaChallenge, refreshToken, setUser, setToken, clearError as clearAuthError } from './auth.slice';
import bankAccountReducer, { bankAccountActions, fetchBankAccounts, fetchBankAccountById, createBankAccount, updateBankAccount, deleteBankAccount, setDefaultBankAccount, initiateAccountVerification, getAccountVerificationStatus, completeAccountVerification, completeMicroDepositVerification, selectBankAccounts, selectBankAccountById, selectDefaultBankAccount, selectBankAccountsLoading, selectBankAccountsError, selectBankAccountsPagination } from './bankAccount.slice';
import notificationReducer, { notificationActions, fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead, selectNotifications, selectUnreadCount, selectNotificationById, selectNotificationsLoading, selectNotificationsError } from './notification.slice';
import parameterReducer, { parameterActions, fetchParameters, fetchParameterById, createParameter, updateParameter, deleteParameter, selectParameters, selectParameterById, selectParametersLoading, selectParametersError } from './parameter.slice';
import refundReducer, { refundActions, fetchRefunds, fetchRefundById, fetchTransactionForRefund, createRefund, updateRefund, cancelRefund, fetchRefundStatistics } from './refund.slice';
import reportReducer, { reportActions, fetchReports, fetchReportById, generateReport, scheduleReport, cancelScheduledReport, selectReports, selectReportById, selectReportsLoading, selectReportsError } from './report.slice';

/**
 * Combined object of all reducers for the Redux store configuration
 * @exports reducers
 */
const reducers = {
  ui: uiReducer,
  auth: authReducer,
  bankAccount: bankAccountReducer,
  notification: notificationReducer,
  parameter: parameterReducer,
  refund: refundReducer,
  report: reportReducer,
};

/**
 * Exports all individual reducers for direct use if needed
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
 * Exports all action creators from the slices
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
 * Exports all async thunks for performing asynchronous operations
 * @exports login
 * @exports logout
 * @exports handleRedirectCallback
 * @exports handleMfaChallenge
 * @exports refreshToken
 * @exports fetchBankAccounts
 * @exports fetchBankAccountById
 * @exports createBankAccount
 * @exports updateBankAccount
 * @exports deleteBankAccount
 * @exports fetchNotifications
 * @exports markNotificationAsRead
 * @exports markAllNotificationsAsRead
 * @exports fetchParameters
 * @exports fetchRefunds
 * @exports fetchRefundById
 * @exports createRefund
 * @exports updateRefund
 * @exports cancelRefund
 * @exports fetchReports
 * @exports generateReport
 * @exports scheduleReport
 * @exports cancelScheduledReport
 */
export {
    login,
    logout,
    handleRedirectCallback,
    handleMfaChallenge,
    refreshToken,
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
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    fetchParameters,
    fetchRefunds,
    fetchRefundById,
    fetchTransactionForRefund,
    createRefund,
    updateRefund,
    cancelRefund,
    fetchRefundStatistics,
    fetchReports,
    fetchReportById,
    generateReport,
    scheduleReport,
    cancelScheduledReport
};

/**
 * Exports all selector functions for accessing state
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
    selectBankAccountsLoading,
    selectBankAccountsError,
    selectBankAccountsPagination,
    selectNotifications,
    selectUnreadCount,
    selectNotificationById,
    selectNotificationsLoading,
    selectNotificationsError,
    selectParameters,
    selectParameterById,
    selectParametersLoading,
    selectParametersError,
    selectReports,
    selectReportById,
    selectReportsLoading,
    selectReportsError
};