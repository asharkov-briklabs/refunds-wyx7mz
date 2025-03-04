import {
  ComplianceEngineService,
  ComplianceResult,
} from '../../../services/compliance-engine/compliance-engine.service'; // Import the service being tested
import {
  ComplianceViolation,
  ComplianceContext,
} from '../../../services/compliance-engine/rule-providers/card-network.provider'; // Import type definitions for compliance violations and context
import { validateTimeframeRule } from '../../../services/compliance-engine/validators/timeframe.validator'; // Import validator function for timeframe rules
import { validateAmountRule } from '../../../services/compliance-engine/validators/amount.validator'; // Import validator function for amount rules
import { validateMethodRule } from '../../../services/compliance-engine/validators/method.validator'; // Import validator function for method rules
import { RefundMethod } from '../../../common/enums/refund-method.enum'; // Import enum for refund methods used in test data
import complianceRuleRepository from '../../../database/repositories/compliance-rule.repo'; // Import repository for accessing compliance rules from the database
import parameterResolutionService from '../../../services/parameter-resolution/parameter-resolution.service'; // Import service for resolving compliance-related parameters from configuration
import { mockRefundRequests } from '../../fixtures/refunds.fixture'; // Import test fixtures with pre-configured refund request data
import { createMockMerchantServiceClient } from '../../mocks/services/merchant-service.mock'; // Import factory function to create a mocked merchant service client for testing
import jest from 'jest'; // Import testing framework functions for creating test suites and assertions

// Mock the complianceRuleRepository to isolate the service
jest.mock('../../../database/repositories/compliance-rule.repo');
jest.mock('../../../services/parameter-resolution/parameter-resolution.service');

