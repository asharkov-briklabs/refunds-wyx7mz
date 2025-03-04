import jest from 'jest'; // jest@^29.5.0
import { MerchantServiceClientImpl } from '../../../integrations/merchant-service/client';
import {
  Merchant,
  Organization,
  Program,
  Bank,
  MerchantRefundConfiguration,
  MerchantStatus
} from '../../../common/interfaces/merchant.interface';
import {
  GetMerchantParams,
  MerchantResponse,
  GetMerchantsParams,
  MerchantsResponse,
  ValidateMerchantParams,
  MerchantValidationResult,
  GetRefundConfigurationParams,
  RefundConfigurationResponse,
  ConfigurationInheritanceChain,
  GetOrganizationParams,
  OrganizationResponse,
  GetProgramParams,
  ProgramResponse,
  GetBankParams,
  BankResponse
} from '../../../integrations/merchant-service/types';

/**
 * Mock implementation of the Merchant Service client for testing purposes
 */
export class MockMerchantServiceClient extends MerchantServiceClientImpl {
  // Maps to store mock data
  merchants: Map<string, Merchant> = new Map();
  organizations: Map<string, Organization> = new Map();
  programs: Map<string, Program> = new Map();
  banks: Map<string, Bank> = new Map();
  
  // Mock functions for each method
  getMerchantMock = jest.fn();
  getMerchantsMock = jest.fn();
  getMerchantsByOrganizationMock = jest.fn();
  getMerchantsByProgramMock = jest.fn();
  getMerchantsByBankMock = jest.fn();
  validateMerchantMock = jest.fn();
  getRefundConfigurationMock = jest.fn();
  getOrganizationMock = jest.fn();
  getProgramMock = jest.fn();
  getBankMock = jest.fn();
  
  constructor() {
    super({});
    
    // Initialize with default test data
    this._initializeTestData();
    
    // Set up mock implementations
    this._setupMockImplementations();
  }
  
  /**
   * Mock implementation of getMerchant that returns predefined merchant data
   */
  async getMerchant(merchantIdOrParams: string | GetMerchantParams): Promise<Merchant | MerchantResponse> {
    return this.getMerchantMock(merchantIdOrParams);
  }
  
  /**
   * Mock implementation of getMerchants that returns a list of merchants based on filters
   */
  async getMerchants(filterOrParams?: any | GetMerchantsParams): Promise<Merchant[] | MerchantsResponse> {
    return this.getMerchantsMock(filterOrParams);
  }
  
  /**
   * Mock implementation of getMerchantsByOrganization that returns merchants for a specific organization
   */
  async getMerchantsByOrganization(
    organizationId: string,
    options?: any
  ): Promise<Merchant[] | MerchantsResponse> {
    return this.getMerchantsByOrganizationMock(organizationId, options);
  }
  
  /**
   * Mock implementation of getMerchantsByProgram that returns merchants for a specific program
   */
  async getMerchantsByProgram(
    programId: string,
    options?: any
  ): Promise<Merchant[] | MerchantsResponse> {
    return this.getMerchantsByProgramMock(programId, options);
  }
  
  /**
   * Mock implementation of getMerchantsByBank that returns merchants for a specific bank
   */
  async getMerchantsByBank(
    bankId: string,
    options?: any
  ): Promise<Merchant[] | MerchantsResponse> {
    return this.getMerchantsByBankMock(bankId, options);
  }
  
  /**
   * Mock implementation of validateMerchant for testing merchant validation
   */
  async validateMerchant(
    merchantIdOrParams: string | ValidateMerchantParams
  ): Promise<boolean | MerchantValidationResult> {
    return this.validateMerchantMock(merchantIdOrParams);
  }
  
  /**
   * Mock implementation of getRefundConfiguration that returns refund configuration for a merchant
   */
  async getRefundConfiguration(
    merchantIdOrParams: string | GetRefundConfigurationParams
  ): Promise<MerchantRefundConfiguration | RefundConfigurationResponse> {
    return this.getRefundConfigurationMock(merchantIdOrParams);
  }
  
