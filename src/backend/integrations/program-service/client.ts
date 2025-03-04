import axios, { AxiosInstance, AxiosError } from 'axios'; // axios ^1.3.5
import axiosRetry from 'axios-retry'; // axios-retry ^3.4.0
import { 
  Program,
  Organization
} from '../../common/interfaces/merchant.interface';
import { 
  logger, 
  metrics 
} from '../../common/utils';
import { GatewayError } from '../../common/errors';
import servicesConfig from '../../config/services';
import { 
  GetProgramParams,
  GetProgramsParams,
  ProgramResponse,
  ProgramsResponse,
  ValidateProgramParams,
  ProgramValidationResult,
  GetProgramRefundConfigurationParams,
  ProgramRefundConfigurationResponse,
  UpdateProgramRefundConfigurationParams,
  GetProgramsByBankParams,
  GetProgramOrganizationsParams,
  OrganizationsResponse,
  ProgramServiceClient as ProgramServiceClientInterface
} from './types';

/**
 * Factory function to create a configured instance of the Program Service client
 * @param config 
 * @returns A configured program service client instance
 */
export function createProgramServiceClient(config: any = servicesConfig.programService): ProgramServiceClientImpl {
  return new ProgramServiceClientImpl(config);
}

/**
 * Client implementation for interacting with the Program Service API
 */
export class ProgramServiceClientImpl implements ProgramServiceClientInterface {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private retries: number;
  private retryDelay: number;
  private httpClient: AxiosInstance;

