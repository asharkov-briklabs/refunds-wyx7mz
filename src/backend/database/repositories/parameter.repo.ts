/**
 * Repository for interacting with parameter data in MongoDB, providing data access methods
 * for the Parameter Resolution Service. Handles CRUD operations for parameters with support
 * for hierarchical configuration across program, bank, organization, and merchant levels.
 */
import mongoose from 'mongoose'; // mongoose ^6.0.0
import Parameter, { IParameter, ParameterEntityType } from '../models/parameter.model';
import { DatabaseError } from '../../common/errors';
import { logger } from '../../common/utils/logger';
import { getConnection } from '../connection';

/**
 * Repository class for managing parameter data in MongoDB, providing CRUD operations
 * with support for hierarchy, versioning, and active parameter resolution.
 */
class ParameterRepository {
  private model: mongoose.Model<IParameter>;

  /**
   * Initializes the parameter repository with the Parameter model
   */
  constructor() {
    this.model = Parameter;
  }

  /**
   * Finds a parameter by entity type, entity ID, and parameter name
   * 
   * @param entityType - Type of entity (MERCHANT, ORGANIZATION, PROGRAM, BANK)
   * @param entityId - ID of the entity
   * @param parameterName - Name of the parameter
   * @returns The parameter if found, null otherwise
   */
  async findParameter(
    entityType: ParameterEntityType,
    entityId: string,
    parameterName: string
  ): Promise<IParameter | null> {
    try {
      // Validate inputs are provided
      if (!entityType || !entityId || !parameterName) {
        logger.error('Missing required inputs for findParameter', {
          entityType,
          entityId,
          parameterName
        });
        throw new Error('Missing required inputs for findParameter');
      }

      // Query database with entityType, entityId, and parameterName
      const parameter = await this.model.findOne({
        entityType,
        entityId,
        parameterName
      }).sort({ version: -1 }).exec();

      // Return the matching parameter or null if not found
      return parameter;
    } catch (error) {
      // Handle and log any database errors
      logger.error('Error finding parameter', {
        entityType,
        entityId,
        parameterName,
        error
      });
      throw new DatabaseError(`Failed to find parameter: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Finds the active parameter based on effective date and expiration date
   * 
   * @param entityType - Type of entity (MERCHANT, ORGANIZATION, PROGRAM, BANK)
   * @param entityId - ID of the entity
   * @param parameterName - Name of the parameter
   * @returns Active parameter if found, null otherwise
   */
  async findActiveParameter(
    entityType: ParameterEntityType,
    entityId: string,
    parameterName: string
  ): Promise<IParameter | null> {
    try {
      // Get current date
      const currentDate = new Date();

      // Build query for entityType, entityId, parameterName
      // Add conditions for effectiveDate <= currentDate AND (expirationDate > currentDate OR expirationDate is null)
      const parameter = await this.model.findOne({
        entityType,
        entityId,
        parameterName,
        effectiveDate: { $lte: currentDate },
        $or: [
          { expirationDate: { $gt: currentDate } },
          { expirationDate: null }
        ]
      }).sort({ version: -1 }).exec();

      // Return the matching active parameter or null
      return parameter;
    } catch (error) {
      // Handle and log any database errors
      logger.error('Error finding active parameter', {
        entityType,
        entityId,
        parameterName,
        error
      });
      throw new DatabaseError(`Failed to find active parameter: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Finds all parameters for a specific entity
   * 
   * @param entityType - Type of entity (MERCHANT, ORGANIZATION, PROGRAM, BANK)
   * @param entityId - ID of the entity
   * @param options - Additional options for filtering, pagination, and sorting
   * @returns Array of parameters for the entity
   */
  async findParametersByEntity(
    entityType: ParameterEntityType,
    entityId: string,
    options: {
      filters?: Record<string, any>,
      pagination?: { page: number, limit: number },
      sort?: Record<string, 1 | -1>
    } = {}
  ): Promise<IParameter[]> {
    try {
      // Validate inputs are provided
      if (!entityType || !entityId) {
        logger.error('Missing required inputs for findParametersByEntity', {
          entityType,
          entityId
        });
        throw new Error('Missing required inputs for findParametersByEntity');
      }

      // Build query for entityType and entityId
      const query: Record<string, any> = {
        entityType,
        entityId
      };

      // Apply additional filters from options if provided
      if (options.filters) {
        Object.assign(query, options.filters);
      }

      // Create the base query
      let parametersQuery = this.model.find(query);

      // Apply pagination from options if provided
      if (options.pagination) {
        const { page, limit } = options.pagination;
        const skip = (page - 1) * limit;
        parametersQuery = parametersQuery.skip(skip).limit(limit);
      }

      // Apply sorting from options or default to parameterName
      const sort = options.sort || { parameterName: 1 };
      parametersQuery = parametersQuery.sort(sort);

      // Execute query and return results
      const parameters = await parametersQuery.exec();
      return parameters;
    } catch (error) {
      // Handle and log any database errors
      logger.error('Error finding parameters by entity', {
        entityType,
        entityId,
        options,
        error
      });
      throw new DatabaseError(`Failed to find parameters by entity: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Counts parameters for a specific entity
   * 
   * @param entityType - Type of entity (MERCHANT, ORGANIZATION, PROGRAM, BANK)
   * @param entityId - ID of the entity
   * @param filters - Additional filters to apply
   * @returns Count of parameters matching criteria
   */
  async countParametersByEntity(
    entityType: ParameterEntityType,
    entityId: string,
    filters: Record<string, any> = {}
  ): Promise<number> {
    try {
      // Build query for entityType and entityId
      const query: Record<string, any> = {
        entityType,
        entityId
      };

      // Apply additional filters if provided
      if (filters) {
        Object.assign(query, filters);
      }

      // Execute count query and return result
      const count = await this.model.countDocuments(query);
      return count;
    } catch (error) {
      // Handle and log any database errors
      logger.error('Error counting parameters by entity', {
        entityType,
        entityId,
        filters,
        error
      });
      throw new DatabaseError(`Failed to count parameters by entity: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Finds all versions of a parameter ordered by version
   * 
   * @param entityType - Type of entity (MERCHANT, ORGANIZATION, PROGRAM, BANK)
   * @param entityId - ID of the entity
   * @param parameterName - Name of the parameter
   * @returns Array of parameter versions
   */
  async findParameterHistory(
    entityType: ParameterEntityType,
    entityId: string,
    parameterName: string
  ): Promise<IParameter[]> {
    try {
      // Validate inputs are provided
      if (!entityType || !entityId || !parameterName) {
        logger.error('Missing required inputs for findParameterHistory', {
          entityType,
          entityId,
          parameterName
        });
        throw new Error('Missing required inputs for findParameterHistory');
      }

      // Build query for entityType, entityId, and parameterName
      const parameters = await this.model.find({
        entityType,
        entityId,
        parameterName
      }).sort({ version: -1 }).exec();

      // Return array of parameter versions
      return parameters;
    } catch (error) {
      // Handle and log any database errors
      logger.error('Error finding parameter history', {
        entityType,
        entityId,
        parameterName,
        error
      });
      throw new DatabaseError(`Failed to find parameter history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Creates a new parameter with versioning and effective dates
   * 
   * @param parameterData - Parameter data to create
   * @returns The created parameter
   */
  async createParameter(parameterData: Partial<IParameter>): Promise<IParameter> {
    try {
      // Validate required fields are provided
      if (!parameterData.parameterName || !parameterData.entityType || !parameterData.entityId || parameterData.value === undefined) {
        logger.error('Missing required fields for parameter creation', { parameterData });
        throw new Error('Missing required fields for parameter creation');
      }

      // Validate entity type is a valid enum value
      if (!Object.values(ParameterEntityType).includes(parameterData.entityType as ParameterEntityType)) {
        logger.error('Invalid entityType for parameter creation', { 
          entityType: parameterData.entityType,
          validTypes: Object.values(ParameterEntityType)
        });
        throw new Error(`Invalid entityType: ${parameterData.entityType}`);
      }

      // Check for existing parameter to determine version
      const latestVersion = await this.getLatestParameterVersion(
        parameterData.entityType as ParameterEntityType,
        parameterData.entityId as string,
        parameterData.parameterName as string
      );

      // If exists, increment version; otherwise start at version 1
      const version = latestVersion ? latestVersion.version + 1 : 1;

      // Set defaults for missing fields
      const now = new Date();
      const newParameter: IParameter = {
        ...parameterData as IParameter,
        version,
        effectiveDate: parameterData.effectiveDate || now,
        expirationDate: parameterData.expirationDate || null,
        overridable: parameterData.overridable !== false, // Default to true if not specified
        createdAt: now,
        updatedAt: now
      };

      // Create new parameter document
      const createdParameter = await this.model.create(newParameter);
      
      logger.info('Parameter created successfully', {
        parameterName: parameterData.parameterName,
        entityType: parameterData.entityType,
        entityId: parameterData.entityId,
        version
      });

      // Save and return the created parameter
      return createdParameter;
    } catch (error) {
      // Handle and log any database errors
      logger.error('Error creating parameter', {
        parameterData,
        error
      });
      throw new DatabaseError(`Failed to create parameter: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Updates a parameter by creating a new version
   * 
   * @param entityType - Type of entity (MERCHANT, ORGANIZATION, PROGRAM, BANK)
   * @param entityId - ID of the entity
   * @param parameterName - Name of the parameter
   * @param updates - Updates to apply to the parameter
   * @returns The updated parameter
   */
  async updateParameter(
    entityType: ParameterEntityType,
    entityId: string,
    parameterName: string,
    updates: Partial<IParameter>
  ): Promise<IParameter> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find latest version of parameter
      const latestParameter = await this.getLatestParameterVersion(
        entityType,
        entityId,
        parameterName
      );

      // If not found, throw error
      if (!latestParameter) {
        throw new Error(`Parameter not found: ${parameterName} for ${entityType} ${entityId}`);
      }

      // Create new version with incremented version number
      const now = new Date();
      const newVersion = latestParameter.version + 1;
      
      // Apply updates to new version
      const newParameter: IParameter = {
        ...latestParameter.toObject(),
        ...updates,
        version: newVersion,
        effectiveDate: updates.effectiveDate || now,
        expirationDate: updates.expirationDate || null,
        updatedAt: now
      };

      // Set previous version's expirationDate to new version's effectiveDate if it was active
      if (!latestParameter.expirationDate || latestParameter.expirationDate > now) {
        latestParameter.expirationDate = newParameter.effectiveDate;
        await latestParameter.save({ session });
      }

      // Save new version
      const createdParameter = await this.model.create([newParameter], { session });
      
      // Commit transaction
      await session.commitTransaction();
      
      logger.info('Parameter updated successfully', {
        parameterName,
        entityType,
        entityId,
        newVersion
      });

      // Return the new parameter version
      return createdParameter[0];
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      
      // Handle and log any database errors
      logger.error('Error updating parameter', {
        entityType,
        entityId,
        parameterName,
        updates,
        error
      });
      throw new DatabaseError(`Failed to update parameter: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // End session regardless of outcome
      session.endSession();
    }
  }

  /**
   * Logically deletes a parameter by setting expiration date
   * 
   * @param entityType - Type of entity (MERCHANT, ORGANIZATION, PROGRAM, BANK)
   * @param entityId - ID of the entity
   * @param parameterName - Name of the parameter
   * @returns True if successfully deleted
   */
  async deleteParameter(
    entityType: ParameterEntityType,
    entityId: string,
    parameterName: string
  ): Promise<boolean> {
    try {
      // Find active parameter
      const parameter = await this.findActiveParameter(
        entityType,
        entityId,
        parameterName
      );

      // If not found, return false
      if (!parameter) {
        logger.info('Parameter not found for deletion', {
          parameterName,
          entityType,
          entityId
        });
        return false;
      }

      // Set expirationDate to current timestamp
      parameter.expirationDate = new Date();
      parameter.updatedAt = new Date();

      // Save updated parameter
      await parameter.save();
      
      logger.info('Parameter deleted (expirationDate set)', {
        parameterName,
        entityType,
        entityId
      });

      // Return true for successful deletion
      return true;
    } catch (error) {
      // Handle and log any database errors
      logger.error('Error deleting parameter', {
        entityType,
        entityId,
        parameterName,
        error
      });
      throw new DatabaseError(`Failed to delete parameter: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets the latest version of a parameter
   * 
   * @param entityType - Type of entity (MERCHANT, ORGANIZATION, PROGRAM, BANK)
   * @param entityId - ID of the entity
   * @param parameterName - Name of the parameter
   * @returns Latest parameter version if found
   */
  async getLatestParameterVersion(
    entityType: ParameterEntityType,
    entityId: string,
    parameterName: string
  ): Promise<IParameter | null> {
    try {
      // Build query for entityType, entityId, and parameterName
      const parameter = await this.model.findOne({
        entityType,
        entityId,
        parameterName
      }).sort({ version: -1 }).exec();

      // Return the latest parameter or null if not found
      return parameter;
    } catch (error) {
      // Handle and log any database errors
      logger.error('Error getting latest parameter version', {
        entityType,
        entityId,
        parameterName,
        error
      });
      throw new DatabaseError(`Failed to get latest parameter version: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Finds a parameter definition stored in the database
   * 
   * @param parameterName - Name of the parameter
   * @returns Parameter definition if found
   */
  async findParameterDefinition(parameterName: string): Promise<IParameter | null> {
    try {
      // Query for parameter with entityType SYSTEM and parameterName
      const definition = await this.model.findOne({
        entityType: ParameterEntityType.SYSTEM,
        parameterName
      }).exec();

      // Return the parameter definition or null if not found
      return definition;
    } catch (error) {
      // Handle and log any database errors
      logger.error('Error finding parameter definition', {
        parameterName,
        error
      });
      throw new DatabaseError(`Failed to find parameter definition: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets all parameter definitions
   * 
   * @returns Array of parameter definitions
   */
  async getAllParameterDefinitions(): Promise<IParameter[]> {
    try {
      // Query for all parameters with entityType SYSTEM
      const definitions = await this.model.find({
        entityType: ParameterEntityType.SYSTEM
      }).exec();

      // Return array of parameter definitions
      return definitions;
    } catch (error) {
      // Handle and log any database errors
      logger.error('Error getting all parameter definitions', { error });
      throw new DatabaseError(`Failed to get all parameter definitions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Saves a parameter definition to the database
   * 
   * @param definitionData - Parameter definition data
   * @returns The saved parameter definition
   */
  async saveParameterDefinition(definitionData: Partial<IParameter>): Promise<IParameter> {
    try {
      // Set entityType to SYSTEM
      const systemDefinition: Partial<IParameter> = {
        ...definitionData,
        entityType: ParameterEntityType.SYSTEM,
        entityId: 'SYSTEM'
      };

      // Check if definition already exists
      const existingDefinition = await this.findParameterDefinition(
        definitionData.parameterName as string
      );

      let savedDefinition: IParameter;

      if (existingDefinition) {
        // If exists, update it
        existingDefinition.value = systemDefinition.value;
        existingDefinition.updatedAt = new Date();
        if (systemDefinition.description) {
          existingDefinition.description = systemDefinition.description;
        }
        if (systemDefinition.overridable !== undefined) {
          existingDefinition.overridable = systemDefinition.overridable;
        }
        
        savedDefinition = await existingDefinition.save();
        logger.info('Parameter definition updated', {
          parameterName: definitionData.parameterName
        });
      } else {
        // Otherwise create new
        savedDefinition = await this.createParameter(systemDefinition);
        logger.info('Parameter definition created', {
          parameterName: definitionData.parameterName
        });
      }

      // Save and return the parameter definition
      return savedDefinition;
    } catch (error) {
      // Handle and log any database errors
      logger.error('Error saving parameter definition', {
        definitionData,
        error
      });
      throw new DatabaseError(`Failed to save parameter definition: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export default ParameterRepository;