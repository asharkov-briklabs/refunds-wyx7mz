import { Middleware } from '@reduxjs/toolkit'; // ^1.9.5
import { AnyAction, MiddlewareAPI } from 'redux'; // ^4.2.1
import { isDevelopment, app } from '../../config/env.config';

/**
 * Configuration options for the logger middleware
 */
export interface LoggerOptions {
  /**
   * Whether console groups should be collapsed by default
   * @default true
   */
  collapsed?: boolean;
  
  /**
   * Whether to include timing information for actions
   * @default true
   */
  duration?: boolean;
  
  /**
   * Whether to show the state difference after an action
   * @default false
   */
  diff?: boolean;
  
  /**
   * Custom colors for different log types
   */
  colors?: {
    title?: string;
    prevState?: string;
    action?: string;
    nextState?: string;
    error?: string;
    warning?: string;
    diff?: {
      add?: string;
      remove?: string;
      update?: string;
    };
  };
  
  /**
   * Function to determine if an action should be logged
   * @param getState Current state getter
   * @param action The action being dispatched
   * @returns Whether to log this action
   */
  predicate?: (getState: () => unknown, action: AnyAction) => boolean;
  
  /**
   * Function to transform actions before logging
   * @param action The action being dispatched
   * @returns Transformed action for logging
   */
  actionTransformer?: (action: AnyAction) => unknown;
  
  /**
   * Function to transform state before logging
   * @param state Current state
   * @returns Transformed state for logging
   */
  stateTransformer?: (state: unknown) => unknown;
  
  /**
   * Custom logger object
   * @default console
   */
  logger?: {
    log: (...args: any[]) => void;
    group: (...args: any[]) => void;
    groupCollapsed: (...args: any[]) => void;
    groupEnd: () => void;
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    info: (...args: any[]) => void;
    debug?: (...args: any[]) => void;
  };
  
  /**
   * Whether to log errors thrown during action processing
   * @default true
   */
  logErrors?: boolean;
  
  /**
   * Level of logging to include
   * @default from app config
   */
  level?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Factory function that creates a customizable logger middleware instance
 * 
 * @param options - Configuration options for the logger
 * @returns Configured Redux middleware for logging
 */
export const createLoggerMiddleware = (options: LoggerOptions = {}): Middleware => {
  // Default options
  const defaultOptions: LoggerOptions = {
    collapsed: true,
    duration: true,
    diff: false,
    colors: {
      title: '#000000',
      prevState: '#9E9E9E',
      action: '#03A9F4',
      nextState: '#4CAF50',
      error: '#F20404',
      warning: '#FF9800',
      diff: {
        add: '#4CAF50',
        remove: '#F44336',
        update: '#2196F3'
      }
    },
    logger: console,
    logErrors: true,
    level: app.logging?.level || 'debug',
  };
  
  // Merge options with defaults
  const opts: LoggerOptions = { ...defaultOptions, ...options };
  
  // Simple diff function for objects (not a deep diff)
  const objectDiff = (prev: any, next: any): { [key: string]: { from: any, to: any } } => {
    const result: { [key: string]: { from: any, to: any } } = {};
    
    // Find changes
    Object.keys(next).forEach(key => {
      if (prev[key] !== next[key]) {
        result[key] = {
          from: prev[key],
          to: next[key]
        };
      }
    });
    
    // Find removals
    Object.keys(prev).forEach(key => {
      if (next[key] === undefined && prev[key] !== undefined) {
        result[key] = {
          from: prev[key],
          to: undefined
        };
      }
    });
    
    return result;
  };
  
  return ((api: MiddlewareAPI) => (next) => (action: AnyAction) => {
    // Skip logging in non-development unless specifically allowed
    if (!isDevelopment && !(opts.predicate)) {
      return next(action);
    }
    
    // Check if logging is disabled in app configuration
    if (app.logging && app.logging.enabled === false) {
      return next(action);
    }
    
    // Check predicate if provided
    if (opts.predicate && !opts.predicate(api.getState, action)) {
      return next(action);
    }
    
    const logger = opts.logger || console;
    const startTime = Date.now();
    
    // Transform action for logging if transformer is provided
    const logAction = opts.actionTransformer ? 
      opts.actionTransformer(action) : action;
      
    // Transform state for logging if transformer is provided
    const getTransformedState = () => {
      return opts.stateTransformer ? 
        opts.stateTransformer(api.getState()) : api.getState();
    };
    
    // Prepare log group title
    const formattedActionType = 
      typeof logAction.type === 'string' ? logAction.type : String(logAction.type);
    const title = `action ${formattedActionType}`;
    
    // Log the initial information
    try {
      const logMethod = opts.collapsed ? logger.groupCollapsed : logger.group;
      
      logMethod.call(
        logger,
        `%c ${title}`,
        `color: ${opts.colors?.title}; font-weight: bold`
      );
      
      // Log previous state
      const prevState = getTransformedState();
      logger.log(
        '%c prev state', 
        `color: ${opts.colors?.prevState}; font-weight: bold`, 
        prevState
      );
      
      // Log action
      logger.log(
        '%c action', 
        `color: ${opts.colors?.action}; font-weight: bold`, 
        logAction
      );
      
      // Dispatch the action
      const returnValue = next(action);
      
      // Get next state for logging
      const nextState = getTransformedState();
      
      // Log next state
      logger.log(
        '%c next state', 
        `color: ${opts.colors?.nextState}; font-weight: bold`, 
        nextState
      );
      
      // Log state diff if enabled
      if (opts.diff && typeof prevState === 'object' && typeof nextState === 'object') {
        const diff = objectDiff(prevState, nextState);
        
        if (Object.keys(diff).length > 0) {
          logger.log(
            '%c diff', 
            'font-weight: bold', 
            diff
          );
        }
      }
      
      // Log duration if enabled
      if (opts.duration) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        logger.log(
          `%c duration: %c ${duration}ms`, 
          'font-weight: bold', 
          `color: ${duration > 100 ? '#FF0000' : '#008000'}; font-weight: bold`
        );
      }
      
      // End the log group
      logger.groupEnd();
      
      return returnValue;
    } catch (e) {
      // Log errors if enabled
      if (opts.logErrors) {
        logger.error('%c Logger caught an error!', `color: ${opts.colors?.error}`, e);
      }
      
      // Close group if it was opened
      try {
        logger.groupEnd();
      } catch (ignore) {
        // Ignore groupEnd errors
      }
      
      // Re-throw the error
      throw e;
    }
  }) as Middleware;
};

/**
 * Default logger middleware instance with standard configuration
 */
export const loggerMiddleware = createLoggerMiddleware({
  collapsed: true,
  duration: true,
  diff: isDevelopment, // Only show diffs in development mode
  predicate: (_, action) => {
    // Skip certain types of actions from logging to reduce noise
    const actionsToSkip = [
      // Types that can generate too much noise
      '@@router/LOCATION_CHANGE',
      '@@redux-form/CHANGE',
      '@@redux-form/BLUR',
      '@@redux-form/FOCUS',
      // Add more common actions to skip as needed
    ];
    
    return !actionsToSkip.includes(action.type);
  },
  level: app.logging?.level // Use application's configured log level
});