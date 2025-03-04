/**
 * Enum representing the supported payment gateway types.
 * This enum is used throughout the application to standardize
 * references to payment processors for refund operations.
 * 
 * Supported gateways:
 * - STRIPE: Stripe payment processor (API Version: 2023-08-16)
 * - ADYEN: Adyen payment processor (API Version: v68)
 * - FISERV: Fiserv payment processor (API Version: 2021-03)
 */
export enum GatewayType {
  /**
   * Stripe payment gateway
   */
  STRIPE = 'STRIPE',

  /**
   * Adyen payment gateway
   */
  ADYEN = 'ADYEN',

  /**
   * Fiserv payment gateway
   */
  FISERV = 'FISERV'
}