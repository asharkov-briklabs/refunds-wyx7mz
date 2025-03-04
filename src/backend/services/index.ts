import approvalWorkflowEngine, { ApprovalWorkflowService } from './approval-workflow-engine'; // Import the approval workflow engine service
import bankAccountManager from './bank-account-manager'; // Import the bank account manager service
import complianceEngine from './compliance-engine'; // Import the compliance engine service
import gatewayIntegration from './gateway-integration'; // Import the gateway integration service
import notificationService from './notification-service'; // Import the notification service
import parameterResolution from './parameter-resolution'; // Import the parameter resolution service
import paymentMethodHandler from './payment-method-handler'; // Import the payment method handler service
import refundAPI from './refund-api'; // Import the refund API service
import refundRequestManager from './refund-request-manager'; // Import the refund request manager service
import reportingEngine from './reporting-analytics'; // Import the reporting and analytics engine service

/**
 * @file src/backend/services/index.ts
 * @description Main barrel file that exports all service modules from the Refunds Service, providing a unified entry point for accessing the various services throughout the application.
 * @requirements_addressed
 *   - name: Service Architecture
 *     location: Technical Specifications/6.1 CORE SERVICES ARCHITECTURE
 *     description: Implements the microservices architecture with well-defined service boundaries and responsibilities as defined in the system architecture.
 */

// Export all individual service instances
export {
    approvalWorkflowEngine, // Approval Workflow Engine service for managing approval processes for refunds
    bankAccountManager, // Bank Account Manager service for securely handling bank account operations
    complianceEngine, // Compliance Engine service for enforcing card network rules and merchant policies
    gatewayIntegration, // Gateway Integration service for communicating with payment gateways
    notificationService, // Notification Service for sending alerts and updates across multiple channels
    parameterResolution, // Parameter Resolution service for managing hierarchical configuration parameters
    paymentMethodHandler, // Payment Method Handler service for processing different refund payment methods
    refundAPI, // Refund API service for handling HTTP requests related to refunds
    refundRequestManager, // Refund Request Manager service for orchestrating the refund lifecycle
    reportingEngine, // Reporting Engine service for analytics and reporting on refund data
};

// Export a convenient object containing all services for destructuring imports
const services = {
    approvalWorkflowEngine,
    bankAccountManager,
    complianceEngine,
    gatewayIntegration,
    notificationService,
    parameterResolution,
    paymentMethodHandler,
    refundAPI,
    refundRequestManager,
    reportingEngine,
};

export { services };

// Export the service object as the default export
export default services;

// Also export the service classes
export { ApprovalWorkflowService };