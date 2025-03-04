import mongoose from 'mongoose'; // mongoose ^6.0.0
import { RefundRequestModel, IRefundRequestDocument, IRefundRequest, IStatusHistoryEntry } from '../models/refund-request.model';
import { RefundStatus } from '../../common/enums/refund-status.enum';
import { RefundMethod } from '../../common/enums/refund-method.enum';
import { getConnection } from '../connection';
import { logger } from '../../common/utils/logger';

/**
 * Repository class that provides methods for managing refund request records in the database
 */
class RefundRequestRepository {
  private model: mongoose.Model<IRefundRequestDocument>;

  /**
   * Initializes the repository with the RefundRequestModel
   */
  constructor() {
    this.model = RefundRequestModel;
  }

  /**
   * Creates a new refund request record in the database
   * 
   * @param refundRequest - The refund request data to be created
   * @returns The created refund request document
   */
  async create(refundRequest: IRefundRequest): Promise<IRefundRequestDocument> {
    logger.info(`Creating refund request for transaction ${refundRequest.transactionId}`, {
      merchantId: refundRequest.merchantId,
      amount: refundRequest.amount
    });

    try {
      const createdRefund = await this.model.create(refundRequest);
      
      logger.info(`Successfully created refund request with ID ${createdRefund.refundRequestId}`, {
        status: createdRefund.status
      });
      
      return createdRefund;
    } catch (error) {
      logger.error(`Failed to create refund request for transaction ${refundRequest.transactionId}`, {
        error,
        merchantId: refundRequest.merchantId,
        amount: refundRequest.amount
      });
      throw error;
    }
  }

  /**
   * Finds a refund request by its ID
   * 
   * @param refundRequestId - The ID of the refund request to find
   * @returns The refund request document or null if not found
   */
  async findById(refundRequestId: string): Promise<IRefundRequestDocument | null> {
    try {
      return await this.model.findOne({ refundRequestId });
    } catch (error) {
      logger.error(`Failed to find refund request by ID: ${refundRequestId}`, { error });
      throw error;
    }
  }

  /**
   * Finds all refund requests for a specific transaction
   * 
   * @param transactionId - The ID of the transaction
   * @returns Array of refund request documents
   */
  async findByTransactionId(transactionId: string): Promise<IRefundRequestDocument[]> {
    try {
      return await this.model.find({ transactionId });
    } catch (error) {
      logger.error(`Failed to find refund requests for transaction: ${transactionId}`, { error });
      throw error;
    }
  }

