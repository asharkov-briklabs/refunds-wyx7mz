import { Refund } from '../models/refund.model';
import mongoose, { FilterQuery, UpdateQuery, Types } from 'mongoose';
import { IRefund } from '../../common/interfaces/refund.interface';
import { RefundStatus } from '../../common/enums/refund-status.enum';
import { RefundMethod } from '../../common/enums/refund-method.enum';
import { logger } from '../../common/utils/logger';

/**
 * Repository class for handling database operations related to refund records
 */
class RefundRepository {
  private model: mongoose.Model<IRefund>;

  /**
   * Initializes the RefundRepository with the Refund mongoose model
   */
  constructor() {
    this.model = Refund;
  }

  /**
   * Creates a new refund record in the database
   * 
   * @param refundData - The refund data to be stored
   * @returns The created refund document
   */
  async create(refundData: Partial<IRefund>): Promise<IRefund> {
    try {
      logger.info('Creating new refund record', { 
        transactionId: refundData.transactionId,
        amount: refundData.amount
      });
      
      const newRefund = new this.model(refundData);
      const savedRefund = await newRefund.save();
      
      return savedRefund;
    } catch (error) {
      logger.error('Error creating refund record', { error, refundData });
      throw error;
    }
  }

  /**
   * Finds a refund record by its ID
   * 
   * @param refundId - The ID of the refund to find
   * @returns The found refund document or null if not found
   */
  async findById(refundId: string): Promise<IRefund | null> {
    try {
      // Convert string ID to MongoDB ObjectId if necessary
      let query: any = { refundId };
      
      if (mongoose.Types.ObjectId.isValid(refundId)) {
        query = { _id: refundId };
      }
      
      const refund = await this.model.findOne(query);
      return refund;
    } catch (error) {
      logger.error('Error finding refund by ID', { error, refundId });
      throw error;
    }
  }

  /**
   * Finds a refund record by its associated refund request ID
   * 
   * @param refundRequestId - The refund request ID to search for
   * @returns The found refund document or null if not found
   */
  async findByRefundRequestId(refundRequestId: string): Promise<IRefund | null> {
    try {
      const refund = await this.model.findOne({ refundRequestId });
      return refund;
    } catch (error) {
      logger.error('Error finding refund by request ID', { error, refundRequestId });
      throw error;
    }
  }

  /**
   * Finds refunds associated with a specific transaction ID
   * 
   * @param transactionId - The transaction ID to search for
   * @returns Array of refund documents matching the transaction ID
   */
  async findByTransactionId(transactionId: string): Promise<IRefund[]> {
    try {
      const refunds = await this.model.find({ transactionId });
      return refunds;
    } catch (error) {
      logger.error('Error finding refunds by transaction ID', { error, transactionId });
      throw error;
    }
  }

