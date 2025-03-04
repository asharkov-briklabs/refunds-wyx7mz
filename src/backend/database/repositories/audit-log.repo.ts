import mongoose from 'mongoose';
import { 
  AuditLogModel, 
  IAuditLogDocument, 
  IAuditLog, 
  AuditEntityType, 
  AuditActionType,
  createAuditLog 
} from '../models/audit-log.model';
import { logger } from '../../common/utils/logger';
import { ApiError } from '../../common/errors/api-error';
import { ErrorCode } from '../../common/constants/error-codes';

/**
 * Repository class for audit log operations, providing methods for creating and querying audit logs
 */
export class AuditLogRepository {
  private AuditLogModel: mongoose.Model<IAuditLogDocument>;

  /**
   * Initializes the repository with the audit log model
   */
  constructor() {
    this.AuditLogModel = AuditLogModel;
  }

  /**
   * Creates a new audit log entry
   * 
   * @param auditData - The audit log data to create
   * @returns The created audit log document
   */
  async createLog(auditData: IAuditLog): Promise<IAuditLogDocument> {
    try {
      // Use the helper to create the audit log with defaults
      const auditLogData = createAuditLog(auditData);
      
      // Create a new model instance
      const auditLog = new this.AuditLogModel(auditLogData);
      
      // Save to database
      await auditLog.save();
      
      logger.info('Audit log created', { 
        auditLogId: auditLog.auditLogId,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        action: auditLog.action
      });
      
      return auditLog;
    } catch (error) {
      logger.error('Failed to create audit log', { error, auditData });
      throw new ApiError(
        ErrorCode.DATABASE_ERROR,
        'Failed to create audit log',
        { originalError: error.message }
      );
    }
  }

  /**
   * Logs an action performed on an entity
   * 
   * @param entityType - The type of entity
   * @param entityId - The ID of the entity
   * @param action - The action performed
   * @param performedBy - The ID of the user who performed the action
   * @param previousState - The state of the entity before the action
   * @param newState - The state of the entity after the action
   * @param additionalData - Any additional data to include
   * @returns The created audit log document
   */
  async logAction(
    entityType: AuditEntityType,
    entityId: string,
    action: AuditActionType,
    performedBy: string,
    previousState?: Record<string, any>,
    newState?: Record<string, any>,
    additionalData?: Record<string, any>
  ): Promise<IAuditLogDocument> {
    try {
      // Create audit log data from parameters
      const auditData: IAuditLog = {
        auditLogId: '', // Will be set by createAuditLog
        entityType,
        entityId,
        action,
        performedBy,
        timestamp: new Date(),
        previousState,
        newState,
        metadata: additionalData
      };
      
      // Pass to createLog method
      return await this.createLog(auditData);
    } catch (error) {
      logger.error('Failed to log action', { 
        error, 
        entityType, 
        entityId, 
        action, 
        performedBy 
      });
      throw new ApiError(
        ErrorCode.DATABASE_ERROR,
        'Failed to log action',
        { originalError: error.message }
      );
    }
  }

