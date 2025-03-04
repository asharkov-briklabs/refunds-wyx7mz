import axios, { AxiosInstance, AxiosError } from 'axios'; // axios@^1.3.5
import axiosRetry from 'axios-retry'; // axios-retry@^3.4.0
import { Transaction, PaymentMethod } from '../../common/interfaces/payment.interface';
import { logger, metrics } from '../../common/utils';
import { GatewayError } from '../../common/errors';
import servicesConfig from '../../config/services';
import {
  GetTransactionParams,
  ValidateTransactionParams,
  TransactionValidationResult,
  UpdateTransactionStatusParams,
  IsRefundableParams,
  RefundabilityResult,
  GetPaymentMethodParams
} from './types';

/**
 * Factory function to create a configured instance of the Payment Service client
 * @param config 
 * @returns A configured payment service client instance
 */
export function createPaymentServiceClient(config: any) {
  // Load default configuration from servicesConfig.paymentService
  const defaultConfig = servicesConfig.paymentService;

  // Merge provided config with default configuration
  const mergedConfig = { ...defaultConfig, ...config };

  // Create and return a new PaymentServiceClientImpl instance with the merged config
  return new PaymentServiceClientImpl(mergedConfig);
}

/**
 * Client implementation for interacting with the Payment Service API
 */
export class PaymentServiceClientImpl {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private retries: number;
  private retryDelay: number;
  private httpClient: AxiosInstance;

