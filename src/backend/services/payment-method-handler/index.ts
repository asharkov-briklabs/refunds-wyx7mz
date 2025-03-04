import { PaymentMethodHandlerService, paymentMethodHandlerService } from './payment-method-handler.service';
import { PaymentMethodHandler, paymentMethodRegistry } from './registry';
import { CreditCardHandler, DebitCardHandler, ACHHandler, WalletHandler, BalanceHandler, OtherHandler } from './handlers';
import { RefundMethod } from '../../common/enums/refund-method.enum';

/**
 * Registers all payment method handlers with the registry
 */
function initializeHandlers(): void {
  // Register credit card handler for credit card payment methods
  paymentMethodRegistry.registerHandler('creditCardHandler', new CreditCardHandler(), ['CREDIT_CARD']);

  // Register debit card handler for debit card payment methods
  paymentMethodRegistry.registerHandler('debitCardHandler', new DebitCardHandler(), ['DEBIT_CARD']);

  // Register ACH handler for bank transfer payment methods
  paymentMethodRegistry.registerHandler('achHandler', new ACHHandler(), ['ACH']);

  // Register wallet handler for digital wallet payment methods
  paymentMethodRegistry.registerHandler('walletHandler', new WalletHandler(), ['WALLET']);

  // Register dedicated handlers for each refund method (ORIGINAL_PAYMENT, BALANCE, OTHER)
  paymentMethodRegistry.registerRefundMethodHandler(RefundMethod.ORIGINAL_PAYMENT, new CreditCardHandler());
  paymentMethodRegistry.registerRefundMethodHandler(RefundMethod.BALANCE, new BalanceHandler());
  paymentMethodRegistry.registerRefundMethodHandler(RefundMethod.OTHER, new OtherHandler());
}

// Initialize the handlers on module load
initializeHandlers();

// Export the payment method handler interface
export type { PaymentMethodHandler };

// Export the paymentMethodRegistry instance
export { paymentMethodRegistry };

// Export the PaymentMethodHandlerService class
export { PaymentMethodHandlerService };

// Export the paymentMethodHandlerService instance
export { paymentMethodHandlerService };