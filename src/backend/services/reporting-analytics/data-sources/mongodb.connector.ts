import mongoose from 'mongoose'; // mongoose ^6.0.0
import { logger } from '../../../common/utils/logger';
import databaseConfig from '../../../config/database';
import { getConnection } from '../../../database/connection';
import { IReportDefinition } from '../models';

/**
 * MongoDB connector implementation for the Reporting & Analytics Engine
 * Provides standardized interface to execute queries against MongoDB databases,
 * retrieve schema information, and validate connections
 */
class MongoDBConnector {
  private connection: mongoose.Connection | null = null;
  private connected: boolean = false;

  /**
   * Initialize the MongoDB connector
   */
  constructor() {
    this.connection = null;
    this.connected = false;
    logger.info('MongoDB connector initialized for reporting and analytics');
  }

  /**
   * Execute a MongoDB query based on the provided query specification and parameters
   * 
   * @param query - The query specification to execute
   * @param parameters - Parameters to apply to the query
   * @returns Query execution results
   */
  async executeQuery(query: any, parameters: any = {}): Promise<any[]> {
    try {
      if (!query) {
        throw new Error('Query specification is required');
      }

      logger.debug('Executing MongoDB query', { 
        collectionName: query.collection,
        parameters: Object.keys(parameters)
      });

      // Process the query with parameters
      const processedQuery = this.processQuery(query, parameters);
      
      // Connect to MongoDB if not already connected
      await this.connect();
      
      // Extract collection name
      const collectionName = processedQuery.collection;
      if (!collectionName) {
        throw new Error('Collection name is required in the query specification');
      }

      let results;
      
      // Determine the query type and execute accordingly
      if (processedQuery.pipeline) {
        // Aggregation pipeline query
        logger.debug('Executing MongoDB aggregation pipeline', {
          collectionName,
          pipelineStages: processedQuery.pipeline.length
        });
        results = await this.executeAggregation(collectionName, processedQuery.pipeline);
      } else if (processedQuery.filter) {
        // Find query with filter
        logger.debug('Executing MongoDB find query', {
          collectionName,
          hasFilter: true,
          projection: !!processedQuery.projection,
          sort: !!processedQuery.sort,
          limit: processedQuery.limit,
          skip: processedQuery.skip
        });
        results = await this.executeFind(
          collectionName, 
          processedQuery.filter, 
          {
            projection: processedQuery.projection,
            sort: processedQuery.sort,
            limit: processedQuery.limit,
            skip: processedQuery.skip
          }
        );
      } else {
        // Default to find all documents in the collection
        logger.debug('Executing MongoDB find all query', { collectionName });
        results = await this.executeFind(collectionName, {}, {});
      }
      
      // Format results for standardized output
      const formattedResults = this.formatResults(results);
      
      logger.info('MongoDB query executed successfully', { 
        collectionName,
        resultCount: formattedResults.length
      });
      
      return formattedResults;
    } catch (error) {
      logger.error('Error executing MongoDB query', { 
        error,
        query: query?.collection,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Retrieve the MongoDB schema information for available collections
   * 
   * @returns Schema definition of available collections and their fields
   */
  async getSchema(): Promise<object> {
    try {
      logger.debug('Retrieving MongoDB schema information');
      
      // Connect to MongoDB if not already connected
      await this.connect();
      
      if (!this.connection) {
        throw new Error('MongoDB connection is not available');
      }
      
      // Get all collection names from the database
      const collections = await this.connection.db.listCollections().toArray();
      const schema: any = {};
      
      // For each collection, get a sample document to infer the schema
      for (const collection of collections) {
        const collectionName = collection.name;
        
        // Skip system collections
        if (collectionName.startsWith('system.')) {
          continue;
        }
        
        // Get sample documents to infer schema structure
        const sampleDocs = await this.connection.db
          .collection(collectionName)
          .find({})
          .limit(5)
          .toArray();
        
        if (sampleDocs.length > 0) {
          // Create schema structure by analyzing sample documents
          schema[collectionName] = this.inferSchemaFromSamples(sampleDocs);
        } else {
          schema[collectionName] = { fields: [] };
        }
      }
      
      logger.info('Retrieved MongoDB schema information', { 
        collectionCount: Object.keys(schema).length 
      });
      
      return schema;
    } catch (error) {
      logger.error('Error retrieving MongoDB schema', { 
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Test if the MongoDB connection is working properly
   * 
   * @returns True if connection is working, false otherwise
   */
  async testConnection(): Promise<boolean> {
    try {
      logger.debug('Testing MongoDB connection');
      
      // Connect to MongoDB if not already connected
      await this.connect();
      
      if (!this.connection) {
        return false;
      }
      
      // Run a simple admin command to test the connection
      const pingResult = await this.connection.db.admin().ping();
      const isConnected = pingResult.ok === 1;
      
      logger.info('MongoDB connection test completed', { connected: isConnected });
      
      return isConnected;
    } catch (error) {
      logger.error('MongoDB connection test failed', { 
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Establish a connection to MongoDB
   * 
   * @private
   */
  private async connect(): Promise<void> {
    if (this.connected && this.connection) {
      return;
    }
    
    try {
      logger.debug('Establishing MongoDB connection for reporting');
      
      // Get MongoDB connection from the connection manager
      this.connection = await getConnection();
      this.connected = true;
      
      logger.info('MongoDB connection established successfully');
    } catch (error) {
      logger.error('Failed to connect to MongoDB', { 
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      this.connected = false;
      throw error;
    }
  }

  /**
   * Process a MongoDB query specification, replacing parameter references with actual values
   * 
   * @private
   * @param query - Original query specification
   * @param parameters - Parameters to apply to the query
   * @returns Processed query with parameters applied
   */
  private processQuery(query: any, parameters: any): any {
    // Clone the query to avoid modifying the original
    const processedQuery = JSON.parse(JSON.stringify(query));
    
    // Process each part of the query object that might contain parameter references
    if (processedQuery.pipeline) {
      processedQuery.pipeline = this.replaceParameters(processedQuery.pipeline, parameters);
    }
    
    if (processedQuery.filter) {
      processedQuery.filter = this.replaceParameters(processedQuery.filter, parameters);
    }
    
    if (processedQuery.projection) {
      processedQuery.projection = this.replaceParameters(processedQuery.projection, parameters);
    }
    
    if (processedQuery.sort) {
      processedQuery.sort = this.replaceParameters(processedQuery.sort, parameters);
    }
    
    // Handle numeric parameters for limit and skip
    if (processedQuery.limit !== undefined) {
      if (typeof processedQuery.limit === 'string') {
        const limitParam = this.replaceParameters(processedQuery.limit, parameters);
        processedQuery.limit = parseInt(limitParam, 10) || 0;
      } else if (typeof processedQuery.limit === 'number') {
        processedQuery.limit = processedQuery.limit;
      } else {
        processedQuery.limit = 0;
      }
    }
    
    if (processedQuery.skip !== undefined) {
      if (typeof processedQuery.skip === 'string') {
        const skipParam = this.replaceParameters(processedQuery.skip, parameters);
        processedQuery.skip = parseInt(skipParam, 10) || 0;
      } else if (typeof processedQuery.skip === 'number') {
        processedQuery.skip = processedQuery.skip;
      } else {
        processedQuery.skip = 0;
      }
    }
    
    return processedQuery;
  }

  /**
   * Execute a MongoDB aggregation pipeline query
   * 
   * @private
   * @param collectionName - Name of the collection to query
   * @param pipeline - Aggregation pipeline stages
   * @returns Aggregation results
   */
  private async executeAggregation(collectionName: string, pipeline: any[]): Promise<any[]> {
    try {
      if (!this.connection) {
        await this.connect();
      }
      
      if (!this.connection) {
        throw new Error('MongoDB connection is not available');
      }
      
      const collection = this.connection.db.collection(collectionName);
      
      // Execute the aggregation pipeline
      const cursor = collection.aggregate(pipeline);
      
      // Convert cursor to array of documents
      const results = await cursor.toArray();
      
      return results;
    } catch (error) {
      logger.error('Error executing MongoDB aggregation', {
        collectionName,
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Execute a MongoDB find query with filters
   * 
   * @private
   * @param collectionName - Name of the collection to query
   * @param filter - Query filter conditions
   * @param options - Query options (projection, sort, limit, skip)
   * @returns Query results
   */
  private async executeFind(
    collectionName: string, 
    filter: any, 
    options: { projection?: any; sort?: any; limit?: number; skip?: number }
  ): Promise<any[]> {
    try {
      if (!this.connection) {
        await this.connect();
      }
      
      if (!this.connection) {
        throw new Error('MongoDB connection is not available');
      }
      
      const collection = this.connection.db.collection(collectionName);
      
      // Build the find query with options
      let query = collection.find(filter);
      
      if (options.projection) {
        query = query.project(options.projection);
      }
      
      if (options.sort) {
        query = query.sort(options.sort);
      }
      
      if (options.limit && options.limit > 0) {
        query = query.limit(options.limit);
      }
      
      if (options.skip && options.skip > 0) {
        query = query.skip(options.skip);
      }
      
      // Execute the query and convert cursor to array
      const results = await query.toArray();
      
      return results;
    } catch (error) {
      logger.error('Error executing MongoDB find query', {
        collectionName,
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Format MongoDB query results into a standardized structure
   * 
   * @private
   * @param results - Raw MongoDB query results
   * @returns Standardized result objects
   */
  private formatResults(results: any[]): any[] {
    return results.map(result => {
      const formatted: any = {};
      
      // Process each field in the result
      Object.keys(result).forEach(key => {
        // Skip MongoDB internal fields if needed
        if (key === '_id') {
          // Convert ObjectId to string
          formatted.id = result._id.toString();
        } else if (key !== '__v') {
          const value = result[key];
          
          // Format dates as ISO strings
          if (value instanceof Date) {
            formatted[key] = value.toISOString();
          } 
          // Convert ObjectId to string
          else if (value && typeof value === 'object' && value._bsontype === 'ObjectID') {
            formatted[key] = value.toString();
          }
          // Process arrays recursively
          else if (Array.isArray(value)) {
            formatted[key] = this.formatArrayValues(value);
          }
          // Process nested objects recursively
          else if (value && typeof value === 'object' && !Array.isArray(value)) {
            formatted[key] = this.formatNestedObject(value);
          } 
          // Use value as is for primitive types
          else {
            formatted[key] = value;
          }
        }
      });
      
      return formatted;
    });
  }

  /**
   * Format array values, handling nested objects and special types
   * 
   * @private
   * @param array - Array of values to format
   * @returns Formatted array
   */
  private formatArrayValues(array: any[]): any[] {
    return array.map(item => {
      // Format dates as ISO strings
      if (item instanceof Date) {
        return item.toISOString();
      }
      // Convert ObjectId to string
      else if (item && typeof item === 'object' && item._bsontype === 'ObjectID') {
        return item.toString();
      }
      // Process nested arrays recursively
      else if (Array.isArray(item)) {
        return this.formatArrayValues(item);
      }
      // Process nested objects recursively
      else if (item && typeof item === 'object') {
        return this.formatNestedObject(item);
      }
      // Use value as is for primitive types
      else {
        return item;
      }
    });
  }

  /**
   * Format nested objects, handling special types
   * 
   * @private
   * @param obj - Object to format
   * @returns Formatted object
   */
  private formatNestedObject(obj: any): any {
    const formatted: any = {};
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      
      // Format dates as ISO strings
      if (value instanceof Date) {
        formatted[key] = value.toISOString();
      }
      // Convert ObjectId to string
      else if (value && typeof value === 'object' && value._bsontype === 'ObjectID') {
        formatted[key] = value.toString();
      }
      // Process nested arrays recursively
      else if (Array.isArray(value)) {
        formatted[key] = this.formatArrayValues(value);
      }
      // Process nested objects recursively
      else if (value && typeof value === 'object') {
        formatted[key] = this.formatNestedObject(value);
      }
      // Use value as is for primitive types
      else {
        formatted[key] = value;
      }
    });
    
    return formatted;
  }

  /**
   * Replace parameter placeholders in a query object with actual values
   * 
   * @private
   * @param value - Value containing parameter placeholders
   * @param parameters - Parameters to replace placeholders with
   * @returns Value with parameters replaced
   */
  private replaceParameters(value: any, parameters: any): any {
    // Handle different value types
    if (typeof value === 'string') {
      // Replace {{paramName}} pattern with parameter values
      return value.replace(/\{\{\s*([^{}]+)\s*\}\}/g, (match, paramName) => {
        const trimmedParamName = paramName.trim();
        if (parameters[trimmedParamName] !== undefined) {
          // Return parameter value as is - conversion happens later if needed
          return parameters[trimmedParamName];
        }
        // Keep original placeholder if parameter not found
        return match;
      });
    } 
    else if (Array.isArray(value)) {
      // Process each array element recursively
      return value.map(item => this.replaceParameters(item, parameters));
    } 
    else if (value && typeof value === 'object') {
      // Process each object property recursively
      const result: any = {};
      
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          // Check if it's a MongoDB operator key
          if (key.startsWith('$')) {
            // Handle operators specially
            result[key] = this.replaceParameters(value[key], parameters);
            
            // Apply type conversion for operator values if needed
            if (typeof result[key] === 'string') {
              result[key] = this.convertParameterValue(result[key]);
            }
          } else {
            // Regular object property
            result[key] = this.replaceParameters(value[key], parameters);
          }
        }
      }
      
      return result;
    } 
    else {
      // Return primitives as is
      return value;
    }
  }

  /**
   * Convert parameter value to appropriate type based on content
   * 
   * @private
   * @param value - Value to convert
   * @returns Converted value
   */
  private convertParameterValue(value: any): any {
    if (typeof value !== 'string') {
      return value;
    }
    
    // Try to convert to number if it looks like one
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return parseFloat(value);
    }
    
    // Try to convert to boolean if it's 'true' or 'false'
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // Try to convert to Date if it looks like an ISO date
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(value)) {
      return new Date(value);
    }
    
    // Try to convert to ObjectId if it looks like one
    if (/^[0-9a-fA-F]{24}$/.test(value)) {
      try {
        return new mongoose.Types.ObjectId(value);
      } catch (e) {
        // If it's not a valid ObjectId, return as string
        return value;
      }
    }
    
    // Return as string if no conversion applies
    return value;
  }

  /**
   * Infer schema structure from sample documents
   * 
   * @private
   * @param samples - Sample documents to analyze
   * @returns Inferred schema structure
   */
  private inferSchemaFromSamples(samples: any[]): any {
    const fields: any[] = [];
    const fieldTypes: Record<string, Set<string>> = {};
    
    // Analyze each sample document
    samples.forEach(sample => {
      this.extractFieldsFromDocument('', sample, fieldTypes);
    });
    
    // Convert field types to schema structure
    for (const [path, types] of Object.entries(fieldTypes)) {
      fields.push({
        path,
        types: Array.from(types)
      });
    }
    
    return { fields };
  }

  /**
   * Extract fields and their types from document for schema inference
   * 
   * @private
   * @param prefix - Field path prefix for nested fields
   * @param document - Document to analyze
   * @param fieldTypes - Accumulator for field types
   */
  private extractFieldsFromDocument(
    prefix: string, 
    document: any, 
    fieldTypes: Record<string, Set<string>>
  ): void {
    for (const key in document) {
      if (Object.prototype.hasOwnProperty.call(document, key)) {
        const value = document[key];
        const path = prefix ? `${prefix}.${key}` : key;
        
        // Get type of the field
        let type;
        if (value === null) {
          type = 'null';
        } else if (Array.isArray(value)) {
          type = 'array';
          
          // Analyze array elements if not empty
          if (value.length > 0) {
            const elementType = typeof value[0];
            if (elementType === 'object' && value[0] !== null) {
              // For object elements, recursively extract fields
              this.extractFieldsFromDocument(`${path}[]`, value[0], fieldTypes);
            }
          }
        } else if (value instanceof Date) {
          type = 'date';
        } else if (typeof value === 'object' && value._bsontype === 'ObjectID') {
          type = 'objectId';
        } else if (typeof value === 'object') {
          type = 'object';
          // Recursively extract fields from nested object
          this.extractFieldsFromDocument(path, value, fieldTypes);
        } else {
          type = typeof value;
        }
        
        // Add or update field type
        if (!fieldTypes[path]) {
          fieldTypes[path] = new Set();
        }
        fieldTypes[path].add(type);
      }
    }
  }
}

export { MongoDBConnector };
export default MongoDBConnector;