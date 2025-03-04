/**
 * Configuration file defining the application routes for Pike (merchant) and Barracuda (admin) interfaces.
 * Includes route paths, titles, and access control information.
 */
import { ROUTES } from '../constants/routes.constants';

/**
 * Interface defining the structure of a route configuration object
 */
interface RouteConfig {
  path: string;
  title: string;
  icon?: string;
  isProtected?: boolean;
  roles?: string[];
  showInNav?: boolean;
  children?: RouteConfig[];
}

/**
 * Defines all routes available in the Pike interface
 */
const pikeRoutes: RouteConfig[] = [
  {
    path: ROUTES.PIKE_ROUTES.DASHBOARD,
    title: 'Dashboard',
    icon: 'dashboard',
    isProtected: true,
    showInNav: true,
  },
  {
    path: ROUTES.PIKE_ROUTES.REFUNDS,
    title: 'Refunds',
    icon: 'refund',
    isProtected: true,
    showInNav: true,
  },
  {
    path: ROUTES.PIKE_ROUTES.REFUND_DETAILS,
    title: 'Refund Details',
    isProtected: true,
    showInNav: false,
  },
  {
    path: ROUTES.PIKE_ROUTES.CREATE_REFUND,
    title: 'Create Refund',
    isProtected: true,
    showInNav: false,
  },
  {
    path: ROUTES.PIKE_ROUTES.TRANSACTIONS,
    title: 'Transactions',
    icon: 'transaction',
    isProtected: true,
    showInNav: true,
  },
  {
    path: ROUTES.PIKE_ROUTES.BANK_ACCOUNTS,
    title: 'Bank Accounts',
    icon: 'bank',
    isProtected: true,
    showInNav: true,
  },
  {
    path: ROUTES.PIKE_ROUTES.CREATE_BANK_ACCOUNT,
    title: 'Add Bank Account',
    isProtected: true,
    showInNav: false,
  },
  {
    path: ROUTES.PIKE_ROUTES.CUSTOMER,
    title: 'Customer Details',
    isProtected: true,
    showInNav: false,
  },
  {
    path: ROUTES.PIKE_ROUTES.SETTINGS,
    title: 'Settings',
    icon: 'settings',
    isProtected: true,
    showInNav: true,
  },
];

/**
 * Defines all routes available in the Barracuda interface
 */
