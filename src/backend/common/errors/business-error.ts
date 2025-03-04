import { ApiError } from './api-error';
import { ErrorCode } from '../constants/error-codes';

/**
 * Interface defining the structure of business error details including rule name, message,
 * remediation steps, and additional data
 */
export interface BusinessErrorDetail {
  ruleName?: string;
  message: string;
  remediationSteps?: string;
  additionalData?: Record<string, unknown>;
}

/**
 * Interface defining the structure of business error responses with error code,
 * message, rule information, and remediation steps
 */
export interface BusinessErrorResponse {
  code: string;
  message: string;
  ruleName?: string;
  remediationSteps?: string;
  detail?: BusinessErrorDetail;
}

/**
 * Error class for handling business rule violations, extending the ApiError class
 * with business-specific functionality for detailed error information and remediation.
 */
export class BusinessError extends ApiError {
  /**
   * Additional business error details
   */
  public readonly detail?: BusinessErrorDetail;

  /**
   * Name of the business rule that was violated
   */
  public readonly ruleName?: string;

  /**
   * Steps that can be taken to remediate the error
   */
  public readonly remediationSteps?: string;

  /**
   * Creates a new BusinessError with the provided error code, optional custom message,
   * and optional business error detail.
   * 
   * @param errorCode - The error code identifying the type of error
   * @param message - Custom error message (overrides default message from ERROR_DETAILS)
   * @param detail - Business error detail with rule information and remediation steps
   * @param cause - The original error that caused this business error, if applicable
   */
  constructor(
    errorCode: ErrorCode,
    message?: string,
    detail?: BusinessErrorDetail,
    cause?: Error
  ) {
    // Call parent constructor with error code, message, and cause
    super(errorCode, message || detail?.message, undefined, cause);
    
    // Set the name property to match the class name
    this.name = 'BusinessError';
    
    // Store business error detail
    this.detail = detail;
    
    // Set rule name and remediation steps from detail if provided
    this.ruleName = detail?.ruleName;
    this.remediationSteps = detail?.remediationSteps;
  }

  /**
   * Converts the business error to a JSON-serializable object for API responses.
   * 
   * @returns A JSON representation of the business error including business-specific details
   */
  toJSON(): BusinessErrorResponse {
    // Get the base error representation from parent
    const baseError = super.toJSON();
    
    // Create response with base error properties
    const response: BusinessErrorResponse = {
      ...baseError,
    };
    
    // Add rule name if available
    if (this.ruleName) {
      response.ruleName = this.ruleName;
    }
    
    // Add remediation steps if available
    if (this.remediationSteps) {
      response.remediationSteps = this.remediationSteps;
    }
    
    // Add the detailed business error information if available
    if (this.detail) {
      response.detail = this.detail;
    }
    
    return response;
  }

  /**
   * Factory method to create a business rule violation error.
   * 
   * @param ruleName - Name of the business rule that was violated
   * @param message - Descriptive message about the violation
   * @param remediationSteps - Optional steps for remediation
   * @param additionalData - Optional additional data related to the violation
   * @returns A new BusinessError for business rule violations
   */
  static createRuleViolationError(
    ruleName: string,
    message: string,
    remediationSteps?: string,
    additionalData?: Record<string, unknown>
  ): BusinessError {
    const detail: BusinessErrorDetail = {
      ruleName,
      message,
      remediationSteps,
      additionalData
    };
    
    return new BusinessError(ErrorCode.RULE_VIOLATION, message, detail);
  }

  /**
   * Factory method to create a compliance rule violation error.
   * 
   * @param ruleName - Name of the compliance rule that was violated
   * @param message - Descriptive message about the violation
   * @param remediationSteps - Optional steps for remediation
   * @param additionalData - Optional additional data related to the violation
   * @returns A new BusinessError for compliance rule violations
   */
  static createComplianceViolationError(
    ruleName: string,
    message: string,
    remediationSteps?: string,
    additionalData?: Record<string, unknown>
  ): BusinessError {
    const detail: BusinessErrorDetail = {
      ruleName,
      message,
      remediationSteps,
      additionalData
    };
    
    return new BusinessError(ErrorCode.COMPLIANCE_VIOLATION, message, detail);
  }

