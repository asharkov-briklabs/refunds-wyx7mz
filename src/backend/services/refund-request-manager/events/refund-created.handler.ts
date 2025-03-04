import { logger } from '../../../common/utils/logger';
import { eventBus } from '../../../common/utils/event-emitter';
import { REFUND_EVENTS } from '../../../common/constants/event-types';
import { RefundStatus } from '../../../common/enums/refund-status.enum';
import notificationService from '../../notification-service';

/**
 * Handles the refund created event by logging the event and sending notifications
 * @param payload - The event payload containing refund details
 * @returns Promise<void> - Resolves when all handlers have completed
 */
const handleRefundCreated = async (payload: any): Promise<void> => {
  // 1. Extract refund data from the event payload
  const { refundId, transactionId, merchantId, amount, currency, reason } = payload;

  // 2. Log the refund creation event with relevant details
  logger.info('Handling refund created event', { refundId, transactionId, merchantId });

  // 3. Prepare notification context with refund details
  const notificationContext = {
    merchantName: 'TechCorp', // TODO: Retrieve merchant name from merchant service
    refundId: refundId,
    transactionId: transactionId,
    amount: amount,
    currency: currency,
    reason: reason
  };

  // 4. Send notifications to appropriate stakeholders
  try {
    // Send notification to merchant
    await notificationService.sendNotification(
      'REFUND_CREATED',
      'merchant@example.com', // TODO: Retrieve merchant contact email from merchant service
      'EMAIL',
      notificationContext
    );

    // Send notification to admin
    await notificationService.sendNotification(
      'REFUND_CREATED',
      'admin@example.com', // TODO: Retrieve admin contact email from configuration
      'EMAIL',
      notificationContext
    );
  } catch (error: any) {
    // 5. Handle any errors that occur during processing
    logger.error('Error sending refund created notifications', { error: error.message, refundId });
  }
};

/**
 * Initializes the refund created event handler by subscribing to the event
 */
const initialize = (): void => {
  // 1. Subscribe to the REFUND_EVENTS.CREATED event
  eventBus.on(REFUND_EVENTS.CREATED, handleRefundCreated);

  // 2. Log successful initialization of the handler
  logger.info('Refund created event handler initialized');
};

// 3. Export the initialize function
export { initialize, handleRefundCreated };