import { Request, Response, NextFunction } from 'express'; // express@4.18.2
import { expressjwt } from 'express-jwt'; // express-jwt@7.x
import * as jwksRsa from 'jwks-rsa'; // jwks-rsa@3.x
import { JwtPayload } from 'jsonwebtoken'; // jsonwebtoken@9.x

import { ApiError } from '../errors/api-error';
import { ErrorCode } from '../constants/error-codes';
import { StatusCode } from '../constants/status-codes';
import authConfig from '../../config/auth';
import logger from '../utils/logger';

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
 * Extends the Express Request interface to include authenticated user information
 */
interface AuthenticatedRequest extends Request {
  user: UserInfo;
}

/**
 * Extracts user information from the decoded JWT token
 * 
 * @param decodedToken - The decoded JWT payload
 * @returns User information object with roles, permissions, and tenant IDs
 */
function extractUserInfo(decodedToken: JwtPayload): UserInfo {
  logger.debug('Extracting user info from token', { sub: decodedToken.sub });

  // Extract identity information
  const userId = decodedToken.sub || '';
  const email = decodedToken.email || '';

  // Extract roles with Auth0 namespaced claims
  const roles = Array.isArray(decodedToken['https://api.refund-service.com/roles']) 
    ? decodedToken['https://api.refund-service.com/roles'] 
    : [];

  // Extract permissions with Auth0 namespaced claims
  const permissions = Array.isArray(decodedToken['https://api.refund-service.com/permissions']) 
    ? decodedToken['https://api.refund-service.com/permissions'] 
    : [];

  // Extract tenant identifiers
  const merchantId = decodedToken['https://api.refund-service.com/merchantId'] as string;
  const organizationId = decodedToken['https://api.refund-service.com/organizationId'] as string;
  const bankId = decodedToken['https://api.refund-service.com/bankId'] as string;
  const programId = decodedToken['https://api.refund-service.com/programId'] as string;

  // Construct user info object
  return {
    id: userId,
    email,
    roles,
    permissions,
    merchantId,
    organizationId,
    bankId,
    programId
  };
}

/**
 * Creates the JWT verification middleware configuration with proper Auth0 settings
 * 
 * @returns Configured express-jwt middleware
 */
function getJwtVerifier() {
  // Create jwksRsa client for retrieving signing keys
  const jwksClient = jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${authConfig.auth0.domain}/.well-known/jwks.json`
  });

  // Configure express-jwt middleware
  return expressjwt({
    secret: jwksClient,
    audience: authConfig.auth0.audience,
    issuer: `https://${authConfig.auth0.domain}/`,
    algorithms: ['RS256'],
    requestProperty: 'auth',
    getToken: (req) => {
      // Extract token from Authorization header with Bearer scheme
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
      }
      return authHeader.split(' ')[1];
    }
  });
}

/**
 * Express middleware that validates JWT tokens and attaches the decoded
 * user information to the request object.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const jwtVerifier = getJwtVerifier();

  // Validate JWT token
  jwtVerifier(req, res, (err) => {
    if (err) {
      // Handle known authentication errors
      if (err.name === 'UnauthorizedError') {
        logger.warn('Authentication failed', {
          error: err.message,
          ip: req.ip,
          path: req.path
        });

        if (err.inner?.name === 'TokenExpiredError') {
          return next(new ApiError(
            ErrorCode.TOKEN_EXPIRED,
            'Your authentication token has expired',
            { expiredAt: err.inner.expiredAt }
          ));
        }

        if (err.code === 'invalid_token') {
          return next(new ApiError(
            ErrorCode.INVALID_CREDENTIALS,
            'Invalid authentication token'
          ));
        }

        return next(new ApiError(
          ErrorCode.AUTHENTICATION_FAILED,
          'Authentication required',
          { details: err.message }
        ));
      }

      // Handle unexpected errors
      logger.error('Unexpected authentication error', {
        error: err.message,
        stack: err.stack,
        ip: req.ip,
        path: req.path
      });

      return next(new ApiError(
        ErrorCode.AUTHENTICATION_FAILED,
        'Authentication failed due to an unexpected error'
      ));
    }

    try {
      // Extract user information from the decoded token
      const userInfo = extractUserInfo(req.auth as JwtPayload);
      
      // Attach user info to request object
      (req as AuthenticatedRequest).user = userInfo;

      logger.info('Authentication successful', {
        userId: userInfo.id,
        roles: userInfo.roles,
        merchantId: userInfo.merchantId
      });

      next();
    } catch (error) {
      logger.error('Error extracting user info from token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      return next(new ApiError(
        ErrorCode.AUTHENTICATION_FAILED,
        'Failed to process authentication token'
      ));
    }
  });
}