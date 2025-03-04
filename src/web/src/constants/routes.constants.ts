/**
 * Route constants for the Refunds Service application.
 * 
 * Defines all route paths used throughout the application to ensure consistency
 * and make route management easier. This includes both Pike (merchant-facing)
 * and Barracuda (admin-facing) interface routes.
 */

/**
 * Base route path segments for different sections of the application.
 */
export const BASE_ROUTES = {
  /** Authentication related routes */
  AUTH: '/auth',
  /** Pike (merchant-facing) interface routes */
  PIKE: '/pike',
  /** Barracuda (admin-facing) interface routes */
  BARRACUDA: '/barracuda',
};

/**
 * Route path segments for common pages shared across interfaces.
 */
export const COMMON_ROUTES = {
  /** Home/landing page */
  HOME: '/',
  /** Login page */
  LOGIN: '/login',
  /** Logout endpoint */
  LOGOUT: '/logout',
  /** Generic error page */
  ERROR: '/error',
  /** 404 Not found page */
  NOT_FOUND: '/not-found',
  /** Unauthorized access page */
  UNAUTHORIZED: '/unauthorized',
};

/**
 * Route path segments for Pike (merchant) interface pages.
 */
export const PIKE_ROUTES = {
  /** Merchant dashboard */
  DASHBOARD: '/dashboard',
  /** Refunds list page */
  REFUNDS: '/refunds',
  /** Individual refund details page with dynamic refundId parameter */
  REFUND_DETAILS: '/refunds/:refundId',
  /** Refund creation page */
  CREATE_REFUND: '/refunds/create',
  /** Transactions list page */
  TRANSACTIONS: '/transactions',
  /** Bank accounts management page */
  BANK_ACCOUNTS: '/bank-accounts',
  /** Bank account creation page */
  CREATE_BANK_ACCOUNT: '/bank-accounts/create',
  /** Customer details page with dynamic customerId parameter */
  CUSTOMER: '/customer/:customerId',
  /** Merchant settings page */
  SETTINGS: '/settings',
};

/**
 * Route path segments for Barracuda (admin) interface pages.
 */
export const BARRACUDA_ROUTES = {
  /** Admin dashboard */
  DASHBOARD: '/dashboard',
  /** Refunds management page */
  REFUNDS: '/refunds',
  /** Individual refund details page with dynamic refundId parameter */
  REFUND_DETAILS: '/refunds/:refundId',
  /** Merchants management page */
  MERCHANTS: '/merchants',
  /** Transactions management page */
  TRANSACTIONS: '/transactions',
  /** Configuration section */
  CONFIGURATION: '/configuration',
  /** Parameter configuration page */
  PARAMETERS: '/parameters',
  /** Rules configuration page */
  RULES: '/rules',
  /** Approval workflows configuration page */
  WORKFLOWS: '/workflows',
  /** Compliance management page */
  COMPLIANCE: '/compliance',
  /** Analytics section */
  ANALYTICS: '/analytics',
  /** Reports page */
  REPORTS: '/reports',
  /** Dashboards page */
  DASHBOARDS: '/dashboards',
  /** Exports page */
  EXPORTS: '/exports',
};