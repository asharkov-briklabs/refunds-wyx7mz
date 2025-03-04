import express, { Router } from 'express'; // express@^4.18.2
import { BankAccountController } from '../../services/refund-api/controllers/bank-account.controller';
import {
  authenticateRequest,
  validateSchema,
  validateIdParam,
  validatePaginationParams,
  checkBankAccountPermission,
  logger
} from '../middleware';

/**
 * Configure and return an Express router with bank account management endpoints
 * @returns Router Express Router with configured bank account routes
 */
export function configureBankAccountRoutes(bankAccountController: BankAccountController): Router {
  // Create a new Express Router instance
  const router = express.Router();

  // Configure POST / endpoint for creating bank accounts, with authentication and validation middleware
  router.post(
    '/',
    authenticateRequest,
    checkBankAccountPermission('create'),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      await bankAccountController.create(req, res, next);
    }
  );

  // Configure GET /:accountId endpoint for retrieving a bank account by ID, with authentication and validation middleware
  router.get(
    '/:accountId',
    authenticateRequest,
    validateIdParam('accountId'),
    checkBankAccountPermission('read'),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      await bankAccountController.getById(req, res, next);
    }
  );

  // Configure GET / endpoint for listing bank accounts for a merchant, with authentication and validation middleware
  router.get(
    '/',
    authenticateRequest,
    checkBankAccountPermission('read'),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      await bankAccountController.list(req, res, next);
    }
  );

  // Configure PUT /:accountId endpoint for updating a bank account, with authentication and validation middleware
  router.put(
    '/:accountId',
    authenticateRequest,
    validateIdParam('accountId'),
    checkBankAccountPermission('update'),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      await bankAccountController.update(req, res, next);
    }
  );

  // Configure DELETE /:accountId endpoint for deleting a bank account, with authentication and validation middleware
  router.delete(
    '/:accountId',
    authenticateRequest,
    validateIdParam('accountId'),
    checkBankAccountPermission('delete'),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      await bankAccountController.delete(req, res, next);
    }
  );

  // Configure PUT /:accountId/default endpoint for setting a bank account as default, with authentication and validation middleware
  router.put(
    '/:accountId/default',
    authenticateRequest,
    validateIdParam('accountId'),
    checkBankAccountPermission('update'),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      await bankAccountController.setDefault(req, res, next);
    }
  );

  // Configure POST /:accountId/verification endpoint for initiating bank account verification, with authentication and validation middleware
  router.post(
    '/:accountId/verification',
    authenticateRequest,
    validateIdParam('accountId'),
    checkBankAccountPermission('update'),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      await bankAccountController.initiateVerification(req, res, next);
    }
  );

  // Configure PUT /:accountId/verification endpoint for completing bank account verification, with authentication and validation middleware
  router.put(
    '/:accountId/verification',
    authenticateRequest,
    validateIdParam('accountId'),
    checkBankAccountPermission('update'),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      await bankAccountController.completeVerification(req, res, next);
    }
  );

  // Configure GET /:accountId/verification endpoint for checking verification status, with authentication and validation middleware
  router.get(
    '/:accountId/verification',
    authenticateRequest,
    validateIdParam('accountId'),
    checkBankAccountPermission('read'),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      await bankAccountController.checkVerificationStatus(req, res, next);
    }
  );

  // Configure DELETE /:accountId/verification endpoint for canceling verification, with authentication and validation middleware
  router.delete(
    '/:accountId/verification',
    authenticateRequest,
    validateIdParam('accountId'),
    checkBankAccountPermission('update'),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      await bankAccountController.cancelVerification(req, res, next);
    }
  );

  // Log successful configuration of bank account routes
  logger.info('Bank account routes configured');

  // Return the configured router
  return router;
}

export default configureBankAccountRoutes;