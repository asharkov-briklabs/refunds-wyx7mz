import { logger } from '../../common/utils/logger'; // Import logger for logging
import { metrics } from '../../common/utils/metrics'; // Recording metrics about report generation and usage
import ReportExecutor from './report-executor'; // Service for executing report definitions against various data sources
import MetricsCalculator from './metrics-calculator'; // Service for calculating refund-related metrics and KPIs
import { IReportDefinition, ReportDefinitionModel, IScheduledReport, OutputFormat } from './models'; // Interface defining report definition structure
import { getExporter } from './exporters'; // Factory function to get appropriate data exporter
import { scheduleReport, executeScheduledReport, getScheduledReportsForUser } from './report-scheduler'; // Function to schedule a report to run periodically
import { ValidationError, BusinessError, UnsupportedExportFormatError } from '../../common/errors'; // Error class for validation failures
import refundRequestRepository from '../../database/repositories/refund-request.repo'; // Repository for accessing refund request data

/**
 * Central service that orchestrates all reporting and analytics capabilities within the Refunds Service.
 * It serves as the main entry point for generating reports, calculating metrics, scheduling recurring reports,
 * and exporting data in various formats.
 */
class ReportingEngine {
  private reportExecutor: ReportExecutor;
  private metricsCalculator: MetricsCalculator;
  private s3Client: any;

  /**
   * Initializes the ReportingEngine with required dependencies
   * @param reportExecutor 
   * @param metricsCalculator 
   * @param s3Client 
   */
  constructor(reportExecutor: ReportExecutor, metricsCalculator: MetricsCalculator, s3Client: any) {
    this.reportExecutor = reportExecutor;
    this.metricsCalculator = metricsCalculator;
    this.s3Client = s3Client;
    logger.info('ReportingEngine service initialized');
  }

  /**
   * Generates a report based on its definition and provided parameters
   * @param reportId 
   * @param parameters 
   * @param user 
   * @returns Report results and metadata
   */
  async generateReport(
    reportId: string,
    parameters: Record<string, any>,
    user: any
  ): Promise<{ data: any[]; metadata: object }> {
    logger.info('Attempting to execute report', { reportId, userId: user.id });

    // Validate reportId parameter
    if (!reportId) {
      throw new ValidationError('Report ID is required');
    }

    // Retrieve report definition from database
    const reportDefinition = await ReportDefinitionModel.findOne({ reportId });
    if (!reportDefinition) {
      throw new ValidationError(`Report with ID ${reportId} not found`);
    }

    // Verify that user has permissions to access this report
    if (!this.checkUserAccess(user, reportDefinition.permissions, reportDefinition.reportId)) {
      throw new BusinessError('PERMISSION_DENIED', 'User does not have permission to access this report');
    }

    // Validate provided parameters against report parameter definitions
    if (!this.validateParameters(reportDefinition.parameterDefinitions, parameters)) {
      throw new ValidationError('Invalid parameters provided for report');
    }

    try {
      // Execute report using reportExecutor.executeReport()
      const { data, metadata } = await this.reportExecutor.executeReport(reportDefinition, parameters, user);

      // Record metrics about report generation
      metrics.recordHistogram('report.generated', data.length, { reportId });

      // Return report data and metadata
      return { data, metadata };
    } catch (error: any) {
      logger.error('Error generating report', { reportId, error: error.message, stack: error.stack });
      throw new BusinessError('Failed to generate report', error.message);
    }
  }

  /**
   * Executes an ad-hoc query against a specific data source with permission checks
   * @param dataSourceName 
   * @param query 
   * @param parameters 
   * @param user 
   * @returns Query results and metadata
   */
  async executeAdHocQuery(
    dataSourceName: string,
    query: any,
    parameters: Record<string, any>,
    user: any
  ): Promise<{ data: any[]; metadata: object }> {
    logger.info('Attempting to execute ad-hoc query', { dataSourceName, userId: user.id });

    // Validate user has permissions to execute ad-hoc queries
    // TODO: Implement proper permission checks for ad-hoc queries
    // For now, allow all authenticated users

    // Validate query structure using reportExecutor.validateQuery()
    this.reportExecutor.validateQuery(query, dataSourceName);

    try {
      // Execute ad-hoc query using reportExecutor.executeAdHocQuery()
      const { data, metadata } = await this.reportExecutor.executeAdHocQuery(dataSourceName, query, parameters, user);

      // Record metrics about ad-hoc query execution
      metrics.recordHistogram('report.adhoc.executed', data.length, { dataSourceName });

      // Return query results and metadata
      return { data, metadata };
    } catch (error: any) {
      logger.error('Error executing ad-hoc query', { dataSourceName, error: error.message, stack: error.stack });
      throw new BusinessError('Failed to execute ad-hoc query', error.message);
    }
  }