  /**
   * Creates a new instance of the Payment Service client
   * @param config 
   */
  constructor(config: any) {
    // Store the baseUrl, apiKey, timeout, retries, and retryDelay from the provided config
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout;
    this.retries = config.retries;
    this.retryDelay = config.retryDelay;

    // Create an Axios instance with baseURL, timeout, and default headers including API key
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
    });

    // Configure axios-retry with specified retries, retryDelay, and retryable error conditions
    axiosRetry(this.httpClient, {
      retries: this.retries,
      retryDelay: (retryCount) => {
        logger.info(`Attempting retry number ${retryCount} for Payment Service`);
        return this.retryDelay;
      },
      retryCondition: (error) => {
        return error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED';
      },
    });

    // Set up request/response interceptors for logging and error handling
    this.httpClient.interceptors.request.use(
      (request) => {
        logger.debug(`Payment Service Request: ${request.method} ${request.url}`, {
          headers: request.headers,
          data: request.data,
        });
        return request;
      },
      (error) => {
        logger.error('Payment Service Request Error', { error });
        return Promise.reject(error);
      }
    );

    this.httpClient.interceptors.response.use(
      (response) => {
        logger.debug(`Payment Service Response: ${response.status} ${response.statusText}`, {
          data: response.data,
        });
        return response;
      },
      (error) => {
        logger.error('Payment Service Response Error', { error });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Retrieves transaction details from the Payment Service
   * @param params 
   * @returns Transaction details if found, null otherwise
   */
  async getTransaction(params: GetTransactionParams): Promise<Transaction | null> {
    // Log the transaction retrieval request
    logger.info('Retrieving transaction from Payment Service', { transactionId: params.transactionId, merchantId: params.merchantId });

    // Validate required parameters (transactionId, merchantId)
    if (!params.transactionId || !params.merchantId) {
      throw new Error('Transaction ID and Merchant ID are required');
    }

    // Use metrics.timeAsyncFn to time the API call
    return metrics.timeAsyncFn('payment_service.get_transaction', async () => {
      try {
        // Make a GET request to the /transactions/{transactionId} endpoint
        const response = await this.httpClient.get(`/transactions/${params.transactionId}`, {
          params: { merchantId: params.merchantId },
        });

        // Handle successful response by returning the transaction data
        logger.info('Successfully retrieved transaction from Payment Service', { transactionId: params.transactionId });
        return response.data as Transaction;
      } catch (error: any) {
        // Handle 404 by returning null
        if (error.response?.status === 404) {
          logger.info('Transaction not found in Payment Service', { transactionId: params.transactionId });
          return null;
        }

        // Handle other errors by calling handleError
        this.handleError(error);
      }
    })();
  }

  /**
   * Validates if a transaction is eligible for refund with the specified parameters
   * @param params 
   * @returns Result of transaction validation
   */
  async validateTransaction(params: ValidateTransactionParams): Promise<TransactionValidationResult> {
    // Log the transaction validation request
    logger.info('Validating transaction for refund in Payment Service', { transactionId: params.transactionId, merchantId: params.merchantId, amount: params.amount, currency: params.currency, refundMethod: params.refundMethod });

    // Validate required parameters (transactionId, merchantId, amount, currency, refundMethod)
    if (!params.transactionId || !params.merchantId || !params.amount || !params.currency || !params.refundMethod) {
      throw new Error('Transaction ID, Merchant ID, Amount, Currency, and Refund Method are required');
    }

    // Use metrics.timeAsyncFn to time the API call
    return metrics.timeAsyncFn('payment_service.validate_transaction', async () => {
      try {
        // Make a POST request to the /transactions/validate endpoint with validation parameters
        const response = await this.httpClient.post('/transactions/validate', {
          transactionId: params.transactionId,
          merchantId: params.merchantId,
          amount: params.amount,
          currency: params.currency,
          refundMethod: params.refundMethod,
        });

        // Handle successful response by parsing and returning the validation result
        logger.info('Successfully validated transaction for refund in Payment Service', { transactionId: params.transactionId });
        return response.data as TransactionValidationResult;
      } catch (error: any) {
        // Handle errors by calling handleError
        this.handleError(error);
      }
    })();
  }

  /**
   * Updates a transaction's status after refund processing
   * @param params 
   * @returns Resolves when update is complete
   */
  async updateTransactionStatus(params: UpdateTransactionStatusParams): Promise<void> {
    // Log the transaction status update request
    logger.info('Updating transaction status in Payment Service', { transactionId: params.transactionId, merchantId: params.merchantId, status: params.status, refundId: params.refundId, refundAmount: params.refundAmount });

    // Validate required parameters (transactionId, merchantId, status, refundId, refundAmount)
    if (!params.transactionId || !params.merchantId || !params.status || !params.refundId || !params.refundAmount) {
      throw new Error('Transaction ID, Merchant ID, Status, Refund ID, and Refund Amount are required');
    }

    // Use metrics.timeAsyncFn to time the API call
    return metrics.timeAsyncFn('payment_service.update_transaction_status', async () => {
      try {
        // Make a PUT request to the /transactions/{transactionId}/status endpoint
        await this.httpClient.put(`/transactions/${params.transactionId}/status`, {
          merchantId: params.merchantId,
          status: params.status,
          refundId: params.refundId,
          refundAmount: params.refundAmount,
          metadata: params.metadata
        });

        // Handle successful response
        logger.info('Successfully updated transaction status in Payment Service', { transactionId: params.transactionId, status: params.status });
      } catch (error: any) {
        // Handle errors by calling handleError
        this.handleError(error);
      }
    })();
  }

  /**
   * Checks if a transaction can be refunded with the specified parameters
   * @param params 
   * @returns Result of refundability check
   */
  async isRefundable(params: IsRefundableParams): Promise<RefundabilityResult> {
    // Log the refundability check request
    logger.info('Checking refundability of transaction in Payment Service', { transactionId: params.transactionId, merchantId: params.merchantId, amount: params.amount, refundMethod: params.refundMethod });

    // Validate required parameters (transactionId, merchantId, amount, refundMethod)
    if (!params.transactionId || !params.merchantId || !params.amount || !params.refundMethod) {
      throw new Error('Transaction ID, Merchant ID, Amount, and Refund Method are required');
    }

    // Use metrics.timeAsyncFn to time the API call
    return metrics.timeAsyncFn('payment_service.is_refundable', async () => {
      try {
        // Make a POST request to the /transactions/is-refundable endpoint
        const response = await this.httpClient.post('/transactions/is-refundable', {
          transactionId: params.transactionId,
          merchantId: params.merchantId,
          amount: params.amount,
          refundMethod: params.refundMethod,
        });

        // Handle successful response by parsing and returning the refundability result
        logger.info('Successfully checked refundability of transaction in Payment Service', { transactionId: params.transactionId });
        return response.data as RefundabilityResult;
      } catch (error: any) {
        // Handle errors by calling handleError
        this.handleError(error);
      }
    })();
  }

  /**
   * Retrieves payment method details for a transaction
   * @param params 
   * @returns Payment method details if found, null otherwise
   */
  async getPaymentMethod(params: GetPaymentMethodParams): Promise<PaymentMethod | null> {
    // Log the payment method retrieval request
    logger.info('Retrieving payment method from Payment Service', { transactionId: params.transactionId, merchantId: params.merchantId });

    // Validate required parameters (transactionId, merchantId)
    if (!params.transactionId || !params.merchantId) {
      throw new Error('Transaction ID and Merchant ID are required');
    }

    // Use metrics.timeAsyncFn to time the API call
    return metrics.timeAsyncFn('payment_service.get_payment_method', async () => {
      try {
        // Make a GET request to the /transactions/{transactionId}/payment-method endpoint
        const response = await this.httpClient.get(`/transactions/${params.transactionId}/payment-method`, {
          params: { merchantId: params.merchantId },
        });

        // Handle successful response by returning the payment method data
        logger.info('Successfully retrieved payment method from Payment Service', { transactionId: params.transactionId });
        return response.data as PaymentMethod;
      } catch (error: any) {
        // Handle 404 by returning null
        if (error.response?.status === 404) {
          logger.info('Payment method not found in Payment Service', { transactionId: params.transactionId });
          return null;
        }

        // Handle other errors by calling handleError
        this.handleError(error);
      }
    })();
  }

  /**
   * Handles and transforms API errors into appropriate application errors
   * @param error 
   * @returns Always throws an appropriate error
   */
  private handleError(error: any): never {
    // Check if the error is an Axios error
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Extract status code and response data if available
      const statusCode = axiosError.response?.status;
      const responseData = axiosError.response?.data;

      // Map HTTP status codes to appropriate error types
      if (axiosError.code === 'ECONNREFUSED') {
        // For network errors, create a GatewayError with connection details
        logger.error('Payment Service Connection Refused', { baseUrl: this.baseUrl, error: axiosError.message });
        throw new GatewayError(
          'GATEWAY_CONNECTION_ERROR',
          'Failed to connect to Payment Service',
          { gatewayErrorCode: axiosError.code, gatewayMessage: axiosError.message }
        );
      } else if (axiosError.code === 'ECONNABORTED') {
        // For timeout errors, create a GatewayError with timeout details
        logger.error('Payment Service Timeout', { timeout: this.timeout, error: axiosError.message });
        throw new GatewayError(
          'GATEWAY_TIMEOUT',
          'Payment Service request timed out',
          { gatewayErrorCode: axiosError.code, gatewayMessage: axiosError.message }
        );
      } else if (statusCode === 401) {
        // For authorization errors, create a GatewayError with auth details
        logger.error('Payment Service Authentication Error', { statusCode, error: axiosError.message });
        throw new GatewayError(
          'GATEWAY_AUTHENTICATION_ERROR',
          'Payment Service authentication failed',
          { gatewayErrorCode: String(statusCode), gatewayMessage: axiosError.message }
        );
      } else if (statusCode === 400) {
        // For validation errors, create a GatewayError with validation details
        logger.error('Payment Service Validation Error', { statusCode, responseData });
        throw new GatewayError(
          'GATEWAY_VALIDATION_ERROR',
          'Payment Service request validation failed',
          { gatewayErrorCode: String(statusCode), gatewayMessage: axiosError.message }
        );
      } else {
        // For other errors, create a generic GatewayError
        logger.error('Payment Service Generic Error', { statusCode, error: axiosError.message });
        throw new GatewayError(
          'GATEWAY_ERROR',
          'Payment Service request failed',
          { gatewayErrorCode: String(statusCode), gatewayMessage: axiosError.message }
        );
      }
    } else {
      // For other errors, create a generic GatewayError
      logger.error('Payment Service Non-Axios Error', { error });
      throw new GatewayError(
        'GATEWAY_ERROR',
        'Payment Service request failed',
        { gatewayErrorCode: 'N/A', gatewayMessage: error.message }
      );
    }
  }
}

// Create a default instance of the Payment Service client
const paymentServiceClient = new PaymentServiceClientImpl(servicesConfig.paymentService);

// Export the Payment Service client implementation class
export { PaymentServiceClientImpl };

// Export factory function for creating Payment Service client instances
export { createPaymentServiceClient };

// Default export providing a singleton instance of the Payment Service client
export default {
  getTransaction: paymentServiceClient.getTransaction.bind(paymentServiceClient),
  validateTransaction: paymentServiceClient.validateTransaction.bind(paymentServiceClient),
  updateTransactionStatus: paymentServiceClient.updateTransactionStatus.bind(paymentServiceClient),
  isRefundable: paymentServiceClient.isRefundable.bind(paymentServiceClient),
  getPaymentMethod: paymentServiceClient.getPaymentMethod.bind(paymentServiceClient)
};