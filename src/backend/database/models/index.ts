import {
  RefundRequestModel,
  IRefundRequest,
  IRefundRequestDocument,
  refundRequestSchema,
} from './refund-request.model';
import {
  RefundModel,
  IRefund,
  IRefundDocument,
  refundSchema,
} from './refund.model';
import {
  ApprovalRequestModel,
  IApprovalRequestDocument,
  approvalRequestSchema,
} from './approval-request.model';
import {
  BankAccountModel,
  IBankAccount,
  IBankAccountDocument,
  bankAccountSchema,
} from './bank-account.model';
import {
  Parameter,
  IParameter,
  parameterSchema,
  ParameterEntityType,
} from './parameter.model';
import {
  ComplianceRuleModel,
  IComplianceRule,
  IComplianceRuleDocument,
  ComplianceRuleSchema,
  RuleType,
  EntityType,
  ProviderType,
} from './compliance-rule.model';
import {
  NotificationModel,
  INotificationDocument,
  notificationSchema,
} from './notification.model';
import {
  AuditLogModel,
  IAuditLog,
  IAuditLogDocument,
  AuditEntityType,
  AuditActionType,
  createAuditLog,
} from './audit-log.model';

/**
 * Exports all database models, schemas, interfaces, and enums for the Refunds Service.
 * This provides a centralized entry point for accessing all MongoDB models representing
 * the core data entities in the system.
 */

// Refund Request Model and related types
export {
  RefundRequestModel,
  IRefundRequest,
  IRefundRequestDocument,
  refundRequestSchema,
};

// Refund Model and related types
export { RefundModel, IRefund, IRefundDocument, refundSchema };

// Approval Request Model and related types
export { ApprovalRequestModel, IApprovalRequestDocument, approvalRequestSchema };

// Bank Account Model and related types
export {
  BankAccountModel,
  IBankAccount,
  IBankAccountDocument,
  bankAccountSchema,
};

// Parameter Model and related types
export { Parameter, IParameter, parameterSchema, ParameterEntityType };

// Compliance Rule Model and related types
export {
  ComplianceRuleModel,
  IComplianceRule,
  IComplianceRuleDocument,
  ComplianceRuleSchema,
  RuleType,
  EntityType,
  ProviderType,
};

// Notification Model and related types
export { NotificationModel, INotificationDocument, notificationSchema };

// Audit Log Model and related types
export {
  AuditLogModel,
  IAuditLog,
  IAuditLogDocument,
  AuditEntityType,
  AuditActionType,
  createAuditLog,
};