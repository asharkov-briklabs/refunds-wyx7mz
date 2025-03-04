/**
 * Refund Method Constants
 * 
 * This module provides constants and utility functions related to refund methods
 * used throughout the frontend application.
 */

import { RefundMethod } from '../types/refund.types';

/**
 * Human-readable labels for each refund method
 */
export const REFUND_METHOD_LABELS: Record<RefundMethod, string> = {
  [RefundMethod.ORIGINAL_PAYMENT]: 'Original Payment Method',
  [RefundMethod.BALANCE]: 'Merchant Balance',
  [RefundMethod.OTHER]: 'Bank Account'
};

/**
 * Detailed descriptions for each refund method
 */
export const REFUND_METHOD_DESCRIPTIONS: Record<RefundMethod, string> = {
  [RefundMethod.ORIGINAL_PAYMENT]: 'Refund to the customer\'s original payment method used for the transaction',
  [RefundMethod.BALANCE]: 'Refund to the merchant balance account',
  [RefundMethod.OTHER]: 'Refund to a specified bank account'
};

/**
 * Icon names for each refund method to be used with icon components
 */
export const REFUND_METHOD_ICONS: Record<RefundMethod, string> = {
  [RefundMethod.ORIGINAL_PAYMENT]: 'credit-card',
  [RefundMethod.BALANCE]: 'wallet',
  [RefundMethod.OTHER]: 'bank'
};

/**
 * Estimated processing times for each refund method
 */
export const REFUND_METHOD_PROCESSING_TIMES: Record<RefundMethod, string> = {
  [RefundMethod.ORIGINAL_PAYMENT]: '5-7 business days',
  [RefundMethod.BALANCE]: 'Immediate',
  [RefundMethod.OTHER]: '3-5 business days'
};

/**
 * Priority values for sorting refund methods (lower number = higher priority)
 */
export const REFUND_METHOD_PRIORITY: Record<RefundMethod, number> = {
  [RefundMethod.ORIGINAL_PAYMENT]: 1,
  [RefundMethod.BALANCE]: 2,
  [RefundMethod.OTHER]: 3
};

/**
 * Returns the human-readable label for a refund method
 * 
 * @param method - The refund method
 * @returns The display label for the specified refund method
 */
export const getRefundMethodLabel = (method: RefundMethod): string => {
  return REFUND_METHOD_LABELS[method] || 'Unknown Method';
};

/**
 * Returns the detailed description for a refund method
 * 
 * @param method - The refund method
 * @returns The description for the specified refund method
 */
export const getRefundMethodDescription = (method: RefundMethod): string => {
  return REFUND_METHOD_DESCRIPTIONS[method] || 'No description available';
};

/**
 * Returns the icon name for a refund method to use with icon components
 * 
 * @param method - The refund method
 * @returns The icon name for the specified refund method
 */
export const getRefundMethodIcon = (method: RefundMethod): string => {
  return REFUND_METHOD_ICONS[method] || 'circle-question';
};

/**
 * Returns the estimated processing time for a refund method
 * 
 * @param method - The refund method
 * @returns The estimated processing time for the specified refund method
 */
export const getRefundMethodProcessingTime = (method: RefundMethod): string => {
  return REFUND_METHOD_PROCESSING_TIMES[method] || 'Varies';
};

/**
 * Determines if a refund method requires a bank account to be specified
 * 
 * @param method - The refund method
 * @returns True if the method requires a bank account, false otherwise
 */
export const requiresBankAccount = (method: RefundMethod): boolean => {
  return method === RefundMethod.OTHER;
};

/**
 * Returns refund methods sorted by their recommended priority
 * 
 * @param availableMethods - Array of available refund methods
 * @returns Sorted array of refund methods by priority
 */
export const getSortedRefundMethods = (availableMethods: RefundMethod[]): RefundMethod[] => {
  return [...availableMethods].sort((a, b) => 
    REFUND_METHOD_PRIORITY[a] - REFUND_METHOD_PRIORITY[b]
  );
};