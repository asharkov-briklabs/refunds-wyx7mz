import ParameterDefinition, { 
  ParameterDataType, 
  ValidationRuleType, 
  IValidationRule 
} from '../../services/parameter-resolution/models/parameter-definition.model';

import ParameterValue, { 
  ParameterEntityType 
} from '../../services/parameter-resolution/models/parameter-value.model';

/**
 * Consistent entity IDs for use across parameter tests
 */
export const mockEntityIds = {
  bank: 'bank_01G6XT8JNWCDTKFYP52SRT5KQT',
  program: 'program_01F7M4JNWCDTKFYP52SRT5KQT',
  organization: 'org_01H7FKSJEW29PDXKQH6BNHD0EM',
  merchant: 'merchant_01H7FKSJEW29PDXKQH6BNHD0EM'
};

/**
 * Factory function to create parameter definitions with customized properties
 */
export function createParameterDefinition(overrides = {}): ParameterDefinition {
  const defaults = {
    name: 'testParameter',
    description: 'Test parameter for unit tests',
    dataType: ParameterDataType.STRING,
    defaultValue: 'default value',
    validationRules: [],
    overridable: true,
    category: 'test',
    sensitivity: 'low',
    auditRequired: false
  };

  return new ParameterDefinition({
    ...defaults,
    ...overrides
  });
}

/**
 * Factory function to create parameter values with customized properties
 */
export function createParameter(overrides = {}): ParameterValue {
  const now = new Date();
  const defaults = {
    id: 'param_01H7FKSJEW29PDXKQH6BNHD0EM',
    entityType: ParameterEntityType.MERCHANT,
    entityId: mockEntityIds.merchant,
    parameterName: 'testParameter',
    value: 'test value',
    effectiveDate: now,
    expirationDate: null,
    overridden: false,
    version: 1,
    createdBy: 'test-user',
    createdAt: now,
    updatedAt: now
  };

  return new ParameterValue({
    ...defaults,
    ...overrides
  });
}

/**
 * Mock parameter definitions for testing validation and defaults
 */
export const mockParameterDefinitions = {
  maxRefundAmount: createParameterDefinition({
    name: 'maxRefundAmount',
    description: 'Maximum amount that can be refunded in a single transaction',
    dataType: ParameterDataType.DECIMAL,
    defaultValue: 10000.00,
    validationRules: [
      {
        type: ValidationRuleType.RANGE,
        min: 0.01,
        max: 100000.00
      }
    ],
    category: 'limits',
    sensitivity: 'internal',
    auditRequired: true
  }),
  
  refundTimeLimit: createParameterDefinition({
    name: 'refundTimeLimit',
    description: 'Maximum time in days after transaction that a refund can be processed',
    dataType: ParameterDataType.NUMBER,
    defaultValue: 90,
    validationRules: [
      {
        type: ValidationRuleType.RANGE,
        min: 1,
        max: 365
      }
    ],
    category: 'limits',
    sensitivity: 'internal',
    auditRequired: true
  }),
  
  approvalThreshold: createParameterDefinition({
    name: 'approvalThreshold',
    description: 'Amount threshold above which refunds require approval',
    dataType: ParameterDataType.DECIMAL,
    defaultValue: 1000.00,
    validationRules: [
      {
        type: ValidationRuleType.RANGE,
        min: 0.00,
        max: 50000.00
      }
    ],
    category: 'approvals',
    sensitivity: 'internal',
    auditRequired: true
  }),
  
  allowedRefundMethods: createParameterDefinition({
    name: 'allowedRefundMethods',
    description: 'Methods allowed for processing refunds',
    dataType: ParameterDataType.ARRAY,
    defaultValue: ['ORIGINAL_PAYMENT', 'BALANCE', 'OTHER'],
    validationRules: [
      {
        type: ValidationRuleType.ENUM,
        values: ['ORIGINAL_PAYMENT', 'BALANCE', 'OTHER']
      }
    ],
    category: 'methods',
    sensitivity: 'internal',
    auditRequired: true
  }),
  
  requireDocumentation: createParameterDefinition({
    name: 'requireDocumentation',
    description: 'Whether documentation is required for refunds',
    dataType: ParameterDataType.BOOLEAN,
    defaultValue: false,
    category: 'compliance',
    sensitivity: 'internal',
    auditRequired: true
  })
};

// Create dates for consistency
const now = new Date();
const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);

/**
 * Parameter values at different hierarchy levels for testing resolution
 */
