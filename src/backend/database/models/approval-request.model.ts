import mongoose from 'mongoose';
import { IApprovalRequest, IApprover, IApprovalDecision } from '../../common/interfaces/approval.interface';
import { ApprovalStatus } from '../../common/enums/approval-status.enum';
import { getConnection } from '../connection';

/**
 * Interface extending IApprovalRequest with Mongoose document properties and methods
 * for working with approval requests in the database
 */
export interface IApprovalRequestDocument extends IApprovalRequest, mongoose.Document {
  /**
   * Checks if the approval request is in APPROVED status
   */
  isApproved(): boolean;
  
  /**
   * Checks if the approval request is in REJECTED status
   */
  isRejected(): boolean;
  
  /**
   * Checks if the approval request is in PENDING status
   */
  isPending(): boolean;
  
  /**
   * Checks if the approval request is in ESCALATED status
   */
  isEscalated(): boolean;
  
  /**
   * Gets the list of approvers at the current escalation level
   */
  getCurrentApprovers(): IApprover[];
}

/**
 * Schema definition for the approval request collection
 * Implements the data structure required for the approval workflow process
 */
export const approvalRequestSchema = new mongoose.Schema({
  // Unique identifier for the approval request
  approvalId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Reference to the refund request this approval is for
  refundRequestId: {
    type: String,
    required: true,
    index: true
  },
  
  // Current status of the approval request (PENDING, APPROVED, REJECTED, ESCALATED)
  status: {
    type: String,
    enum: Object.values(ApprovalStatus),
    required: true,
    default: ApprovalStatus.PENDING,
    index: true
  },
  
  // Date when the approval request was created
  requestDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // List of approvers who need to review this request
  approvers: {
    type: [{
      id: {
        type: String,
        required: true
      },
      approvalId: {
        type: String,
        required: true
      },
      approverId: {
        type: String,
        required: true
      },
      approverRole: {
        type: String,
        required: true
      },
      escalationLevel: {
        type: Number,
        required: true,
        default: 0
      },
      assignedAt: {
        type: Date,
        required: true,
        default: Date.now
      },
      notifiedAt: {
        type: Date
      }
    }],
    required: true,
    default: []
  },
  
  // List of decisions made on this approval request
  decisions: {
    type: [{
      decisionId: {
        type: String,
        required: true
      },
      approvalId: {
        type: String,
        required: true
      },
      approverId: {
        type: String,
        required: true
      },
      decision: {
        type: String,
        enum: ['APPROVED', 'REJECTED'],
        required: true
      },
      decisionNotes: {
        type: String
      },
      decidedAt: {
        type: Date,
        required: true,
        default: Date.now
      }
    }],
    required: true,
    default: []
  },
  
  // Current escalation level of the approval request
  escalationLevel: {
    type: Number,
    required: true,
    default: 0
  },
  
  // Date when the current escalation level is due to escalate
  escalationDue: {
    type: Date,
    index: true
  }
}, { 
  timestamps: true, // Automatically add createdAt and updatedAt
  collection: 'approval_requests'
});

// Define instance methods for approval status checks
approvalRequestSchema.methods.isApproved = function(): boolean {
  return this.status === ApprovalStatus.APPROVED;
};

approvalRequestSchema.methods.isRejected = function(): boolean {
  return this.status === ApprovalStatus.REJECTED;
};

approvalRequestSchema.methods.isPending = function(): boolean {
  return this.status === ApprovalStatus.PENDING;
};

approvalRequestSchema.methods.isEscalated = function(): boolean {
  return this.status === ApprovalStatus.ESCALATED;
};

// Define method to get approvers at current escalation level
approvalRequestSchema.methods.getCurrentApprovers = function(): IApprover[] {
  return this.approvers.filter(approver => approver.escalationLevel === this.escalationLevel);
};

// Create indexes for commonly queried fields to optimize performance
approvalRequestSchema.index({ 'status': 1, 'escalationDue': 1 }, { 
  name: 'status_escalation_idx'
});

approvalRequestSchema.index({ 'refundRequestId': 1, 'status': 1 }, {
  name: 'refund_status_idx'
});

// Create the model
// Note: In a real application context, the connection is expected to be established
// before models are used, so we use the default mongoose connection here
const ApprovalRequestModel = mongoose.model<IApprovalRequestDocument>(
  'ApprovalRequest', 
  approvalRequestSchema
);

export { approvalRequestSchema, ApprovalRequestModel };
export default ApprovalRequestModel;