  /**
   * Mock implementation of getOrganization that returns organization data
   */
  async getOrganization(
    organizationIdOrParams: string | GetOrganizationParams
  ): Promise<Organization | OrganizationResponse> {
    return this.getOrganizationMock(organizationIdOrParams);
  }
  
  /**
   * Mock implementation of getProgram that returns program data
   */
  async getProgram(
    programIdOrParams: string | GetProgramParams
  ): Promise<Program | ProgramResponse> {
    return this.getProgramMock(programIdOrParams);
  }
  
  /**
   * Mock implementation of getBank that returns bank data
   */
  async getBank(
    bankIdOrParams: string | GetBankParams
  ): Promise<Bank | BankResponse> {
    return this.getBankMock(bankIdOrParams);
  }
  
  /**
   * Initialize test data for merchants, organizations, programs, and banks
   */
  private _initializeTestData(): void {
    // Create banks
    const defaultBank = this._createMockBank('bank_001', 'Default Bank');
    const customBank = this._createMockBank('bank_002', 'Custom Bank');
    
    // Create programs
    const defaultProgram = this._createMockProgram('program_001', 'Default Program', 'bank_001');
    const customProgram = this._createMockProgram('program_002', 'Custom Program', 'bank_002');
    
    // Create organizations
    const defaultOrganization = this._createMockOrganization(
      'org_001', 'Default Organization', 'program_001', 'bank_001'
    );
    const customOrganization = this._createMockOrganization(
      'org_002', 'Custom Organization', 'program_002', 'bank_002'
    );
    
    // Create merchants
    const activeMerchant = this._createMockMerchant(
      'merchant_001', 'Active Merchant', 'org_001', 'program_001', 'bank_001', MerchantStatus.ACTIVE
    );
    const inactiveMerchant = this._createMockMerchant(
      'merchant_002', 'Inactive Merchant', 'org_001', 'program_001', 'bank_001', MerchantStatus.INACTIVE
    );
    const suspendedMerchant = this._createMockMerchant(
      'merchant_003', 'Suspended Merchant', 'org_001', 'program_001', 'bank_001', MerchantStatus.SUSPENDED
    );
    const merchantWithHighLimit = this._createMockMerchant(
      'merchant_004', 'High Limit Merchant', 'org_002', 'program_002', 'bank_002', MerchantStatus.ACTIVE
    );
    const merchantWithLowLimit = this._createMockMerchant(
      'merchant_005', 'Low Limit Merchant', 'org_001', 'program_001', 'bank_001', MerchantStatus.ACTIVE
    );
    
    // Customize high and low limit merchants
    merchantWithHighLimit.refundConfiguration.maxRefundAmount = 10000;
    merchantWithLowLimit.refundConfiguration.maxRefundAmount = 100;
    
    // Add all entities to maps
    this.banks.set(defaultBank.id, defaultBank);
    this.banks.set(customBank.id, customBank);
    
    this.programs.set(defaultProgram.id, defaultProgram);
    this.programs.set(customProgram.id, customProgram);
    
    this.organizations.set(defaultOrganization.id, defaultOrganization);
    this.organizations.set(customOrganization.id, customOrganization);
    
    this.merchants.set(activeMerchant.id, activeMerchant);
    this.merchants.set(inactiveMerchant.id, inactiveMerchant);
    this.merchants.set(suspendedMerchant.id, suspendedMerchant);
    this.merchants.set(merchantWithHighLimit.id, merchantWithHighLimit);
    this.merchants.set(merchantWithLowLimit.id, merchantWithLowLimit);
  }
  
