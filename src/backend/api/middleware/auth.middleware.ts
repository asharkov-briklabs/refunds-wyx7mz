import { Request, Response, NextFunction } from 'express'; // express@4.18.2
import { authenticate } from '../../common/middleware/authentication';
import { requireRole, requirePermission } from '../../common/middleware/authorization';
import { ApiError } from '../../common/errors';
import { ErrorCode } from '../../common/constants/error-codes';
import logger from '../../common/utils/logger';
import authConfig from '../../config/auth';

/**
 * Express middleware that authenticates requests to the API by validating JWT tokens
 * and attaching user information to the request object for downstream middleware.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function authenticateRequest(req: Request, res: Response, next: NextFunction): void {
  logger.debug('Authentication attempt', {
    path: req.path,
    method: req.method
  });
  
  // Apply the core authenticate middleware from common authentication
  authenticate(req, res, (error) => {
    if (error) {
      // Authentication error occurred
      logger.error('Authentication failed', {
        path: req.path,
        method: req.method,
        error: error.message
      });
      return next(error);
    }
    
    // Authentication successful
    logger.info('Authentication successful', {
      userId: (req as any).user?.id,
      roles: (req as any).user?.roles
    });
    
    next();
  });
}

//
// Role-based middleware functions
// These middleware functions ensure that the authenticated user has the appropriate role.
//

/**
 * Middleware that ensures a user has Barracuda Admin role, which provides
 * system-wide access to all features and data.
 */
export const requireBarracudaAdmin = requireRole(['BARRACUDA_ADMIN']);

/**
 * Middleware that ensures a user has at least Bank Admin role, which provides
 * access to bank-specific data and configurations.
 */
export const requireBankAdmin = requireRole(['BARRACUDA_ADMIN', 'BANK_ADMIN']);

/**
 * Middleware that ensures a user has at least Organization Admin role, which provides
 * access to organization-specific data and configurations.
 */
export const requireOrganizationAdmin = requireRole([
  'BARRACUDA_ADMIN', 
  'BANK_ADMIN', 
  'ORGANIZATION_ADMIN'
]);

/**
 * Middleware that ensures a user has at least Merchant Admin role, which provides
 * access to merchant-specific data and operations.
 */
export const requireMerchantAdmin = requireRole([
  'BARRACUDA_ADMIN', 
  'BANK_ADMIN', 
  'ORGANIZATION_ADMIN', 
  'MERCHANT_ADMIN'
]);

//
// Resource-specific permission middleware factories
// These functions return middleware that checks for specific permissions on resources.
//

/**
 * Middleware that checks if user has permission for a specific refund operation.
 * 
 * @param action - The action being performed (e.g., 'create', 'read', 'update', 'cancel')
 * @returns Express middleware that validates refund permissions
 */
export function checkRefundPermission(action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requirement = {
      action,
      resource: 'refund'
    };
    
    requirePermission(requirement)(req, res, next);
  };
}

/**
 * Middleware that checks if user has permission for a bank account operation.
 * 
 * @param action - The action being performed (e.g., 'create', 'read', 'update', 'delete')
 * @returns Express middleware that validates bank account permissions
 */
export function checkBankAccountPermission(action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requirement = {
      action,
      resource: 'bank-account'
    };
    
    requirePermission(requirement)(req, res, next);
  };
}

/**
 * Middleware that checks if user has permission for a parameter operation.
 * 
 * @param action - The action being performed (e.g., 'read', 'write')
 * @returns Express middleware that validates parameter permissions
 */
export function checkParameterPermission(action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requirement = {
      action,
      resource: 'parameter'
    };
    
    requirePermission(requirement)(req, res, next);
  };
}