  /**
   * Creates a new instance of the Program Service client
   * @param config 
   */
  constructor(config: any) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout;
    this.retries = config.retries;
    this.retryDelay = config.retryDelay;

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
    });

    axiosRetry(this.httpClient, {
      retries: this.retries,
      retryDelay: (retryCount) => {
        return retryCount * this.retryDelay;
      },
      retryCondition: (error: AxiosError) => {
        return error.response?.status === 503 || error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED';
      },
    });

    this.httpClient.interceptors.request.use(
      (request) => {
        logger.debug(`ProgramService Request: ${request.method} ${request.url}`, { headers: request.headers, data: request.data });
        return request;
      },
      (error) => {
        logger.error('ProgramService Request Error', { error });
        return Promise.reject(error);
      }
    );

    this.httpClient.interceptors.response.use(
      (response) => {
        logger.debug(`ProgramService Response: ${response.status} ${response.config.url}`, { data: response.data });
        return response;
      },
      (error) => {
        logger.error('ProgramService Response Error', { error });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Retrieves a program by ID
   * @param params 
   * @returns Program details if found, null otherwise
   */
  async getProgram(params: GetProgramParams): Promise<ProgramResponse> {
    logger.info('Retrieving program', { programId: params.programId });

    if (!params.programId) {
      throw new Error('Program ID is required');
    }

    return metrics.timeAsyncFn(
      'program_service.get_program',
      async () => {
        try {
          const response = await this.httpClient.get<ProgramResponse>(`/programs/${params.programId}`, {
            params: {
              includeConfiguration: params.includeConfiguration
            }
          });
          logger.debug('Successfully retrieved program', { programId: params.programId });
          metrics.incrementCounter('program_service.get_program.success');
          return response.data;
        } catch (error: any) {
          if (error.response?.status === 404) {
            logger.info('Program not found', { programId: params.programId });
            return null;
          }
          this.handleError(error, 'getProgram');
        }
      }
    );
  }

  /**
   * Retrieves a list of programs with optional filters
   * @param params 
   * @returns List of programs matching the filter criteria
   */
  async getPrograms(params: GetProgramsParams): Promise<ProgramsResponse> {
    logger.info('Retrieving programs', { filters: params.filters });

    return metrics.timeAsyncFn(
      'program_service.get_programs',
      async () => {
        try {
          const response = await this.httpClient.get<ProgramsResponse>('/programs', {
            params: {
              ...params.filters,
              page: params.pagination.page,
              pageSize: params.pagination.pageSize,
              includeConfiguration: params.includeConfiguration
            }
          });
          logger.debug('Successfully retrieved programs', { total: response.data.total });
          metrics.incrementCounter('program_service.get_programs.success');
          return response.data;
        } catch (error: any) {
          this.handleError(error, 'getPrograms');
        }
      }
    );
  }

  /**
   * Retrieves programs associated with a specific bank
   * @param params 
   * @returns List of programs for the specified bank
   */
  async getProgramsByBank(params: GetProgramsByBankParams): Promise<ProgramsResponse> {
    logger.info('Retrieving programs by bank', { bankId: params.bankId });

    if (!params.bankId) {
      throw new Error('Bank ID is required');
    }

    return metrics.timeAsyncFn(
      'program_service.get_programs_by_bank',
      async () => {
        try {
          const response = await this.httpClient.get<ProgramsResponse>(`/banks/${params.bankId}/programs`, {
            params: {
              page: params.pagination.page,
              pageSize: params.pagination.pageSize,
              includeConfiguration: params.includeConfiguration
            }
          });
          logger.debug('Successfully retrieved programs by bank', { bankId: params.bankId, total: response.data.total });
          metrics.incrementCounter('program_service.get_programs_by_bank.success');
          return response.data;
        } catch (error: any) {
          this.handleError(error, 'getProgramsByBank');
        }
      }
    );
  }

  /**
   * Retrieves organizations associated with a program
   * @param params 
   * @returns List of organizations for the program
   */
  async getProgramOrganizations(params: GetProgramOrganizationsParams): Promise<OrganizationsResponse> {
    logger.info('Retrieving program organizations', { programId: params.programId });

    if (!params.programId) {
      throw new Error('Program ID is required');
    }

    return metrics.timeAsyncFn(
      'program_service.get_program_organizations',
      async () => {
        try {
          const response = await this.httpClient.get<OrganizationsResponse>(`/programs/${params.programId}/organizations`, {
            params: {
              page: params.pagination.page,
              pageSize: params.pagination.pageSize
            }
          });
          logger.debug('Successfully retrieved program organizations', { programId: params.programId, total: response.data.total });
          metrics.incrementCounter('program_service.get_program_organizations.success');
          return response.data;
        } catch (error: any) {
          this.handleError(error, 'getProgramOrganizations');
        }
      }
    );
  }

  /**
   * Validates if a program exists and is in the required state
   * @param params 
   * @returns Result of program validation
   */
  async validateProgram(params: ValidateProgramParams): Promise<ProgramValidationResult> {
    logger.info('Validating program', { programId: params.programId });

    if (!params.programId) {
      throw new Error('Program ID is required');
    }

    return metrics.timeAsyncFn(
      'program_service.validate_program',
      async () => {
        try {
          const response = await this.httpClient.post<ProgramValidationResult>('/programs/validate', params);
          logger.debug('Successfully validated program', { programId: params.programId, valid: response.data.valid });
          metrics.incrementCounter('program_service.validate_program.success');
          return response.data;
        } catch (error: any) {
          this.handleError(error, 'validateProgram');
        }
      }
    );
  }

  /**
   * Retrieves the refund configuration for a program
   * @param params 
   * @returns Program refund configuration
   */
  async getProgramRefundConfiguration(params: GetProgramRefundConfigurationParams): Promise<ProgramRefundConfigurationResponse> {
    logger.info('Retrieving program refund configuration', { programId: params.programId });

    if (!params.programId) {
      throw new Error('Program ID is required');
    }

    return metrics.timeAsyncFn(
      'program_service.get_program_refund_configuration',
      async () => {
        try {
          const response = await this.httpClient.get<ProgramRefundConfigurationResponse>(`/programs/${params.programId}/refund-configuration`);
          logger.debug('Successfully retrieved program refund configuration', { programId: params.programId });
          metrics.incrementCounter('program_service.get_program_refund_configuration.success');
          return response.data;
        } catch (error: any) {
          this.handleError(error, 'getProgramRefundConfiguration');
        }
      }
    );
  }

  /**
   * Updates the refund configuration for a program
   * @param params 
   * @returns Updated program refund configuration
   */
  async updateProgramRefundConfiguration(params: UpdateProgramRefundConfigurationParams): Promise<ProgramRefundConfigurationResponse> {
    logger.info('Updating program refund configuration', { programId: params.programId });

    if (!params.programId || !params.configuration) {
      throw new Error('Program ID and configuration are required');
    }

    return metrics.timeAsyncFn(
      'program_service.update_program_refund_configuration',
      async () => {
        try {
          const response = await this.httpClient.put<ProgramRefundConfigurationResponse>(`/programs/${params.programId}/refund-configuration`, params.configuration);
          logger.debug('Successfully updated program refund configuration', { programId: params.programId });
          metrics.incrementCounter('program_service.update_program_refund_configuration.success');
          return response.data;
        } catch (error: any) {
          this.handleError(error, 'updateProgramRefundConfiguration');
        }
      }
    );
  }

  /**
   * Handles and transforms API errors into appropriate application errors
   * @param error 
   * @returns never
   */
  private handleError(error: any, operation: string): never {
    let errorMessage = 'Failed to communicate with Program Service';
    let errorCode = 'PROGRAM_SERVICE_ERROR';
    let details = {};
  
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      errorMessage = axiosError.message;
      details = {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        url: axiosError.config?.url,
        method: axiosError.config?.method,
      };
  
      if (axiosError.response?.status === 404) {
        errorCode = 'PROGRAM_NOT_FOUND';
        errorMessage = 'Program not found';
      } else if (axiosError.response?.status === 400) {
        errorCode = 'INVALID_PROGRAM_DATA';
        errorMessage = 'Invalid program data';
      } else if (axiosError.code === 'ECONNABORTED') {
        errorCode = 'PROGRAM_SERVICE_TIMEOUT';
        errorMessage = `Program Service request timed out after ${this.timeout}ms`;
      } else if (axiosError.code === 'ECONNREFUSED') {
        errorCode = 'PROGRAM_SERVICE_UNAVAILABLE';
        errorMessage = 'Program Service is currently unavailable';
      }
    }
  
    logger.error(`Program Service ${operation} failed`, { error, errorCode, errorMessage, details });
    metrics.incrementCounter(`program_service.${operation}.error`, 1, { error_code: errorCode });
  
    throw new GatewayError(errorCode, errorMessage, details);
  }
}

// Create a singleton instance of the Program Service client
const programServiceClient = createProgramServiceClient();

// Export the Program Service client implementation class
export { ProgramServiceClientImpl };

// Export factory function for creating Program Service client instances
export { createProgramServiceClient };

// Export the singleton instance as default
export default programServiceClient;