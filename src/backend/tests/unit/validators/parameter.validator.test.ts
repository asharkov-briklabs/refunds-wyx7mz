import {
  validateParameterCreate,
  validateParameterUpdate,
  validateParameterGet,
  validateParameterDelete,
  validateParameterValue
} from '../../../services/refund-api/validators/parameter.validator';
import { ValidationError } from '../../../common/errors/validation-error';
import { ErrorCode } from '../../../common/constants/error-codes';
import { mockEntityIds, mockParameterDefinitions } from '../../fixtures/parameters.fixture';

/**
 * Creates a mock request object for testing validators
 */
function createMockRequest(body = {}, params = {}, query = {}) {
  return {
    body,
    params,
    query
  };
}

describe('validateParameterCreate', () => {
  it('should pass validation for valid parameter creation', async () => {
    const validParam = {
      entity_type: 'MERCHANT',
      entity_id: mockEntityIds.merchant,
      parameter_name: 'maxRefundAmount',
      parameter_value: 5000,
      data_type: 'number'
    };
    
    const mockRequest = createMockRequest(validParam);
    
    await expect(validateParameterCreate(mockRequest)).resolves.not.toThrow();
  });
  
  it('should reject when entity_type is missing', async () => {
    const invalidParam = {
      entity_id: mockEntityIds.merchant,
      parameter_name: 'maxRefundAmount',
      parameter_value: 5000,
      data_type: 'number'
    };
    
    const mockRequest = createMockRequest(invalidParam);
    
    await expect(validateParameterCreate(mockRequest)).rejects.toThrow(ValidationError);
    await expect(validateParameterCreate(mockRequest)).rejects.toHaveProperty('code', ErrorCode.REQUIRED_FIELD_MISSING);
  });
  
  it('should reject when entity_type is invalid', async () => {
    const invalidParam = {
      entity_type: 'INVALID_TYPE',
      entity_id: mockEntityIds.merchant,
      parameter_name: 'maxRefundAmount',
      parameter_value: 5000,
      data_type: 'number'
    };
    
    const mockRequest = createMockRequest(invalidParam);
    
    await expect(validateParameterCreate(mockRequest)).rejects.toThrow(ValidationError);
    await expect(validateParameterCreate(mockRequest)).rejects.toHaveProperty('code', ErrorCode.VALIDATION_ERROR);
  });
  
  it('should reject when entity_id is missing', async () => {
    const invalidParam = {
      entity_type: 'MERCHANT',
      parameter_name: 'maxRefundAmount',
      parameter_value: 5000,
      data_type: 'number'
    };
    
    const mockRequest = createMockRequest(invalidParam);
    
    await expect(validateParameterCreate(mockRequest)).rejects.toThrow(ValidationError);
    await expect(validateParameterCreate(mockRequest)).rejects.toHaveProperty('code', ErrorCode.REQUIRED_FIELD_MISSING);
  });
  
  it('should reject when parameter_name is missing', async () => {
    const invalidParam = {
      entity_type: 'MERCHANT',
      entity_id: mockEntityIds.merchant,
      parameter_value: 5000,
      data_type: 'number'
    };
    
    const mockRequest = createMockRequest(invalidParam);
    
    await expect(validateParameterCreate(mockRequest)).rejects.toThrow(ValidationError);
    await expect(validateParameterCreate(mockRequest)).rejects.toHaveProperty('code', ErrorCode.REQUIRED_FIELD_MISSING);
  });
  
  it('should reject when parameter_value is missing', async () => {
    const invalidParam = {
      entity_type: 'MERCHANT',
      entity_id: mockEntityIds.merchant,
      parameter_name: 'maxRefundAmount',
      data_type: 'number'
    };
    
    const mockRequest = createMockRequest(invalidParam);
    
    await expect(validateParameterCreate(mockRequest)).rejects.toThrow(ValidationError);
    await expect(validateParameterCreate(mockRequest)).rejects.toHaveProperty('code', ErrorCode.REQUIRED_FIELD_MISSING);
  });
  
  it('should reject when data_type is missing', async () => {
    const invalidParam = {
      entity_type: 'MERCHANT',
      entity_id: mockEntityIds.merchant,
      parameter_name: 'maxRefundAmount',
      parameter_value: 5000
    };
    
    const mockRequest = createMockRequest(invalidParam);
    
    await expect(validateParameterCreate(mockRequest)).rejects.toThrow(ValidationError);
    await expect(validateParameterCreate(mockRequest)).rejects.toHaveProperty('code', ErrorCode.REQUIRED_FIELD_MISSING);
  });
  
  it("should reject when data_type doesn't match parameter_value", async () => {
    const invalidParam = {
      entity_type: 'MERCHANT',
      entity_id: mockEntityIds.merchant,
      parameter_name: 'maxRefundAmount',
      parameter_value: 'not a number',
      data_type: 'number'
    };
    
    const mockRequest = createMockRequest(invalidParam);
    
    await expect(validateParameterCreate(mockRequest)).rejects.toThrow(ValidationError);
    await expect(validateParameterCreate(mockRequest)).rejects.toHaveProperty('code', ErrorCode.VALIDATION_ERROR);
  });
});

