import ExcelJS from 'exceljs'; // ^4.3.0
import { formatCurrency } from '../../../common/utils/currency-utils';
import { formatDate } from '../../../common/utils/date-utils';
import { logger } from '../../../common/utils/logger';
import { UnsupportedExportFormatError } from '../../../common/errors';

/**
 * Options for Excel export functionality
 */
interface ExcelExportOptions {
  /**
   * Headers to use for the Excel export. If not provided, they will be extracted from the data.
   */
  headers?: string[];
  
  /**
   * Custom formatters for specific fields
   */
  formatters?: Record<string, (value: any) => any>;
  
  /**
   * Name of the report to use as worksheet name
   */
  reportName?: string;
  
  /**
   * Custom filename for the exported Excel file (without extension)
   */
  filename?: string;
}

/**
 * Exports data to Excel format, returning a buffer that can be sent to the client
 * 
 * @param data Array of data records to export
 * @param options Excel export options
 * @returns Buffer containing the Excel file
 */
export async function exportToExcel(
  data: Array<Record<string, any>>,
  options: ExcelExportOptions = {}
): Promise<Buffer> {
  // Validate input
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Export data must be a non-empty array');
  }

  // Extract headers from data if not provided
  const headers = options.headers || getHeadersFromData(data);

  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Brik Refund Service';
  workbook.lastModifiedBy = 'Brik Refund Service';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Add a worksheet
  const worksheetName = options.reportName || 'Refund Report';
  const worksheet = workbook.addWorksheet(worksheetName);

  // Add header row with formatting
  const headerRow = worksheet.addRow(headers.map(header => formatHeaderForExcel(header)));
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' } // Light gray background
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Define custom formatters
  const formatters = options.formatters || {};

  // Add data rows
  data.forEach(item => {
    const rowData = headers.map(header => formatCellValue(item[header], header, formatters));
    worksheet.addRow(rowData);
  });

  // Auto-fit columns based on content
  worksheet.columns.forEach((column, index) => {
    const maxLength = [
      formatHeaderForExcel(headers[index]).length,
      ...data.map(item => {
        const value = item[headers[index]];
        const formattedValue = formatCellValue(value, headers[index], formatters);
        return typeof formattedValue === 'string' ? formattedValue.length : 10;
      })
    ].reduce((max, length) => Math.max(max, length), 0);

    // Set column width with some padding
    column.width = Math.min(Math.max(maxLength + 2, 10), 50);
  });

  // Generate Excel file as buffer
  return await workbook.xlsx.writeBuffer();
}

/**
 * Formats a header string for Excel display by converting from
 * camelCase or snake_case to Title Case
 * 
 * @param header Original header string
 * @returns Formatted header for display
 */
function formatHeaderForExcel(header: string): string {
  // Replace underscores with spaces
  let formattedHeader = header.replace(/_/g, ' ');
  
  // Insert space before capital letters in camelCase
  formattedHeader = formattedHeader.replace(/([A-Z])/g, ' $1');
  
  // Trim extra spaces, ensure first letter is capitalized
  formattedHeader = formattedHeader.trim();
  
  // Split into words and capitalize first letter of each word
  return formattedHeader
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Formats a cell value based on its type and field name
 * 
 * @param value Value to format
 * @param fieldName Name of the field (used to detect currency fields)
 * @param formatters Custom formatters map
 * @returns Formatted value for Excel
 */
function formatCellValue(
  value: any,
  fieldName: string,
  formatters: Record<string, (value: any) => any> = {}
): any {
  // Use custom formatter if available
  if (formatters[fieldName] && typeof formatters[fieldName] === 'function') {
    return formatters[fieldName](value);
  }

  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }

  // Handle dates
  if (value instanceof Date) {
    return formatDate(value, 'YYYY-MM-DD HH:mm:ss');
  }

  // Handle money/currency fields
  if (typeof value === 'number' && shouldApplyCurrencyFormat(fieldName)) {
    return formatCurrency(value, 'USD');
  }

  // Handle boolean values
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Handle objects and arrays (convert to JSON)
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }

  // Return as is for simple types
  return value;
}

/**
 * Extracts headers from the first data object
 * 
 * @param data Array of data records
 * @returns Array of header names
 */
function getHeadersFromData(data: Array<Record<string, any>>): string[] {
  if (!data || data.length === 0) {
    throw new Error('Cannot extract headers from empty data');
  }

  return Object.keys(data[0]);
}

/**
 * Determines if a field should be formatted as currency based on name
 * 
 * @param fieldName Field name to check
 * @returns True if field should be formatted as currency
 */
function shouldApplyCurrencyFormat(fieldName: string): boolean {
  const lowerFieldName = fieldName.toLowerCase();
  const currencyKeywords = [
    'amount', 'price', 'cost', 'fee', 'total', 'balance', 'payment',
    'revenue', 'value', 'budget', 'spend', 'charge', 'refund'
  ];
  
  return currencyKeywords.some(keyword => lowerFieldName.includes(keyword));
}

/**
 * Class responsible for Excel export functionality in the reporting engine
 */
export class ExcelExporter {
  /**
   * Exports the provided report data to Excel format
   * 
   * @param data Array of data records to export
   * @param options Excel export options
   * @returns Excel workbook as buffer
   */
  public async export(
    data: Array<Record<string, any>>, 
    options: ExcelExportOptions = {}
  ): Promise<Buffer> {
    try {
      // Validate input
      if (!Array.isArray(data)) {
        throw new Error('Export data must be an array');
      }

      // Apply default options
      const exportOptions: ExcelExportOptions = {
        reportName: 'Refund Report',
        ...options
      };

      // Export data to Excel
      logger.info('Exporting data to Excel format', { 
        recordCount: data.length,
        reportName: exportOptions.reportName
      });
      
      const buffer = await exportToExcel(data, exportOptions);
      
      logger.info('Excel export completed successfully', {
        byteLength: buffer.byteLength
      });
      
      return buffer;
    } catch (error) {
      logger.error('Error exporting to Excel format', { 
        error: (error as Error).message,
        stack: (error as Error).stack 
      });
      throw error;
    }
  }

  /**
   * Returns the content type for Excel exports
   * 
   * @returns Content type for Excel XLSX files
   */
  public getContentType(): string {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }

  /**
   * Returns the file extension for Excel exports
   * 
   * @returns File extension for Excel (.xlsx)
   */
  public getFileExtension(): string {
    return '.xlsx';
  }
}