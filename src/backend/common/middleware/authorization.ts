import { Request, Response, NextFunction } from 'express'; // express@4.18.2
import { ApiError } from '../errors/api-error';
import { ErrorCode } from '../constants/error-codes';
import { StatusCode } from '../constants/status-codes';
import { AuthenticatedRequest } from './authentication';
import logger from '../utils/logger';

/**
 * Represents the permission required for an operation
 */
interface PermissionRequirement {
  action: string;
  resource: string;
}

/**
 * Function type for checking resource ownership
 */
type ResourceOwnershipCheck = (user: UserInfo, resourceId: string) => boolean;

/**
 * Represents user information extracted from the JWT token
 */
interface UserInfo {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  merchantId?: string;
  organizationId?: string;
  bankId?: string;
  programId?: string;
}

/**
 * Middleware that checks if the authenticated user has the required permission for an operation
 * 
 * @param requiredPermission - The permission required for the operation
 * @returns Express middleware function that validates permissions
 */
export function requirePermission(requiredPermission: PermissionRequirement) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const user = authenticatedReq.user;
      
      // Check if user exists (set by authentication middleware)
      if (!user) {
        logger.warn('Unauthorized access attempt - no user in request', {
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        throw new ApiError(
          ErrorCode.UNAUTHORIZED_ACCESS,
          'Authentication required for this operation'
        );
      }
      
      // Extract resource ID from request based on resource type
      const resourceId = extractResourceId(req, requiredPermission.resource);
      
      // Check if user has permission for this resource and action
      const hasPermission = checkUserPermission(
        user, 
        requiredPermission, 
        resourceId
      );
      
      if (!hasPermission) {
        logger.warn('Permission denied', {
          userId: user.id,
          roles: user.roles,
          requiredPermission,
          resourceId,
          path: req.path,
          method: req.method
        });
        
        throw new ApiError(
          ErrorCode.PERMISSION_DENIED,
          `You do not have permission to ${requiredPermission.action} this ${requiredPermission.resource}`
        );
      }
      
      // User is authorized, proceed to the next middleware
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware that requires the user to have at least one of the specified roles
 * 
 * @param requiredRoles - Array of roles, any of which would grant access
 * @returns Express middleware function that validates roles
 */
export function requireRole(requiredRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const user = authenticatedReq.user;
      
      // Check if user exists (set by authentication middleware)
      if (!user) {
        logger.warn('Unauthorized access attempt - no user in request', {
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        throw new ApiError(
          ErrorCode.UNAUTHORIZED_ACCESS,
          'Authentication required for this operation'
        );
      }
      
      // Check if user has any of the required roles
      const hasRequiredRole = user.roles.some(role => requiredRoles.includes(role));
      
      if (!hasRequiredRole) {
        logger.warn('Insufficient permissions - required roles not found', {
          userId: user.id,
          userRoles: user.roles,
          requiredRoles,
          path: req.path,
          method: req.method
        });
        
        throw new ApiError(
          ErrorCode.INSUFFICIENT_PERMISSIONS,
          'You do not have sufficient permissions for this operation'
        );
      }
      
      // User has required role, proceed to the next middleware
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Checks if a user has a specific permission for a resource
 * 
 * @param user - User information
 * @param permission - Required permission
 * @param resourceId - ID of the resource being accessed (optional)
 * @returns Whether the user has the permission
 */
function checkUserPermission(
  user: UserInfo, 
  permission: PermissionRequirement, 
  resourceId?: string
): boolean {
  // Check explicit permissions first
  const explicitPermission = `${permission.action}:${permission.resource}`;
  if (user.permissions.includes(explicitPermission)) {
    logger.debug('User has explicit permission', {
      userId: user.id,
      permission: explicitPermission
    });
    return true;
  }
  
  // Barracuda Admins have all permissions
  if (user.roles.includes('BARRACUDA_ADMIN')) {
    logger.debug('User is BARRACUDA_ADMIN, granting permission', {
      userId: user.id,
      permission
    });
    return true;
  }
  
  // Check resource-specific permissions
  switch (permission.resource) {
    case 'refund':
      return checkRefundPermission(user, permission.action, resourceId);
    case 'merchant':
      return checkMerchantPermission(user, permission.action, resourceId);
    case 'bank-account':
      return checkBankAccountPermission(user, permission.action, resourceId);
    case 'parameter':
      return checkParameterPermission(user, permission.action, resourceId);
    default:
      logger.debug(`No specific permission checker for resource: ${permission.resource}`, {
        userId: user.id,
        permission
      });
      return false;
  }
}

/**
 * Checks if a user has permission for a specific refund action
 * 
 * @param user - User information
 * @param action - Action being performed
 * @param refundId - ID of the refund being accessed
 * @returns Whether the user has permission
 */
function checkRefundPermission(
  user: UserInfo, 
  action: string, 
  refundId?: string
): boolean {
  // If no refund ID is provided for specific refund operations, we can only check role-based permissions
  if (!refundId && ['update', 'cancel'].includes(action)) {
    logger.debug('No refundId provided for specific refund operation', {
      userId: user.id,
      action
    });
    // Only admins can perform broad refund operations without specific refund ID
    return user.roles.includes('BARRACUDA_ADMIN');
  }
  
  // Bank Admins can access refunds within their bank
  if (user.roles.includes('BANK_ADMIN') && user.bankId) {
    // In a real implementation, we would check if the refund belongs to a merchant within this bank
    // For simplicity, assuming validation against a service or database check
    logger.debug('User is BANK_ADMIN, checking bank-level access', {
      userId: user.id,
      bankId: user.bankId,
      refundId
    });
    return true; // Would be replaced with actual check against refund's bank ownership
  }
  
  // Organization Admins can access refunds within their organization
  if (user.roles.includes('ORGANIZATION_ADMIN') && user.organizationId) {
    // Would check if the refund belongs to a merchant within this organization
    logger.debug('User is ORGANIZATION_ADMIN, checking organization-level access', {
      userId: user.id,
      organizationId: user.organizationId,
      refundId
    });
    return true; // Would be replaced with actual check against refund's organization ownership
  }
  
  // Merchant Admins can only access their own refunds
  if (user.roles.includes('MERCHANT_ADMIN') && user.merchantId) {
    // Would check if the refund belongs to this merchant
    logger.debug('User is MERCHANT_ADMIN, checking merchant-level access', {
      userId: user.id,
      merchantId: user.merchantId,
      refundId
    });
    return true; // Would be replaced with actual check against refund's merchant ownership
  }
  
  // Support staff may have read-only access
  if (user.roles.includes('SUPPORT_STAFF') && action === 'read') {
    logger.debug('User is SUPPORT_STAFF with read access', {
      userId: user.id,
      refundId
    });
    return true;
  }
  
  logger.debug('Permission denied for refund operation', {
    userId: user.id,
    roles: user.roles,
    action,
    refundId
  });
  
  return false;
}

/**
 * Checks if a user has permission for a specific merchant action
 * 
 * @param user - User information
 * @param action - Action being performed
 * @param merchantId - ID of the merchant being accessed
 * @returns Whether the user has permission
 */
function checkMerchantPermission(
  user: UserInfo, 
  action: string, 
  merchantId?: string
): boolean {
  // If no merchant ID is provided for specific operations
  if (!merchantId && ['update', 'delete'].includes(action)) {
    logger.debug('No merchantId provided for specific merchant operation', {
      userId: user.id,
      action
    });
    // Only highest level admins can perform broad merchant operations without specific merchant ID
    return user.roles.includes('BARRACUDA_ADMIN') || user.roles.includes('BANK_ADMIN');
  }
  
  // Bank Admins can access merchants within their bank
  if (user.roles.includes('BANK_ADMIN') && user.bankId) {
    // Would check if merchant belongs to this bank
    logger.debug('User is BANK_ADMIN, checking bank-level access', {
      userId: user.id,
      bankId: user.bankId,
      merchantId
    });
    return true; // Would be replaced with actual check against merchant's bank ownership
  }
  
  // Organization Admins can access merchants within their organization
  if (user.roles.includes('ORGANIZATION_ADMIN') && user.organizationId) {
    // Would check if merchant belongs to this organization
    logger.debug('User is ORGANIZATION_ADMIN, checking organization-level access', {
      userId: user.id,
      organizationId: user.organizationId,
      merchantId
    });
    return true; // Would be replaced with actual check against merchant's organization ownership
  }
  
  // Merchant Admins can only access their own merchant
  if (user.roles.includes('MERCHANT_ADMIN') && user.merchantId) {
    // Direct comparison since merchantId should match user's merchantId
    logger.debug('User is MERCHANT_ADMIN, checking merchant-level access', {
      userId: user.id,
      userMerchantId: user.merchantId,
      requestedMerchantId: merchantId
    });
    return user.merchantId === merchantId;
  }
  
  // Support staff may have read-only access
  if (user.roles.includes('SUPPORT_STAFF') && action === 'read') {
    logger.debug('User is SUPPORT_STAFF with read access', {
      userId: user.id,
      merchantId
    });
    return true;
  }
  
  logger.debug('Permission denied for merchant operation', {
    userId: user.id,
    roles: user.roles,
    action,
    merchantId
  });
  
  return false;
}

/**
 * Checks if a user has permission for a specific bank account action
 * 
 * @param user - User information
 * @param action - Action being performed
 * @param bankAccountId - ID of the bank account being accessed
 * @returns Whether the user has permission
 */
function checkBankAccountPermission(
  user: UserInfo, 
  action: string, 
  bankAccountId?: string
): boolean {
  // If no bank account ID is provided for specific operations
  if (!bankAccountId && ['update', 'delete'].includes(action)) {
    logger.debug('No bankAccountId provided for specific bank account operation', {
      userId: user.id,
      action
    });
    // Only highest level admins can perform broad bank account operations without specific bank account ID
    return user.roles.includes('BARRACUDA_ADMIN');
  }
  
  // Bank Admins can access bank accounts within their bank
  if (user.roles.includes('BANK_ADMIN') && user.bankId) {
    // Would check if bank account's merchant belongs to this bank
    logger.debug('User is BANK_ADMIN, checking bank-level access', {
      userId: user.id,
      bankId: user.bankId,
      bankAccountId
    });
    return true; // Would be replaced with actual check against bank account's bank ownership
  }
  
  // Organization Admins can access bank accounts within their organization
  if (user.roles.includes('ORGANIZATION_ADMIN') && user.organizationId) {
    // Would check if bank account's merchant belongs to this organization
    logger.debug('User is ORGANIZATION_ADMIN, checking organization-level access', {
      userId: user.id,
      organizationId: user.organizationId,
      bankAccountId
    });
    return true; // Would be replaced with actual check against bank account's organization ownership
  }
  
  // Merchant Admins can only access their own merchant's bank accounts
  if (user.roles.includes('MERCHANT_ADMIN') && user.merchantId) {
    // Would check if bank account belongs to this merchant
    logger.debug('User is MERCHANT_ADMIN, checking merchant-level access', {
      userId: user.id,
      merchantId: user.merchantId,
      bankAccountId
    });
    return true; // Would be replaced with actual check against bank account's merchant ownership
  }
  
  logger.debug('Permission denied for bank account operation', {
    userId: user.id,
    roles: user.roles,
    action,
    bankAccountId
  });
  
  return false;
}

/**
 * Checks if a user has permission for a specific parameter action
 * 
 * @param user - User information
 * @param action - Action being performed
 * @param parameterId - ID of the parameter being accessed
 * @param parameterLevel - Level of the parameter (BANK, ORGANIZATION, MERCHANT, PROGRAM)
 * @returns Whether the user has permission
 */
function checkParameterPermission(
  user: UserInfo, 
  action: string, 
  parameterId?: string,
  parameterLevel?: string
): boolean {
  // Determine parameter level from request if not explicitly provided
  if (!parameterLevel && parameterId) {
    // In a real implementation, we would fetch parameter details to determine its level
    // For simplicity, assuming we have the level information
    logger.debug('No parameter level provided, would fetch from service', {
      userId: user.id,
      parameterId
    });
    // parameterLevel would be set here based on a service call
  }
  
  // For parameters, access is primarily determined by the parameter level
  // and the user's role at that level
  
  if (parameterLevel === 'BANK') {
    // Only Bank Admins and above can access bank-level parameters
    if (['BARRACUDA_ADMIN', 'BANK_ADMIN'].some(role => user.roles.includes(role))) {
      // For Bank Admins, also verify it's their bank
      if (user.roles.includes('BANK_ADMIN') && action !== 'read') {
        // Check if parameter's bank matches user's bank
        return user.bankId === extractParameterEntityId(parameterId, 'BANK');
      }
      return true;
    }
    return false;
  }
  
  if (parameterLevel === 'ORGANIZATION') {
    // Only Organization Admins and above can access organization-level parameters
    if (['BARRACUDA_ADMIN', 'BANK_ADMIN', 'ORGANIZATION_ADMIN'].some(role => user.roles.includes(role))) {
      // For Organization Admins, also verify it's their organization
      if (user.roles.includes('ORGANIZATION_ADMIN') && action !== 'read') {
        // Check if parameter's organization matches user's organization
        return user.organizationId === extractParameterEntityId(parameterId, 'ORGANIZATION');
      }
      return true;
    }
    return false;
  }
  
  if (parameterLevel === 'MERCHANT') {
    // Merchant Admins and above can access merchant-level parameters
    if (['BARRACUDA_ADMIN', 'BANK_ADMIN', 'ORGANIZATION_ADMIN', 'MERCHANT_ADMIN'].some(role => user.roles.includes(role))) {
      // For Merchant Admins, also verify it's their merchant
      if (user.roles.includes('MERCHANT_ADMIN') && action !== 'read') {
        // Check if parameter's merchant matches user's merchant
        return user.merchantId === extractParameterEntityId(parameterId, 'MERCHANT');
      }
      return true;
    }
    return false;
  }
  
  if (parameterLevel === 'PROGRAM') {
    // Only Barracuda Admins can modify program-level parameters
    if (action !== 'read') {
      return user.roles.includes('BARRACUDA_ADMIN');
    }
    // Bank Admins and above can read program-level parameters
    return ['BARRACUDA_ADMIN', 'BANK_ADMIN'].some(role => user.roles.includes(role));
  }
  
  logger.debug('Permission denied for parameter operation', {
    userId: user.id,
    roles: user.roles,
    action,
    parameterId,
    parameterLevel
  });
  
  return false;
}

/**
 * Helper function to extract entity ID from parameter ID
 * This is a simplified implementation - in a real system, this would likely
 * involve a database or service call to get the entity details
 * 
 * @param parameterId - Parameter ID
 * @param level - Entity level
 * @returns Entity ID or undefined
 */
function extractParameterEntityId(parameterId?: string, level?: string): string | undefined {
  // In a real implementation, we would lookup the parameter and extract its entity ID
  // For now, return undefined as this is just a placeholder
  return undefined;
}

/**
 * Extracts resource ID from request based on resource type
 * 
 * @param req - Express request object
 * @param resourceType - Type of resource being accessed
 * @returns Resource ID or undefined if not found
 */
function extractResourceId(req: Request, resourceType: string): string | undefined {
  switch (resourceType) {
    case 'refund':
      return req.params.refundId;
    case 'merchant':
      return req.params.merchantId;
    case 'bank-account':
      return req.params.bankAccountId;
    case 'parameter':
      return req.params.parameterId;
    default:
      return undefined;
  }
}

/**
 * Middleware that requires the user to have the Barracuda Admin role
 */
export const requireBarracudaAdmin = requireRole(['BARRACUDA_ADMIN']);

/**
 * Middleware that requires the user to have at least Bank Admin role
 */
export const requireBankAdmin = requireRole(['BARRACUDA_ADMIN', 'BANK_ADMIN']);

/**
 * Middleware that requires the user to have at least Organization Admin role
 */
export const requireOrganizationAdmin = requireRole(['BARRACUDA_ADMIN', 'BANK_ADMIN', 'ORGANIZATION_ADMIN']);

/**
 * Middleware that requires the user to have at least Merchant Admin role
 */
export const requireMerchantAdmin = requireRole([
  'BARRACUDA_ADMIN', 
  'BANK_ADMIN', 
  'ORGANIZATION_ADMIN', 
  'MERCHANT_ADMIN'
]);