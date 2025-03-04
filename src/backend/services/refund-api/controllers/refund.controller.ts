import { Request, Response, NextFunction } from 'express'; // express@^4.18.2
import { ApiError, ValidationError, BusinessError } from '../../../common/errors';
import { ErrorCode } from '../../../common/constants/error-codes';
import { StatusCode } from '../../../common/constants/status-codes';
import { RefundMethod } from '../../../common/enums/refund-method.enum';
import { logger } from '../../../common/utils/logger';
import { metrics } from '../../../common/utils/metrics';
import { validateCreateRefundRequest, validateUpdateRefundRequest, validateCancelRefundRequest } from '../validators/refund.validator';
import refundRequestManagerService from '../../refund-request-manager';

/**
 * Factory function to create a properly configured instance of RefundController
 */
export const createRefundController = () => {
    return new RefundController(refundRequestManagerService);
};

/**
 * Controller class handling all refund-related HTTP endpoints
 */
export class RefundController {
    private refundRequestManagerService: any;

    /**
     * Initializes the RefundController with required dependencies
     * @param refundRequestManagerService 
     */
    constructor(refundRequestManagerService: any) {
        this.refundRequestManagerService = refundRequestManagerService;
    }

    /**
     * Handler for creating a new refund
     * @param req 
     * @param res 
     * @param next 
     */
    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info('Attempting to create a new refund');
            metrics.incrementCounter('refund.create.attempt');

            const { userId, merchantId } = (req as any).auth; // LD1: Extract userId and merchantId from authenticated request
            const { ...refundData } = req.body; // LD1: Extract refund data from request body
            const idempotencyKey = req.headers['idempotency-key'] as string; // LD1: Extract idempotency key from request headers

            // LD1: Validate refund data using validateCreateRefundRequest function
            const validationResult = validateCreateRefundRequest(refundData);
            if (!validationResult.success) {
                logger.warn('Invalid refund data', { errors: validationResult.errors });
                metrics.incrementCounter('refund.create.validation_error');
                throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Invalid refund data', { fieldErrors: validationResult.errors }); // LD1: Handle validation errors with proper status codes and error messages
            }

            // LD1: Call refundRequestManagerService.createRefundRequest with validated data
            const refundRequest = await this.refundRequestManagerService.createRefundRequest({
                ...refundData,
                merchantId,
                requestorId: userId,
            }, idempotencyKey);

            logger.info('Refund created successfully', { refundId: refundRequest.refundId });
            metrics.incrementCounter('refund.create.success');

