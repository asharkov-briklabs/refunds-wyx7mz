import { createObjectCsvStringifier } from 'csv-writer'; // version: ^1.6.0
import { Transform } from 'stream';
import { formatDate } from '../../common/utils/date-utils';
import { formatCurrency } from '../../common/utils/currency-utils';
import { logger } from '../../common/utils/logger';
import { UnsupportedExportFormatError } from '../../common/errors';

/**
 * Configuration options for CSV exports
 */
export interface CSVExportOptions {
  /**
   * Optional array of column headers for the CSV
   */
  headers?: string[];
  
  /**
   * Character to use as field delimiter, defaults to comma
   */
  delimiter?: string;
  
  /**
   * Whether to include header row in output, defaults to true
   */
  includeHeaders?: boolean;
  
  /**
   * Custom field formatters for specific columns
   */
  formatters?: Record<string, (value: any) => string>;
  
  /**
   * Optional filename for the exported CSV
   */
  fileName?: string;
}

/**
 * Converts report data to CSV format as a string
 * 
 * @param data - Array of objects to convert to CSV
 * @param options - Configuration options for the CSV export
 * @returns CSV formatted string
 */
export async function exportToCSV(data: Array<Record<string, any>>, options: CSVExportOptions = {}): Promise<string> {
  // Validate input data
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  // Default options
  const delimiter = options.delimiter || ',';
  const includeHeaders = options.includeHeaders !== false;
  
  // Get headers from data if not provided
  const headers = options.headers || getHeadersFromData(data);
  
  // Prepare header objects for csv-writer
  const headerObjects = headers.map(header => ({
    id: header,
    title: formatHeaderForCSV(header)
  }));
  
  // Create CSV stringifier
  const csvStringifier = createObjectCsvStringifier({
    header: headerObjects,
    fieldDelimiter: delimiter,
    headerIdToStringifier: (value) => String(value ?? '')
  });
  
  // Process data to handle special formats (dates, currencies, etc.)
  const processedData = data.map(item => {
    const processedItem: Record<string, string> = {};
    
    headers.forEach(header => {
      processedItem[header] = formatCellValue(
        item[header], 
        header, 
        options.formatters || {}
      );
    });
    
    return processedItem;
  });
  
  // Generate CSV
  let csvContent = '';
  if (includeHeaders) {
    csvContent += csvStringifier.getHeaderString();
  }
  csvContent += csvStringifier.stringifyRecords(processedData);
  
  return csvContent;
}

/**
 * Creates a transform stream for converting data objects to CSV format
 * 
 * @param options - Configuration options for the CSV export
 * @param headers - Array of headers to include in the CSV
 * @returns Stream transform that converts objects to CSV rows
 */
function createCSVTransformStream(options: CSVExportOptions, headers: string[]): Transform {
  const delimiter = options.delimiter || ',';
  const includeHeaders = options.includeHeaders !== false;
  
  // Create CSV stringifier
  const csvStringifier = createObjectCsvStringifier({
    header: headers.map(header => ({
      id: header,
      title: formatHeaderForCSV(header)
    })),
    fieldDelimiter: delimiter,
    headerIdToStringifier: (value) => String(value ?? '')
  });
  
  // Keep track of if this is the first chunk (for headers)
  let isFirstChunk = true;
  
  // Create transform stream
  const transformStream = new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      try {
        // Write headers on first chunk if includeHeaders is true
        if (isFirstChunk && includeHeaders) {
          this.push(csvStringifier.getHeaderString());
          isFirstChunk = false;
        }
        
        // Process the data object
        const processedItem: Record<string, string> = {};
        
        headers.forEach(header => {
          processedItem[header] = formatCellValue(
            chunk[header],
            header,
            options.formatters || {}
          );
        });
        
        // Convert to CSV and push to stream
        const csvRow = csvStringifier.stringifyRecords([processedItem]);
        this.push(csvRow);
        callback();
      } catch (error) {
        logger.error('Error in CSV transform stream', { error });
        callback(error as Error);
      }
    }
  });
  
  return transformStream;
}

