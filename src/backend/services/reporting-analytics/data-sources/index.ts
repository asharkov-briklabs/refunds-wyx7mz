/**
 * Data Sources module for the Reporting & Analytics Engine.
 * This module provides connectors to different data sources used for reporting and analytics.
 */

import { MongoDBConnector } from './mongodb.connector';
import { TimeSeriesConnector } from './timeseries.connector';
import { logger } from '../../../common/utils/logger';

/**
 * Interface that all data source connectors must implement
 */
export interface DataSourceConnector {
  /**
   * Execute a query against the data source
   * 
   * @param query - Query specification to execute
   * @param parameters - Parameters to apply to the query
   * @returns Query results as an array of objects
   */
  executeQuery(query: any, parameters?: any): Promise<any[]>;
  
  /**
   * Retrieve schema information from the data source
   * 
   * @returns Schema definition for the data source
   */
  getSchema(): Promise<object>;
  
  /**
   * Test if the connection to the data source is working
   * 
   * @returns Boolean indicating if connection is working
   */
  testConnection(): Promise<boolean>;
}

/**
 * Factory function to get the appropriate data source connector
 * 
 * @param dataSourceType - Type of data source to connect to
 * @returns Instance of the appropriate data source connector
 * @throws Error if data source type is unknown
 */
export function getDataSourceConnector(dataSourceType: string): DataSourceConnector {
  logger.debug('Getting data source connector', { dataSourceType });
  
  switch (dataSourceType.toLowerCase()) {
    case 'mongodb':
      return new MongoDBConnector();
    case 'timeseries':
      return new TimeSeriesConnector();
    default:
      logger.error('Unknown data source type', { dataSourceType });
      throw new Error(`Unknown data source type: ${dataSourceType}`);
  }
}

// Export the connector implementations
export { MongoDBConnector, TimeSeriesConnector };