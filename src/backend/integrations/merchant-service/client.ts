import axios, { AxiosError } from 'axios'; // axios@^1.3.4
import { 
  MerchantServiceClient,
  Merchant,
  Organization,
  Program,
  Bank,
  MerchantRefundConfiguration
} from '../../common/interfaces/merchant.interface';
import {
  GetMerchantParams,
  MerchantResponse,
  GetMerchantsParams,
  MerchantsResponse,
  ValidateMerchantParams,
  MerchantValidationResult,
  GetRefundConfigurationParams,
  RefundConfigurationResponse,
  GetOrganizationParams,
  OrganizationResponse,
  GetProgramParams,
  ProgramResponse,
  GetBankParams,
  BankResponse
} from './types';
import { logger } from '../../common/utils/logger';
import { ApiError } from '../../common/errors/api-error';
import { ErrorCode } from '../../common/constants/error-codes';
import { 
  attachCorrelationIdToClient,
  CORRELATION_ID_HEADER
} from '../../common/middleware/correlation-id';
import serviceConfig from '../../config/services';

// Singleton instance for the Merchant Service client
let _merchantServiceClientInstance: MerchantServiceClientImpl | null = null;

/**
 * Factory function that creates or returns the singleton instance of the Merchant Service client
 * 
 * @param options - Optional configuration options for the client
 * @returns Merchant Service client instance
 */
export function createMerchantServiceClient(options: any = {}): MerchantServiceClient {
  if (!_merchantServiceClientInstance) {
    _merchantServiceClientInstance = new MerchantServiceClientImpl(options);
  }
  return _merchantServiceClientInstance;
}

/**
 * Implementation of the Merchant Service client that handles communication with the Merchant Service API.
 */