  /**
   * Retrieves a report definition from the database
   * @param reportId 
   * @returns The report definition or null if not found
   */
  async getReportDefinition(reportId: string): Promise<IReportDefinition | null> {
    // Validate reportId parameter
    if (!reportId) {
      throw new ValidationError('Report ID is required');
    }

    try {
      // Query database for report definition by reportId
      const reportDefinition = await ReportDefinitionModel.findOne({ reportId });

      // Return the report definition or null if not found
      return reportDefinition || null;
    } catch (error) {
      logger.error('Error retrieving report definition', { error, reportId });
      throw new BusinessError('Failed to retrieve report definition', error.message);
    }
  }

  /**
   * Creates a new report definition in the database
   * @param reportDefinition 
   * @param user 
   * @returns The created report definition
   */
  async createReportDefinition(reportDefinition: IReportDefinition, user: any): Promise<IReportDefinition> {
    // Validate user has permissions to create report definitions
    // TODO: Implement proper permission checks for report creation

    // Validate report definition structure and parameters
    // TODO: Implement report definition validation

    // Ensure reportId is unique
    const existingReport = await ReportDefinitionModel.findOne({ reportId: reportDefinition.reportId });
    if (existingReport) {
      throw new ValidationError(`Report with ID ${reportDefinition.reportId} already exists`);
    }

    try {
      // Create report definition in database
      const createdReport = await ReportDefinitionModel.create(reportDefinition);

      // Log creation and record metrics
      logger.info('Report definition created', { reportId: reportDefinition.reportId });
      metrics.incrementCounter('report.definition.created', 1);

      // Return the created report definition
      return createdReport;
    } catch (error) {
      logger.error('Error creating report definition', { error, reportId: reportDefinition.reportId });
      throw new BusinessError('Failed to create report definition', error.message);
    }
  }

  /**
   * Updates an existing report definition
   * @param reportId 
   * @param updates 
   * @param user 
   * @returns The updated report definition or null if not found
   */
  async updateReportDefinition(reportId: string, updates: IReportDefinition, user: any): Promise<IReportDefinition | null> {
    // Validate user has permissions to update report definitions
    // TODO: Implement proper permission checks for report updates

    // Retrieve existing report definition
    const existingReport = await ReportDefinitionModel.findOne({ reportId });
    if (!existingReport) {
      throw new ValidationError(`Report with ID ${reportId} not found`);
    }

    // Validate updates against report definition structure
    // TODO: Implement report definition update validation

    try {
      // Apply updates to report definition
      Object.assign(existingReport, updates);

      // Save updated report definition to database
      const updatedReport = await existingReport.save();

      // Return the updated report definition
      return updatedReport;
    } catch (error) {
      logger.error('Error updating report definition', { error, reportId });
      throw new BusinessError('Failed to update report definition', error.message);
    }
  }

  /**
   * Deletes a report definition
   * @param reportId 
   * @param user 
   * @returns True if deleted, false if not found
   */
  async deleteReportDefinition(reportId: string, user: any): Promise<boolean> {
    // Validate user has permissions to delete report definitions
    // TODO: Implement proper permission checks for report deletion

    // Check if report is used in any scheduled reports
    // TODO: Implement check for scheduled reports

    try {
      // Delete report definition from database
      const result = await ReportDefinitionModel.deleteOne({ reportId });

      // Return success indicator
      return result.deletedCount === 1;
    } catch (error) {
      logger.error('Error deleting report definition', { error, reportId });
      throw new BusinessError('Failed to delete report definition', error.message);
    }
  }

