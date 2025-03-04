import BankAccountList from './BankAccountList'; // Import the main BankAccountList component for re-export
import { BankAccountListProps } from './BankAccountList'; // Import the BankAccountListProps interface for type checking

// Re-export the BankAccountList component as default export for easier imports
export default BankAccountList;

// Re-export the BankAccountListProps interface for type checking
export type { BankAccountListProps };