            // LD1: Return success response with created refund details and CREATED status code
            return res.status(StatusCode.CREATED).json({
                refund: refundRequest
            });
        } catch (error) {
            logger.error('Error creating refund', { error });
            metrics.incrementCounter('refund.create.error');

            // LD1: Handle business errors (e.g., insufficient funds, invalid transaction)
            if (error instanceof ValidationError) {
                return next(error);
            } else if (error instanceof BusinessError) {
                return next(error);
            }

            // LD1: Handle other errors and pass to next() for global error handling
            return next(new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create refund'));
        }
    };

    /**
     * Handler for retrieving a refund by ID
     * @param req 
     * @param res 
     * @param next 
     */
    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info('Attempting to retrieve a refund by ID');
            metrics.incrementCounter('refund.getById.attempt');

            const { refundId } = req.params; // LD1: Extract refundId from request parameters
            const { userId } = (req as any).auth; // LD1: Extract userId from authenticated request

            // LD1: Call refundRequestManagerService.getRefundRequest with refundId
            const refund = await this.refundRequestManagerService.getRefundRequest(refundId);

            if (!refund) {
                logger.warn('Refund not found', { refundId });
                metrics.incrementCounter('refund.getById.not_found');
                throw new ApiError(ErrorCode.RESOURCE_NOT_FOUND, 'Refund not found'); // LD1: Return 404 Not Found if refund doesn't exist or user doesn't have access
            }

            logger.info('Refund retrieved successfully', { refundId });
            metrics.incrementCounter('refund.getById.success');

            // LD1: Return refund details with OK status code if found
            return res.status(StatusCode.OK).json({
                refund: refund
            });
        } catch (error) {
            logger.error('Error retrieving refund', { error });
            metrics.incrementCounter('refund.getById.error');

            // LD1: Handle errors and pass to next() for global error handling
            return next(new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve refund'));
        }
    };

    /**
     * Handler for retrieving a list of refunds
     * @param req 
     * @param res 
     * @param next 
     */
    list = async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info('Attempting to retrieve a list of refunds');
            metrics.incrementCounter('refund.list.attempt');

            const { merchantId } = (req as any).auth; // LD1: Extract merchantId from request parameters or authenticated user
            const { status, dateRangeStart, dateRangeEnd, page, limit } = req.query; // LD1: Extract filter parameters (status, dateRange, etc.) from query string

            // LD1: Call refundRequestManagerService.getRefundRequestsByMerchant with filters
            const refunds = await this.refundRequestManagerService.getRefundRequestsByMerchant(merchantId, {
                status: status as string,
                dateRangeStart: dateRangeStart as string,
                dateRangeEnd: dateRangeEnd as string,
                page: Number(page) || 1,
                limit: Number(limit) || 20
            });

            logger.info('Refund list retrieved successfully', { count: refunds.refundRequests.length });
            metrics.incrementCounter('refund.list.success');

            // LD1: Return paginated list with total count and metadata
            return res.status(StatusCode.OK).json({
                refunds: refunds.refundRequests,
                total: refunds.total,
                page: refunds.page,
                limit: refunds.limit
            });
        } catch (error) {
            logger.error('Error retrieving list of refunds', { error });
            metrics.incrementCounter('refund.list.error');

            // LD1: Handle errors and pass to next() for global error handling
            return next(new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve list of refunds'));
        }
    };

    /**
     * Handler for updating a refund
     * @param req 
     * @param res 
     * @param next 
     */
    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info('Attempting to update a refund');
            metrics.incrementCounter('refund.update.attempt');

            const { refundId } = req.params; // LD1: Extract refundId from request parameters
            const { userId } = (req as any).auth; // LD1: Extract userId from authenticated request
            const { ...updateData } = req.body; // LD1: Extract update data from request body

            // LD1: Get existing refund to validate against its current state
            const existingRefund = await this.refundRequestManagerService.getRefundRequest(refundId);
            if (!existingRefund) {
                logger.warn('Refund not found', { refundId });
                metrics.incrementCounter('refund.update.not_found');
                throw new ApiError(ErrorCode.RESOURCE_NOT_FOUND, 'Refund not found');
            }

            // LD1: Validate update data using validateUpdateRefundRequest function
            const validationResult = validateUpdateRefundRequest(updateData, existingRefund);
            if (!validationResult.success) {
                logger.warn('Invalid update data', { errors: validationResult.errors });
                metrics.incrementCounter('refund.update.validation_error');
                throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Invalid update data', { fieldErrors: validationResult.errors }); // LD1: Handle validation errors with proper status codes
            }

            // LD1: Call refundRequestManagerService.updateRefundStatus with updates
            const updatedRefund = await this.refundRequestManagerService.updateRefundStatus(refundId, updateData);

            logger.info('Refund updated successfully', { refundId });
            metrics.incrementCounter('refund.update.success');

            // LD1: Return updated refund details with OK status code
            return res.status(StatusCode.OK).json({
                refund: updatedRefund
            });
        } catch (error) {
            logger.error('Error updating refund', { error });
            metrics.incrementCounter('refund.update.error');

            // LD1: Handle validation errors with proper status codes
            if (error instanceof ValidationError) {
                return next(error);
            } else if (error instanceof BusinessError) {
                return next(error); // LD1: Handle state transition errors (e.g., cannot update completed refund)
            }

            // LD1: Handle other errors and pass to next() for global error handling
            return next(new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to update refund'));
        }
    };

    /**
     * Handler for canceling a refund
     * @param req 
     * @param res 
     * @param next 
     */
    cancel = async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info('Attempting to cancel a refund');
            metrics.incrementCounter('refund.cancel.attempt');

            const { refundId } = req.params; // LD1: Extract refundId from request parameters
            const { userId } = (req as any).auth; // LD1: Extract userId from authenticated request
            const { reason } = req.body; // LD1: Extract cancellation reason from request body

            // LD1: Get existing refund to validate its current state
            const existingRefund = await this.refundRequestManagerService.getRefundRequest(refundId);
            if (!existingRefund) {
                logger.warn('Refund not found', { refundId });
                metrics.incrementCounter('refund.cancel.not_found');
                throw new ApiError(ErrorCode.RESOURCE_NOT_FOUND, 'Refund not found');
            }

            // LD1: Validate cancellation using validateCancelRefundRequest function
            const validationResult = validateCancelRefundRequest({ reason }, existingRefund);
            if (!validationResult.success) {
                logger.warn('Invalid cancellation data', { errors: validationResult.errors });
                metrics.incrementCounter('refund.cancel.validation_error');
                throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Invalid cancellation data', { fieldErrors: validationResult.errors }); // LD1: Handle validation errors with proper status codes
            }

            // LD1: Call refundRequestManagerService.cancelRefundRequest with refundId
            const cancelledRefund = await this.refundRequestManagerService.cancelRefundRequest(refundId, reason, userId);

            logger.info('Refund cancelled successfully', { refundId });
            metrics.incrementCounter('refund.cancel.success');

            // LD1: Return success response with updated refund details
            return res.status(StatusCode.OK).json({
                refund: cancelledRefund
            });
        } catch (error) {
            logger.error('Error cancelling refund', { error });
            metrics.incrementCounter('refund.cancel.error');

            // LD1: Handle validation errors with proper status codes
            if (error instanceof ValidationError) {
                return next(error);
            } else if (error instanceof BusinessError) {
                return next(error); // LD1: Handle state transition errors (e.g., cannot cancel completed refund)
            }

            // LD1: Handle other errors and pass to next() for global error handling
            return next(new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to cancel refund'));
        }
    };

    /**
     * Handler for retrieving supported refund methods
     * @param req 
     * @param res 
     * @param next 
     */
    methods = async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info('Attempting to retrieve supported refund methods');
            metrics.incrementCounter('refund.methods.attempt');

            const { transactionId } = req.params; // LD1: Extract transactionId from request parameters or query
            const { userId } = (req as any).auth; // LD1: Extract userId from authenticated request

            // LD1: Call refundRequestManagerService.getSupportedRefundMethods with transactionId
            const methods = await this.refundRequestManagerService.getSupportedRefundMethods(transactionId);

            logger.info('Supported refund methods retrieved successfully', { count: methods.length });
            metrics.incrementCounter('refund.methods.success');

            // LD1: Return list of supported refund methods with OK status code
            return res.status(StatusCode.OK).json({
                methods: methods
            });
        } catch (error) {
            logger.error('Error retrieving supported refund methods', { error });
            metrics.incrementCounter('refund.methods.error');

            // LD1: Handle errors and pass to next() for global error handling
            return next(new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve supported refund methods'));
        }
    };

    /**
     * Handler for retrieving refund statistics
     * @param req 
     * @param res 
     * @param next 
     */
    getStatistics = async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info('Attempting to retrieve refund statistics');
            metrics.incrementCounter('refund.getStatistics.attempt');

            const { merchantId } = (req as any).auth; // LD1: Extract merchantId from request parameters or authenticated user
            const { dateRangeStart, dateRangeEnd } = req.query; // LD1: Extract date range parameters from query string

            // LD1: Call refundRequestManagerService.getRefundRequestMetrics with parameters
            const statistics = await this.refundRequestManagerService.getRefundRequestMetrics(merchantId, {
                dateRangeStart: dateRangeStart as string,
                dateRangeEnd: dateRangeEnd as string
            });

            logger.info('Refund statistics retrieved successfully');
            metrics.incrementCounter('refund.getStatistics.success');

            // LD1: Return statistics with counts, amounts, success rates, etc.
            return res.status(StatusCode.OK).json({
                statistics: statistics
            });
        } catch (error) {
            logger.error('Error retrieving refund statistics', { error });
            metrics.incrementCounter('refund.getStatistics.error');

            // LD1: Handle errors and pass to next() for global error handling
            return next(new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve refund statistics'));
        }
    };
}