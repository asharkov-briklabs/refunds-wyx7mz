import { Middleware } from '@reduxjs/toolkit';
import { AnyAction } from 'redux';
import { MiddlewareAPI } from 'redux';
import apiClient from '../../services/api/api.client';
import { handleApiError } from '../../utils/error.utils';
import { API_ACTIONS } from '../../constants/api.constants';

/**
 * Interface for Redux actions that contain API request information
 */
interface ApiAction {
  type: string;
  api: {
    endpoint: string;
    method: string;
    data?: any;
    headers?: object;
    onSuccess: string | Function;
    onError?: string | Function;
  }
}

/**
 * Redux middleware that handles API actions
 * 
 * This middleware intercepts actions with an 'api' property, dispatches loading states,
 * makes API calls using the apiClient, and handles success/failure responses.
 * 
 * @param store Redux store instance
 * @returns Next middleware function in the chain
 */
const apiMiddleware: Middleware = (store: MiddlewareAPI) => (next) => (action: AnyAction) => {
  // If action doesn't have an api property, pass it to the next middleware
  if (!action.api) {
    return next(action);
  }

  const { dispatch } = store;
  const { endpoint, method, data, headers, onSuccess, onError } = action.api;

  // Dispatch loading action
  dispatch({ type: API_ACTIONS.REQUEST, meta: { endpoint } });

  // Make the API request based on the specified method
  let apiCall;
  switch (method.toLowerCase()) {
    case 'get':
      apiCall = apiClient.get(endpoint, data, { headers });
      break;
    case 'post':
      apiCall = apiClient.post(endpoint, data, { headers });
      break;
    case 'put':
      apiCall = apiClient.put(endpoint, data, { headers });
      break;
    case 'delete':
      apiCall = apiClient.delete(endpoint, { headers });
      break;
    default:
      apiCall = apiClient.get(endpoint, data, { headers });
  }
  
  return apiCall
    .then(response => {
      // Dispatch success action
      if (typeof onSuccess === 'function') {
        dispatch(onSuccess(response.data));
      } else if (typeof onSuccess === 'string') {
        dispatch({ 
          type: onSuccess, 
          payload: response.data, 
          meta: response.meta 
        });
      }
      
      // Dispatch API success action
      dispatch({ 
        type: API_ACTIONS.SUCCESS, 
        meta: { endpoint }, 
        payload: response.data, 
        extraMeta: response.meta 
      });
      
      return response.data;
    })
    .catch(error => {
      // Handle API error using the utility function
      const processedError = handleApiError(error);
      
      // Dispatch error action if provided
      if (typeof onError === 'function') {
        dispatch(onError(processedError));
      } else if (typeof onError === 'string') {
        dispatch({ 
          type: onError, 
          error: processedError 
        });
      }
      
      // Dispatch API error action
      dispatch({ 
        type: API_ACTIONS.FAILURE, 
        meta: { endpoint }, 
        error: processedError 
      });
      
      // Re-throw error for component-level handling
      throw processedError;
    });
};

export default apiMiddleware;