  /**
   * Finds all refund requests for a specific merchant with pagination
   * 
   * @param merchantId - The ID of the merchant
   * @param options - Pagination options
   * @returns Paginated refund requests and total count
   */
  async findByMerchantId(
    merchantId: string, 
    options: { page?: number; limit?: number; sort?: any } = {}
  ): Promise<{ results: IRefundRequestDocument[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;
    const sort = options.sort || { createdAt: -1 };

    try {
      const [results, total] = await Promise.all([
        this.model.find({ merchantId })
          .sort(sort)
          .skip(skip)
          .limit(limit),
        this.model.countDocuments({ merchantId })
      ]);

      return { results, total };
    } catch (error) {
      logger.error(`Failed to find refund requests for merchant: ${merchantId}`, { error });
      throw error;
    }
  }

  /**
   * Finds all refund requests for a specific customer
   * 
   * @param customerId - The ID of the customer
   * @param options - Pagination options
   * @returns Paginated refund requests and total count
   */
  async findByCustomerId(
    customerId: string,
    options: { page?: number; limit?: number; sort?: any } = {}
  ): Promise<{ results: IRefundRequestDocument[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;
    const sort = options.sort || { createdAt: -1 };

    try {
      const [results, total] = await Promise.all([
        this.model.find({ customerId })
          .sort(sort)
          .skip(skip)
          .limit(limit),
        this.model.countDocuments({ customerId })
      ]);

      return { results, total };
    } catch (error) {
      logger.error(`Failed to find refund requests for customer: ${customerId}`, { error });
      throw error;
    }
  }

  /**
   * Searches for refund requests based on multiple criteria
   * 
   * @param searchParams - Search parameters
   * @param options - Pagination options
   * @returns Paginated search results and total count
   */
  async search(
    searchParams: {
      merchantId?: string;
      transactionId?: string;
      customerId?: string;
      status?: RefundStatus | RefundStatus[];
      refundMethod?: RefundMethod;
      minAmount?: number;
      maxAmount?: number;
      dateFrom?: Date;
      dateTo?: Date;
      gatewayReference?: string;
    },
    options: { page?: number; limit?: number; sort?: any } = {}
  ): Promise<{ results: IRefundRequestDocument[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;
    const sort = options.sort || { createdAt: -1 };

    // Build the query object
    const query: any = {};

    if (searchParams.merchantId) {
      query.merchantId = searchParams.merchantId;
    }

    if (searchParams.transactionId) {
      query.transactionId = searchParams.transactionId;
    }

    if (searchParams.customerId) {
      query.customerId = searchParams.customerId;
    }

    if (searchParams.status) {
      if (Array.isArray(searchParams.status)) {
        query.status = { $in: searchParams.status };
      } else {
        query.status = searchParams.status;
      }
    }

    if (searchParams.refundMethod) {
      query.refundMethod = searchParams.refundMethod;
    }

    if (searchParams.minAmount !== undefined || searchParams.maxAmount !== undefined) {
      query.amount = {};
      if (searchParams.minAmount !== undefined) {
        query.amount.$gte = searchParams.minAmount;
      }
      if (searchParams.maxAmount !== undefined) {
        query.amount.$lte = searchParams.maxAmount;
      }
    }

    if (searchParams.dateFrom || searchParams.dateTo) {
      query.createdAt = {};
      if (searchParams.dateFrom) {
        query.createdAt.$gte = searchParams.dateFrom;
      }
      if (searchParams.dateTo) {
        query.createdAt.$lte = searchParams.dateTo;
      }
    }

    if (searchParams.gatewayReference) {
      query.gatewayReference = searchParams.gatewayReference;
    }

    try {
      const [results, total] = await Promise.all([
        this.model.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit),
        this.model.countDocuments(query)
      ]);

      return { results, total };
    } catch (error) {
      logger.error('Failed to search refund requests', { error, searchParams });
      throw error;
    }
  }

  /**
   * Updates a refund request document
   * 
   * @param refundRequest - The refund request document to update
   * @returns The updated refund request document
   */
  async update(refundRequest: IRefundRequestDocument): Promise<IRefundRequestDocument> {
    try {
      logger.debug(`Updating refund request: ${refundRequest.refundRequestId}`, {
        status: refundRequest.status
      });
      
      return await refundRequest.save();
    } catch (error) {
      logger.error(`Failed to update refund request: ${refundRequest.refundRequestId}`, { error });
      throw error;
    }
  }

  /**
   * Updates the status of a refund request and adds a status history entry
   * 
   * @param refundRequestId - The ID of the refund request
   * @param newStatus - The new status
   * @param changedBy - The user or system that changed the status
   * @param reason - Optional reason for the status change
   * @returns The updated refund request or null if not found
   */
  async updateStatus(
    refundRequestId: string,
    newStatus: RefundStatus,
    changedBy: string,
    reason?: string
  ): Promise<IRefundRequestDocument | null> {
    try {
      logger.info(`Updating refund request status: ${refundRequestId} to ${newStatus}`, {
        changedBy,
        reason
      });

      const refundRequest = await this.findById(refundRequestId);

      if (!refundRequest) {
        logger.warn(`Refund request not found for status update: ${refundRequestId}`);
        return null;
      }

      // Update the status
      refundRequest.status = newStatus;

      // Add to status history
      refundRequest.addStatusHistoryEntry(newStatus, changedBy, reason);

      // Update timestamp based on the new status
      if (newStatus === RefundStatus.SUBMITTED) {
        refundRequest.submitedAt = new Date();
      } else if (newStatus === RefundStatus.PROCESSING) {
        refundRequest.processedAt = new Date();
      } else if (newStatus === RefundStatus.COMPLETED) {
        refundRequest.completedAt = new Date();
      }

      // Save the updated document
      return await this.update(refundRequest);
    } catch (error) {
      logger.error(`Failed to update refund request status: ${refundRequestId} to ${newStatus}`, {
        error,
        changedBy
      });
      throw error;
    }
  }

  /**
   * Finds all refund requests with a specific status
   * 
   * @param status - The refund status to find
   * @param options - Pagination options
   * @returns Paginated refund requests and total count
   */
  async findByStatus(
    status: RefundStatus,
    options: { page?: number; limit?: number; sort?: any } = {}
  ): Promise<{ results: IRefundRequestDocument[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;
    const sort = options.sort || { createdAt: -1 };

    try {
      const [results, total] = await Promise.all([
        this.model.find({ status })
          .sort(sort)
          .skip(skip)
          .limit(limit),
        this.model.countDocuments({ status })
      ]);

      return { results, total };
    } catch (error) {
      logger.error(`Failed to find refund requests with status: ${status}`, { error });
      throw error;
    }
  }

  /**
   * Finds refund requests in PROCESSING status that need to be processed
   * 
   * @param limit - Maximum number of requests to retrieve
   * @returns Array of refund requests ready for processing
   */
  async findPendingProcessing(limit: number = 10): Promise<IRefundRequestDocument[]> {
    try {
      // Find refund requests in PROCESSING status
      return await this.model.find({ status: RefundStatus.PROCESSING })
        .limit(limit)
        .sort({ createdAt: 1 }); // Process oldest first (FIFO)
    } catch (error) {
      logger.error('Failed to find pending refund requests for processing', { error });
      throw error;
    }
  }

  /**
   * Counts refund requests by status
   * 
   * @param status - The status to count
   * @returns Count of refund requests with the specified status
   */
  async countByStatus(status: RefundStatus): Promise<number> {
    try {
      return await this.model.countDocuments({ status });
    } catch (error) {
      logger.error(`Failed to count refund requests with status: ${status}`, { error });
      throw error;
    }
  }

  /**
   * Gets statistics about refund requests
   * 
   * @param startDate - Start date for statistics
   * @param endDate - End date for statistics
   * @param merchantId - Optional merchant ID to filter by
   * @returns Statistics including counts by status, average processing time, etc.
   */
  async getRefundStatistics(
    startDate: Date,
    endDate: Date,
    merchantId?: string
  ): Promise<object> {
    try {
      const pipeline: any[] = [
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate
            }
          }
        }
      ];

      // Add merchant filter if provided
      if (merchantId) {
        pipeline[0].$match.merchantId = merchantId;
      }

      // Group by status to get counts
      pipeline.push({
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      });

      const statusStats = await this.model.aggregate(pipeline);

      // Calculate average processing time for completed refunds
      const processingTimePipeline: any[] = [
        {
          $match: {
            status: RefundStatus.COMPLETED,
            createdAt: {
              $gte: startDate,
              $lte: endDate
            },
            completedAt: { $exists: true }
          }
        }
      ];

      // Add merchant filter if provided
      if (merchantId) {
        processingTimePipeline[0].$match.merchantId = merchantId;
      }

      processingTimePipeline.push({
        $project: {
          processingTime: {
            $subtract: ['$completedAt', '$createdAt']
          }
        }
      });

      processingTimePipeline.push({
        $group: {
          _id: null,
          avgProcessingTime: { $avg: '$processingTime' },
          minProcessingTime: { $min: '$processingTime' },
          maxProcessingTime: { $max: '$processingTime' }
        }
      });

      const processingTimeStats = await this.model.aggregate(processingTimePipeline);

      // Format the result
      const result: any = {
        totalRefunds: 0,
        totalAmount: 0,
        statusCounts: {},
        refundMethods: {}
      };

      // Add status counts
      statusStats.forEach((stat: any) => {
        result.statusCounts[stat._id] = {
          count: stat.count,
          totalAmount: stat.totalAmount,
          avgAmount: stat.avgAmount
        };
        result.totalRefunds += stat.count;
        result.totalAmount += stat.totalAmount;
      });

      // Add processing time stats if available
      if (processingTimeStats.length > 0) {
        result.processingTime = {
          avgMilliseconds: processingTimeStats[0].avgProcessingTime,
          minMilliseconds: processingTimeStats[0].minProcessingTime,
          maxMilliseconds: processingTimeStats[0].maxProcessingTime,
          avgHours: processingTimeStats[0].avgProcessingTime / (1000 * 60 * 60)
        };
      }

      // Get refund method distribution
      const methodPipeline: any[] = [
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate
            }
          }
        }
      ];

      // Add merchant filter if provided
      if (merchantId) {
        methodPipeline[0].$match.merchantId = merchantId;
      }

      methodPipeline.push({
        $group: {
          _id: '$refundMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      });

      const methodStats = await this.model.aggregate(methodPipeline);

      // Add method counts
      methodStats.forEach((stat: any) => {
        result.refundMethods[stat._id] = {
          count: stat.count,
          totalAmount: stat.totalAmount,
          percentage: (stat.count / result.totalRefunds) * 100
        };
      });

      return result;
    } catch (error) {
      logger.error('Failed to get refund statistics', { error, startDate, endDate, merchantId });
      throw error;
    }
  }

  /**
   * Adds a supporting document to a refund request
   * 
   * @param refundRequestId - The ID of the refund request
   * @param documentData - Document data to add
   * @returns The updated refund request or null if not found
   */
  async addSupportingDocument(
    refundRequestId: string,
    documentData: {
      documentId: string;
      documentType: string;
      url: string;
      uploadedBy: string;
    }
  ): Promise<IRefundRequestDocument | null> {
    try {
      logger.info(`Adding supporting document to refund request: ${refundRequestId}`, {
        documentType: documentData.documentType
      });

      const refundRequest = await this.findById(refundRequestId);

      if (!refundRequest) {
        logger.warn(`Refund request not found for adding document: ${refundRequestId}`);
        return null;
      }

      // Create the document entry
      const document = {
        ...documentData,
        uploadedAt: new Date()
      };

      // Add to supporting documents array
      if (!refundRequest.supportingDocuments) {
        refundRequest.supportingDocuments = [];
      }
      refundRequest.supportingDocuments.push(document);

      // Save the updated document
      return await this.update(refundRequest);
    } catch (error) {
      logger.error(`Failed to add supporting document to refund request: ${refundRequestId}`, {
        error,
        documentType: documentData.documentType
      });
      throw error;
    }
  }

  /**
   * Updates the gateway reference for a refund request
   * 
   * @param refundRequestId - The ID of the refund request
   * @param gatewayReference - The gateway reference ID
   * @returns The updated refund request or null if not found
   */
  async updateGatewayReference(
    refundRequestId: string,
    gatewayReference: string
  ): Promise<IRefundRequestDocument | null> {
    try {
      logger.info(`Updating gateway reference for refund request: ${refundRequestId}`, {
        gatewayReference
      });

      const refundRequest = await this.findById(refundRequestId);

      if (!refundRequest) {
        logger.warn(`Refund request not found for updating gateway reference: ${refundRequestId}`);
        return null;
      }

      // Update the gateway reference
      refundRequest.gatewayReference = gatewayReference;

      // Save the updated document
      return await this.update(refundRequest);
    } catch (error) {
      logger.error(`Failed to update gateway reference for refund request: ${refundRequestId}`, {
        error,
        gatewayReference
      });
      throw error;
    }
  }

  /**
   * Updates the approval ID for a refund request
   * 
   * @param refundRequestId - The ID of the refund request
   * @param approvalId - The approval ID
   * @returns The updated refund request or null if not found
   */
  async updateApprovalId(
    refundRequestId: string,
    approvalId: string
  ): Promise<IRefundRequestDocument | null> {
    try {
      logger.info(`Updating approval ID for refund request: ${refundRequestId}`, {
        approvalId
      });

      const refundRequest = await this.findById(refundRequestId);

      if (!refundRequest) {
        logger.warn(`Refund request not found for updating approval ID: ${refundRequestId}`);
        return null;
      }

      // Update the approval ID
      refundRequest.approvalId = approvalId;

      // Save the updated document
      return await this.update(refundRequest);
    } catch (error) {
      logger.error(`Failed to update approval ID for refund request: ${refundRequestId}`, {
        error,
        approvalId
      });
      throw error;
    }
  }

  /**
   * Calculates the average time taken to process refund requests
   * 
   * @param startDate - Start date for statistics
   * @param endDate - End date for statistics
   * @param merchantId - Optional merchant ID to filter by
   * @returns Average processing time in milliseconds
   */
  async getAverageProcessingTime(
    startDate: Date,
    endDate: Date,
    merchantId?: string
  ): Promise<number> {
    try {
      const pipeline: any[] = [
        {
          $match: {
            status: RefundStatus.COMPLETED,
            createdAt: {
              $gte: startDate,
              $lte: endDate
            },
            completedAt: { $exists: true }
          }
        }
      ];

      // Add merchant filter if provided
      if (merchantId) {
        pipeline[0].$match.merchantId = merchantId;
      }

      pipeline.push({
        $project: {
          processingTime: {
            $subtract: ['$completedAt', '$createdAt']
          }
        }
      });

      pipeline.push({
        $group: {
          _id: null,
          avgProcessingTime: { $avg: '$processingTime' }
        }
      });

      const result = await this.model.aggregate(pipeline);

      if (result.length === 0) {
        return 0;
      }

      return result[0].avgProcessingTime;
    } catch (error) {
      logger.error('Failed to get average processing time', { error, startDate, endDate, merchantId });
      throw error;
    }
  }
}

// Create singleton instance
const refundRequestRepository = new RefundRequestRepository();

export default refundRequestRepository;
export { RefundRequestRepository };