import express from 'express'; // express@4.18.2
import { logger } from '../../common/utils/logger';
import {
  authenticate,
} from '../../common/middleware/authentication';
import {
  requirePermission,
  requireRole,
  requireBarracudaAdmin,
  requireBankAdmin,
  requireOrganizationAdmin,
  requireMerchantAdmin,
} from '../../common/middleware/authorization';
import {
  validateBody,
  validateParams,
  validateQuery,
  validateRequest,
} from '../../common/middleware/validation';
import {
  getParameters,
  getParameter,
  getEffectiveParameter,
  getEffectiveParameters,
  createParameter,
  updateParameter,
  deleteParameter,
  getParameterHistory,
  getParameterDefinitions,
  clearParameterCache,
} from '../../services/refund-api/controllers/parameter.controller';
import { ParameterEntityType } from '../../services/parameter-resolution/models/parameter-value.model';
import Joi from 'joi'; // joi

/**
 * Creates and configures the Express router for parameter management endpoints
 * @returns Configured Express router with parameter endpoints
 */
function createParameterRoutes(): express.Router {
  // Create a new Express Router instance
  const router = express.Router();

  // Configure authentication and authorization middleware
  router.use(authenticate);

  // Define parameter-related routes with appropriate controllers
  // GET /parameters - Retrieves parameters for a specific entity
  router.get('/', requireBarracudaAdmin, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.info('GET /parameters route called');
    await getParameters(req, res, next);
  });

  // GET /parameters/:entity_type/:entity_id/:parameter_name - Retrieves a specific parameter by name for an entity
  router.get('/:entity_type/:entity_id/:parameter_name', requireBarracudaAdmin, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.info('GET /parameters/:entity_type/:entity_id/:parameter_name route called');
    await getParameter(req, res, next);
  });

  // GET /merchants/:merchantId/effective-parameters/:parameterName - Retrieves the effective parameter value for a merchant
  router.get('/merchants/:merchantId/effective-parameters/:parameterName', requireMerchantAdmin, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.info('GET /merchants/:merchantId/effective-parameters/:parameterName route called');
    await getEffectiveParameter(req, res, next);
  });

  // GET /merchants/:merchantId/effective-parameters - Retrieves all effective parameters for a merchant
  router.get('/merchants/:merchantId/effective-parameters', requireMerchantAdmin, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.info('GET /merchants/:merchantId/effective-parameters route called');
    await getEffectiveParameters(req, res, next);
  });

  // POST /parameters - Creates a new parameter for an entity
  router.post('/', requireBarracudaAdmin, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.info('POST /parameters route called');
    await createParameter(req, res, next);
  });

  // PUT /parameters/:entity_type/:entity_id/:parameter_name - Updates an existing parameter
  router.put('/:entity_type/:entity_id/:parameter_name', requireBarracudaAdmin, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.info('PUT /parameters/:entity_type/:entity_id/:parameter_name route called');
    await updateParameter(req, res, next);
  });

  // DELETE /parameters/:entity_type/:entity_id/:parameter_name - Deletes a parameter
  router.delete('/:entity_type/:entity_id/:parameter_name', requireBarracudaAdmin, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.info('DELETE /parameters/:entity_type/:entity_id/:parameter_name route called');
    await deleteParameter(req, res, next);
  });

  // GET /parameters/:entity_type/:entity_id/:parameter_name/history - Retrieves the version history of a parameter
  router.get('/:entity_type/:entity_id/:parameter_name/history', requireBarracudaAdmin, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.info('GET /parameters/:entity_type/:entity_id/:parameter_name/history route called');
    await getParameterHistory(req, res, next);
  });

  // GET /parameter-definitions - Retrieves all parameter definitions
  router.get('/parameter-definitions', requireBarracudaAdmin, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.info('GET /parameter-definitions route called');
    await getParameterDefinitions(req, res, next);
  });

  // POST /clear-cache - Clears the parameter cache
  router.post('/clear-cache', requireBarracudaAdmin, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.info('POST /clear-cache route called');
    await clearParameterCache(req, res, next);
  });

  // Set up validation for request parameters
  // Add appropriate RBAC for endpoints

  // Log router initialization
  logger.info('Parameter routes initialized');

  // Return the configured router
  return router;
}

// Export the function that creates the parameter routes router
export default createParameterRoutes;