/**
 * Parameter Resolution Models Barrel File
 * 
 * This file re-exports all model classes, interfaces, and types used by the
 * Parameter Resolution Service. It centralizes imports to simplify importing
 * these models throughout the application.
 */

// Import parameter definition models
import ParameterDefinition from './parameter-definition.model';
import {
  ValidationResult,
  ParameterDataType,
  ValidationRuleType,
  IValidationRule,
  IRangeValidationRule,
  IPatternValidationRule,
  IEnumValidationRule,
  IParameterDefinitionInit
} from './parameter-definition.model';

// Import parameter value models
import ParameterValue from './parameter-value.model';
import {
  ParameterEntityType,
  ParameterInheritanceLevel,
  IParameterValueInit
} from './parameter-value.model';

// Re-export all models, interfaces, and types
export {
  // Parameter Definition exports
  ParameterDefinition,
  ValidationResult,
  ParameterDataType,
  ValidationRuleType,
  IValidationRule,
  IRangeValidationRule,
  IPatternValidationRule,
  IEnumValidationRule,
  IParameterDefinitionInit,
  
  // Parameter Value exports
  ParameterValue,
  ParameterEntityType,
  ParameterInheritanceLevel,
  IParameterValueInit
};