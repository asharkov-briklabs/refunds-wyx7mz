import React from 'react'; // ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // ^14.0.0
import userEvent from '@testing-library/user-event'; // ^14.4.3
import ErrorBoundary from './ErrorBoundary';
import { renderWithProviders } from '../../../utils/test.utils';
import { GENERIC_ERROR_MESSAGES } from '../../../constants/error-messages.constants';

/**
 * Test component that throws an error when rendered
 * @param { shouldThrow?: boolean } props
 * @returns {JSX.Element} React element that throws an error or renders correctly based on props
 */
const ErrorComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow }) => {
  // Check if shouldThrow prop is true
  if (shouldThrow) {
    // If shouldThrow is true, throw a new Error with test message
    throw new Error('Test error');
  }
  // Otherwise render a div with text 'Component rendered successfully'
  return <div>Component rendered successfully</div>;
};

/**
 * Test component that doesn't throw errors
 * @returns {JSX.Element} React element that renders without errors
 */
const SafeComponent: React.FC = () => {
  // Return a div with text 'Safe component'
  return <div>Safe component</div>;
};

describe('ErrorBoundary', () => {
  it('should display fallback UI when an error is thrown', async () => {
    // Render the ErrorBoundary with ErrorComponent that throws an error
    renderWithProviders(
      <ErrorBoundary>
        <ErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText(GENERIC_ERROR_MESSAGES.UNEXPECTED)).toBeInTheDocument();
    });
  });

  it('should recover when "Try Again" button is clicked', async () => {
    // Render the ErrorBoundary with ErrorComponent that throws an error
    renderWithProviders(
      <ErrorBoundary>
        <ErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText(GENERIC_ERROR_MESSAGES.UNEXPECTED)).toBeInTheDocument();
    });

    // Simulate clicking the "Try Again" button
    const user = userEvent.setup();
    await user.click(screen.getByText('Try Again'));

    // Wait for the ErrorComponent to re-render without throwing an error
    await waitFor(() => {
      expect(screen.queryByText(GENERIC_ERROR_MESSAGES.UNEXPECTED)).not.toBeInTheDocument();
    });
  });

  it('should render children when no error is thrown', () => {
    // Render the ErrorBoundary with SafeComponent that doesn't throw an error
    renderWithProviders(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    );

    // Check if the SafeComponent is rendered
    expect(screen.getByText('Safe component')).toBeInTheDocument();
  });

  it('should use custom fallback UI if provided', async () => {
    // Define a custom fallback UI
    const customFallback = <div>Custom fallback UI</div>;

    // Render the ErrorBoundary with ErrorComponent that throws an error and custom fallback
    renderWithProviders(
      <ErrorBoundary fallback={customFallback}>
        <ErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Wait for the custom fallback UI to appear
    await waitFor(() => {
      expect(screen.getByText('Custom fallback UI')).toBeInTheDocument();
    });

    // Ensure the default error message is not present
    expect(screen.queryByText(GENERIC_ERROR_MESSAGES.UNEXPECTED)).not.toBeInTheDocument();
  });

  it('should call onError callback if provided', () => {
    // Create a mock onError callback function
    const onError = jest.fn();

    // Render the ErrorBoundary with ErrorComponent that throws an error and onError callback
    renderWithProviders(
      <ErrorBoundary onError={onError}>
        <ErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Wait for the onError callback to be called
    waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });
});