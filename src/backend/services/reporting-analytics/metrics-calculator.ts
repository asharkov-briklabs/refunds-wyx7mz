import moment from 'moment'; // moment ^2.29.4
import { logger } from '../../common/utils/logger';
import refundRequestRepository from '../../database/repositories/refund-request.repo';
import { MongoDBConnector } from './data-sources/mongodb.connector';
import { RefundStatus } from '../../common/enums/refund-status.enum';
import { RefundMethod } from '../../common/enums/refund-method.enum';

/**
 * Calculates various refund-related metrics and KPIs for reporting and analytics
 */
class MetricsCalculator {
  private mongoDBConnector: MongoDBConnector;

  /**
   * Initializes the MetricsCalculator with required dependencies
   * 
   * @param mongoDBConnector MongoDB connector for complex data queries
   */
  constructor(mongoDBConnector: MongoDBConnector) {
    this.mongoDBConnector = mongoDBConnector;
    logger.info('MetricsCalculator initialized for refund analytics');
  }

  /**
   * Calculate refund metrics for a merchant within a time range across specified dimensions
   * 
   * @param merchantId Merchant ID to calculate metrics for
   * @param timeRange Start and end date range
   * @param dimensions Optional dimensions to group metrics by
   * @returns Aggregated refund metrics across requested dimensions
   */
  async calculateRefundMetrics(
    merchantId: string,
    timeRange: { start: Date; end: Date },
    dimensions?: string[]
  ): Promise<any> {
    try {
      // Validate input parameters
      if (!merchantId) {
        throw new Error('Merchant ID is required');
      }
      
      if (!timeRange || !timeRange.start || !timeRange.end) {
        throw new Error('Valid time range is required');
      }
      
      // Set default dimensions if not provided
      const groupDimensions = dimensions || [];
      
      logger.debug('Calculating refund metrics', {
        merchantId,
        timeRange,
        dimensions: groupDimensions
      });
      
      // Build query to retrieve refund data
      const pipeline = [
        {
          $match: {
            merchantId,
            createdAt: {
              $gte: timeRange.start,
              $lte: timeRange.end
            }
          }
        }
      ];
      
      // Add grouping stage if dimensions are provided
      if (groupDimensions.length > 0) {
        const groupStage: any = {
          $group: {
            _id: {}
          }
        };
        
        // Build the grouping fields
        groupDimensions.forEach(dimension => {
          groupStage.$group._id[dimension] = `$${dimension}`;
        });
        
        // Add metrics to calculate
        groupStage.$group.count = { $sum: 1 };
        groupStage.$group.totalAmount = { $sum: '$amount' };
        groupStage.$group.avgAmount = { $avg: '$amount' };
        groupStage.$group.minAmount = { $min: '$amount' };
        groupStage.$group.maxAmount = { $max: '$amount' };
        
        pipeline.push(groupStage);
      } else {
        // Simple aggregation without grouping
        pipeline.push({
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            avgAmount: { $avg: '$amount' },
            minAmount: { $min: '$amount' },
            maxAmount: { $max: '$amount' }
          }
        });
      }
      
      // Execute the query
      const results = await this.mongoDBConnector.executeQuery({
        collection: 'refund_requests',
        pipeline
      });
      
      // Process and format results
      let formattedResults: any;
      
      if (groupDimensions.length > 0) {
        // Format results for dimensional data
        formattedResults = results.map((result: any) => {
          const formatted: any = {};
          
          // Extract dimension values from _id
          for (const dimension of groupDimensions) {
            formatted[dimension] = result._id[dimension];
          }
          
          // Add metrics
          formatted.count = result.count;
          formatted.totalAmount = result.totalAmount;
          formatted.avgAmount = result.avgAmount;
          formatted.minAmount = result.minAmount;
          formatted.maxAmount = result.maxAmount;
          
          return formatted;
        });
      } else {
        // Format results for non-dimensional data
        formattedResults = results.length > 0 ? {
          count: results[0].count,
          totalAmount: results[0].totalAmount,
          avgAmount: results[0].avgAmount,
          minAmount: results[0].minAmount,
          maxAmount: results[0].maxAmount
        } : {
          count: 0,
          totalAmount: 0,
          avgAmount: 0,
          minAmount: 0,
          maxAmount: 0
        };
      }
      
      logger.info('Refund metrics calculation completed', {
        merchantId,
        resultCount: Array.isArray(formattedResults) ? formattedResults.length : 1
      });
      
      return formattedResults;
    } catch (error) {
      logger.error('Error calculating refund metrics', {
        error,
        merchantId,
        timeRange
      });
      throw error;
    }
  }

  /**
   * Calculate the refund rate (percentage of transactions refunded) for a merchant
   * 
   * @param merchantId Merchant ID to calculate refund rate for
   * @param timeRange Start and end date range
   * @returns Refund rate statistics
   */
  async calculateRefundRate(
    merchantId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<{ rate: number; totalTransactions: number; refundedTransactions: number }> {
    try {
      logger.debug('Calculating refund rate', { merchantId, timeRange });
      
      // Get total number of transactions for the merchant
      const totalTransactionsQuery = {
        collection: 'transactions',
        pipeline: [
          {
            $match: {
              merchantId,
              createdAt: {
                $gte: timeRange.start,
                $lte: timeRange.end
              }
            }
          },
          {
            $count: 'count'
          }
        ]
      };
      
      // Get number of refunded transactions
      const refundedTransactionsQuery = {
        collection: 'refund_requests',
        pipeline: [
          {
            $match: {
              merchantId,
              createdAt: {
                $gte: timeRange.start,
                $lte: timeRange.end
              },
              status: RefundStatus.COMPLETED
            }
          },
          {
            $group: {
              _id: '$transactionId'
            }
          },
          {
            $count: 'count'
          }
        ]
      };
      
      // Execute both queries
      const [totalResults, refundedResults] = await Promise.all([
        this.mongoDBConnector.executeQuery(totalTransactionsQuery),
        this.mongoDBConnector.executeQuery(refundedTransactionsQuery)
      ]);
      
      // Extract counts from results
      const totalTransactions = totalResults.length > 0 ? totalResults[0].count : 0;
      const refundedTransactions = refundedResults.length > 0 ? refundedResults[0].count : 0;
      
      // Calculate refund rate
      const rate = totalTransactions > 0
        ? (refundedTransactions / totalTransactions) * 100
        : 0;
      
      logger.info('Refund rate calculation completed', {
        merchantId,
        rate,
        totalTransactions,
        refundedTransactions
      });
      
      return {
        rate,
        totalTransactions,
        refundedTransactions
      };
    } catch (error) {
      logger.error('Error calculating refund rate', {
        error,
        merchantId,
        timeRange
      });
      throw error;
    }
  }

  /**
   * Calculate the average time taken to process refunds from creation to completion
   * 
   * @param merchantId Merchant ID to calculate for (optional)
   * @param timeRange Start and end date range
   * @returns Average processing time in milliseconds and days
   */
  async calculateAverageRefundTime(
    merchantId: string | undefined,
    timeRange: { start: Date; end: Date }
  ): Promise<{ averageTimeMs: number; averageTimeDays: number }> {
    try {
      logger.debug('Calculating average refund processing time', {
        merchantId,
        timeRange
      });
      
      // Get average time using the repository method
      const averageTimeMs = await refundRequestRepository.getAverageProcessingTime(
        timeRange.start,
        timeRange.end,
        merchantId
      );
      
      // Convert to days for human-readable format
      const averageTimeDays = averageTimeMs > 0
        ? averageTimeMs / (1000 * 60 * 60 * 24)
        : 0;
      
      logger.info('Average refund time calculation completed', {
        merchantId,
        averageTimeMs,
        averageTimeDays
      });
      
      return {
        averageTimeMs,
        averageTimeDays
      };
    } catch (error) {
      logger.error('Error calculating average refund time', {
        error,
        merchantId,
        timeRange
      });
      throw error;
    }
  }

  /**
   * Calculate refund volume statistics including count, total amount, and averages
   * 
   * @param merchantId Merchant ID to calculate for
   * @param timeRange Start and end date range
   * @param groupBy Optional dimension to group results by
   * @returns Refund volume statistics
   */
  async calculateRefundVolume(
    merchantId: string,
    timeRange: { start: Date; end: Date },
    groupBy?: string
  ): Promise<{ total: number; count: number; average: number; groups?: Record<string, any> }> {
    try {
      logger.debug('Calculating refund volume', {
        merchantId,
        timeRange,
        groupBy
      });
      
      // Build aggregation pipeline
      const pipeline: any[] = [
        {
          $match: {
            merchantId,
            createdAt: {
              $gte: timeRange.start,
              $lte: timeRange.end
            }
          }
        }
      ];
      
      // Add grouping if specified
      if (groupBy) {
        pipeline.push({
          $group: {
            _id: `$${groupBy}`,
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
            average: { $avg: '$amount' }
          }
        });
        
        pipeline.push({
          $sort: { amount: -1 }
        });
      } else {
        pipeline.push({
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
            average: { $avg: '$amount' }
          }
        });
      }
      
      // Execute the query
      const results = await this.mongoDBConnector.executeQuery({
        collection: 'refund_requests',
        pipeline
      });
      
      // Process results
      if (groupBy) {
        // Handle grouped results
        const groups: Record<string, any> = {};
        let totalAmount = 0;
        let totalCount = 0;
        
        results.forEach((result: any) => {
          const groupValue = result._id !== null ? result._id : 'undefined';
          groups[groupValue] = {
            count: result.count,
            amount: result.amount,
            average: result.average
          };
          
          totalAmount += result.amount;
          totalCount += result.count;
        });
        
        return {
          total: totalAmount,
          count: totalCount,
          average: totalCount > 0 ? totalAmount / totalCount : 0,
          groups
        };
      } else {
        // Handle ungrouped results
        if (results.length === 0) {
          return { total: 0, count: 0, average: 0 };
        }
        
        return {
          total: results[0].amount,
          count: results[0].count,
          average: results[0].average
        };
      }
    } catch (error) {
      logger.error('Error calculating refund volume', {
        error,
        merchantId,
        timeRange,
        groupBy
      });
      throw error;
    }
  }

  /**
   * Calculate distribution of refunds by refund method
   * 
   * @param merchantId Merchant ID to calculate for
   * @param timeRange Start and end date range
   * @returns Refund statistics by method
   */
  async calculateRefundsByMethod(
    merchantId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<Record<string, { count: number; amount: number; percentage: number }>> {
    try {
      logger.debug('Calculating refunds by method', {
        merchantId,
        timeRange
      });
      
      // Build aggregation pipeline to group by refund method
      const pipeline = [
        {
          $match: {
            merchantId,
            createdAt: {
              $gte: timeRange.start,
              $lte: timeRange.end
            }
          }
        },
        {
          $group: {
            _id: '$refundMethod',
            count: { $sum: 1 },
            amount: { $sum: '$amount' }
          }
        }
      ];
      
      // Execute the query
      const results = await this.mongoDBConnector.executeQuery({
        collection: 'refund_requests',
        pipeline
      });
      
      // Process results
      const methodStats: Record<string, { count: number; amount: number; percentage: number }> = {};
      let totalCount = 0;
      
      // Initialize with zero values for all refund methods
      Object.values(RefundMethod).forEach(method => {
        methodStats[method] = { count: 0, amount: 0, percentage: 0 };
      });
      
      // Update with actual values
      results.forEach((result: any) => {
        const method = result._id;
        methodStats[method] = {
          count: result.count,
          amount: result.amount,
          percentage: 0 // Will calculate after totalling
        };
        totalCount += result.count;
      });
      
      // Calculate percentages
      if (totalCount > 0) {
        Object.keys(methodStats).forEach(method => {
          methodStats[method].percentage = (methodStats[method].count / totalCount) * 100;
        });
      }
      
      logger.info('Refunds by method calculation completed', {
        merchantId,
        methodCount: Object.keys(methodStats).length
      });
      
      return methodStats;
    } catch (error) {
      logger.error('Error calculating refunds by method', {
        error,
        merchantId,
        timeRange
      });
      throw error;
    }
  }

  /**
   * Calculate distribution of refunds by current status
   * 
   * @param merchantId Merchant ID to calculate for
   * @param timeRange Start and end date range
   * @returns Refund statistics by status
   */
  async calculateRefundsByStatus(
    merchantId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<Record<string, { count: number; amount: number; percentage: number }>> {
    try {
      logger.debug('Calculating refunds by status', {
        merchantId,
        timeRange
      });
      
      // Build aggregation pipeline to group by status
      const pipeline = [
        {
          $match: {
            merchantId,
            createdAt: {
              $gte: timeRange.start,
              $lte: timeRange.end
            }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            amount: { $sum: '$amount' }
          }
        }
      ];
      
      // Execute the query
      const results = await this.mongoDBConnector.executeQuery({
        collection: 'refund_requests',
        pipeline
      });
      
      // Process results
      const statusStats: Record<string, { count: number; amount: number; percentage: number }> = {};
      let totalCount = 0;
      
      // Initialize with zero values for all statuses
      Object.values(RefundStatus).forEach(status => {
        statusStats[status] = { count: 0, amount: 0, percentage: 0 };
      });
      
      // Update with actual values
      results.forEach((result: any) => {
        const status = result._id;
        statusStats[status] = {
          count: result.count,
          amount: result.amount,
          percentage: 0 // Will calculate after totalling
        };
        totalCount += result.count;
      });
      
      // Calculate percentages
      if (totalCount > 0) {
        Object.keys(statusStats).forEach(status => {
          statusStats[status].percentage = (statusStats[status].count / totalCount) * 100;
        });
      }
      
      logger.info('Refunds by status calculation completed', {
        merchantId,
        statusCount: Object.keys(statusStats).length
      });
      
      return statusStats;
    } catch (error) {
      logger.error('Error calculating refunds by status', {
        error,
        merchantId,
        timeRange
      });
      throw error;
    }
  }

  /**
   * Calculate refund metrics over time for trend analysis
   * 
   * @param merchantId Merchant ID to calculate for
   * @param timeRange Start and end date range
   * @param interval Time interval for grouping (day, week, month)
   * @param metrics Metrics to calculate for each interval
   * @returns Time series data for the requested metrics
   */
  async calculateTimeSeriesMetrics(
    merchantId: string,
    timeRange: { start: Date; end: Date },
    interval: string = 'day',
    metrics: string[] = ['volume', 'count', 'averageAmount']
  ): Promise<{ intervals: string[]; datasets: Record<string, number[]> }> {
    try {
      logger.debug('Calculating time series metrics', {
        merchantId,
        timeRange,
        interval,
        metrics
      });
      
      // Validate interval
      if (!['day', 'week', 'month'].includes(interval)) {
        throw new Error('Invalid interval. Must be day, week, or month');
      }
      
      // Determine date format and group operator based on interval
      let dateFormat: string;
      let dateGrouping: any;
      
      switch (interval) {
        case 'week':
          dateFormat = 'YYYY-[W]WW';
          dateGrouping = {
            year: { $year: '$createdAt' },
            week: { $week: '$createdAt' }
          };
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          dateGrouping = {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          };
          break;
        case 'day':
        default:
          dateFormat = 'YYYY-MM-DD';
          dateGrouping = {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          };
      }
      
      // Build aggregation pipeline to group by time interval
      const pipeline = [
        {
          $match: {
            merchantId,
            createdAt: {
              $gte: timeRange.start,
              $lte: timeRange.end
            }
          }
        },
        {
          $group: {
            _id: dateGrouping,
            count: { $sum: 1 },
            volume: { $sum: '$amount' },
            averageAmount: { $avg: '$amount' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ];
      
      // Execute the query
      const results = await this.mongoDBConnector.executeQuery({
        collection: 'refund_requests',
        pipeline
      });
      
      // Generate all intervals in the time range
      const intervalLabels: string[] = [];
      const intervalData: Record<string, Record<string, number>> = {};
      
      // Initialize datasets
      const datasets: Record<string, number[]> = {};
      metrics.forEach(metric => {
        datasets[metric] = [];
      });
      
      // Generate interval labels based on interval type
      let current = moment(timeRange.start);
      const end = moment(timeRange.end);
      
      while (current.isSameOrBefore(end)) {
        const label = current.format(dateFormat);
        intervalLabels.push(label);
        
        // Initialize with zero values
        intervalData[label] = {
          count: 0,
          volume: 0,
          averageAmount: 0
        };
        
        // Advance to next interval
        switch (interval) {
          case 'week':
            current.add(1, 'week');
            break;
          case 'month':
            current.add(1, 'month');
            break;
          case 'day':
          default:
            current.add(1, 'day');
        }
      }
      
      // Fill in data from results
      results.forEach((result: any) => {
        // Create label from result date parts
        let label: string;
        switch (interval) {
          case 'week':
            label = `${result._id.year}-W${String(result._id.week).padStart(2, '0')}`;
            break;
          case 'month':
            label = `${result._id.year}-${String(result._id.month).padStart(2, '0')}`;
            break;
          case 'day':
          default:
            label = `${result._id.year}-${String(result._id.month).padStart(2, '0')}-${String(result._id.day).padStart(2, '0')}`;
        }
        
        if (intervalData[label]) {
          intervalData[label].count = result.count;
          intervalData[label].volume = result.volume;
          intervalData[label].averageAmount = result.averageAmount;
        }
      });
      
      // Convert to arrays for each requested metric
      intervalLabels.forEach(label => {
        metrics.forEach(metric => {
          datasets[metric].push(intervalData[label][metric] || 0);
        });
      });
      
      logger.info('Time series metrics calculation completed', {
        merchantId,
        intervalCount: intervalLabels.length,
        metrics
      });
      
      return {
        intervals: intervalLabels,
        datasets
      };
    } catch (error) {
      logger.error('Error calculating time series metrics', {
        error,
        merchantId,
        timeRange,
        interval
      });
      throw error;
    }
  }

  /**
   * Calculate metrics comparing current period to previous period
   * 
   * @param merchantId Merchant ID to calculate for
   * @param currentPeriod Current time period
   * @param previousPeriod Previous time period for comparison
   * @param metrics Metrics to include in comparison
   * @returns Comparison metrics
   */
  async calculateComparisonMetrics(
    merchantId: string,
    currentPeriod: { start: Date; end: Date },
    previousPeriod: { start: Date; end: Date },
    metrics: string[] = ['volume', 'count', 'rate', 'averageTime']
  ): Promise<Record<string, { current: number; previous: number; change: number; percentChange: number }>> {
    try {
      logger.debug('Calculating comparison metrics', {
        merchantId,
        currentPeriod,
        previousPeriod,
        metrics
      });
      
      const result: Record<string, { current: number; previous: number; change: number; percentChange: number }> = {};
      
      // Calculate metrics for each period in parallel
      const metricPromises: Promise<any>[] = [];
      
      if (metrics.includes('volume') || metrics.includes('count')) {
        metricPromises.push(
          this.calculateRefundVolume(merchantId, currentPeriod),
          this.calculateRefundVolume(merchantId, previousPeriod)
        );
      }
      
      if (metrics.includes('rate')) {
        metricPromises.push(
          this.calculateRefundRate(merchantId, currentPeriod),
          this.calculateRefundRate(merchantId, previousPeriod)
        );
      }
      
      if (metrics.includes('averageTime')) {
        metricPromises.push(
          this.calculateAverageRefundTime(merchantId, currentPeriod),
          this.calculateAverageRefundTime(merchantId, previousPeriod)
        );
      }
      
      const metricsData = await Promise.all(metricPromises);
      
      // Process volume and count comparisons
      if (metrics.includes('volume') || metrics.includes('count')) {
        const currentVolume = metricsData[0];
        const previousVolume = metricsData[1];
        
        if (metrics.includes('volume')) {
          const current = currentVolume.total;
          const previous = previousVolume.total;
          const change = current - previous;
          const percentChange = previous !== 0 ? (change / previous) * 100 : 0;
          
          result.volume = { current, previous, change, percentChange };
        }
        
        if (metrics.includes('count')) {
          const current = currentVolume.count;
          const previous = previousVolume.count;
          const change = current - previous;
          const percentChange = previous !== 0 ? (change / previous) * 100 : 0;
          
          result.count = { current, previous, change, percentChange };
        }
      }
      
      // Process refund rate comparison
      if (metrics.includes('rate')) {
        const rateOffset = metrics.includes('volume') ? 2 : 0;
        const currentRate = metricsData[rateOffset];
        const previousRate = metricsData[rateOffset + 1];
        
        const current = currentRate.rate;
        const previous = previousRate.rate;
        const change = current - previous;
        const percentChange = previous !== 0 ? (change / previous) * 100 : 0;
        
        result.rate = { current, previous, change, percentChange };
      }
      
      // Process average time comparison
      if (metrics.includes('averageTime')) {
        const timeOffset = metrics.includes('volume') && metrics.includes('rate')
          ? 4
          : metrics.includes('volume') || metrics.includes('rate')
          ? 2
          : 0;
          
        const currentTime = metricsData[timeOffset];
        const previousTime = metricsData[timeOffset + 1];
        
        const current = currentTime.averageTimeDays;
        const previous = previousTime.averageTimeDays;
        const change = current - previous;
        const percentChange = previous !== 0 ? (change / previous) * 100 : 0;
        
        result.averageTime = { current, previous, change, percentChange };
      }
      
      logger.info('Comparison metrics calculation completed', {
        merchantId,
        metrics: Object.keys(result)
      });
      
      return result;
    } catch (error) {
      logger.error('Error calculating comparison metrics', {
        error,
        merchantId,
        currentPeriod,
        previousPeriod
      });
      throw error;
    }
  }

  /**
   * Calculate refund metrics for top merchants by volume or count
   * 
   * @param timeRange Start and end date range
   * @param sortBy Metric to sort by (volume, count, rate)
   * @param limit Maximum number of merchants to return
   * @param organizationId Optional organization ID to filter merchants
   * @returns Top merchants with metrics
   */
  async calculateTopMerchants(
    timeRange: { start: Date; end: Date },
    sortBy: string = 'volume',
    limit: number = 10,
    organizationId?: string
  ): Promise<Array<{ merchantId: string; merchantName: string; count: number; amount: number; refundRate: number }>> {
    try {
      logger.debug('Calculating top merchants', {
        timeRange,
        sortBy,
        limit,
        organizationId
      });
      
      // Validate sort field
      if (!['volume', 'count', 'rate'].includes(sortBy)) {
        throw new Error('Invalid sortBy parameter. Must be volume, count, or rate');
      }
      
      // Set default limit if not specified
      const resultLimit = limit > 0 ? limit : 10;
      
      // Build match stage
      const matchStage: any = {
        createdAt: {
          $gte: timeRange.start,
          $lte: timeRange.end
        }
      };
      
      // Add organization filter if provided
      if (organizationId) {
        // This assumes we have organizationId in the refund request or can join with merchant data
        matchStage.organizationId = organizationId;
      }
      
      // Build the aggregation pipeline
      const pipeline = [
        {
          $match: matchStage
        },
        {
          $group: {
            _id: '$merchantId',
            count: { $sum: 1 },
            amount: { $sum: '$amount' }
          }
        }
      ];
      
      // Add sort stage based on sortBy parameter
      let sortStage: any;
      switch (sortBy) {
        case 'count':
          sortStage = { $sort: { count: -1 } };
          break;
        case 'rate':
          // Rate will be calculated later, sort by volume for now
          sortStage = { $sort: { amount: -1 } };
          break;
        case 'volume':
        default:
          sortStage = { $sort: { amount: -1 } };
      }
      
      pipeline.push(sortStage);
      
      // Add limit stage
      pipeline.push({ $limit: resultLimit });
      
      // Execute the query
      const results = await this.mongoDBConnector.executeQuery({
        collection: 'refund_requests',
        pipeline
      });
      
      // Format results and calculate additional metrics
      const merchantPromises = results.map(async (result: any) => {
        const merchantId = result._id;
        
        // Calculate refund rate for the merchant
        let refundRate = 0;
        try {
          const rateResult = await this.calculateRefundRate(merchantId, timeRange);
          refundRate = rateResult.rate;
        } catch (error) {
          logger.warn(`Failed to calculate refund rate for merchant ${merchantId}`, {
            error
          });
        }
        
        // Get merchant name (this would require integration with merchant service)
        // For now, use a placeholder based on the merchant ID
        const merchantName = `Merchant ${merchantId.substring(0, 8)}`;
        
        return {
          merchantId,
          merchantName,
          count: result.count,
          amount: result.amount,
          refundRate
        };
      });
      
      // Wait for all merchant data to be processed
      const merchants = await Promise.all(merchantPromises);
      
      // Resort if needed (for refund rate)
      if (sortBy === 'rate') {
        merchants.sort((a, b) => b.refundRate - a.refundRate);
      }
      
      logger.info('Top merchants calculation completed', {
        merchantCount: merchants.length,
        sortBy
      });
      
      return merchants;
    } catch (error) {
      logger.error('Error calculating top merchants', {
        error,
        timeRange,
        sortBy,
        limit
      });
      throw error;
    }
  }
}

export { MetricsCalculator };
export default MetricsCalculator;