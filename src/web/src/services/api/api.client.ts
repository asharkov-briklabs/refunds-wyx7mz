/**
 * Core API Client
 *
 * This module provides a standardized interface for making HTTP requests to the 
 * Refunds Service backend API. It handles authentication, request formatting,
 * error handling, and response parsing while providing a consistent interface
 * for all API services.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'; // ^1.4.0
import apiConfig from '../../config/api.config';
import { ApiResponse, ApiError } from '../../types/api.types';
import { parseApiError } from '../../utils/error.utils';

// Extend AxiosRequestConfig with our custom properties
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  skipDuplicateDetection?: boolean;
  cancelPrevious?: boolean;
}

// Variable to store the authentication token
let authToken: string | null = null;

// Keep track of retry attempts
const retryMap = new Map<string, number>();

// Keep track of pending requests for debouncing
const pendingRequests = new Map<string, Promise<ApiResponse<any>>>();

// Store cancel tokens
const cancelTokens = new Map<string, AbortController>();

// Maximum number of retry attempts
const MAX_RETRY_ATTEMPTS = 3;

// Array of status codes that are retryable
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// Development mode detection
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Retrieves the current authentication token from local storage
 * @returns Current authentication token or null if not logged in
 */
const getAuthToken = (): string | null => {
  // If we have a token in memory, use that first
  if (authToken) return authToken;
  
  // Otherwise, try to retrieve from local storage
  const token = localStorage.getItem('auth_token');
  return token;
};

/**
 * Creates a request key for tracking duplicate/pending requests
 * @param method HTTP method
 * @param url Request URL
 * @param params Query parameters
 * @param data Request body data
 * @returns A unique key for the request
 */
const createRequestKey = (
  method: string,
  url: string,
  params?: Record<string, any>,
  data?: any
): string => {
  return `${method}:${url}:${params ? JSON.stringify(params) : ''}:${data ? JSON.stringify(data) : ''}`;
};

/**
 * Determines if a request should be retried based on the error
 * @param error The error from the failed request
 * @returns Whether the request should be retried
 */
const shouldRetry = (error: AxiosError): boolean => {
  // Don't retry if request was cancelled
  if (axios.isCancel(error)) return false;
  
  // Don't retry if we have a response with a status code that isn't retryable
  if (error.response && !RETRYABLE_STATUS_CODES.includes(error.response.status)) {
    return false;
  }
  
  // Get the request config to check if we've already retried too many times
  const config = error.config;
  if (!config || !config.url || !config.method) return false;
  
  // Generate a unique key for this request
  const requestKey = `${config.method}:${config.url}`;
  
  // Get current retry count
  const retryCount = retryMap.get(requestKey) || 0;
  
  // Check if we've exceeded the max retry attempts
  if (retryCount >= MAX_RETRY_ATTEMPTS) {
    retryMap.delete(requestKey);
    return false;
  }
  
  // Increment retry count
  retryMap.set(requestKey, retryCount + 1);
  
  return true;
};

/**
 * Creates and configures an Axios instance for API communication
 * @returns Configured Axios instance
 */
