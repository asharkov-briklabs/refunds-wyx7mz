/**
 * API service for managing configuration parameters in the Refunds Service frontend.
 * Provides methods for retrieving, creating, updating, and deleting parameters
 * across different entity levels (program, bank, organization, merchant), as well
 * as resolving parameter inheritance and retrieving parameter definitions.
 */

import apiClient from './api.client';
import { PARAMETER_ENDPOINTS } from '../../constants/api.constants';
import { 
  Parameter, 
  ParameterDefinition, 
  EntityType, 
  ParameterInheritanceList,
  ResolvedParameter
} from '../../types/parameter.types';
import { 
  ApiResponse, 
  ParameterCreateRequest, 
  ParameterUpdateRequest, 
  ParameterListParams,
  PaginatedResponse
} from '../../types/api.types';

/**
 * Fetches a paginated list of parameters for a specific entity
 * @param params Query parameters for filtering and pagination
 * @returns Promise resolving to a paginated list of parameters
 */
const getParameters = (
  params: ParameterListParams
): Promise<ApiResponse<PaginatedResponse<Parameter>>> => {
  // Construct query parameters from the provided params object
  const queryParams = {
    entityType: params.entityType,
    entityId: params.entityId,
    page: params.page,
    pageSize: params.pageSize,
    search: params.searchQuery
  };

  // Call apiClient.get with the parameters endpoint and query parameters
  return apiClient.get(PARAMETER_ENDPOINTS.BASE, queryParams);
};

/**
 * Fetches a specific parameter by name for an entity
 * @param parameterName The name of the parameter to retrieve
 * @param entityType The type of entity (MERCHANT, ORGANIZATION, PROGRAM, BANK)
 * @param entityId The ID of the entity
 * @returns Promise resolving to the requested parameter
 */
const getParameterByName = (
  parameterName: string,
  entityType: EntityType,
  entityId: string
): Promise<ApiResponse<Parameter>> => {
  // Construct the endpoint path using PARAMETER_ENDPOINTS.GET_BY_NAME
  const endpoint = PARAMETER_ENDPOINTS.GET_BY_NAME(parameterName);
  
  // Construct query parameters with entityType and entityId
  const queryParams = {
    entityType,
    entityId
  };

  // Call apiClient.get with the endpoint and entity query parameters
  return apiClient.get(endpoint, queryParams);
};

/**
 * Creates a new parameter for an entity
 * @param request Parameter creation request data
 * @returns Promise resolving to the created parameter
 */
const createParameter = (
  request: ParameterCreateRequest
): Promise<ApiResponse<Parameter>> => {
  // Call apiClient.post with the parameters endpoint and request data
  return apiClient.post(PARAMETER_ENDPOINTS.BASE, request);
};

/**
 * Updates an existing parameter for an entity
 * @param parameterName The name of the parameter to update
 * @param entityType The type of entity (MERCHANT, ORGANIZATION, PROGRAM, BANK)
 * @param entityId The ID of the entity
 * @param request Parameter update request data
 * @returns Promise resolving to the updated parameter
 */
const updateParameter = (
  parameterName: string,
  entityType: EntityType,
  entityId: string,
  request: ParameterUpdateRequest
): Promise<ApiResponse<Parameter>> => {
  // Construct the endpoint path using PARAMETER_ENDPOINTS.GET_BY_NAME
  const endpoint = PARAMETER_ENDPOINTS.GET_BY_NAME(parameterName);
  
  // Call apiClient.put with the endpoint, entity query parameters, and request data
  return apiClient.put(endpoint, request, {
    params: {
      entityType,
      entityId
    }
  });
};

/**
 * Deletes a parameter from an entity
 * @param parameterName The name of the parameter to delete
 * @param entityType The type of entity (MERCHANT, ORGANIZATION, PROGRAM, BANK)
 * @param entityId The ID of the entity
 * @returns Promise resolving when the parameter is deleted
 */
const deleteParameter = (
  parameterName: string,
  entityType: EntityType,
  entityId: string
): Promise<ApiResponse<void>> => {
  // Construct the endpoint path using PARAMETER_ENDPOINTS.GET_BY_NAME
  const endpoint = PARAMETER_ENDPOINTS.GET_BY_NAME(parameterName);
  
  // Call apiClient.delete with the endpoint and entity query parameters
  return apiClient.delete(endpoint, {
    params: {
      entityType,
      entityId
    }
  });
};

/**
 * Fetches the inheritance hierarchy for parameters of a specific entity
 * @param entityType The type of entity (MERCHANT, ORGANIZATION, PROGRAM, BANK)
 * @param entityId The ID of the entity
 * @returns Promise resolving to the parameter inheritance hierarchy
 */
const getParameterInheritance = (
  entityType: EntityType,
  entityId: string
): Promise<ApiResponse<ParameterInheritanceList>> => {
  // Construct query parameters with entityType and entityId
  const queryParams = {
    entityType,
    entityId
  };

  // Call apiClient.get with the inheritance endpoint and query parameters
  return apiClient.get(PARAMETER_ENDPOINTS.INHERITANCE, queryParams);
};

/**
 * Fetches all available parameter definitions
 * @returns Promise resolving to a list of parameter definitions
 */
const getParameterDefinitions = (): Promise<ApiResponse<ParameterDefinition[]>> => {
  // Call apiClient.get with the definitions endpoint
  return apiClient.get(PARAMETER_ENDPOINTS.DEFINITIONS);
};

/**
 * Resolves a parameter value for a specific entity, showing inheritance chain
 * @param parameterName The name of the parameter to resolve
 * @param entityType The type of entity (MERCHANT, ORGANIZATION, PROGRAM, BANK)
 * @param entityId The ID of the entity
 * @returns Promise resolving to the resolved parameter with inheritance chain
 */
const resolveParameter = (
  parameterName: string,
  entityType: EntityType,
  entityId: string
): Promise<ApiResponse<ResolvedParameter>> => {
  // Construct query parameters with parameterName, entityType, and entityId
  const queryParams = {
    parameterName,
    entityType,
    entityId
  };

  // Call apiClient.get with the resolve endpoint and query parameters
  return apiClient.get(PARAMETER_ENDPOINTS.RESOLVE, queryParams);
};

// Export all methods
export default {
  getParameters,
  getParameterByName,
  createParameter,
  updateParameter,
  deleteParameter,
  getParameterInheritance,
  getParameterDefinitions,
  resolveParameter
};