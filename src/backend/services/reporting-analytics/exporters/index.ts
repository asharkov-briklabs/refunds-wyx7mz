/**
 * Exports Module
 * 
 * This module provides a centralized interface for all report data exporters in the 
 * Refunds Service reporting system. It exports classes and functions for different
 * export formats (CSV, Excel, PDF, JSON) and provides a mapping between format types
 * and their corresponding exporters.
 */

import { CSVExporter, exportToCSV } from './csv.exporter';
import { ExcelExporter, exportToExcel } from './excel.exporter';
import { PDFExporter, exportToPDF } from './pdf.exporter';
import { UnsupportedExportFormatError } from '../../../common/errors';
import { OutputFormat } from '../models/scheduled-report.model';

/**
 * Interface that defines the contract for all data exporters
 */
export interface IExporter {
  /**
   * Exports data in the specific format
   * @param data Array of records to export
   * @param options Format-specific options
   * @returns Exported data in the specific format
   */
  export(data: Array<Record<string, any>>, options?: Record<string, any>): Promise<any>;
  
  /**
   * Returns the MIME type for the exported format
   * @returns MIME type string
   */
  getContentType(): string;
  
  /**
   * Returns the file extension for the exported format
   * @returns File extension including the dot
   */
  getFileExtension(): string;
}

// Export all exporter classes and functions
export { CSVExporter, exportToCSV } from './csv.exporter';
export { ExcelExporter, exportToExcel } from './excel.exporter';
export { PDFExporter, exportToPDF } from './pdf.exporter';

/**
 * Map of export formats to their respective exporter classes
 */
export const ExporterMap: Record<OutputFormat, IExporter> = {
  [OutputFormat.CSV]: new CSVExporter(),
  [OutputFormat.EXCEL]: new ExcelExporter(),
  [OutputFormat.PDF]: new PDFExporter(),
  [OutputFormat.JSON]: {
    // Simple JSON exporter implementation
    export: async (data) => JSON.stringify(data),
    getContentType: () => 'application/json',
    getFileExtension: () => '.json'
  }
};

/**
 * Factory function to get the appropriate exporter for a given format
 * 
 * @param format Output format for export
 * @returns Exporter implementation for the requested format
 * @throws UnsupportedExportFormatError if format is not supported
 */
export function getExporter(format: string): IExporter {
  const normalizedFormat = format.toUpperCase();
  
  // Check if the format exists in the OutputFormat enum
  if (!Object.values(OutputFormat).includes(normalizedFormat as OutputFormat)) {
    throw new UnsupportedExportFormatError(`Unsupported export format: ${format}`);
  }
  
  return ExporterMap[normalizedFormat as OutputFormat];
}