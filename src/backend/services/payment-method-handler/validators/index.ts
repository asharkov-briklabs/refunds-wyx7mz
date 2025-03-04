// Import individual validator functions for different payment methods
import { validateCreditCardRefund } from './credit-card.validator';
import { validateDebitCardRefund } from './debit-card.validator';
import validateBankAccountRefund, { validateBankAccountAccess, validateBankAccountStatus, getBankAccountForValidation } from './bank-account.validator';

/**
 * Exports all payment method validators, providing a centralized import point for the different validation functions used in the payment method handler service
 */

// LD1: Export the credit card refund validator
export { validateCreditCardRefund };

// LD1: Export the debit card refund validator
export { validateDebitCardRefund };

// LD1: Export the bank account refund validator
export { validateBankAccountRefund };

// LD1: Export the bank account access validator
export { validateBankAccountAccess };

// LD1: Export the bank account status validator
export { validateBankAccountStatus };

// LD1: Export the function to retrieve bank account for validation
export { getBankAccountForValidation };