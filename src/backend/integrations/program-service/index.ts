/**
 * Program Service API Integration
 * 
 * This file serves as the main entry point for the Program Service integration module.
 * It re-exports all types, interfaces, and the client implementation for retrieving
 * and managing program configurations that are part of the hierarchical parameter
 * resolution system.
 * 
 * This module provides a simplified import path for other services needing to
 * interact with the Program Service.
 */

// Import all type definitions for program service integration
import * as ProgramServiceTypes from './types';

// Import the ProgramServiceClient implementation class
import { ProgramServiceClientImpl, createProgramServiceClient } from './client';

// Import default client singleton instance
import programServiceClient from './client';

// Re-export parameters interface for program retrieval
export type GetProgramParams = ProgramServiceTypes.GetProgramParams;

// Re-export interface for program response data
export type ProgramResponse = ProgramServiceTypes.ProgramResponse;

// Re-export parameters interface for retrieving multiple programs
export type GetProgramsParams = ProgramServiceTypes.GetProgramsParams;

// Re-export interface for program list response data
export type ProgramsResponse = ProgramServiceTypes.ProgramsResponse;

// Re-export parameters interface for program validation
export type ValidateProgramParams = ProgramServiceTypes.ValidateProgramParams;

// Re-export interface for program validation results
export type ProgramValidationResult = ProgramServiceTypes.ProgramValidationResult;

// Re-export parameters interface for retrieving program refund configuration
export type GetProgramRefundConfigurationParams = ProgramServiceTypes.GetProgramRefundConfigurationParams;

// Re-export interface for program refund configuration response
export type ProgramRefundConfigurationResponse = ProgramServiceTypes.ProgramRefundConfigurationResponse;

// Re-export parameters interface for updating program refund configuration
export type UpdateProgramRefundConfigurationParams = ProgramServiceTypes.UpdateProgramRefundConfigurationParams;

// Re-export parameters interface for retrieving programs by bank
export type GetProgramsByBankParams = ProgramServiceTypes.GetProgramsByBankParams;

// Re-export parameters interface for retrieving organizations in a program
export type GetProgramOrganizationsParams = ProgramServiceTypes.GetProgramOrganizationsParams;

// Re-export interface for program organizations response
export type OrganizationsResponse = ProgramServiceTypes.OrganizationsResponse;

// Re-export interface for program filtering options
export type ProgramFilterOptions = ProgramServiceTypes.ProgramFilterOptions;

// Re-export interface defining program service client methods
export type ProgramServiceClient = ProgramServiceTypes.ProgramServiceClient;

// Re-export the Program Service client implementation class
export { ProgramServiceClientImpl };

// Re-export factory function for creating client instances
export { createProgramServiceClient };

// Re-export default singleton client instance for simplified import
export default programServiceClient;