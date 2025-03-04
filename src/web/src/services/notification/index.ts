/**
 * Notification Service Exports
 * 
 * This file exports all notification-related components and services, providing a 
 * centralized entry point for notification functionality across the Refunds Service
 * application. This simplifies imports for components that need to work with notifications.
 */

// Export notification context components for state management
import { NotificationContext, NotificationProvider, useNotificationContext } from './notification.context';

// Export notification service for API operations
import { notificationService } from './notification.service';

// Re-export all components and services
export { 
  // Context components for notification state management
  NotificationContext,
  NotificationProvider, 
  useNotificationContext,
  
  // Service for notification operations
  notificationService 
};