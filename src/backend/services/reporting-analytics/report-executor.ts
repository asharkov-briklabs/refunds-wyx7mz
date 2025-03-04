import { logger } from '../../common/utils/logger'; // Import logger for logging
import { IReportDefinition, IPermissionRule } from './models/report-definition.model'; // Import report definition interfaces
import { DataSourceConnector, getDataSourceConnector } from './data-sources'; // Import data source connector interface and factory
import { ValidationError, BusinessError } from '../../common/errors'; // Import custom error classes
import { merchantService } from '../../integrations'; // Import merchant service integration

/**
 * Service responsible for executing report definitions against various data sources with proper validation and access control
 */
export class ReportExecutor {
  /**
   * Initializes the ReportExecutor
   */
  constructor() {
    logger.info('ReportExecutor initialized');
  }

  /**
   * Executes a report based on its definition and provided parameters
   * @param reportDefinition - The report definition to execute
   * @param parameters - Parameters to apply to the query
   * @param user - User object for permission checks
   * @returns Report results and metadata
   */
  async executeReport(
    reportDefinition: IReportDefinition,
    parameters: Record<string, any>,
    user: any
  ): Promise<{ data: any[]; metadata: object }> {
    logger.info('Attempting to execute report', { reportId: reportDefinition.reportId, userId: user.id });

    // Validate the report definition
    if (!reportDefinition) {
      throw new ValidationError('Report definition is required');
    }

    // Validate query structure
    this.validateQuery(reportDefinition.query, reportDefinition.dataSource);

    // Get appropriate data source connector
    const dataSourceConnector: DataSourceConnector = getDataSourceConnector(reportDefinition.dataSource);

    // Process parameters to insert them into the query template
    const processedQuery = this.processQueryTemplate(reportDefinition.query, parameters);

    // Apply permission-based data filters
    const filteredQuery = await this.applyDataFilters(processedQuery, user, reportDefinition.permissions);

    try {
      // Execute the query against the data source
      const data = await dataSourceConnector.executeQuery(filteredQuery, parameters);

      logger.info('Report executed successfully', { reportId: reportDefinition.reportId, resultCount: data.length });

      // Return the results with metadata
      return {
        data: data,
        metadata: {
          executionTime: new Date(),
          rowCount: data.length
        }
      };
    } catch (error: any) {
      logger.error('Error executing report', {
        reportId: reportDefinition.reportId,
        error: error.message,
        stack: error.stack
      });
      throw new BusinessError('Failed to execute report', error.message);
    }
  }

  /**
   * Executes an ad-hoc query against a specific data source with permission checks
   * @param dataSourceName - Name of the data source to query
   * @param query - Query specification to execute
   * @param parameters - Parameters to apply to the query
   * @param user - User object for permission checks
   * @returns Query results and metadata
   */
  async executeAdHocQuery(
    dataSourceName: string,
    query: any,
    parameters: Record<string, any>,
    user: any
  ): Promise<{ data: any[]; metadata: object }> {
    logger.info('Attempting to execute ad-hoc query', { dataSourceName, userId: user.id });

    // Validate that the user has permissions to execute ad-hoc queries
    // TODO: Implement proper permission checks for ad-hoc queries
    // For now, allow all authenticated users

    // Validate the query
    this.validateQuery(query, dataSourceName);

    // Get appropriate data source connector
    const dataSourceConnector: DataSourceConnector = getDataSourceConnector(dataSourceName);

    // Process parameters to insert them into the query
    const processedQuery = this.processQueryTemplate(query, parameters);

    // Apply permission-based data filters
    const filteredQuery = await this.applyDataFilters(processedQuery, user, []); // No permissions for ad-hoc queries

    try {
      // Execute the query against the data source
      const data = await dataSourceConnector.executeQuery(filteredQuery, parameters);

      logger.info('Ad-hoc query executed successfully', { dataSourceName, resultCount: data.length });

      // Return the results with metadata
      return {
        data: data,
        metadata: {
          executionTime: new Date(),
          rowCount: data.length
        }
      };
    } catch (error: any) {
      logger.error('Error executing ad-hoc query', {
        dataSourceName,
        error: error.message,
        stack: error.stack
      });
      throw new BusinessError('Failed to execute ad-hoc query', error.message);
    }
  }

  /**
   * Validates a query's structure and permissions before execution
   * @param query - Query object to validate
   * @param dataSourceName - Name of the data source being queried
   * @returns True if query is valid
   */
  validateQuery(query: any, dataSourceName: string): boolean {
    if (!query || typeof query !== 'object') {
      throw new ValidationError('Query must be a valid object');
    }

    // TODO: Add more specific validation based on data source type
    // For MongoDB: check for proper pipeline structure, ensure no $out or risky operators
    // For TimeSeriesDB: validate time range, metrics, and grouping

    // Check for proper parameter placeholders syntax
    // Validate that the query doesn't exceed complexity limits

    return true;
  }