describe('validateParameterUpdate', () => {
  it('should pass validation for valid parameter update', async () => {
    const validUpdate = {
      parameter_value: 10000
    };
    
    const mockRequest = createMockRequest(validUpdate);
    
    await expect(validateParameterUpdate(mockRequest)).resolves.not.toThrow();
  });
  
  it('should reject when parameter_value is missing', async () => {
    const invalidUpdate = {
      description: 'New description without value'
    };
    
    const mockRequest = createMockRequest(invalidUpdate);
    
    await expect(validateParameterUpdate(mockRequest)).rejects.toThrow(ValidationError);
    await expect(validateParameterUpdate(mockRequest)).rejects.toHaveProperty('code', ErrorCode.REQUIRED_FIELD_MISSING);
  });
  
  it('should accept valid optional fields', async () => {
    const validUpdate = {
      parameter_value: 10000,
      effective_date: '2023-05-01T00:00:00Z',
      expiration_date: '2023-12-31T23:59:59Z',
      description: 'Updated description',
      is_overridable: false
    };
    
    const mockRequest = createMockRequest(validUpdate);
    
    await expect(validateParameterUpdate(mockRequest)).resolves.not.toThrow();
  });
  
  it('should reject when effective_date is invalid', async () => {
    const invalidUpdate = {
      parameter_value: 10000,
      effective_date: 'not-a-date'
    };
    
    const mockRequest = createMockRequest(invalidUpdate);
    
    await expect(validateParameterUpdate(mockRequest)).rejects.toThrow(ValidationError);
    await expect(validateParameterUpdate(mockRequest)).rejects.toHaveProperty('code', ErrorCode.VALIDATION_ERROR);
  });
});

describe('validateParameterGet', () => {
  it('should pass validation for valid get request', async () => {
    const validQuery = {
      entity_type: 'MERCHANT',
      entity_id: mockEntityIds.merchant
    };
    
    const mockRequest = createMockRequest({}, {}, validQuery);
    
    await expect(validateParameterGet(mockRequest)).resolves.not.toThrow();
  });
  
  it('should reject when entity_type is missing', async () => {
    const invalidQuery = {
      entity_id: mockEntityIds.merchant
    };
    
    const mockRequest = createMockRequest({}, {}, invalidQuery);
    
    await expect(validateParameterGet(mockRequest)).rejects.toThrow(ValidationError);
    await expect(validateParameterGet(mockRequest)).rejects.toHaveProperty('code', ErrorCode.REQUIRED_FIELD_MISSING);
  });
  
  it('should reject when entity_id is missing', async () => {
    const invalidQuery = {
      entity_type: 'MERCHANT'
    };
    
    const mockRequest = createMockRequest({}, {}, invalidQuery);
    
    await expect(validateParameterGet(mockRequest)).rejects.toThrow(ValidationError);
    await expect(validateParameterGet(mockRequest)).rejects.toHaveProperty('code', ErrorCode.REQUIRED_FIELD_MISSING);
  });
  
  it('should accept request with optional parameter_name', async () => {
    const validQuery = {
      entity_type: 'MERCHANT',
      entity_id: mockEntityIds.merchant,
      parameter_name: 'maxRefundAmount'
    };
    
    const mockRequest = createMockRequest({}, {}, validQuery);
    
    await expect(validateParameterGet(mockRequest)).resolves.not.toThrow();
  });
});

