import BalanceServiceClient from '../../../integrations/balance-service/client';
import { 
  MerchantBalance, 
  BalanceUpdateRequest, 
  BalanceUpdateResponse, 
  BalanceOperation, 
  BalanceCheckRequest 
} from '../../../integrations/balance-service/types';
import { BusinessError } from '../../../common/errors';

// Pre-configured merchant balances for different test scenarios
export const mockMerchantBalances = {
  // Merchant with sufficient balance for most refunds
  sufficientBalance: {
    merchantId: 'merchant_sufficient_balance',
    availableBalance: 1000.00,
    currency: 'USD',
    pendingBalance: 200.00,
    totalBalance: 1200.00,
    lastUpdated: new Date().toISOString()
  } as MerchantBalance,
  
  // Merchant with insufficient balance for refunds
  insufficientBalance: {
    merchantId: 'merchant_insufficient_balance',
    availableBalance: 10.00,
    currency: 'USD',
    pendingBalance: 5.00,
    totalBalance: 15.00,
    lastUpdated: new Date().toISOString()
  } as MerchantBalance,
  
  // Merchant with zero balance
  zeroBalance: {
    merchantId: 'merchant_zero_balance',
    availableBalance: 0.00,
    currency: 'USD',
    pendingBalance: 0.00,
    totalBalance: 0.00,
    lastUpdated: new Date().toISOString()
  } as MerchantBalance,
  
  // Merchant with high balance
  highBalance: {
    merchantId: 'merchant_high_balance',
    availableBalance: 10000.00,
    currency: 'USD',
    pendingBalance: 2000.00,
    totalBalance: 12000.00,
    lastUpdated: new Date().toISOString()
  } as MerchantBalance
};

/**
 * Mock implementation of the Balance Service client for testing
 */
export class MockBalanceServiceClient {
  // Store merchant balances for the mock
  private merchantBalances: Map<string, MerchantBalance>;
  
  // Mock functions for tracking calls in tests
  getBalanceMock: jest.Mock;
  hasSufficientBalanceMock: jest.Mock;
  updateBalanceMock: jest.Mock;
  
  /**
   * Initializes the mock balance service client with default mock implementations
   * 
   * @param mockOptions - Optional configuration for the mock client
   */
  constructor(mockOptions: any = {}) {
    // Initialize merchant balances map with predefined test data
    this.merchantBalances = new Map();
    
    // Add default mock merchant balances
    const defaultBalances = mockOptions.merchantBalances || {
      [mockMerchantBalances.sufficientBalance.merchantId]: mockMerchantBalances.sufficientBalance,
      [mockMerchantBalances.insufficientBalance.merchantId]: mockMerchantBalances.insufficientBalance,
      [mockMerchantBalances.zeroBalance.merchantId]: mockMerchantBalances.zeroBalance,
      [mockMerchantBalances.highBalance.merchantId]: mockMerchantBalances.highBalance,
    };
    
    // Add each balance to the map
    Object.entries(defaultBalances).forEach(([merchantId, balance]) => {
      this.merchantBalances.set(merchantId, balance as MerchantBalance);
    });
    
    // Set up jest mock functions
    this.getBalanceMock = mockOptions.getBalanceMock || jest.fn();
    this.hasSufficientBalanceMock = mockOptions.hasSufficientBalanceMock || jest.fn();
    this.updateBalanceMock = mockOptions.updateBalanceMock || jest.fn();
    
    // Configure default implementation for getBalance
    this.getBalanceMock.mockImplementation((request: BalanceCheckRequest) => {
      const balance = this.merchantBalances.get(request.merchantId);
      if (balance) {
        return Promise.resolve({
          ...balance,
          currency: request.currency || balance.currency
        });
      }
      return Promise.resolve(this._createDefaultMerchantBalance(request.merchantId, request.currency || 'USD'));
    });
    
    // Configure default implementation for hasSufficientBalance
    this.hasSufficientBalanceMock.mockImplementation((merchantId: string, amount: number, currency: string) => {
      const balance = this.merchantBalances.get(merchantId);
      if (!balance) {
        return Promise.resolve(false);
      }
      return Promise.resolve(balance.availableBalance >= amount && balance.currency === currency);
    });
    
    // Configure default implementation for updateBalance
    this.updateBalanceMock.mockImplementation((request: BalanceUpdateRequest) => {
      let balance = this.merchantBalances.get(request.merchantId);
      
      // If balance doesn't exist, create a default one
      if (!balance) {
        balance = this._createDefaultMerchantBalance(request.merchantId, request.currency);
        this.merchantBalances.set(request.merchantId, balance);
      }
      
      // Check if currency matches
      if (balance.currency !== request.currency) {
        const error = new BusinessError(
          'RULE_VIOLATION',
          `Currency mismatch: merchant balance is in ${balance.currency}, but request is in ${request.currency}`
        );
        return Promise.reject(error);
      }
      
      // Calculate new balance based on operation
      const previousBalance = balance.availableBalance;
      let newBalance = previousBalance;
      
      if (request.operation === BalanceOperation.CREDIT) {
        newBalance += request.amount;
      } else if (request.operation === BalanceOperation.DEBIT) {
        // Check if there's sufficient balance for a debit operation
        if (balance.availableBalance < request.amount) {
          const error = new BusinessError(
            'INSUFFICIENT_BALANCE',
            `Insufficient balance: available balance (${balance.availableBalance}) is less than the requested amount (${request.amount})`,
            {
              message: `Insufficient balance for debit operation`,
              additionalData: {
                availableBalance: balance.availableBalance,
                requestedAmount: request.amount
              }
            }
          );
          return Promise.reject(error);
        }
        newBalance -= request.amount;
      }
      
      // Update the merchant balance
      balance.availableBalance = newBalance;
      balance.totalBalance = newBalance + balance.pendingBalance;
      balance.lastUpdated = new Date().toISOString();
      
      this.merchantBalances.set(request.merchantId, balance);
      
      // Return success response
      const response: BalanceUpdateResponse = {
        transactionId: `mock_transaction_${Date.now()}`,
        merchantId: request.merchantId,
        amount: request.amount,
        currency: request.currency,
        operation: request.operation,
        previousBalance,
        newBalance,
        status: 'SUCCESS',
        timestamp: new Date().toISOString()
      };
      
      return Promise.resolve(response);
    });
  }
  
