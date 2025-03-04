import { ReportingEngine, initialize } from './reporting-engine.service'; // Import ReportingEngine service and initialization function
import ReportExecutor from './report-executor'; // Import ReportExecutor service
import MetricsCalculator from './metrics-calculator'; // Import MetricsCalculator service
import { IReportDefinition, IScheduledReport, OutputFormat } from './models'; // Import interfaces and enums from models
import { getExporter } from './exporters'; // Import function to get data exporter
import { scheduleReport, executeScheduledReport, getScheduledReportsForUser } from './report-scheduler'; // Import functions for report scheduling

// Create a new instance of the ReportingEngine, ReportExecutor, and MetricsCalculator
const reportingEngine = new ReportingEngine(new ReportExecutor(), new MetricsCalculator(), {});

// Initialize the reporting engine
initialize();

// Export the ReportingEngine class and its methods
export {
  ReportingEngine,
  ReportExecutor,
  MetricsCalculator,
  IReportDefinition,
  IScheduledReport,
  OutputFormat,
  getExporter,
  scheduleReport,
  executeScheduledReport,
  getScheduledReportsForUser,
  initialize
};

// Export the initialized reporting engine instance as the default export
export default reportingEngine;