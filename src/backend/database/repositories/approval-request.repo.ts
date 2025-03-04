import mongoose from 'mongoose';
import ApprovalRequestModel, { IApprovalRequestDocument } from '../models/approval-request.model';
import { IApprovalRequest, IApprovalDecision } from '../../common/interfaces/approval.interface';
import { ApprovalStatus } from '../../common/enums/approval-status.enum';
import { getConnection } from '../connection';
import { logger } from '../../common/utils/logger';

/**
 * Repository class that provides methods for managing approval request records in the database
 */
class ApprovalRequestRepository {
  private model: mongoose.Model<IApprovalRequestDocument>;

  /**
   * Initializes the repository with the ApprovalRequestModel
   */
  constructor() {
    this.model = ApprovalRequestModel;
  }

  /**
   * Creates a new approval request record in the database
   * 
   * @param approvalRequest - The approval request data to create
   * @returns The created approval request document
   */
  async create(approvalRequest: IApprovalRequest): Promise<IApprovalRequestDocument> {
    logger.info(`Creating approval request with ID: ${approvalRequest.approvalId}`);
    const created = await this.model.create(approvalRequest);
    logger.info(`Successfully created approval request: ${created.approvalId}`);
    return created;
  }

  /**
   * Finds an approval request by its ID
   * 
   * @param approvalId - The ID of the approval request
   * @returns The approval request document or null if not found
   */
  async findById(approvalId: string): Promise<IApprovalRequestDocument | null> {
    return this.model.findOne({ approvalId });
  }

  /**
   * Finds an approval request for a specific refund
   * 
   * @param refundRequestId - The ID of the refund request
   * @returns The approval request document or null if not found
   */
  async findByRefundId(refundRequestId: string): Promise<IApprovalRequestDocument | null> {
    return this.model.findOne({ refundRequestId });
  }

  /**
   * Updates an approval request document
   * 
   * @param approvalRequest - The approval request document to update
   * @returns The updated approval request document
   */
  async update(approvalRequest: IApprovalRequestDocument): Promise<IApprovalRequestDocument> {
    return approvalRequest.save();
  }

  /**
   * Updates the status of an approval request
   * 
   * @param approvalId - The ID of the approval request
   * @param newStatus - The new status
   * @returns The updated approval request or null if not found
   */
  async updateStatus(approvalId: string, newStatus: ApprovalStatus): Promise<IApprovalRequestDocument | null> {
    const approval = await this.findById(approvalId);
    if (!approval) {
      return null;
    }

    approval.status = newStatus;
    return approval.save();
  }

  /**
   * Adds a decision to an approval request
   * 
   * @param approvalId - The ID of the approval request
   * @param decision - The decision to add
   * @returns The updated approval request or null if not found
   */
  async addDecision(approvalId: string, decision: IApprovalDecision): Promise<IApprovalRequestDocument | null> {
    const approval = await this.findById(approvalId);
    if (!approval) {
      return null;
    }

    approval.decisions.push(decision);
    return approval.save();
  }