  /**
   * Set up default mock implementations for each method
   */
  private _setupMockImplementations(): void {
    // Setup getMerchant implementation
    this.getMerchantMock.mockImplementation((merchantIdOrParams: string | GetMerchantParams) => {
      const params: GetMerchantParams = typeof merchantIdOrParams === 'string'
        ? { merchantId: merchantIdOrParams }
        : merchantIdOrParams;
      
      const merchant = this.merchants.get(params.merchantId);
      
      if (!merchant) {
        throw new Error(`Merchant not found: ${params.merchantId}`);
      }
      
      // Return just the merchant for string param, or full response object
      return typeof merchantIdOrParams === 'string'
        ? merchant
        : { merchant };
    });
    
    // Setup getMerchants implementation
    this.getMerchantsMock.mockImplementation((filterOrParams?: any | GetMerchantsParams) => {
      // Extract filters and pagination
      let filters = {};
      let pagination = { page: 0, pageSize: 20 };
      
      if (filterOrParams && typeof filterOrParams === 'object') {
        if ('filters' in filterOrParams) {
          filters = filterOrParams.filters || {};
          pagination = filterOrParams.pagination || pagination;
        } else if (!('page' in filterOrParams) && !('pageSize' in filterOrParams)) {
          filters = filterOrParams;
        }
      }
      
      // Convert Map to Array and apply filters
      let merchantsList = Array.from(this.merchants.values());
      
      // Apply filters
      if (Object.keys(filters).length > 0) {
        merchantsList = merchantsList.filter(merchant => {
          for (const [key, value] of Object.entries(filters)) {
            if (key === 'name' && typeof value === 'string') {
              if (!merchant.name.toLowerCase().includes(value.toLowerCase())) {
                return false;
              }
            } else if (key === 'status' && value) {
              if (merchant.status !== value) {
                return false;
              }
            } else if (merchant[key] !== value) {
              return false;
            }
          }
          return true;
        });
      }
      
      // Apply pagination
      const total = merchantsList.length;
      const start = pagination.page * pagination.pageSize;
      const end = start + pagination.pageSize;
      const paginatedMerchants = merchantsList.slice(start, end);
      
      // Return merchants array for simple case, or full response
      if (!filterOrParams || typeof filterOrParams !== 'object' || 
          !('filters' in filterOrParams || 'pagination' in filterOrParams)) {
        return merchantsList;
      } else {
        return {
          merchants: paginatedMerchants,
          total,
          page: pagination.page,
          pageSize: pagination.pageSize
        };
      }
    });
    
    // Setup getMerchantsByOrganization implementation
    this.getMerchantsByOrganizationMock.mockImplementation((organizationId: string, options?: any) => {
      // Get all merchants that belong to this organization
      const merchants = Array.from(this.merchants.values())
        .filter(merchant => merchant.organization_id === organizationId);
      
      // Return merchants list or response based on options
      return !options
        ? merchants
        : {
            merchants,
            total: merchants.length,
            page: 0,
            pageSize: merchants.length
          };
    });
    
    // Setup getMerchantsByProgram implementation
    this.getMerchantsByProgramMock.mockImplementation((programId: string, options?: any) => {
      // Get all merchants that belong to this program
      const merchants = Array.from(this.merchants.values())
        .filter(merchant => merchant.program_id === programId);
      
      // Return merchants list or response based on options
      return !options
        ? merchants
        : {
            merchants,
            total: merchants.length,
            page: 0,
            pageSize: merchants.length
          };
    });
    
    // Setup getMerchantsByBank implementation
    this.getMerchantsByBankMock.mockImplementation((bankId: string, options?: any) => {
      // Get all merchants that belong to this bank
      const merchants = Array.from(this.merchants.values())
        .filter(merchant => merchant.bank_id === bankId);
      
      // Return merchants list or response based on options
      return !options
        ? merchants
        : {
            merchants,
            total: merchants.length,
            page: 0,
            pageSize: merchants.length
          };
    });
    
    // Setup validateMerchant implementation
    this.validateMerchantMock.mockImplementation((merchantIdOrParams: string | ValidateMerchantParams) => {
      const params: ValidateMerchantParams = typeof merchantIdOrParams === 'string'
        ? { merchantId: merchantIdOrParams, requireActive: true }
        : merchantIdOrParams;
      
      const merchant = this.merchants.get(params.merchantId);
      
      // Check if merchant exists
      if (!merchant) {
        return typeof merchantIdOrParams === 'string'
          ? false
          : { valid: false, reason: 'Merchant not found' };
      }
      
      // Check if merchant is active if required
      const isValid = !params.requireActive || merchant.status === MerchantStatus.ACTIVE;
      
      // Return boolean or full result
      return typeof merchantIdOrParams === 'string'
        ? isValid
        : {
            valid: isValid,
            reason: isValid ? undefined : 'Merchant is not active',
            merchant: isValid ? merchant : undefined
          };
    });
    
    // Setup getRefundConfiguration implementation
    this.getRefundConfigurationMock.mockImplementation((merchantIdOrParams: string | GetRefundConfigurationParams) => {
      const params: GetRefundConfigurationParams = typeof merchantIdOrParams === 'string'
        ? { merchantId: merchantIdOrParams }
        : merchantIdOrParams;
      
      const merchant = this.merchants.get(params.merchantId);
      
      if (!merchant) {
        throw new Error(`Merchant not found: ${params.merchantId}`);
      }
      
      // Return the configuration
      const configuration = merchant.refundConfiguration;
      
      // If includeInheritanceChain is true, get the full chain
      if (params.includeInheritanceChain) {
        const organization = this.organizations.get(merchant.organization_id);
        const program = this.programs.get(merchant.program_id);
        const bank = this.banks.get(merchant.bank_id);
        
        const inheritanceChain: ConfigurationInheritanceChain = {
          merchant: merchant.refundConfiguration,
          organization: organization?.refundConfiguration,
          program: program?.refundConfiguration,
          bank: bank?.refundConfiguration
        };
        
        return {
          configuration,
          inheritanceChain
        };
      }
      
      // Return simple configuration or full response
      return typeof merchantIdOrParams === 'string'
        ? configuration
        : { configuration };
    });
    
    // Setup getOrganization implementation
    this.getOrganizationMock.mockImplementation((organizationIdOrParams: string | GetOrganizationParams) => {
      const params: GetOrganizationParams = typeof organizationIdOrParams === 'string'
        ? { organizationId: organizationIdOrParams }
        : organizationIdOrParams;
      
      const organization = this.organizations.get(params.organizationId);
      
      if (!organization) {
        throw new Error(`Organization not found: ${params.organizationId}`);
      }
      
      // Return organization or response
      return typeof organizationIdOrParams === 'string'
        ? organization
        : { organization };
    });
    
    // Setup getProgram implementation
    this.getProgramMock.mockImplementation((programIdOrParams: string | GetProgramParams) => {
      const params: GetProgramParams = typeof programIdOrParams === 'string'
        ? { programId: programIdOrParams }
        : programIdOrParams;
      
      const program = this.programs.get(params.programId);
      
      if (!program) {
        throw new Error(`Program not found: ${params.programId}`);
      }
      
      // Return program or response
      return typeof programIdOrParams === 'string'
        ? program
        : { program };
    });
    
    // Setup getBank implementation
    this.getBankMock.mockImplementation((bankIdOrParams: string | GetBankParams) => {
      const params: GetBankParams = typeof bankIdOrParams === 'string'
        ? { bankId: bankIdOrParams }
        : bankIdOrParams;
      
      const bank = this.banks.get(params.bankId);
      
      if (!bank) {
        throw new Error(`Bank not found: ${params.bankId}`);
      }
      
      // Return bank or response
      return typeof bankIdOrParams === 'string'
        ? bank
        : { bank };
    });
  }
  
