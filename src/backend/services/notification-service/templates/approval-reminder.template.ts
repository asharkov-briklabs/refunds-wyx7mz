import { NotificationType, NotificationChannel } from '../../../../common/interfaces/notification.interface';
import { NotificationTemplate } from '../../../../common/interfaces/notification.interface';
import { formatCurrency } from '../../../../common/utils/currency-utils';

/**
 * Email template for approval reminder notifications
 */
export const approvalReminderEmailTemplate: NotificationTemplate = {
  templateId: 'approval-reminder-email',
  name: 'Approval Reminder Email',
  notificationType: NotificationType.APPROVAL_REMINDER,
  channels: [NotificationChannel.EMAIL],
  subjectTemplate: 'REMINDER: Refund approval request pending for {{merchantName}}',
  bodyTemplate: `
Dear {{approverName}},

This is a reminder that a refund request requires your approval and is approaching its deadline.

Refund Details:
- Merchant: {{merchantName}}
- Refund ID: {{refundId}}
- Transaction ID: {{transactionId}}
- Amount: {{formatCurrency(amount, currency)}}
- Deadline: {{approvalDeadline}}

If no action is taken by the deadline, this approval request will be escalated to the next level approver.

Please log in to review and approve or reject this request.

Thank you,
Brik Platform Team
  `.trim(),
  htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 10px; border-bottom: 1px solid #dee2e6; }
    .content { padding: 20px 0; }
    .refund-details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .footer { font-size: 12px; color: #6c757d; margin-top: 30px; padding-top: 10px; border-top: 1px solid #dee2e6; }
    .button { display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
    .urgent { color: #dc3545; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Refund Approval Reminder</h2>
    </div>
    <div class="content">
      <p>Dear {{approverName}},</p>
      
      <p>This is a reminder that a refund request requires your approval and is <span class="urgent">approaching its deadline</span>.</p>
      
      <div class="refund-details">
        <h3>Refund Details:</h3>
        <p><strong>Merchant:</strong> {{merchantName}}</p>
        <p><strong>Refund ID:</strong> {{refundId}}</p>
        <p><strong>Transaction ID:</strong> {{transactionId}}</p>
        <p><strong>Amount:</strong> {{formatCurrency(amount, currency)}}</p>
        <p><strong>Deadline:</strong> {{approvalDeadline}}</p>
      </div>
      
      <p>If no action is taken by the deadline, this approval request will be escalated to the next level approver.</p>
      
      <p><a href="{{approvalUrl}}" class="button">Review Request Now</a></p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Brik Platform. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim(),
  variables: ['approverName', 'merchantName', 'refundId', 'transactionId', 'amount', 'currency', 'approvalDeadline', 'approvalUrl']
};

/**
 * SMS template for approval reminder notifications
 */
export const approvalReminderSmsTemplate: NotificationTemplate = {
  templateId: 'approval-reminder-sms',
  name: 'Approval Reminder SMS',
  notificationType: NotificationType.APPROVAL_REMINDER,
  channels: [NotificationChannel.SMS],
  bodyTemplate: `REMINDER: A refund of {{formatCurrency(amount, currency)}} for {{merchantName}} requires your approval before {{approvalDeadline}}. Log in to approve or it will be escalated.`.trim(),
  variables: ['merchantName', 'amount', 'currency', 'approvalDeadline']
};

/**
 * In-app template for approval reminder notifications
 */
export const approvalReminderInAppTemplate: NotificationTemplate = {
  templateId: 'approval-reminder-in-app',
  name: 'Approval Reminder In-App',
  notificationType: NotificationType.APPROVAL_REMINDER,
  channels: [NotificationChannel.IN_APP],
  subjectTemplate: 'Approval Reminder',
  bodyTemplate: `A refund of {{formatCurrency(amount, currency)}} for {{merchantName}} is waiting for your approval. The request will escalate if not reviewed by {{approvalDeadline}}.`.trim(),
  variables: ['merchantName', 'amount', 'currency', 'approvalDeadline', 'refundId']
};

/**
 * Export all approval reminder templates
 */
export default [
  approvalReminderEmailTemplate,
  approvalReminderSmsTemplate,
  approvalReminderInAppTemplate
];