import axios, { AxiosInstance, AxiosError } from 'axios'; // axios ^1.3.4
import axiosRetry from 'axios-retry'; // axios-retry ^3.4.0
import { logger } from '../../common/utils/logger';
import config from '../../config';
import { BusinessError } from '../../common/errors';
import idempotency from '../../common/utils/idempotency';
import { 
  BalanceServiceConfig, 
  MerchantBalance,
  BalanceCheckRequest,
  BalanceUpdateRequest,
  BalanceUpdateResponse,
  BalanceOperation,
  BalanceServiceError
} from './types';
import { ErrorCode } from '../../common/constants/error-codes';

/**
 * Client for interacting with the Balance Service API
 */
class BalanceServiceClient {
  private httpClient: AxiosInstance;
  private config: BalanceServiceConfig;

  /**
   * Initialize the Balance Service client with configuration
   * 
   * @param config - Configuration options for the Balance Service
   */
  constructor(config?: Partial<BalanceServiceConfig>) {
    // Set default configuration from environment if not provided
    this.config = {
      baseUrl: config?.baseUrl || process.env.BALANCE_SERVICE_URL || config.services.balanceService.baseUrl,
      apiKey: config?.apiKey || process.env.BALANCE_SERVICE_API_KEY || '',
      timeout: config?.timeout || config.services.balanceService.timeout || 5000
    };

    // Initialize axios HTTP client with base URL and timeout
    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey
      }
    });

    // Configure retry logic using axios-retry
    axiosRetry(this.httpClient, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        // Retry on network errors and 5xx responses
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
               (error.response?.status && error.response.status >= 500);
      }
    });

    // Set up request interceptor for logging
    this.httpClient.interceptors.request.use(request => {
      logger.debug('Balance Service request', {
        url: request.url,
        method: request.method,
        data: request.data
      });
      return request;
    });

    // Set up response interceptor for logging
    this.httpClient.interceptors.response.use(
      response => {
        logger.debug('Balance Service response', {
          status: response.status,
          data: response.data
        });
        return response;
      },
      error => {
        logger.error('Balance Service error', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
    
    logger.info('Balance Service client initialized', {
      baseUrl: this.config.baseUrl,
      timeout: this.config.timeout
    });
  }

  /**
   * Retrieve the current balance for a merchant
   * 
   * @param request - The balance check request parameters
   * @returns Merchant balance information
   */
  async getBalance(request: BalanceCheckRequest): Promise<MerchantBalance> {
    logger.info('Checking merchant balance', { merchantId: request.merchantId, currency: request.currency });

    if (!request.merchantId) {
      throw new Error('Merchant ID is required for balance check');
    }

    try {
      // Build query parameters
      const params: Record<string, string> = { 
        merchantId: request.merchantId 
      };
      
      // Add currency parameter if provided
      if (request.currency) {
        params.currency = request.currency;
      }

      // Make GET request to balance service
      const response = await this.httpClient.get('/balances', { params });
      
      return response.data as MerchantBalance;
    } catch (error) {
      throw this.handleBalanceServiceError(error);
    }
  }

  /**
   * Check if a merchant has sufficient balance for a refund amount
   * 
   * @param merchantId - Merchant identifier
   * @param amount - Amount to check against available balance
   * @param currency - Currency code
   * @returns True if merchant has sufficient balance
   */
  async hasSufficientBalance(merchantId: string, amount: number, currency: string): Promise<boolean> {
    logger.info('Checking if merchant has sufficient balance', { 
      merchantId, 
      amount, 
      currency 
    });

    try {
      // Validate parameters
      if (!merchantId) {
        throw new Error('Merchant ID is required');
      }
      
      if (amount <= 0) {
        throw new Error('Amount must be greater than zero');
      }
      
      if (!currency) {
        throw new Error('Currency is required');
      }

      // Get current balance
      const balance = await this.getBalance({ 
        merchantId,
        currency
      });

      // Check if available balance is sufficient
      const hasSufficientBalance = balance.availableBalance >= amount;
      
      logger.info('Balance check result', {
        merchantId,
        availableBalance: balance.availableBalance,
        requiredAmount: amount,
        currency: balance.currency,
        sufficient: hasSufficientBalance
      });

      return hasSufficientBalance;
    } catch (error) {
      logger.error('Error checking merchant balance', {
        merchantId,
        amount,
        currency,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return false on error since we can't confirm sufficient balance
      return false;
    }
  }

  /**
   * Process a balance update for refund operations
   * 
   * @param request - The balance update request
   * @returns Result of the balance update operation
   */
  async updateBalance(request: BalanceUpdateRequest): Promise<BalanceUpdateResponse> {
    logger.info('Processing balance update', {
      merchantId: request.merchantId,
      amount: request.amount,
      currency: request.currency,
      operation: request.operation,
      referenceId: request.referenceId
    });

    // Validate request parameters
    if (!request.merchantId) {
      throw new Error('Merchant ID is required');
    }
    
    if (!request.amount || request.amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }
    
    if (!request.currency) {
      throw new Error('Currency is required');
    }
    
    if (!request.operation) {
      throw new Error('Operation (CREDIT/DEBIT) is required');
    }
    
    if (!request.referenceId) {
      throw new Error('Reference ID is required');
    }

    try {
      // Generate idempotency key from request data
      const idempotencyKey = idempotency.generateIdempotencyKey({
        merchantId: request.merchantId,
        amount: request.amount,
        currency: request.currency,
        operation: request.operation,
        referenceId: request.referenceId
      });

      // Process with idempotency to ensure operation runs exactly once
      return await idempotency.processWithIdempotency<BalanceUpdateResponse>(
        idempotencyKey,
        async () => {
          // Make POST request to balance service
          const response = await this.httpClient.post('/balances/update', request, {
            headers: {
              'Idempotency-Key': idempotencyKey
            }
          });
          
          return response.data as BalanceUpdateResponse;
        },
        { 
          ttlSeconds: 86400, // 24 hours
          keyPrefix: 'balance_update' 
        }
      );
    } catch (error) {
      throw this.handleBalanceServiceError(error);
    }
  }

  /**
   * Transform Balance Service errors into appropriate application errors
   * 
   * @param error - The original error from the Balance Service
   * @returns Transformed error with appropriate type and details
   */
  private handleBalanceServiceError(error: Error | AxiosError | unknown): Error {
    if (axios.isAxiosError(error) && error.response) {
      // Extract error details from response
      const status = error.response.status;
      const serviceError = error.response.data as BalanceServiceError;
      const errorCode = serviceError?.code || 'UNKNOWN_ERROR';
      const errorMessage = serviceError?.message || error.message;
      
      logger.error('Balance Service error response', {
        status,
        errorCode,
        errorMessage,
        details: serviceError?.details
      });
      
      // Map error codes to appropriate error types
      if (status === 400) {
        // Bad request errors
        return new Error(`Balance Service validation error: ${errorMessage}`);
      } else if (status === 401 || status === 403) {
        // Authentication/authorization errors
        return new Error(`Balance Service authentication error: ${errorMessage}`);
      } else if (status === 404) {
        // Not found errors
        return new Error(`Balance Service resource not found: ${errorMessage}`);
      } else if (status === 409) {
        // Conflict errors
        return new Error(`Balance Service conflict error: ${errorMessage}`);
      } else if (errorCode === 'INSUFFICIENT_BALANCE') {
        // Business error for insufficient balance
        return new BusinessError(
          ErrorCode.INSUFFICIENT_BALANCE,
          `Insufficient balance: ${errorMessage}`,
          {
            message: errorMessage,
            additionalData: serviceError?.details
          }
        );
      } else if (status >= 500) {
        // Server errors
        return new Error(`Balance Service server error (${status}): ${errorMessage}`);
      } else {
        // Other errors
        return new Error(`Balance Service error: ${errorMessage}`);
      }
    } else if (error instanceof Error) {
      // For non-Axios errors, ensure we preserve the stack trace
      logger.error('Non-Axios error from Balance Service', {
        message: error.message,
        stack: error.stack
      });
      return error;
    } else {
      // For unknown errors
      const errorMessage = String(error);
      logger.error('Unknown error from Balance Service', { error: errorMessage });
      return new Error(`Unknown Balance Service error: ${errorMessage}`);
    }
  }
}

export default BalanceServiceClient;