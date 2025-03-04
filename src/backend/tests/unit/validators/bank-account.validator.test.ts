import {
  validateBankAccount,
  validateBankAccountUpdate,
  validateVerificationRequest,
  validateMicroDepositAmounts,
  createBankAccountValidationError
} from '../../../services/refund-api/validators/bank-account.validator';
import { isValidRoutingNumber } from '../../../services/bank-account-manager/validators/routing-number.validator';
import { isValidAccountNumber } from '../../../services/bank-account-manager/validators/account-number.validator';
import {
  BankAccountCreationRequest,
  BankAccountUpdateRequest,
  BankAccountVerificationRequest,
  BankAccountType,
  BankAccountStatus,
  BankAccountVerificationMethod
} from '../../../common/interfaces/bank-account.interface';
import { ValidationError } from '../../../common/errors/validation-error';
import { ErrorCode } from '../../../common/constants/error-codes';

// Mock the external validators
jest.mock('../../../services/bank-account-manager/validators/routing-number.validator');
jest.mock('../../../services/bank-account-manager/validators/account-number.validator');

describe('validateBankAccount function', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.resetAllMocks();
    (isValidRoutingNumber as jest.Mock).mockReturnValue(true);
    (isValidAccountNumber as jest.Mock).mockReturnValue(true);
  });

  it('should return success for valid bank account data', () => {
    // Arrange
    const validAccount: BankAccountCreationRequest = {
      merchantId: 'merchant123',
      accountHolderName: 'John Doe',
      accountType: BankAccountType.CHECKING,
      routingNumber: '123456789',
      accountNumber: '1234567890',
      isDefault: true,
      initiateVerification: true,
      verificationMethod: BankAccountVerificationMethod.MICRO_DEPOSIT
    };

    // Act
    const result = validateBankAccount(validAccount);

    // Assert
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(isValidRoutingNumber).toHaveBeenCalledWith('123456789');
    expect(isValidAccountNumber).toHaveBeenCalledWith('1234567890');
  });

  it('should return errors for missing required fields', () => {
    // Arrange
    const invalidAccount: Partial<BankAccountCreationRequest> = {
      // Missing required fields
    };

    // Act
    const result = validateBankAccount(invalidAccount as BankAccountCreationRequest);

    // Assert
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.field === 'merchantId')).toBe(true);
    expect(result.errors.some(e => e.field === 'accountHolderName')).toBe(true);
    expect(result.errors.some(e => e.field === 'accountType')).toBe(true);
    expect(result.errors.some(e => e.field === 'routingNumber')).toBe(true);
    expect(result.errors.some(e => e.field === 'accountNumber')).toBe(true);
  });

  it('should return errors for invalid accountHolderName length', () => {
    // Arrange
    const accountTooShortName: BankAccountCreationRequest = {
      merchantId: 'merchant123',
      accountHolderName: 'J', // Too short (less than 2 chars)
      accountType: BankAccountType.CHECKING,
      routingNumber: '123456789',
      accountNumber: '1234567890',
      isDefault: true,
      initiateVerification: true,
      verificationMethod: BankAccountVerificationMethod.MICRO_DEPOSIT
    };

    const accountTooLongName: BankAccountCreationRequest = {
      merchantId: 'merchant123',
      accountHolderName: 'J'.repeat(101), // Too long (more than 100 chars)
      accountType: BankAccountType.CHECKING,
      routingNumber: '123456789',
      accountNumber: '1234567890',
      isDefault: true,
      initiateVerification: true,
      verificationMethod: BankAccountVerificationMethod.MICRO_DEPOSIT
    };

    // Act
    const resultShort = validateBankAccount(accountTooShortName);
    const resultLong = validateBankAccount(accountTooLongName);

    // Assert
    expect(resultShort.success).toBe(false);
    expect(resultShort.errors.some(e => e.field === 'accountHolderName')).toBe(true);
    
    expect(resultLong.success).toBe(false);
    expect(resultLong.errors.some(e => e.field === 'accountHolderName')).toBe(true);
  });

  it('should return errors for invalid accountType', () => {
    // Arrange
    const invalidAccount: BankAccountCreationRequest = {
      merchantId: 'merchant123',
      accountHolderName: 'John Doe',
      accountType: 'INVALID_TYPE' as BankAccountType, // Invalid type
      routingNumber: '123456789',
      accountNumber: '1234567890',
      isDefault: true,
      initiateVerification: true,
      verificationMethod: BankAccountVerificationMethod.MICRO_DEPOSIT
    };

    // Act
    const result = validateBankAccount(invalidAccount);

    // Assert
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.field === 'accountType')).toBe(true);
  });

  it('should return errors for invalid routingNumber', () => {
    // Arrange
    (isValidRoutingNumber as jest.Mock).mockReturnValue(false);
    
    const invalidAccount: BankAccountCreationRequest = {
      merchantId: 'merchant123',
      accountHolderName: 'John Doe',
      accountType: BankAccountType.CHECKING,
      routingNumber: 'invalid123', // Invalid routing number
      accountNumber: '1234567890',
      isDefault: true,
      initiateVerification: true,
      verificationMethod: BankAccountVerificationMethod.MICRO_DEPOSIT
    };

    // Act
    const result = validateBankAccount(invalidAccount);

    // Assert
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.field === 'routingNumber')).toBe(true);
    expect(isValidRoutingNumber).toHaveBeenCalledWith('invalid123');
  });

  it('should return errors for invalid accountNumber', () => {
    // Arrange
    (isValidAccountNumber as jest.Mock).mockReturnValue(false);
    
    const invalidAccount: BankAccountCreationRequest = {
      merchantId: 'merchant123',
      accountHolderName: 'John Doe',
      accountType: BankAccountType.CHECKING,
      routingNumber: '123456789',
      accountNumber: 'invalid', // Invalid account number
      isDefault: true,
      initiateVerification: true,
      verificationMethod: BankAccountVerificationMethod.MICRO_DEPOSIT
    };

    // Act
    const result = validateBankAccount(invalidAccount);

    // Assert
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.field === 'accountNumber')).toBe(true);
    expect(isValidAccountNumber).toHaveBeenCalledWith('invalid');
  });

  it('should return errors for invalid verificationMethod', () => {
    // Arrange
    const invalidAccount: BankAccountCreationRequest = {
      merchantId: 'merchant123',
      accountHolderName: 'John Doe',
      accountType: BankAccountType.CHECKING,
      routingNumber: '123456789',
      accountNumber: '1234567890',
      isDefault: true,
      initiateVerification: true,
      verificationMethod: 'INVALID_METHOD' as BankAccountVerificationMethod // Invalid method
    };

    // Act
    const result = validateBankAccount(invalidAccount);

    // Assert
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.field === 'verificationMethod')).toBe(true);
  });

  it('should combine all validation errors', () => {
    // Arrange
    (isValidRoutingNumber as jest.Mock).mockReturnValue(false);
    (isValidAccountNumber as jest.Mock).mockReturnValue(false);
    
    const invalidAccount: BankAccountCreationRequest = {
      merchantId: 'merchant123',
      accountHolderName: 'J', // Too short
      accountType: 'INVALID_TYPE' as BankAccountType, // Invalid type
      routingNumber: 'invalid123', // Invalid routing number
      accountNumber: 'invalid', // Invalid account number
      isDefault: true,
      initiateVerification: true,
      verificationMethod: 'INVALID_METHOD' as BankAccountVerificationMethod // Invalid method
    };

    // Act
    const result = validateBankAccount(invalidAccount);

    // Assert
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4); // At least 4 validation errors
    expect(result.errors.some(e => e.field === 'accountHolderName')).toBe(true);
    expect(result.errors.some(e => e.field === 'accountType')).toBe(true);
    expect(result.errors.some(e => e.field === 'routingNumber')).toBe(true);
    expect(result.errors.some(e => e.field === 'accountNumber')).toBe(true);
    expect(result.errors.some(e => e.field === 'verificationMethod')).toBe(true);
  });
});

