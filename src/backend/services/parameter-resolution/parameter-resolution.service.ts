import { logger } from '../../common/utils/logger';
import ParameterDefinition, {
  ValidationResult,
  ParameterDataType,
} from './models/parameter-definition.model';
import ParameterValue, {
  ParameterEntityType,
  ParameterInheritanceLevel,
  IParameterValueInit,
} from './models/parameter-value.model';
import InheritanceResolver from './inheritance-resolver';
import ParameterCache from './cache-manager';
import parameterRepository from '../../database/repositories/parameter.repo';
import { EventEmitter } from '../../common/utils/event-emitter';
import { InvalidParameterError } from '../../common/errors/validation-error';
import { NotFoundError } from '../../common/errors/api-error';
import { generateId } from '../../common/utils/idempotency';

// Default TTL for cached parameters (in seconds)
const DEFAULT_CACHE_TTL = 300;

// Event types for parameter change notifications
export const PARAMETER_EVENTS = {
  PARAMETER_CREATED: 'parameter.created',
  PARAMETER_UPDATED: 'parameter.updated',
  PARAMETER_DELETED: 'parameter.deleted',
};

/**
 * Service that manages parameter resolution, caching, validation, and persistence across the parameter hierarchy
 */
export default class ParameterResolutionService {
  private inheritanceResolver: InheritanceResolver;
  private cache: ParameterCache;
  private parameterDefinitions: Map<string, ParameterDefinition> = new Map();
  private eventEmitter: EventEmitter;

