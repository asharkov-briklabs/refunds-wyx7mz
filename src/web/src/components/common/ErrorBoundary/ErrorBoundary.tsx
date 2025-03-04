import React from 'react';
import Button, { ButtonVariant } from '../Button';
import ErrorMessage from '../../shared/ErrorMessage';
import { GENERIC_ERROR_MESSAGES } from '../../../constants/error-messages.constants';
import { logError } from '../../../utils/error.utils';

/**
 * Props interface for the ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  /** The child components to be rendered */
  children: React.ReactNode;
  /** 
   * Custom fallback UI to display when an error occurs.
   * Can be a React node or a function that returns a React node.
   */
  fallback?: React.ReactNode | ((error: Error | null, resetError: () => void) => React.ReactNode);
  /** Optional callback function to handle errors */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * State interface for the ErrorBoundary component
 */
export interface ErrorBoundaryState {
  /** The error that was caught, or null if no error */
  error: Error | null;
}

/**
 * A React error boundary component that catches JavaScript errors in its child component tree,
 * prevents the entire application from crashing, and displays a fallback UI with the option to retry.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  /**
   * Static lifecycle method called when a descendant component throws an error.
   * Updates the state to capture the error.
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render shows the fallback UI
    return { error };
  }

  /**
   * Lifecycle method called after an error has been thrown by a descendant component.
   * Logs the error and calls the onError callback if provided.
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log the error to help with debugging
    logError(error, 'ErrorBoundary', { componentStack: errorInfo.componentStack });
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Resets the error state, allowing the component to attempt to re-render its children
   */
  resetError = (): void => {
    this.setState({ error: null });
  };

  /**
   * Renders either the children or a fallback UI depending on whether an error occurred
   */
  render(): React.ReactNode {
    const { error } = this.state;
    const { children, fallback } = this.props;

    // If there's an error, show the fallback UI
    if (error) {
      // If fallback is a function, call it with the error and resetError
      if (typeof fallback === 'function') {
        return fallback(error, this.resetError);
      }
      
      // If fallback is a React node, return it directly
      if (fallback) {
        return fallback;
      }
      
      // Default fallback UI
      return (
        <div className="p-4 rounded-md bg-gray-50 border border-gray-200">
          <ErrorMessage 
            message={GENERIC_ERROR_MESSAGES.UNEXPECTED} 
            severity="error"
          />
          <div className="mt-4 flex justify-end">
            <Button 
              variant={ButtonVariant.PRIMARY}
              onClick={this.resetError}
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    // If there's no error, render the children
    return children;
  }
}

export default ErrorBoundary;