/**
 * Extracts headers from the first data object if not explicitly provided
 * 
 * @param data - Array of data objects
 * @returns Array of header names
 */
function getHeadersFromData(data: Array<Record<string, any>>): string[] {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }
  
  // Get keys from the first object in the array
  return Object.keys(data[0]);
}

/**
 * Formats header string for CSV display by converting to title case
 * 
 * @param header - Original header string
 * @returns Formatted header text
 */
function formatHeaderForCSV(header: string): string {
  // Convert camelCase or snake_case to spaces
  const spacedHeader = header
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/_/g, ' ') // Replace underscores with spaces
    .trim();
  
  // Capitalize first letter of each word
  return spacedHeader
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formats cell value based on its data type for CSV display
 * 
 * @param value - Value to format
 * @param fieldName - Name of the field
 * @param formatters - Custom formatters for specific fields
 * @returns Formatted value as string
 */
function formatCellValue(
  value: any,
  fieldName: string,
  formatters: Record<string, (value: any) => string>
): string {
  // If we have a custom formatter for this field, use it
  if (formatters[fieldName] && typeof formatters[fieldName] === 'function') {
    return formatters[fieldName](value);
  }
  
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }
  
  // Handle Date objects
  if (value instanceof Date) {
    return formatDate(value, 'YYYY-MM-DD HH:mm:ss');
  }
  
  // Handle ISO date strings
  if (typeof value === 'string' && 
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(value)) {
    return formatDate(value, 'YYYY-MM-DD HH:mm:ss');
  }
  
  // Handle currency fields (check by field name)
  if ((typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) && 
      (fieldName.includes('amount') || 
       fieldName.includes('price') || 
       fieldName.includes('cost') || 
       fieldName.includes('total') || 
       fieldName.includes('balance'))) {
    return formatCurrency(Number(value));
  }
  
  // Handle arrays and objects
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  // Handle boolean values
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  // Handle other types
  return String(value);
}

/**
 * Class responsible for CSV export functionality in the reporting engine
 */
export class CSVExporter {
  /**
   * Exports the provided report data to CSV format
   * 
   * @param data - Array of data objects to export
   * @param options - Configuration options for the CSV export
   * @returns CSV formatted data
   */
  public async export(
    data: Array<Record<string, any>>, 
    options: CSVExportOptions = {}
  ): Promise<string> {
    try {
      logger.info('Exporting data to CSV format', { 
        rowCount: data.length,
        options: {
          ...options,
          includeHeaders: options.includeHeaders !== false,
          delimiter: options.delimiter || ','
        }
      });
      
      // Validate data
      if (!Array.isArray(data)) {
        throw new Error('Data must be an array');
      }
      
      // Export to CSV
      const result = await exportToCSV(data, options);
      
      logger.info('CSV export completed successfully', { 
        rowCount: data.length,
        byteSize: result.length
      });
      
      return result;
    } catch (error) {
      logger.error('Error exporting data to CSV', { error });
      throw error;
    }
  }
  
  /**
   * Creates a transform stream for converting data to CSV
   * 
   * @param options - Configuration options for the CSV export
   * @param headers - Array of headers to include in the CSV
   * @returns Transform stream for CSV conversion
   */
  public exportStream(
    options: CSVExportOptions = {}, 
    headers: string[]
  ): Transform {
    if (!headers || headers.length === 0) {
      throw new Error('Headers are required for CSV stream export');
    }
    
    return createCSVTransformStream(options, headers);
  }
  
  /**
   * Returns the content type for CSV exports
   * 
   * @returns Content type for CSV (text/csv)
   */
  public getContentType(): string {
    return 'text/csv';
  }
  
  /**
   * Returns the file extension for CSV exports
   * 
   * @returns File extension for CSV (.csv)
   */
  public getFileExtension(): string {
    return '.csv';
  }
}