  /**
   * Retrieves an audit log entry by its ID
   * 
   * @param auditLogId - The ID of the audit log to retrieve
   * @returns The audit log document or null if not found
   */
  async findById(auditLogId: string): Promise<IAuditLogDocument | null> {
    try {
      if (!auditLogId) {
        throw new ApiError(
          ErrorCode.INVALID_INPUT,
          'Audit log ID is required'
        );
      }
      
      const auditLog = await this.AuditLogModel.findOne({ auditLogId });
      return auditLog;
    } catch (error) {
      logger.error('Failed to find audit log by ID', { error, auditLogId });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        ErrorCode.DATABASE_ERROR,
        'Failed to find audit log',
        { originalError: error.message }
      );
    }
  }

  /**
   * Retrieves audit log entries for a specific entity
   * 
   * @param entityType - The type of entity
   * @param entityId - The ID of the entity
   * @param options - Query options including pagination, filtering, etc.
   * @returns Object containing paginated audit logs and total count
   */
  async findByEntity(
    entityType: AuditEntityType,
    entityId: string,
    options: {
      page?: number;
      limit?: number;
      actions?: AuditActionType[];
      startDate?: Date;
      endDate?: Date;
      sort?: Record<string, 1 | -1>;
    } = {}
  ): Promise<{ logs: IAuditLogDocument[]; total: number }> {
    try {
      if (!entityType || !entityId) {
        throw new ApiError(
          ErrorCode.INVALID_INPUT,
          'Entity type and ID are required'
        );
      }
      
      // Default options
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;
      const sort = options.sort || { timestamp: -1 };
      
      // Build query filter
      const filter: any = {
        entityType,
        entityId
      };
      
      // Add action filter if provided
      if (options.actions && options.actions.length > 0) {
        filter.action = { $in: options.actions };
      }
      
      // Add date range if provided
      if (options.startDate || options.endDate) {
        filter.timestamp = {};
        if (options.startDate) {
          filter.timestamp.$gte = options.startDate;
        }
        if (options.endDate) {
          filter.timestamp.$lte = options.endDate;
        }
      }
      
      // Execute query with pagination
      const logs = await this.AuditLogModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit);
      
      // Get total count for pagination
      const total = await this.AuditLogModel.countDocuments(filter);
      
      return { logs, total };
    } catch (error) {
      logger.error('Failed to find audit logs by entity', { 
        error, 
        entityType, 
        entityId, 
        options 
      });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        ErrorCode.DATABASE_ERROR,
        'Failed to find audit logs by entity',
        { originalError: error.message }
      );
    }
  }

  /**
   * Retrieves audit log entries created by a specific user
   * 
   * @param performedBy - The ID of the user who performed the actions
   * @param options - Query options including pagination, filtering, etc.
   * @returns Object containing paginated audit logs and total count
   */
  async findByPerformer(
    performedBy: string,
    options: {
      page?: number;
      limit?: number;
      entityTypes?: AuditEntityType[];
      startDate?: Date;
      endDate?: Date;
      sort?: Record<string, 1 | -1>;
    } = {}
  ): Promise<{ logs: IAuditLogDocument[]; total: number }> {
    try {
      if (!performedBy) {
        throw new ApiError(
          ErrorCode.INVALID_INPUT,
          'Performer ID is required'
        );
      }
      
      // Default options
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;
      const sort = options.sort || { timestamp: -1 };
      
      // Build query filter
      const filter: any = {
        performedBy
      };
      
      // Add entity type filter if provided
      if (options.entityTypes && options.entityTypes.length > 0) {
        filter.entityType = { $in: options.entityTypes };
      }
      
      // Add date range if provided
      if (options.startDate || options.endDate) {
        filter.timestamp = {};
        if (options.startDate) {
          filter.timestamp.$gte = options.startDate;
        }
        if (options.endDate) {
          filter.timestamp.$lte = options.endDate;
        }
      }
      
      // Execute query with pagination
      const logs = await this.AuditLogModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit);
      
      // Get total count for pagination
      const total = await this.AuditLogModel.countDocuments(filter);
      
      return { logs, total };
    } catch (error) {
      logger.error('Failed to find audit logs by performer', { 
        error, 
        performedBy, 
        options 
      });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        ErrorCode.DATABASE_ERROR,
        'Failed to find audit logs by performer',
        { originalError: error.message }
      );
    }
  }

  /**
   * Retrieves audit log entries related to a specific merchant
   * 
   * @param merchantId - The ID of the merchant
   * @param options - Query options including pagination, filtering, etc.
   * @returns Object containing paginated audit logs and total count
   */
  async findByMerchant(
    merchantId: string,
    options: {
      page?: number;
      limit?: number;
      entityTypes?: AuditEntityType[];
      actions?: AuditActionType[];
      startDate?: Date;
      endDate?: Date;
      sort?: Record<string, 1 | -1>;
    } = {}
  ): Promise<{ logs: IAuditLogDocument[]; total: number }> {
    try {
      if (!merchantId) {
        throw new ApiError(
          ErrorCode.INVALID_INPUT,
          'Merchant ID is required'
        );
      }
      
      // Default options
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;
      const sort = options.sort || { timestamp: -1 };
      
      // Build query filter
      const filter: any = {
        merchantId
      };
      
      // Add entity type filter if provided
      if (options.entityTypes && options.entityTypes.length > 0) {
        filter.entityType = { $in: options.entityTypes };
      }
      
      // Add action filter if provided
      if (options.actions && options.actions.length > 0) {
        filter.action = { $in: options.actions };
      }
      
      // Add date range if provided
      if (options.startDate || options.endDate) {
        filter.timestamp = {};
        if (options.startDate) {
          filter.timestamp.$gte = options.startDate;
        }
        if (options.endDate) {
          filter.timestamp.$lte = options.endDate;
        }
      }
      
      // Execute query with pagination
      const logs = await this.AuditLogModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit);
      
      // Get total count for pagination
      const total = await this.AuditLogModel.countDocuments(filter);
      
      return { logs, total };
    } catch (error) {
      logger.error('Failed to find audit logs by merchant', { 
        error, 
        merchantId, 
        options 
      });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        ErrorCode.DATABASE_ERROR,
        'Failed to find audit logs by merchant',
        { originalError: error.message }
      );
    }
  }

  /**
   * Retrieves audit log entries within a specified date range
   * 
   * @param startDate - The start of the date range
   * @param endDate - The end of the date range
   * @param options - Query options including pagination, filtering, etc.
   * @returns Object containing paginated audit logs and total count
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    options: {
      page?: number;
      limit?: number;
      entityTypes?: AuditEntityType[];
      actions?: AuditActionType[];
      merchantId?: string;
      performedBy?: string;
      sort?: Record<string, 1 | -1>;
    } = {}
  ): Promise<{ logs: IAuditLogDocument[]; total: number }> {
    try {
      if (!startDate || !endDate) {
        throw new ApiError(
          ErrorCode.INVALID_INPUT,
          'Start date and end date are required'
        );
      }
      
      // Default options
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;
      const sort = options.sort || { timestamp: -1 };
      
      // Build query filter
      const filter: any = {
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      };
      
      // Add entity type filter if provided
      if (options.entityTypes && options.entityTypes.length > 0) {
        filter.entityType = { $in: options.entityTypes };
      }
      
      // Add action filter if provided
      if (options.actions && options.actions.length > 0) {
        filter.action = { $in: options.actions };
      }
      
      // Add merchant filter if provided
      if (options.merchantId) {
        filter.merchantId = options.merchantId;
      }
      
      // Add performer filter if provided
      if (options.performedBy) {
        filter.performedBy = options.performedBy;
      }
      
      // Execute query with pagination
      const logs = await this.AuditLogModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit);
      
      // Get total count for pagination
      const total = await this.AuditLogModel.countDocuments(filter);
      
      return { logs, total };
    } catch (error) {
      logger.error('Failed to find audit logs by date range', { 
        error, 
        startDate, 
        endDate, 
        options 
      });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        ErrorCode.DATABASE_ERROR,
        'Failed to find audit logs by date range',
        { originalError: error.message }
      );
    }
  }

  /**
   * Retrieves audit logs with advanced filtering capabilities
   * 
   * @param filters - Filter criteria for audit logs
   * @param options - Query options including pagination, projection, and sorting
   * @returns Object containing paginated audit logs and total count
   */
  async findWithAdvancedFilters(
    filters: Record<string, any>,
    options: {
      page?: number;
      limit?: number;
      projection?: Record<string, 1 | 0>;
      sort?: Record<string, 1 | -1>;
    } = {}
  ): Promise<{ logs: IAuditLogDocument[]; total: number }> {
    try {
      // Default options
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;
      const sort = options.sort || { timestamp: -1 };
      const projection = options.projection || {};
      
      // Execute query with pagination
      const logs = await this.AuditLogModel.find(filters, projection)
        .sort(sort)
        .skip(skip)
        .limit(limit);
      
      // Get total count for pagination
      const total = await this.AuditLogModel.countDocuments(filters);
      
      return { logs, total };
    } catch (error) {
      logger.error('Failed to find audit logs with advanced filters', { 
        error, 
        filters, 
        options 
      });
      throw new ApiError(
        ErrorCode.DATABASE_ERROR,
        'Failed to find audit logs with advanced filters',
        { originalError: error.message }
      );
    }
  }

  /**
   * Counts audit logs for a specific entity
   * 
   * @param entityType - The type of entity
   * @param entityId - The ID of the entity
   * @param filters - Additional filters to apply
   * @returns The count of audit logs matching the criteria
   */
  async countLogsByEntity(
    entityType: AuditEntityType,
    entityId: string,
    filters: Record<string, any> = {}
  ): Promise<number> {
    try {
      if (!entityType || !entityId) {
        throw new ApiError(
          ErrorCode.INVALID_INPUT,
          'Entity type and ID are required'
        );
      }
      
      // Build query filter
      const filter: any = {
        entityType,
        entityId,
        ...filters
      };
      
      // Count documents matching the filter
      const count = await this.AuditLogModel.countDocuments(filter);
      
      return count;
    } catch (error) {
      logger.error('Failed to count audit logs by entity', { 
        error, 
        entityType, 
        entityId, 
        filters 
      });
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        ErrorCode.DATABASE_ERROR,
        'Failed to count audit logs by entity',
        { originalError: error.message }
      );
    }
  }
}

// Create a singleton instance for application use
export default new AuditLogRepository();