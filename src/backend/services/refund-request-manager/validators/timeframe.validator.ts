import { logger } from '../../../../common/utils/logger';
import { isWithinTimeLimit, calculateDateDifference, isDateInPast } from '../../../../common/utils/date-utils'; // version: ^1.11.7
import { ValidationError } from '../../../../common/errors/validation-error';
import { ErrorCode } from '../../../../common/constants/error-codes';
import parameterResolutionService from '../../../parameter-resolution/parameter-resolution.service';

/**
 * Validates if a refund request is within the allowed timeframe based on transaction date and configuration
 * @param transaction 
 * @param merchantId 
 * @returns Returns true if timeframe is valid, or ValidationError with details if invalid
 */
export const validateTimeframe = async (
  transaction: any,
  merchantId: string
): Promise<boolean | ValidationError> => {
  try {
    // LD1: Extract transaction processed date
    const transactionDate = transaction.processedAt;

    // LD1: If transaction date is missing or invalid, return ValidationError
    if (!transactionDate) {
      logger.error('Transaction processed date is missing or invalid', { transactionId: transaction.transactionId });
      return new ValidationError(
        ErrorCode.VALIDATION_ERROR,
        'Transaction processed date is missing or invalid',
        { fieldErrors: [{ field: 'transactionDate', message: 'Transaction processed date is required' }] }
      );
    }

    // LD1: Get current date for comparison
    const currentDate = new Date();

    // LD1: Retrieve refundTimeLimit parameter using parameterResolutionService for the merchant
    let refundTimeLimit = await parameterResolutionService.getParameterValue('refundTimeLimit', merchantId);

    // LD1: If card network is present in transaction, get network-specific time limit
    let cardNetworkTimeLimit = null;
    if (transaction.cardNetwork) {
      cardNetworkTimeLimit = await getCardNetworkTimeLimit(transaction.cardNetwork, merchantId);
    }

    // LD1: Determine the effective time limit (card network limit takes precedence)
    const effectiveTimeLimit = cardNetworkTimeLimit !== null ? cardNetworkTimeLimit : refundTimeLimit;

    // LD1: Calculate elapsed days since transaction
    const elapsedDays = calculateDateDifference(transactionDate, currentDate, 'day');

    // LD1: Compare elapsed days with time limit
    if (elapsedDays > effectiveTimeLimit) {
      logger.debug('Refund timeframe validation failed', {
        transactionId: transaction.transactionId,
        transactionDate,
        currentDate,
        refundTimeLimit,
        cardNetworkTimeLimit,
        effectiveTimeLimit,
        elapsedDays
      });
      // LD1: Return ValidationError with REFUND_TIME_LIMIT_EXCEEDED
      return new ValidationError(
        ErrorCode.REFUND_TIME_LIMIT_EXCEEDED,
        'Refund timeframe validation failed',
        {
          fieldErrors: [
            {
              field: 'transactionDate',
              message: `Refund cannot be processed as it exceeds the allowed timeframe of ${effectiveTimeLimit} days`,
              code: 'REFUND_TIME_LIMIT_EXCEEDED'
            }
          ],
          additionalData: {
            transactionDate,
            currentDate,
            refundTimeLimit,
            cardNetworkTimeLimit,
            effectiveTimeLimit,
            elapsedDays
          }
        }
      );
    }

    logger.debug('Refund timeframe validation passed', {
      transactionId: transaction.transactionId,
      transactionDate,
      currentDate,
      refundTimeLimit,
      cardNetworkTimeLimit,
      effectiveTimeLimit,
      elapsedDays
    });
    // LD1: Return true if timeframe is valid
    return true;
  } catch (error: any) {
    // LD1: Log and handle errors during validation
    logger.error('Error during timeframe validation', {
      transactionId: transaction.transactionId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Retrieves timeframe limitations specific to card networks
 * @param cardNetwork 
 * @param merchantId 
 * @returns Card network-specific time limit in days or null if not configured
 */
export const getCardNetworkTimeLimit = async (
  cardNetwork: string,
  merchantId: string
): Promise<number | null> => {
  try {
    // LD1: Normalize card network identifier to uppercase
    const normalizedCardNetwork = cardNetwork.toUpperCase();

    // LD1: Construct parameter name using format 'cardNetwork_{NETWORK}_timeLimit'
    const parameterName = `cardNetwork_${normalizedCardNetwork}_timeLimit`;

    // LD1: Get parameter value using parameterResolutionService
    const timeLimit = await parameterResolutionService.getParameterValue(parameterName, merchantId);

    logger.debug('Retrieved card network time limit', {
      cardNetwork,
      parameterName,
      timeLimit
    });
    // LD1: Return the card network time limit or null if not configured
    return timeLimit !== undefined ? Number(timeLimit) : null;
  } catch (error: any) {
    // LD1: Handle errors during parameter resolution
    logger.error('Error retrieving card network time limit', {
      cardNetwork,
      error: error.message,
      stack: error.stack
    });
    return null;
  }
};

/**
 * Retrieves the merchant's configured general refund time limit
 * @param merchantId 
 * @returns Merchant's refund time limit in days (default: 90)
 */
export const getMerchantTimeLimit = async (merchantId: string): Promise<number> => {
  try {
    // LD1: Get refundTimeLimit parameter using parameterResolutionService
    const timeLimit = await parameterResolutionService.getParameterValue('refundTimeLimit', merchantId);

    logger.debug('Retrieved merchant time limit', {
      merchantId,
      timeLimit
    });
    // LD1: Return the configured value or default to 90 days if not configured
    return timeLimit !== undefined ? Number(timeLimit) : 90;
  } catch (error: any) {
    // LD1: Handle errors during parameter resolution
    logger.error('Error retrieving merchant time limit', {
      merchantId,
      error: error.message,
      stack: error.stack
    });
    return 90;
  }
};