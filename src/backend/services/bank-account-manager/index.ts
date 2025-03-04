import { BankAccountManager } from './bank-account-manager.service'; // Import BankAccountManager service class
import { BankAccountVerifier } from './verifier'; // Import BankAccountVerifier class for re-export
import { BankAccountEncryption } from './encryption'; // Import BankAccountEncryption class for re-export
import { 
  validateRoutingNumber, 
  isValidRoutingNumber, 
  validateAccountNumber, 
  isValidAccountNumber 
} from './validators'; // Import validation functions for re-export

// Create a new instance of the BankAccountManager class
const bankAccountVerifier = new BankAccountVerifier();
const bankAccountManager = new BankAccountManager(new BankAccountRepository(), bankAccountVerifier);

// Export the BankAccountManager class and its methods
export { 
  BankAccountManager,
  bankAccountManager as default, // Default export of the BankAccountManager class for convenient importing
};

// Export the BankAccountVerifier class and its methods
export { BankAccountVerifier };

// Export the BankAccountEncryption class and its methods
export { BankAccountEncryption };

// Export the validation functions
export {
  validateRoutingNumber, // Function for comprehensive routing number validation
  isValidRoutingNumber, // Utility function for simple routing number validation
  validateAccountNumber, // Function for comprehensive account number validation
  isValidAccountNumber // Utility function for simple account number validation
};
import { BankAccountRepository } from '../../database/repositories/bank-account.repo';