describe('ComplianceEngineService', () => {
  let complianceEngineService: ComplianceEngineService;

  beforeEach(() => {
    complianceEngineService = new ComplianceEngineService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateCompliance', () => {
    it('should return a compliant result if no rules are violated', async () => {
      // Arrange
      (complianceRuleRepository.findCardNetworkRules as jest.Mock).mockResolvedValue([]);
      const refundRequest = mockRefundRequests.originalPaymentMethod;
      const context: ComplianceContext = {
        merchantId: 'merchant123',
        transactionDetails: { amount: 100, currency: 'USD' },
        paymentMethodType: 'CREDIT_CARD',
        cardNetwork: 'Visa',
        merchantConfiguration: {},
      } as ComplianceContext;

      // Act
      const result = await complianceEngineService.validateCompliance(refundRequest, context);

      // Assert
      expect(result.compliant).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('should return a non-compliant result if any rules are violated', async () => {
      // Arrange
      const mockViolation: ComplianceViolation = {
        violationCode: 'TIME_LIMIT_EXCEEDED',
        violationMessage: 'Refund is outside the allowed timeframe',
        severity: 'ERROR',
        remediation: 'Contact customer support',
        details: {},
      };
      (complianceRuleRepository.findCardNetworkRules as jest.Mock).mockResolvedValue([
        {
          rule_id: 'rule123',
          rule_type: 'TIMEFRAME',
          evaluation: {},
          violation_code: 'TIME_LIMIT_EXCEEDED',
          violation_message: 'Refund is outside the allowed timeframe',
          severity: 'ERROR',
          remediation: 'Contact customer support',
        },
      ]);
      (complianceEngineService.evaluateRuleSet as jest.Mock).mockResolvedValue([mockViolation]);
      const refundRequest = mockRefundRequests.originalPaymentMethod;
      const context: ComplianceContext = {
        merchantId: 'merchant123',
        transactionDetails: { amount: 100, currency: 'USD' },
        paymentMethodType: 'CREDIT_CARD',
        cardNetwork: 'Visa',
        merchantConfiguration: {},
      } as ComplianceContext;

      // Act
      const result = await complianceEngineService.validateCompliance(refundRequest, context);

      // Assert
      expect(result.compliant).toBe(false);
      expect(result.violations).toEqual([mockViolation]);
    });
  });

  describe('getViolations', () => {
    it('should return an empty array if no rules are violated', async () => {
      // Arrange
      (complianceRuleRepository.findCardNetworkRules as jest.Mock).mockResolvedValue([]);
      const refundRequest = mockRefundRequests.originalPaymentMethod;
      const context: ComplianceContext = {
        merchantId: 'merchant123',
        transactionDetails: { amount: 100, currency: 'USD' },
        paymentMethodType: 'CREDIT_CARD',
        cardNetwork: 'Visa',
        merchantConfiguration: {},
      } as ComplianceContext;

      // Act
      const result = await complianceEngineService.getViolations(refundRequest, context);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return an array of violations if any rules are violated', async () => {
      // Arrange
      const mockViolation: ComplianceViolation = {
        violationCode: 'TIME_LIMIT_EXCEEDED',
        violationMessage: 'Refund is outside the allowed timeframe',
        severity: 'ERROR',
        remediation: 'Contact customer support',
        details: {},
      };
      (complianceRuleRepository.findCardNetworkRules as jest.Mock).mockResolvedValue([
        {
          rule_id: 'rule123',
          rule_type: 'TIMEFRAME',
          evaluation: {},
          violation_code: 'TIME_LIMIT_EXCEEDED',
          violation_message: 'Refund is outside the allowed timeframe',
          severity: 'ERROR',
          remediation: 'Contact customer support',
        },
      ]);
      (complianceEngineService.evaluateRuleSet as jest.Mock).mockResolvedValue([mockViolation]);
      const refundRequest = mockRefundRequests.originalPaymentMethod;
      const context: ComplianceContext = {
        merchantId: 'merchant123',
        transactionDetails: { amount: 100, currency: 'USD' },
        paymentMethodType: 'CREDIT_CARD',
        cardNetwork: 'Visa',
        merchantConfiguration: {},
      } as ComplianceContext;

      // Act
      const result = await complianceEngineService.getViolations(refundRequest, context);

      // Assert
      expect(result).toEqual([mockViolation]);
    });
  });

  describe('explainViolation', () => {
    it('should return a formatted explanation of a compliance violation', () => {
      // Arrange
      const mockViolation: ComplianceViolation = {
        violationCode: 'TIME_LIMIT_EXCEEDED',
        violationMessage: 'Refund is outside the allowed timeframe',
        severity: 'ERROR',
        remediation: 'Contact customer support',
        details: {
          limit: 90,
          actual: 120,
        },
      };

      // Act
      const explanation = complianceEngineService.explainViolation(mockViolation);

      // Assert
      expect(explanation).toEqual('Compliance Violation: Refund is outside the allowed timeframe Remediation: Contact customer support');
    });
  });

  describe('registerRuleProvider', () => {
    it('should register a new rule provider', () => {
      // Arrange
      const mockProvider = {
        getRules: jest.fn(),
        getViolations: jest.fn(),
      };

      // Act
      complianceEngineService.registerRuleProvider('CUSTOM', mockProvider);

      // Assert
      expect(complianceEngineService['ruleProviderRegistry'].get('CUSTOM')).toBe(mockProvider);
    });

    it('should throw an error if the provider does not implement required methods', () => {
      // Arrange
      const mockProvider = {
        // Missing getViolations method
        getRules: jest.fn(),
      };

      // Act & Assert
      expect(() => complianceEngineService.registerRuleProvider('INVALID', mockProvider)).toThrowError(
        'Rule provider INVALID does not implement required methods'
      );
    });
  });
});

/**
 * Creates mock card network compliance rules for testing
 * @param {string} cardNetwork - Card network
 * @returns {Array<any>} Array of mock compliance rules
 */
function createMockCardNetworkRules(cardNetwork: string): any[] {
  // Define timeframe rule for refund time limit
  const timeframeRule = {
    rule_id: 'timeframe_rule',
    rule_type: 'TIMEFRAME',
    evaluation: {
      field: 'transaction.processedDate',
      operator: 'withinDays',
      value: 90,
    },
  };

  // Define amount rule for maximum refund amount
  const amountRule = {
    rule_id: 'amount_rule',
    rule_type: 'AMOUNT',
    evaluation: {
      operator: 'lessThanOrEqual',
      value: 1000,
    },
  };

  // Define method rule for allowed refund methods
  const methodRule = {
    rule_id: 'method_rule',
    rule_type: 'METHOD',
    evaluation: {
      operator: 'inAllowedMethods',
      allowedMethods: [RefundMethod.ORIGINAL_PAYMENT, RefundMethod.BALANCE],
    },
  };

  // Return array of all defined rules
  return [timeframeRule, amountRule, methodRule];
}

/**
 * Creates mock merchant-specific compliance rules for testing
 * @param {string} merchantId - Merchant ID
 * @returns {Array<any>} Array of mock merchant rules
 */
function createMockMerchantRules(merchantId: string): any[] {
  // Define merchant-specific refund rules
  const merchantRules = [
    {
      rule_id: 'merchant_limit',
      rule_type: 'AMOUNT',
      evaluation: {
        operator: 'lessThanOrEqual',
        value: 500,
      },
    },
    {
      rule_id: 'merchant_documentation',
      rule_type: 'DOCUMENTATION',
      evaluation: {
        required: true,
      },
    },
  ];

  // Include rules for limits, documentation requirements, etc.
  return merchantRules;
}

/**
 * Creates mock regulatory compliance rules for testing
 * @returns {Array<any>} Array of mock regulatory rules
 */
function createMockRegulatoryRules(): any[] {
  // Define regulatory compliance rules
  const regulatoryRules = [
    {
      rule_id: 'regulatory_reporting',
      rule_type: 'AMOUNT',
      evaluation: {
        operator: 'greaterThanOrEqual',
        value: 10000,
      },
    },
    {
      rule_id: 'regulatory_data_protection',
      rule_type: 'DATA_PROTECTION',
      evaluation: {
        consentRequired: true,
      },
    },
  ];

  // Include rules for data protection, reporting requirements, etc.
  return regulatoryRules;
}

/**
 * Creates a mock compliance context for testing
 * @param {Partial<ComplianceContext>} overrides - overrides
 * @returns {ComplianceContext} A mock compliance context with defaults and overrides
 */
function createMockContext(overrides: Partial<ComplianceContext> = {}): ComplianceContext {
  // Define default values for the compliance context
  const defaultContext: ComplianceContext = {
    merchantId: 'merchant123',
    transactionDetails: { amount: 100, currency: 'USD' },
    paymentMethodType: 'CREDIT_CARD',
    cardNetwork: 'Visa',
    merchantConfiguration: {},
  } as ComplianceContext;

  // Merge with provided overrides
  const context = { ...defaultContext, ...overrides };

  // Return the complete context object
  return context;
}