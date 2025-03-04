import { Request, Response, NextFunction } from 'express'; // express@^4.18.2
import { ApiError, ValidationError, BusinessError } from '../../../common/errors'; // Standard error classes for consistent error handling
import { ErrorCode } from '../../../common/constants/error-codes'; // Standard error codes for API responses
import { StatusCode } from '../../../common/constants/status-codes'; // HTTP status codes for API responses
import { logger } from '../../../common/utils/logger'; // Logging utility for controller operations
import { metrics } from '../../../common/utils/metrics'; // Metrics recording for API operations
import reportingEngine, { ReportingEngine } from '../../reporting-analytics/reporting-engine.service'; // Core service for reporting and analytics functionality
import { OutputFormat } from '../../reporting-analytics/models/scheduled-report.model'; // Enum for supported output formats

/**
 * Controller class handling all reporting-related HTTP endpoints
 */
export class ReportingController {
  private reportingEngine: ReportingEngine;

  /**
   * Initializes the ReportingController with required dependencies
   * @param reportingEngine 
   */
  constructor(reportingEngine: ReportingEngine) {
    this.reportingEngine = reportingEngine;
  }

  /**
   * Handler for generating a report
   * @param req 
   * @param res 
   * @param next 
   */
  async generateReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await generateReportHandler(req, res, next);
    } catch (error) {
      metrics.incrementCounter('report.generate.attempt', 1);
      next(error);
    }
  }

  /**
   * Handler for retrieving refund metrics
   * @param req 
   * @param res 
   * @param next 
   */
  async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await getMetricsHandler(req, res, next);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handler for retrieving dashboard visualization data
   * @param req 
   * @param res 
   * @param next 
   */
  async getDashboardData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await getDashboardDataHandler(req, res, next);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handler for exporting report data
   * @param req 
   * @param res 
   * @param next 
   */
  async exportData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await exportDataHandler(req, res, next);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handler for scheduling a report
   * @param req 
   * @param res 
   * @param next 
   */
  async scheduleReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await scheduleReportHandler(req, res, next);
      metrics.incrementCounter('report.schedule.attempt', 1);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handler for listing scheduled reports
   * @param req 
   * @param res 
   * @param next 
   */
  async listScheduledReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await listScheduledReportsHandler(req, res, next);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handler for canceling a scheduled report
   * @param req 
   * @param res 
   * @param next 
   */
  async cancelScheduled(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await cancelScheduledReportHandler(req, res, next);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handler for executing a scheduled report immediately
   * @param req 
   * @param res 
   * @param next 
   */
  async executeScheduled(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await executeScheduledReportHandler(req, res, next);
    } catch (error) {
      next(error);
    }
  }
}

/**
 * Generates a report based on the provided reportId and parameters
 * @param req 
 * @param res 
 * @param next 
 */
async function generateReportHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.auth?.sub;
  const merchantId = req.params.merchantId || req.auth?.merchantId;
  const reportId = req.body.reportId;
  const parameters = req.body.parameters || {};

  logger.info(`Generating report ${reportId} for user ${userId}`);

  try {
    const { data, metadata } = await reportingEngine.generateReport(reportId, parameters, { userId, merchantId });

    res.status(StatusCode.OK).json({
      reportId,
      parameters,
      data,
      metadata
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return next(new ApiError(ErrorCode.VALIDATION_ERROR, error.message, error.details));
    }
    if (error instanceof BusinessError && error.code === 'RESOURCE_NOT_FOUND') {
      return next(new ApiError(ErrorCode.RESOURCE_NOT_FOUND, error.message));
    }
    next(error);
  }
}

/**
 * Retrieves refund metrics based on specified filters and dimensions
 * @param req 
 * @param res 
 * @param next 
 */
async function getMetricsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.auth?.sub;
  const merchantId = req.params.merchantId || req.auth?.merchantId;
  const timeRange = {
    start: new Date(req.query.startDate as string),
    end: new Date(req.query.endDate as string)
  };
  const dimensions = req.query.dimensions as string[];

  logger.info(`Retrieving refund metrics for merchant ${merchantId} and user ${userId}`);

  try {
    const metricsData = await reportingEngine.calculateRefundMetrics(merchantId, timeRange, dimensions, { userId });

    res.status(StatusCode.OK).json({
      merchantId,
      timeRange,
      dimensions,
      metrics: metricsData
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return next(new ApiError(ErrorCode.VALIDATION_ERROR, error.message, error.details));
    }
    next(error);
  }
}

/**
 * Retrieves aggregated dashboard data for visualizations
 * @param req 
 * @param res 
 * @param next 
 */
