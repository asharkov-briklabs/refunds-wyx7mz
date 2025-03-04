# src/backend/services/refund-api/controllers/parameter.controller.ts
```typescript
import { Request, Response, NextFunction } from 'express'; // express@4.18.2
import { logger } from '../../../common/utils/logger';
import ParameterResolutionService from '../../../services/parameter-resolution/parameter-resolution.service';
import { ParameterEntityType } from '../../../services/parameter-resolution/models/parameter-value.model';
import {
  validateParameterCreate,
  validateParameterUpdate,
  validateParameterGet,
  validateParameterDelete,
} from '../validators/parameter.validator';
import parameterRepository from '../../../database/repositories/parameter.repo';
import { authorize } from '../../../common/middleware/authorization';
import { AUTH_ROLES } from '../../../config/auth';
import { NotFoundError, ValidationError } from '../../../common/errors';

// Initialize the ParameterResolutionService
const parameterService = new ParameterResolutionService();

/**
 * @fileoverview Controller for handling parameter management API endpoints in the Refunds Service.
 * Provides functions for reading, creating, updating, and deleting parameters at different entity
 * levels (merchant, organization, program, bank) within the hierarchical parameter system.
 */

/**
 * Retrieves parameters for a specific entity.
 *
 * @param req - Express request object.
 * @param res - Express response object.
 * @param next - Express next function.
 * @returns Resolves when parameters are retrieved and sent in response.
 */
export const getParameters = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract entityType and entityId from request query parameters
    const { entity_type, entity_id } = req.query;

    // Validate required parameters are provided
    if (!entity_type || !entity_id) {
      throw new ValidationError(undefined, 'Entity type and entity ID are required');
    }

    // Extract pagination parameters (page, limit) from request
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    // Query parameterRepository for parameters matching entity criteria
    const parameters = await parameterRepository.findParametersByEntity(
      entity_type as ParameterEntityType,
      entity_id as string,
      { pagination: { page, limit } }
    );

    // Count total parameters for pagination metadata
    const total = await parameterRepository.countParametersByEntity(
      entity_type as ParameterEntityType,
      entity_id as string
    );

    // Return parameters with pagination metadata in response
    res.status(200).json({
      parameters,
      page,
      limit,
      total,
    });
  } catch (error) {
    // Handle errors and pass to next middleware
    next(error);
  }
};

/**
 * Retrieves a specific parameter by name for an entity.
 *
 * @param req - Express request object.
 * @param res - Express response object.
 * @param next - Express next function.
 * @returns Resolves when parameter is retrieved and sent in response.
 */
export const getParameter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract entityType, entityId, and parameterName from request parameters
    const { entity_type, entity_id, parameter_name } = req.params;

    // Validate required parameters are provided
    if (!entity_type || !entity_id || !parameter_name) {
      throw new ValidationError(undefined, 'Entity type, entity ID, and parameter name are required');
    }

    // Query parameterRepository for the specific parameter
    const parameter = await parameterRepository.findParameter(
      entity_type as ParameterEntityType,
      entity_id as string,
      parameter_name as string
    );

    // If parameter not found, throw NotFoundError
    if (!parameter) {
      throw new NotFoundError('Parameter not found');
    }

    // Return parameter in response
    res.status(200).json(parameter);
  } catch (error) {
    // Handle errors and pass to next middleware
    next(error);
  }
};

/**
 * Retrieves the effective parameter value for a merchant, resolving through the hierarchy.
 *
 * @param req - Express request object.
 * @param res - Express response object.
 * @param next - Express next function.
 * @returns Resolves when effective parameter is retrieved and sent in response.
 */
export const getEffectiveParameter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract merchantId and parameterName from request parameters
    const { merchantId, parameterName } = req.params;

    // Validate required parameters are provided
    if (!merchantId || !parameterName) {
      throw new ValidationError(undefined, 'Merchant ID and parameter name are required');
    }

    // Call parameterService.resolveParameter to get the effective parameter
    const effectiveParameter = await parameterService.resolveParameter(parameterName, merchantId);

    // If parameter not found, return default value or throw NotFoundError
    if (!effectiveParameter) {
      throw new NotFoundError('Effective parameter not found');
    }

    // Return effective parameter with inheritance information in response
    res.status(200).json(effectiveParameter);
  } catch (error) {
    // Handle errors and pass to next middleware
    next(error);
  }
};

/**
 * Retrieves all effective parameters for a merchant.
 *
 * @param req - Express request object.
 * @param res - Express response object.
 * @param next - Express next function.
 * @returns Resolves when effective parameters are retrieved and sent in response.
 */
export const getEffectiveParameters = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract merchantId from request parameters
    const { merchantId } = req.params;

    // Validate merchantId is provided
    if (!merchantId) {
      throw new ValidationError(undefined, 'Merchant ID is required');
    }

    // Call parameterService.getEffectiveParameters to get all effective parameters
    const effectiveParameters = await parameterService.getEffectiveParameters(merchantId);

    // Convert parameter map to array for response
    const parametersArray = Array.from(effectiveParameters.values());

    // Return effective parameters in response
    res.status(200).json(parametersArray);
  } catch (error) {
    // Handle errors and pass to next middleware
    next(error);
  }
};

/**
 * Creates a new parameter for an entity.
 *
 * @param req - Express request object.
 * @param res - Express response object.
 * @param next - Express next function.
 * @returns Resolves when parameter is created and sent in response.
 */
export const createParameter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body using validateParameterCreate
    await validateParameterCreate(req);

    // Extract entityType, entityId, parameterName, value, and metadata from request body
    const { entity_type, entity_id, parameter_name, parameter_value, ...metadata } = req.body;

    // Call parameterService.setParameter to create the parameter
    const createdParameter = await parameterService.setParameter(
      entity_type as ParameterEntityType,
      entity_id,
      parameter_name,
      parameter_value,
      metadata
    );

    // Return created parameter with 201 status code in response
    res.status(201).json(createdParameter);
  } catch (error) {
    // Handle errors and pass to next middleware
    next(error);
  }
};

/**
 * Updates an existing parameter.
 *
 * @param req - Express request object.
 * @param res - Express response object.
 * @param next - Express next function.
 * @returns Resolves when parameter is updated and sent in response.
 */
export const updateParameter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request using validateParameterUpdate
    await validateParameterUpdate(req);

    // Extract entityType, entityId, parameterName from request parameters
    const { entity_type, entity_id, parameter_name } = req.params;

    // Extract value and metadata from request body
    const { parameter_value, ...metadata } = req.body;

    // Call parameterService.setParameter to update the parameter
    const updatedParameter = await parameterService.setParameter(
      entity_type as ParameterEntityType,
      entity_id,
      parameter_name,
      parameter_value,
      metadata
    );

    // Return updated parameter in response
    res.status(200).json(updatedParameter);
  } catch (error) {
    // Handle errors and pass to next middleware
    next(error);
  }
};

/**
 * Deletes a parameter.
 *
 * @param req - Express request object.
 * @param res - Express response object.
 * @param next - Express next function.
 * @returns Resolves when parameter is deleted.
 */
export const deleteParameter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request using validateParameterDelete
    await validateParameterDelete(req);

    // Extract entityType, entityId, parameterName from request parameters
    const { entity_type, entity_id, parameter_name } = req.params;

    // Call parameterService.deleteParameter to delete the parameter
    await parameterService.deleteParameter(
      entity_type as ParameterEntityType,
      entity_id,
      parameter_name
    );

    // Return success response with 204 status code
    res.status(204).send();
  } catch (error) {
    // Handle errors and pass to next middleware
    next(error);
  }
};

/**
 * Retrieves the version history of a parameter.
 *
 * @param req - Express request object.
 * @param res - Express response object.
 * @param next - Express next function.
 * @returns Resolves when parameter history is retrieved and sent in response.
 */
export const getParameterHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract entityType, entityId, parameterName from request parameters
    const { entity_type, entity_id, parameter_name } = req.params;

    // Validate required parameters are provided
    if (!entity_type || !entity_id || !parameter_name) {
      throw new ValidationError(undefined, 'Entity type, entity ID, and parameter name are required');
    }

    // Call parameterService.getParameterHistory to get version history
    const parameterHistory = await parameterService.getParameterHistory(
      entity_type as ParameterEntityType,
      entity_id,
      parameter_name
    );

    // Return parameter history in response
    res.status(200).json(parameterHistory);
  } catch (error) {
    // Handle errors and pass to next middleware
    next(error);
  }
};

/**
 * Retrieves all parameter definitions.
 *
 * @param req - Express request object.
 * @param res - Express response object.
 * @param next - Express next function.
 * @returns Resolves when parameter definitions are retrieved and sent in response.
 */
export const getParameterDefinitions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Call parameterRepository.getAllParameterDefinitions to get all definitions
    const parameterDefinitions = await parameterService.getAllParameterDefinitions();

    // Return parameter definitions in response
    res.status(200).json(parameterDefinitions);
  } catch (error) {
    // Handle errors and pass to next middleware
    next(error);
  }
};

/**
 * Clears the parameter cache.
 *
 * @param req - Express request object.
 * @param res - Express response object.
 * @param next - Express next function.
 * @returns Resolves when cache is cleared.
 */
export const clearParameterCache = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract pattern from request query parameters (optional)
    const { pattern } = req.query;

    // Call parameterService.invalidateCache with pattern
    const invalidatedCount = await parameterService.invalidateCache(pattern as string);

    // Return success response with count of invalidated cache entries
    res.status(200).json({ message: 'Cache cleared', invalidatedCount });
  } catch (error) {
    // Handle errors and pass to next middleware
    next(error);
  }
};

/**
 * Object containing validation middleware for parameter API endpoints.
 */
export const parameterValidationMiddleware = {
  createParameter: validateParameterCreate,
  updateParameter: validateParameterUpdate,
  getParameters: validateParameterGet
};

/**
 * Object containing authorization middleware for parameter API endpoints.
 */
export const parameterAuthorizationMiddleware = {
  viewParameters: authorize({ action: 'read', resource: 'parameter' }),
  manageParameters: authorize({ action: 'write', resource: 'parameter' }),
  adminActions: authorize({ action: 'manage', resource: 'parameter' })
};