describe('validateParameterDelete', () => {
  it('should pass validation for valid delete request', async () => {
    const validParams = {
      entity_type: 'MERCHANT',
      entity_id: mockEntityIds.merchant,
      parameter_name: 'maxRefundAmount'
    };
    
    const mockRequest = createMockRequest({}, validParams);
    
    await expect(validateParameterDelete(mockRequest)).resolves.not.toThrow();
  });
  
  it('should reject when entity_type is missing', async () => {
    const invalidParams = {
      entity_id: mockEntityIds.merchant,
      parameter_name: 'maxRefundAmount'
    };
    
    const mockRequest = createMockRequest({}, invalidParams);
    
    await expect(validateParameterDelete(mockRequest)).rejects.toThrow(ValidationError);
    await expect(validateParameterDelete(mockRequest)).rejects.toHaveProperty('code', ErrorCode.REQUIRED_FIELD_MISSING);
  });
  
  it('should reject when entity_id is missing', async () => {
    const invalidParams = {
      entity_type: 'MERCHANT',
      parameter_name: 'maxRefundAmount'
    };
    
    const mockRequest = createMockRequest({}, invalidParams);
    
    await expect(validateParameterDelete(mockRequest)).rejects.toThrow(ValidationError);
    await expect(validateParameterDelete(mockRequest)).rejects.toHaveProperty('code', ErrorCode.REQUIRED_FIELD_MISSING);
  });
  
  it('should reject when parameter_name is missing', async () => {
    const invalidParams = {
      entity_type: 'MERCHANT',
      entity_id: mockEntityIds.merchant
    };
    
    const mockRequest = createMockRequest({}, invalidParams);
    
    await expect(validateParameterDelete(mockRequest)).rejects.toThrow(ValidationError);
    await expect(validateParameterDelete(mockRequest)).rejects.toHaveProperty('code', ErrorCode.REQUIRED_FIELD_MISSING);
  });
});

describe('validateParameterValue', () => {
  it('should validate string values correctly', () => {
    // Valid string
    expect(validateParameterValue('string', 'test value')).toBe(true);
    
    // Invalid type
    expect(validateParameterValue('string', 123)).toBe(false);
    
    // With pattern validation rule
    const patternRule = { type: 'PATTERN', pattern: '^[A-Z]{3}$' };
    expect(validateParameterValue('string', 'ABC', patternRule)).toBe(true);
    expect(validateParameterValue('string', 'abc', patternRule)).toBe(false);
  });
  
  it('should validate number values correctly', () => {
    // Valid number
    expect(validateParameterValue('number', 123)).toBe(true);
    
    // Invalid type
    expect(validateParameterValue('number', 'not a number')).toBe(false);
    
    // With range rules
    const rangeRule = { type: 'RANGE', min: 1, max: 100 };
    expect(validateParameterValue('number', 50, rangeRule)).toBe(true);
    expect(validateParameterValue('number', 101, rangeRule)).toBe(false);
    expect(validateParameterValue('number', 0, rangeRule)).toBe(false);
  });
  
  it('should validate boolean values correctly', () => {
    // Valid boolean values
    expect(validateParameterValue('boolean', true)).toBe(true);
    expect(validateParameterValue('boolean', false)).toBe(true);
    
    // Invalid type
    expect(validateParameterValue('boolean', 'true')).toBe(false);
  });
  
  it('should validate array values correctly', () => {
    // Valid array
    expect(validateParameterValue('array', [1, 2, 3])).toBe(true);
    
    // Invalid type
    expect(validateParameterValue('array', { key: 'value' })).toBe(false);
    
    // With item validation
    const arrayRule = { type: 'ARRAY', itemType: 'string' };
    expect(validateParameterValue('array', ['a', 'b', 'c'], arrayRule)).toBe(true);
    expect(validateParameterValue('array', [1, 'b', 'c'], arrayRule)).toBe(false);
  });
  
  it('should validate enum values correctly', () => {
    // With enum rule
    const enumRule = { type: 'ENUM', allowedValues: ['RED', 'GREEN', 'BLUE'] };
    expect(validateParameterValue('enum', 'RED', enumRule)).toBe(true);
    expect(validateParameterValue('enum', 'YELLOW', enumRule)).toBe(false);
  });
});