describe('validateBankAccountUpdate function', () => {
  it('should return success for valid update data', () => {
    // Arrange
    const validUpdate: BankAccountUpdateRequest = {
      accountHolderName: 'Jane Doe',
      isDefault: true,
      status: BankAccountStatus.ACTIVE
    };

    // Act
    const result = validateBankAccountUpdate(validUpdate);

    // Assert
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should return success for empty update object', () => {
    // Arrange
    const emptyUpdate: BankAccountUpdateRequest = {};

    // Act
    const result = validateBankAccountUpdate(emptyUpdate);

    // Assert
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should return errors for invalid accountHolderName length', () => {
    // Arrange
    const tooShortUpdate: BankAccountUpdateRequest = {
      accountHolderName: 'J' // Too short
    };

    const tooLongUpdate: BankAccountUpdateRequest = {
      accountHolderName: 'J'.repeat(101) // Too long
    };

    // Act
    const resultShort = validateBankAccountUpdate(tooShortUpdate);
    const resultLong = validateBankAccountUpdate(tooLongUpdate);

    // Assert
    expect(resultShort.success).toBe(false);
    expect(resultShort.errors.some(e => e.field === 'accountHolderName')).toBe(true);
    
    expect(resultLong.success).toBe(false);
    expect(resultLong.errors.some(e => e.field === 'accountHolderName')).toBe(true);
  });

  it('should return errors for invalid status value', () => {
    // Arrange
    const invalidUpdate: BankAccountUpdateRequest = {
      status: 'INVALID_STATUS' as BankAccountStatus
    };

    // Act
    const result = validateBankAccountUpdate(invalidUpdate);

    // Assert
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.field === 'status')).toBe(true);
  });

  it('should return errors for invalid isDefault type', () => {
    // Arrange
    const invalidUpdate = {
      isDefault: 'true' // String instead of boolean
    } as unknown as BankAccountUpdateRequest;

    // Act
    const result = validateBankAccountUpdate(invalidUpdate);

    // Assert
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.field === 'isDefault')).toBe(true);
  });
});

