import express, { Router } from 'express'; // express@^4.18.2
import createReportingController, { ReportingController } from '../../services/refund-api/controllers/reporting.controller';
import { authenticateRequest, requireBarracudaAdmin, requireMerchantAdmin, validatePaginationParams, validateDateRangeParams, validateIdParam, validateSchema } from '../middleware';
import { logger } from '../../common/utils/logger';

/**
 * Creates and configures an Express router with all reporting-related endpoints
 * @returns Configured Express Router instance with reporting routes
 */
function configureReportingRoutes(): Router {
  // Create a new Express Router instance
  const router = express.Router();

  // Initialize ReportingController instance
  const reportingController: ReportingController = createReportingController();

  // Apply authentication middleware to all routes
  router.use(authenticateRequest);

  // Register POST /reports/generate route for generating reports
  router.post(
    '/reports/generate',
    requireMerchantAdmin,
    validateSchema({
      required: ['reportId'],
      types: {
        reportId: 'string',
        parameters: 'object'
      }
    }),
    reportingController.generateReport.bind(reportingController)
  );

  // Register GET /metrics route for retrieving refund metrics
  router.get(
    '/metrics',
    requireMerchantAdmin,
    validateDateRangeParams(),
    reportingController.getMetrics.bind(reportingController)
  );

  // Register GET /dashboard route for retrieving dashboard data
  router.get(
    '/dashboard',
    requireMerchantAdmin,
    validateDateRangeParams(),
    reportingController.getDashboardData.bind(reportingController)
  );

  // Register POST /export route for exporting report data
  router.post(
    '/export',
    requireMerchantAdmin,
    validateSchema({
      required: ['data', 'format', 'reportName'],
      types: {
        data: 'object',
        format: 'string',
        reportName: 'string'
      }
    }),
    reportingController.exportData.bind(reportingController)
  );

  // Register POST /schedule route for scheduling reports
  router.post(
    '/schedule',
    requireBarracudaAdmin,
    validateSchema({
      required: ['reportId', 'scheduleExpression', 'outputFormat'],
      types: {
        reportId: 'string',
        parameters: 'object',
        scheduleExpression: 'string',
        outputFormat: 'string',
        recipients: 'array'
      }
    }),
    reportingController.scheduleReport.bind(reportingController)
  );

  // Register GET /schedule route for listing scheduled reports
  router.get(
    '/schedule',
    requireBarracudaAdmin,
    validatePaginationParams(),
    reportingController.listScheduledReports.bind(reportingController)
  );

  // Register DELETE /schedule/:scheduleId route for canceling scheduled reports
  router.delete(
    '/schedule/:scheduleId',
    requireBarracudaAdmin,
    validateIdParam('scheduleId'),
    reportingController.cancelScheduled.bind(reportingController)
  );

  // Register POST /schedule/:scheduleId/execute route for executing scheduled reports
  router.post(
    '/schedule/:scheduleId/execute',
    requireBarracudaAdmin,
    validateIdParam('scheduleId'),
    reportingController.executeScheduled.bind(reportingController)
  );

  // Log successful route configuration
  logger.info('Configured reporting routes');

  // Return the configured router
  return router;
}

// Default export providing router configuration function for reporting routes
export default configureReportingRoutes;