export class MerchantServiceClientImpl implements MerchantServiceClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;
  private retryDelay: number;
  private httpClient: axios.AxiosInstance;

  /**
   * Initializes a new instance of the Merchant Service client
   * 
   * @param options - Configuration options for the client
   */
  constructor(options: any = {}) {
    // Get Merchant Service configuration from service config
    const merchantConfig = serviceConfig.merchantService;
    
    // Set the base URL, timeout, retries, and retry delay from config or options
    this.baseUrl = options.baseUrl || merchantConfig.baseUrl;
    this.timeout = options.timeout || merchantConfig.timeout;
    this.retries = options.retries || merchantConfig.retries;
    this.retryDelay = options.retryDelay || merchantConfig.retryDelay;
    
    // Create an Axios HTTP client instance
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    // Set up request interceptor to attach correlation ID
    this.httpClient.interceptors.request.use((config) => {
      config.headers = attachCorrelationIdToClient(config.headers || {});
      return config;
    });
    
    // Set up response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Let the _handleApiError method handle specific error conditions
        throw error;
      }
    );
    
    logger.info(`Merchant Service client initialized`, {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retries: this.retries
    });
  }

  /**
   * Retrieves a merchant by ID
   * 
   * @param merchantId - The merchant's ID
   * @returns Promise resolving to the merchant
   */
  async getMerchant(merchantId: string): Promise<Merchant>;
  /**
   * Retrieves a merchant by ID with additional options
   * 
   * @param params - Parameters for the request
   * @returns Promise resolving to the merchant response
   */
  async getMerchant(params: GetMerchantParams): Promise<MerchantResponse>;
  async getMerchant(
    merchantIdOrParams: string | GetMerchantParams
  ): Promise<Merchant | MerchantResponse> {
    try {
      // Convert string ID to params object if needed
      const params: GetMerchantParams = typeof merchantIdOrParams === 'string'
        ? { merchantId: merchantIdOrParams }
        : merchantIdOrParams;
      
      // Validate required parameters
      if (!params.merchantId) {
        throw new ApiError(
          ErrorCode.REQUIRED_FIELD_MISSING,
          'Merchant ID is required',
          { field: 'merchantId' }
        );
      }
      
      // Construct query parameters including optional flags
      const queryParams: Record<string, any> = {};
      if (params.includeConfiguration !== undefined) {
        queryParams.includeConfiguration = params.includeConfiguration;
      }
      
      // Send GET request to merchant endpoint
      const response = await this._retryRequest(() => 
        this.httpClient.get(`/merchants/${encodeURIComponent(params.merchantId)}`, {
          params: queryParams
        })
      );
      
      logger.debug(`Retrieved merchant data`, {
        merchantId: params.merchantId,
        includeConfiguration: params.includeConfiguration
      });
      
      // Return the merchant object for the simple interface or the full response for the complex one
      return typeof merchantIdOrParams === 'string' 
        ? response.data.merchant 
        : response.data;
    } catch (error) {
      return this._handleApiError(error);
    }
  }

  /**
   * Retrieves a list of merchants based on filters
   * 
   * @param filter - Optional filter criteria
   * @returns Promise resolving to an array of merchants
   */
  async getMerchants(filter?: any): Promise<Merchant[]>;
  /**
   * Retrieves a list of merchants based on filters and pagination
   * 
   * @param params - Parameters for the request
   * @returns Promise resolving to the merchants response
   */
  async getMerchants(params: GetMerchantsParams): Promise<MerchantsResponse>;
  async getMerchants(
    filterOrParams?: any | GetMerchantsParams
  ): Promise<Merchant[] | MerchantsResponse> {
    try {
      // Apply default values to pagination and filters if not provided
      const params: GetMerchantsParams = !filterOrParams || typeof filterOrParams !== 'object'
        ? {}
        : ('filters' in filterOrParams || 'pagination' in filterOrParams)
          ? filterOrParams
          : { filters: filterOrParams };
      
      const pagination = params.pagination || { page: 0, pageSize: 20 };
      const filters = params.filters || {};
      
      // Construct query parameters
      const queryParams: Record<string, any> = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        ...filters
      };
      
      if (params.includeConfiguration !== undefined) {
        queryParams.includeConfiguration = params.includeConfiguration;
      }
      
      // Send GET request to merchants endpoint
      const response = await this._retryRequest(() => 
        this.httpClient.get('/merchants', {
          params: queryParams
        })
      );
      
      logger.debug(`Retrieved merchants list`, {
        filters: params.filters,
        pagination: pagination,
        resultCount: response.data.merchants?.length || 0
      });
      
      // Return the merchants array for the simple interface or the full response for the complex one
      return !filterOrParams || typeof filterOrParams !== 'object' || 
             !('filters' in filterOrParams || 'pagination' in filterOrParams)
        ? response.data.merchants
        : response.data;
    } catch (error) {
      return this._handleApiError(error);
    }
  }

  /**
   * Retrieves all merchants belonging to a specific organization
   * 
   * @param organizationId - The organization ID
   * @returns Promise resolving to an array of merchants
   */
  async getMerchantsByOrganization(organizationId: string): Promise<Merchant[]>;
  /**
   * Retrieves all merchants belonging to a specific organization with additional options
   * 
   * @param organizationId - The organization ID
   * @param options - Additional options
   * @returns Promise resolving to the merchants response
   */
  async getMerchantsByOrganization(
    organizationId: string,
    options: Partial<GetMerchantsParams>
  ): Promise<MerchantsResponse>;
  async getMerchantsByOrganization(
    organizationId: string,
    options?: Partial<GetMerchantsParams>
  ): Promise<Merchant[] | MerchantsResponse> {
    try {
      // Validate organization ID parameter
      if (!organizationId) {
        throw new ApiError(
          ErrorCode.REQUIRED_FIELD_MISSING,
          'Organization ID is required',
          { field: 'organizationId' }
        );
      }
      
      // Construct query parameters with the organization filter
      const filters = {
        ...(options?.filters || {}),
        organizationId: organizationId
      };
      
      // Call getMerchants with the constructed parameters
      const result = await this.getMerchants({
        ...(options || {}),
        filters
      });
      
      // Return appropriate type based on whether options were provided
      return !options ? (result as MerchantsResponse).merchants : result;
    } catch (error) {
      return this._handleApiError(error);
    }
  }

  /**
   * Retrieves all merchants belonging to a specific program
   * 
   * @param programId - The program ID
   * @returns Promise resolving to an array of merchants
   */
  async getMerchantsByProgram(programId: string): Promise<Merchant[]>;
  /**
   * Retrieves all merchants belonging to a specific program with additional options
   * 
   * @param programId - The program ID
   * @param options - Additional options
   * @returns Promise resolving to the merchants response
   */
  async getMerchantsByProgram(
    programId: string,
    options: Partial<GetMerchantsParams>
  ): Promise<MerchantsResponse>;
  async getMerchantsByProgram(
    programId: string,
    options?: Partial<GetMerchantsParams>
  ): Promise<Merchant[] | MerchantsResponse> {
    try {
      // Validate program ID parameter
      if (!programId) {
        throw new ApiError(
          ErrorCode.REQUIRED_FIELD_MISSING,
          'Program ID is required',
          { field: 'programId' }
        );
      }
      
      // Construct query parameters with the program filter
      const filters = {
        ...(options?.filters || {}),
        programId: programId
      };
      
      // Call getMerchants with the constructed parameters
      const result = await this.getMerchants({
        ...(options || {}),
        filters
      });
      
      // Return appropriate type based on whether options were provided
      return !options ? (result as MerchantsResponse).merchants : result;
    } catch (error) {
      return this._handleApiError(error);
    }
  }

  /**
   * Retrieves all merchants belonging to a specific bank
   * 
   * @param bankId - The bank ID
   * @returns Promise resolving to an array of merchants
   */
  async getMerchantsByBank(bankId: string): Promise<Merchant[]>;
  /**
   * Retrieves all merchants belonging to a specific bank with additional options
   * 
   * @param bankId - The bank ID
   * @param options - Additional options
   * @returns Promise resolving to the merchants response
   */
  async getMerchantsByBank(
    bankId: string,
    options: Partial<GetMerchantsParams>
  ): Promise<MerchantsResponse>;
  async getMerchantsByBank(
    bankId: string,
    options?: Partial<GetMerchantsParams>
  ): Promise<Merchant[] | MerchantsResponse> {
    try {
      // Validate bank ID parameter
      if (!bankId) {
        throw new ApiError(
          ErrorCode.REQUIRED_FIELD_MISSING,
          'Bank ID is required',
          { field: 'bankId' }
        );
      }
      
      // Construct query parameters with the bank filter
      const filters = {
        ...(options?.filters || {}),
        bankId: bankId
      };
      
      // Call getMerchants with the constructed parameters
      const result = await this.getMerchants({
        ...(options || {}),
        filters
      });
      
      // Return appropriate type based on whether options were provided
      return !options ? (result as MerchantsResponse).merchants : result;
    } catch (error) {
      return this._handleApiError(error);
    }
  }

  /**
   * Validates if a merchant exists and is in the appropriate status
   * 
   * @param merchantId - The merchant ID to validate
   * @returns Promise resolving to a boolean indicating validity
   */
  async validateMerchant(merchantId: string): Promise<boolean>;
  /**
   * Validates if a merchant exists and is in the appropriate status with options
   * 
   * @param params - Validation parameters
   * @returns Promise resolving to the validation result
   */
  async validateMerchant(params: ValidateMerchantParams): Promise<MerchantValidationResult>;
  async validateMerchant(
    merchantIdOrParams: string | ValidateMerchantParams
  ): Promise<boolean | MerchantValidationResult> {
    try {
      // Convert string ID to params object if needed
      const params: ValidateMerchantParams = typeof merchantIdOrParams === 'string'
        ? { merchantId: merchantIdOrParams, requireActive: true }
        : merchantIdOrParams;
      
      // Validate required parameters
      if (!params.merchantId) {
        throw new ApiError(
          ErrorCode.REQUIRED_FIELD_MISSING,
          'Merchant ID is required',
          { field: 'merchantId' }
        );
      }
      
      // Construct query parameters including active requirement flag
      const queryParams: Record<string, any> = {};
      if (params.requireActive !== undefined) {
        queryParams.requireActive = params.requireActive;
      }
      
      // Send GET request to merchant validation endpoint
      const response = await this._retryRequest(() => 
        this.httpClient.get(`/merchants/${encodeURIComponent(params.merchantId)}/validate`, {
          params: queryParams
        })
      );
      
      logger.debug(`Validated merchant`, {
        merchantId: params.merchantId,
        requireActive: params.requireActive,
        isValid: response.data.valid
      });
      
      // Return boolean for simple interface or full result for complex one
      return typeof merchantIdOrParams === 'string'
        ? response.data.valid
        : response.data;
    } catch (error) {
      return this._handleApiError(error);
    }
  }

  /**
   * Retrieves refund configuration for a merchant
   * 
   * @param merchantId - The merchant ID
   * @returns Promise resolving to the merchant's refund configuration
   */
  async getRefundConfiguration(merchantId: string): Promise<MerchantRefundConfiguration>;
  /**
   * Retrieves refund configuration for a merchant with options
   * 
   * @param params - Request parameters
   * @returns Promise resolving to the refund configuration response
   */
  async getRefundConfiguration(params: GetRefundConfigurationParams): Promise<RefundConfigurationResponse>;
  async getRefundConfiguration(
    merchantIdOrParams: string | GetRefundConfigurationParams
  ): Promise<MerchantRefundConfiguration | RefundConfigurationResponse> {
    try {
      // Convert string ID to params object if needed
      const params: GetRefundConfigurationParams = typeof merchantIdOrParams === 'string'
        ? { merchantId: merchantIdOrParams }
        : merchantIdOrParams;
      
      // Validate required parameters
      if (!params.merchantId) {
        throw new ApiError(
          ErrorCode.REQUIRED_FIELD_MISSING,
          'Merchant ID is required',
          { field: 'merchantId' }
        );
      }
      
      // Construct query parameters including optional inheritance chain flag
      const queryParams: Record<string, any> = {};
      if (params.includeInheritanceChain !== undefined) {
        queryParams.includeInheritanceChain = params.includeInheritanceChain;
      }
      
      // Send GET request to merchant configuration endpoint
      const response = await this._retryRequest(() => 
        this.httpClient.get(
          `/merchants/${encodeURIComponent(params.merchantId)}/refund-configuration`,
          { params: queryParams }
        )
      );
      
      logger.debug(`Retrieved merchant refund configuration`, {
        merchantId: params.merchantId,
        includeInheritanceChain: params.includeInheritanceChain
      });
      
      // Return configuration for simple interface or full response for complex one
      return typeof merchantIdOrParams === 'string'
        ? response.data.configuration
        : response.data;
    } catch (error) {
      return this._handleApiError(error);
    }
  }

  /**
   * Retrieves an organization by ID
   * 
   * @param organizationId - The organization ID
   * @returns Promise resolving to the organization
   */
  async getOrganization(organizationId: string): Promise<Organization>;
  /**
   * Retrieves an organization by ID with options
   * 
   * @param params - Request parameters
   * @returns Promise resolving to the organization response
   */
  async getOrganization(params: GetOrganizationParams): Promise<OrganizationResponse>;
  async getOrganization(
    organizationIdOrParams: string | GetOrganizationParams
  ): Promise<Organization | OrganizationResponse> {
    try {
      // Validate required parameters
      const params: GetOrganizationParams = typeof organizationIdOrParams === 'string'
        ? { organizationId: organizationIdOrParams }
        : organizationIdOrParams;
      
      if (!params.organizationId) {
        throw new ApiError(
          ErrorCode.REQUIRED_FIELD_MISSING,
          'Organization ID is required',
          { field: 'organizationId' }
        );
      }
      
      // Send GET request to organization endpoint
      const response = await this._retryRequest(() => 
        this.httpClient.get(`/organizations/${encodeURIComponent(params.organizationId)}`)
      );
      
      logger.debug(`Retrieved organization data`, {
        organizationId: params.organizationId
      });
      
      // Return organization for simple interface or full response for complex one
      return typeof organizationIdOrParams === 'string'
        ? response.data.organization
        : response.data;
    } catch (error) {
      return this._handleApiError(error);
    }
  }

  /**
   * Retrieves a program by ID
   * 
   * @param programId - The program ID
   * @returns Promise resolving to the program
   */
  async getProgram(programId: string): Promise<Program>;
  /**
   * Retrieves a program by ID with options
   * 
   * @param params - Request parameters
   * @returns Promise resolving to the program response
   */
  async getProgram(params: GetProgramParams): Promise<ProgramResponse>;
  async getProgram(
    programIdOrParams: string | GetProgramParams
  ): Promise<Program | ProgramResponse> {
    try {
      // Validate required parameters
      const params: GetProgramParams = typeof programIdOrParams === 'string'
        ? { programId: programIdOrParams }
        : programIdOrParams;
      
      if (!params.programId) {
        throw new ApiError(
          ErrorCode.REQUIRED_FIELD_MISSING,
          'Program ID is required',
          { field: 'programId' }
        );
      }
      
      // Send GET request to program endpoint
      const response = await this._retryRequest(() => 
        this.httpClient.get(`/programs/${encodeURIComponent(params.programId)}`)
      );
      
      logger.debug(`Retrieved program data`, {
        programId: params.programId
      });
      
      // Return program for simple interface or full response for complex one
      return typeof programIdOrParams === 'string'
        ? response.data.program
        : response.data;
    } catch (error) {
      return this._handleApiError(error);
    }
  }

  /**
   * Retrieves a bank by ID
   * 
   * @param bankId - The bank ID
   * @returns Promise resolving to the bank
   */
  async getBank(bankId: string): Promise<Bank>;
  /**
   * Retrieves a bank by ID with options
   * 
   * @param params - Request parameters
   * @returns Promise resolving to the bank response
   */
  async getBank(params: GetBankParams): Promise<BankResponse>;
  async getBank(
    bankIdOrParams: string | GetBankParams
  ): Promise<Bank | BankResponse> {
    try {
      // Validate required parameters
      const params: GetBankParams = typeof bankIdOrParams === 'string'
        ? { bankId: bankIdOrParams }
        : bankIdOrParams;
      
      if (!params.bankId) {
        throw new ApiError(
          ErrorCode.REQUIRED_FIELD_MISSING,
          'Bank ID is required',
          { field: 'bankId' }
        );
      }
      
      // Send GET request to bank endpoint
      const response = await this._retryRequest(() => 
        this.httpClient.get(`/banks/${encodeURIComponent(params.bankId)}`)
      );
      
      logger.debug(`Retrieved bank data`, {
        bankId: params.bankId
      });
      
      // Return bank for simple interface or full response for complex one
      return typeof bankIdOrParams === 'string'
        ? response.data.bank
        : response.data;
    } catch (error) {
      return this._handleApiError(error);
    }
  }

  /**
   * Private method to handle API errors from the Merchant Service
   * 
   * @param error - The error received from the API call
   * @throws ApiError with appropriate error code and details
   */
  private _handleApiError(error: Error): never {
    // Check if the error is an AxiosError
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const data = axiosError.response?.data as any;
      
      // Map HTTP errors to appropriate error codes
      let errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
      let errorMessage = 'An error occurred while communicating with the Merchant Service';
      
      if (status === 400) {
        errorCode = ErrorCode.VALIDATION_ERROR;
        errorMessage = data?.message || 'Invalid request to Merchant Service';
      } else if (status === 401) {
        errorCode = ErrorCode.AUTHENTICATION_FAILED;
        errorMessage = 'Authentication failed when accessing Merchant Service';
      } else if (status === 403) {
        errorCode = ErrorCode.PERMISSION_DENIED;
        errorMessage = 'Permission denied when accessing Merchant Service';
      } else if (status === 404) {
        errorCode = ErrorCode.MERCHANT_NOT_FOUND;
        errorMessage = 'The requested merchant resource was not found';
      } else if (status === 429) {
        errorCode = ErrorCode.RATE_LIMIT_EXCEEDED;
        errorMessage = 'Rate limit exceeded when accessing Merchant Service';
      } else if (status && status >= 500) {
        errorCode = ErrorCode.SERVICE_UNAVAILABLE;
        errorMessage = 'Merchant Service is currently unavailable';
      }
      
      // Log the error with appropriate context
      if (status && status >= 500) {
        logger.error(`Merchant Service error: ${errorMessage}`, {
          status,
          url: axiosError.config?.url,
          errorData: data,
          errorCode
        });
      } else {
        logger.warn(`Merchant Service error: ${errorMessage}`, {
          status,
          url: axiosError.config?.url,
          errorData: data,
          errorCode
        });
      }
      
      // Throw a new ApiError with the mapped error code and details
      throw new ApiError(errorCode, errorMessage, {
        originalError: {
          status,
          data: data
        }
      });
    }
    
    // Handle other types of errors
    logger.error(`Unexpected error in Merchant Service client`, {
      error: error.message,
      stack: error.stack
    });
    
    throw new ApiError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      `Unexpected error: ${error.message}`
    );
  }

  /**
   * Private method to implement retry logic for failed requests
   * 
   * @param requestFn - The request function to execute with retry logic
   * @returns Result of the successful request or throws after max retries
   */
  private async _retryRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    // Initialize attempt counter
    let attempts = 0;
    let lastError: Error;
    
    while (attempts <= this.retries) {
      try {
        // Try to execute the request function
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        attempts++;
        
        // If retryable and attempts remain, wait with exponential backoff
        if (
          attempts <= this.retries && 
          axios.isAxiosError(error) && 
          this._isRetryableError(error)
        ) {
          // Calculate delay with exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempts - 1);
          
          logger.debug(`Retrying request to Merchant Service`, {
            attempt: attempts,
            maxRetries: this.retries,
            delay,
            errorMessage: error.message
          });
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If max retries exceeded or error not retryable, throw the last error
        throw lastError;
      }
    }
    
    // We should never get here, but TypeScript requires a return statement
    throw lastError!;
  }

  /**
   * Determines if an error is retryable based on error type and status code
   * 
   * @param error - The error to evaluate
   * @returns Boolean indicating if the error is retryable
   */
  private _isRetryableError(error: AxiosError): boolean {
    // Network errors are generally retryable
    if (!error.response) {
      return true;
    }
    
    // Check status codes that should be retried
    const status = error.response.status;
    
    // 5xx errors are server errors that might be transient
    // 429 is rate limiting which might succeed after waiting
    return status >= 500 || status === 429;
  }
}