/**
 * TypeScript type definitions for configuration parameters in the Refunds Service frontend.
 * These types define the structure of parameter data, requests, responses, and related interfaces
 * used for managing hierarchical configuration parameters across different entity levels
 * (program, bank, organization, merchant).
 */

/**
 * Enumeration of entity types that can have parameter configurations
 */
export enum EntityType {
  MERCHANT = 'MERCHANT',
  ORGANIZATION = 'ORGANIZATION',
  PROGRAM = 'PROGRAM',
  BANK = 'BANK'
}

/**
 * Enumeration of supported data types for parameter values
 */
export enum ParameterDataType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  OBJECT = 'OBJECT',
  ARRAY = 'ARRAY',
  DECIMAL = 'DECIMAL'
}

/**
 * Enumeration of validation rule types for parameter values
 */
export enum ValidationRuleType {
  RANGE = 'RANGE',
  PATTERN = 'PATTERN',
  ENUM = 'ENUM'
}

/**
 * Enumeration of inheritance priority levels for parameter resolution
 */
export enum ParameterInheritanceLevel {
  MERCHANT = 1,
  ORGANIZATION = 2,
  PROGRAM = 3,
  BANK = 4,
  DEFAULT = 5
}

/**
 * Base interface for all parameter validation rules
 */
export interface IValidationRule {
  type: ValidationRuleType;
}

/**
 * Interface for range validation rules (min/max values)
 */
export interface IRangeValidationRule extends IValidationRule {
  type: ValidationRuleType.RANGE;
  min: number;
  max: number;
}

/**
 * Interface for pattern validation rules (regex patterns)
 */
export interface IPatternValidationRule extends IValidationRule {
  type: ValidationRuleType.PATTERN;
  pattern: string;
}

/**
 * Interface for enum validation rules (allowed values)
 */
export interface IEnumValidationRule extends IValidationRule {
  type: ValidationRuleType.ENUM;
  values: any[];
}

/**
 * Interface for validation result containing success flag and error messages
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Interface defining the structure and constraints of a parameter
 */
export interface ParameterDefinition {
  name: string;
  description: string;
  dataType: ParameterDataType;
  defaultValue: any;
  validationRules: IValidationRule[];
  overridable: boolean;
  category: string;
  sensitivity: string;
  auditRequired: boolean;
}

/**
 * Interface for a parameter value at a specific level in the hierarchy
 */
export interface Parameter {
  id: string;
  entityType: EntityType;
  entityId: string;
  parameterName: string;
  value: any;
  effectiveDate: string;
  expirationDate: string | null;
  overridden: boolean;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  definition: ParameterDefinition;
}

/**
 * Interface for creating a new parameter
 */
export interface ParameterCreateRequest {
  entityType: EntityType;
  entityId: string;
  parameterName: string;
  value: any;
  effectiveDate: string;
  expirationDate: string | null;
}

/**
 * Interface for updating an existing parameter
 */
export interface ParameterUpdateRequest {
  value: any;
  effectiveDate: string;
  expirationDate: string | null;
  version: number; // For optimistic concurrency control
}

/**
 * Interface for parameter list query parameters
 */
export interface ParameterListParams {
  entityType: EntityType;
  entityId: string;
  page: number;
  pageSize: number;
  includeInherited: boolean;
  search: string;
  category: string;
}

/**
 * Interface for paginated parameter list response
 */
export interface ParameterListResponse {
  parameters: Parameter[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Interface representing an entity in the inheritance chain
 */
export interface InheritanceEntity {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  level: ParameterInheritanceLevel;
}

/**
 * Interface representing the inheritance chain for parameters
 */
export interface ParameterInheritanceList {
  current: InheritanceEntity;
  inheritance: InheritanceEntity[];
}

/**
 * Interface showing a parameter value at each level of inheritance
 */
export interface ParameterInheritanceValue {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  value: any;
  level: ParameterInheritanceLevel;
  isEffective: boolean;
}

/**
 * Interface showing a resolved parameter with its value inheritance chain
 */
export interface ResolvedParameter {
  parameterName: string;
  definition: ParameterDefinition;
  effectiveValue: any;
  inheritanceValues: ParameterInheritanceValue[];
  effectiveLevel: ParameterInheritanceLevel;
}