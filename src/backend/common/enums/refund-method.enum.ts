/**
 * Enum defining the available refund methods in the Refunds Service.
 * 
 * ORIGINAL_PAYMENT: Refund to the payment method used in the original transaction
 * BALANCE: Refund to the merchant's balance account
 * OTHER: Refund to an alternative payment method (e.g., bank account)
 */
export enum RefundMethod {
  /**
   * Refund to the original payment method used in the transaction
   */
  ORIGINAL_PAYMENT = 'ORIGINAL_PAYMENT',
  
  /**
   * Refund to the merchant's balance account
   */
  BALANCE = 'BALANCE',
  
  /**
   * Refund to an alternative payment method such as a bank account
   */
  OTHER = 'OTHER'
}