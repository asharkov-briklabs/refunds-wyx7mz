/**
 * Test Fixtures Index
 * 
 * Central export file for all test fixtures used in the Refunds Service. This
 * module consolidates fixtures from various domains, providing a single import
 * point for tests that need access to mock data.
 * 
 * The fixtures include:
 * - Refund requests in various states (draft, submitted, processing, etc.)
 * - Bank accounts with different verification statuses
 * - Configuration parameters at different hierarchy levels
 * 
 * Usage example:
 * 
 * ```typescript
 * import { mockRefundRequests, createBankAccount, mockParameters } from '../fixtures';
 * 
 * test('should process a refund', () => {
 *   const refundRequest = mockRefundRequests.draft;
 *   // test implementation...
 * });
 * ```
 */

// Import refund fixtures
import * as refundFixtures from './refunds.fixture';

// Import bank account fixtures
import * as bankAccountFixtures from './bank-accounts.fixture';

// Import parameter fixtures
import * as parameterFixtures from './parameters.fixture';

// Re-export all fixtures

// Refund fixtures
export const {
  mockRefundRequests,
  createRefundRequest,
  createStatusHistoryEntry
} = refundFixtures;

// Bank account fixtures
export const {
  mockBankAccounts,
  mockBankAccountRequests,
  createBankAccount,
  createBankAccountRequest,
  validRoutingNumbers,
  invalidRoutingNumbers
} = bankAccountFixtures;

// Parameter fixtures
export const {
  mockParameterDefinitions,
  mockParameters,
  createParameterDefinition,
  createParameter
} = parameterFixtures;

// Export entity IDs from both fixture files
// Use refundFixtures.mockEntityIds for refund-related entity IDs
export const mockEntityIds = {
  // Refund-related entity IDs
  merchant: refundFixtures.mockEntityIds.merchant,
  customer: refundFixtures.mockEntityIds.customer,
  transaction: refundFixtures.mockEntityIds.transaction,
  user: refundFixtures.mockEntityIds.user,
  approval: refundFixtures.mockEntityIds.approval,
  
  // Parameter-related entity IDs
  bank: parameterFixtures.mockEntityIds.bank,
  program: parameterFixtures.mockEntityIds.program,
  organization: parameterFixtures.mockEntityIds.organization
};