  /**
   * Lists all report definitions the user has access to
   * @param user 
   * @param options 
   * @returns Paginated report definitions and total count
   */
  async listReportDefinitions(user: any, options: any): Promise<{ results: IReportDefinition[]; total: number }> {
    try {
      // Extract pagination parameters from options
      const page = options.page || 1;
      const pageSize = options.pageSize || 20;
      const skip = (page - 1) * pageSize;

      // Build query to find reports user has access to based on their roles
      const query: any = {};
      // TODO: Implement access control logic based on user roles

      // Apply any additional filters from options
      // TODO: Implement filtering logic

      // Execute query with pagination
      const [results, total] = await Promise.all([
        ReportDefinitionModel.find(query).skip(skip).limit(pageSize),
        ReportDefinitionModel.countDocuments(query)
      ]);

      // Return results and total count
      return { results, total };
    } catch (error) {
      logger.error('Error listing report definitions', { error, user });
      throw new BusinessError('Failed to list report definitions', error.message);
    }
  }

  /**
   * Exports report data in the specified format
   * @param data 
   * @param format 
   * @param reportName 
   * @returns URL and content type of exported report
   */
  async exportReport(data: any[], format: OutputFormat, reportName: string): Promise<{ url: string; contentType: string }> {
    // Validate format parameter is a supported OutputFormat
    if (!Object.values(OutputFormat).includes(format)) {
      throw new UnsupportedExportFormatError(`Unsupported export format: ${format}`);
    }

    try {
      // Get appropriate exporter using getExporter(format)
      const exporter = getExporter(format);

      // Export data using the selected exporter
      const exportedData = await exporter.export(data);

      // Generate a unique filename for the exported report
      const filename = `${reportName.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}${exporter.getFileExtension()}`;

      // Upload the exported file to S3
      // TODO: Implement S3 upload logic here
      const url = 'https://example.com/report.csv'; // Replace with actual S3 URL

      // Generate a time-limited signed URL for downloading the file
      // TODO: Implement signed URL generation

      // Return URL and content type
      return { url, contentType: exporter.getContentType() };
    } catch (error) {
      logger.error('Error exporting report', { error, format, reportName });
      throw new BusinessError('Failed to export report', error.message);
    }
  }

  /**
   * Schedules a report to run periodically
   * @param reportId 
   * @param parameters 
   * @param scheduleExpression 
   * @param user 
   * @param outputFormat 
   * @param recipients 
   * @returns Created schedule information
   */
  async scheduleReport(
    reportId: string,
    parameters: Record<string, any>,
    scheduleExpression: string,
    user: any,
    outputFormat: OutputFormat,
    recipients: any[]
  ): Promise<{ scheduleId: string; nextRunTime: Date }> {
    // Validate reportId exists and user has access to it
    const reportDefinition = await ReportDefinitionModel.findOne({ reportId });
    if (!reportDefinition) {
      throw new ValidationError(`Report with ID ${reportId} not found`);
    }

    if (!this.checkUserAccess(user, reportDefinition.permissions, reportId)) {
      throw new BusinessError('PERMISSION_DENIED', 'User does not have permission to schedule this report');
    }

    // Validate parameters against report parameter definitions
    if (!this.validateParameters(reportDefinition.parameterDefinitions, parameters)) {
      throw new ValidationError('Invalid parameters provided for report');
    }

    // Validate schedule expression format
    try {
      cronParser.parseExpression(scheduleExpression);
    } catch (error) {
      throw new ValidationError('Invalid cron expression format');
    }

    try {
      // Call scheduleReport function from report-scheduler
      const { scheduleId, nextRunTime } = await scheduleReport(reportId, parameters, scheduleExpression, user, outputFormat, recipients);

      // Return schedule ID and next run time
      return { scheduleId, nextRunTime };
    } catch (error) {
      logger.error('Error scheduling report', { error, reportId, scheduleExpression, userId: user.id });
      throw new BusinessError('Failed to schedule report', error.message);
    }
  }

  /**
   * Gets all scheduled reports for the current user
   * @param user 
   * @returns Array of scheduled reports for the user
   */
  async getScheduledReportsForUser(user: any): Promise<IScheduledReport[]> {
    try {
      // Call getScheduledReportsForUser function from report-scheduler
      const scheduledReports = await getScheduledReportsForUser(user);

      // Return array of scheduled reports
      return scheduledReports;
    } catch (error) {
      logger.error('Error getting scheduled reports for user', { error, userId: user.id });
      throw new BusinessError('Failed to get scheduled reports for user', error.message);
    }
  }

