import DashboardPage from './DashboardPage';

/**
 * @file index.ts
 * @src_subfolder web
 * @description Export file for the DashboardPage component used in the Pike (merchant-facing) interface. This file re-exports the main component to simplify imports in other parts of the application, particularly for routing.
 * @requirements_addressed
 * - Dashboard Page for Merchants: Technical Specifications/7.2.3 Dashboard Page
 *   Provides the entry point to the merchant-facing dashboard with key refund metrics and recent activity
 * - Page Navigation: Technical Specifications/7. USER INTERFACE DESIGN
 *   Supports the routing structure for the Pike interface by providing a clear import path for the dashboard page
 */

// IE3: Export the DashboardPage component as the default export to be imported by the router and other parts of the application
export default DashboardPage;