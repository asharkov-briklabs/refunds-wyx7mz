/**
 * Approval Workflow Engine Models
 * 
 * This index file re-exports all model classes and utility functions from the
 * approval workflow engine models directory, providing a single entry point
 * for importing approval workflow components throughout the application.
 */

// Export ApprovalRule model and utility functions
export { 
  ApprovalRule,
  getFieldValue,
  evaluateCondition 
} from './approval-rule.model';

// Export ApprovalWorkflow model
export { ApprovalWorkflow } from './approval-workflow.model';