  /**
   * Finds all approval requests with a specific status
   * 
   * @param status - The status to filter by
   * @param options - Pagination options
   * @returns Paginated approval requests and total count
   */
  async findByStatus(
    status: ApprovalStatus, 
    options: { page?: number; limit?: number; sort?: any } = {}
  ): Promise<{ results: IApprovalRequestDocument[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;
    const sort = options.sort || { requestDate: -1 };

    const total = await this.model.countDocuments({ status });
    const results = await this.model.find({ status })
      .sort(sort)
      .skip(skip)
      .limit(limit);

    return { results, total };
  }

  /**
   * Finds pending approval requests that can be approved by a specific role
   * 
   * @param approverRole - The role of the approver
   * @param options - Pagination options
   * @returns Array of approval requests pending approval by specified role
   */
  async findPendingApprovalsByApproverRole(
    approverRole: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<IApprovalRequestDocument[]> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    // Using aggregation for more complex query to match approvers at current escalation level
    const result = await this.model.aggregate([
      {
        $match: {
          status: ApprovalStatus.PENDING
        }
      },
      {
        $addFields: {
          // Filter approvers array to those matching the role and current escalation level
          matchingApprovers: {
            $filter: {
              input: "$approvers",
              as: "approver",
              cond: {
                $and: [
                  { $eq: ["$$approver.approverRole", approverRole] },
                  { $eq: ["$$approver.escalationLevel", "$escalationLevel"] }
                ]
              }
            }
          }
        }
      },
      {
        $match: {
          // Only keep documents with matching approvers
          "matchingApprovers": { $ne: [] }
        }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      }
    ]);

    // Convert aggregation result to documents
    return result.map((item: any) => this.model.hydrate(item));
  }

  /**
   * Counts approval requests by status
   * 
   * @param status - The status to count
   * @returns Count of approval requests with the specified status
   */
  async countByStatus(status: ApprovalStatus): Promise<number> {
    return this.model.countDocuments({ status });
  }

  /**
   * Finds approval requests that are due for escalation
   * 
   * @param currentTime - The current time to compare against escalation due date
   * @param limit - Maximum number of requests to return
   * @returns Array of approval requests due for escalation
   */
  async findDueEscalations(currentTime: Date, limit: number = 10): Promise<IApprovalRequestDocument[]> {
    return this.model.find({
      status: ApprovalStatus.PENDING,
      escalationDue: { $lte: currentTime }
    })
      .limit(limit)
      .sort({ escalationDue: 1 }); // Oldest first
  }

  /**
   * Updates the escalation level and due date for an approval request
   * 
   * @param approvalId - The ID of the approval request
   * @param newEscalationLevel - The new escalation level
   * @param newEscalationDue - The new escalation due date
   * @returns The updated approval request or null if not found
   */
  async updateEscalation(
    approvalId: string, 
    newEscalationLevel: number, 
    newEscalationDue: Date
  ): Promise<IApprovalRequestDocument | null> {
    const approval = await this.findById(approvalId);
    if (!approval) {
      return null;
    }

    approval.escalationLevel = newEscalationLevel;
    approval.escalationDue = newEscalationDue;
    approval.status = ApprovalStatus.ESCALATED;
    return approval.save();
  }

  /**
   * Gets statistics about approval requests
   * 
   * @param startDate - Start date for the statistics period
   * @param endDate - End date for the statistics period
   * @returns Statistics including counts by status, average decision time, etc.
   */
  async getApprovalStatistics(startDate: Date, endDate: Date): Promise<object> {
    const pipeline = [
      {
        $match: {
          requestDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          averageEscalationLevel: { $avg: "$escalationLevel" }
        }
      }
    ];

    const statusStats = await this.model.aggregate(pipeline);
    
    // Get average time to complete
    const completionTimeMs = await this.getAverageApprovalTime(startDate, endDate);
    
    // Format the results
    const statisticsByStatus = statusStats.reduce((acc: any, stat: any) => {
      acc[stat._id] = {
        count: stat.count,
        averageEscalationLevel: stat.averageEscalationLevel || 0
      };
      return acc;
    }, {});

    return {
      byStatus: statisticsByStatus,
      averageCompletionTimeMs: completionTimeMs,
      averageCompletionTimeHours: completionTimeMs / (1000 * 60 * 60), // Convert ms to hours
      totalRequests: statusStats.reduce((sum, stat) => sum + stat.count, 0),
      period: {
        startDate,
        endDate
      }
    };
  }

  /**
   * Calculates the average time taken to complete approval requests
   * 
   * @param startDate - Start date for the calculation period
   * @param endDate - End date for the calculation period
   * @returns Average approval time in milliseconds
   */
  async getAverageApprovalTime(startDate: Date, endDate: Date): Promise<number> {
    const pipeline = [
      {
        $match: {
          status: { $in: [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED] },
          requestDate: { $gte: startDate, $lte: endDate },
          decisions: { $exists: true, $ne: [] }
        }
      },
      {
        $addFields: {
          // Get the latest decision time
          lastDecisionTime: { 
            $max: "$decisions.decidedAt" 
          }
        }
      },
      {
        $addFields: {
          // Calculate time difference in milliseconds
          processingTime: { 
            $subtract: ["$lastDecisionTime", "$requestDate"] 
          }
        }
      },
      {
        $group: {
          _id: null,
          averageTime: { $avg: "$processingTime" }
        }
      }
    ];

    const result = await this.model.aggregate(pipeline);
    return result.length > 0 ? result[0].averageTime : 0;
  }
}

// Create a singleton instance
const approvalRequestRepository = new ApprovalRequestRepository();

// Export the singleton instance as default
export default approvalRequestRepository;

// Also export the class for testing and extension
export { ApprovalRequestRepository };