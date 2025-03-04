import { logger } from '../../../common/utils/logger';
import { RefundMethod } from '../../../common/enums/refund-method.enum';
import { RefundRequest, RefundResult } from '../../../common/interfaces/refund.interface';
import { Transaction } from '../../../common/interfaces/payment.interface';
import { BusinessError } from '../../../common/errors/business-error';
import { ErrorCode } from '../../../common/constants/error-codes';

/**
 * Interface that defines the contract for all payment method handlers, ensuring
 * consistent implementation across different payment methods.
 */
export interface PaymentMethodHandler {
  /**
   * Validates if a refund request can be processed for the given transaction
   * with this payment method.
   * 
   * @param refundRequest - The refund request to validate
   * @param transaction - The original transaction details
   * @returns A Promise that resolves to true if valid, or rejects with an error
   */
  validateRefund(refundRequest: RefundRequest, transaction: Transaction): Promise<boolean>;
  
  /**
   * Processes a refund request using this payment method.
   * 
   * @param refundRequest - The refund request to process
   * @param transaction - The original transaction details
   * @returns A Promise that resolves to the result of the refund operation
   */
  processRefund(refundRequest: RefundRequest, transaction: Transaction): Promise<RefundResult>;
  
  /**
   * Handles method-specific error conditions.
   * 
   * @param refundRequest - The refund request that encountered an error
   * @param error - The error that occurred
   * @returns A Promise that resolves to the result after error handling
   */
  handleError(refundRequest: RefundRequest, error: Error): Promise<RefundResult>;
  
  /**
   * Gets the capabilities of this payment method for refunds.
   * 
   * @returns An object describing the method's capabilities
   */
  getMethodCapabilities(): object;
}

/**
 * Registry that manages the registration and retrieval of payment method handlers.
 * Implements a pluggable architecture where new payment method handlers can be
 * dynamically registered without modifying existing code.
 */
export class PaymentMethodRegistry {
  private handlers: Map<string, PaymentMethodHandler>;
  private paymentMethodToHandlerMap: Map<string, string[]>;
  
  /**
   * Initializes a new PaymentMethodRegistry with empty handler maps.
   */
  constructor() {
    // Initialize handlers map to store handler instances by type
    this.handlers = new Map<string, PaymentMethodHandler>();
    
    // Initialize paymentMethodToHandlerMap to map payment methods to handler types
    this.paymentMethodToHandlerMap = new Map<string, string[]>();
    
    logger.info('PaymentMethodRegistry initialized');
  }
  
  /**
   * Registers a new payment method handler for one or more payment methods.
   * 
   * @param handlerType - Unique identifier for this handler
   * @param handler - The handler implementation
   * @param paymentMethods - Array of payment method types this handler supports
   * @throws BusinessError if the handler doesn't implement the PaymentMethodHandler interface
   */
  registerHandler(
    handlerType: string,
    handler: PaymentMethodHandler,
    paymentMethods: string[]
  ): void {
    // Validate that the handler implements the required interface
    if (!this.isValidHandler(handler)) {
      throw new BusinessError(
        ErrorCode.INVALID_HANDLER,
        'Handler must implement PaymentMethodHandler interface'
      );
    }
    
    // Store handler in the registry
    this.handlers.set(handlerType, handler);
    
    // Map each payment method to this handler
    for (const method of paymentMethods) {
      // Get existing handlers for this method or initialize empty array
      const existingHandlers = this.paymentMethodToHandlerMap.get(method) || [];
      
      // Add new handler to the list
      existingHandlers.push(handlerType);
      
      // Update the map
      this.paymentMethodToHandlerMap.set(method, existingHandlers);
    }
    
    logger.info(`Registered handler ${handlerType} for payment methods: ${paymentMethods.join(', ')}`);
  }
  
