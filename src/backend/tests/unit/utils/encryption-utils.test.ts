import { 
  encryptData,
  decryptData,
  hashData,
  validateHash,
  generateRandomBytes,
  maskSensitiveData,
  EncryptionService
} from '../../../common/utils/encryption-utils';
import { generateDataKey, decrypt } from '../../../integrations/aws/kms';
import { ApiError } from '../../../common/errors/api-error';
import { ErrorCode } from '../../../common/constants/error-codes';
import config from '../../../config';

// Mock the dependencies
jest.mock('../../../integrations/aws/kms');
jest.mock('../../../common/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  
  // Mock KMS functions
  (generateDataKey as jest.Mock).mockResolvedValue({
    Plaintext: Buffer.from('mock-data-key'),
    CiphertextBlob: Buffer.from('mock-encrypted-key')
  });
  
  (decrypt as jest.Mock).mockResolvedValue({
    Plaintext: Buffer.from('mock-data-key'),
    KeyId: 'mock-key-id'
  });
});

describe('encryptData', () => {
  it('should encrypt data successfully', async () => {
    const plaintext = 'test-data';
    const keyId = 'test-key-id';
    
    const result = await encryptData(plaintext, keyId);
    
    expect(generateDataKey).toHaveBeenCalledWith(keyId);
    expect(result).toHaveProperty('encryptedData');
    expect(result).toHaveProperty('keyId', keyId);
    expect(typeof result.encryptedData).toBe('string');
  });

  it('should encrypt Buffer data successfully', async () => {
    const plaintext = Buffer.from('test-data');
    const keyId = 'test-key-id';
    
    const result = await encryptData(plaintext, keyId);
    
    expect(generateDataKey).toHaveBeenCalledWith(keyId);
    expect(result).toHaveProperty('encryptedData');
    expect(result).toHaveProperty('keyId', keyId);
    expect(typeof result.encryptedData).toBe('string');
  });

  it('should throw an error when KMS generateDataKey fails', async () => {
    (generateDataKey as jest.Mock).mockRejectedValue(new Error('KMS error'));
    
    await expect(encryptData('test-data', 'test-key-id')).rejects.toThrow(ApiError);
    expect(generateDataKey).toHaveBeenCalledWith('test-key-id');
  });

  it('should throw an error with invalid inputs', async () => {
    await expect(encryptData(null as unknown as string, 'test-key-id')).rejects.toThrow(ApiError);
    await expect(encryptData('test-data', null as unknown as string)).rejects.toThrow(ApiError);
    await expect(encryptData('', 'test-key-id')).rejects.toThrow(ApiError);
  });
});