const createApiInstance = (): AxiosInstance => {
  // Create a new Axios instance with base configuration
  const instance = axios.create({
    baseURL: `${apiConfig.apiUrl}/${apiConfig.apiVersion}`,
    timeout: apiConfig.timeout,
    headers: { ...apiConfig.headers }
  });
  
  // Request interceptor to add authentication and standard headers
  instance.interceptors.request.use(
    (config) => {
      // Log request in development mode
      if (isDevelopment) {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data,
          headers: config.headers
        });
      }
      
      // Get the current auth token
      const token = getAuthToken();
      
      // If we have a token, add it to the Authorization header
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Add request ID for tracing
      const requestId = generateRequestId();
      config.headers['X-Request-ID'] = requestId;
      
      // Create an AbortController for this request if one doesn't exist
      if (!config.signal && config.url && config.method) {
        const controller = new AbortController();
        config.signal = controller.signal;
        
        // Store the controller
        const requestKey = `${config.method}:${config.url}`;
        cancelTokens.set(requestKey, controller);
      }
      
      return config;
    },
    (error) => {
      if (isDevelopment) {
        console.error('API Request Error:', error);
      }
      return Promise.reject(error);
    }
  );
  
  // Response interceptor to transform responses to standard format
  instance.interceptors.response.use(
    (response) => {
      // Log response in development mode
      if (isDevelopment) {
        console.log(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
          status: response.status,
          data: response.data,
          headers: response.headers
        });
      }
      
      // Clean up tracking maps
      if (response.config.url && response.config.method) {
        const requestKey = `${response.config.method}:${response.config.url}`;
        retryMap.delete(requestKey);
        cancelTokens.delete(requestKey);
        
        // Clean up pending requests map based on the full request key
        const fullRequestKey = createRequestKey(
          response.config.method,
          response.config.url,
          response.config.params,
          response.config.data
        );
        pendingRequests.delete(fullRequestKey);
      }
      
      // Transform successful responses to our ApiResponse format
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: response.data,
        error: null,
        meta: response.headers['x-pagination'] 
          ? JSON.parse(response.headers['x-pagination']) 
          : null
      };
      
      return apiResponse;
    },
    async (error: AxiosError) => {
      // Log error in development mode
      if (isDevelopment) {
        console.error('API Response Error:', error);
      }
      
      // Handle request cancellation
      if (axios.isCancel(error)) {
        const apiResponse: ApiResponse<any> = {
          success: false,
          data: null,
          error: {
            code: 'REQUEST_CANCELLED',
            message: 'Request was cancelled',
            details: null,
            field: null
          },
          meta: null
        };
        return Promise.reject(apiResponse);
      }
      
      // Check if this request should be retried
      if (error.config && shouldRetry(error)) {
        // Use exponential backoff for retries
        const requestKey = `${error.config.method}:${error.config.url}`;
        const retryCount = retryMap.get(requestKey) || 0;
        const delayMs = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        
        if (isDevelopment) {
          console.log(`Retrying request (attempt ${retryCount + 1}): ${requestKey} after ${delayMs}ms`);
        }
        
        // Wait for the delay
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        // Retry the request
        return instance(error.config);
      }
      
      // Clean up tracking maps
      if (error.config?.url && error.config?.method) {
        const requestKey = `${error.config.method}:${error.config.url}`;
        retryMap.delete(requestKey);
        cancelTokens.delete(requestKey);
        
        // Clean up pending requests map based on the full request key
        const fullRequestKey = createRequestKey(
          error.config.method,
          error.config.url,
          error.config.params,
          error.config.data
        );
        pendingRequests.delete(fullRequestKey);
      }
      
      // Check for token expiration (401 status)
      if (error.response?.status === 401) {
        // Clear the token as it might be expired
        clearAuthToken();
        
        // Dispatch an event so the app can redirect to login
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
      
      // Transform error responses to our ApiResponse format
      const apiError = parseApiError(error);
      
      const apiResponse: ApiResponse<any> = {
        success: false,
        data: null,
        error: apiError,
        meta: null
      };
      
      return Promise.reject(apiResponse);
    }
  );
  
  return instance;
};

/**
 * Generates a unique request ID for tracing
 * @returns A unique request ID
 */
const generateRequestId = (): string => {
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
};

// Create and memoize the API instance
let apiInstance: AxiosInstance | null = null;

const getApiInstance = (): AxiosInstance => {
  if (!apiInstance) {
    apiInstance = createApiInstance();
  }
  return apiInstance;
};

/**
 * Cancels an in-flight request if it exists
 * @param requestKey The unique key for the request to cancel
 */
const cancelRequest = (requestKey: string): void => {
  const controller = cancelTokens.get(requestKey);
  if (controller) {
    controller.abort();
    cancelTokens.delete(requestKey);
    
    // Clean up any pending requests that match this key pattern
    const keyPrefix = `${requestKey}:`;
    pendingRequests.forEach((_, key) => {
      if (key.startsWith(keyPrefix)) {
        pendingRequests.delete(key);
      }
    });
  }
};

/**
 * Makes a GET request to the specified API endpoint
 * @param endpoint Endpoint path
 * @param params Query parameters
 * @param config Additional Axios request configuration
 * @returns Promise resolving to standardized API response
 */
const get = <T = any>(
  endpoint: string,
  params: Record<string, any> = {},
  config: ExtendedAxiosRequestConfig = {}
): Promise<ApiResponse<T>> => {
  const instance = getApiInstance();
  
  // Create a unique key for this request to handle duplicate requests
  const requestKey = createRequestKey('get', endpoint, params);
  
  // Check if this exact request is already in flight
  const pendingRequest = pendingRequests.get(requestKey);
  if (pendingRequest && config.skipDuplicateDetection !== true) {
    return pendingRequest as Promise<ApiResponse<T>>;
  }
  
  // Cancel any existing request with the same endpoint
  if (config.cancelPrevious === true) {
    cancelRequest(`get:${endpoint}`);
  }
  
  // Make the request and store the promise
  const request = instance.get<any>(endpoint, { ...config, params })
    .then(response => response as unknown as ApiResponse<T>);
  
  // Store the request if duplicate detection is not disabled
  if (config.skipDuplicateDetection !== true) {
    pendingRequests.set(requestKey, request);
  }
  
  return request;
};

