/**
 * Notification Templates Index
 * 
 * This barrel file exports all notification templates used throughout the refund system.
 * Templates are organized by notification type (refund created, completed, etc.) and
 * communication channel (email, SMS, in-app).
 */

// Import all notification templates
import { 
  refundCreatedEmailTemplate, 
  refundCreatedSmsTemplate, 
  refundCreatedInAppTemplate,
  default as refundCreatedTemplates
} from './refund-created.template';

import { 
  refundCompletedEmailTemplate, 
  refundCompletedSmsTemplate, 
  refundCompletedInAppTemplate,
  default as refundCompletedTemplates
} from './refund-completed.template';

import { 
  approvalRequestedEmailTemplate, 
  approvalRequestedSmsTemplate, 
  approvalRequestedInAppTemplate,
  default as approvalRequestedTemplates
} from './approval-requested.template';

import { 
  approvalReminderEmailTemplate, 
  approvalReminderSmsTemplate, 
  approvalReminderInAppTemplate,
  default as approvalReminderTemplates
} from './approval-reminder.template';

// Re-export each individual template
export {
  refundCreatedEmailTemplate,
  refundCreatedSmsTemplate,
  refundCreatedInAppTemplate,
  refundCompletedEmailTemplate,
  refundCompletedSmsTemplate,
  refundCompletedInAppTemplate,
  approvalRequestedEmailTemplate,
  approvalRequestedSmsTemplate,
  approvalRequestedInAppTemplate,
  approvalReminderEmailTemplate,
  approvalReminderSmsTemplate,
  approvalReminderInAppTemplate
};

// Export a combined array of all templates for use in the notification service
export default [
  ...refundCreatedTemplates,
  ...refundCompletedTemplates,
  ...approvalRequestedTemplates,
  ...approvalReminderTemplates
];