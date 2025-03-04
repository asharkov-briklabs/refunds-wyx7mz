import { validateAmount, validateFullRefund, validatePartialRefund } from './amount.validator';
import { validateTimeframe, getCardNetworkTimeLimit, getMerchantTimeLimit } from './timeframe.validator';
import { validateMethod, isMethodAvailable, getAllowedRefundMethods, selectRefundMethod } from './method.validator';

/**
 * Validates if a refund amount is valid according to business rules and constraints
 * @param refundAmount The refund amount
 * @param transaction The transaction
 * @param merchantId The merchantId
 * @returns Returns true if amount is valid, or ValidationError with details if invalid
 */
export { validateAmount };

/**
 * Validates that a full refund is allowed for the given transaction
 * @param transaction The transaction
 * @param merchantId The merchantId
 * @returns Returns true if full refund is allowed, or ValidationError with details if not
 */
export { validateFullRefund };

/**
 * Validates that a partial refund amount is valid for the given transaction
 * @param partialAmount The partial amount
 * @param transaction The transaction
 * @param merchantId The merchantId
 * @returns Returns true if partial refund amount is valid, or ValidationError with details if not
 */
export { validatePartialRefund };

/**
 * Validates if a refund request is within the allowed timeframe
 * @param transaction 
 * @param merchantId 
 * @returns Returns true if timeframe is valid, or ValidationError with details if invalid
 */
export { validateTimeframe };

/**
 * Retrieves timeframe limitations specific to card networks
 * @param cardNetwork 
 * @param merchantId 
 * @returns Card network-specific time limit in days or null if not configured
 */
export { getCardNetworkTimeLimit };

/**
 * Retrieves the merchant's configured general refund time limit
 * @param merchantId 
 * @returns Merchant's refund time limit in days (default: 90)
 */
export { getMerchantTimeLimit };

/**
 * Validates if a refund method is valid according to business rules and constraints
 * @param refundMethod 
 * @param transaction 
 * @param merchantId 
 * @param bankAccountId 
 * @returns Returns true if method is valid, or ValidationError with details if invalid
 */
export { validateMethod };

/**
 * Checks if a specific refund method is available for a transaction
 * @param refundMethod 
 * @param transaction 
 * @param merchantId 
 * @param bankAccountId 
 * @returns Validation result indicating if the method is available and any error details
 */
export { isMethodAvailable };

/**
 * Retrieves the allowed refund methods for a merchant from configuration
 * @param merchantId 
 * @returns Array of allowed refund methods for the merchant
 */
export { getAllowedRefundMethods };

/**
 * Automatically selects the best refund method for a transaction
 * @param transaction 
 * @param merchantId 
 * @returns The selected refund method
 */
export { selectRefundMethod };