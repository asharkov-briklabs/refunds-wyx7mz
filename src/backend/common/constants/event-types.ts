/**
 * Event Types Constants
 * 
 * This file defines all event types used throughout the Refunds Service.
 * These constants ensure consistency in event publishing and subscription
 * across the event-driven architecture.
 */

/**
 * Enumeration of high-level event categories in the system
 */
export enum EventType {
  REFUND = 'refund',
  APPROVAL = 'approval',
  GATEWAY = 'gateway',
  BANK_ACCOUNT = 'bank_account',
  PARAMETER = 'parameter',
  NOTIFICATION = 'notification',
  SYSTEM = 'system'
}

/**
 * Constants for refund lifecycle events
 */
export const REFUND_EVENTS = {
  /** Emitted when a refund is first created in DRAFT state */
  CREATED: `${EventType.REFUND}.created`,
  
  /** Emitted when a refund is submitted for processing */
  SUBMITTED: `${EventType.REFUND}.submitted`,
  
  /** General event for any status change */
  STATUS_CHANGED: `${EventType.REFUND}.status_changed`,
  
  /** Emitted when a refund is approved in an approval workflow */
  APPROVED: `${EventType.REFUND}.approved`,
  
  /** Emitted when a refund is rejected in an approval workflow */
  REJECTED: `${EventType.REFUND}.rejected`,
  
  /** Emitted when refund processing begins with the payment gateway */
  PROCESSING_STARTED: `${EventType.REFUND}.processing_started`,
  
  /** Emitted when a refund is successfully completed */
  COMPLETED: `${EventType.REFUND}.completed`,
  
  /** Emitted when a refund fails processing */
  FAILED: `${EventType.REFUND}.failed`,
  
  /** Emitted when a refund is canceled */
  CANCELED: `${EventType.REFUND}.canceled`
};

/**
 * Constants for approval workflow events
 */
export const APPROVAL_EVENTS = {
  /** Emitted when an approval is first requested */
  REQUESTED: `${EventType.APPROVAL}.requested`,
  
  /** Emitted when any approval decision is recorded */
  DECISION_RECORDED: `${EventType.APPROVAL}.decision_recorded`,
  
  /** Emitted when an approval is granted */
  APPROVED: `${EventType.APPROVAL}.approved`,
  
  /** Emitted when an approval is rejected */
  REJECTED: `${EventType.APPROVAL}.rejected`,
  
  /** Emitted when an approval is escalated to the next level */
  ESCALATED: `${EventType.APPROVAL}.escalated`,
  
  /** Emitted when a reminder is sent for a pending approval */
  REMINDER_SENT: `${EventType.APPROVAL}.reminder_sent`,
  
  /** Emitted when an approval request expires */
  EXPIRED: `${EventType.APPROVAL}.expired`
};

/**
 * Constants for payment gateway integration events
 */
export const GATEWAY_EVENTS = {
  /** Emitted when gateway processing begins */
  PROCESSING_INITIATED: `${EventType.GATEWAY}.processing_initiated`,
  
  /** Emitted when gateway processing completes successfully */
  PROCESSING_COMPLETED: `${EventType.GATEWAY}.processing_completed`,
  
  /** Emitted when gateway processing fails */
  PROCESSING_FAILED: `${EventType.GATEWAY}.processing_failed`,
  
  /** Emitted when a retry is initiated for a failed gateway operation */
  RETRY_INITIATED: `${EventType.GATEWAY}.retry_initiated`,
  
  /** Emitted when gateway status is updated (e.g., from a webhook) */
  STATUS_UPDATED: `${EventType.GATEWAY}.status_updated`,
  
  /** Emitted when a webhook is received from a payment gateway */
  WEBHOOK_RECEIVED: `${EventType.GATEWAY}.webhook_received`
};

/**
 * Constants for bank account management events
 */
export const BANK_ACCOUNT_EVENTS = {
  /** Emitted when a bank account is created */
  CREATED: `${EventType.BANK_ACCOUNT}.created`,
  
  /** Emitted when a bank account is updated */
  UPDATED: `${EventType.BANK_ACCOUNT}.updated`,
  
  /** Emitted when a bank account is deleted */
  DELETED: `${EventType.BANK_ACCOUNT}.deleted`,
  
  /** Emitted when bank account verification is initiated */
  VERIFICATION_INITIATED: `${EventType.BANK_ACCOUNT}.verification_initiated`,
  
  /** Emitted when bank account verification is completed */
  VERIFICATION_COMPLETED: `${EventType.BANK_ACCOUNT}.verification_completed`,
  
  /** Emitted when bank account verification fails */
  VERIFICATION_FAILED: `${EventType.BANK_ACCOUNT}.verification_failed`
};

/**
 * Constants for parameter configuration events
 */
export const PARAMETER_EVENTS = {
  /** Emitted when a parameter is updated */
  UPDATED: `${EventType.PARAMETER}.updated`,
  
  /** Emitted when a parameter is deleted */
  DELETED: `${EventType.PARAMETER}.deleted`,
  
  /** Emitted when parameter cache is invalidated */
  CACHE_INVALIDATED: `${EventType.PARAMETER}.cache_invalidated`
};

/**
 * Constants for notification system events
 */
export const NOTIFICATION_EVENTS = {
  /** Emitted when notification delivery is requested */
  DELIVERY_REQUESTED: `${EventType.NOTIFICATION}.delivery_requested`,
  
  /** Emitted when notification is successfully delivered */
  DELIVERY_SUCCEEDED: `${EventType.NOTIFICATION}.delivery_succeeded`,
  
  /** Emitted when notification delivery fails */
  DELIVERY_FAILED: `${EventType.NOTIFICATION}.delivery_failed`,
  
  /** Emitted when notification preferences are updated */
  PREFERENCE_UPDATED: `${EventType.NOTIFICATION}.preference_updated`
};

/**
 * Constants for system-level events
 */
export const SYSTEM_EVENTS = {
  /** Emitted during health check operations */
  HEALTH_CHECK: `${EventType.SYSTEM}.health_check`,
  
  /** Emitted when a system error occurs */
  ERROR_OCCURRED: `${EventType.SYSTEM}.error_occurred`,
  
  /** Emitted when system configuration changes */
  CONFIG_CHANGED: `${EventType.SYSTEM}.config_changed`,
  
  /** Emitted during system startup */
  STARTUP: `${EventType.SYSTEM}.startup`,
  
  /** Emitted during system shutdown */
  SHUTDOWN: `${EventType.SYSTEM}.shutdown`
};