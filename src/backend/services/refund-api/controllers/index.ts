import { RefundController, createRefundController } from './refund.controller'; // Controller for refund operations
import { BankAccountController, createBankAccountController } from './bank-account.controller'; // Controller for bank account management operations
import * as ParameterController from './parameter.controller'; // Controller functions for parameter management
import { ReportingController, createReportingController } from './reporting.controller'; // Controller for reporting and analytics operations
import { parameterValidationMiddleware } from './parameter.controller'; // Validation middleware for parameter operations
import { parameterAuthorizationMiddleware } from './parameter.controller'; // Authorization middleware for parameter operations

/**
 * @file src/backend/services/refund-api/controllers/index.ts
 * @description Central export file for all controllers in the Refund API service. This file aggregates and exports controller classes and functions from individual controller files, providing a unified entry point for the API routes to access controller functionality.
 * @requirements_addressed
 *   - name: API Layer Organization
 *     location: Technical Specifications/3.1 PROGRAMMING LANGUAGES/API Layer
 *     description: Organizes the API layer with proper separation of controllers for different functional domains
 *   - name: Controller Modularity
 *     location: Technical Specifications/5.2 COMPONENT DETAILS/Refund API Service
 *     description: Implements modular controllers with clear responsibility boundaries
 */

// Export RefundController and its factory function
export { RefundController, createRefundController };

// Export BankAccountController and its factory function
export { BankAccountController, createBankAccountController };

// Export ParameterController namespace
export { ParameterController };

// Export ParameterMiddleware
export const ParameterMiddleware = {
    validation: parameterValidationMiddleware,
    authorization: parameterAuthorizationMiddleware
};

// Export ReportingController and its factory function
export { ReportingController, createReportingController };