export const mockParameters = {
  // Bank level parameters
  bankLevel: [
    createParameter({
      id: 'param_bank_max_refund',
      entityType: ParameterEntityType.BANK,
      entityId: mockEntityIds.bank,
      parameterName: 'maxRefundAmount',
      value: 50000.00,
      effectiveDate: yesterday
    }),
    createParameter({
      id: 'param_bank_time_limit',
      entityType: ParameterEntityType.BANK,
      entityId: mockEntityIds.bank,
      parameterName: 'refundTimeLimit',
      value: 180,
      effectiveDate: yesterday
    }),
    createParameter({
      id: 'param_bank_doc_req',
      entityType: ParameterEntityType.BANK,
      entityId: mockEntityIds.bank,
      parameterName: 'requireDocumentation',
      value: true,
      effectiveDate: yesterday
    })
  ],
  
  // Program level parameters
  programLevel: [
    createParameter({
      id: 'param_program_max_refund',
      entityType: ParameterEntityType.PROGRAM,
      entityId: mockEntityIds.program,
      parameterName: 'maxRefundAmount',
      value: 25000.00,
      effectiveDate: yesterday
    }),
    createParameter({
      id: 'param_program_approval',
      entityType: ParameterEntityType.PROGRAM,
      entityId: mockEntityIds.program,
      parameterName: 'approvalThreshold',
      value: 5000.00,
      effectiveDate: yesterday
    }),
    createParameter({
      id: 'param_program_methods',
      entityType: ParameterEntityType.PROGRAM,
      entityId: mockEntityIds.program,
      parameterName: 'allowedRefundMethods',
      value: ['ORIGINAL_PAYMENT', 'BALANCE'],
      effectiveDate: yesterday
    })
  ],
  
  // Organization level parameters
  organizationLevel: [
    createParameter({
      id: 'param_org_time_limit',
      entityType: ParameterEntityType.ORGANIZATION,
      entityId: mockEntityIds.organization,
      parameterName: 'refundTimeLimit',
      value: 90,
      effectiveDate: yesterday
    }),
    createParameter({
      id: 'param_org_approval',
      entityType: ParameterEntityType.ORGANIZATION,
      entityId: mockEntityIds.organization,
      parameterName: 'approvalThreshold',
      value: 2000.00,
      effectiveDate: yesterday
    })
  ],
  
  // Merchant level parameters
  merchantLevel: [
    createParameter({
      id: 'param_merchant_max_refund',
      entityType: ParameterEntityType.MERCHANT,
      entityId: mockEntityIds.merchant,
      parameterName: 'maxRefundAmount',
      value: 5000.00,
      effectiveDate: yesterday
    }),
    createParameter({
      id: 'param_merchant_approval',
      entityType: ParameterEntityType.MERCHANT,
      entityId: mockEntityIds.merchant,
      parameterName: 'approvalThreshold',
      value: 1000.00,
      effectiveDate: yesterday
    })
  ],
  
  // Complete inheritance chain for testing resolution
  inheritanceChain: [
    // Bank level
    createParameter({
      id: 'chain_bank_param',
      entityType: ParameterEntityType.BANK,
      entityId: mockEntityIds.bank,
      parameterName: 'testInheritanceParam',
      value: 'bank-level-value',
      effectiveDate: yesterday
    }),
    // Program level
    createParameter({
      id: 'chain_program_param',
      entityType: ParameterEntityType.PROGRAM,
      entityId: mockEntityIds.program,
      parameterName: 'testInheritanceParam',
      value: 'program-level-value',
      effectiveDate: yesterday
    }),
    // Organization level
    createParameter({
      id: 'chain_org_param',
      entityType: ParameterEntityType.ORGANIZATION,
      entityId: mockEntityIds.organization,
      parameterName: 'testInheritanceParam',
      value: 'organization-level-value',
      effectiveDate: yesterday
    }),
    // Merchant level
    createParameter({
      id: 'chain_merchant_param',
      entityType: ParameterEntityType.MERCHANT,
      entityId: mockEntityIds.merchant,
      parameterName: 'testInheritanceParam',
      value: 'merchant-level-value',
      effectiveDate: yesterday
    })
  ],
  
  // Parameters with overlapping effective dates for testing
  overlappingParameters: [
    createParameter({
      id: 'overlap_param_1',
      entityType: ParameterEntityType.MERCHANT,
      entityId: mockEntityIds.merchant,
      parameterName: 'overlappingParam',
      value: 'old-value',
      effectiveDate: yesterday,
      expirationDate: tomorrow,
      version: 1
    }),
    createParameter({
      id: 'overlap_param_2',
      entityType: ParameterEntityType.MERCHANT,
      entityId: mockEntityIds.merchant,
      parameterName: 'overlappingParam',
      value: 'new-value',
      effectiveDate: now,
      expirationDate: null,
      version: 2
    })
  ]
};