describe('validateVerificationRequest function', () => {
  it('should return success for valid verification request', () => {
    // Arrange
    const validRequest: BankAccountVerificationRequest = {
      verificationId: 'ver_123456789',
      accountId: 'acc_987654321',
      verificationData: {
        amounts: [0.32, 0.45]
      }
    };

    // Act
    const result = validateVerificationRequest(validRequest);

    // Assert
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should return errors for missing required fields', () => {
    // Arrange
    const missingFields: Partial<BankAccountVerificationRequest> = {
      // Missing verificationId and accountId
      verificationData: {
        amounts: [0.32, 0.45]
      }
    };

    // Act
    const result = validateVerificationRequest(missingFields as BankAccountVerificationRequest);

    // Assert
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.field === 'verificationId')).toBe(true);
    expect(result.errors.some(e => e.field === 'accountId')).toBe(true);
  });

  it('should return errors for invalid data types', () => {
    // Arrange
    const invalidTypes = {
      verificationId: 123, // Number instead of string
      accountId: true, // Boolean instead of string
      verificationData: {
        amounts: [0.32, 0.45]
      }
    } as unknown as BankAccountVerificationRequest;

    // Act
    const result = validateVerificationRequest(invalidTypes);

    // Assert
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.field === 'verificationId')).toBe(true);
    expect(result.errors.some(e => e.field === 'accountId')).toBe(true);
  });
});

describe('validateMicroDepositAmounts function', () => {
  it('should return success for valid micro deposit amounts', () => {
    // Arrange
    const validAmounts = [0.32, 0.45];

    // Act
    const result = validateMicroDepositAmounts(validAmounts);

    // Assert
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should return errors if not exactly 2 amounts provided', () => {
    // Arrange
    const tooFewAmounts = [0.32];
    const tooManyAmounts = [0.32, 0.45, 0.12];

    // Act
    const resultFew = validateMicroDepositAmounts(tooFewAmounts);
    const resultMany = validateMicroDepositAmounts(tooManyAmounts);

    // Assert
    expect(resultFew.success).toBe(false);
    expect(resultFew.errors.some(e => e.field === 'amounts')).toBe(true);
    
    expect(resultMany.success).toBe(false);
    expect(resultMany.errors.some(e => e.field === 'amounts')).toBe(true);
  });

  it('should return errors if amounts are not between 0.01 and 0.99', () => {
    // Arrange
    const tooSmallAmount = [0.001, 0.45];
    const tooLargeAmount = [0.32, 1.50];

    // Act
    const resultSmall = validateMicroDepositAmounts(tooSmallAmount);
    const resultLarge = validateMicroDepositAmounts(tooLargeAmount);

    // Assert
    expect(resultSmall.success).toBe(false);
    expect(resultSmall.errors.some(e => e.field.includes('amounts'))).toBe(true);
    
    expect(resultLarge.success).toBe(false);
    expect(resultLarge.errors.some(e => e.field.includes('amounts'))).toBe(true);
  });

  it('should return errors if amounts are not numbers', () => {
    // Arrange
    const invalidTypes = ['0.32', 0.45] as unknown as number[];

    // Act
    const result = validateMicroDepositAmounts(invalidTypes);

    // Assert
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.field.includes('amounts'))).toBe(true);
    expect(result.errors.some(e => e.code === ErrorCode.INVALID_DATA_TYPE)).toBe(true);
  });
});

