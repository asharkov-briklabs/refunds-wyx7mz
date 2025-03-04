import { NotificationType, NotificationChannel, NotificationTemplate } from '../../../../common/interfaces/notification.interface';
import { formatCurrency } from '../../../../common/utils/currency-utils';

/**
 * Email template for approval request notifications
 * Sends a detailed email with HTML formatting to approvers when a refund requires their approval
 */
export const approvalRequestedEmailTemplate: NotificationTemplate = {
  template_id: 'approval-requested-email',
  name: 'Approval Request Email',
  notification_type: NotificationType.APPROVAL_REQUESTED,
  channels: [NotificationChannel.EMAIL],
  subject_template: 'Action Required: Refund Approval Request for {{ merchantName }}',
  body_template: `A refund for {{ merchantName }} requires your approval.

Refund Details:
- Refund ID: {{ refundId }}
- Transaction ID: {{ transactionId }}
- Amount: {{ amount | currency(currency) }}
- Reason: {{ reason }}

This request requires your approval by {{ approvalDeadline | date('MMM DD, YYYY HH:mm') }}.

To review this request, please log in to your dashboard or click the link below:
{{ approvalUrl }}

Thank you,
Brik Payment Platform`,
  html_template: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 15px; border-bottom: 3px solid #0066cc; }
    .content { padding: 20px 0; }
    .details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .details table { width: 100%; }
    .details td { padding: 5px 0; }
    .details td:first-child { font-weight: bold; width: 40%; }
    .deadline { color: #d9534f; font-weight: bold; }
    .cta { background-color: #0066cc; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 15px; }
    .footer { margin-top: 30px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Refund Approval Request</h2>
    </div>
    <div class="content">
      <p>A refund for <strong>{{ merchantName }}</strong> requires your approval.</p>
      
      <div class="details">
        <table>
          <tr>
            <td>Refund ID:</td>
            <td>{{ refundId }}</td>
          </tr>
          <tr>
            <td>Transaction ID:</td>
            <td>{{ transactionId }}</td>
          </tr>
          <tr>
            <td>Amount:</td>
            <td>{{ amount | currency(currency) }}</td>
          </tr>
          <tr>
            <td>Reason:</td>
            <td>{{ reason }}</td>
          </tr>
          <tr>
            <td>Deadline:</td>
            <td class="deadline">{{ approvalDeadline | date('MMM DD, YYYY HH:mm') }}</td>
          </tr>
        </table>
      </div>
      
      <p>Please review and take action on this refund request before the deadline.</p>
      
      <a href="{{ approvalUrl }}" class="cta">Review Refund Request</a>
      
      <div class="footer">
        <p>Thank you,<br>Brik Payment Platform</p>
        <p>If you're having trouble with the button above, copy and paste this URL into your browser: {{ approvalUrl }}</p>
      </div>
    </div>
  </div>
</body>
</html>`,
  variables: ['merchantName', 'refundId', 'transactionId', 'amount', 'currency', 'reason', 'approvalDeadline', 'approvalUrl']
};

/**
 * SMS template for approval request notifications
 * Sends a concise SMS message to approvers when a refund requires their approval
 */
export const approvalRequestedSmsTemplate: NotificationTemplate = {
  template_id: 'approval-requested-sms',
  name: 'Approval Request SMS',
  notification_type: NotificationType.APPROVAL_REQUESTED,
  channels: [NotificationChannel.SMS],
  body_template: `ACTION REQUIRED: {{ merchantName }} refund for {{ amount | currency(currency) }} needs your approval by {{ approvalDeadline | date('MM/DD HH:mm') }}. Login to review: {{ approvalUrl }}`,
  subject_template: null,
  html_template: null,
  variables: ['merchantName', 'amount', 'currency', 'approvalDeadline', 'approvalUrl']
};

/**
 * In-app template for approval request notifications
 * Displays a notification in the dashboard UI when a refund requires approval
 */
export const approvalRequestedInAppTemplate: NotificationTemplate = {
  template_id: 'approval-requested-in-app',
  name: 'Approval Request In-App Notification',
  notification_type: NotificationType.APPROVAL_REQUESTED,
  channels: [NotificationChannel.IN_APP],
  subject_template: 'Refund Approval Required',
  body_template: `{{ merchantName }}: Refund #{{ refundId }} for {{ amount | currency(currency) }} requires your approval. Deadline: {{ approvalDeadline | date('MMM DD, YYYY HH:mm') }}.`,
  html_template: null,
  variables: ['merchantName', 'refundId', 'amount', 'currency', 'approvalDeadline']
};

/**
 * Export all approval request templates
 */
export default [
  approvalRequestedEmailTemplate,
  approvalRequestedSmsTemplate,
  approvalRequestedInAppTemplate
];