import React from 'react'; // ^18.2.0
import ApprovalWorkflowConfiguration, {
  ApprovalWorkflowConfigurationProps,
  TriggerType,
  TimeoutAction,
} from './ApprovalWorkflowConfiguration/ApprovalWorkflowConfiguration.tsx';
// IE1: Importing the ApprovalWorkflowConfiguration component and its related types from their source file.
// IE1: The imported component and types are used for re-exporting them from this index file.

// LD1: Export the ApprovalWorkflowConfiguration component as the default export.
// LD1: This allows consumers to import the component using the default import syntax.
export default ApprovalWorkflowConfiguration;

// LD1: Export the ApprovalWorkflowConfigurationProps interface as a named export.
// LD1: This allows consumers to use the interface for type checking and documentation.
export type { ApprovalWorkflowConfigurationProps };

// LD1: Export the TriggerType enum as a named export.
// LD1: This allows consumers to use the enum for defining trigger types in their components.
export { TriggerType };

// LD1: Export the TimeoutAction enum as a named export.
// LD1: This allows consumers to use the enum for defining timeout actions in their components.
export { TimeoutAction };