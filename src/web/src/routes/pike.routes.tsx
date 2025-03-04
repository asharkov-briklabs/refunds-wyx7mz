import React from 'react'; // ^18.2.0
import { Route } from 'react-router-dom'; // react-router-dom ^6.10.0

import PrivateRoute from './protected.routes';
import MainLayout from '../components/layout/MainLayout';
import { BASE_ROUTES, PIKE_ROUTES } from '../constants/routes.constants';
import { 
  DashboardPage,
  RefundsListPage,
  RefundDetailsPage,
  CreateRefundPage,
  BankAccountsPage,
  CreateBankAccountPage,
  CustomerPage,
  SettingsPage
} from '../pages/pike';

/**
 * Array of route components for the Pike (merchant) interface with path, layout, and component definitions
 */
export const pikeRoutes: JSX.Element[] = [
  // F-001: Refund Request Creation - Route for creating refund requests
  <Route 
    path={BASE_ROUTES.PIKE + PIKE_ROUTES.DASHBOARD} 
    element={
      <PrivateRoute>
        <MainLayout>
          <DashboardPage />
        </MainLayout>
      </PrivateRoute>
    } 
    key="dashboard" 
  />,

  // F-002: Refund Status Tracking - Route for viewing the list of refunds
  <Route 
    path={BASE_ROUTES.PIKE + PIKE_ROUTES.REFUNDS} 
    element={
      <PrivateRoute>
        <MainLayout>
          <RefundsListPage />
        </MainLayout>
      </PrivateRoute>
    } 
    key="refunds" 
  />,

  // F-303: Transaction-Level Refund Status - Route for viewing the details of a specific refund
  <Route 
    path={BASE_ROUTES.PIKE + PIKE_ROUTES.REFUND_DETAILS} 
    element={
      <PrivateRoute>
        <MainLayout>
          <RefundDetailsPage />
        </MainLayout>
      </PrivateRoute>
    } 
    key="refund-details" 
  />,

  // F-001: Refund Request Creation - Route for creating a new refund
  <Route 
    path={BASE_ROUTES.PIKE + PIKE_ROUTES.CREATE_REFUND} 
    element={
      <PrivateRoute>
        <MainLayout>
          <CreateRefundPage />
        </MainLayout>
      </PrivateRoute>
    } 
    key="create-refund" 
  />,

  // F-205: Bank Account Management - Route for viewing the list of bank accounts
  <Route 
    path={BASE_ROUTES.PIKE + PIKE_ROUTES.BANK_ACCOUNTS} 
    element={
      <PrivateRoute>
        <MainLayout>
          <BankAccountsPage />
        </MainLayout>
      </PrivateRoute>
    } 
    key="bank-accounts" 
  />,

  // F-205: Bank Account Management - Route for creating a new bank account
  <Route 
    path={BASE_ROUTES.PIKE + PIKE_ROUTES.CREATE_BANK_ACCOUNT} 
    element={
      <PrivateRoute>
        <MainLayout>
          <CreateBankAccountPage />
        </MainLayout>
      </PrivateRoute>
    } 
    key="create-bank-account" 
  />,

  // Route for viewing customer details
  <Route 
    path={BASE_ROUTES.PIKE + PIKE_ROUTES.CUSTOMER} 
    element={
      <PrivateRoute>
        <MainLayout>
          <CustomerPage />
        </MainLayout>
      </PrivateRoute>
    } 
    key="customer" 
  />,

  // Route for viewing settings
  <Route 
    path={BASE_ROUTES.PIKE + PIKE_ROUTES.SETTINGS} 
    element={
      <PrivateRoute>
        <MainLayout>
          <SettingsPage />
        </MainLayout>
      </PrivateRoute>
    } 
    key="settings" 
  />,
];