/**
 * Makes a POST request to the specified API endpoint
 * @param endpoint Endpoint path
 * @param data Request payload
 * @param config Additional Axios request configuration
 * @returns Promise resolving to standardized API response
 */
const post = <T = any>(
  endpoint: string,
  data: any = {},
  config: ExtendedAxiosRequestConfig = {}
): Promise<ApiResponse<T>> => {
  const instance = getApiInstance();
  
  // For idempotent POST requests, we can handle duplicates
  if (config.headers?.['Idempotency-Key'] && config.skipDuplicateDetection !== true) {
    const requestKey = createRequestKey('post', endpoint, undefined, data);
    
    // Check if this exact request is already in flight
    const pendingRequest = pendingRequests.get(requestKey);
    if (pendingRequest) {
      return pendingRequest as Promise<ApiResponse<T>>;
    }
    
    // Make the request and store the promise
    const request = instance.post<any>(endpoint, data, config)
      .then(response => response as unknown as ApiResponse<T>);
      
    pendingRequests.set(requestKey, request);
    return request;
  }
  
  // Cancel any existing request with the same endpoint if specified
  if (config.cancelPrevious === true) {
    cancelRequest(`post:${endpoint}`);
  }
  
  // For non-idempotent requests, just make the request
  return instance.post<any>(endpoint, data, config)
    .then(response => response as unknown as ApiResponse<T>);
};

/**
 * Makes a PUT request to the specified API endpoint
 * @param endpoint Endpoint path
 * @param data Request payload
 * @param config Additional Axios request configuration
 * @returns Promise resolving to standardized API response
 */
const put = <T = any>(
  endpoint: string,
  data: any = {},
  config: ExtendedAxiosRequestConfig = {}
): Promise<ApiResponse<T>> => {
  const instance = getApiInstance();
  
  // Cancel any existing request with the same endpoint if specified
  if (config.cancelPrevious === true) {
    cancelRequest(`put:${endpoint}`);
  }
  
  return instance.put<any>(endpoint, data, config)
    .then(response => response as unknown as ApiResponse<T>);
};

/**
 * Makes a DELETE request to the specified API endpoint
 * @param endpoint Endpoint path
 * @param config Additional Axios request configuration
 * @returns Promise resolving to standardized API response
 */
const delete_ = <T = any>(
  endpoint: string,
  config: ExtendedAxiosRequestConfig = {}
): Promise<ApiResponse<T>> => {
  const instance = getApiInstance();
  
  // Cancel any existing request with the same endpoint if specified
  if (config.cancelPrevious === true) {
    cancelRequest(`delete:${endpoint}`);
  }
  
  return instance.delete<any>(endpoint, config)
    .then(response => response as unknown as ApiResponse<T>);
};

/**
 * Makes a PATCH request to the specified API endpoint
 * @param endpoint Endpoint path
 * @param data Request payload
 * @param config Additional Axios request configuration
 * @returns Promise resolving to standardized API response
 */
const patch = <T = any>(
  endpoint: string,
  data: any = {},
  config: ExtendedAxiosRequestConfig = {}
): Promise<ApiResponse<T>> => {
  const instance = getApiInstance();
  
  // Cancel any existing request with the same endpoint if specified
  if (config.cancelPrevious === true) {
    cancelRequest(`patch:${endpoint}`);
  }
  
  return instance.patch<any>(endpoint, data, config)
    .then(response => response as unknown as ApiResponse<T>);
};

/**
 * Updates the authentication token used for API requests
 * @param token New authentication token
 */
const setAuthToken = (token: string): void => {
  authToken = token;
  localStorage.setItem('auth_token', token);
  
  // Force re-creation of the API instance with the new token
  apiInstance = null;
};

/**
 * Removes the authentication token from API requests
 */
const clearAuthToken = (): void => {
  authToken = null;
  localStorage.removeItem('auth_token');
  
  // Force re-creation of the API instance without the token
  apiInstance = null;
};

// Export the API client methods
export default {
  get,
  post,
  put,
  delete: delete_, // Use delete_ to avoid conflict with the JS keyword
  patch,
  setAuthToken,
  clearAuthToken
};