/**
 * Notification Types
 * 
 * This module defines TypeScript interfaces and types for notification-related entities
 * used throughout the application for alerting users about refund events, approvals,
 * and status updates across multiple channels.
 */

import { RefundStatus } from './refund.types';

/**
 * Enum defining all possible notification types in the system
 */
export enum NotificationType {
  REFUND_CREATED = 'REFUND_CREATED',
  REFUND_COMPLETED = 'REFUND_COMPLETED',
  REFUND_FAILED = 'REFUND_FAILED',
  APPROVAL_REQUESTED = 'APPROVAL_REQUESTED',
  APPROVAL_REMINDER = 'APPROVAL_REMINDER',
  APPROVAL_ESCALATED = 'APPROVAL_ESCALATED',
  VERIFICATION_REQUESTED = 'VERIFICATION_REQUESTED',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION'
}

/**
 * Enum defining available notification delivery channels
 */
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  IN_APP = 'IN_APP'
}

/**
 * Enum defining possible notification status values
 */
export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

/**
 * Enum defining notification priority levels
 */
export enum NotificationPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

/**
 * Interface for contextual data included in notifications
 * Contains relevant refund and approval details to provide context in notifications
 */
export interface NotificationContextData {
  refundId?: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  refundStatus?: RefundStatus;
  approvalId?: string;
  approverName?: string;
}

/**
 * Interface representing a notification object
 * Contains all details needed to display and track a notification
 */
export interface Notification {
  id: string;
  type: NotificationType;
  userId: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  priority: NotificationPriority;
  createdAt: string;
  readAt: string | null;
  referenceId: string | null;
  referenceType: string | null;
  data: NotificationContextData;
}

/**
 * Interface representing user notification preferences
 * Used to store and manage user preferences for notification delivery
 */
export interface NotificationPreference {
  notificationType: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
}

/**
 * Interface for filtering notifications in listings and queries
 * Provides options to filter notifications by various criteria
 */
export interface NotificationFilter {
  type?: NotificationType | NotificationType[];
  channel?: NotificationChannel | NotificationChannel[];
  status?: NotificationStatus | NotificationStatus[];
  startDate?: string;
  endDate?: string;
  read?: boolean;
}