  /**
   * Executes a scheduled report immediately
   * @param scheduleId 
   * @param user 
   * @returns Execution result
   */
  async executeScheduledReport(scheduleId: string, user: any): Promise<{ success: boolean; resultUrl?: string; error?: string }> {
    // Validate scheduleId exists and user has access to it
    // TODO: Implement validation logic

    try {
      // Call executeScheduledReport function from report-scheduler
      const { success, resultUrl, error } = await executeScheduledReport(scheduleId, user);

      // Return execution result with success status and result URL
      return { success, resultUrl, error };
    } catch (error) {
      logger.error('Error executing scheduled report', { error, scheduleId });
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculates refund metrics for a merchant
   * @param merchantId 
   * @param timeRange 
   * @param dimensions 
   * @param user 
   * @returns Calculated metrics
   */
  async calculateRefundMetrics(
    merchantId: string,
    timeRange: { start: Date; end: Date },
    dimensions: string[],
    user: any
  ): Promise<object> {
    // Validate user has access to the specified merchant
    // TODO: Implement access control logic

    try {
      // Call metricsCalculator.calculateRefundMetrics()
      const metrics = await this.metricsCalculator.calculateRefundMetrics(merchantId, timeRange, dimensions);

      // Return calculated metrics
      return metrics;
    } catch (error) {
      logger.error('Error calculating refund metrics', { error, merchantId, timeRange, dimensions });
      throw new BusinessError('Failed to calculate refund metrics', error.message);
    }
  }

  /**
   * Calculates the refund rate for a merchant
   * @param merchantId 
   * @param timeRange 
   * @param user 
   * @returns Refund rate statistics
   */
  async calculateRefundRate(
    merchantId: string,
    timeRange: { start: Date; end: Date },
    user: any
  ): Promise<{ rate: number; totalTransactions: number; refundedTransactions: number }> {
    // Validate user has access to the specified merchant
    // TODO: Implement access control logic

    try {
      // Call metricsCalculator.calculateRefundRate()
      const refundRate = await this.metricsCalculator.calculateRefundRate(merchantId, timeRange);

      // Return calculated refund rate
      return refundRate;
    } catch (error) {
      logger.error('Error calculating refund rate', { error, merchantId, timeRange });
      throw new BusinessError('Failed to calculate refund rate', error.message);
    }
  }

  /**
   * Calculates refund volume for a merchant
   * @param merchantId 
   * @param timeRange 
   * @param groupBy 
   * @param user 
   * @returns Refund volume statistics
   */
  async calculateRefundVolume(
    merchantId: string,
    timeRange: { start: Date; end: Date },
    groupBy: string,
    user: any
  ): Promise<{ total: number; count: number; average: number; groups?: Record<string, any> }> {
    // Validate user has access to the specified merchant
    // TODO: Implement access control logic

    try {
      // Call metricsCalculator.calculateRefundVolume()
      const refundVolume = await this.metricsCalculator.calculateRefundVolume(merchantId, timeRange, groupBy);

      // Return calculated refund volume
      return refundVolume;
    } catch (error) {
      logger.error('Error calculating refund volume', { error, merchantId, timeRange, groupBy });
      throw new BusinessError('Failed to calculate refund volume', error.message);
    }
  }

  /**
   * Calculates the average refund processing time
   * @param merchantId 
   * @param timeRange 
   * @param user 
   * @returns Average processing time
   */
  async calculateAverageRefundTime(
    merchantId: string,
    timeRange: { start: Date; end: Date },
    user: any
  ): Promise<{ averageTimeMs: number; averageTimeDays: number }> {
    // Validate user has access to the specified merchant
    // TODO: Implement access control logic

    try {
      // Call metricsCalculator.calculateAverageRefundTime()
      const averageTime = await this.metricsCalculator.calculateAverageRefundTime(merchantId, timeRange);

      // Return calculated average refund time
      return averageTime;
    } catch (error) {
      logger.error('Error calculating average refund time', { error, merchantId, timeRange });
      throw new BusinessError('Failed to calculate average refund time', error.message);
    }
  }

  /**
   * Calculates refund distribution by refund method
   * @param merchantId 
   * @param timeRange 
   * @param user 
   * @returns Refund statistics by method
   */
  async calculateRefundsByMethod(
    merchantId: string,
    timeRange: { start: Date; end: Date },
    user: any
  ): Promise<Record<string, { count: number; amount: number; percentage: number }>> {
    // Validate user has access to the specified merchant
    // TODO: Implement access control logic

    try {
      // Call metricsCalculator.calculateRefundsByMethod()
      const refundsByMethod = await this.metricsCalculator.calculateRefundsByMethod(merchantId, timeRange);

      // Return calculated refund distribution by method
      return refundsByMethod;
    } catch (error) {
      logger.error('Error calculating refunds by method', { error, merchantId, timeRange });
      throw new BusinessError('Failed to calculate refunds by method', error.message);
    }
  }

  /**
   * Calculates refund distribution by status
   * @param merchantId 
   * @param timeRange 
   * @param user 
   * @returns Refund statistics by status
   */
  async calculateRefundsByStatus(
    merchantId: string,
    timeRange: { start: Date; end: Date },
    user: any
  ): Promise<Record<string, { count: number; amount: number; percentage: number }>> {
    // Validate user has access to the specified merchant
    // TODO: Implement access control logic

    try {
      // Call metricsCalculator.calculateRefundsByStatus()
      const refundsByStatus = await this.metricsCalculator.calculateRefundsByStatus(merchantId, timeRange);

      // Return calculated refund distribution by status
      return refundsByStatus;
    } catch (error) {
      logger.error('Error calculating refunds by status', { error, merchantId, timeRange });
      throw new BusinessError('Failed to calculate refunds by status', error.message);
    }
  }

  /**
   * Calculates refund metrics for top merchants
   * @param timeRange 
   * @param sortBy 
   * @param limit 
   * @param user 
   * @returns Top merchants with metrics
   */
  async calculateTopMerchants(
    timeRange: { start: Date; end: Date },
    sortBy: string,
    limit: number,
    user: any
  ): Promise<Array<{ merchantId: string; merchantName: string; count: number; amount: number; refundRate: number }>> {
    // Validate user has permissions to view multi-merchant data
    // TODO: Implement access control logic

    try {
      // Filter merchants based on user's role (bank admin, organization admin, etc.)
      // TODO: Implement filtering logic

      // Call metricsCalculator.calculateTopMerchants()
      const topMerchants = await this.metricsCalculator.calculateTopMerchants(timeRange, sortBy, limit);

      // Return calculated top merchants metrics
      return topMerchants;
    } catch (error) {
      logger.error('Error calculating top merchants', { error, timeRange, sortBy, limit });
      throw new BusinessError('Failed to calculate top merchants', error.message);
    }
  }

  /**
   * Gets preconfigured metrics for different dashboard types
   * @param dashboardType 
   * @param timeRange 
   * @param merchantId 
   * @param user 
   * @returns Dashboard metrics appropriate for the specified dashboard type
   */
  async getDashboardMetrics(
    dashboardType: string,
    timeRange: { start: Date; end: Date },
    merchantId: string,
    user: any
  ): Promise<object> {
    // Validate user has appropriate permissions
    // TODO: Implement access control logic

    try {
      // Select metrics to calculate based on dashboardType
      let metricsToCalculate: string[] = [];

      switch (dashboardType) {
        case 'Business':
          metricsToCalculate = ['volume', 'rate', 'methodDistribution'];
          break;
        case 'Operations':
          metricsToCalculate = ['processingTime', 'statusDistribution', 'errorRates'];
          break;
        case 'Executive':
          metricsToCalculate = ['kpis', 'trends'];
          break;
        default:
          throw new ValidationError(`Invalid dashboard type: ${dashboardType}`);
      }

      // Execute calculations for all required metrics in parallel
      const metricPromises: Promise<any>[] = [];

      if (metricsToCalculate.includes('volume') || metricsToCalculate.includes('rate')) {
        metricPromises.push(this.calculateRefundVolume(merchantId, timeRange, null, user));
        metricPromises.push(this.calculateRefundRate(merchantId, timeRange, user));
      }

      if (metricsToCalculate.includes('methodDistribution')) {
        metricPromises.push(this.calculateRefundsByMethod(merchantId, timeRange, user));
      }

      if (metricsToCalculate.includes('processingTime')) {
        metricPromises.push(this.calculateAverageRefundTime(merchantId, timeRange, user));
      }

      if (metricsToCalculate.includes('statusDistribution')) {
        metricPromises.push(this.calculateRefundsByStatus(merchantId, timeRange, user));
      }

      if (metricsToCalculate.includes('errorRates')) {
        // TODO: Implement error rate calculation
      }

      if (metricsToCalculate.includes('kpis') || metricsToCalculate.includes('trends')) {
        // TODO: Implement KPI and trend calculations
      }

      const results = await Promise.all(metricPromises);

      // Combine results into a unified dashboard object
      const dashboardMetrics: any = {};

      if (metricsToCalculate.includes('volume')) {
        dashboardMetrics.refundVolume = results[0];
      }

      if (metricsToCalculate.includes('rate')) {
        dashboardMetrics.refundRate = results[1];
      }

      if (metricsToCalculate.includes('methodDistribution')) {
        dashboardMetrics.refundMethodDistribution = results[2];
      }

      if (metricsToCalculate.includes('processingTime')) {
        dashboardMetrics.averageProcessingTime = results[3];
      }

      if (metricsToCalculate.includes('statusDistribution')) {
        dashboardMetrics.refundStatusDistribution = results[4];
      }

      // Return the dashboard metrics object
      return dashboardMetrics;
    } catch (error) {
      logger.error('Error getting dashboard metrics', { error, dashboardType, merchantId });
      throw new BusinessError('Failed to get dashboard metrics', error.message);
    }
  }

  /**
   * Validates parameters against report parameter definitions
   * @param parameterDefinitions 
   * @param parameters 
   * @returns True if parameters are valid
   */
  validateParameters(parameterDefinitions: any[], parameters: Record<string, any>): boolean {
    try {
      // For each required parameter, check if it exists in parameters
      for (const paramDef of parameterDefinitions) {
        if (paramDef.required && !parameters[paramDef.name]) {
          throw new ValidationError(`Missing required parameter: ${paramDef.name}`);
        }

        // Validate parameter types match expected types
        if (parameters[paramDef.name] && typeof parameters[paramDef.name] !== paramDef.type) {
          throw new ValidationError(`Invalid parameter type for ${paramDef.name}. Expected ${paramDef.type}`);
        }

        // Handle special parameter types like daterange, select, multiselect
        // TODO: Implement special parameter type validation
      }

      // Return true if all validations pass
      return true;
    } catch (error) {
      logger.error('Error validating parameters', { error, parameters });
      return false;
    }
  }

  /**
   * Checks if a user has access to a report or merchant data
   * @param user 
   * @param permissions 
   * @param merchantId 
   * @returns True if user has access
   */
  async checkUserAccess(user: any, permissions: any[], merchantId?: string): Promise<boolean> {
    // Extract user's roles from the user object
    const userRoles = user.roles || [];

    // Check if the user has a role matching any of the permissions
    for (const permission of permissions) {
      if (userRoles.includes(permission.role)) {
        logger.debug('User has required role for report access', { role: permission.role });
        return true;
      }
    }

    // For merchant data, verify the user's relationship to the merchant
    // TODO: Implement merchant relationship verification

    logger.debug('User does not have required role for report access', { roles: userRoles });
    return false;
  }
}

// Create singleton instance
const reportingEngine = new ReportingEngine(new ReportExecutor(), new MetricsCalculator(new MongoDBConnector()), {});

// Export the initialized reporting engine instance
export default reportingEngine;

// Export individual functions for testing and modularity
export const initialize = reportingEngine.constructor.prototype.initialize;
export const generateReport = reportingEngine.generateReport.bind(reportingEngine);
export const executeAdHocQuery = reportingEngine.executeAdHocQuery.bind(reportingEngine);
export const exportReport = reportingEngine.exportReport.bind(reportingEngine);
export const scheduleReport = reportingEngine.scheduleReport.bind(reportingEngine);
export const getScheduledReportsForUser = reportingEngine.getScheduledReportsForUser.bind(reportingEngine);
export const calculateRefundMetrics = reportingEngine.calculateRefundMetrics.bind(reportingEngine);
export const getDashboardMetrics = reportingEngine.getDashboardMetrics.bind(reportingEngine);