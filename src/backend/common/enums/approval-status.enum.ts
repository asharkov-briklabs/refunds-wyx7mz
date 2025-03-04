/**
 * Enum representing the possible statuses of an approval request in the refund workflow.
 * These statuses track the approval lifecycle from initial request through decision making
 * and possible escalation paths.
 */
export enum ApprovalStatus {
  /**
   * The approval request has been created but no decision has been made yet.
   * This is the initial state of all approval requests.
   */
  PENDING = 'PENDING',

  /**
   * The approval request has been approved by an authorized approver.
   * The refund process can proceed to the next stage.
   */
  APPROVED = 'APPROVED',

  /**
   * The approval request has been rejected by an authorized approver.
   * The refund process will be halted and will not proceed further.
   */
  REJECTED = 'REJECTED',

  /**
   * The approval request has been escalated to the next level in the approval hierarchy,
   * typically due to a timeout or explicit escalation action.
   */
  ESCALATED = 'ESCALATED'
}