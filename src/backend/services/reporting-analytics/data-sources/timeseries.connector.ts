import axios from 'axios'; // axios@^1.3.5
import dayjs from 'dayjs'; // dayjs@^1.11.7
import { logger } from '../../../common/utils/logger';
import { IReportDefinition } from '../models';

/**
 * TimeSeriesConnector provides connectivity and query execution for time-series databases
 * used in the Reporting & Analytics Engine for refund metrics and trends.
 * 
 * This connector abstracts the complexities of querying time-series data and provides
 * standardized methods for executing queries, retrieving schema information, and
 * validating connections.
 */
export class TimeSeriesConnector {
  private baseUrl: string;
  private apiKey: string;
  private connected: boolean;
  private timeoutMs: number;

  /**
   * Initialize the TimeSeriesConnector with configuration from environment variables
   * or default values if environment variables are not set.
   */
  constructor() {
    // Read configuration from environment variables or use defaults
    this.baseUrl = process.env.TIMESERIES_API_URL || 'http://timeseries-db:8086';
    this.apiKey = process.env.TIMESERIES_API_KEY || '';
    this.connected = false;
    this.timeoutMs = parseInt(process.env.TIMESERIES_TIMEOUT_MS || '30000', 10);
    
    logger.debug('TimeSeriesConnector initialized', { 
      baseUrl: this.baseUrl,
      timeout: this.timeoutMs
    });
  }

  /**
   * Execute a time-series query based on the provided query specification and parameters.
   * Supports different query types including standard time-series, aggregation, and trend analysis.
   * 
   * @param query - The query specification to execute, containing metrics, dimensions, and filters
   * @param parameters - Parameters to apply to the query, replacing placeholders
   * @returns Promise resolving to an array of query result objects
   * @throws Error if query execution fails
   */
  async executeQuery(query: any, parameters: any): Promise<any[]> {
    // Validate input
    if (!query) {
      throw new Error('Query specification is required');
    }

    try {
      // Process the query to replace parameter placeholders
      const processedQuery = this.processQuery(query, parameters);
      
      // Ensure we're connected before executing
      if (!this.connected) {
        await this.connect();
      }

      // Extract time range parameters for logging
      const timeStart = processedQuery.timeRange?.start || processedQuery.startTime || 'N/A';
      const timeEnd = processedQuery.timeRange?.end || processedQuery.endTime || 'N/A';

      logger.info('Executing time-series query', { 
        metrics: processedQuery.metrics || [],
        dimensions: processedQuery.dimensions || [],
        timeRange: `${timeStart} to ${timeEnd}`,
        queryType: processedQuery.type || 'standard'
      });

      // Determine the query type and use the appropriate execution method
      let results: any[];
      
      if (processedQuery.type === 'trend') {
        results = await this.executeTrendQuery(processedQuery);
        logger.debug('Trend query executed', { resultCount: results.length });
      } else if (processedQuery.type === 'aggregation') {
        results = await this.executeAggregationQuery(processedQuery);
        logger.debug('Aggregation query executed', { resultCount: results.length });
      } else {
        // Default to standard time-series query
        results = await this.executeTimeSeriesQuery(processedQuery);
        logger.debug('Standard time-series query executed', { resultCount: results.length });
      }
      
      return results;
    } catch (error) {
      logger.error('Error executing time-series query', { 
        error: error instanceof Error ? error.message : String(error),
        query: typeof query === 'object' ? { 
          metrics: query.metrics, 
          dimensions: query.dimensions,
          type: query.type 
        } : 'Invalid query'
      });
      
      throw error;
    }
  }

