/**
 * Template Renderer
 * 
 * This module provides utilities for rendering notification templates with context data.
 * It supports template retrieval by ID or notification type/channel, variable substitution,
 * and formatting capabilities for generating personalized notification content.
 */

import jinja2 from 'jinja2-js'; // version: ^1.0.0
import { logger } from '../../common/utils/logger';
import { 
  NotificationTemplate, 
  NotificationType, 
  NotificationChannel 
} from '../../common/interfaces/notification.interface';
import templates from './templates';
import { formatCurrency } from '../../common/utils/currency-utils';
import { formatDate } from '../../common/utils/date-utils';
import { BusinessError } from '../../common/errors';

/**
 * Renders a notification template with the provided context data
 * 
 * @param template - Template string with placeholders
 * @param context - Context data for variable substitution
 * @returns Rendered template string
 * @throws Error if template rendering fails
 */
export function renderTemplate(template: string, context: Record<string, any>): string {
  if (!template) {
    throw new Error('Template is required');
  }
  
  try {
    // Create Jinja2 environment
    const env = jinja2.Environment({
      autoescape: true
    });
    
    // Add custom filters
    env.addFilter('currency', formatCurrency);
    env.addFilter('date', formatDate);
    
    // Compile template
    const templateObj = env.fromString(template);
    
    // Render template with context
    const rendered = templateObj.render(context || {});
    
    return rendered;
  } catch (error) {
    logger.error('Error rendering template', { error, template });
    throw new Error(`Error rendering template: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Retrieves a notification template by its ID
 * 
 * @param templateId - The ID of the template to retrieve
 * @returns The notification template or null if not found
 */
export function getTemplateById(templateId: string): NotificationTemplate | null {
  if (!templateId) {
    logger.warn('Template ID is required');
    return null;
  }
  
  const template = templates.find(t => t.template_id === templateId);
  
  if (!template) {
    logger.warn(`Template not found with ID: ${templateId}`);
  }
  
  return template || null;
}

/**
 * Retrieves a notification template for a specific notification type and channel
 * 
 * @param notificationType - The type of notification
 * @param channel - The notification channel
 * @returns The notification template or null if not found
 */
export function getTemplateByTypeAndChannel(
  notificationType: NotificationType,
  channel: NotificationChannel
): NotificationTemplate | null {
  // Find templates for the given notification type
  const typeTemplates = templates.filter(t => t.notification_type === notificationType);
  
  // If no templates found for this type, return null
  if (!typeTemplates.length) {
    logger.info(`No templates found for notification type: ${notificationType}`);
    return null;
  }
  
  // Find template for the specified channel
  const template = typeTemplates.find(t => t.channels.includes(channel));
  
  if (!template) {
    logger.info(`No template found for notification type ${notificationType} and channel ${channel}`);
  }
  
  return template || null;
}

/**
 * Validates that the context contains all required variables for a template
 * 
 * @param template - The notification template
 * @param context - Context data for variable substitution
 * @returns True if valid, throws error if invalid
 * @throws BusinessError if required variables are missing
 */
function validateTemplateContext(
  template: NotificationTemplate,
  context: Record<string, any>
): boolean {
  if (!template.variables || !template.variables.length) {
    // No required variables defined
    return true;
  }
  
  const missingVariables = template.variables.filter(variable => {
    return context[variable] === undefined;
  });
  
  if (missingVariables.length > 0) {
    throw new BusinessError(
      'VALIDATION_ERROR',
      `Missing required variables for template: ${missingVariables.join(', ')}`,
      {
        ruleName: 'Template Variable Validation',
        message: `Missing required variables for template: ${missingVariables.join(', ')}`,
        additionalData: {
          template_id: template.template_id,
          missing_variables: missingVariables
        }
      }
    );
  }
  
  return true;
}

/**
 * Renders a notification using a template and context data
 * 
 * @param notificationType - The type of notification
 * @param channel - The notification channel
 * @param context - Context data for variable substitution
 * @returns Object containing rendered subject, body, and HTML content
 * @throws BusinessError if template not found or rendering fails
 */
export function renderNotification(
  notificationType: NotificationType,
  channel: NotificationChannel,
  context: Record<string, any>
): { subject: string | null; body: string; html: string | null } {
  // Get template for notification type and channel
  const template = getTemplateByTypeAndChannel(notificationType, channel);
  
  if (!template) {
    throw new BusinessError(
      'RESOURCE_NOT_FOUND',
      `No template found for notification type ${notificationType} and channel ${channel}`,
      {
        ruleName: 'Template Availability',
        message: `No template found for notification type ${notificationType} and channel ${channel}`
      }
    );
  }
  
  // Validate context has all required variables
  validateTemplateContext(template, context);
  
  try {
    // Render subject if available
    const subject = template.subject_template 
      ? renderTemplate(template.subject_template, context) 
      : null;
    
    // Render body (required)
    const body = renderTemplate(template.body_template, context);
    
    // Render HTML if available
    const html = template.html_template 
      ? renderTemplate(template.html_template, context) 
      : null;
    
    return { subject, body, html };
  } catch (error) {
    logger.error('Error rendering notification', { 
      error, 
      notificationType, 
      channel, 
      template_id: template.template_id 
    });
    
    throw new BusinessError(
      'INTERNAL_SERVER_ERROR',
      `Error rendering notification: ${error instanceof Error ? error.message : String(error)}`,
      {
        ruleName: 'Template Rendering',
        message: `Error rendering notification template`,
        additionalData: {
          error: error instanceof Error ? error.message : String(error),
          notificationType,
          channel
        }
      }
    );
  }
}