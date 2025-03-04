import { Injectable } from '@nestjs/common'; // @nestjs/common@^10.0.0
import { RefundMethod } from '../../../common/enums/refund-method.enum';
import { RefundStatus } from '../../../common/enums/refund-status.enum';
import { Logger } from '../../../common/utils/logger';
import { GatewayIntegrationService } from '../../gateway-integration/gateway-integration.service';

/**
 * Handler for processing ACH (Automated Clearing House) refunds with specific validation and error handling logic for bank transfers.
 */
@Injectable()
export class ACHHandler {
  private readonly logger = new Logger('ACHHandler');
  
  /**
   * Creates an instance of ACHHandler.
   * @param gatewayIntegrationService 
   */
  constructor(
    private readonly gatewayIntegrationService: GatewayIntegrationService,
  ) {
    this.logger.info('ACHHandler constructed');
  }

  /**
   * Validates an ACH refund request against specific rules for bank transfers.
   * @param refundRequest 
   * @returns Result of the validation with success status and any error details
   */
  async validateRefund(refundRequest: any): Promise<any> {
    this.logger.info('Validating ACH refund request', { refundRequest });

    // Check if refund is full amount (partial refunds not allowed for ACH)
    if (!refundRequest.isFullRefund) {
      return {
        success: false,
        error: 'Partial refunds are not supported for ACH'
      };
    }

    // Verify bank account details are properly formatted
    if (!refundRequest.bankAccountNumber || !refundRequest.bankRoutingNumber) {
      return {
        success: false,
        error: 'Bank account number and routing number are required for ACH refunds'
      };
    }

    // Check if refund is within business day processing limitations
    const now = new Date();
    if (now.getDay() === 0 || now.getDay() === 6) {
      return {
        success: false,
        error: 'ACH refunds can only be processed on business days'
      };
    }

    // Return validation result with appropriate error messages if any validation fails
    return { success: true };
  }

  /**
   * Processes an ACH refund through the appropriate payment gateway.
   * @param refundRequest 
   * @returns Result of the refund processing with success status and gateway reference
   */
  async processRefund(refundRequest: any): Promise<any> {
    this.logger.info('Processing ACH refund', { refundRequest });

    // Log refund processing attempt
    this.logger.debug('Attempting to process ACH refund', { refundRequest });

    // Prepare gateway-specific refund request data
    const gatewayRequestData = this.prepareGatewayRequest(refundRequest);

    // Call gateway integration service to process the refund
    try {
      const gatewayResponse = await this.gatewayIntegrationService.processRefund(gatewayRequestData);

      // Handle gateway response and return appropriate result
      this.logger.info('ACH refund processed successfully', { gatewayResponse });
      return {
        success: true,
        gatewayReference: gatewayResponse.gatewayReference,
        status: RefundStatus.COMPLETED
      };
    } catch (error) {
      // Handle gateway response and return appropriate result
      this.logger.error('ACH refund processing failed', { error });
      return {
        success: false,
        error: error.message,
        status: RefundStatus.FAILED
      };
    } finally {
      // Include warning about longer processing times for ACH refunds
      this.logger.warn('ACH refunds typically take 3-5 business days to process');
    }
  }

  /**
   * Handles ACH-specific error conditions returned from payment gateways.
   * @param refundRequest 
   * @param error 
   * @returns Result with error details and recommended actions
   */
  handleError(refundRequest: any, error: any): any {
    this.logger.error('Handling ACH error', { refundRequest, error });

    // Log the error details
    this.logger.error('ACH refund error', { error });

    // Check for account-related errors (INSUFFICIENT_FUNDS, ACCOUNT_CLOSED) and return with MERCHANT_ACTION_REQUIRED flag
    if (error.code === 'INSUFFICIENT_FUNDS' || error.code === 'ACCOUNT_CLOSED') {
      return {
        success: false,
        status: RefundStatus.FAILED,
        error: error.message,
        recommendedAction: 'MERCHANT_ACTION_REQUIRED',
        actionDetails: 'Customer\'s bank account has issues that prevent refund'
      };
    }

    // Check for temporary errors (BANK_PROCESSING_DELAY, GATEWAY_TIMEOUT) and return with RETRY flag and appropriate retry delay
    if (error.code === 'BANK_PROCESSING_DELAY' || error.code === 'GATEWAY_TIMEOUT') {
      return {
        success: false,
        status: RefundStatus.GATEWAY_ERROR,
        error: error.message,
        recommendedAction: 'RETRY',
        retryAfter: 3600 // Retry after 1 hour
      };
    }

    // For other errors, return standard failure response
    return {
      success: false,
      status: RefundStatus.FAILED,
      error: error.message
    };
  }

  /**
   * Returns the capabilities and limitations of the ACH refund method.
   * @returns Object containing method capabilities and limitations
   */
  getMethodCapabilities(): object {
    return {
      supportsPartialRefunds: false,
      processingTimeHours: 48,
      requiresBusinessDays: true
    };
  }

  /**
   * Prepares the gateway-specific request data for an ACH refund.
   * @param refundRequest 
   * @returns Gateway-specific request data
   */
  prepareGatewayRequest(refundRequest: any): any {
    this.logger.info('Preparing gateway request for ACH refund', { refundRequest });

    // Map the refund request to the format expected by the payment gateway
    const gatewayRequest = {
      amount: refundRequest.amount,
      currency: refundRequest.currency,
      bankAccountNumber: refundRequest.bankAccountNumber,
      bankRoutingNumber: refundRequest.bankRoutingNumber,
      accountType: refundRequest.accountType,
      accountHolderName: refundRequest.accountHolderName,
      refundMethod: RefundMethod.OTHER,
      transactionId: refundRequest.transactionId,
      refundId: refundRequest.refundId,
      merchantId: refundRequest.merchantId,
      // Add ACH-specific parameters like account type, routing number, etc.
      // Return the formatted request object
    };

    return gatewayRequest;
  }
}