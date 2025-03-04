import PDFDocument from 'pdfkit'; // version: ^2.0.0
import { Buffer } from 'buffer';
import { Stream } from 'stream';

import { formatCurrency } from '../../../common/utils/currency-utils';
import { formatDate } from '../../../common/utils/date-utils';
import { logger } from '../../../common/utils/logger';
import { UnsupportedExportFormatError } from '../../../common/errors';

/**
 * Options for PDF export
 */
export interface PDFExportOptions {
  title: string;
  headers?: string[];
  pageSize?: string;
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  formatters?: Record<string, (value: any) => string>;
  logoPath?: string;
  includeTimestamp?: boolean;
  tableOptions?: PDFTableOptions;
}

/**
 * Options for table rendering in PDF
 */
export interface PDFTableOptions {
  headerBackground?: string;
  headerTextColor?: string;
  alternateRowColors?: boolean;
  evenRowColor?: string;
  oddRowColor?: string;
  drawRowLines?: boolean;
  lineColor?: string;
}

/**
 * Class responsible for PDF export functionality in the reporting engine
 */
export class PDFExporter {
  /**
   * Exports the provided report data to PDF format
   * 
   * @param data - Array of data objects to export
   * @param options - Configuration options for the PDF export
   * @returns PDF document as buffer
   */
  async export(data: Array<Record<string, any>>, options: PDFExportOptions): Promise<Buffer> {
    try {
      logger.info('Starting PDF export', { recordCount: data?.length });
      
      // Validate input data
      if (!Array.isArray(data)) {
        throw new Error('Data must be an array');
      }
      
      // Apply default options if not provided
      const defaultOptions: Partial<PDFExportOptions> = {
        title: 'Report',
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 50, right: 40, bottom: 50, left: 40 },
        includeTimestamp: true,
        tableOptions: {
          headerBackground: '#f0f0f0',
          headerTextColor: '#000000',
          alternateRowColors: true,
          evenRowColor: '#ffffff',
          oddRowColor: '#f9f9f9',
          drawRowLines: true,
          lineColor: '#e0e0e0'
        }
      };
      
      const mergedOptions: PDFExportOptions = { ...defaultOptions, ...options };
      
      // Generate the PDF
      const pdfBuffer = await exportToPDF(data, mergedOptions);
      
      logger.info('PDF export completed successfully', { recordCount: data?.length });
      
      return pdfBuffer;
    } catch (error) {
      logger.error('Error exporting to PDF', { error });
      throw error;
    }
  }
  
  /**
   * Returns the content type for PDF exports
   * 
   * @returns Content type for PDF (application/pdf)
   */
  getContentType(): string {
    return 'application/pdf';
  }
  
  /**
   * Returns the file extension for PDF exports
   * 
   * @returns File extension for PDF (.pdf)
   */
  getFileExtension(): string {
    return '.pdf';
  }
}

/**
 * Exports report data to PDF format as a buffer
 * 
 * @param data - Array of data objects to include in the PDF
 * @param options - Configuration options for the PDF
 * @returns PDF document as buffer
 */
export async function exportToPDF(
  data: Array<Record<string, any>>, 
  options: PDFExportOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Validate input data
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Export data must be a non-empty array');
      }
      
      // Get headers from data if not provided in options
      const headers = options.headers || getHeadersFromData(data);
      
      // Create a new PDF document
      const doc = new PDFDocument({
        size: options.pageSize || 'A4',
        layout: options.orientation || 'portrait',
        margins: options.margins || { top: 50, right: 40, bottom: 50, left: 40 },
        bufferPages: true
      });
      
      // Create a buffer to store the PDF
      const chunks: Buffer[] = [];
      const stream = doc.pipe({
        write: (chunk: Buffer) => {
          chunks.push(chunk);
        },
        end: () => {
          const result = Buffer.concat(chunks);
          resolve(result);
        },
        on: (_event: string, _listener: any) => {},
        once: (_event: string, _listener: any) => {},
        emit: (_event: string, _arg: any) => false
      } as unknown as Stream);
      
      // Set metadata
      doc.info.Title = options.title;
      doc.info.Creator = 'Brik Refunds Service';
      doc.info.Producer = 'PDFKit';
      
      // Add title
      doc.fontSize(18).text(options.title, { align: 'center' });
      doc.moveDown();
      
      // Add logo if provided
      if (options.logoPath) {
        try {
          doc.image(options.logoPath, {
            fit: [100, 100],
            align: 'right'
          });
          doc.moveDown();
        } catch (error) {
          logger.warn('Failed to add logo to PDF', { logoPath: options.logoPath, error });
        }
      }
      
      // Add timestamp if enabled
      if (options.includeTimestamp !== false) {
        const timestamp = formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss');
        doc.fontSize(10).text(`Generated: ${timestamp}`, { align: 'right' });
        doc.moveDown();
      }
      
      // Draw table with data
      const tableOptions = options.tableOptions || {
        headerBackground: '#f0f0f0',
        headerTextColor: '#000000',
        alternateRowColors: true,
        evenRowColor: '#ffffff',
        oddRowColor: '#f9f9f9',
        drawRowLines: true,
        lineColor: '#e0e0e0'
      };
      
      drawTable(doc, data, headers, tableOptions);
      
      // Add page numbers to all pages
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8);
        doc.text(
          `Page ${i + 1} of ${pageCount}`,
          0,
          doc.page.height - 20,
          { align: 'center' }
        );
      }
      
      // Finalize the PDF
      doc.end();
    } catch (error) {
      logger.error('Error generating PDF', { error });
      reject(error);
    }
  });
}

/**
 * Formats header string for PDF display by converting to title case
 * 
 * @param header - Header name to format
 * @returns Formatted header text
 */
