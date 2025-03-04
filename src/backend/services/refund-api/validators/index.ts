/**
 * Validators Barrel File
 * 
 * This file consolidates and re-exports validators from various modules to simplify imports.
 * It provides a central access point for all validation functions used in the refund API,
 * ensuring consistent validation across the application.
 * 
 * @module validators
 */

// Import all validators
import * as RefundValidator from './refund.validator';
import * as BankAccountValidator from './bank-account.validator';
import * as ParameterValidator from './parameter.validator';

// Re-export refund validators
export const createRefundSchema = RefundValidator.createRefundSchema;
export const updateRefundSchema = RefundValidator.updateRefundSchema;
export const cancelRefundSchema = RefundValidator.cancelRefundSchema;
export const validateCreateRefundRequest = RefundValidator.validateCreateRefundRequest;
export const validateUpdateRefundRequest = RefundValidator.validateUpdateRefundRequest;
export const validateCancelRefundRequest = RefundValidator.validateCancelRefundRequest;
export const validateRefundMethodForTransaction = RefundValidator.validateRefundMethodForTransaction;

// Re-export bank account validators
export const validateBankAccount = BankAccountValidator.validateBankAccount;
export const validateBankAccountUpdate = BankAccountValidator.validateBankAccountUpdate;
export const validateVerificationRequest = BankAccountValidator.validateVerificationRequest;
export const validateMicroDepositAmounts = BankAccountValidator.validateMicroDepositAmounts;
export const createBankAccountValidationError = BankAccountValidator.createBankAccountValidationError;

// Re-export parameter validators
export const validateParameterCreate = ParameterValidator.validateParameterCreate;
export const validateParameterUpdate = ParameterValidator.validateParameterUpdate;
export const validateParameterGet = ParameterValidator.validateParameterGet;
export const validateParameterDelete = ParameterValidator.validateParameterDelete;
export const validateParameterValue = ParameterValidator.validateParameterValue;