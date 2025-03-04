# src/backend/tests/unit/services/parameter-resolution.test.ts
```typescript
import { mockEntityIds, mockParameterDefinitions, mockParameters, createParameterDefinition, createParameter } from '../../fixtures/parameters.fixture';
import ParameterResolutionService from '../../../services/parameter-resolution/parameter-resolution.service';
import InheritanceResolver from '../../../services/parameter-resolution/inheritance-resolver';
import ParameterCache from '../../../services/parameter-resolution/cache-manager';
import ParameterValue, { ParameterEntityType } from '../../../services/parameter-resolution/models/parameter-value.model';
import parameterRepository from '../../../database/repositories/parameter.repo';
import { EventEmitter } from '../../../common/utils/event-emitter';
import { InvalidParameterError } from '../../../common/errors/validation-error';
import { NotFoundError } from '../../../common/errors/api-error';
import jest from 'jest'; // jest@^29.5.0

describe('ParameterResolutionService unit tests', () => {
  let service: ParameterResolutionService;
  let mockFindActiveParameter: jest.SpyInstance;
  let mockCreateParameter: jest.SpyInstance;
  let mockUpdateParameter: jest.SpyInstance;
  let mockDeleteParameter: jest.SpyInstance;
  let mockFindParameterHistory: jest.SpyInstance;
  let mockFindParameterDefinition: jest.SpyInstance;
  let mockGetAllParameterDefinitions: jest.SpyInstance;
  let mockResolveParameter: jest.SpyInstance;
  let mockGetInheritanceChain: jest.SpyInstance;
  let mockCacheGet: jest.SpyInstance;
  let mockCacheSet: jest.SpyInstance;
  let mockCacheGetBulk: jest.SpyInstance;
  let mockCacheSetBulk: jest.SpyInstance;
  let mockCacheInvalidate: jest.SpyInstance;
  let mockCacheInvalidateHierarchy: jest.SpyInstance;
  let mockEventEmitterEmit: jest.SpyInstance;

  beforeEach(() => {
    mockFindActiveParameter = jest.spyOn(parameterRepository, 'findActiveParameter');
    mockCreateParameter = jest.spyOn(parameterRepository, 'createParameter');
    mockUpdateParameter = jest.spyOn(parameterRepository, 'updateParameter');
    mockDeleteParameter = jest.spyOn(parameterRepository, 'deleteParameter');
    mockFindParameterHistory = jest.spyOn(parameterRepository, 'findParameterHistory');
    mockFindParameterDefinition = jest.spyOn(parameterRepository, 'findParameterDefinition');
    mockGetAllParameterDefinitions = jest.spyOn(parameterRepository, 'getAllParameterDefinitions');

    mockResolveParameter = jest.spyOn(InheritanceResolver.prototype, 'resolveParameter');
    mockGetInheritanceChain = jest.spyOn(InheritanceResolver.prototype, 'getInheritanceChain');

    mockCacheGet = jest.spyOn(ParameterCache.prototype, 'get');
    mockCacheSet = jest.spyOn(ParameterCache.prototype, 'set');
    mockCacheGetBulk = jest.spyOn(ParameterCache.prototype, 'getBulk');
    mockCacheSetBulk = jest.spyOn(ParameterCache.prototype, 'setBulk');
    mockCacheInvalidate = jest.spyOn(ParameterCache.prototype, 'invalidate');
    mockCacheInvalidateHierarchy = jest.spyOn(ParameterCache.prototype, 'invalidateHierarchy');

    mockEventEmitterEmit = jest.spyOn(EventEmitter.prototype, 'emit');

    service = new ParameterResolutionService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should load parameter definitions during initialization', async () => {
      mockGetAllParameterDefinitions.mockResolvedValue([
        { name: 'maxRefundAmount', description: 'test', dataType: 'DECIMAL', defaultValue: 1000, validationRules: [], overridable: true, category: 'limits', sensitivity: 'internal', auditRequired: true },
        { name: 'refundTimeLimit', description: 'test', dataType: 'NUMBER', defaultValue: 90, validationRules: [], overridable: true, category: 'limits', sensitivity: 'internal', auditRequired: true }
      ]);

      await service.initialize();

      expect(mockGetAllParameterDefinitions).toHaveBeenCalled();
    });

    it('should handle errors during initialization', async () => {
      mockGetAllParameterDefinitions.mockRejectedValue(new Error('Database error'));

      await expect(service.initialize()).rejects.toThrow('Database error');
    });
  });

  describe('resolveParameter', () => {
    it('should resolve parameter from MERCHANT level when available', async () => {
      const merchantId = mockEntityIds.merchant;
      const parameterName = 'maxRefundAmount';
      const expectedValue = mockParameters.merchantLevel.find(p => p.parameterName === parameterName && p.entityType === ParameterEntityType.MERCHANT && p.entityId === merchantId);

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);
      mockCacheGet.mockResolvedValue(null);
      mockGetInheritanceChain.mockResolvedValue([{ entityType: ParameterEntityType.MERCHANT, entityId: merchantId }]);
      mockFindActiveParameter.mockResolvedValue(expectedValue);

      const result = await service.resolveParameter(parameterName, merchantId);

      expect(result).toEqual(expectedValue);
      expect(mockCacheSet).toHaveBeenCalledWith(parameterName, merchantId, expectedValue);
    });

    it('should resolve parameter from ORGANIZATION level when not found at MERCHANT level', async () => {
      const merchantId = mockEntityIds.merchant;
      const parameterName = 'refundTimeLimit';
      const expectedValue = mockParameters.organizationLevel.find(p => p.parameterName === parameterName && p.entityType === ParameterEntityType.ORGANIZATION && p.entityId === mockEntityIds.organization);

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.refundTimeLimit);
      mockCacheGet.mockResolvedValue(null);
      mockGetInheritanceChain.mockResolvedValue([{ entityType: ParameterEntityType.MERCHANT, entityId: merchantId }, { entityType: ParameterEntityType.ORGANIZATION, entityId: mockEntityIds.organization }]);
      mockFindActiveParameter.mockResolvedValueOnce(null).mockResolvedValueOnce(expectedValue);

      const result = await service.resolveParameter(parameterName, merchantId);

      expect(result).toEqual(expectedValue);
      expect(mockCacheSet).toHaveBeenCalledWith(parameterName, merchantId, expectedValue);
    });

    it('should resolve parameter from PROGRAM level when not found at MERCHANT or ORGANIZATION level', async () => {
      const merchantId = mockEntityIds.merchant;
      const parameterName = 'approvalThreshold';
      const expectedValue = mockParameters.programLevel.find(p => p.parameterName === parameterName && p.entityType === ParameterEntityType.PROGRAM && p.entityId === mockEntityIds.program);

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.approvalThreshold);
      mockCacheGet.mockResolvedValue(null);
      mockGetInheritanceChain.mockResolvedValue([{ entityType: ParameterEntityType.MERCHANT, entityId: merchantId }, { entityType: ParameterEntityType.ORGANIZATION, entityId: mockEntityIds.organization }, { entityType: ParameterEntityType.PROGRAM, entityId: mockEntityIds.program }]);
      mockFindActiveParameter.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(expectedValue);

      const result = await service.resolveParameter(parameterName, merchantId);

      expect(result).toEqual(expectedValue);
      expect(mockCacheSet).toHaveBeenCalledWith(parameterName, merchantId, expectedValue);
    });

    it('should resolve parameter from BANK level when not found at higher levels', async () => {
      const merchantId = mockEntityIds.merchant;
      const parameterName = 'requireDocumentation';
      const expectedValue = mockParameters.bankLevel.find(p => p.parameterName === parameterName && p.entityType === ParameterEntityType.BANK && p.entityId === mockEntityIds.bank);

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.requireDocumentation);
      mockCacheGet.mockResolvedValue(null);
      mockGetInheritanceChain.mockResolvedValue([{ entityType: ParameterEntityType.MERCHANT, entityId: merchantId }, { entityType: ParameterEntityType.ORGANIZATION, entityId: mockEntityIds.organization }, { entityType: ParameterEntityType.PROGRAM, entityId: mockEntityIds.program }, { entityType: ParameterEntityType.BANK, entityId: mockEntityIds.bank }]);
      mockFindActiveParameter.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(expectedValue);

      const result = await service.resolveParameter(parameterName, merchantId);

      expect(result).toEqual(expectedValue);
      expect(mockCacheSet).toHaveBeenCalledWith(parameterName, merchantId, expectedValue);
    });

    it('should use default value when parameter not found in any level', async () => {
      const merchantId = mockEntityIds.merchant;
      const parameterName = 'nonExistentParameter';
      const defaultValue = mockParameterDefinitions.maxRefundAmount.defaultValue;
      const expectedValue = createParameter({
        id: `default_${parameterName}`,
        entityType: ParameterEntityType.BANK,
        entityId: 'DEFAULT',
        parameterName: parameterName,
        value: defaultValue,
        overridden: false
      });

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);
      mockCacheGet.mockResolvedValue(null);
      mockGetInheritanceChain.mockResolvedValue([{ entityType: ParameterEntityType.MERCHANT, entityId: merchantId }, { entityType: ParameterEntityType.ORGANIZATION, entityId: mockEntityIds.organization }, { entityType: ParameterEntityType.PROGRAM, entityId: mockEntityIds.program }, { entityType: ParameterEntityType.BANK, entityId: mockEntityIds.bank }]);
      mockFindActiveParameter.mockResolvedValue(null);

      const result = await service.resolveParameter(parameterName, merchantId);

      expect(result).toEqual(expectedValue);
      expect(mockCacheSet).toHaveBeenCalledWith(parameterName, merchantId, expectedValue);
    });

    it('should return from cache when parameter is cached', async () => {
      const merchantId = mockEntityIds.merchant;
      const parameterName = 'maxRefundAmount';
      const cachedValue = mockParameters.merchantLevel.find(p => p.parameterName === parameterName && p.entityType === ParameterEntityType.MERCHANT && p.entityId === merchantId);

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);
      mockCacheGet.mockResolvedValue(cachedValue);

      const result = await service.resolveParameter(parameterName, merchantId);

      expect(result).toEqual(cachedValue);
      expect(mockGetInheritanceChain).not.toHaveBeenCalled();
      expect(mockFindActiveParameter).not.toHaveBeenCalled();
      expect(mockCacheSet).not.toHaveBeenCalled();
    });

    it('should cache parameter after resolving from hierarchy', async () => {
      const merchantId = mockEntityIds.merchant;
      const parameterName = 'maxRefundAmount';
      const expectedValue = mockParameters.merchantLevel.find(p => p.parameterName === parameterName && p.entityType === ParameterEntityType.MERCHANT && p.entityId === merchantId);

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);
      mockCacheGet.mockResolvedValue(null);
      mockGetInheritanceChain.mockResolvedValue([{ entityType: ParameterEntityType.MERCHANT, entityId: merchantId }]);
      mockFindActiveParameter.mockResolvedValue(expectedValue);

      await service.resolveParameter(parameterName, merchantId);

      expect(mockCacheSet).toHaveBeenCalledWith(parameterName, merchantId, expectedValue);
    });

    it('should handle errors during resolution', async () => {
      const merchantId = mockEntityIds.merchant;
      const parameterName = 'maxRefundAmount';

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);
      mockCacheGet.mockRejectedValue(new Error('Redis error'));

      await expect(service.resolveParameter(parameterName, merchantId)).rejects.toThrow('Redis error');
    });

    it('should reject with InvalidParameterError for invalid parameter name', async () => {
      const merchantId = mockEntityIds.merchant;
      const parameterName = null;

      await expect(service.resolveParameter(parameterName, merchantId)).rejects.toThrow(InvalidParameterError);
    });
  });

  describe('resolveParameters', () => {
    it('should resolve multiple parameters efficiently', async () => {
      const merchantId = mockEntityIds.merchant;
      const parameterNames = ['maxRefundAmount', 'refundTimeLimit'];
      const expectedValues = new Map<string, ParameterValue>();
      mockParameters.merchantLevel.forEach(param => {
        if (parameterNames.includes(param.parameterName)) {
          expectedValues.set(param.parameterName, param);
        }
      });

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);
      mockCacheGetBulk.mockResolvedValue(new Map());
      mockGetInheritanceChain.mockResolvedValue([{ entityType: ParameterEntityType.MERCHANT, entityId: merchantId }]);
      mockFindActiveParameter.mockResolvedValue(mockParameters.merchantLevel[0]);

      const result = await service.resolveParameters(parameterNames, merchantId);

      expect(result.size).toBe(parameterNames.length);
      expect(mockCacheSetBulk).toHaveBeenCalled();
    });

    it('should use cache for parameters that are cached', async () => {
      const merchantId = mockEntityIds.merchant;
      const parameterNames = ['maxRefundAmount', 'refundTimeLimit'];
      const cachedValues = new Map<string, ParameterValue>();
      mockParameters.merchantLevel.forEach(param => {
        if (parameterNames.includes(param.parameterName)) {
          cachedValues.set(param.parameterName, param);
        }
      });

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);
      mockCacheGetBulk.mockResolvedValue(cachedValues);

      const result = await service.resolveParameters(parameterNames, merchantId);

      expect(result.size).toBe(parameterNames.length);
      expect(mockGetInheritanceChain).not.toHaveBeenCalled();
      expect(mockFindActiveParameter).not.toHaveBeenCalled();
      expect(mockCacheSetBulk).not.toHaveBeenCalled();
    });

    it('should resolve uncached parameters and update cache', async () => {
      const merchantId = mockEntityIds.merchant;
      const parameterNames = ['maxRefundAmount', 'refundTimeLimit'];
      const cachedValues = new Map<string, ParameterValue>();
      cachedValues.set('maxRefundAmount', mockParameters.merchantLevel[0]);

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);
      mockCacheGetBulk.mockResolvedValue(cachedValues);
      mockGetInheritanceChain.mockResolvedValue([{ entityType: ParameterEntityType.MERCHANT, entityId: merchantId }]);
      mockFindActiveParameter.mockResolvedValue(mockParameters.merchantLevel[1]);

      const result = await service.resolveParameters(parameterNames, merchantId);

      expect(result.size).toBe(parameterNames.length);
      expect(mockCacheSetBulk).toHaveBeenCalled();
    });

    it('should handle mix of existing and non-existing parameters', async () => {
      const merchantId = mockEntityIds.merchant;
      const parameterNames = ['maxRefundAmount', 'nonExistentParameter'];
      const cachedValues = new Map<string, ParameterValue>();
      cachedValues.set('maxRefundAmount', mockParameters.merchantLevel[0]);

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);
      mockCacheGetBulk.mockResolvedValue(cachedValues);
      mockGetInheritanceChain.mockResolvedValue([{ entityType: ParameterEntityType.MERCHANT, entityId: merchantId }]);
      mockFindActiveParameter.mockResolvedValue(null);

      const result = await service.resolveParameters(parameterNames, merchantId);

      expect(result.size).toBe(parameterNames.length);
      expect(mockCacheSetBulk).toHaveBeenCalled();
    });

    it('should handle errors during bulk resolution', async () => {
      const merchantId = mockEntityIds.merchant;
      const parameterNames = ['maxRefundAmount', 'refundTimeLimit'];

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);
      mockCacheGetBulk.mockRejectedValue(new Error('Redis error'));

      await expect(service.resolveParameters(parameterNames, merchantId)).rejects.toThrow('Redis error');
    });
  });

  describe('getParameterValue and getParametersValue', () => {
    it('should return raw value from parameter', async () => {
      const merchantId = mockEntityIds.merchant;
      const parameterName = 'maxRefundAmount';
      const expectedValue = mockParameters.merchantLevel[0].value;

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);
      mockCacheGet.mockResolvedValue(mockParameters.merchantLevel[0]);
      mockGetInheritanceChain.mockResolvedValue([{ entityType: ParameterEntityType.MERCHANT, entityId: merchantId }]);
      mockFindActiveParameter.mockResolvedValue(mockParameters.merchantLevel[0]);

      const result = await service.getParameterValue(parameterName, merchantId);

      expect(result).toBe(expectedValue);
    });

    it('should return record of raw values from multiple parameters', async () => {
      const merchantId = mockEntityIds.merchant;
      const parameterNames = ['maxRefundAmount', 'refundTimeLimit'];
      const expectedValues = {
        maxRefundAmount: mockParameters.merchantLevel[0].value,
        refundTimeLimit: mockParameters.merchantLevel[1].value
      };

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);
      mockCacheGetBulk.mockResolvedValue(new Map());
      mockGetInheritanceChain.mockResolvedValue([{ entityType: ParameterEntityType.MERCHANT, entityId: merchantId }]);
      mockFindActiveParameter.mockResolvedValue(mockParameters.merchantLevel[0]);

      const result = await service.getParametersValue(parameterNames, merchantId);

      expect(result).toEqual(expectedValues);
    });

    it('should handle errors during value extraction', async () => {
      const merchantId = mockEntityIds.merchant;
      const parameterName = 'maxRefundAmount';

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);
      mockCacheGet.mockRejectedValue(new Error('Redis error'));

      await expect(service.getParameterValue(parameterName, merchantId)).rejects.toThrow('Redis error');
    });
  });

  describe('setParameter', () => {
    it('should create new parameter when it doesn\'t exist', async () => {
      const entityType = ParameterEntityType.MERCHANT;
      const entityId = mockEntityIds.merchant;
      const parameterName = 'newParameter';
      const value = 'new value';
      const metadata = { userId: 'test-user' };

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);
      mockFindActiveParameter.mockResolvedValue(null);
      mockCreateParameter.mockResolvedValue({ _id: 'new-param-id', entityType, entityId, parameterName, value, effectiveDate: new Date(), expirationDate: null, version: 1, createdBy: 'test-user', createdAt: new Date(), updatedAt: new Date() });
      mockCacheInvalidateHierarchy.mockResolvedValue(1);

      await service.setParameter(entityType, entityId, parameterName, value, metadata);

      expect(mockCreateParameter).toHaveBeenCalled();
      expect(mockCacheInvalidateHierarchy).toHaveBeenCalledWith(parameterName, entityType, entityId);
      expect(mockEventEmitterEmit).toHaveBeenCalled();
    });

    it('should update parameter when it exists', async () => {
      const entityType = ParameterEntityType.MERCHANT;
      const entityId = mockEntityIds.merchant;
      const parameterName = 'maxRefundAmount';
      const value = 7500.00;
      const metadata = { userId: 'test-user' };
      const existingParameter = mockParameters.merchantLevel[0];

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);
      mockFindActiveParameter.mockResolvedValue(existingParameter);
      mockUpdateParameter.mockResolvedValue({ _id: 'new-param-id', entityType, entityId, parameterName, value, effectiveDate: new Date(), expirationDate: null, version: 2, createdBy: 'test-user', createdAt: new Date(), updatedAt: new Date() });
      mockCacheInvalidateHierarchy.mockResolvedValue(1);

      await service.setParameter(entityType, entityId, parameterName, value, metadata);

      expect(mockUpdateParameter).toHaveBeenCalled();
      expect(mockCacheInvalidateHierarchy).toHaveBeenCalledWith(parameterName, entityType, entityId);
      expect(mockEventEmitterEmit).toHaveBeenCalled();
    });

    it('should validate parameter value against definition', async () => {
      const entityType = ParameterEntityType.MERCHANT;
      const entityId = mockEntityIds.merchant;
      const parameterName = 'maxRefundAmount';
      const value = 'invalid value';
      const metadata = { userId: 'test-user' };

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);
      mockFindActiveParameter.mockResolvedValue(null);

      await expect(service.setParameter(entityType, entityId, parameterName, value, metadata)).rejects.toThrow(InvalidParameterError);
    });

    it('should reject invalid parameter values', async () => {
      const entityType = ParameterEntityType.MERCHANT;
      const entityId = mockEntityIds.merchant;
      const parameterName = 'maxRefundAmount';
      const value = 'invalid value';
      const metadata = { userId: 'test-user' };

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);
      mockFindActiveParameter.mockResolvedValue(null);

      await expect(service.setParameter(entityType, entityId, parameterName, value, metadata)).rejects.toThrow(InvalidParameterError);
    });

    it('should invalidate cache after setting parameter', async () => {
      const entityType = ParameterEntityType.MERCHANT;
      const entityId = mockEntityIds.merchant;
      const parameterName = 'newParameter';
      const value = 'new value';
      const metadata = { userId: 'test-user' };

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);
      mockFindActiveParameter.mockResolvedValue(null);
      mockCreateParameter.mockResolvedValue({ _id: 'new-param-id', entityType, entityId, parameterName, value, effectiveDate: new Date(), expirationDate: null, version: 1, createdBy: 'test-user', createdAt: new Date(), updatedAt: new Date() });
      mockCacheInvalidateHierarchy.mockResolvedValue(1);

      await service.setParameter(entityType, entityId, parameterName, value, metadata);

      expect(mockCacheInvalidateHierarchy).toHaveBeenCalledWith(parameterName, entityType, entityId);
    });

    it('should emit parameter change event', async () => {
      const entityType = ParameterEntityType.MERCHANT;
      const entityId = mockEntityIds.merchant;
      const parameterName = 'newParameter';
      const value = 'new value';
      const metadata = { userId: 'test-user' };

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);
      mockFindActiveParameter.mockResolvedValue(null);
      mockCreateParameter.mockResolvedValue({ _id: 'new-param-id', entityType, entityId, parameterName, value, effectiveDate: new Date(), expirationDate: null, version: 1, createdBy: 'test-user', createdAt: new Date(), updatedAt: new Date() });
      mockCacheInvalidateHierarchy.mockResolvedValue(1);

      await service.setParameter(entityType, entityId, parameterName, value, metadata);

      expect(mockEventEmitterEmit).toHaveBeenCalled();
    });

    it('should handle errors during parameter setting', async () => {
      const entityType = ParameterEntityType.MERCHANT;
      const entityId = mockEntityIds.merchant;
      const parameterName = 'newParameter';
      const value = 'new value';
      const metadata = { userId: 'test-user' };

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);
      mockFindActiveParameter.mockResolvedValue(null);
      mockCreateParameter.mockRejectedValue(new Error('Database error'));

      await expect(service.setParameter(entityType, entityId, parameterName, value, metadata)).rejects.toThrow('Database error');
    });
  });

  describe('deleteParameter', () => {
    it('should delete existing parameter', async () => {
      const entityType = ParameterEntityType.MERCHANT;
      const entityId = mockEntityIds.merchant;
      const parameterName = 'maxRefundAmount';

      mockFindActiveParameter.mockResolvedValue(mockParameters.merchantLevel[0]);
      mockDeleteParameter.mockResolvedValue(true);
      mockCacheInvalidateHierarchy.mockResolvedValue(1);

      const result = await service.deleteParameter(entityType, entityId, parameterName);

      expect(result).toBe(true);
      expect(mockDeleteParameter).toHaveBeenCalledWith(entityType, entityId, parameterName);
      expect(mockCacheInvalidateHierarchy).toHaveBeenCalledWith(parameterName, entityType, entityId);
      expect(mockEventEmitterEmit).toHaveBeenCalled();
    });

    it('should return false when parameter not found', async () => {
      const entityType = ParameterEntityType.MERCHANT;
      const entityId = mockEntityIds.merchant;
      const parameterName = 'nonExistentParameter';

      mockFindActiveParameter.mockResolvedValue(null);
      mockDeleteParameter.mockResolvedValue(false);

      const result = await service.deleteParameter(entityType, entityId, parameterName);

      expect(result).toBe(false);
      expect(mockDeleteParameter).not.toHaveBeenCalled();
      expect(mockCacheInvalidateHierarchy).not.toHaveBeenCalled();
      expect(mockEventEmitterEmit).not.toHaveBeenCalled();
    });

    it('should invalidate cache after deletion', async () => {
      const entityType = ParameterEntityType.MERCHANT;
      const entityId = mockEntityIds.merchant;
      const parameterName = 'maxRefundAmount';

      mockFindActiveParameter.mockResolvedValue(mockParameters.merchantLevel[0]);
      mockDeleteParameter.mockResolvedValue(true);
      mockCacheInvalidateHierarchy.mockResolvedValue(1);

      await service.deleteParameter(entityType, entityId, parameterName);

      expect(mockCacheInvalidateHierarchy).toHaveBeenCalledWith(parameterName, entityType, entityId);
    });

    it('should emit parameter deletion event', async () => {
      const entityType = ParameterEntityType.MERCHANT;
      const entityId = mockEntityIds.merchant;
      const parameterName = 'maxRefundAmount';

      mockFindActiveParameter.mockResolvedValue(mockParameters.merchantLevel[0]);
      mockDeleteParameter.mockResolvedValue(true);
      mockCacheInvalidateHierarchy.mockResolvedValue(1);

      await service.deleteParameter(entityType, entityId, parameterName);

      expect(mockEventEmitterEmit).toHaveBeenCalled();
    });

    it('should handle errors during deletion', async () => {
      const entityType = ParameterEntityType.MERCHANT;
      const entityId = mockEntityIds.merchant;
      const parameterName = 'maxRefundAmount';

      mockFindActiveParameter.mockResolvedValue(mockParameters.merchantLevel[0]);
      mockDeleteParameter.mockRejectedValue(new Error('Database error'));

      await expect(service.deleteParameter(entityType, entityId, parameterName)).rejects.toThrow('Database error');
    });
  });

  describe('getParameterHistory', () => {
    it('should return parameter version history', async () => {
      const entityType = ParameterEntityType.MERCHANT;
      const entityId = mockEntityIds.merchant;
      const parameterName = 'maxRefundAmount';
      const history = [mockParameters.merchantLevel[0]];

      mockFindParameterHistory.mockResolvedValue(history);

      const result = await service.getParameterHistory(entityType, entityId, parameterName);

      expect(result).toEqual(history);
      expect(mockFindParameterHistory).toHaveBeenCalledWith(entityType, entityId, parameterName);
    });

    it('should return empty array when no history found', async () => {
      const entityType = ParameterEntityType.MERCHANT;
      const entityId = mockEntityIds.merchant;
      const parameterName = 'maxRefundAmount';

      mockFindParameterHistory.mockResolvedValue([]);

      const result = await service.getParameterHistory(entityType, entityId, parameterName);

      expect(result).toEqual([]);
      expect(mockFindParameterHistory).toHaveBeenCalledWith(entityType, entityId, parameterName);
    });

    it('should handle errors during history retrieval', async () => {
      const entityType = ParameterEntityType.MERCHANT;
      const entityId = mockEntityIds.merchant;
      const parameterName = 'maxRefundAmount';

      mockFindParameterHistory.mockRejectedValue(new Error('Database error'));

      await expect(service.getParameterHistory(entityType, entityId, parameterName)).rejects.toThrow('Database error');
    });
  });

  describe('getParameterDefinition and getAllParameterDefinitions', () => {
    it('should get parameter definition by name', async () => {
      const parameterName = 'maxRefundAmount';
      const expectedDefinition = mockParameterDefinitions.maxRefundAmount;

      mockFindParameterDefinition.mockResolvedValue(expectedDefinition);

      const result = await service.getParameterDefinition(parameterName);

      expect(result).toEqual(expectedDefinition);
      expect(mockFindParameterDefinition).toHaveBeenCalledWith(parameterName);
    });

    it('should return null for unknown parameter definition', async () => {
      const parameterName = 'nonExistentParameter';

      mockFindParameterDefinition.mockResolvedValue(null);

      const result = await service.getParameterDefinition(parameterName);

      expect(result).toBeNull();
      expect(mockFindParameterDefinition).toHaveBeenCalledWith(parameterName);
    });

    it('should get all parameter definitions', async () => {
      const definitions = Object.values(mockParameterDefinitions);

      mockGetAllParameterDefinitions.mockResolvedValue(definitions);

      const result = await service.getAllParameterDefinitions();

      expect(result).toEqual(definitions);
      expect(mockGetAllParameterDefinitions).toHaveBeenCalled();
    });

    it('should handle errors during definition retrieval', async () => {
      mockGetAllParameterDefinitions.mockRejectedValue(new Error('Database error'));

      await expect(service.getAllParameterDefinitions()).rejects.toThrow('Database error');
    });
  });

  describe('validateParameterValue', () => {
    it('should validate parameter against definition', async () => {
      const parameterName = 'maxRefundAmount';
      const value = 5000;

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);

      const result = await service.validateParameterValue(parameterName, value);

      expect(result.valid).toBe(true);
    });

    it('should reject value with wrong data type', async () => {
      const parameterName = 'maxRefundAmount';
      const value = 'invalid';

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);

      const result = await service.validateParameterValue(parameterName, value);

      expect(result.valid).toBe(false);
    });

    it('should validate against range rules', async () => {
      const parameterName = 'maxRefundAmount';
      const value = 150000;

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);

      const result = await service.validateParameterValue(parameterName, value);

      expect(result.valid).toBe(false);
    });

    it('should validate against pattern rules', async () => {
      const parameterName = 'maxRefundAmount';
      const value = 'invalid';

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);

      const result = await service.validateParameterValue(parameterName, value);

      expect(result.valid).toBe(false);
    });

    it('should validate against enum rules', async () => {
      const parameterName = 'maxRefundAmount';
      const value = 'invalid';

      mockFindParameterDefinition.mockResolvedValue(mockParameterDefinitions.maxRefundAmount);

      const result = await service.validateParameterValue(parameterName, value);

      expect(result.valid).toBe(false);
    });

    it('should handle errors during validation', async () => {
      const parameterName = 'maxRefundAmount';
      const value = 5000;

      mockFindParameterDefinition.mockRejectedValue(new Error('Database error'));

      await expect(service.validateParameterValue(parameterName, value)).rejects.toThrow('Database error');
    });
  });

  describe('getInheritanceChain', () => {
    it('should return inheritance chain for merchant', async () => {
      const merchantId = mockEntityIds.merchant;
      const expectedChain = [
        { entityType: ParameterEntityType.MERCHANT, entityId: merchantId },
        { entityType: ParameterEntityType.ORGANIZATION, entityId: mockEntityIds.organization },
        { entityType: ParameterEntityType.PROGRAM, entityId: mockEntityIds.program },
        { entityType: ParameterEntityType.BANK, entityId: mockEntityIds.bank }
      ];

      mockGetInheritanceChain.mockResolvedValue(expectedChain);

      const result = await service.getInheritanceChain(merchantId);

      expect(result).toEqual(expectedChain);
      expect(mockGetInheritanceChain).toHaveBeenCalledWith(merchantId);
    });

    it('should handle missing entities in chain', async () => {
      const merchantId = mockEntityIds.merchant;
      const expectedChain = [
        { entityType: ParameterEntityType.MERCHANT, entityId: merchantId }
      ];

      mockGetInheritanceChain.mockResolvedValue(expectedChain);

      const result = await service.getInheritanceChain(merchantId);

      expect(result).toEqual(expectedChain);
      expect(mockGetInheritanceChain).toHaveBeenCalledWith(merchantId);
    });

    it('should handle errors during chain resolution', async () => {
      const merchantId = mockEntityIds.merchant;

      mockGetInheritanceChain.mockRejectedValue(new Error('Service unavailable'));

      await expect(service.getInheritanceChain(merchantId)).rejects.toThrow('Service unavailable');
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cache by pattern', async () => {
      const pattern = 'maxRefundAmount:*';

      mockCacheInvalidate.mockResolvedValue(1);

      const result = await service.invalidateCache(pattern);

      expect(result).toBe(1);
      expect(mockCacheInvalidate).toHaveBeenCalledWith(pattern);
    });

    it('should handle errors during cache invalidation', async () => {
      const pattern = 'maxRefundAmount:*';

      mockCacheInvalidate.mockRejectedValue(new Error('Redis error'));

      await expect(service.invalidateCache(pattern)).rejects.toThrow('Redis error');
    });
  });
});