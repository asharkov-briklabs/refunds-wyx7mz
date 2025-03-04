import RefundRequestRepository, { RefundRequestRepository as RefundRequestRepositoryClass } from './refund-request.repo';
import RefundRepository from './refund.repo';
import ApprovalRequestRepository, { ApprovalRequestRepository as ApprovalRequestRepositoryClass } from './approval-request.repo';
import BankAccountRepository, { BankAccountRepository as BankAccountRepositoryClass } from './bank-account.repo';
import parameterRepository from './parameter.repo';
import ComplianceRuleRepository, { ComplianceRuleRepository as ComplianceRuleRepositoryClass } from './compliance-rule.repo';
import NotificationRepository, { NotificationRepository as NotificationRepositoryClass } from './notification.repo';
import auditLogRepository, { AuditLogRepository as AuditLogRepositoryClass } from './audit-log.repo';

/**
 * Consolidated object containing all repository instances for easy access
 */
const repositories = {
  refundRequest: RefundRequestRepository,
  refund: new RefundRepository(),
  approvalRequest: ApprovalRequestRepository,
  bankAccount: BankAccountRepository,
  parameter: parameterRepository,
  complianceRule: complianceRuleRepository,
  notification: notificationRepository,
  auditLog: auditLogRepository,
};

export {
    RefundRequestRepositoryClass as RefundRequestRepository,
    RefundRequestRepository,
    RefundRepository,
    ApprovalRequestRepositoryClass as ApprovalRequestRepository,
    ApprovalRequestRepository,
    BankAccountRepositoryClass as BankAccountRepository,
    BankAccountRepository,
    parameterRepository,
    ComplianceRuleRepositoryClass as ComplianceRuleRepository,
    ComplianceRuleRepository,
    NotificationRepositoryClass as NotificationRepository,
    NotificationRepository,
    AuditLogRepositoryClass as AuditLogRepository,
    auditLogRepository
};

export default repositories;