function formatHeaderForPDF(header: string): string {
  // Convert camelCase or snake_case to space-separated words
  let formattedHeader = header
    .replace(/([A-Z])/g, ' $1') // Convert camelCase to space-separated
    .replace(/_/g, ' ') // Convert snake_case to space-separated
    .trim();
  
  // Capitalize first letter of each word
  formattedHeader = formattedHeader
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return formattedHeader;
}

/**
 * Formats cell value based on its data type for PDF display
 * 
 * @param value - Value to format
 * @param fieldName - Field name for context-aware formatting
 * @param formatters - Custom formatters for specific fields
 * @returns Formatted value as string
 */
function formatCellValue(
  value: any, 
  fieldName: string, 
  formatters?: Record<string, (value: any) => any>
): string {
  // Use custom formatter if available
  if (formatters && formatters[fieldName]) {
    return formatters[fieldName](value);
  }
  
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }
  
  // Format based on data type
  if (value instanceof Date) {
    return formatDate(value, 'YYYY-MM-DD');
  }
  
  // Format currency fields
  if (shouldApplyCurrencyFormat(fieldName) && typeof value === 'number') {
    return formatCurrency(value);
  }
  
  // Format booleans
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  // Format objects and arrays
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  // Return string representation for everything else
  return String(value);
}

/**
 * Extracts headers from the first data object if not explicitly provided
 * 
 * @param data - Array of data objects
 * @returns Array of header names
 */
function getHeadersFromData(data: Array<Record<string, any>>): string[] {
  if (!data || !data.length || !data[0]) {
    return [];
  }
  
  return Object.keys(data[0]);
}

/**
 * Determines if a field should be formatted as currency based on its name
 * 
 * @param fieldName - Field name to check
 * @returns True if field should have currency formatting
 */
function shouldApplyCurrencyFormat(fieldName: string): boolean {
  const lowerFieldName = fieldName.toLowerCase();
  
  // Check for common currency field names
  return (
    lowerFieldName.includes('amount') ||
    lowerFieldName.includes('price') ||
    lowerFieldName.includes('cost') ||
    lowerFieldName.includes('balance') ||
    lowerFieldName.includes('fee') ||
    lowerFieldName.includes('total') ||
    lowerFieldName.includes('payment')
  );
}

/**
 * Draws a formatted table in the PDF document
 * 
 * @param doc - PDFDocument to draw on
 * @param data - Array of data objects
 * @param headers - Array of header names
 * @param tableOptions - Options for table styling
 */
function drawTable(
  doc: PDFKit.PDFDocument,
  data: Array<Record<string, any>>,
  headers: string[],
  tableOptions: PDFTableOptions
): void {
  // Calculate column widths based on available space
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columnWidth = pageWidth / headers.length;
  
  let yPosition = doc.y + 5;
  
  // Draw headers
  doc.font('Helvetica-Bold');
  
  // Draw header background
  if (tableOptions.headerBackground) {
    doc.rect(
      doc.page.margins.left,
      yPosition - 5,
      pageWidth,
      20
    ).fill(tableOptions.headerBackground);
  }
  
  // Draw header text
  doc.fillColor(tableOptions.headerTextColor || '#000000');
  headers.forEach((header, i) => {
    const x = doc.page.margins.left + (i * columnWidth);
    doc.text(
      formatHeaderForPDF(header),
      x,
      yPosition,
      { width: columnWidth, align: 'left' }
    );
  });
  
  yPosition += 20;
  
  // Draw data rows
  doc.font('Helvetica');
  
  // Set up row colors
  const evenRowColor = tableOptions.evenRowColor || '#ffffff';
  const oddRowColor = tableOptions.oddRowColor || '#f9f9f9';
  
  // Draw each row
  data.forEach((row, rowIndex) => {
    const rowHeight = 20;
    
    // Check if we need a new page
    if (yPosition + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      yPosition = doc.page.margins.top;
      
      // Redraw headers on new page
      doc.font('Helvetica-Bold');
      
      // Draw header background
      if (tableOptions.headerBackground) {
        doc.rect(
          doc.page.margins.left,
          yPosition - 5,
          pageWidth,
          20
        ).fill(tableOptions.headerBackground);
      }
      
      // Draw header text
      doc.fillColor(tableOptions.headerTextColor || '#000000');
      headers.forEach((header, i) => {
        const x = doc.page.margins.left + (i * columnWidth);
        doc.text(
          formatHeaderForPDF(header),
          x,
          yPosition,
          { width: columnWidth, align: 'left' }
        );
      });
      
      yPosition += 20;
      doc.font('Helvetica');
    }
    
    // Draw row background if alternating row colors is enabled
    if (tableOptions.alternateRowColors) {
      const rowColor = rowIndex % 2 === 0 ? evenRowColor : oddRowColor;
      doc.rect(
        doc.page.margins.left,
        yPosition - 5,
        pageWidth,
        rowHeight
      ).fill(rowColor);
    }
    
    // Draw cell values
    doc.fillColor('#000000');
    headers.forEach((header, i) => {
      const x = doc.page.margins.left + (i * columnWidth);
      const value = formatCellValue(row[header], header);
      
      doc.text(
        value,
        x,
        yPosition,
        { width: columnWidth, align: 'left' }
      );
    });
    
    // Draw row divider line
    if (tableOptions.drawRowLines) {
      doc.strokeColor(tableOptions.lineColor || '#e0e0e0')
         .moveTo(doc.page.margins.left, yPosition + rowHeight - 5)
         .lineTo(doc.page.margins.left + pageWidth, yPosition + rowHeight - 5)
         .stroke();
    }
    
    yPosition += rowHeight;
  });
}