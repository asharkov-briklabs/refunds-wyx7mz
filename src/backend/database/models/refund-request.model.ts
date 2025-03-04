import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { RefundStatus } from '../../common/enums/refund-status.enum';
import { RefundMethod } from '../../common/enums/refund-method.enum';

/**
 * Interface for tracking status changes in the refund lifecycle
 */
export interface IStatusHistoryEntry {
  /** The status that the refund was changed to */
  status: RefundStatus;
  /** When the status change occurred */
  timestamp: Date;
  /** User or system that changed the status */
  changedBy: string;
  /** Optional reason for the status change */
  reason?: string;
}

/**
 * Interface for supporting documents attached to refund requests
 */
export interface ISupportingDocument {
  /** Unique identifier for the document */
  documentId: string;
  /** Type of document (e.g., CUSTOMER_EMAIL, PROOF_OF_PURCHASE) */
  documentType: string;
  /** When the document was uploaded */
  uploadedAt: Date;
  /** URL where the document can be accessed */
  url: string;
  /** User who uploaded the document */
  uploadedBy: string;
}

/**
 * Core interface defining the structure of a refund request
 */
export interface IRefundRequest {
  /** Unique identifier for the refund request */
  refundRequestId: string;
  /** ID of the original transaction being refunded */
  transactionId: string;
  /** ID of the merchant associated with this refund */
  merchantId: string;
  /** Optional ID of the customer associated with this refund */
  customerId?: string;
  /** Amount to be refunded */
  amount: number;
  /** Currency code (ISO 4217) */
  currency: string;
  /** Method used for processing the refund */
  refundMethod: RefundMethod;
  /** Standardized reason code for the refund */
  reasonCode: string;
  /** Detailed description of the refund reason */
  reason: string;
  /** ID of the bank account for OTHER refund method */
  bankAccountId?: string;
  /** Current status of the refund */
  status: RefundStatus;
  /** When the refund request was created */
  createdAt: Date;
  /** When the refund request was last updated */
  updatedAt: Date;
  /** When the refund was submitted for processing */
  submitedAt?: Date;
  /** When the refund started processing */
  processedAt?: Date;
  /** When the refund was completed */
  completedAt?: Date;
  /** ID of the approval request if approval is required */
  approvalId?: string;
  /** Reference ID from the payment gateway */
  gatewayReference?: string;
  /** User who created the refund request */
  createdBy: string;
  /** History of all status changes */
  statusHistory: IStatusHistoryEntry[];
  /** Supporting documents attached to the refund */
  supportingDocuments?: ISupportingDocument[];
  /** Additional data associated with the refund */
  metadata?: Record<string, any>;
}

/**
 * Mongoose document interface extending IRefundRequest
 */
export interface IRefundRequestDocument extends IRefundRequest, Document {
  /**
   * Checks if the refund request can still be refunded
   * @returns Whether the refund is in a refundable state
   */
  isRefundable(): boolean;
  
  /**
   * Checks if the refund request can be canceled
   * @returns Whether the refund can be canceled
   */
  isCancelable(): boolean;
  
  /**
   * Adds a new entry to the status history
   * @param status New status
   * @param changedBy User or system that changed the status
   * @param reason Optional reason for the change
   */
  addStatusHistoryEntry(status: RefundStatus, changedBy: string, reason?: string): void;
}

/**
 * Schema for status history entries
 */
export const statusHistorySchema = new Schema<IStatusHistoryEntry>({
  status: {
    type: String,
    required: true,
    enum: Object.values(RefundStatus)
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  changedBy: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: false
  }
});

/**
 * Schema for supporting documents
 */
export const supportingDocumentSchema = new Schema<ISupportingDocument>({
  documentId: {
    type: String,
    required: true
  },
  documentType: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  url: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: String,
    required: true
  }
});

/**
 * Model interface for RefundRequest with static methods
 */
export interface RefundRequestModelInterface extends Model<IRefundRequestDocument> {
  /**
   * Finds a refund request by its ID
   * @param refundRequestId The refund request ID
   * @returns The refund request document or null if not found
   */
  findByRefundRequestId(refundRequestId: string): Promise<IRefundRequestDocument | null>;
  
  /**
   * Finds refund requests for a transaction
   * @param transactionId The transaction ID
   * @returns Array of refund request documents
   */
  findByTransactionId(transactionId: string): Promise<IRefundRequestDocument[]>;
  
