import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid'; // uuid v9.0.0

import { RefundStatus } from '../../common/enums/refund-status.enum';
import { RefundMethod } from '../../common/enums/refund-method.enum';
import { GatewayType } from '../../common/enums/gateway-type.enum';

/**
 * Interface representing a processed refund entity
 * This represents the result of a refund request after processing through a payment gateway
 */
export interface IRefund {
  /** Unique identifier for the processed refund */
  refundId: string;
  
  /** Reference to the original refund request that initiated this refund */
  refundRequestId: string;
  
  /** Original transaction ID that is being refunded */
  transactionId: string;
  
  /** Merchant ID associated with the refund */
  merchantId: string;
  
  /** Payment gateway used to process the refund */
  gateway: GatewayType;
  
  /** Reference ID returned by the payment gateway */
  gatewayReference: string;
  
  /** Method used for the refund (original payment, balance, other) */
  refundMethod: RefundMethod;
  
  /** Refund amount */
  amount: number;
  
  /** Currency code (ISO 4217) */
  currency: string;
  
  /** Current status of the refund */
  status: RefundStatus;
  
  /** Additional processing details from the gateway */
  processingDetails?: Record<string, any>;
  
  /** When the refund was created */
  createdAt: Date;
  
  /** When the refund was last updated */
  updatedAt: Date;
  
  /** When the refund was settled by the payment gateway */
  settledAt?: Date;
}

/**
 * Mongoose document interface for refunds
 * Extends IRefund with Mongoose Document properties and methods
 */
export interface IRefundDocument extends IRefund, Document {
  /**
   * Checks if the refund has been settled
   * @returns boolean indicating if the refund is settled
   */
  isSettled(): boolean;
}

/**
 * Interface for the Refund model with static methods
 */
interface IRefundModel extends Model<IRefundDocument> {
  /**
   * Finds a refund by its ID
   * @param refundId - The refund ID to search for
   * @returns Promise resolving to the refund document or null if not found
   */
  findByRefundId(refundId: string): Promise<IRefundDocument | null>;
  
  /**
   * Finds refunds associated with a refund request
   * @param refundRequestId - The refund request ID to search for
   * @returns Promise resolving to an array of refund documents
   */
  findByRefundRequestId(refundRequestId: string): Promise<IRefundDocument[]>;
  
  /**
   * Finds a refund by its gateway reference
   * @param gatewayReference - The gateway reference to search for
   * @returns Promise resolving to the refund document or null if not found
   */
  findByGatewayReference(gatewayReference: string): Promise<IRefundDocument | null>;
  
  /**
   * Finds refunds for a merchant
   * @param merchantId - The merchant ID to search for
   * @returns Promise resolving to an array of refund documents
   */
  findByMerchantId(merchantId: string): Promise<IRefundDocument[]>;
}

/**
 * Mongoose schema for refunds
 * Defines the structure and validation rules for refund documents
 */
export const refundSchema = new Schema({
  refundId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => `ref_${uuidv4().replace(/-/g, '')}`
  },
  refundRequestId: {
    type: String,
    required: true,
    index: true
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
  gateway: {
    type: String,
    required: true,
    enum: Object.values(GatewayType)
  },
  gatewayReference: {
    type: String,
    required: true,
    index: true
  },
  refundMethod: {
    type: String,
    required: true,
    enum: Object.values(RefundMethod)
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
  status: {
    type: String,
    required: true,
    enum: Object.values(RefundStatus),
    default: RefundStatus.PROCESSING,
    index: true
  },
  processingDetails: {
    type: Object,
    required: false,
    default: {}
  },
  settledAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true,
  collection: 'refunds',
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// Create compound indexes for common queries to optimize performance
refundSchema.index({ merchantId: 1, createdAt: -1 });
refundSchema.index({ status: 1, createdAt: -1 });
refundSchema.index({ refundRequestId: 1 });
refundSchema.index({ gatewayReference: 1 });

/**
 * Check if refund is settled
 * @returns boolean indicating whether the refund is settled
 */
refundSchema.methods.isSettled = function(): boolean {
  return this.status === RefundStatus.COMPLETED && !!this.settledAt;
};

/**
 * Find a refund by its ID
 * @param refundId - The refund ID to search for
 * @returns Promise resolving to the refund document or null if not found
 */
refundSchema.statics.findByRefundId = function(refundId: string): Promise<IRefundDocument | null> {
  return this.findOne({ refundId });
};

/**
 * Find refunds associated with a refund request
 * @param refundRequestId - The refund request ID to search for
 * @returns Promise resolving to an array of refund documents
 */
refundSchema.statics.findByRefundRequestId = function(refundRequestId: string): Promise<IRefundDocument[]> {
  return this.find({ refundRequestId });
};

/**
 * Find a refund by its gateway reference
 * @param gatewayReference - The gateway reference to search for
 * @returns Promise resolving to the refund document or null if not found
 */
refundSchema.statics.findByGatewayReference = function(gatewayReference: string): Promise<IRefundDocument | null> {
  return this.findOne({ gatewayReference });
};

/**
 * Find refunds for a merchant
 * @param merchantId - The merchant ID to search for
 * @returns Promise resolving to an array of refund documents
 */
refundSchema.statics.findByMerchantId = function(merchantId: string): Promise<IRefundDocument[]> {
  return this.find({ merchantId }).sort({ createdAt: -1 });
};

/**
 * Refund model for performing database operations
 */
export const RefundModel = mongoose.model<IRefundDocument, IRefundModel>('Refund', refundSchema);