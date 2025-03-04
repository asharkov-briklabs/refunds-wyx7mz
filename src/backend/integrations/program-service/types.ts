/**
 * Program Service API Integration Types
 * 
 * This file defines the TypeScript interfaces for requests and responses when
 * communicating with the Program Service. It provides type safety for the
 * integration layer and supports the hierarchical parameter resolution system
 * for refund configurations.
 */

import { 
  Program, 
  Organization,
  MerchantRefundConfiguration 
} from '../../common/interfaces/merchant.interface';
import { PaginationOptions } from '../merchant-service/types';

/**
 * Parameters for retrieving a specific program
 */
export interface GetProgramParams {
  /** Program's unique identifier */
  programId: string;
  /** Whether to include refund configuration in the response */
  includeConfiguration: boolean;
}

/**
 * Response structure when retrieving a program
 */
export interface ProgramResponse {
  /** The program details */
  program: Program;
}

/**
 * Parameters for retrieving a filtered list of programs
 */
export interface GetProgramsParams {
  /** Filter criteria for program selection */
  filters: ProgramFilterOptions;
  /** Pagination options for the request */
  pagination: PaginationOptions;
  /** Whether to include refund configuration in the response */
  includeConfiguration: boolean;
}

/**
 * Response structure when retrieving multiple programs
 */
export interface ProgramsResponse {
  /** Array of program details */
  programs: Program[];
  /** Total count of programs matching the filters */
  total: number;
  /** Current page number */
  page: number;
  /** Page size */
  pageSize: number;
}

/**
 * Parameters for validating a program's existence and status
 */
export interface ValidateProgramParams {
  /** Program's unique identifier */
  programId: string;
  /** Whether the program must be in active status */
  requireActive: boolean;
}

/**
 * Response structure for program validation operations
 */
export interface ProgramValidationResult {
  /** Whether the program is valid according to the criteria */
  valid: boolean;
  /** Reason for invalidity, if applicable */
  reason: string;
  /** Program details if valid */
  program: Program;
}

/**
 * Parameters for retrieving a program's refund configuration
 */
export interface GetProgramRefundConfigurationParams {
  /** Program's unique identifier */
  programId: string;
}

/**
 * Response structure for program refund configuration requests
 */
export interface ProgramRefundConfigurationResponse {
  /** Program-level refund configuration */
  configuration: MerchantRefundConfiguration;
}

/**
 * Parameters for updating a program's refund configuration
 */
export interface UpdateProgramRefundConfigurationParams {
  /** Program's unique identifier */
  programId: string;
  /** New refund configuration to apply */
  configuration: MerchantRefundConfiguration;
}

/**
 * Parameters for retrieving programs associated with a specific bank
 */
export interface GetProgramsByBankParams {
  /** Bank's unique identifier */
  bankId: string;
  /** Pagination options for the request */
  pagination: PaginationOptions;
  /** Whether to include refund configuration in the response */
  includeConfiguration: boolean;
}

/**
 * Parameters for retrieving organizations associated with a program
 */
export interface GetProgramOrganizationsParams {
  /** Program's unique identifier */
  programId: string;
  /** Pagination options for the request */
  pagination: PaginationOptions;
}

/**
 * Response structure when retrieving organizations for a program
 */
export interface OrganizationsResponse {
  /** Array of organization details */
  organizations: Organization[];
  /** Total count of organizations matching the filters */
  total: number;
  /** Current page number */
  page: number;
  /** Page size */
  pageSize: number;
}

/**
 * Filter options for querying programs
 */
export interface ProgramFilterOptions {
  /** Filter by bank identifier */
  bankId?: string;
  /** Filter by program status */
  status?: string;
  /** Filter by program name (partial match) */
  name?: string;
}

/**
 * Interface defining methods for interacting with the Program Service API
 */
export interface ProgramServiceClient {
  /**
   * Get a single program by ID
   * @param params Parameters for the request
   * @returns Promise resolving to the program response
   */
  getProgram(params: GetProgramParams): Promise<ProgramResponse>;

  /**
   * Get multiple programs with optional filtering
   * @param params Parameters for the request
   * @returns Promise resolving to the programs response
   */
  getPrograms(params: GetProgramsParams): Promise<ProgramsResponse>;

  /**
   * Get programs belonging to a specific bank
   * @param params Parameters for the request
   * @returns Promise resolving to the programs response
   */
  getProgramsByBank(params: GetProgramsByBankParams): Promise<ProgramsResponse>;

  /**
   * Get organizations associated with a program
   * @param params Parameters for the request
   * @returns Promise resolving to the organizations response
   */
  getProgramOrganizations(params: GetProgramOrganizationsParams): Promise<OrganizationsResponse>;

  /**
   * Validate if a program exists and is active
   * @param params Parameters for the request
   * @returns Promise resolving to the validation result
   */
  validateProgram(params: ValidateProgramParams): Promise<ProgramValidationResult>;

  /**
   * Get the refund configuration for a program
   * @param params Parameters for the request
   * @returns Promise resolving to the refund configuration response
   */
  getProgramRefundConfiguration(params: GetProgramRefundConfigurationParams): Promise<ProgramRefundConfigurationResponse>;

  /**
   * Update the refund configuration for a program
   * @param params Parameters for the request
   * @returns Promise resolving to the updated refund configuration response
   */
  updateProgramRefundConfiguration(params: UpdateProgramRefundConfigurationParams): Promise<ProgramRefundConfigurationResponse>;
}