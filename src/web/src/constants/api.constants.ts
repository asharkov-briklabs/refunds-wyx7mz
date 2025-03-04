/**
 * API Constants
 * 
 * Defines all API-related constants for the Refunds Service web application,
 * including version, timeouts, and endpoint paths for all service operations.
 * This file centralizes API URLs to ensure consistency across the application.
 */

/**
 * Current API version used in URL paths
 */
export const API_VERSION = '/v1';

/**
 * Default timeout for API requests in milliseconds (30 seconds)
 */
export const API_TIMEOUT = 30000;

/**
 * Refund-related API endpoints
 */
export const REFUND_ENDPOINTS = {
  /**
   * Base endpoint for refund operations
   */
  BASE: '/refunds',
  
  /**
   * Endpoint for creating new refund requests
   */
  CREATE: '/refunds',
  
  /**
   * Function to generate endpoint for getting a specific refund by ID
   * @param id - The refund ID
   */
  GET_BY_ID: (id: string) => `/refunds/${id}`,
  
  /**
   * Function to generate endpoint for updating a specific refund
   * @param id - The refund ID
   */
  UPDATE: (id: string) => `/refunds/${id}`,
  
  /**
   * Function to generate endpoint for cancelling a specific refund
   * @param id - The refund ID
   */
  CANCEL: (id: string) => `/refunds/${id}/cancel`,
  
  /**
   * Endpoint for retrieving refund statistics
   */
  STATISTICS: '/refunds/statistics',
  
  /**
   * Function to generate endpoint for refunding a specific transaction
   * @param id - The transaction ID
   */
  TRANSACTION: (id: string) => `/transactions/${id}/refund`
};

/**
 * Bank account-related API endpoints
 */
export const BANK_ACCOUNT_ENDPOINTS = {
  /**
   * Base endpoint for bank account operations
   */
  BASE: '/bank-accounts',
  
  /**
   * Endpoint for creating new bank accounts
   */
  CREATE: '/bank-accounts',
  
  /**
   * Function to generate endpoint for getting a specific bank account by ID
   * @param id - The bank account ID
   */
  GET_BY_ID: (id: string) => `/bank-accounts/${id}`,
  
  /**
   * Function to generate endpoint for updating a specific bank account
   * @param id - The bank account ID
   */
  UPDATE: (id: string) => `/bank-accounts/${id}`,
  
  /**
   * Function to generate endpoint for deleting a specific bank account
   * @param id - The bank account ID
   */
  DELETE: (id: string) => `/bank-accounts/${id}`,
  
  /**
   * Function to generate endpoint for initiating verification of a bank account
   * @param id - The bank account ID
   */
  VERIFY: (id: string) => `/bank-accounts/${id}/verify`,
  
  /**
   * Function to generate endpoint for checking verification status of a bank account
   * @param id - The bank account ID
   */
  VERIFY_STATUS: (id: string) => `/bank-accounts/${id}/verification-status`,
  
  /**
   * Endpoint for completing the bank account verification process
   */
  COMPLETE_VERIFICATION: '/bank-accounts/complete-verification'
};

/**
 * Parameter configuration API endpoints
 */
export const PARAMETER_ENDPOINTS = {
  /**
   * Base endpoint for parameter operations
   */
  BASE: '/parameters',
  
  /**
   * Function to generate endpoint for getting a specific parameter by name
   * @param name - The parameter name
   */
  GET_BY_NAME: (name: string) => `/parameters/${name}`,
  
  /**
   * Endpoint for retrieving parameter definitions
   */
  DEFINITIONS: '/parameters/definitions',
  
  /**
   * Endpoint for retrieving parameter inheritance information
   */
  INHERITANCE: '/parameters/inheritance',
  
  /**
   * Endpoint for resolving parameters across the hierarchy
   */
  RESOLVE: '/parameters/resolve'
};

/**
 * Notification-related API endpoints
 */
export const NOTIFICATION_ENDPOINTS = {
  /**
   * Base endpoint for notification operations
   */
  BASE: '/notifications',
  
  /**
   * Function to generate endpoint for retrieving a specific notification
   * @param id - The notification ID
   */
  BY_ID: (id: string) => `/notifications/${id}`,
  
  /**
   * Endpoint for marking notifications as read
   */
  MARK_READ: '/notifications/read',
  
  /**
   * Endpoint for getting unread notification count
   */
  UNREAD_COUNT: '/notifications/unread-count',
  
  /**
   * Endpoint for managing notification preferences
   */
  PREFERENCES: '/notifications/preferences',
  
  /**
   * Endpoint for dismissing all notifications
   */
  DISMISS_ALL: '/notifications/dismiss-all'
};

/**
 * Approval workflow API endpoints
 */
export const APPROVAL_ENDPOINTS = {
  /**
   * Base endpoint for approval operations
   */
  BASE: '/approvals',
  
  /**
   * Function to generate endpoint for getting a specific approval request
   * @param id - The approval ID
   */
  GET_BY_ID: (id: string) => `/approvals/${id}`,
  
  /**
   * Function to generate endpoint for approving a specific request
   * @param id - The approval ID
   */
  APPROVE: (id: string) => `/approvals/${id}/approve`,
  
  /**
   * Function to generate endpoint for rejecting a specific request
   * @param id - The approval ID
   */
  REJECT: (id: string) => `/approvals/${id}/reject`,
  
  /**
   * Endpoint for retrieving pending approval requests
   */
  PENDING: '/approvals/pending'
};

/**
 * Reporting and analytics API endpoints
 */
export const REPORTING_ENDPOINTS = {
  /**
   * Base endpoint for reporting operations
   */
  BASE: '/reports',
  
  /**
   * Function to generate endpoint for retrieving a specific report
   * @param id - The report ID
   */
  GET_BY_ID: (id: string) => `/reports/${id}`,
  
  /**
   * Endpoint for generating reports
   */
  GENERATE: '/reports/generate',
  
  /**
   * Function to generate endpoint for exporting a specific report
   * @param id - The report ID
   */
  EXPORT: (id: string) => `/reports/${id}/export`,
  
  /**
   * Endpoint for retrieving dashboard data
   */
  DASHBOARD: '/reports/dashboard'
};