  /**
   * Helper method to create a mock merchant for testing
   */
  private _createMockMerchant(
    merchantId: string,
    name: string,
    organizationId: string,
    programId: string,
    bankId: string,
    status: MerchantStatus
  ): Merchant {
    return {
      id: merchantId,
      name,
      organization_id: organizationId,
      program_id: programId,
      bank_id: bankId,
      status,
      refundConfiguration: {
        maxRefundAmount: 1000,
        refundTimeLimit: 90,
        approvalThreshold: 500,
        allowedMethods: ['ORIGINAL_PAYMENT', 'BALANCE', 'OTHER'],
        requireDocumentation: false,
        documentationThreshold: 1000
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  /**
   * Helper method to create a mock organization for testing
   */
  private _createMockOrganization(
    organizationId: string,
    name: string,
    programId: string,
    bankId: string
  ): Organization {
    return {
      id: organizationId,
      name,
      program_id: programId,
      bank_id: bankId,
      status: 'ACTIVE',
      refundConfiguration: {
        maxRefundAmount: 5000,
        refundTimeLimit: 90,
        approvalThreshold: 1000,
        allowedMethods: ['ORIGINAL_PAYMENT', 'BALANCE', 'OTHER'],
        requireDocumentation: true,
        documentationThreshold: 2000
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  /**
   * Helper method to create a mock program for testing
   */
  private _createMockProgram(
    programId: string,
    name: string,
    bankId: string
  ): Program {
    return {
      id: programId,
      name,
      bank_id: bankId,
      status: 'ACTIVE',
      refundConfiguration: {
        maxRefundAmount: 10000,
        refundTimeLimit: 120,
        approvalThreshold: 2000,
        allowedMethods: ['ORIGINAL_PAYMENT', 'BALANCE'],
        requireDocumentation: true,
        documentationThreshold: 5000
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  /**
   * Helper method to create a mock bank for testing
   */
  private _createMockBank(
    bankId: string,
    name: string
  ): Bank {
    return {
      id: bankId,
      name,
      status: 'ACTIVE',
      refundConfiguration: {
        maxRefundAmount: 25000,
        refundTimeLimit: 180,
        approvalThreshold: 5000,
        allowedMethods: ['ORIGINAL_PAYMENT'],
        requireDocumentation: true,
        documentationThreshold: 10000
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  /**
   * Adds a custom merchant to the mock dataset
   */
  public addMockMerchant(merchant: Merchant): void {
    this.merchants.set(merchant.id, merchant);
  }
  
  /**
   * Adds a custom organization to the mock dataset
   */
  public addMockOrganization(organization: Organization): void {
    this.organizations.set(organization.id, organization);
  }
  
  /**
   * Adds a custom program to the mock dataset
   */
  public addMockProgram(program: Program): void {
    this.programs.set(program.id, program);
  }
  
  /**
   * Adds a custom bank to the mock dataset
   */
  public addMockBank(bank: Bank): void {
    this.banks.set(bank.id, bank);
  }
  
  /**
   * Resets all mock functions to their default implementations
   */
  public resetMocks(): void {
    this.getMerchantMock.mockClear();
    this.getMerchantsMock.mockClear();
    this.getMerchantsByOrganizationMock.mockClear();
    this.getMerchantsByProgramMock.mockClear();
    this.getMerchantsByBankMock.mockClear();
    this.validateMerchantMock.mockClear();
    this.getRefundConfigurationMock.mockClear();
    this.getOrganizationMock.mockClear();
    this.getProgramMock.mockClear();
    this.getBankMock.mockClear();
    
    // Reset data
    this.merchants.clear();
    this.organizations.clear();
    this.programs.clear();
    this.banks.clear();
    
    // Re-initialize test data
    this._initializeTestData();
    
    // Re-setup mock implementations
    this._setupMockImplementations();
  }
}

/**
 * Factory function to create a configured instance of the mock Merchant Service client
 */
export function createMockMerchantServiceClient(): MockMerchantServiceClient {
  return new MockMerchantServiceClient();
}

// Create a single instance for exporting mock data
const mockClient = createMockMerchantServiceClient();

// Export mock data for convenience in tests
export const mockMerchants = {
  activeMerchant: mockClient.merchants.get('merchant_001'),
  inactiveMerchant: mockClient.merchants.get('merchant_002'),
  suspendedMerchant: mockClient.merchants.get('merchant_003'),
  merchantWithHighLimit: mockClient.merchants.get('merchant_004'),
  merchantWithLowLimit: mockClient.merchants.get('merchant_005')
};

export const mockOrganizations = {
  defaultOrganization: mockClient.organizations.get('org_001'),
  customOrganization: mockClient.organizations.get('org_002')
};

export const mockPrograms = {
  defaultProgram: mockClient.programs.get('program_001'),
  customProgram: mockClient.programs.get('program_002')
};

export const mockBanks = {
  defaultBank: mockClient.banks.get('bank_001'),
  customBank: mockClient.banks.get('bank_002')
};