const barracudaRoutes: RouteConfig[] = [
  {
    path: ROUTES.BARRACUDA_ROUTES.DASHBOARD,
    title: 'Dashboard',
    icon: 'dashboard',
    isProtected: true,
    roles: ['BARRACUDA_ADMIN', 'BANK_ADMIN', 'ORGANIZATION_ADMIN', 'PLATFORM_ADMIN'],
    showInNav: true,
  },
  {
    path: ROUTES.BARRACUDA_ROUTES.REFUNDS,
    title: 'Refunds',
    icon: 'refund',
    isProtected: true,
    roles: ['BARRACUDA_ADMIN', 'BANK_ADMIN', 'ORGANIZATION_ADMIN', 'PLATFORM_ADMIN'],
    showInNav: true,
  },
  {
    path: ROUTES.BARRACUDA_ROUTES.REFUND_DETAILS,
    title: 'Refund Details',
    isProtected: true,
    roles: ['BARRACUDA_ADMIN', 'BANK_ADMIN', 'ORGANIZATION_ADMIN', 'PLATFORM_ADMIN'],
    showInNav: false,
  },
  {
    path: ROUTES.BARRACUDA_ROUTES.MERCHANTS,
    title: 'Merchants',
    icon: 'merchant',
    isProtected: true,
    roles: ['BARRACUDA_ADMIN', 'BANK_ADMIN', 'ORGANIZATION_ADMIN', 'PLATFORM_ADMIN'],
    showInNav: true,
  },
  {
    path: ROUTES.BARRACUDA_ROUTES.TRANSACTIONS,
    title: 'Transactions',
    icon: 'transaction',
    isProtected: true,
    roles: ['BARRACUDA_ADMIN', 'BANK_ADMIN', 'ORGANIZATION_ADMIN', 'PLATFORM_ADMIN'],
    showInNav: true,
  },
  {
    path: ROUTES.BARRACUDA_ROUTES.CONFIGURATION,
    title: 'Configuration',
    icon: 'config',
    isProtected: true,
    roles: ['BARRACUDA_ADMIN', 'BANK_ADMIN', 'ORGANIZATION_ADMIN', 'PLATFORM_ADMIN'],
    showInNav: true,
    children: [
      {
        path: ROUTES.BARRACUDA_ROUTES.PARAMETERS,
        title: 'Parameters',
        isProtected: true,
        roles: ['BARRACUDA_ADMIN', 'BANK_ADMIN', 'ORGANIZATION_ADMIN', 'PLATFORM_ADMIN'],
        showInNav: true,
      },
      {
        path: ROUTES.BARRACUDA_ROUTES.RULES,
        title: 'Rules',
        isProtected: true,
        roles: ['BARRACUDA_ADMIN', 'BANK_ADMIN', 'ORGANIZATION_ADMIN'],
        showInNav: true,
      },
      {
        path: ROUTES.BARRACUDA_ROUTES.WORKFLOWS,
        title: 'Approval Workflows',
        isProtected: true,
        roles: ['BARRACUDA_ADMIN', 'BANK_ADMIN', 'ORGANIZATION_ADMIN'],
        showInNav: true,
      },
      {
        path: ROUTES.BARRACUDA_ROUTES.COMPLIANCE,
        title: 'Compliance',
        isProtected: true,
        roles: ['BARRACUDA_ADMIN', 'BANK_ADMIN'],
        showInNav: true,
      },
    ],
  },
  {
    path: ROUTES.BARRACUDA_ROUTES.ANALYTICS,
    title: 'Analytics',
    icon: 'analytics',
    isProtected: true,
    roles: ['BARRACUDA_ADMIN', 'BANK_ADMIN', 'ORGANIZATION_ADMIN', 'PLATFORM_ADMIN'],
    showInNav: true,
    children: [
      {
        path: ROUTES.BARRACUDA_ROUTES.REPORTS,
        title: 'Reports',
        isProtected: true,
        roles: ['BARRACUDA_ADMIN', 'BANK_ADMIN', 'ORGANIZATION_ADMIN', 'PLATFORM_ADMIN'],
        showInNav: true,
      },
      {
        path: ROUTES.BARRACUDA_ROUTES.DASHBOARDS,
        title: 'Dashboards',
        isProtected: true,
        roles: ['BARRACUDA_ADMIN', 'BANK_ADMIN', 'ORGANIZATION_ADMIN', 'PLATFORM_ADMIN'],
        showInNav: true,
      },
      {
        path: ROUTES.BARRACUDA_ROUTES.EXPORTS,
        title: 'Exports',
        isProtected: true,
        roles: ['BARRACUDA_ADMIN', 'BANK_ADMIN', 'ORGANIZATION_ADMIN', 'PLATFORM_ADMIN'],
        showInNav: true,
      },
    ],
  },
];

/**
 * Defines routes common to both interfaces (login, error pages, etc.)
 */
const commonRoutes: RouteConfig[] = [
  {
    path: ROUTES.COMMON_ROUTES.HOME,
    title: 'Home',
    isProtected: false,
    showInNav: false,
  },
  {
    path: ROUTES.COMMON_ROUTES.LOGIN,
    title: 'Login',
    isProtected: false,
    showInNav: false,
  },
  {
    path: ROUTES.COMMON_ROUTES.LOGOUT,
    title: 'Logout',
    isProtected: false,
    showInNav: false,
  },
  {
    path: ROUTES.COMMON_ROUTES.ERROR,
    title: 'Error',
    isProtected: false,
    showInNav: false,
  },
  {
    path: ROUTES.COMMON_ROUTES.NOT_FOUND,
    title: 'Page Not Found',
    isProtected: false,
    showInNav: false,
  },
  {
    path: ROUTES.COMMON_ROUTES.UNAUTHORIZED,
    title: 'Unauthorized',
    isProtected: false,
    showInNav: false,
  },
];

/**
 * Main configuration object exported from this file
 */
export const routesConfig = {
  pike: pikeRoutes,
  barracuda: barracudaRoutes,
  common: commonRoutes,
};