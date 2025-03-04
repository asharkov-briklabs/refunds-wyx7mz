// index.ts
import { ComplianceEngineService } from './compliance-engine.service'; // Import the main compliance engine service class
import {
  ComplianceResult, ComplianceViolation, ComplianceContext
} from './validators'; // Import interfaces for compliance evaluation results and context
import {
  cardNetworkProvider, regulatoryProvider, merchantProvider, ruleProviders
} from './rule-providers'; // Import rule providers for different compliance categories

/**
 * @file src/backend/services/compliance-engine/index.ts
 * @description Entry point for the Compliance Engine service which exports the ComplianceEngineService class and its singleton instance.
 * This service is responsible for evaluating refund requests against card network rules, regulatory requirements, and merchant-specific policies.
 * @requirements_addressed
 *   - name: Card Network Rule Enforcement
 *     location: Technical Specifications/2.3 FUNCTIONAL REQUIREMENTS/F-202: Card Network Rule Enforcement
 *     description: System shall enforce card network time limits for refunds, validate refund methods against card network rules, and track and enforce network-specific refund limits
 *   - name: Compliance Engine Implementation
 *     location: Technical Specifications/6.5 COMPLIANCE ENGINE
 *     description: Provides a unified interface for enforcing card network rules and merchant-specific refund policies
 */

// Create a singleton instance of ComplianceEngineService
const complianceEngineService = new ComplianceEngineService();

// Export the ComplianceEngineService class for use throughout the application
export { ComplianceEngineService };

// Export a singleton instance of the ComplianceEngineService
export default complianceEngineService;

// Export the ComplianceResult interface
export { ComplianceResult };

// Export the ComplianceViolation interface
export { ComplianceViolation };

// Export the ComplianceContext interface
export { ComplianceContext };