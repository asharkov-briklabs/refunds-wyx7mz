/**
 * Defines all possible statuses a refund can have throughout its lifecycle.
 * This enum is used to track state transitions and validate allowed operations
 * based on current refund status.
 * 
 * State transitions follow the defined state machine in the system architecture:
 * - DRAFT: Initial creation state before submission
 * - SUBMITTED: Refund has been submitted for processing
 * - VALIDATION_FAILED: Refund failed validation checks
 * - PENDING_APPROVAL: Refund requires approval before processing
 * - PROCESSING: Refund is being processed
 * - GATEWAY_PENDING: Refund has been submitted to payment gateway
 * - GATEWAY_ERROR: Error occurred during gateway processing
 * - COMPLETED: Refund has been successfully completed
 * - FAILED: Refund failed during processing
 * - REJECTED: Refund was rejected during approval process
 * - CANCELED: Refund was canceled
 */
export enum RefundStatus {
  /**
   * Initial creation state, refund is being prepared but not yet submitted
   */
  DRAFT = 'DRAFT',
  
  /**
   * Refund has been submitted and passed initial validation
   */
  SUBMITTED = 'SUBMITTED',
  
  /**
   * Refund failed validation checks
   */
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  
  /**
   * Refund requires approval before processing
   */
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  
  /**
   * Refund is being processed
   */
  PROCESSING = 'PROCESSING',
  
  /**
   * Refund has been submitted to payment gateway
   */
  GATEWAY_PENDING = 'GATEWAY_PENDING',
  
  /**
   * Error occurred during gateway processing, may be retried
   */
  GATEWAY_ERROR = 'GATEWAY_ERROR',
  
  /**
   * Refund has been successfully completed
   */
  COMPLETED = 'COMPLETED',
  
  /**
   * Refund failed during processing
   */
  FAILED = 'FAILED',
  
  /**
   * Refund was rejected during approval process
   */
  REJECTED = 'REJECTED',
  
  /**
   * Refund was canceled
   */
  CANCELED = 'CANCELED'
}