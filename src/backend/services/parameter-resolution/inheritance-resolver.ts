/**
 * Inheritance Resolver for Parameter Resolution Service
 *
 * Implements the core inheritance resolution logic for parameters across the hierarchical
 * levels of merchant, organization, program, bank, and default values. This resolver
 * traverses the entity hierarchy to find the most specific parameter value according to
 * inheritance rules.
 */

import { debug, info, error } from '../../common/utils/logger';
import parameterRepository from '../../database/repositories/parameter.repo';
import { 
  ParameterEntityType,
  ParameterInheritanceLevel
} from './models/parameter-value.model';
import ParameterValue from './models/parameter-value.model';
import ParameterDefinition from './models/parameter-definition.model';
import { createMerchantServiceClient } from '../../integrations/merchant-service/client';

/**
 * Resolves parameter values across the inheritance hierarchy from merchant to organization 
 * to program to bank to default values
 */
export default class InheritanceResolver {
  private merchantServiceClient;
  private parameterDefinitions: Map<string, ParameterDefinition>;

  /**
   * Initializes the inheritance resolver with merchant service client and parameter definitions
   * 
   * @param parameterDefinitions - Map of parameter definitions for accessing default values
   */
  constructor(parameterDefinitions: Map<string, ParameterDefinition>) {
    this.merchantServiceClient = createMerchantServiceClient();
    this.parameterDefinitions = parameterDefinitions;
  }

