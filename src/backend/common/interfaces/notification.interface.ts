/**
 * Notification interfaces and enums for the Refunds Service
 * Defines the core structures for multi-channel notifications across the platform
 */

/**
 * Types of notifications that can be sent by the Refunds Service
 */
export enum NotificationType {
  /** Sent when a new refund request is created */
  REFUND_CREATED = 'REFUND_CREATED',
  
  /** Sent when a refund is successfully processed */
  REFUND_COMPLETED = 'REFUND_COMPLETED',
  
  /** Sent when a refund fails processing */
  REFUND_FAILED = 'REFUND_FAILED',
  
  /** Sent when a refund requires approval */
  APPROVAL_REQUESTED = 'APPROVAL_REQUESTED',
  
  /** Sent as a reminder for pending approvals */
  APPROVAL_REMINDER = 'APPROVAL_REMINDER',
  
  /** Sent when an approval is escalated to the next level */
  APPROVAL_ESCALATED = 'APPROVAL_ESCALATED',
  
  /** Sent for bank account verification */
  VERIFICATION_REQUESTED = 'VERIFICATION_REQUESTED',
  
  /** Sent when a compliance rule is violated */
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION'
}

/**
 * Available channels for delivering notifications
 */
export enum NotificationChannel {
  /** Email notifications */
  EMAIL = 'EMAIL',
  
  /** SMS text message notifications */
  SMS = 'SMS',
  
  /** In-app notifications displayed in the UI */
  IN_APP = 'IN_APP'
}

/**
 * Possible statuses of a notification
 */
export enum NotificationStatus {
  /** Notification is queued for delivery */
  PENDING = 'PENDING',
  
  /** Notification has been sent to the delivery service */
  SENT = 'SENT',
  
  /** Notification has been delivered to the recipient */
  DELIVERED = 'DELIVERED',
  
  /** Notification has been read by the recipient */
  READ = 'READ',
  
  /** Notification delivery failed */
  FAILED = 'FAILED',
  
  /** Notification was canceled before delivery */
  CANCELED = 'CANCELED'
}

/**
 * Structure of a message to be sent through a notification channel
 */
export interface NotificationMessage {
  /** Recipient identifier (email, phone number, or user ID) */
  recipient: string;
  
  /** Subject line (for channels that support it, like email) */
  subject: string | null;
  
  /** Plain text body of the notification */
  body: string;
  
  /** HTML-formatted body (for channels that support it, like email) */
  html_body: string | null;
  
  /** Unique identifier for the notification */
  notification_id: string;
  
  /** Type of notification being sent */
  notification_type: NotificationType;
}

/**
 * Result of a notification delivery attempt
 */
export interface NotificationResult {
  /** Whether the notification was successfully sent */
  success: boolean;
  
  /** Current status of the notification delivery */
  delivery_status: NotificationStatus;
  
  /** Provider-specific message ID for tracking (if available) */
  provider_message_id: string | null;
  
  /** Error message if delivery failed */
  error: string | null;
}

/**
 * Complete notification record stored in the database
 */
export interface Notification {
  /** Unique identifier for the notification */
  notification_id: string;
  
  /** User ID of the recipient */
  user_id: string;
  
  /** Type of notification */
  notification_type: NotificationType;
  
  /** Channel used for delivery */
  channel: NotificationChannel;
  
  /** Current status of the notification */
  status: NotificationStatus;
  
  /** Subject line (if applicable) */
  subject: string | null;
  
  /** Notification body */
  body: string;
  
  /** When the notification is scheduled to be sent (for scheduled notifications) */
  scheduled_time: Date | null;
  
  /** When the notification was sent */
  sent_time: Date | null;
  
  /** Current delivery status from the provider */
  delivery_status: NotificationStatus | null;
  
  /** Additional delivery details from the provider */
  delivery_details: Record<string, any> | null;
  
  /** Context data used to generate the notification */
  context: Record<string, any> | null;
  
  /** When the notification was read by the recipient */
  read_at: Date | null;
  
  /** ID of the related entity (refund, approval, etc.) */
  reference_id: string | null;
  
  /** Type of the related entity */
  reference_type: string | null;
  
  /** When the notification was created */
  created_at: Date;
}

/**
 * Notification template with placeholders for dynamic content
 */
export interface NotificationTemplate {
  /** Unique identifier for the template */
  template_id: string;
  
  /** Type of notification this template is for */
  notification_type: NotificationType;
  
  /** Channels this template supports */
  channels: NotificationChannel[];
  
  /** Template for the subject line (with variable placeholders) */
  subject_template: string | null;
  
  /** Template for the plain text body (with variable placeholders) */
  body_template: string;
  
  /** Template for the HTML body (with variable placeholders) */
  html_template: string | null;
  
  /** List of variables this template uses */
  variables: string[];
}

/**
 * Context data that can be used to render notification templates
 * Contains all possible fields, but only relevant ones will be populated based on notification type
 */
export interface NotificationContext {
  /** Name of the merchant */
  merchantName: string;
  
  /** ID of the refund */
  refundId: string;
  
  /** ID of the original transaction */
  transactionId: string;
  
  /** Refund amount */
  amount: number;
  
  /** Currency code */
  currency: string;
  
  /** Refund reason */
  reason: string;
  
  /** Deadline for approval (for approval notifications) */
  approvalDeadline: Date | null;
  
  /** When the refund was completed (for completion notifications) */
  completionTime: Date | null;
  
  /** Error reason (for failure notifications) */
  errorReason: string | null;
  
  /** Bank account ID (for verification notifications) */
  accountId: string | null;
  
  /** Type of verification (for verification notifications) */
  verificationType: string | null;
  
  /** Type of compliance violation */
  violationType: string | null;
  
  /** Detailed information about the violation */
  violationDetails: Record<string, any> | null;
  
  /** Steps to remediate the violation */
  remediationSteps: string | null;
}

/**
 * User preferences for receiving notifications
 */
export interface NotificationPreference {
  /** Unique identifier for the preference */
  preference_id: string;
  
  /** User ID */
  user_id: string;
  
  /** Type of notification */
  notification_type: NotificationType;
  
  /** Delivery channel */
  channel: NotificationChannel;
  
  /** Whether notifications of this type are enabled for this channel */
  enabled: boolean;
  
  /** When the preference was last updated */
  updated_at: Date;
}