  /**
   * Initializes the parameter resolution service with required dependencies
   * @param cacheTtl Optional cache TTL in seconds
   */
  constructor(cacheTtl?: number) {
    // Initialize cache with provided TTL or DEFAULT_CACHE_TTL
    this.cache = new ParameterCache(cacheTtl || DEFAULT_CACHE_TTL);

    // Initialize empty parameterDefinitions map
    this.parameterDefinitions = new Map<string, ParameterDefinition>();

    // Initialize inheritanceResolver with parameterDefinitions
    this.inheritanceResolver = new InheritanceResolver(this.parameterDefinitions);

    // Initialize eventEmitter for parameter change notifications
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Initializes the service by loading parameter definitions from database
   */
  async initialize(): Promise<void> {
    logger.info('ParameterResolutionService initializing...');

    // Get all parameter definitions from repository
    const definitions = await parameterRepository.getAllParameterDefinitions();

    // Load definitions into parameterDefinitions map
    definitions.forEach(def => {
      this.parameterDefinitions.set(def.parameterName, new ParameterDefinition(def));
    });

    logger.info(`ParameterResolutionService initialized with ${this.parameterDefinitions.size} parameter definitions`);
  }

  /**
   * Resolves a parameter value for a specific merchant using hierarchical inheritance
   * @param parameterName Name of the parameter to resolve
   * @param merchantId Merchant ID to resolve parameter for
   */
  async resolveParameter(parameterName: string, merchantId: string): Promise<ParameterValue> {
    try {
      logger.debug(`Resolving parameter: ${parameterName} for merchant: ${merchantId}`);

      // Validate parameter name and merchant ID
      if (!parameterName) {
        throw new InvalidParameterError('Parameter name is required');
      }
      if (!merchantId) {
        throw new InvalidParameterError('Merchant ID is required');
      }

      // Check if parameter exists in definitions
      if (!this.parameterDefinitions.has(parameterName)) {
        throw new NotFoundError(`Parameter definition not found for: ${parameterName}`);
      }

      // Try to get parameter from cache first
      const cachedValue = await this.cache.get(parameterName, merchantId);
      if (cachedValue) {
        logger.debug(`Cache hit for parameter: ${parameterName} for merchant: ${merchantId}`);
        return cachedValue;
      }

      // If not in cache, resolve using inheritanceResolver
      const resolvedValue = await this.inheritanceResolver.resolveParameter(parameterName, merchantId);

      // Store resolved parameter in cache for future requests
      await this.cache.set(parameterName, merchantId, resolvedValue);

      // Return the resolved parameter value
      return resolvedValue;
    } catch (err) {
      logger.error(`Error resolving parameter: ${parameterName} for merchant: ${merchantId}`, {
        error: err,
        parameterName,
        merchantId
      });
      throw err;
    }
  }

  /**
   * Efficiently resolves multiple parameters in a single operation
   * @param parameterNames Array of parameter names to resolve
   * @param merchantId Merchant ID to resolve parameters for
   */
  async resolveParameters(parameterNames: string[], merchantId: string): Promise<Map<string, ParameterValue>> {
    try {
      logger.debug(`Resolving multiple parameters for merchant: ${merchantId}`, {
        parameterCount: parameterNames.length,
        parameters: parameterNames
      });

      // Validate parameter names and merchant ID
      if (!parameterNames || parameterNames.length === 0) {
        throw new InvalidParameterError('Parameter names are required');
      }
      if (!merchantId) {
        throw new InvalidParameterError('Merchant ID is required');
      }

      // Filter parameter names to those in definitions
      const validParameterNames = parameterNames.filter(name => this.parameterDefinitions.has(name));

      // Try to get parameters from cache in bulk
      const cachedParameters = await this.cache.getBulk(validParameterNames, merchantId);

      // For parameters not in cache, resolve using inheritanceResolver
      const parametersToResolve = validParameterNames.filter(name => !cachedParameters.has(name));
      const resolvedParameters = new Map<string, ParameterValue>();

      if (parametersToResolve.length > 0) {
        const resolved = await this.inheritanceResolver.resolveMultipleParameters(parametersToResolve, merchantId);
        resolved.forEach((value, key) => resolvedParameters.set(key, value));
      }

      // Store newly resolved parameters in cache
      await this.cache.setBulk(resolvedParameters, merchantId);

      // Return map of all parameter names to resolved values
      const allParameters = new Map([...cachedParameters, ...resolvedParameters]);
      return allParameters;
    } catch (err) {
      logger.error(`Error resolving multiple parameters for merchant: ${merchantId}`, {
        error: err,
        parameterNames,
        merchantId
      });
      throw err;
    }
  }

  /**
   * Gets a parameter's value directly without the parameter object wrapper
   * @param parameterName Name of the parameter to retrieve
   * @param merchantId Merchant ID to resolve parameter for
   */
  async getParameterValue(parameterName: string, merchantId: string): Promise<any> {
    try {
      // Resolve the parameter using resolveParameter method
      const parameter = await this.resolveParameter(parameterName, merchantId);

      // Extract and return the value property from the parameter
      return parameter.value;
    } catch (err) {
      logger.error(`Error getting parameter value: ${parameterName} for merchant: ${merchantId}`, {
        error: err,
        parameterName,
        merchantId
      });
      throw err;
    }
  }

  /**
   * Gets multiple parameter values directly without the parameter object wrappers
   * @param parameterNames Array of parameter names to retrieve
   * @param merchantId Merchant ID to resolve parameters for
   */
  async getParametersValue(parameterNames: string[], merchantId: string): Promise<Record<string, any>> {
    try {
      // Resolve parameters using resolveParameters method
      const parameters = await this.resolveParameters(parameterNames, merchantId);

      // Transform map of parameter objects to record of raw values
      const values: Record<string, any> = {};
      parameters.forEach((parameter, name) => {
        values[name] = parameter.value;
      });

      // Return record with parameter names as keys and raw values as values
      return values;
    } catch (err) {
      logger.error(`Error getting multiple parameter values for merchant: ${merchantId}`, {
        error: err,
        parameterNames,
        merchantId
      });
      throw err;
    }
  }

  /**
   * Gets all effective parameters for a merchant across all hierarchy levels
   * @param merchantId Merchant ID to get parameters for
   */
  async getEffectiveParameters(merchantId: string): Promise<Map<string, ParameterValue>> {
    try {
      logger.debug(`Getting effective parameters for merchant: ${merchantId}`);

      // Validate merchant ID
      if (!merchantId) {
        throw new InvalidParameterError('Merchant ID is required');
      }

      // Use inheritanceResolver to get effective parameters
      const effectiveParameters = await this.inheritanceResolver.getEffectiveParameters(merchantId);

      // Return the complete map of parameter names to effective values
      return effectiveParameters;
    } catch (err) {
      logger.error(`Error getting effective parameters for merchant: ${merchantId}`, {
        error: err,
        merchantId
      });
      throw err;
    }
  }

  /**
   * Sets a parameter value at a specific entity level
   * @param entityType Type of entity (MERCHANT, ORGANIZATION, PROGRAM, BANK)
   * @param entityId ID of the entity
   * @param parameterName Name of the parameter to set
   * @param value New value for the parameter
   * @param metadata Optional metadata for the parameter
   */
  async setParameter(
    entityType: ParameterEntityType,
    entityId: string,
    parameterName: string,
    value: any,
    metadata: object
  ): Promise<ParameterValue> {
    try {
      logger.info(`Setting parameter: ${parameterName} for entity: ${entityType}:${entityId}`);

      // Validate entityType, entityId, parameterName, and value
      if (!entityType) {
        throw new InvalidParameterError('Entity type is required');
      }
      if (!entityId) {
        throw new InvalidParameterError('Entity ID is required');
      }
      if (!parameterName) {
        throw new InvalidParameterError('Parameter name is required');
      }
      if (value === undefined) {
        throw new InvalidParameterError('Parameter value is required');
      }

      // Get parameter definition to validate value
      const definition = await this.getParameterDefinition(parameterName);
      if (!definition) {
        throw new NotFoundError(`Parameter definition not found: ${parameterName}`);
      }

      // Use definition.validate() to validate the value
      const validationResult = await this.validateParameterValue(parameterName, value);
      if (!validationResult.valid) {
        throw new InvalidParameterError(`Invalid value for parameter ${parameterName}: ${validationResult.errors.join(', ')}`);
      }

      // Check if parameter already exists
      let existingParameter = await parameterRepository.findActiveParameter(entityType, entityId, parameterName);

      let savedParameter;
      if (existingParameter) {
        // If exists, update parameter with new value
        existingParameter.value = value;
        savedParameter = await parameterRepository.updateParameter(entityType, entityId, parameterName, { value });
      } else {
        // If doesn't exist, create new parameter
        const newParameter: IParameterValueInit = {
          id: generateId(),
          entityType: entityType,
          entityId: entityId,
          parameterName: parameterName,
          value: value,
          effectiveDate: new Date(),
          expirationDate: null,
          createdBy: 'system', // TODO: Replace with actual user ID
          createdAt: new Date(),
          updatedAt: new Date()
        };
        savedParameter = await parameterRepository.createParameter(newParameter);
      }

      // Invalidate cache for this parameter and related hierarchies
      await this.cache.invalidateHierarchy(parameterName, entityType, entityId);

      // Emit parameter change event
      this.eventEmitter.emit(PARAMETER_EVENTS.PARAMETER_UPDATED, {
        entityType,
        entityId,
        parameterName,
        value
      });

      // Return the saved parameter value
      return new ParameterValue({
        id: savedParameter._id.toString(),
        entityType: savedParameter.entityType,
        entityId: savedParameter.entityId,
        parameterName: savedParameter.parameterName,
        value: savedParameter.value,
        effectiveDate: savedParameter.effectiveDate,
        expirationDate: savedParameter.expirationDate,
        overridden: true,
        version: savedParameter.version,
        createdBy: savedParameter.createdBy,
        createdAt: savedParameter.createdAt,
        updatedAt: savedParameter.updatedAt
      });
    } catch (err) {
      logger.error(`Error setting parameter: ${parameterName} for entity: ${entityType}:${entityId}`, {
        error: err,
        entityType,
        entityId,
        parameterName,
        value
      });
      throw err;
    }
  }

  /**
   * Deletes a parameter at a specific entity level
   * @param entityType Type of entity (MERCHANT, ORGANIZATION, PROGRAM, BANK)
   * @param entityId ID of the entity
   * @param parameterName Name of the parameter to delete
   */
  async deleteParameter(entityType: ParameterEntityType, entityId: string, parameterName: string): Promise<boolean> {
    try {
      logger.info(`Deleting parameter: ${parameterName} for entity: ${entityType}:${entityId}`);

      // Validate entityType, entityId, and parameterName
      if (!entityType) {
        throw new InvalidParameterError('Entity type is required');
      }
      if (!entityId) {
        throw new InvalidParameterError('Entity ID is required');
      }
      if (!parameterName) {
        throw new InvalidParameterError('Parameter name is required');
      }

      // Delete parameter using repository
      const deleted = await parameterRepository.deleteParameter(entityType, entityId, parameterName);

      // Invalidate cache for this parameter and related hierarchies
      await this.cache.invalidateHierarchy(parameterName, entityType, entityId);

      // Emit parameter deletion event
      this.eventEmitter.emit(PARAMETER_EVENTS.PARAMETER_DELETED, {
        entityType,
        entityId,
        parameterName
      });

      // Return success status
      return deleted;
    } catch (err) {
      logger.error(`Error deleting parameter: ${parameterName} for entity: ${entityType}:${entityId}`, {
        error: err,
        entityType,
        entityId,
        parameterName
      });
      throw err;
    }
  }

  /**
   * Gets the version history of a parameter
   * @param entityType Type of entity (MERCHANT, ORGANIZATION, PROGRAM, BANK)
   * @param entityId ID of the entity
   * @param parameterName Name of the parameter to retrieve history for
   */
  async getParameterHistory(entityType: ParameterEntityType, entityId: string, parameterName: string): Promise<ParameterValue[]> {
    try {
      logger.debug(`Getting parameter history: ${parameterName} for entity: ${entityType}:${entityId}`);

      // Validate entityType, entityId, and parameterName
      if (!entityType) {
        throw new InvalidParameterError('Entity type is required');
      }
      if (!entityId) {
        throw new InvalidParameterError('Entity ID is required');
      }
      if (!parameterName) {
        throw new InvalidParameterError('Parameter name is required');
      }

      // Get parameter history from repository
      const history = await parameterRepository.findParameterHistory(entityType, entityId, parameterName);

      // Transform database records to ParameterValue objects
      const parameterValues = history.map(item => new ParameterValue({
        id: item._id.toString(),
        entityType: item.entityType,
        entityId: item.entityId,
        parameterName: item.parameterName,
        value: item.value,
        effectiveDate: item.effectiveDate,
        expirationDate: item.expirationDate,
        overridden: true,
        version: item.version,
        createdBy: item.createdBy,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }));

      // Return array of parameter versions
      return parameterValues;
    } catch (err) {
      logger.error(`Error getting parameter history: ${parameterName} for entity: ${entityType}:${entityId}`, {
        error: err,
        entityType,
        entityId,
        parameterName
      });
      throw err;
    }
  }

  /**
   * Gets a parameter definition by name
   * @param parameterName Name of the parameter
   */
  async getParameterDefinition(parameterName: string): Promise<ParameterDefinition | null> {
    try {
      logger.debug(`Getting parameter definition: ${parameterName}`);

      // Validate parameter name
      if (!parameterName) {
        throw new InvalidParameterError('Parameter name is required');
      }

      // Check if definition exists in memory cache
      if (this.parameterDefinitions.has(parameterName)) {
        return this.parameterDefinitions.get(parameterName) || null;
      }

      // If not in cache, load from repository
      const definition = await parameterRepository.findParameterDefinition(parameterName);

      // Add to memory cache if found
      if (definition) {
        this.parameterDefinitions.set(parameterName, new ParameterDefinition(definition));
      }

      // Return the parameter definition or null
      return definition ? new ParameterDefinition(definition) : null;
    } catch (err) {
      logger.error(`Error getting parameter definition: ${parameterName}`, {
        error: err,
        parameterName
      });
      throw err;
    }
  }

  /**
   * Gets all parameter definitions
   */
  async getAllParameterDefinitions(): Promise<ParameterDefinition[]> {
    try {
      logger.debug('Getting all parameter definitions');

      // Return Array.from(parameterDefinitions.values())
      return Array.from(this.parameterDefinitions.values());
    } catch (err) {
      logger.error('Error getting all parameter definitions', {
        error: err
      });
      throw err;
    }
  }

  /**
   * Saves a parameter definition to the database
   * @param definition Parameter definition to save
   */
  async saveParameterDefinition(definition: ParameterDefinition): Promise<ParameterDefinition> {
    try {
      logger.info(`Saving parameter definition: ${definition.name}`);

      // Validate parameter definition
      if (!definition) {
        throw new InvalidParameterError('Parameter definition is required');
      }

      // Save definition to repository
      const savedDefinition = await parameterRepository.saveParameterDefinition(definition);

      // Update in-memory cache with new definition
      this.parameterDefinitions.set(definition.name, new ParameterDefinition(savedDefinition));

      // Return the saved parameter definition
      return new ParameterDefinition(savedDefinition);
    } catch (err) {
      logger.error(`Error saving parameter definition: ${definition.name}`, {
        error: err,
        definition
      });
      throw err;
    }
  }

  /**
   * Validates a parameter value against its definition
   * @param parameterName Name of the parameter
   * @param value Value to validate
   */
  async validateParameterValue(parameterName: string, value: any): Promise<ValidationResult> {
    try {
      logger.debug(`Validating parameter value: ${parameterName}`);

      // Get parameter definition
      const definition = await this.getParameterDefinition(parameterName);

      // If definition not found, return error
      if (!definition) {
        return {
          valid: false,
          errors: [`Parameter definition not found: ${parameterName}`]
        };
      }

      // Use definition.validate() to validate the value
      const validationResult = definition.validate(value);

      // Return validation result
      return validationResult;
    } catch (err) {
      logger.error(`Error validating parameter value: ${parameterName}`, {
        error: err,
        parameterName
      });
      throw err;
    }
  }

  /**
   * Invalidates cache for a parameter or pattern
   * @param pattern Redis key pattern to match
   */
  async invalidateCache(pattern: string): Promise<number> {
    try {
      logger.info(`Invalidating cache with pattern: ${pattern}`);

      // Use cache.invalidateByPattern to clear matching cache entries
      const invalidatedCount = await this.cache.invalidateByPattern(pattern);

      // Return count of invalidated entries
      return invalidatedCount;
    } catch (err) {
      logger.error(`Error invalidating cache with pattern: ${pattern}`, {
        error: err,
        pattern
      });
      throw err;
    }
  }

  /**
   * Gets the inheritance chain for a merchant
   * @param merchantId Merchant ID to get inheritance chain for
   */
  async getInheritanceChain(merchantId: string): Promise<Array<{ entityType: ParameterEntityType; entityId: string; }>> {
    try {
      logger.debug(`Getting inheritance chain for merchant: ${merchantId}`);

      // Use inheritanceResolver to get inheritance chain
      const inheritanceChain = await this.inheritanceResolver.getInheritanceChain(merchantId);

      // Return the array of entity levels
      return inheritanceChain;
    } catch (err) {
      logger.error(`Error getting inheritance chain for merchant: ${merchantId}`, {
        error: err,
        merchantId
      });
      throw err;
    }
  }
}