describe('decryptData', () => {
  it('should decrypt data successfully', async () => {
    // Create encrypted data with known structure
    const encryptedData = Buffer.from(JSON.stringify({
      encryptedKey: 'mock-encrypted-key',
      iv: Buffer.from('mock-iv').toString('base64'),
      ciphertext: Buffer.from('mock-ciphertext').toString('base64'),
      tag: Buffer.from('mock-tag').toString('base64')
    })).toString('base64');
    
    const keyId = 'test-key-id';
    
    const result = await decryptData(encryptedData, keyId);
    
    expect(decrypt).toHaveBeenCalled();
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('should throw an error when KMS decrypt fails', async () => {
    (decrypt as jest.Mock).mockRejectedValue(new Error('KMS error'));
    
    const encryptedData = Buffer.from(JSON.stringify({
      encryptedKey: 'mock-encrypted-key',
      iv: Buffer.from('mock-iv').toString('base64'),
      ciphertext: Buffer.from('mock-ciphertext').toString('base64'),
      tag: Buffer.from('mock-tag').toString('base64')
    })).toString('base64');
    
    await expect(decryptData(encryptedData, 'test-key-id')).rejects.toThrow(ApiError);
  });

  it('should throw an error with invalid inputs', async () => {
    await expect(decryptData(null as unknown as string, 'test-key-id')).rejects.toThrow(ApiError);
    await expect(decryptData('invalid-base64', 'test-key-id')).rejects.toThrow();
    await expect(decryptData('', 'test-key-id')).rejects.toThrow(ApiError);
  });

  it('should throw an error with malformed encrypted data', async () => {
    const invalidEncryptedData = Buffer.from(JSON.stringify({
      // Missing required fields
      iv: Buffer.from('mock-iv').toString('base64')
    })).toString('base64');
    
    await expect(decryptData(invalidEncryptedData, 'test-key-id')).rejects.toThrow();
  });
});

describe('hashData and validateHash', () => {
  it('should hash data correctly', () => {
    const testData = 'test-data';
    
    const hash = hashData(testData);
    
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
    // Check base64 format
    expect(() => Buffer.from(hash, 'base64')).not.toThrow();
  });

  it('should validate a correct hash', () => {
    const testData = 'test-data';
    const hash = hashData(testData);
    
    const isValid = validateHash(testData, hash);
    
    expect(isValid).toBe(true);
  });

  it('should invalidate an incorrect hash', () => {
    const testData = 'test-data';
    const differentData = 'different-data';
    const hash = hashData(testData);
    
    const isValid = validateHash(differentData, hash);
    
    expect(isValid).toBe(false);
  });

  it('should work with different algorithms', () => {
    const testData = 'test-data';
    const algorithm = 'sha512';
    
    const hash = hashData(testData, algorithm);
    const isValid = validateHash(testData, hash, algorithm);
    
    expect(isValid).toBe(true);
  });

  it('should throw errors with invalid inputs', () => {
    expect(() => hashData(null as unknown as string)).toThrow(ApiError);
    expect(() => validateHash(null as unknown as string, 'hash')).toThrow(ApiError);
    expect(() => validateHash('data', null as unknown as string)).toThrow(ApiError);
  });

  it('should work with custom salt', () => {
    const testData = 'test-data';
    const salt = Buffer.from('custom-salt');
    
    const hash = hashData(testData, 'sha256', salt);
    const isValid = validateHash(testData, hash);
    
    expect(isValid).toBe(true);
  });
});

describe('generateRandomBytes', () => {
  it('should generate random bytes of specified length', () => {
    const length = 16;
    
    const bytes1 = generateRandomBytes(length);
    const bytes2 = generateRandomBytes(length);
    
    expect(Buffer.isBuffer(bytes1)).toBe(true);
    expect(bytes1.length).toBe(length);
    // Two calls should produce different results
    expect(bytes1.toString('hex')).not.toBe(bytes2.toString('hex'));
  });

  it('should throw error with invalid length', () => {
    expect(() => generateRandomBytes(-1)).toThrow(ApiError);
    expect(() => generateRandomBytes(0)).toThrow(ApiError);
    expect(() => generateRandomBytes(NaN)).toThrow(ApiError);
  });
});

describe('maskSensitiveData', () => {
  it('should mask credit card numbers correctly', () => {
    const cardNumber = '4242424242424242';
    
    const masked = maskSensitiveData(cardNumber, 'creditCard');
    
    // First 6 and last 4 digits preserved, rest masked
    expect(masked).toBe('424242******4242');
  });

  it('should mask bank account numbers correctly', () => {
    const accountNumber = '1234567890';
    
    const masked = maskSensitiveData(accountNumber, 'bankAccount');
    
    // Only last 4 digits preserved
    expect(masked).toBe('*****7890');
  });

  it('should mask SSN/TIN numbers correctly', () => {
    const ssn = '123456789';
    
    const masked = maskSensitiveData(ssn, 'ssn');
    
    // Only last 4 digits preserved with SSN format
    expect(masked).toBe('***-**-6789');
  });

  it('should mask email addresses correctly', () => {
    const email = 'test@example.com';
    
    const masked = maskSensitiveData(email, 'email');
    
    // First character preserved, rest of local part masked, domain preserved
    expect(masked).toBe('t****@example.com');
  });

  it('should apply default masking for unknown types', () => {
    const data = 'sensitive-data';
    
    const masked = maskSensitiveData(data);
    
    // Default masking should keep first and last character
    expect(masked).toBe('s***********a');
    expect(masked.length).toBe(data.length);
  });

  it('should handle edge cases correctly', () => {
    // Very short string
    expect(maskSensitiveData('ab')).toBe('**');
    // Empty string
    expect(maskSensitiveData('')).toBe('');
    // Non-string input
    expect(maskSensitiveData(123 as unknown as string)).toBe(123 as unknown as string);
  });
});

describe('EncryptionService', () => {
  it('should initialize with default key ID', () => {
    const service = new EncryptionService();
    expect((service as any).defaultKeyId).toBe(config.security.encryptionKey);
  });

  it('should initialize with custom key ID', () => {
    const customKeyId = 'custom-key-id';
    const service = new EncryptionService({ keyId: customKeyId });
    expect((service as any).defaultKeyId).toBe(customKeyId);
  });

  it('should encrypt data using encryptData', async () => {
    const service = new EncryptionService();
    const data = 'test-data';
    const keyId = 'test-key-id';
    
    const result = await service.encrypt(data, keyId);
    
    expect(result).toHaveProperty('encryptedData');
    expect(result).toHaveProperty('keyId', keyId);
  });

  it('should decrypt data using decryptData', async () => {
    const encryptedData = Buffer.from(JSON.stringify({
      encryptedKey: 'mock-encrypted-key',
      iv: Buffer.from('mock-iv').toString('base64'),
      ciphertext: Buffer.from('mock-ciphertext').toString('base64'),
      tag: Buffer.from('mock-tag').toString('base64')
    })).toString('base64');
    
    const service = new EncryptionService();
    
    const result = await service.decrypt(encryptedData);
    
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('should hash data using hashData', () => {
    const service = new EncryptionService();
    const data = 'test-data';
    
    const hash = service.hash(data);
    
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should validate hash using validateHash', () => {
    const service = new EncryptionService();
    const data = 'test-data';
    const hash = service.hash(data);
    
    const isValid = service.validate(data, hash);
    
    expect(isValid).toBe(true);
  });

  it('should mask data using maskSensitiveData', () => {
    const service = new EncryptionService();
    const data = '4242424242424242';
    const type = 'creditCard';
    
    const masked = service.mask(data, type);
    
    expect(masked).toBe('424242******4242');
  });
});