describe('createBankAccountValidationError function', () => {
  it('should create ValidationError with correct error code', () => {
    // Arrange
    const validationResult = {
      success: false,
      errors: [
        {
          field: 'accountNumber',
          message: 'Invalid account number',
          code: ErrorCode.INVALID_FORMAT
        }
      ]
    };

    // Act
    const error = createBankAccountValidationError(validationResult);

    // Assert
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.fieldErrors.length).toBe(1);
    expect(error.fieldErrors[0].field).toBe('accountNumber');
  });

  it('should include validation result errors in the error details', () => {
    // Arrange
    const validationResult = {
      success: false,
      errors: [
        {
          field: 'routingNumber',
          message: 'Invalid routing number',
          code: ErrorCode.INVALID_FORMAT
        },
        {
          field: 'accountNumber',
          message: 'Invalid account number',
          code: ErrorCode.INVALID_FORMAT
        }
      ]
    };

    // Act
    const error = createBankAccountValidationError(validationResult);

    // Assert
    expect(error.fieldErrors.length).toBe(2);
    expect(error.fieldErrors[0].field).toBe('routingNumber');
    expect(error.fieldErrors[1].field).toBe('accountNumber');
  });

  it('should use provided message in the error', () => {
    // Arrange
    const validationResult = {
      success: false,
      errors: [
        {
          field: 'accountNumber',
          message: 'Invalid account number',
          code: ErrorCode.INVALID_FORMAT
        }
      ]
    };
    const customMessage = 'Custom validation error message';

    // Act
    const error = createBankAccountValidationError(validationResult, customMessage);

    // Assert
    expect(error.message).toBe(customMessage);
  });
});

describe('isValidRoutingNumber function', () => {
  it('should validate routing number format and checksum', () => {
    // Reset mock to use actual implementation for this test
    jest.unmock('../../../services/bank-account-manager/validators/routing-number.validator');
    
    // Re-import to get the real implementation
    const { isValidRoutingNumber } = require('../../../services/bank-account-manager/validators/routing-number.validator');
    
    // Valid routing numbers
    expect(isValidRoutingNumber('122105155')).toBe(true);
    expect(isValidRoutingNumber('322271627')).toBe(true);
    
    // Invalid format (not 9 digits)
    expect(isValidRoutingNumber('12345678')).toBe(false);
    expect(isValidRoutingNumber('1234567890')).toBe(false);
    
    // Invalid format (contains non-digits)
    expect(isValidRoutingNumber('12345678A')).toBe(false);
    
    // Invalid checksum
    expect(isValidRoutingNumber('122105156')).toBe(false);
  });
});

describe('isValidAccountNumber function', () => {
  it('should validate account number format and length', () => {
    // Reset mock to use actual implementation for this test
    jest.unmock('../../../services/bank-account-manager/validators/account-number.validator');
    
    // Re-import to get the real implementation
    const { isValidAccountNumber } = require('../../../services/bank-account-manager/validators/account-number.validator');
    
    // Valid account numbers
    expect(isValidAccountNumber('1234')).toBe(true);
    expect(isValidAccountNumber('12345678901234567')).toBe(true);
    
    // Invalid length (too short)
    expect(isValidAccountNumber('123')).toBe(false);
    
    // Invalid length (too long)
    expect(isValidAccountNumber('123456789012345678')).toBe(false);
    
    // Invalid format (contains non-digits)
    expect(isValidAccountNumber('12345A')).toBe(false);
  });
});