  /**
   * Finds refunds associated with a specific merchant with pagination
   * 
   * @param merchantId - The merchant ID to search for
   * @param filters - Additional filters to apply
   * @param pagination - Pagination parameters
   * @returns Paginated list of refunds and total count
   */
  async findByMerchantId(
    merchantId: string,
    filters: object = {},
    pagination: { page: number; limit: number }
  ): Promise<{ refunds: IRefund[]; total: number }> {
    try {
      // Combine merchantId with additional filters
      const query = { merchantId, ...filters };
      
      // Calculate skip value for pagination
      const skip = pagination.page * pagination.limit;
      
      // Run count query for total
      const total = await this.model.countDocuments(query);
      
      // Find refunds with pagination
      const refunds = await this.model
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pagination.limit);
      
      return { refunds, total };
    } catch (error) {
      logger.error('Error finding refunds by merchant ID', { error, merchantId });
      throw error;
    }
  }

  /**
   * Finds refunds matching a set of filters with pagination
   * 
   * @param filters - Query filters to apply
   * @param pagination - Pagination parameters
   * @param sort - Sorting criteria
   * @returns Paginated list of refunds and total count
   */
  async findByFilters(
    filters: FilterQuery<IRefund>,
    pagination: { page: number; limit: number },
    sort: Record<string, 1 | -1> = { createdAt: -1 }
  ): Promise<{ refunds: IRefund[]; total: number }> {
    try {
      // Calculate skip value for pagination
      const skip = pagination.page * pagination.limit;
      
      // Run count query for total
      const total = await this.model.countDocuments(filters);
      
      // Find refunds with pagination and sorting
      const refunds = await this.model
        .find(filters)
        .sort(sort)
        .skip(skip)
        .limit(pagination.limit);
      
      return { refunds, total };
    } catch (error) {
      logger.error('Error finding refunds by filters', { error, filters });
      throw error;
    }
  }

  /**
   * Updates a refund record by its ID
   * 
   * @param refundId - The ID of the refund to update
   * @param updateData - The data to update
   * @returns The updated refund document or null if not found
   */
  async updateById(
    refundId: string,
    updateData: UpdateQuery<IRefund>
  ): Promise<IRefund | null> {
    try {
      // Convert string ID to MongoDB ObjectId if necessary
      let query: any = { refundId };
      
      if (mongoose.Types.ObjectId.isValid(refundId)) {
        query = { _id: refundId };
      }
      
      const updatedRefund = await this.model.findOneAndUpdate(
        query,
        updateData,
        { new: true } // Return the updated document
      );
      
      return updatedRefund;
    } catch (error) {
      logger.error('Error updating refund by ID', { error, refundId });
      throw error;
    }
  }

  /**
   * Updates the status of a refund record
   * 
   * @param refundId - The ID of the refund to update
   * @param status - The new status
   * @param metadata - Additional metadata to update
   * @returns The updated refund document or null if not found
   */
  async updateStatus(
    refundId: string,
    status: RefundStatus,
    metadata: object = {}
  ): Promise<IRefund | null> {
    try {
      // Convert string ID to MongoDB ObjectId if necessary
      let query: any = { refundId };
      
      if (mongoose.Types.ObjectId.isValid(refundId)) {
        query = { _id: refundId };
      }
      
      // Create update object with status and metadata
      const updateData: UpdateQuery<IRefund> = {
        $set: {
          status,
          updatedAt: new Date(),
          ...metadata
        }
      };
      
      const updatedRefund = await this.model.findOneAndUpdate(
        query,
        updateData,
        { new: true } // Return the updated document
      );
      
      return updatedRefund;
    } catch (error) {
      logger.error('Error updating refund status', { error, refundId, status });
      throw error;
    }
  }

  /**
   * Updates the gateway reference of a refund
   * 
   * @param refundId - The ID of the refund to update
   * @param gatewayReference - The new gateway reference
   * @returns The updated refund document or null if not found
   */
  async updateGatewayReference(
    refundId: string,
    gatewayReference: string
  ): Promise<IRefund | null> {
    try {
      // Convert string ID to MongoDB ObjectId if necessary
      let query: any = { refundId };
      
      if (mongoose.Types.ObjectId.isValid(refundId)) {
        query = { _id: refundId };
      }
      
      const updateData: UpdateQuery<IRefund> = {
        $set: {
          gatewayReference,
          updatedAt: new Date()
        }
      };
      
      const updatedRefund = await this.model.findOneAndUpdate(
        query,
        updateData,
        { new: true } // Return the updated document
      );
      
      return updatedRefund;
    } catch (error) {
      logger.error('Error updating refund gateway reference', { error, refundId });
      throw error;
    }
  }

  /**
   * Performs aggregation operations on refund data
   * 
   * @param pipeline - Aggregation pipeline to execute
   * @returns Results of the aggregation operation
   */
  async aggregate(pipeline: any[]): Promise<any[]> {
    try {
      const results = await this.model.aggregate(pipeline);
      return results;
    } catch (error) {
      logger.error('Error executing aggregation pipeline', { error });
      throw error;
    }
  }

  /**
   * Counts refunds that match the given filters
   * 
   * @param filters - Query filters to apply
   * @returns Count of matching refunds
   */
  async countByFilters(filters: FilterQuery<IRefund>): Promise<number> {
    try {
      const count = await this.model.countDocuments(filters);
      return count;
    } catch (error) {
      logger.error('Error counting refunds by filters', { error, filters });
      throw error;
    }
  }
}

export default RefundRepository;