  /**
   * Registers a handler specifically for a refund method (ORIGINAL_PAYMENT, BALANCE, OTHER).
   * 
   * @param refundMethod - The refund method enum value
   * @param handler - The handler implementation
   */
  registerRefundMethodHandler(refundMethod: RefundMethod, handler: PaymentMethodHandler): void {
    // Generate a handler type name based on the refund method
    const handlerType = `refund-method-${refundMethod}`;
    
    // Register the handler with the generated type name
    this.registerHandler(handlerType, handler, [refundMethod]);
    
    logger.info(`Registered handler for refund method: ${refundMethod}`);
  }
  
  /**
   * Gets the appropriate handler for a specific payment method.
   * 
   * @param paymentMethod - The payment method to get a handler for
   * @returns The appropriate handler for the payment method
   * @throws BusinessError if no handler is found for the payment method
   */
  getHandler(paymentMethod: string): PaymentMethodHandler {
    // Check if we have a handler for this payment method
    if (!this.hasHandler(paymentMethod)) {
      throw new BusinessError(
        ErrorCode.UNSUPPORTED_PAYMENT_METHOD,
        `No handler registered for payment method: ${paymentMethod}`
      );
    }
    
    // Get the first handler type for this payment method
    const handlerTypes = this.paymentMethodToHandlerMap.get(paymentMethod)!;
    const handlerType = handlerTypes[0]; // Use the first registered handler
    
    // Return the handler instance
    return this.handlers.get(handlerType)!;
  }
  
  /**
   * Gets the handler specifically for a refund method.
   * 
   * @param refundMethod - The refund method enum value
   * @returns The handler for the specified refund method
   * @throws BusinessError if no handler is found for the refund method
   */
  getRefundMethodHandler(refundMethod: RefundMethod): PaymentMethodHandler {
    // Generate handler type name based on the refund method
    const handlerType = `refund-method-${refundMethod}`;
    
    // Check if the handler exists in the registry
    if (!this.handlers.has(handlerType)) {
      throw new BusinessError(
        ErrorCode.UNSUPPORTED_PAYMENT_METHOD,
        `No handler registered for refund method: ${refundMethod}`
      );
    }
    
    // Return the handler instance
    return this.handlers.get(handlerType)!;
  }
  
  /**
   * Checks if a handler exists for a specific payment method.
   * 
   * @param paymentMethod - The payment method to check
   * @returns True if a handler exists, false otherwise
   */
  hasHandler(paymentMethod: string): boolean {
    // Check if the payment method exists in the mapping and has at least one handler
    return (
      this.paymentMethodToHandlerMap.has(paymentMethod) && 
      (this.paymentMethodToHandlerMap.get(paymentMethod)?.length ?? 0) > 0
    );
  }
  
  /**
   * Checks if a handler exists for a specific refund method.
   * 
   * @param refundMethod - The refund method enum value
   * @returns True if a handler exists, false otherwise
   */
  hasRefundMethodHandler(refundMethod: RefundMethod): boolean {
    // Generate handler type name based on the refund method
    const handlerType = `refund-method-${refundMethod}`;
    
    // Check if the handler exists in the registry
    return this.handlers.has(handlerType);
  }
  
  /**
   * Gets a list of all payment methods that have registered handlers.
   * 
   * @returns Array of supported payment method types
   */
  listSupportedMethods(): string[] {
    // Return the keys from the paymentMethodToHandlerMap as an array
    return Array.from(this.paymentMethodToHandlerMap.keys());
  }
  
  /**
   * Validates that a handler properly implements the PaymentMethodHandler interface.
   * 
   * @param handler - The handler to validate
   * @returns True if the handler implements the interface, false otherwise
   */
  private isValidHandler(handler: any): boolean {
    return (
      handler && 
      typeof handler.validateRefund === 'function' &&
      typeof handler.processRefund === 'function' &&
      typeof handler.handleError === 'function' &&
      typeof handler.getMethodCapabilities === 'function'
    );
  }
}

/**
 * Singleton instance of PaymentMethodRegistry for use throughout the application.
 */
export const paymentMethodRegistry = new PaymentMethodRegistry();