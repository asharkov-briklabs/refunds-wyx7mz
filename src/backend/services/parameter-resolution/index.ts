import { logger } from '../../common/utils/logger'; // Import logger for logging
import ParameterResolutionService from './parameter-resolution.service'; // Import the main service class
import { PARAMETER_EVENTS } from './parameter-resolution.service'; // Import event types for parameter changes
import * as Models from './models'; // Import all parameter models, types, and interfaces
import ParameterCache, { cacheKey } from './cache-manager'; // Import the cache manager and utility function
import InheritanceResolver from './inheritance-resolver'; // Import the inheritance resolver

// Initialize the ParameterResolutionService with default settings
const parameterResolutionService = new ParameterResolutionService();

// Initialize the service to load parameter definitions from the database
parameterResolutionService.initialize()
  .then(() => {
    logger.info('Parameter Resolution Service started successfully.'); // Log successful initialization
  })
  .catch(err => {
    logger.error('Failed to start Parameter Resolution Service.', { error: err }); // Log initialization failure
  });

// Export the initialized service and related components
export default parameterResolutionService; // Export the main service instance
export {
  PARAMETER_EVENTS, // Export event types for parameter change notifications
  ParameterCache, // Export the cache manager class
	InheritanceResolver, // Export the inheritance resolver class
  Models, // Export all parameter models, types, and interfaces
  cacheKey, // Export the cache key utility function
  ParameterResolutionService, //Also export the class itself
  Models.ParameterDefinition,
  Models.ParameterValue,
  Models.ParameterEntityType,
  Models.ParameterDataType
};