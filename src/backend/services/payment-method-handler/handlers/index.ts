import { CreditCardHandler } from './credit-card-handler';
import { DebitCardHandler } from './debit-card-handler';
import { ACHHandler } from './ach-handler';
import { WalletHandler } from './wallet-handler';
import { BalanceHandler } from './balance-handler';
import { OtherHandler } from './other-handler';

/**
 * Exports all payment method handlers for use in the payment method registry.
 * This file serves as an aggregation point for the different handlers that implement the PaymentMethodHandler interface,
 * making them available for registration with the payment method registry.
 */

// LD1: Export credit card handler for registration in payment method registry
export { CreditCardHandler };

// LD1: Export debit card handler for registration in payment method registry
export { DebitCardHandler };

// LD1: Export ACH handler for registration in payment method registry
export { ACHHandler };

// LD1: Export digital wallet handler for registration in payment method registry
export { WalletHandler };

// LD1: Export balance handler for registration in payment method registry
export { BalanceHandler };

// LD1: Export bank account handler for registration in payment method registry
export { OtherHandler };