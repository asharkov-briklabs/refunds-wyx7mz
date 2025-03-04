import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid'; // uuid@^9.0.0
import { logger } from '../../../common/utils/logger';

/**
 * Enum defining the types of entities that can be audited in the system
 */
export enum AuditEntityType {
  REFUND_REQUEST = 'REFUND_REQUEST',
  REFUND = 'REFUND',
  APPROVAL_REQUEST = 'APPROVAL_REQUEST',
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  PARAMETER = 'PARAMETER',
  COMPLIANCE_RULE = 'COMPLIANCE_RULE',
  USER = 'USER',
  MERCHANT = 'MERCHANT',
  SYSTEM = 'SYSTEM'
}

/**
 * Enum defining the types of actions that can be performed on entities
 */
export enum AuditActionType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  STATUS_CHANGE = 'STATUS_CHANGE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  PROCESS = 'PROCESS',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ACCESS = 'ACCESS',
  VERIFICATION = 'VERIFICATION',
  SYSTEM_EVENT = 'SYSTEM_EVENT'
}

/**
 * Interface defining the structure of an audit log entry representing
 * a single action in the system
 */
export interface IAuditLog {
  auditLogId: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditActionType;
  performedBy: string;
  timestamp: Date;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  merchantId?: string;
  ipAddress?: string;
  userAgent?: string;
  changeDetails?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Extends the IAuditLog interface with Mongoose document properties
 * for database operations
 */
export interface IAuditLogDocument extends IAuditLog, Document {}

/**
 * Mongoose schema for audit logs
 * 
 * Note on retention: Audit logs must be retained for 7 years to meet
 * financial regulatory requirements. This is typically enforced through
 * database administration policies rather than in the schema.
 */
const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    auditLogId: {
      type: String,
      required: true,
      unique: true,
      default: uuidv4
    },
    entityType: {
      type: String,
      required: true,
      enum: Object.values(AuditEntityType),
      index: true
    },
    entityId: {
      type: String,
      required: true,
      index: true
    },
    action: {
      type: String,
      required: true,
      enum: Object.values(AuditActionType),
      index: true
    },
    performedBy: {
      type: String,
      required: true,
      index: true
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    previousState: {
      type: Schema.Types.Mixed,
      default: {}
    },
    newState: {
      type: Schema.Types.Mixed,
      default: {}
    },
    merchantId: {
      type: String,
      index: true
    },
    ipAddress: String,
    userAgent: String,
    changeDetails: Schema.Types.Mixed,
    metadata: Schema.Types.Mixed
  },
  {
    // Audit logs should be immutable once created
    timestamps: false,
    // Enforce schema structure
    strict: true,
    // Prevent Mongoose versioning
    skipVersioning: true,
    // Ensure indexes are created
    autoIndex: true,
    // Don't remove empty objects
    minimize: false,
    // Don't add version field
    versionKey: false
  }
);

// Create compound indexes for common query patterns
AuditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ merchantId: 1, timestamp: -1 });
AuditLogSchema.index({ performedBy: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });

/**
 * Helper function to create a new audit log entry with proper defaults
 * 
 * @param auditData Partial audit log data to be combined with defaults
 * @returns Complete audit log entry
 */
export function createAuditLog(auditData: Partial<IAuditLog>): IAuditLog {
  const auditLog: IAuditLog = {
    auditLogId: auditData.auditLogId || uuidv4(),
    entityType: auditData.entityType as AuditEntityType,
    entityId: auditData.entityId as string,
    action: auditData.action as AuditActionType,
    performedBy: auditData.performedBy as string,
    timestamp: auditData.timestamp || new Date(),
    previousState: auditData.previousState || {},
    newState: auditData.newState || {},
    merchantId: auditData.merchantId,
    ipAddress: auditData.ipAddress,
    userAgent: auditData.userAgent,
    changeDetails: auditData.changeDetails,
    metadata: auditData.metadata
  };

  logger.info('Audit log entry created', { 
    auditLogId: auditLog.auditLogId,
    entityType: auditLog.entityType,
    entityId: auditLog.entityId,
    action: auditLog.action
  });
  
  return auditLog;
}

// Create and export the Mongoose model
export const AuditLogModel: Model<IAuditLogDocument> = mongoose.model<IAuditLogDocument>(
  'AuditLog',
  AuditLogSchema,
  'audit_logs' // Collection name
);