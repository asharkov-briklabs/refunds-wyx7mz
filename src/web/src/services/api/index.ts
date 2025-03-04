/**
 * API Services Index
 * 
 * This file serves as the central export point for all API service modules in the
 * Refunds Service application. It provides a unified entry point for importing
 * API clients that communicate with backend services.
 * 
 * These services implement the communication layer between the frontend UI
 * components and the backend API endpoints, handling authentication, request
 * formatting, error handling, and data transformation.
 */

// Import the core API client for making HTTP requests
import apiClient from './api.client';

// Import individual API service modules
import refundApi from './refund.api';
import bankAccountApi from './bank-account.api';
import parameterApi from './parameter.api';
import notificationApi from './notification.api';
import reportApi from './report.api';

// Export the core API client
export { apiClient };

// Export individual API services
export { 
  refundApi,
  bankAccountApi,
  parameterApi,
  notificationApi,
  reportApi
};

// Export default object with all API services for convenience
export default {
  apiClient,
  refundApi,
  bankAccountApi,
  parameterApi,
  notificationApi,
  reportApi
};