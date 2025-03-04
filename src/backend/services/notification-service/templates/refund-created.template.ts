import { NotificationType, NotificationChannel, NotificationTemplate } from '../../../../common/interfaces/notification.interface';
import { formatCurrency } from '../../../../common/utils/currency-utils';

/**
 * Email template for refund creation notifications
 */
export const refundCreatedEmailTemplate: NotificationTemplate = {
  template_id: 'refund-created-email',
  notification_type: NotificationType.REFUND_CREATED,
  channels: [NotificationChannel.EMAIL],
  subject_template: 'Refund Request Created - {{refundId}}',
  body_template: `Dear {{merchantName}},

A new refund request has been created with the following details:

Refund ID: {{refundId}}
Transaction ID: {{transactionId}}
Amount: {{formatCurrency(amount, currency)}}
Reason: {{reason}}

You can track the status of this refund in your merchant dashboard.

Thank you,
Brik Payments Team`,
  html_template: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
    <h2 style="color: #333;">Refund Request Created</h2>
  </div>
  
  <div style="padding: 20px;">
    <p>Dear {{merchantName}},</p>
    
    <p>A new refund request has been created with the following details:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr style="background-color: #f8f9fa;">
        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Refund ID</th>
        <td style="padding: 10px; border: 1px solid #ddd;">{{refundId}}</td>
      </tr>
      <tr>
        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Transaction ID</th>
        <td style="padding: 10px; border: 1px solid #ddd;">{{transactionId}}</td>
      </tr>
      <tr style="background-color: #f8f9fa;">
        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Amount</th>
        <td style="padding: 10px; border: 1px solid #ddd;">{{formatCurrency(amount, currency)}}</td>
      </tr>
      <tr>
        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Reason</th>
        <td style="padding: 10px; border: 1px solid #ddd;">{{reason}}</td>
      </tr>
    </table>
    
    <p>You can track the status of this refund in your <a href="https://dashboard.brik.com/refunds/{{refundId}}" style="color: #0066cc; text-decoration: none;">merchant dashboard</a>.</p>
    
    <p>Thank you,<br>Brik Payments Team</p>
  </div>
  
  <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
    <p>This is an automated message. Please do not reply to this email.</p>
  </div>
</div>`,
  variables: ['merchantName', 'refundId', 'transactionId', 'amount', 'currency', 'reason']
};

/**
 * SMS template for refund creation notifications
 */
export const refundCreatedSmsTemplate: NotificationTemplate = {
  template_id: 'refund-created-sms',
  notification_type: NotificationType.REFUND_CREATED,
  channels: [NotificationChannel.SMS],
  subject_template: null, // SMS doesn't have subjects
  body_template: `Brik: Refund request {{refundId}} created for {{formatCurrency(amount, currency)}}. Track status in your merchant dashboard.`,
  html_template: null, // SMS doesn't support HTML
  variables: ['refundId', 'amount', 'currency']
};

/**
 * In-app notification template for refund creation
 */
export const refundCreatedInAppTemplate: NotificationTemplate = {
  template_id: 'refund-created-in-app',
  notification_type: NotificationType.REFUND_CREATED,
  channels: [NotificationChannel.IN_APP],
  subject_template: 'New Refund Request',
  body_template: `Refund request {{refundId}} created for {{formatCurrency(amount, currency)}} from transaction {{transactionId}}.`,
  html_template: null, // In-app notifications use custom UI components, not HTML
  variables: ['refundId', 'transactionId', 'amount', 'currency']
};

// Export all templates
export default [
  refundCreatedEmailTemplate,
  refundCreatedSmsTemplate,
  refundCreatedInAppTemplate
];