  /**
   * Retrieve the time-series database schema information, including available
   * metrics, dimensions, and time granularities.
   * 
   * @returns Promise resolving to schema definition object
   * @throws Error if schema retrieval fails
   */
  async getSchema(): Promise<object> {
    try {
      if (!this.connected) {
        await this.connect();
      }

      logger.debug('Retrieving time-series database schema');
      
      // Make API request to get schema information
      const response = await axios.get(`${this.baseUrl}/api/schema`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeoutMs
      });

      // Transform the schema into a standardized format
      const transformedSchema = {
        metrics: this.transformMetrics(response.data.metrics || []),
        dimensions: this.transformDimensions(response.data.dimensions || []),
        timeGranularities: ['hour', 'day', 'week', 'month', 'quarter', 'year'],
        sources: response.data.sources || []
      };

      logger.debug('Time-series schema retrieved successfully', {
        metricCount: transformedSchema.metrics.length,
        dimensionCount: transformedSchema.dimensions.length
      });
      
      return transformedSchema;
    } catch (error) {
      logger.error('Error retrieving time-series schema', { 
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Failed to retrieve time-series schema: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Test if the time-series database connection is working properly
   * 
   * @returns Promise resolving to boolean indicating connection status
   */
  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing time-series database connection');
      
      await this.connect();
      
      // Simple query to verify connection
      const healthResponse = await axios.get(`${this.baseUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeoutMs
      });

      const isConnected = healthResponse.status === 200;
      logger.info('Time-series connection test', { 
        success: isConnected, 
        status: healthResponse.status 
      });
      
      return isConnected;
    } catch (error) {
      logger.error('Time-series connection test failed', { 
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Establish a connection to the time-series database
   * 
   * @throws Error if connection fails
   */
  async connect(): Promise<void> {
    if (this.connected) {
      logger.debug('Already connected to time-series database');
      return;
    }

    logger.debug('Connecting to time-series database', { url: this.baseUrl });

    if (!this.baseUrl) {
      const error = new Error('Time-series database URL not configured');
      logger.error('Connection error', { error: error.message });
      throw error;
    }

    if (!this.apiKey) {
      logger.warn('No API key provided for time-series database');
    }

    try {
      // Verify connection by making a simple request
      const response = await axios.get(`${this.baseUrl}/ping`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeoutMs
      });

      if (response.status === 200) {
        this.connected = true;
        logger.info('Connected to time-series database successfully');
      } else {
        throw new Error(`Failed to connect to time-series database: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Failed to connect to time-series database', { 
        error: error instanceof Error ? error.message : String(error),
        url: this.baseUrl
      });
      throw new Error(`Failed to connect to time-series database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Process a time-series query specification, replacing parameter references
   * and preparing it for execution.
   * 
   * @param query - The query specification to process
   * @param parameters - Parameters to apply to the query
   * @returns Processed query with parameters applied
   */
  private processQuery(query: any, parameters: any): any {
    // Clone the query to avoid modifying the original
    const processedQuery = JSON.parse(JSON.stringify(query));
    
    logger.debug('Processing time-series query', { 
      original: {
        metrics: query.metrics, 
        dimensions: query.dimensions
      }
    });
    
    // Replace parameter references in the query
    const result = this.replaceParameters(processedQuery, parameters || {});
    
    // Ensure the query has the required properties
    if (!result.metrics && !result.measure) {
      logger.warn('Query is missing metrics or measure property', { query: result });
    }
    
    return result;
  }

  /**
   * Execute a time-series specific query through the API
   * 
   * @param queryConfig - The processed query configuration
   * @returns Promise resolving to time-series query results
   * @throws Error if query execution fails
   */
  private async executeTimeSeriesQuery(queryConfig: any): Promise<any[]> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/query`, queryConfig, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeoutMs
      });

      // Format the results into a standardized structure
      return this.formatResults(response.data.results || [], 'standard');
    } catch (error) {
      logger.error('Error executing time-series query', { 
        error: error instanceof Error ? error.message : String(error),
        queryConfig: {
          metrics: queryConfig.metrics,
          dimensions: queryConfig.dimensions,
          timeRange: queryConfig.timeRange
        }
      });
      
      // Check for specific error types for more helpful error messages
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
          throw new Error('Authentication failed for time-series database');
        } else if (error.response.status === 400) {
          throw new Error(`Invalid query: ${error.response.data?.error || 'Unknown error'}`);
        } else if (error.response.status === 429) {
          throw new Error('Rate limit exceeded for time-series database');
        } else if (error.response.status >= 500) {
          throw new Error(`Time-series database server error: ${error.response.status}`);
        }
      } else if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        throw new Error(`Time-series query timed out after ${this.timeoutMs}ms`);
      }
      
      throw new Error(`Time-series query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a time-aggregated query to get summary metrics
   * 
   * @param queryConfig - The processed query configuration
   * @returns Promise resolving to aggregated metrics results
   * @throws Error if query execution fails
   */
  private async executeAggregationQuery(queryConfig: any): Promise<any[]> {
    // Prepare the aggregation-specific query configuration
    const aggConfig = {
      ...queryConfig,
      aggregations: queryConfig.aggregations || [
        { type: 'sum', field: queryConfig.metrics?.[0] || queryConfig.measure },
        { type: 'avg', field: queryConfig.metrics?.[0] || queryConfig.measure },
        { type: 'min', field: queryConfig.metrics?.[0] || queryConfig.measure },
        { type: 'max', field: queryConfig.metrics?.[0] || queryConfig.measure }
      ]
    };

    try {
      const response = await axios.post(`${this.baseUrl}/api/aggregate`, aggConfig, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeoutMs
      });

      // Format the results into a standardized structure
      return this.formatResults(response.data.results || [], 'aggregation');
    } catch (error) {
      logger.error('Error executing aggregation query', { 
        error: error instanceof Error ? error.message : String(error),
        queryConfig: {
          metrics: aggConfig.metrics,
          aggregations: aggConfig.aggregations
        }
      });
      
      throw new Error(`Aggregation query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a trend analysis query that returns time-bucketed data
   * 
   * @param queryConfig - The processed query configuration
   * @returns Promise resolving to time-series trend data
   * @throws Error if query execution fails
   */
  private async executeTrendQuery(queryConfig: any): Promise<any[]> {
    // Prepare the trend-specific query configuration
    const trendConfig = {
      ...queryConfig,
      groupBy: [
        ...(queryConfig.groupBy || []),
        {
          type: 'time',
          granularity: queryConfig.granularity || 'day',
          fillPolicy: queryConfig.fillPolicy || 'zero'
        }
      ]
    };

    try {
      const response = await axios.post(`${this.baseUrl}/api/trends`, trendConfig, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeoutMs
      });

      // Format the results into a standardized structure
      return this.formatResults(response.data.results || [], 'trend');
    } catch (error) {
      logger.error('Error executing trend query', { 
        error: error instanceof Error ? error.message : String(error),
        queryConfig: {
          metrics: trendConfig.metrics,
          granularity: trendConfig.groupBy.find((g: any) => g.type === 'time')?.granularity
        }
      });
      
      throw new Error(`Trend query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Format time-series query results into a standardized structure
   * 
   * @param results - Raw results from the time-series database
   * @param queryType - Type of query that was executed
   * @returns Standardized result objects
   */
  private formatResults(results: any[], queryType: string): any[] {
    if (!results || !Array.isArray(results)) {
      return [];
    }

    logger.debug('Formatting query results', { 
      count: results.length, 
      queryType 
    });

    // Process results based on query type
    switch (queryType) {
      case 'aggregation':
        // Format aggregation results
        return results.map(result => {
          const formatted: any = {};
          Object.keys(result).forEach(key => {
            // Remove database-specific prefixes
            const cleanKey = key.replace(/^agg_/, '').replace(/^aggr_/, '');
            formatted[cleanKey] = result[key];
          });
          return formatted;
        });

      case 'trend':
        // Format trend results with standardized timestamps
        return results.map(result => {
          return {
            timestamp: result.time ? dayjs(result.time).toISOString() : null,
            ...Object.keys(result)
              .filter(key => key !== 'time')
              .reduce((obj, key) => {
                obj[key] = result[key];
                return obj;
              }, {} as any)
          };
        });

      case 'standard':
      default:
        // Format standard query results
        return results.map(result => {
          // Convert timestamps to ISO string format
          if (result.timestamp || result.time) {
            result.timestamp = dayjs(result.timestamp || result.time).toISOString();
            
            // Remove duplicate time field if present
            if (result.time && result.timestamp) {
              delete result.time;
            }
          }
          return result;
        });
    }
  }

  /**
   * Transform raw metrics data into a standardized format
   * 
   * @param rawMetrics - Raw metrics from the database
   * @returns Standardized metrics array
   */
  private transformMetrics(rawMetrics: any[]): any[] {
    return rawMetrics.map(metric => ({
      name: metric.name,
      displayName: metric.displayName || metric.name,
      description: metric.description || '',
      dataType: metric.type || 'number',
      category: metric.category || 'unknown',
      aggregations: metric.supportedAggregations || ['sum', 'avg', 'min', 'max']
    }));
  }

  /**
   * Transform raw dimensions data into a standardized format
   * 
   * @param rawDimensions - Raw dimensions from the database
   * @returns Standardized dimensions array
   */
  private transformDimensions(rawDimensions: any[]): any[] {
    return rawDimensions.map(dimension => ({
      name: dimension.name,
      displayName: dimension.displayName || dimension.name,
      description: dimension.description || '',
      dataType: dimension.type || 'string',
      cardinality: dimension.cardinality || 'high'
    }));
  }

  /**
   * Replace parameter placeholders in a query object with actual values
   * 
   * @param value - The value to process for parameter replacement
   * @param parameters - Parameter values to substitute
   * @returns Value with parameters replaced
   */
  private replaceParameters(value: any, parameters: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    // Handle different types
    if (typeof value === 'string') {
      // Replace {{paramName}} with parameter values
      return value.replace(/\{\{([^}]+)\}\}/g, (match, paramName) => {
        // Handle nested parameter paths with dot notation
        const paramPath = paramName.trim().split('.');
        let paramValue = parameters;
        
        for (const part of paramPath) {
          if (paramValue && typeof paramValue === 'object' && part in paramValue) {
            paramValue = paramValue[part];
          } else {
            // Parameter not found, return the original placeholder
            logger.debug('Parameter not found in template', { paramName });
            return match;
          }
        }

        // Special handling for dates
        if (paramName.toLowerCase().includes('date') || 
            paramName.toLowerCase().includes('time') ||
            paramName.toLowerCase().includes('start') ||
            paramName.toLowerCase().includes('end')) {
          if (typeof paramValue === 'string' || paramValue instanceof Date) {
            return dayjs(paramValue).toISOString();
          }
        }

        // Convert arrays to JSON strings if needed
        if (Array.isArray(paramValue)) {
          return JSON.stringify(paramValue);
        }

        // Convert objects to JSON strings if needed
        if (typeof paramValue === 'object' && paramValue !== null) {
          return JSON.stringify(paramValue);
        }

        return paramValue !== undefined ? String(paramValue) : match;
      });
    } else if (Array.isArray(value)) {
      // Process each element in the array
      return value.map(item => this.replaceParameters(item, parameters));
    } else if (typeof value === 'object') {
      // Process each property in the object
      const result: { [key: string]: any } = {};
      Object.keys(value).forEach(key => {
        result[key] = this.replaceParameters(value[key], parameters);
      });
      return result;
    }

    // Return primitive values as is
    return value;
  }
}

// Export the TimeSeriesConnector implementation for time-based analytics
export default TimeSeriesConnector;