  /**
   * Mock implementation of getBalance that returns predefined merchant balance data
   * 
   * @param request - The balance check request parameters
   * @returns Promise resolving to merchant balance data
   */
  async getBalance(request: BalanceCheckRequest): Promise<MerchantBalance> {
    return this.getBalanceMock(request);
  }
  
  /**
   * Mock implementation of hasSufficientBalance for testing balance checks
   * 
   * @param merchantId - Merchant identifier
   * @param amount - Amount to check against available balance
   * @param currency - Currency code
   * @returns Promise resolving to true if sufficient balance, false otherwise
   */
  async hasSufficientBalance(merchantId: string, amount: number, currency: string): Promise<boolean> {
    return this.hasSufficientBalanceMock(merchantId, amount, currency);
  }
  
  /**
   * Mock implementation of updateBalance for testing balance updates during refunds
   * 
   * @param request - The balance update request
   * @returns Promise resolving to balance update result
   */
  async updateBalance(request: BalanceUpdateRequest): Promise<BalanceUpdateResponse> {
    return this.updateBalanceMock(request);
  }
  
  /**
   * Helper method to create a default merchant balance for testing
   * 
   * @param merchantId - Merchant identifier
   * @param currency - Currency code
   * @returns A default merchant balance object
   */
  private _createDefaultMerchantBalance(merchantId: string, currency: string): MerchantBalance {
    return {
      merchantId,
      availableBalance: 100.00, // Default small balance
      currency,
      pendingBalance: 0.00,
      totalBalance: 100.00,
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Adds a custom merchant balance to the mock dataset
   * 
   * @param balance - The merchant balance to add
   */
  addMerchantBalance(balance: MerchantBalance): void {
    this.merchantBalances.set(balance.merchantId, balance);
  }
  
  /**
   * Resets all mock functions to their default implementations
   */
  resetMocks(): void {
    // Clear recorded calls
    this.getBalanceMock.mockClear();
    this.hasSufficientBalanceMock.mockClear();
    this.updateBalanceMock.mockClear();
    
    // Reset merchant balances to initial test data
    this.merchantBalances.clear();
    this.merchantBalances.set(mockMerchantBalances.sufficientBalance.merchantId, mockMerchantBalances.sufficientBalance);
    this.merchantBalances.set(mockMerchantBalances.insufficientBalance.merchantId, mockMerchantBalances.insufficientBalance);
    this.merchantBalances.set(mockMerchantBalances.zeroBalance.merchantId, mockMerchantBalances.zeroBalance);
    this.merchantBalances.set(mockMerchantBalances.highBalance.merchantId, mockMerchantBalances.highBalance);
  }
}

/**
 * Factory function to create a configured instance of the mock Balance Service client
 * 
 * @param mockOptions - Optional configuration for the mock client
 * @returns An initialized mock balance service client
 */
export function createBalanceServiceMock(mockOptions: any = {}): MockBalanceServiceClient {
  return new MockBalanceServiceClient(mockOptions);
}