  /**
   * Resolves a parameter value by traversing the inheritance hierarchy
   * 
   * @param parameterName - Name of the parameter to resolve
   * @param merchantId - Merchant ID to resolve parameter for
   * @returns Promise resolving to the parameter value with source level information
   */
  async resolveParameter(parameterName: string, merchantId: string): Promise<ParameterValue> {
    try {
      debug(`Resolving parameter: ${parameterName} for merchant: ${merchantId}`);
      
      // Get the full inheritance chain for this merchant
      const inheritanceChain = await this.getInheritanceChain(merchantId);
      
      // Iterate through the inheritance chain from most specific to least specific
      for (const entity of inheritanceChain) {
        const { entityType, entityId } = entity;
        
        // Find active parameter for this entity level
        const parameterValue = await parameterRepository.findActiveParameter(
          entityType as ParameterEntityType,
          entityId,
          parameterName
        );
        
        // If found, return it with appropriate inheritance level
        if (parameterValue) {
          debug(`Found parameter ${parameterName} at ${entityType} level`);
          
          // Convert from database model to domain model
          return new ParameterValue({
            id: parameterValue._id.toString(),
            entityType: parameterValue.entityType,
            entityId: parameterValue.entityId,
            parameterName: parameterValue.parameterName,
            value: parameterValue.value,
            effectiveDate: parameterValue.effectiveDate,
            expirationDate: parameterValue.expirationDate,
            overridden: true,
            version: parameterValue.version,
            createdBy: parameterValue.createdBy,
            createdAt: parameterValue.createdAt,
            updatedAt: parameterValue.updatedAt
          });
        }
      }
      
      // If parameter wasn't found in the hierarchy, use default from parameter definition
      const parameterDefinition = this.parameterDefinitions.get(parameterName);
      
      if (!parameterDefinition) {
        throw new Error(`Parameter definition not found for: ${parameterName}`);
      }
      
      debug(`Using default value for parameter: ${parameterName}`);
      
      // Return a ParameterValue with the default value and DEFAULT inheritance level
      return new ParameterValue({
        id: `default_${parameterName}`,
        entityType: ParameterEntityType.BANK, // DEFAULT level doesn't have a direct ParameterEntityType equivalent
        entityId: 'DEFAULT',
        parameterName: parameterName,
        value: parameterDefinition.defaultValue,
        effectiveDate: new Date(0), // Always effective
        expirationDate: null, // Never expires
        overridden: false,
        version: 1,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (err) {
      error(`Error resolving parameter: ${parameterName} for merchant: ${merchantId}`, {
        error: err,
        parameterName,
        merchantId
      });
      throw err;
    }
  }

  /**
   * Efficiently resolves multiple parameters in a batch operation
   * 
   * @param parameterNames - Array of parameter names to resolve
   * @param merchantId - Merchant ID to resolve parameters for
   * @returns Map of parameter names to resolved values
   */
  async resolveMultipleParameters(
    parameterNames: string[],
    merchantId: string
  ): Promise<Map<string, ParameterValue>> {
    try {
      debug(`Resolving multiple parameters for merchant: ${merchantId}`, {
        parameterCount: parameterNames.length,
        parameters: parameterNames
      });
      
      // Get the full inheritance chain for this merchant
      const inheritanceChain = await this.getInheritanceChain(merchantId);
      
      // Map to collect resolved parameters
      const resolvedParameters = new Map<string, ParameterValue>();
      
      // Track which parameters are still unresolved
      const unresolvedParameters = new Set<string>(parameterNames);
      
      // Process each level in the inheritance chain
      for (const entity of inheritanceChain) {
        // Skip this level if all parameters are already resolved
        if (unresolvedParameters.size === 0) {
          break;
        }
        
        const { entityType, entityId } = entity;
        
        // Get all parameters at this entity level in one database query
        const entityParameters = await this.getEntityParameters(
          entityType as ParameterEntityType,
          entityId
        );
        
        // Check if any unresolved parameters are defined at this level
        for (const paramName of unresolvedParameters) {
          const parameter = entityParameters.get(paramName);
          
          if (parameter) {
            // Add to resolved parameters and remove from unresolved set
            resolvedParameters.set(paramName, parameter);
            unresolvedParameters.delete(paramName);
          }
        }
      }
      
      // For any remaining unresolved parameters, use defaults
      for (const paramName of unresolvedParameters) {
        const parameterDefinition = this.parameterDefinitions.get(paramName);
        
        if (!parameterDefinition) {
          error(`Parameter definition not found: ${paramName}`);
          continue;
        }
        
        // Create parameter value with default
        const defaultValue = new ParameterValue({
          id: `default_${paramName}`,
          entityType: ParameterEntityType.BANK, // DEFAULT level doesn't have a direct ParameterEntityType equivalent
          entityId: 'DEFAULT',
          parameterName: paramName,
          value: parameterDefinition.defaultValue,
          effectiveDate: new Date(0), // Always effective
          expirationDate: null, // Never expires
          overridden: false,
          version: 1,
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        resolvedParameters.set(paramName, defaultValue);
      }
      
      return resolvedParameters;
    } catch (err) {
      error(`Error resolving multiple parameters for merchant: ${merchantId}`, {
        error: err,
        parameterNames,
        merchantId
      });
      throw err;
    }
  }

  /**
   * Gets all effective parameters for a merchant across all hierarchy levels
   * 
   * @param merchantId - Merchant ID to get parameters for
   * @returns Map of parameter names to their effective values
   */
  async getEffectiveParameters(merchantId: string): Promise<Map<string, ParameterValue>> {
    try {
      debug(`Getting effective parameters for merchant: ${merchantId}`);
      
      // Get the full inheritance chain for this merchant
      const inheritanceChain = await this.getInheritanceChain(merchantId);
      
      // Map to collect effective parameters
      const effectiveParameters = new Map<string, ParameterValue>();
      
      // Set to track which parameters have already been resolved at higher levels
      const resolvedParameterNames = new Set<string>();
      
      // Process each level in the inheritance chain
      for (const entity of inheritanceChain) {
        const { entityType, entityId } = entity;
        
        // Get all parameters at this entity level
        const entityParameters = await parameterRepository.findParametersByEntity(
          entityType as ParameterEntityType,
          entityId
        );
        
        // Process each parameter at this level
        for (const param of entityParameters) {
          // Skip if this parameter was already resolved at a higher level
          if (resolvedParameterNames.has(param.parameterName)) {
            continue;
          }
          
          // Check if the parameter is currently active
          const now = new Date();
          const isActive = 
            param.effectiveDate <= now && 
            (!param.expirationDate || param.expirationDate > now);
          
          if (isActive) {
            // Add to effective parameters and mark as resolved
            const parameterValue = new ParameterValue({
              id: param._id.toString(),
              entityType: param.entityType,
              entityId: param.entityId,
              parameterName: param.parameterName,
              value: param.value,
              effectiveDate: param.effectiveDate,
              expirationDate: param.expirationDate,
              overridden: true,
              version: param.version,
              createdBy: param.createdBy,
              createdAt: param.createdAt,
              updatedAt: param.updatedAt
            });
            
            effectiveParameters.set(param.parameterName, parameterValue);
            resolvedParameterNames.add(param.parameterName);
          }
        }
      }
      
      // Add default values for any parameter with a definition that wasn't found in the hierarchy
      for (const [paramName, definition] of this.parameterDefinitions.entries()) {
        if (!resolvedParameterNames.has(paramName)) {
          const defaultValue = new ParameterValue({
            id: `default_${paramName}`,
            entityType: ParameterEntityType.BANK, // DEFAULT level doesn't have a direct equivalent
            entityId: 'DEFAULT',
            parameterName: paramName,
            value: definition.defaultValue,
            effectiveDate: new Date(0), // Always effective
            expirationDate: null, // Never expires
            overridden: false,
            version: 1,
            createdBy: 'system',
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          effectiveParameters.set(paramName, defaultValue);
        }
      }
      
      return effectiveParameters;
    } catch (err) {
      error(`Error getting effective parameters for merchant: ${merchantId}`, {
        error: err,
        merchantId
      });
      throw err;
    }
  }

  /**
   * Retrieves the complete inheritance chain for a merchant
   * 
   * @param merchantId - Merchant ID to get inheritance chain for
   * @returns Ordered array of entities in the inheritance chain
   */
  async getInheritanceChain(
    merchantId: string
  ): Promise<Array<{entityType: ParameterEntityType, entityId: string}>> {
    try {
      debug(`Getting inheritance chain for merchant: ${merchantId}`);
      
      // Get merchant details from the merchant service
      const merchant = await this.merchantServiceClient.getMerchant(merchantId);
      
      // Build inheritance chain from merchant to organization to program to bank
      const inheritanceChain = [
        { entityType: ParameterEntityType.MERCHANT, entityId: merchantId }
      ];
      
      // Add organization level if the merchant has an organization
      if (merchant.organization_id) {
        inheritanceChain.push({
          entityType: ParameterEntityType.ORGANIZATION,
          entityId: merchant.organization_id
        });
      }
      
      // Add program level if the merchant has a program
      if (merchant.program_id) {
        inheritanceChain.push({
          entityType: ParameterEntityType.PROGRAM,
          entityId: merchant.program_id
        });
      }
      
      // Add bank level if the merchant has a bank
      if (merchant.bank_id) {
        inheritanceChain.push({
          entityType: ParameterEntityType.BANK,
          entityId: merchant.bank_id
        });
      }
      
      info(`Inheritance chain built for merchant: ${merchantId}`, {
        merchantId,
        chainLength: inheritanceChain.length
      });
      
      return inheritanceChain;
    } catch (err) {
      error(`Error getting inheritance chain for merchant: ${merchantId}`, {
        error: err,
        merchantId
      });
      
      // Return partial chain with just merchant if we can't get the full chain
      return [{ entityType: ParameterEntityType.MERCHANT, entityId: merchantId }];
    }
  }

  /**
   * Gets all parameters defined at a specific entity level
   * 
   * @param entityType - Entity type to get parameters for
   * @param entityId - Entity ID to get parameters for
   * @returns Map of parameter names to values at this entity level
   */
  async getEntityParameters(
    entityType: ParameterEntityType,
    entityId: string
  ): Promise<Map<string, ParameterValue>> {
    try {
      debug(`Getting parameters for entity: ${entityType}:${entityId}`);
      
      // Query database for all active parameters for this entity
      const parameters = await parameterRepository.findParametersByEntity(
        entityType,
        entityId,
        { filters: {} } // No additional filters
      );
      
      // Map to store parameters by name
      const parameterMap = new Map<string, ParameterValue>();
      
      // Current date for checking if parameters are active
      const now = new Date();
      
      // Convert each parameter and add to map if active
      for (const param of parameters) {
        const isActive = 
          param.effectiveDate <= now && 
          (!param.expirationDate || param.expirationDate > now);
        
        if (isActive) {
          const parameterValue = new ParameterValue({
            id: param._id.toString(),
            entityType: param.entityType,
            entityId: param.entityId,
            parameterName: param.parameterName,
            value: param.value,
            effectiveDate: param.effectiveDate,
            expirationDate: param.expirationDate,
            overridden: true,
            version: param.version,
            createdBy: param.createdBy,
            createdAt: param.createdAt,
            updatedAt: param.updatedAt
          });
          
          parameterMap.set(param.parameterName, parameterValue);
        }
      }
      
      return parameterMap;
    } catch (err) {
      error(`Error getting parameters for entity: ${entityType}:${entityId}`, {
        error: err,
        entityType,
        entityId
      });
      
      // Return empty map on error
      return new Map<string, ParameterValue>();
    }
  }
}