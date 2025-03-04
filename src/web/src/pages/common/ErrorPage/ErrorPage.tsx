import React from 'react';
import { useNavigate } from 'react-router-dom'; // ^6.10.0
import Button, { ButtonVariant } from '../../components/common/Button';
import ErrorMessage from '../../components/shared/ErrorMessage';
import { TimesCircleIcon, WarningIcon, InfoCircleIcon } from '../../assets/icons/status-icons';
import errorStateImage from '../../assets/images/error-state.svg';
import { GENERIC_ERROR_MESSAGES } from '../../constants/error-messages.constants';

/**
 * Defines the possible error categories for styling and icon selection
 */
export enum ErrorCategory {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Props for the ErrorPage component
 */
export interface ErrorPageProps {
  /** Title displayed at the top of the error page */
  errorTitle?: string;
  /** Main error message explaining what went wrong */
  errorMessage?: string;
  /** Category of error that determines styling and icon */
  errorCategory?: ErrorCategory;
  /** Optional additional details about the error (string or component) */
  errorDetails?: React.ReactNode;
  /** Optional custom action button configuration */
  actionButton?: {
    label: string;
    onClick: () => void;
    variant?: ButtonVariant;
  };
}

/**
 * A shared page component that displays a user-friendly error page when system errors occur.
 * Used across both Pike (merchant) and Barracuda (admin) interfaces to handle various
 * types of errors including network errors, server errors, and unexpected application errors.
 */
const ErrorPage: React.FC<ErrorPageProps> = ({
  errorTitle,
  errorMessage,
  errorCategory = ErrorCategory.ERROR,
  errorDetails,
  actionButton,
}) => {
  // Set default values for error title and message if not provided
  const title = errorTitle || 'Something went wrong';
  const message = errorMessage || 
    (errorCategory === ErrorCategory.ERROR 
      ? GENERIC_ERROR_MESSAGES.UNEXPECTED 
      : errorCategory === ErrorCategory.WARNING 
        ? 'Warning: An issue has been detected.'
        : 'Information: Please review the following details.');
  
  // Determine which icon to display based on the error category
  const Icon = (() => {
    switch (errorCategory) {
      case ErrorCategory.WARNING:
        return WarningIcon;
      case ErrorCategory.INFO:
        return InfoCircleIcon;
      case ErrorCategory.ERROR:
      default:
        return TimesCircleIcon;
    }
  })();
  
  // Get navigation function for "Go Back" button
  const navigate = useNavigate();
  
  // Handle navigation back to previous page
  const handleGoBack = () => {
    navigate(-1);
  };
  
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gray-50"
      role="alert"
      aria-live={errorCategory === ErrorCategory.ERROR ? 'assertive' : 'polite'}
    >
      <div className="w-full max-w-lg text-center">
        {/* Error illustration */}
        <img 
          src={errorStateImage} 
          alt="" 
          className="mx-auto h-48 w-auto mb-8" 
          aria-hidden="true"
        />
        
        {/* Error icon */}
        <div className="flex justify-center mb-4">
          <Icon 
            className={`w-16 h-16 ${
              errorCategory === ErrorCategory.ERROR 
                ? 'text-red-500' 
                : errorCategory === ErrorCategory.WARNING 
                  ? 'text-amber-500' 
                  : 'text-blue-500'
            }`} 
            aria-hidden="true"
          />
        </div>
        
        {/* Error title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {title}
        </h1>
        
        {/* Error message */}
        <p className="text-lg text-gray-600 mb-6">
          {message}
        </p>
        
        {/* Error details if provided */}
        {errorDetails && (
          <div className="mb-8">
            {typeof errorDetails === 'string' ? (
              <ErrorMessage 
                message={errorDetails}
                severity={
                  errorCategory === ErrorCategory.ERROR 
                    ? 'error' 
                    : errorCategory === ErrorCategory.WARNING 
                      ? 'warning' 
                      : 'info'
                }
              />
            ) : (
              errorDetails
            )}
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-4">
          {actionButton && (
            <Button 
              variant={actionButton.variant || ButtonVariant.PRIMARY}
              onClick={actionButton.onClick}
              aria-label={actionButton.label}
            >
              {actionButton.label}
            </Button>
          )}
          
          <Button 
            variant={actionButton ? ButtonVariant.SECONDARY : ButtonVariant.PRIMARY}
            onClick={handleGoBack}
            aria-label="Go back to previous page"
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;