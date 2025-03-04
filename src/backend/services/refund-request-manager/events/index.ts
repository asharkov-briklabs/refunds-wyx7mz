import { handleRefundCreated, initialize as initializeRefundCreatedHandler } from './refund-created.handler';
import { handleRefundStatusChanged, registerRefundStatusChangedHandler } from './refund-status-changed.handler';

/**
 * Initializes all refund event handlers and returns a cleanup function
 * @returns Cleanup function to deregister all event handlers
 */
const initializeEventHandlers = (): Function => {
  // LD1: Ensure all event handlers are initialized
  // LD2: Implement all steps described in the function description

  // 1. Initialize the refund created event handler
  initializeRefundCreatedHandler();
  logger.info('Initialized refund created event handler.');

  // 2. Register the refund status changed handler
  const unsubscribeRefundStatusChanged = registerRefundStatusChangedHandler();
  logger.info('Registered refund status changed event handler.');

  // 3. Return a cleanup function that will unregister all handlers when called
  return () => {
    unsubscribeRefundStatusChanged();
    logger.info('Deregistered all event handlers.');
  };
};

// IE1: Ensure logger is used correctly based on the source files provided
import { logger } from '../../../common/utils/logger';

// IE1: Ensure initialize and handleRefundCreated are used correctly based on the source files provided
// IE1: Ensure registerRefundStatusChangedHandler and handleRefundStatusChanged are used correctly based on the source files provided

// O1: Export the handler function for refund created events
export { handleRefundCreated };

// O1: Export the handler function for refund status changed events
export { handleRefundStatusChanged };

// O1: Export the function to initialize all event handlers
export { initializeEventHandlers };