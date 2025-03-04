import { NotificationType, NotificationChannel, NotificationTemplate } from '../../../../common/interfaces/notification.interface';
import { formatCurrency } from '../../../../common/utils/currency-utils';

/**
 * Email template for refund completion notification
 * Includes detailed refund information with HTML formatting
 */
export const refundCompletedEmailTemplate: NotificationTemplate = {
  templateId: 'refund-completed-email',
  name: 'Refund Completed Email',
  notificationType: NotificationType.REFUND_COMPLETED,
  channels: [NotificationChannel.EMAIL],
  subjectTemplate: 'Your refund of {{formatCurrency amount currency}} has been processed',
  bodyTemplate: `Dear Customer,

We're pleased to inform you that your refund for transaction {{transactionId}} has been successfully processed. The amount of {{formatCurrency amount currency}} has been returned via your original payment method.

Refund Details:
- Refund ID: {{refundId}}
- Amount: {{formatCurrency amount currency}}
- Transaction: {{transactionId}}
- Processed: {{completionTime}}

Please note that it may take 3-5 business days for the refund to appear in your account, depending on your financial institution.

If you have any questions, please contact {{merchantName}} or our support team.

Thank you for your patience.

Regards,
The {{merchantName}} Team`,
  htmlTemplate: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Refund Completed</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .footer { font-size: 12px; color: #666; border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; }
    .refund-details { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .amount { font-weight: bold; color: #28a745; }
    @media only screen and (max-width: 480px) {
      body { padding: 10px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Refund Successfully Processed</h2>
  </div>
  
  <div class="content">
    <p>Dear Customer,</p>
    
    <p>We're pleased to inform you that your refund for transaction <strong>{{transactionId}}</strong> has been successfully processed. The amount of <span class="amount">{{formatCurrency amount currency}}</span> has been returned via your original payment method.</p>
    
    <div class="refund-details">
      <p><strong>Refund Details:</strong></p>
      <ul>
        <li>Refund ID: {{refundId}}</li>
        <li>Amount: {{formatCurrency amount currency}}</li>
        <li>Transaction: {{transactionId}}</li>
        <li>Processed: {{completionTime}}</li>
      </ul>
    </div>
    
    <p>Please note that it may take 3-5 business days for the refund to appear in your account, depending on your financial institution.</p>
    
    <p>If you have any questions, please contact {{merchantName}} or our support team.</p>
    
    <p>Thank you for your patience.</p>
    
    <p>Regards,<br>
    The {{merchantName}} Team</p>
  </div>
  
  <div class="footer">
    <p>This is an automated message, please do not reply directly to this email.</p>
  </div>
</body>
</html>`,
  variables: ['merchantName', 'refundId', 'transactionId', 'amount', 'currency', 'completionTime']
};

/**
 * SMS template for refund completion notification
 * Concise format optimized for mobile devices
 */
export const refundCompletedSmsTemplate: NotificationTemplate = {
  templateId: 'refund-completed-sms',
  name: 'Refund Completed SMS',
  notificationType: NotificationType.REFUND_COMPLETED,
  channels: [NotificationChannel.SMS],
  subjectTemplate: null,
  bodyTemplate: `{{merchantName}}: Your refund of {{formatCurrency amount currency}} for transaction {{transactionId}} has been processed. It may take 3-5 business days to appear in your account.`,
  htmlTemplate: null,
  variables: ['merchantName', 'amount', 'currency', 'transactionId']
};

/**
 * In-app template for refund completion notification
 * Brief but informative for display within the application
 */
export const refundCompletedInAppTemplate: NotificationTemplate = {
  templateId: 'refund-completed-in-app',
  name: 'Refund Completed In-App',
  notificationType: NotificationType.REFUND_COMPLETED,
  channels: [NotificationChannel.IN_APP],
  subjectTemplate: 'Refund Completed',
  bodyTemplate: `Your refund of {{formatCurrency amount currency}} for transaction {{transactionId}} has been successfully processed. The funds will be returned to your original payment method within 3-5 business days.`,
  htmlTemplate: null,
  variables: ['amount', 'currency', 'transactionId']
};

/**
 * Export all refund completion notification templates
 */
export default [
  refundCompletedEmailTemplate,
  refundCompletedSmsTemplate,
  refundCompletedInAppTemplate
];