  /**
   * Finds refund requests for a merchant
   * @param merchantId The merchant ID
   * @returns Array of refund request documents
   */
  findByMerchantId(merchantId: string): Promise<IRefundRequestDocument[]>;
}

/**
 * Main schema for refund request documents
 */
export const refundRequestSchema = new Schema<IRefundRequestDocument>(
  {
    refundRequestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => `req_${uuidv4().replace(/-/g, '')}`
    },
    transactionId: {
      type: String,
      required: true,
      index: true
    },
    merchantId: {
      type: String,
      required: true,
      index: true
    },
    customerId: {
      type: String,
      required: false,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    currency: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 3,
      uppercase: true
    },
    refundMethod: {
      type: String,
      required: true,
      enum: Object.values(RefundMethod)
    },
    reasonCode: {
      type: String,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    bankAccountId: {
      type: String,
      required: false,
      index: true
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(RefundStatus),
      default: RefundStatus.DRAFT,
      index: true
    },
    approvalId: {
      type: String,
      required: false,
      index: true
    },
    gatewayReference: {
      type: String,
      required: false,
      index: true
    },
    createdBy: {
      type: String,
      required: true
    },
    submitedAt: {
      type: Date,
      required: false
    },
    processedAt: {
      type: Date,
      required: false
    },
    completedAt: {
      type: Date,
      required: false
    },
    statusHistory: {
      type: [statusHistorySchema],
      required: true,
      default: []
    },
    supportingDocuments: {
      type: [supportingDocumentSchema],
      required: false,
      default: []
    },
    metadata: {
      type: Object,
      required: false,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: 'refund_requests',
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true
    }
  }
);

// Indexes for optimized querying
refundRequestSchema.index({ refundRequestId: 1 }, { unique: true });
refundRequestSchema.index({ merchantId: 1, createdAt: -1 });
refundRequestSchema.index({ status: 1, createdAt: -1 });
refundRequestSchema.index({ transactionId: 1 });
refundRequestSchema.index({ createdAt: 1 });

/**
 * Checks if the refund request can still be refunded
 * @returns Whether the refund is in a refundable state
 */
refundRequestSchema.methods.isRefundable = function(): boolean {
  const nonRefundableStatuses = [
    RefundStatus.COMPLETED,
    RefundStatus.FAILED,
    RefundStatus.CANCELED
  ];
  return !nonRefundableStatuses.includes(this.status);
};

/**
 * Checks if the refund request can be canceled
 * @returns Whether the refund can be canceled
 */
refundRequestSchema.methods.isCancelable = function(): boolean {
  const cancelableStatuses = [
    RefundStatus.DRAFT,
    RefundStatus.SUBMITTED,
    RefundStatus.PENDING_APPROVAL
  ];
  return cancelableStatuses.includes(this.status);
};

/**
 * Adds a new entry to the status history
 * @param status New status
 * @param changedBy User or system that changed the status
 * @param reason Optional reason for the change
 */
refundRequestSchema.methods.addStatusHistoryEntry = function(
  status: RefundStatus,
  changedBy: string,
  reason?: string
): void {
  this.statusHistory.push({
    status,
    timestamp: new Date(),
    changedBy,
    reason
  });
};

/**
 * Finds a refund request by its ID
 * @param refundRequestId The refund request ID
 * @returns The refund request document or null if not found
 */
refundRequestSchema.statics.findByRefundRequestId = function(
  refundRequestId: string
): Promise<IRefundRequestDocument | null> {
  return this.findOne({ refundRequestId });
};

/**
 * Finds refund requests for a transaction
 * @param transactionId The transaction ID
 * @returns Array of refund request documents
 */
refundRequestSchema.statics.findByTransactionId = function(
  transactionId: string
): Promise<IRefundRequestDocument[]> {
  return this.find({ transactionId });
};

/**
 * Finds refund requests for a merchant
 * @param merchantId The merchant ID
 * @returns Array of refund request documents
 */
refundRequestSchema.statics.findByMerchantId = function(
  merchantId: string
): Promise<IRefundRequestDocument[]> {
  return this.find({ merchantId }).sort({ createdAt: -1 });
};

/**
 * Mongoose model for RefundRequest documents
 */
export const RefundRequestModel = mongoose.model<IRefundRequestDocument, RefundRequestModelInterface>(
  'RefundRequest',
  refundRequestSchema
);