async function getDashboardDataHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.auth?.sub;
  const merchantId = req.params.merchantId || req.auth?.merchantId;
  const dashboardType = req.query.dashboardType as string;
  const timeRange = {
    start: new Date(req.query.startDate as string),
    end: new Date(req.query.endDate as string)
  };

  logger.info(`Retrieving dashboard data for merchant ${merchantId} and user ${userId}`);

  try {
    const dashboardData = await reportingEngine.getDashboardMetrics(dashboardType, timeRange, merchantId, { userId });

    res.status(StatusCode.OK).json({
      merchantId,
      dashboardType,
      timeRange,
      data: dashboardData
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return next(new ApiError(ErrorCode.VALIDATION_ERROR, error.message, error.details));
    }
    next(error);
  }
}

/**
 * Exports report data in the specified format
 * @param req 
 * @param res 
 * @param next 
 */
async function exportDataHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const data = req.body.data;
  const format = req.body.format;
  const reportName = req.body.reportName;

  logger.info(`Exporting report data to ${format} format`);

  try {
    const { url, contentType } = await reportingEngine.exportReport(data, format, reportName);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${reportName}.${format.toLowerCase()}"`);
    res.status(StatusCode.OK).send(url);
  } catch (error) {
    if (error instanceof ValidationError) {
      return next(new ApiError(ErrorCode.VALIDATION_ERROR, error.message, error.details));
    }
    if (error instanceof BusinessError && error.message.includes('Unsupported export format')) {
      return next(new ApiError(ErrorCode.VALIDATION_ERROR, error.message));
    }
    next(error);
  }
}

/**
 * Schedules a report for recurring execution
 * @param req 
 * @param res 
 * @param next 
 */
async function scheduleReportHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.auth?.sub;
  const reportId = req.body.reportId;
  const parameters = req.body.parameters;
  const scheduleExpression = req.body.scheduleExpression;
  const outputFormat = req.body.outputFormat;
  const recipients = req.body.recipients;

  logger.info(`Scheduling report ${reportId} for user ${userId}`);

  try {
    const { scheduleId, nextRunTime } = await reportingEngine.scheduleReport(reportId, parameters, scheduleExpression, { userId }, outputFormat, recipients);

    res.status(StatusCode.CREATED).json({
      scheduleId,
      reportId,
      parameters,
      scheduleExpression,
      outputFormat,
      recipients,
      nextRunTime
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return next(new ApiError(ErrorCode.VALIDATION_ERROR, error.message, error.details));
    }
    next(error);
  }
}

/**
 * Lists scheduled reports for the authenticated user
 * @param req 
 * @param res 
 * @param next 
 */
async function listScheduledReportsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.auth?.sub;

  logger.info(`Listing scheduled reports for user ${userId}`);

  try {
    const scheduledReports = await reportingEngine.getScheduledReportsForUser({ userId });

    res.status(StatusCode.OK).json({
      userId,
      scheduledReports
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancels a scheduled report
 * @param req 
 * @param res 
 * @param next 
 */
async function cancelScheduledReportHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.auth?.sub;
  const scheduleId = req.params.scheduleId;

  logger.info(`Cancelling scheduled report ${scheduleId} for user ${userId}`);

  try {
    await reportingEngine.cancelScheduledReport(scheduleId, { userId });
    res.status(StatusCode.OK).json({
      scheduleId,
      message: 'Scheduled report cancelled successfully'
    });
  } catch (error) {
    if (error instanceof BusinessError && error.code === 'RESOURCE_NOT_FOUND') {
      return next(new ApiError(ErrorCode.RESOURCE_NOT_FOUND, error.message));
    }
    if (error instanceof BusinessError && error.code === 'UNAUTHORIZED') {
      return next(new ApiError(ErrorCode.UNAUTHORIZED_ACCESS, error.message));
    }
    next(error);
  }
}

/**
 * Executes a scheduled report immediately
 * @param req 
 * @param res 
 * @param next 
 */
async function executeScheduledReportHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.auth?.sub;
  const scheduleId = req.params.scheduleId;

  logger.info(`Executing scheduled report ${scheduleId} immediately for user ${userId}`);

  try {
    const result = await reportingEngine.executeScheduledReport(scheduleId, { userId });
    res.status(StatusCode.OK).json({
      scheduleId,
      result
    });
  } catch (error) {
    if (error instanceof BusinessError && error.code === 'RESOURCE_NOT_FOUND') {
      return next(new ApiError(ErrorCode.RESOURCE_NOT_FOUND, error.message));
    }
    if (error instanceof BusinessError && error.code === 'UNAUTHORIZED') {
      return next(new ApiError(ErrorCode.UNAUTHORIZED_ACCESS, error.message));
    }
    next(error);
  }
}

const createReportingController = (): ReportingController => {
  return new ReportingController(reportingEngine);
};

export default createReportingController;
export { generateReportHandler, getMetricsHandler, getDashboardDataHandler, exportDataHandler, scheduleReportHandler, listScheduledReportsHandler, cancelScheduledReportHandler, executeScheduledReportHandler };