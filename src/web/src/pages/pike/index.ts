// src/web/src/pages/pike/index.ts

import BankAccountsPage from './BankAccountsPage';
import CreateBankAccountPage from './CreateBankAccountPage';
import CreateRefundPage from './CreateRefundPage';
import CustomerPage from './CustomerPage';
import DashboardPage from './DashboardPage';
import RefundDetailsPage from './RefundDetailsPage';
import RefundsListPage from './RefundsListPage';
import SettingsPage from './SettingsPage';

/**
 * @file src/web/src/pages/pike/index.ts
 * @src_subfolder web
 * @description Index file that exports all page components for the Pike (merchant-facing) interface. This file centralizes the exports of all Pike pages to simplify imports and route configuration.
 * @requirements_addressed
 * - Pike Interface: Technical Specifications/7.2 PIKE INTERFACE (MERCHANT USERS)
 *   Provides a centralized export point for all merchant-facing page components that make up the Pike interface
 */

// IE3: Export the BankAccountsPage component for routing
export { BankAccountsPage };

// IE3: Export the CreateBankAccountPage component for routing
export { CreateBankAccountPage };

// IE3: Export the CreateRefundPage component for routing
export { CreateRefundPage };

// IE3: Export the CustomerPage component for routing
export { CustomerPage };

// IE3: Export the DashboardPage component for routing
export { DashboardPage };

// IE3: Export the RefundDetailsPage component for routing
export { RefundDetailsPage };

// IE3: Export the RefundsListPage component for routing
export { RefundsListPage };

// IE3: Export the SettingsPage component for routing
export { SettingsPage };