  /**
   * Factory method to create an error for exceeding maximum refund amount.
   * 
   * @param maxAmount - Maximum allowed refund amount
   * @param requestedAmount - Requested refund amount that exceeds the maximum
   * @param remediationSteps - Optional steps for remediation
   * @returns A new BusinessError for exceeding maximum refund amount
   */
  static createMaxRefundAmountExceededError(
    maxAmount: number,
    requestedAmount: number,
    remediationSteps?: string
  ): BusinessError {
    const message = `Refund amount (${requestedAmount}) exceeds the maximum allowed amount (${maxAmount})`;
    
    const detail: BusinessErrorDetail = {
      message,
      remediationSteps,
      additionalData: {
        maxAmount,
        requestedAmount
      }
    };
    
    return new BusinessError(ErrorCode.MAX_REFUND_AMOUNT_EXCEEDED, message, detail);
  }

  /**
   * Factory method to create an error for exceeding time limit for refunds.
   * 
   * @param limitDays - Maximum days allowed for refund
   * @param transactionDate - Original transaction date
   * @param remediationSteps - Optional steps for remediation
   * @returns A new BusinessError for exceeding refund time limit
   */
  static createRefundTimeLimitExceededError(
    limitDays: number,
    transactionDate: Date,
    remediationSteps?: string
  ): BusinessError {
    // Calculate days elapsed
    const currentDate = new Date();
    const daysElapsed = Math.floor((currentDate.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const message = `Refund time limit exceeded. This transaction is ${daysElapsed} days old, which exceeds the ${limitDays}-day limit for refunds.`;
    
    const detail: BusinessErrorDetail = {
      message,
      remediationSteps,
      additionalData: {
        limitDays,
        daysElapsed,
        transactionDate: transactionDate.toISOString()
      }
    };
    
    return new BusinessError(ErrorCode.REFUND_TIME_LIMIT_EXCEEDED, message, detail);
  }

  /**
   * Factory method to create an error for insufficient balance.
   * 
   * @param availableBalance - Current available balance
   * @param requiredAmount - Required amount for the refund
   * @param remediationSteps - Optional steps for remediation
   * @returns A new BusinessError for insufficient balance
   */
  static createInsufficientBalanceError(
    availableBalance: number,
    requiredAmount: number,
    remediationSteps?: string
  ): BusinessError {
    const message = `Insufficient balance for refund. Available balance (${availableBalance}) is less than the required amount (${requiredAmount}).`;
    
    const detail: BusinessErrorDetail = {
      message,
      remediationSteps,
      additionalData: {
        availableBalance,
        requiredAmount,
        shortfallAmount: requiredAmount - availableBalance
      }
    };
    
    return new BusinessError(ErrorCode.INSUFFICIENT_BALANCE, message, detail);
  }

  /**
   * Factory method to create an error for refund method not allowed.
   * 
   * @param methodName - The refund method that was requested
   * @param allowedMethods - List of allowed refund methods
   * @param reason - Optional reason why the method is not allowed
   * @param remediationSteps - Optional steps for remediation
   * @returns A new BusinessError for refund method not allowed
   */
  static createMethodNotAllowedError(
    methodName: string,
    allowedMethods: string[],
    reason?: string,
    remediationSteps?: string
  ): BusinessError {
    const message = `Refund method '${methodName}' is not allowed. ${reason ? reason + '. ' : ''}Allowed methods: ${allowedMethods.join(', ')}`;
    
    const detail: BusinessErrorDetail = {
      message,
      remediationSteps,
      additionalData: {
        requestedMethod: methodName,
        allowedMethods,
        reason
      }
    };
    
    return new BusinessError(ErrorCode.METHOD_NOT_ALLOWED, message, detail);
  }
}