  /**
   * Applies data filters to queries based on user permissions
   * @param query - Query object to modify
   * @param user - User object with roles and permissions
   * @param permissions - Permission rules for the report
   * @returns Query with applied permission filters
   */
  async applyDataFilters(query: any, user: any, permissions: IPermissionRule[]): Promise<any> {
    const modifiedQuery = { ...query }; // Create a copy of the original query

    // Determine user's access level based on roles and permissions
    let merchantIds: string[] | null = null;

    // Check if user is BARRACUDA_ADMIN, if so, no filters needed
    if (this.checkUserReportAccess(user, permissions)) {
      logger.debug('User has BARRACUDA_ADMIN role, no data filters applied');
      return modifiedQuery; // Return original query
    }

    // Get merchant IDs based on access level
    try {
      merchantIds = await this.getMerchantIdsByAccessLevel(user, permissions[0]?.access);
    } catch (error: any) {
      logger.error('Failed to get merchant IDs by access level', { error: error.message, stack: error.stack });
      throw error;
    }

    if (merchantIds === null) {
      logger.debug('No data filters applied, user has access to all merchants');
      return modifiedQuery; // Return original query
    }

    if (merchantIds.length === 0) {
      logger.debug('User has no access to any merchants, returning empty result');
      // Apply a filter that always returns an empty result
      if (modifiedQuery.pipeline) {
        modifiedQuery.pipeline.unshift({ $match: { _id: null } }); // MongoDB
      } else if (modifiedQuery.filter) {
        modifiedQuery.filter._id = null; // Generic filter
      } else {
        modifiedQuery.filter = { _id: null }; // Default filter
      }
      return modifiedQuery;
    }

    // Apply data source specific filter
    if (modifiedQuery.pipeline) {
      // MongoDB pipeline
      modifiedQuery.pipeline.unshift({ $match: { merchantId: { $in: merchantIds } } });
    } else if (modifiedQuery.filter) {
      // Generic filter
      modifiedQuery.filter.merchantId = { $in: merchantIds };
    } else {
      modifiedQuery.filter = { merchantId: { $in: merchantIds } };
    }

    logger.debug('Data filters applied to query', { merchantIds });
    return modifiedQuery;
  }

  /**
   * Processes a query template by replacing parameter placeholders with actual values
   * @param query - Query object containing placeholders
   * @param parameters - Parameter values to substitute
   * @returns Processed query with parameter values inserted
   */
  processQueryTemplate(query: any, parameters: Record<string, any>): any {
    // TODO: Implement template processing logic
    // Use a templating engine like Handlebars or similar to replace placeholders
    // Handle type conversions as needed (string, number, boolean, etc.)
    // Check for missing required parameters
    return query;
  }

  /**
   * Calculates aggregates from report results for summary statistics
   * @param data - Report data
   * @param aggregateDefinitions - Definitions of aggregates to calculate
   * @returns Calculated aggregate values
   */
  calculateAggregates(data: any[], aggregateDefinitions: any): any {
    // TODO: Implement aggregate calculation logic
    // Process each aggregate definition (sum, avg, min, max, count, etc.)
    // Handle empty data sets with appropriate default values
    return {};
  }

  /**
   * Gets merchant IDs that a user has access to based on their role and access level
   * @param user - User object with roles and permissions
   * @param accessLevel - Access level for the report
   * @returns Array of merchant IDs
   */
  async getMerchantIdsByAccessLevel(user: any, accessLevel: string): Promise<string[]> {
    try {
      if (!user || !user.roles) {
        throw new Error('User object with roles is required');
      }

      if (accessLevel === 'ALL_MERCHANTS') {
        return null; // No filtering needed
      }

      let merchantIds: string[] = [];

      if (accessLevel === 'ORGANIZATION_MERCHANTS' && user.organizationId) {
        const merchants = await merchantService.getMerchantsByOrganization(user.organizationId);
        merchantIds = merchants.map(m => m.id);
      } else if (accessLevel === 'BANK_MERCHANTS' && user.bankId) {
        const merchants = await merchantService.getMerchantsByBank(user.bankId);
        merchantIds = merchants.map(m => m.id);
      } else if (accessLevel === 'OWN_MERCHANT' && user.merchantId) {
        merchantIds = [user.merchantId];
      } else {
        logger.warn('Invalid access level or missing user properties', { accessLevel, user });
        return [];
      }

      return merchantIds;
    } catch (error: any) {
      logger.error('Failed to get merchant IDs by access level', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Checks if a user has access to execute a specific report
   * @param user - User object with roles
   * @param permissions - Permission rules for the report
   * @returns True if user has access
   */
  checkUserReportAccess(user: any, permissions: IPermissionRule[]): boolean {
    if (!user || !user.roles || !Array.isArray(user.roles)) {
      logger.warn('User object with roles is required for access check');
      return false;
    }

    for (const permission of permissions) {
      if (user.roles.includes(permission.role)) {
        logger.debug('User has required role for report access', { role: permission.role });
        return true;
      }
    }

    logger.debug('User does not have required role for report access', { roles: user.roles });
    return false;
  }
}

// Export the ReportExecutor class as the default export
export default ReportExecutor;