# src/web/src/routes/barracuda.routes.tsx
```typescript
import React from 'react'; // ^18.2.0
import { Route } from 'react-router-dom'; // ^6.10.0
import PrivateRoute from './protected.routes';
import { BASE_ROUTES, BARRACUDA_ROUTES } from '../constants/routes.constants';
import {
  DashboardPage,
  RefundsPage,
  RefundDetailsPage,
  MerchantsPage,
  ConfigurationPage,
  ParametersPage,
  RulesPage,
  WorkflowsPage,
  CompliancePage,
  AnalyticsPage,
  ReportsPage,
  DashboardsPage,
  ExportsPage,
} from '../pages/barracuda';
import { UserRole } from '../types/user.types';

/**
 * Array of route elements defining the Barracuda admin interface navigation structure
 */
export const barracudaRoutes = [
  // LD1: Define a route for the admin dashboard, accessible to BARRACUDA_ADMIN, BANK_ADMIN, ORGANIZATION_ADMIN and PLATFORM_ADMIN roles
  <Route
    path={BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.DASHBOARD}
    element={
      <PrivateRoute requiredRole={UserRole.BARRACUDA_ADMIN}>
        <DashboardPage />
      </PrivateRoute>
    }
    key="dashboard"
  />,

  // LD1: Define a route for the refunds management page, accessible to BARRACUDA_ADMIN, BANK_ADMIN, ORGANIZATION_ADMIN and PLATFORM_ADMIN roles
  <Route
    path={BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.REFUNDS}
    element={
      <PrivateRoute requiredRole={UserRole.BARRACUDA_ADMIN}>
        <RefundsPage />
      </PrivateRoute>
    }
    key="refunds"
  />,

  // LD1: Define a route for the refund details page, accessible to BARRACUDA_ADMIN, BANK_ADMIN, ORGANIZATION_ADMIN and PLATFORM_ADMIN roles
  <Route
    path={BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.REFUND_DETAILS}
    element={
      <PrivateRoute requiredRole={UserRole.BARRACUDA_ADMIN}>
        <RefundDetailsPage />
      </PrivateRoute>
    }
    key="refundDetails"
  />,

  // LD1: Define a route for the merchants management page, accessible to BARRACUDA_ADMIN, BANK_ADMIN, ORGANIZATION_ADMIN and PLATFORM_ADMIN roles
  <Route
    path={BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.MERCHANTS}
    element={
      <PrivateRoute requiredRole={UserRole.BARRACUDA_ADMIN}>
        <MerchantsPage />
      </PrivateRoute>
    }
    key="merchants"
  />,

  // LD1: Define a route for the configuration page, accessible to BARRACUDA_ADMIN and BANK_ADMIN roles
  <Route
    path={BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.CONFIGURATION}
    element={
      <PrivateRoute requiredRole={UserRole.BARRACUDA_ADMIN}>
        <ConfigurationPage />
      </PrivateRoute>
    }
    key="configuration"
  />,

  // LD1: Define a route for the parameters configuration page, accessible to BARRACUDA_ADMIN and BANK_ADMIN roles
  <Route
    path={BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.PARAMETERS}
    element={
      <PrivateRoute requiredRole={UserRole.BARRACUDA_ADMIN}>
        <ParametersPage />
      </PrivateRoute>
    }
    key="parameters"
  />,

  // LD1: Define a route for the rules configuration page, accessible to BARRACUDA_ADMIN and BANK_ADMIN roles
  <Route
    path={BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.RULES}
    element={
      <PrivateRoute requiredRole={UserRole.BARRACUDA_ADMIN}>
        <RulesPage />
      </PrivateRoute>
    }
    key="rules"
  />,

  // LD1: Define a route for the workflows configuration page, accessible to BARRACUDA_ADMIN, BANK_ADMIN and ORGANIZATION_ADMIN roles
  <Route
    path={BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.WORKFLOWS}
    element={
      <PrivateRoute requiredRole={UserRole.BARRACUDA_ADMIN}>
        <WorkflowsPage />
      </PrivateRoute>
    }
    key="workflows"
  />,

  // LD1: Define a route for the compliance management page, accessible to BARRACUDA_ADMIN and BANK_ADMIN roles
  <Route
    path={BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.COMPLIANCE}
    element={
      <PrivateRoute requiredRole={UserRole.BARRACUDA_ADMIN}>
        <CompliancePage />
      </PrivateRoute>
    }
    key="compliance"
  />,

  // LD1: Define a route for the analytics page, accessible to BARRACUDA_ADMIN, BANK_ADMIN, ORGANIZATION_ADMIN and PLATFORM_ADMIN roles
  <Route
    path={BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.ANALYTICS}
    element={
      <PrivateRoute requiredRole={UserRole.BARRACUDA_ADMIN}>
        <AnalyticsPage />
      </PrivateRoute>
    }
    key="analytics"
  />,

  // LD1: Define a route for the reports page, accessible to BARRACUDA_ADMIN, BANK_ADMIN, ORGANIZATION_ADMIN and PLATFORM_ADMIN roles
  <Route
    path={BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.REPORTS}
    element={
      <PrivateRoute requiredRole={UserRole.BARRACUDA_ADMIN}>
        <ReportsPage />
      </PrivateRoute>
    }
    key="reports"
  />,

  // LD1: Define a route for the dashboards page, accessible to BARRACUDA_ADMIN, BANK_ADMIN and ORGANIZATION_ADMIN roles
  <Route
    path={BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.DASHBOARDS}
    element={
      <PrivateRoute requiredRole={UserRole.BARRACUDA_ADMIN}>
        <DashboardsPage />
      </PrivateRoute>
    }
    key="dashboards"
  />,

  // LD1: Define a route for the exports page, accessible to BARRACUDA_ADMIN, BANK_ADMIN, ORGANIZATION_ADMIN and PLATFORM_ADMIN roles
  <Route
    path={BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.EXPORTS}
    element={
      <PrivateRoute requiredRole={UserRole.BARRACUDA_ADMIN}>
        <ExportsPage />
      </PrivateRoute>
    }
    key="exports"
  />,
];