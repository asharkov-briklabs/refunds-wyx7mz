import React from 'react'; // react version ^18.2.0
import RefundDetailsPage from './RefundDetailsPage'; // Path to the RefundDetailsPage component

/**
 * @file index.ts
 * @description Index file that exports the RefundDetailsPage component for the Pike (merchant) interface.
 * This file serves as a re-export to simplify imports when using the RefundDetailsPage component.
 * @requirements_addressed
 * - Refund Status Tracking: Technical Specifications/2.1 FEATURE CATALOG/F-002: Refund Status Tracking
 *   Provides a detailed view of a refund's current status and history
 * - Transaction-level Refund Status: Technical Specifications/2.2 DETAILED FEATURE DESCRIPTIONS/F-303
 *   Displays detailed status information for a specific refund
 */

/**
 * @exports RefundDetailsPage
 * @type {React.FC}
 * @description Re-export the RefundDetailsPage component as the default export
 */
export default RefundDetailsPage;